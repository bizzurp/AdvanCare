import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Hono, type Context } from 'hono';
import * as v from 'valibot';
import { audit } from '../../audit';
import { auditLogs, clientProfiles, providers, SERVICE_KINDS, SERVICE_STATUSES, serviceRequests, uploads, users } from '../../db/schema';
import type { AppEnv } from '../../env';
import { ApiError } from '../../lib/errors';
import { notifyFamily } from '../../lib/notify';
import { validate } from '../../lib/validation';
import { SENSITIVE_KINDS, serviceTransitionProblem, type ServiceStatus } from '../../staff/serviceRules';
import { assertInScope, maskPhone, scopeCondition, shortName } from '../../staff/scope';
import { serviceRef } from '../services';
import { PAGE_SIZE } from './operations';

const IdParam = v.object({ id: v.pipe(v.string(), v.uuid()) });
const requester = alias(users, 'requester');
const handler = alias(users, 'handler');
const assignedProv = alias(providers, 'assigned_prov');
const assignedUser = alias(users, 'assigned_user');

const KIND_LABEL: Record<string, string> = { telehealth: 'TeleHealth consult', rhu: 'RHU service', triage: 'Triage & referral', prescription: 'Prescription', transport: 'Transport' };

/** Staff inbox for the other services (P2). Scoped by the client's municipality; changes audited. */
export const adminServices = new Hono<AppEnv>();

adminServices.get(
  '/service-requests',
  validate(
    'query',
    v.object({
      kind: v.optional(v.picklist(SERVICE_KINDS)),
      status: v.optional(v.union([v.picklist(SERVICE_STATUSES), v.literal('OPEN')])),
      q: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100))),
      clientId: v.optional(v.pipe(v.string(), v.uuid())),
      page: v.optional(v.pipe(v.string(), v.regex(/^\d{1,4}$/), v.transform(Number)), '1'),
    }),
  ),
  async (c) => {
    const db = c.get('db');
    const f = c.req.valid('query');
    const where: SQL | undefined = and(
      scopeCondition(c.get('staff'), clientProfiles.municipality),
      f.kind ? eq(serviceRequests.kind, f.kind) : undefined,
      f.status === 'OPEN' ? inArray(serviceRequests.status, ['SUBMITTED', 'IN_REVIEW', 'SCHEDULED']) : f.status ? eq(serviceRequests.status, f.status) : undefined,
      f.clientId ? eq(serviceRequests.clientId, f.clientId) : undefined,
      f.q
        ? or(
            ilike(clientProfiles.fullName, `%${f.q.replace(/[%_\\]/g, '\\$&')}%`),
            sql`upper(${serviceRequests.id}::text) like ${`${f.q.toUpperCase().replace(/^SVC-/, '').replace(/[%_\\]/g, '')}%`}`,
          )
        : undefined,
    );
    const [rows, [total]] = await Promise.all([
      db
        .select({
          id: serviceRequests.id,
          kind: serviceRequests.kind,
          status: serviceRequests.status,
          createdAt: serviceRequests.createdAt,
          preferredAt: serviceRequests.preferredAt,
          scheduledAt: serviceRequests.scheduledAt,
          summary: sql<string | null>`${serviceRequests.details}->>'summary'`,
          clientId: clientProfiles.id,
          clientName: clientProfiles.fullName,
          barangay: clientProfiles.barangay,
          municipality: clientProfiles.municipality,
          files: sql<number>`(select count(*)::int from ${uploads} where ${uploads.serviceRequestId} = ${serviceRequests.id})`,
          assignedProviderId: assignedProv.id,
          assignedProviderName: assignedUser.fullName,
          assignedProviderType: assignedProv.type,
        })
        .from(serviceRequests)
        .innerJoin(clientProfiles, eq(clientProfiles.id, serviceRequests.clientId))
        .leftJoin(assignedProv, eq(assignedProv.id, serviceRequests.assignedProviderId))
        .leftJoin(assignedUser, eq(assignedUser.id, assignedProv.userId))
        .where(where)
        .orderBy(desc(serviceRequests.createdAt))
        .limit(PAGE_SIZE)
        .offset((f.page - 1) * PAGE_SIZE),
      db.select({ n: count() }).from(serviceRequests).innerJoin(clientProfiles, eq(clientProfiles.id, serviceRequests.clientId)).where(where),
    ]);
    return c.json({
      requests: rows.map(({ clientName, clientId, assignedProviderId, assignedProviderName, assignedProviderType, ...r }) => ({
        ...r,
        ref: serviceRef(r.id),
        client: { id: clientId, name: shortName(clientName) },
        assignedProvider: assignedProviderId ? { id: assignedProviderId, fullName: assignedProviderName, type: assignedProviderType } : null,
      })),
      total: total?.n ?? 0,
      page: f.page,
      pageSize: PAGE_SIZE,
    });
  },
);

