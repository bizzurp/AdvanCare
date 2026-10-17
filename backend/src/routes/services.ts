import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import * as v from 'valibot';
import { clientProfiles, idempotencyRecords, providers, SERVICE_KINDS, serviceRequests, uploads, users } from '../db/schema';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { validate } from '../lib/validation';
import { requireClient } from '../middleware/auth';
import { withDb } from '../middleware/staff';
import { sha256Hex } from '../staff/crypto';
import { UPLOAD_TYPES } from './storage';

/**
 * The other services (P2): TeleHealth, RHU services, Triage, Prescription, Transport.
 * The app sends what the family entered; staff review and schedule it in the console.
 * Nothing here decides urgency or a clinical destination (triage is for clinician review only).
 */
const SERVICE_PATH = '/api/v1/service-requests';
const MAX_DETAILS_BYTES = 8 * 1024;
export const serviceRef = (id: string) => `SVC-${id.slice(0, 8).toUpperCase()}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const appServices = new Hono<AppEnv>();
appServices.use('/uploads', withDb, requireClient);
appServices.use('/uploads/*', withDb, requireClient);
appServices.use('/service-requests', withDb, requireClient);
appServices.use('/service-requests/*', withDb, requireClient);

// ---------- Uploads (prescription photos) ----------

/** Raw file body; Content-Type must be JPEG, PNG or PDF. Stored in R2 and recorded with its owner. */
appServices.post(
  '/uploads',
  bodyLimit({
    maxSize: 10 * 1024 * 1024,
    onError: () => {
      throw new ApiError(413, 'FILE_TOO_LARGE', 'The file is too large. Images may be up to 5 MB and PDFs up to 10 MB.');
    },
  }),
  async (c) => {
    const type = (c.req.header('Content-Type') ?? '').split(';')[0]!.trim() as keyof typeof UPLOAD_TYPES;
    const rule = UPLOAD_TYPES[type];
    if (!rule) throw new ApiError(422, 'VALIDATION_FAILED', 'Only JPEG, PNG and PDF files are accepted.');
    const body = new Uint8Array(await c.req.arrayBuffer());
    if (!body.byteLength) throw new ApiError(422, 'VALIDATION_FAILED', 'The file is empty.');
    if (body.byteLength > rule.maxBytes) throw new ApiError(413, 'FILE_TOO_LARGE', 'The file is too large. Images may be up to 5 MB and PDFs up to 10 MB.');
    // Check the file really is what it claims (magic bytes), so a renamed file can't slip through.
    const magic = [...body.subarray(0, 4)];
    const ok = type === 'application/pdf' ? magic.join() === '37,80,68,70' : type === 'image/png' ? magic.join() === '137,80,78,71' : magic[0] === 0xff && magic[1] === 0xd8;
    if (!ok) throw new ApiError(422, 'VALIDATION_FAILED', 'That file doesn’t look like a JPEG, PNG or PDF.');
    const now = new Date();
    const key = `uploads/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${rule.ext}`;
    await c.env.UPLOADS.put(key, body, { httpMetadata: { contentType: type } });
    let fileName: string | null = null;
    try {
      fileName = decodeURIComponent(c.req.header('X-File-Name') ?? '').replace(/[^\p{L}\p{N} ._()-]/gu, '').slice(0, 255) || null;
    } catch {
      fileName = null;
    }
    const [row] = await c.get('db').insert(uploads).values({ objectKey: key, ownerUserId: c.get('clientUserId'), contentType: type, sizeBytes: body.byteLength, fileName }).returning({ id: uploads.id });
    return c.json({ id: row!.id, fileName, contentType: type, size: body.byteLength }, 201);
  },
);

// ---------- Service requests ----------

const ServiceRequestBody = v.strictObject({
  kind: v.picklist(SERVICE_KINDS),
  /** Server client id or the profile's id on the phone. */
  clientId: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{6,64}$/)),
  preferredAt: v.optional(v.nullable(v.pipe(v.string(), v.isoTimestamp('Invalid date and time.')))),
  /** Short summary the app shows (e.g. "Consult · Dr. Reyes"). */
  summary: v.pipe(v.string(), v.trim(), v.minLength(2), v.maxLength(200)),
  /** What the family entered; kept as sent (size-limited). */
  details: v.pipe(
    v.record(v.string(), v.unknown()),
    v.check((d) => JSON.stringify(d).length <= MAX_DETAILS_BYTES, 'Too much detail in one request.'),
  ),
  uploadIds: v.optional(v.pipe(v.array(v.pipe(v.string(), v.uuid())), v.maxLength(3)), []),
});

/** Open TeleHealth bookings already holding this doctor's slot (cancelled ones free it again). */
async function slotTaken(db: AppEnv['Variables']['db'], doctorId: string, at: Date, exceptId?: string) {
  if (doctorId === 'gp-any') return false;
  const [hit] = await db
    .select({ id: serviceRequests.id })
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.kind, 'telehealth'),
        or(
          sql`${serviceRequests.assignedProviderId}::text = ${doctorId}`,
          and(
            isNull(serviceRequests.assignedProviderId),
            sql`${serviceRequests.details}->>'doctorId' = ${doctorId}`,
          ),
        ),
        sql`coalesce(${serviceRequests.scheduledAt}, ${serviceRequests.preferredAt}) = ${at.toISOString()}::timestamptz`,
        sql`${serviceRequests.status} <> 'CANCELLED'`,
        exceptId ? sql`${serviceRequests.id} <> ${exceptId}` : undefined,
      ),
    )
    .limit(1);
  return !!hit;
}

const DOCTOR_ID = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{1,40}$/));

/** Universal list of accredited telehealth doctors for mobile booking across all municipalities. */
appServices.get('/service-requests/telehealth/doctors', async (c) => {
  const db = c.get('db');
  const provUser = alias(users, 'doctor_user');
  const rows = await db
    .select({
      id: providers.id,
      fullName: provUser.fullName,
      specialty: providers.specialty,
      municipality: providers.municipality,
      barangay: providers.barangay,
      isAvailable: providers.isAvailable,
    })
    .from(providers)
    .innerJoin(provUser, eq(provUser.id, providers.userId))
    .where(and(eq(providers.type, 'DOCTOR'), eq(providers.isAccredited, true), eq(provUser.isActive, true)))
    .orderBy(asc(provUser.fullName));

  return c.json({
    doctors: rows.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      specialty: r.specialty,
      municipality: r.municipality,
      barangay: r.barangay,
      isAvailable: r.isAvailable,
    })),
  });
});

/** Times already booked for a doctor on one day (Asia/Manila), so the app can grey them out. */
appServices.get(
  '/service-requests/telehealth/taken',
  validate('query', v.object({ doctorId: DOCTOR_ID, date: v.pipe(v.string(), v.isoDate()) })),
  async (c) => {
    const { doctorId, date } = c.req.valid('query');
    if (doctorId === 'gp-any') return c.json({ taken: [] });
    const rows = await c
      .get('db')
      .select({ at: sql<string>`coalesce(${serviceRequests.scheduledAt}, ${serviceRequests.preferredAt})` })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.kind, 'telehealth'),
          or(
            sql`${serviceRequests.assignedProviderId}::text = ${doctorId}`,
            and(
              isNull(serviceRequests.assignedProviderId),
              sql`${serviceRequests.details}->>'doctorId' = ${doctorId}`,
            ),
          ),
          sql`${serviceRequests.status} <> 'CANCELLED'`,
          sql`(coalesce(${serviceRequests.scheduledAt}, ${serviceRequests.preferredAt}) at time zone 'Asia/Manila')::date = ${date}::date`,
        ),
      );
    return c.json({ taken: rows.map((r) => new Date(r.at).toISOString()) });
  },
);

appServices.post('/service-requests', validate('json', ServiceRequestBody), async (c) => {
  const db = c.get('db');
  const userId = c.get('clientUserId');
  const key = c.req.header('Idempotency-Key') ?? '';
  if (!/^[A-Za-z0-9_-]{8,255}$/.test(key)) throw new ApiError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Missing request id. Update the app and try again.');
  const body = c.req.valid('json');
  const requestHash = await sha256Hex(JSON.stringify(body));
  const replay = async () => {
    const [prior] = await db
      .select()
      .from(idempotencyRecords)
      .where(and(eq(idempotencyRecords.idempotencyKey, key), eq(idempotencyRecords.requestMethod, 'POST'), eq(idempotencyRecords.requestPath, SERVICE_PATH)))
      .limit(1);
    if (!prior) return null;
    if (prior.userId !== userId || prior.requestHash !== requestHash) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'This request id was already used for a different request.');
    return c.json(prior.responseBody as Record<string, unknown>, 201);
  };
  const earlier = await replay();
  if (earlier) return earlier;

  const [client] = await db
    .select({ id: clientProfiles.id })
    .from(clientProfiles)
    .where(and(eq(clientProfiles.userId, userId), UUID.test(body.clientId) ? or(eq(clientProfiles.id, body.clientId), eq(clientProfiles.deviceRef, body.clientId)) : eq(clientProfiles.deviceRef, body.clientId)))
    .limit(1);
  if (!client) throw new ApiError(404, 'CLIENT_NOT_FOUND', 'We couldn’t find this client’s profile. Open the profile, save it, and try again.');

  if (body.kind === 'telehealth' && body.preferredAt && typeof body.details.doctorId === 'string' && (await slotTaken(db, body.details.doctorId, new Date(body.preferredAt)))) {
    throw new ApiError(409, 'SLOT_TAKEN', 'That time was just booked by someone else. Choose another time.');
  }

  if (body.uploadIds.length) {
    const mine = await db
      .select({ id: uploads.id })
      .from(uploads)
      .where(and(inArray(uploads.id, body.uploadIds), eq(uploads.ownerUserId, userId), isNull(uploads.serviceRequestId)));
    if (mine.length !== new Set(body.uploadIds).size) throw new ApiError(422, 'VALIDATION_FAILED', 'One of the attached files is missing. Attach it again.');
  }

  try {
    const response = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(serviceRequests)
        .values({
          clientId: client.id,
          requestedByUserId: userId,
          kind: body.kind,
          preferredAt: body.preferredAt ? new Date(body.preferredAt) : null,
          details: { summary: body.summary, ...body.details },
        })
        .returning();
      if (body.uploadIds.length) await tx.update(uploads).set({ serviceRequestId: row!.id }).where(inArray(uploads.id, body.uploadIds));
      const out = { id: row!.id, ref: serviceRef(row!.id), kind: row!.kind, status: row!.status, createdAt: row!.createdAt };
      await tx.insert(idempotencyRecords).values({ idempotencyKey: key, userId, requestMethod: 'POST', requestPath: SERVICE_PATH, requestHash, responseStatus: 201, responseBody: out, expiresAt: new Date(Date.now() + 24 * 3600_000) });
      return out;
    });
    return c.json(response, 201);
  } catch (err) {
    if ((err as { code?: string }).code === '23505' || (err as { cause?: { code?: string } }).cause?.code === '23505') {
      const raced = await replay();
      if (raced) return raced;
    }
    throw err;
  }
});

const providerUser = alias(users, 'provider_user');

/** The family's own service requests, with staff's status, schedule and note. */
appServices.get('/service-requests/mine', async (c) => {
  const rows = await c
    .get('db')
    .select({
      id: serviceRequests.id,
      kind: serviceRequests.kind,
      status: serviceRequests.status,
      preferredAt: serviceRequests.preferredAt,
      scheduledAt: serviceRequests.scheduledAt,
      staffNote: serviceRequests.staffNote,
      cancellationReason: serviceRequests.cancellationReason,
      updatedAt: serviceRequests.updatedAt,
      files: sql<number>`(select count(*)::int from ${uploads} where ${uploads.serviceRequestId} = ${serviceRequests.id})`,
      assignedProviderId: providers.id,
      assignedProviderType: providers.type,
      assignedProviderName: providerUser.fullName,
      assignedProviderSpecialty: providers.specialty,
      assignedProviderVehicle: providers.vehicleType,
      assignedProviderPlate: providers.plateNumber,
    })
    .from(serviceRequests)
    .innerJoin(clientProfiles, eq(clientProfiles.id, serviceRequests.clientId))
    .leftJoin(providers, eq(providers.id, serviceRequests.assignedProviderId))
    .leftJoin(providerUser, eq(providerUser.id, providers.userId))
    .where(eq(clientProfiles.userId, c.get('clientUserId')))
    .orderBy(desc(serviceRequests.createdAt))
    .limit(100);
  return c.json({
    requests: rows.map(({ assignedProviderId, assignedProviderType, assignedProviderName, assignedProviderSpecialty, assignedProviderVehicle, assignedProviderPlate, ...r }) => ({
      ...r,
      ref: serviceRef(r.id),
      assignedProvider: assignedProviderId
        ? {
            id: assignedProviderId,
            type: assignedProviderType,
            fullName: assignedProviderName,
            specialty: assignedProviderSpecialty,
            vehicleType: assignedProviderVehicle,
            plateNumber: assignedProviderPlate,
          }
        : null,
    })),
  });
});

/** Families can withdraw a request staff haven't scheduled yet. */
appServices.post('/service-requests/:id/cancel', validate('param', v.object({ id: v.pipe(v.string(), v.uuid()) })), async (c) => {
  const db = c.get('db');
  const [row] = await db
    .select({ id: serviceRequests.id, status: serviceRequests.status })
    .from(serviceRequests)
    .innerJoin(clientProfiles, eq(clientProfiles.id, serviceRequests.clientId))
    .where(and(eq(serviceRequests.id, c.req.valid('param').id), eq(clientProfiles.userId, c.get('clientUserId'))))
    .limit(1);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Request not found.');
  if (!['SUBMITTED', 'IN_REVIEW'].includes(row.status)) throw new ApiError(409, 'NOT_ALLOWED', 'This request is already scheduled or closed. Contact your care team to change it.');
  await db.update(serviceRequests).set({ status: 'CANCELLED', cancellationReason: 'Cancelled by the family' }).where(eq(serviceRequests.id, row.id));
  return c.json({ ok: true });
});

const ServiceChange = v.strictObject({
  preferredAt: v.optional(v.nullable(v.pipe(v.string(), v.isoTimestamp('Invalid date and time.')))),
  summary: v.optional(v.pipe(v.string(), v.trim(), v.minLength(2), v.maxLength(200))),
  /** Replaces what the family entered (the summary is kept alongside). */
  details: v.optional(v.pipe(v.record(v.string(), v.unknown()), v.check((d) => JSON.stringify(d).length <= MAX_DETAILS_BYTES, 'Too much detail in one request.'))),
});

/** Families change their own request (time, details) until staff schedule it. */
appServices.patch('/service-requests/:id', validate('param', v.object({ id: v.pipe(v.string(), v.uuid()) })), validate('json', ServiceChange), async (c) => {
  const db = c.get('db');
  const body = c.req.valid('json');
  const [row] = await db
    .select({ id: serviceRequests.id, status: serviceRequests.status, kind: serviceRequests.kind, details: serviceRequests.details, preferredAt: serviceRequests.preferredAt })
    .from(serviceRequests)
    .innerJoin(clientProfiles, eq(clientProfiles.id, serviceRequests.clientId))
    .where(and(eq(serviceRequests.id, c.req.valid('param').id), eq(clientProfiles.userId, c.get('clientUserId'))))
    .limit(1);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Request not found.');
  if (!['SUBMITTED', 'IN_REVIEW'].includes(row.status)) throw new ApiError(409, 'NOT_ALLOWED', 'This request is already scheduled or closed. Contact your care team to change it.');
  const before = row.details as Record<string, unknown>;
  const details: Record<string, unknown> = { ...(body.details ?? before), summary: body.summary ?? before.summary };
  const preferredAt = body.preferredAt === undefined ? row.preferredAt : body.preferredAt ? new Date(body.preferredAt) : null;
  if (preferredAt && preferredAt.getTime() < Date.now()) throw new ApiError(422, 'VALIDATION_FAILED', 'Choose a future date and time.');
  if (row.kind === 'telehealth' && preferredAt && typeof details.doctorId === 'string' && (await slotTaken(db, details.doctorId, preferredAt, row.id))) {
    throw new ApiError(409, 'SLOT_TAKEN', 'That time is already booked. Choose another time.');
  }
  await db.update(serviceRequests).set({ details, preferredAt }).where(eq(serviceRequests.id, row.id));
  return c.json({ ok: true, preferredAt });
});

const ServiceRate = v.strictObject({
  rating: v.pipe(v.number(), v.integer(), v.minValue(1, 'Rating must be at least 1 star.'), v.maxValue(5, 'Rating cannot exceed 5 stars.')),
  review: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(1000))),
});

appServices.post('/service-requests/:id/rate', validate('param', v.object({ id: v.pipe(v.string(), v.uuid()) })), validate('json', ServiceRate), async (c) => {
  const db = c.get('db');
  const serviceId = c.req.valid('param').id;
  const { rating, review } = c.req.valid('json');

  const [row] = await db
    .select({ id: serviceRequests.id, status: serviceRequests.status, details: serviceRequests.details })
    .from(serviceRequests)
    .innerJoin(clientProfiles, eq(clientProfiles.id, serviceRequests.clientId))
    .where(and(eq(serviceRequests.id, serviceId), eq(clientProfiles.userId, c.get('clientUserId'))))
    .limit(1);

  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Request not found.');
  if (row.status !== 'COMPLETED') throw new ApiError(409, 'NOT_ALLOWED', 'You can only rate a completed service.');

  const details = { ...(row.details as Record<string, unknown>), rating, review: review || null, ratedAt: new Date().toISOString() };
  await db.update(serviceRequests).set({ details }).where(eq(serviceRequests.id, row.id));

  return c.json({ ok: true, rating, review: review || null });
});

const ServiceReport = v.strictObject({
  reason: v.pipe(v.string(), v.trim(), v.minLength(3, 'Select or describe the reason for your report.'), v.maxLength(200)),
  details: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(1000))),
});

appServices.post('/service-requests/:id/report', validate('param', v.object({ id: v.pipe(v.string(), v.uuid()) })), validate('json', ServiceReport), async (c) => {
  const db = c.get('db');
  const serviceId = c.req.valid('param').id;
  const { reason, details } = c.req.valid('json');

  const [row] = await db
    .select({ id: serviceRequests.id, status: serviceRequests.status, details: serviceRequests.details })
    .from(serviceRequests)
    .innerJoin(clientProfiles, eq(clientProfiles.id, serviceRequests.clientId))
    .where(and(eq(serviceRequests.id, serviceId), eq(clientProfiles.userId, c.get('clientUserId'))))
    .limit(1);

  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Request not found.');

  const reportData = { reason, details: details || null, reportedAt: new Date().toISOString() };
  const updatedDetails = { ...(row.details as Record<string, unknown>), reportedIssue: reportData };
  const staffNote = `[ISSUE REPORTED: ${reason}]${details ? ` ${details}` : ''}`;

  await db.update(serviceRequests).set({ details: updatedDetails, staffNote }).where(eq(serviceRequests.id, row.id));

  return c.json({ ok: true });
});