async function loadService(c: Context<AppEnv>, id: string) {
  const [row] = await c
    .get('db')
    .select({
      sr: serviceRequests,
      client: clientProfiles,
      familyEmail: requester.email,
      familyName: requester.fullName,
      familyPhone: requester.phoneNumber,
      familyRole: requester.role,
      handlerName: handler.fullName,
      providerId: assignedProv.id,
      providerFullName: assignedUser.fullName,
      providerType: assignedProv.type,
      providerSpecialty: assignedProv.specialty,
      providerLicenseNumber: assignedProv.licenseNumber,
      providerVehicleType: assignedProv.vehicleType,
      providerPlateNumber: assignedProv.plateNumber,
      providerPhone: assignedUser.phoneNumber,
      providerMunicipality: assignedProv.municipality,
    })
    .from(serviceRequests)
    .innerJoin(clientProfiles, eq(clientProfiles.id, serviceRequests.clientId))
    .innerJoin(requester, eq(requester.id, serviceRequests.requestedByUserId))
    .leftJoin(handler, eq(handler.id, serviceRequests.handledByUserId))
    .leftJoin(assignedProv, eq(assignedProv.id, serviceRequests.assignedProviderId))
    .leftJoin(assignedUser, eq(assignedUser.id, assignedProv.userId))
    .where(eq(serviceRequests.id, id))
    .limit(1);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Request not found.');
  assertInScope(c.get('staff'), row.client.municipality, 'Request');
  return row;
}

adminServices.get('/service-requests/:id', validate('param', IdParam), async (c) => {
  const db = c.get('db');
  const row = await loadService(c, c.req.valid('param').id);
  const [files, history] = await Promise.all([
    db.select({ id: uploads.id, fileName: uploads.fileName, contentType: uploads.contentType, sizeBytes: uploads.sizeBytes, createdAt: uploads.createdAt }).from(uploads).where(eq(uploads.serviceRequestId, row.sr.id)),
    db
      .select({ id: auditLogs.id, createdAt: auditLogs.createdAt, action: auditLogs.action, metadata: auditLogs.metadata, actor: { id: users.id, fullName: users.fullName, email: users.email } })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorUserId))
      .where(and(eq(auditLogs.entityType, 'service_request'), eq(auditLogs.entityId, row.sr.id)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(20),
  ]);
  // Symptoms, prescriptions and consult reasons are health information: opening them is recorded.
  if (SENSITIVE_KINDS.has(row.sr.kind)) {
    await audit(c, db, { action: 'service_request.viewed', entityType: 'service_request', entityId: row.sr.id, municipality: row.client.municipality, metadata: { kind: row.sr.kind } });
  }
  const cl = row.client;
  return c.json({
    request: {
      id: row.sr.id,
      ref: serviceRef(row.sr.id),
      kind: row.sr.kind,
      kindLabel: KIND_LABEL[row.sr.kind] ?? row.sr.kind,
      status: row.sr.status,
      createdAt: row.sr.createdAt,
      updatedAt: row.sr.updatedAt,
      preferredAt: row.sr.preferredAt,
      scheduledAt: row.sr.scheduledAt,
      details: row.sr.details,
      staffNote: row.sr.staffNote,
      cancellationReason: row.sr.cancellationReason,
      handledBy: row.handlerName,
      assignedProviderId: row.providerId,
    },
    assignedProvider: row.providerId
      ? {
          id: row.providerId,
          fullName: row.providerFullName,
          type: row.providerType,
          specialty: row.providerSpecialty,
          licenseNumber: row.providerLicenseNumber,
          vehicleType: row.providerVehicleType,
          plateNumber: row.providerPlateNumber,
          phone: maskPhone(row.providerPhone),
          municipality: row.providerMunicipality,
        }
      : null,
    client: { id: cl.id, name: cl.fullName, address: [cl.sitio, `Brgy. ${cl.barangay}`, cl.municipality].filter(Boolean).join(', '), landmark: cl.landmarkNotes },
    requestedBy: { name: row.familyName, role: row.familyRole, phone: maskPhone(row.familyPhone), email: row.familyEmail },
    files,
    history: history.map((h) => ({ ...h, actor: h.actor?.id ? h.actor : null })),
  });
});

/** Candidate doctors or drivers eligible to be assigned to this service request. */
adminServices.get('/service-requests/:id/candidates', validate('param', IdParam), async (c) => {
  const db = c.get('db');
  const staff = c.get('staff');
  const row = await loadService(c, c.req.valid('param').id);
  const kind = row.sr.kind;
  const targetType = kind === 'telehealth' ? 'DOCTOR' : kind === 'transport' ? 'TRANSPORT_DRIVER' : null;
  if (!targetType) return c.json({ candidates: [] });

  const provUser = alias(users, 'prov_user');
  const candidates = await db
    .select({
      id: providers.id,
      fullName: provUser.fullName,
      phone: provUser.phoneNumber,
      type: providers.type,
      municipality: providers.municipality,
      barangay: providers.barangay,
      specialty: providers.specialty,
      licenseNumber: providers.licenseNumber,
      vehicleType: providers.vehicleType,
      plateNumber: providers.plateNumber,
      isAvailable: providers.isAvailable,
      isAccredited: providers.isAccredited,
      isActive: provUser.isActive,
    })
    .from(providers)
    .innerJoin(provUser, eq(provUser.id, providers.userId))
    .where(
      and(
        eq(providers.type, targetType),
        targetType === 'DOCTOR' ? undefined : scopeCondition(staff, providers.municipality),
      ),
    )
    .orderBy(asc(provUser.fullName));

  const checkTime = row.sr.scheduledAt ?? row.sr.preferredAt;
  const conflictingProviderIds = new Set<string>();
  if (checkTime) {
    const conflicts = await db
      .select({ providerId: serviceRequests.assignedProviderId })
      .from(serviceRequests)
      .where(
        and(
          sql`${serviceRequests.id} <> ${row.sr.id}`,
          sql`${serviceRequests.assignedProviderId} is not null`,
          sql`${serviceRequests.status} in ('SUBMITTED', 'IN_REVIEW', 'SCHEDULED')`,
          sql`coalesce(${serviceRequests.scheduledAt}, ${serviceRequests.preferredAt}) = ${new Date(checkTime).toISOString()}::timestamptz`,
        ),
      );
    for (const conf of conflicts) {
      if (conf.providerId) conflictingProviderIds.add(conf.providerId);
    }
  }

  return c.json({
    candidates: candidates.map((p) => {
      const blockers: string[] = [];
      if (!p.isAvailable) blockers.push('Marked as not available');
      if (!p.isAccredited) blockers.push('Not accredited');
      if (!p.isActive) blockers.push('Account deactivated');
      if (conflictingProviderIds.has(p.id)) blockers.push('Already booked for another appointment at this time');
      const sameMunicipality = p.municipality.toLowerCase() === row.client.municipality.toLowerCase();
      const warnings: string[] = [];
      if (p.type === 'TRANSPORT_DRIVER' && !sameMunicipality) {
        warnings.push(`Based in ${p.municipality} (client is in ${row.client.municipality})`);
      }
      return {
        id: p.id,
        fullName: p.fullName,
        phone: maskPhone(p.phone),
        type: p.type,
        municipality: p.municipality,
        barangay: p.barangay,
        specialty: p.specialty,
        licenseNumber: p.licenseNumber,
        vehicleType: p.vehicleType,
        plateNumber: p.plateNumber,
        eligible: blockers.length === 0,
        current: p.id === row.sr.assignedProviderId,
        warnings,
        blockers,
      };
    }),
  });
});

/** Assign a doctor or driver to a service request. */
adminServices.post(
  '/service-requests/:id/assign',
  validate('param', IdParam),
  validate(
    'json',
    v.strictObject({
      providerId: v.pipe(v.string(), v.uuid()),
      scheduledAt: v.optional(v.pipe(v.string(), v.isoTimestamp('Choose a valid date and time.'))),
      note: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500))),
    }),
  ),
  async (c) => {
    const db = c.get('db');
    const staff = c.get('staff');
    const row = await loadService(c, c.req.valid('param').id);
    const body = c.req.valid('json');

    const provUser = alias(users, 'prov_user');
    const [provider] = await db
      .select({
        id: providers.id,
        fullName: provUser.fullName,
        type: providers.type,
        municipality: providers.municipality,
        specialty: providers.specialty,
        vehicleType: providers.vehicleType,
        plateNumber: providers.plateNumber,
      })
      .from(providers)
      .innerJoin(provUser, eq(provUser.id, providers.userId))
      .where(eq(providers.id, body.providerId))
      .limit(1);

    if (!provider) throw new ApiError(404, 'NOT_FOUND', 'Provider not found.');
    if (provider.type === 'TRANSPORT_DRIVER') {
      assertInScope(staff, provider.municipality, 'Provider');
    }

    const expectedType = row.sr.kind === 'telehealth' ? 'DOCTOR' : row.sr.kind === 'transport' ? 'TRANSPORT_DRIVER' : null;
    if (expectedType && provider.type !== expectedType) {
      throw new ApiError(422, 'VALIDATION_FAILED', `This request requires a ${expectedType === 'DOCTOR' ? 'doctor' : 'transport driver'}.`);
    }

    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : row.sr.scheduledAt ?? new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(serviceRequests)
        .set({
          assignedProviderId: provider.id,
          status: 'SCHEDULED',
          scheduledAt,
          handledByUserId: staff.userId,
          ...(body.note !== undefined ? { staffNote: body.note || null } : {}),
        })
        .where(eq(serviceRequests.id, row.sr.id));

      await audit(c, tx, {
        action: 'service_request.assigned',
        entityType: 'service_request',
        entityId: row.sr.id,
        municipality: row.client.municipality,
        metadata: {
          providerId: provider.id,
          providerType: provider.type,
          previousProviderId: row.sr.assignedProviderId,
          scheduledAt: scheduledAt.toISOString(),
        },
      });
    });

    const ref = serviceRef(row.sr.id);
    const label = KIND_LABEL[row.sr.kind] ?? 'request';
    const when = scheduledAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
    const providerDesc =
      provider.type === 'DOCTOR'
        ? `Dr. ${provider.fullName}${provider.specialty ? ` (${provider.specialty})` : ''}`
        : `${provider.fullName}${provider.vehicleType ? ` · ${provider.vehicleType}` : ''}${provider.plateNumber ? ` (${provider.plateNumber})` : ''}`;

    let familyEmail: string | undefined;
    familyEmail = await notifyFamily(c.env, c.get('requestId'), row.familyEmail, {
      subject: `${label} scheduled with ${provider.fullName} (${ref})`,
      lines: [
        `Your ${label.toLowerCase()} is scheduled for ${when}.`,
        `Assigned ${provider.type === 'DOCTOR' ? 'Doctor' : 'Driver'}: ${providerDesc}`,
        ...(body.note ? [`Note from your care team: ${body.note}`] : []),
      ],
    });

    return c.json({ ok: true, ...(familyEmail ? { familyEmail } : {}) });
  },
);

adminServices.post(
  '/service-requests/:id/status',
  validate('param', IdParam),
  validate(
    'json',
    v.strictObject({
      status: v.picklist(['IN_REVIEW', 'SCHEDULED', 'COMPLETED', 'CANCELLED']),
      scheduledAt: v.optional(v.pipe(v.string(), v.isoTimestamp('Choose a date and time.'))),
      note: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500))),
      reason: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(300))),
    }),
  ),
  async (c) => {
    const db = c.get('db');
    const row = await loadService(c, c.req.valid('param').id);
    const body = c.req.valid('json');
    const problem = serviceTransitionProblem(row.sr.status as ServiceStatus, body.status);
    if (problem) throw new ApiError(409, 'NOT_ALLOWED', problem);
    if (body.status === 'SCHEDULED' && !body.scheduledAt && !row.sr.scheduledAt) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Choose the date and time.', { nested: { scheduledAt: ['Choose the date and time.'] } });
    }
    if (body.status === 'CANCELLED' && (body.reason ?? '').length < 5) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Give a short reason the family will see.', { nested: { reason: ['Give a short reason (at least 5 characters).'] } });
    }
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : undefined;
    await db.transaction(async (tx) => {
      await tx
        .update(serviceRequests)
        .set({
          status: body.status,
          handledByUserId: c.get('staff').userId,
          ...(scheduledAt ? { scheduledAt } : {}),
          ...(body.note !== undefined ? { staffNote: body.note || null } : {}),
          ...(body.status === 'CANCELLED' ? { cancellationReason: body.reason } : {}),
        })
        .where(eq(serviceRequests.id, row.sr.id));
      await audit(c, tx, {
        action: `service_request.${body.status.toLowerCase()}`,
        entityType: 'service_request',
        entityId: row.sr.id,
        municipality: row.client.municipality,
        metadata: { kind: row.sr.kind, from: row.sr.status, scheduledAt: body.scheduledAt ?? null, reason: body.reason ?? null, noteChanged: body.note !== undefined },
      });
    });
    const ref = serviceRef(row.sr.id);
    const label = KIND_LABEL[row.sr.kind] ?? 'request';
    const when = (scheduledAt ?? (row.sr.scheduledAt ? new Date(row.sr.scheduledAt) : null))?.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
    let familyEmail: string | undefined;
    if (body.status === 'SCHEDULED' || body.status === 'CANCELLED') {
      familyEmail = await notifyFamily(c.env, c.get('requestId'), row.familyEmail, {
        subject: body.status === 'SCHEDULED' ? `${label} scheduled (${ref})` : `${label} cancelled (${ref})`,
        lines: [
          body.status === 'SCHEDULED' ? `Your ${label.toLowerCase()} is scheduled for ${when ?? 'the scheduled time'}.` : `Your ${label.toLowerCase()} (${ref}) was cancelled. Reason: ${body.reason}`,
          ...(body.note ? [`Note from your care team: ${body.note}`] : []),
        ],
      });
    }
    return c.json({ ok: true, ...(familyEmail ? { familyEmail } : {}) });
  },
);

/** Opens an attached file (e.g. a prescription photo). Audited. */
adminServices.get('/service-requests/:id/files/:fileId', validate('param', v.object({ id: v.pipe(v.string(), v.uuid()), fileId: v.pipe(v.string(), v.uuid()) })), async (c) => {
  const db = c.get('db');
  const { id, fileId } = c.req.valid('param');
  const row = await loadService(c, id);
  const [file] = await db.select().from(uploads).where(and(eq(uploads.id, fileId), eq(uploads.serviceRequestId, row.sr.id))).limit(1);
  if (!file) throw new ApiError(404, 'FILE_NOT_FOUND', 'File not found.');
  const object = await c.env.UPLOADS.get(file.objectKey);
  if (!object) throw new ApiError(404, 'FILE_NOT_FOUND', 'File not found.');
  await audit(c, db, { action: 'service_request.file_viewed', entityType: 'service_request', entityId: row.sr.id, municipality: row.client.municipality, metadata: { fileId } });
  return new Response(await object.arrayBuffer(), {
    headers: {
      'Content-Type': file.contentType,
      'Content-Length': String(object.size),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    },
  });
});
