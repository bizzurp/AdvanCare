import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Hono } from 'hono';
import * as v from 'valibot';
import { audit } from '../../audit';
import { clientProfiles, providers, serviceRequests, users } from '../../db/schema';
import type { AppEnv } from '../../env';
import { ApiError } from '../../lib/errors';
import { validate } from '../../lib/validation';
import { isKnownMunicipality } from '../../staff/municipalities';
import { assertInScope, inScope, maskPhone, scopeCondition } from '../../staff/scope';
import { serviceRef } from '../services';
import { PAGE_SIZE } from './operations';

const IdParam = v.object({ id: v.pipe(v.string(), v.uuid()) });
const Page = v.optional(v.pipe(v.string(), v.regex(/^\d{1,4}$/), v.transform(Number)), '1');
const like = (q: string) => `%${q.replace(/[%_\\]/g, '\\$&')}%`;
const Phone = v.pipe(v.string(), v.trim(), v.regex(/^(\+63|0)9\d{9}$/, 'Enter a Philippine mobile number, like 09171234567.'));
const Email = v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email('Enter a valid email address.'), v.maxLength(255));
const normalizePhone = (p: string) => (p.startsWith('+63') ? `0${p.slice(3)}` : p);
const isUnique = (err: unknown) => (err as { code?: string; cause?: { code?: string } }).code === '23505' || (err as { cause?: { code?: string } }).cause?.code === '23505';

const providerUser = alias(users, 'provider_user');

export const adminProviders = new Hono<AppEnv>();

adminProviders.get(
  '/providers',
  validate(
    'query',
    v.object({
      type: v.optional(v.picklist(['DOCTOR', 'TRANSPORT_DRIVER'])),
      municipality: v.optional(v.pipe(v.string(), v.maxLength(100))),
      available: v.optional(v.picklist(['yes', 'no'])),
      q: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100))),
      page: Page,
    }),
  ),
  async (c) => {
    const db = c.get('db');
    const staff = c.get('staff');
    const f = c.req.valid('query');
    const isSuper = staff.role === 'SUPER_ADMIN';
    if (!isSuper && f.type === 'DOCTOR') {
      throw new ApiError(403, 'FORBIDDEN', 'Only Super Admins can access doctors and teleconsultants.');
    }
    const targetType = !isSuper ? 'TRANSPORT_DRIVER' : f.type;

    const where: SQL | undefined = and(
      scopeCondition(staff, providers.municipality),
      targetType ? eq(providers.type, targetType) : undefined,
      f.municipality ? eq(providers.municipality, f.municipality) : undefined,
      f.available ? eq(providers.isAvailable, f.available === 'yes') : undefined,
      f.q
        ? or(
            ilike(providerUser.fullName, like(f.q)),
            ilike(providers.specialty, like(f.q)),
            ilike(providers.licenseNumber, like(f.q)),
            ilike(providers.plateNumber, like(f.q)),
          )
        : undefined,
    );
    const [rows, [total]] = await Promise.all([
      db
        .select({
          id: providers.id,
          userId: providers.userId,
          fullName: providerUser.fullName,
          phone: providerUser.phoneNumber,
          email: providerUser.email,
          type: providers.type,
          municipality: providers.municipality,
          barangay: providers.barangay,
          specialty: providers.specialty,
          licenseNumber: providers.licenseNumber,
          vehicleType: providers.vehicleType,
          plateNumber: providers.plateNumber,
          isAvailable: providers.isAvailable,
          isAccredited: providers.isAccredited,
          isActive: providerUser.isActive,
          activeRequests: sql<number>`(select count(*)::int from ${serviceRequests} where ${serviceRequests.assignedProviderId} = ${providers.id} and ${serviceRequests.status} in ('SUBMITTED','IN_REVIEW','SCHEDULED'))`,
          totalRequests: sql<number>`(select count(*)::int from ${serviceRequests} where ${serviceRequests.assignedProviderId} = ${providers.id})`,
        })
        .from(providers)
        .innerJoin(providerUser, eq(providerUser.id, providers.userId))
        .where(where)
        .orderBy(asc(providerUser.fullName))
        .limit(PAGE_SIZE)
        .offset((f.page - 1) * PAGE_SIZE),
      db.select({ n: count() }).from(providers).innerJoin(providerUser, eq(providerUser.id, providers.userId)).where(where),
    ]);
    return c.json({
      providers: rows.map((r) => ({ ...r, phone: maskPhone(r.phone) })),
      total: total?.n ?? 0,
      page: f.page,
      pageSize: PAGE_SIZE,
    });
  },
);

adminProviders.post(
  '/providers',
  validate(
    'json',
    v.strictObject({
      fullName: v.pipe(v.string(), v.trim(), v.minLength(2, 'Enter the full name.'), v.maxLength(255)),
      email: Email,
      phone: Phone,
      type: v.picklist(['DOCTOR', 'TRANSPORT_DRIVER']),
      municipality: v.pipe(v.string(), v.check(isKnownMunicipality, 'Choose a municipality in Cagayan.')),
      barangay: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100))),
      specialty: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(120))),
      licenseNumber: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(50))),
      vehicleType: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(50))),
      plateNumber: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(20))),
      isAvailable: v.optional(v.boolean(), true),
      isAccredited: v.optional(v.boolean(), true),
    }),
  ),
  async (c) => {
    const db = c.get('db');
    const staff = c.get('staff');
    const body = c.req.valid('json');
    if (body.type === 'DOCTOR' && staff.role !== 'SUPER_ADMIN') {
      throw new ApiError(403, 'FORBIDDEN', 'Only Super Admins can add doctors and teleconsultants.');
    }
    if (!inScope(staff, body.municipality)) throw new ApiError(403, 'FORBIDDEN', 'You can only add providers in your own municipalities.');
    if (body.type === 'DOCTOR' && !body.specialty) throw new ApiError(422, 'VALIDATION_FAILED', 'Specialty is required for doctors.');
    if (body.type === 'TRANSPORT_DRIVER' && !body.vehicleType) throw new ApiError(422, 'VALIDATION_FAILED', 'Vehicle type is required for transport drivers.');

    try {
      const id = await db.transaction(async (tx) => {
        const [u] = await tx
          .insert(users)
          .values({
            role: body.type,
            fullName: body.fullName,
            email: body.email,
            phoneNumber: normalizePhone(body.phone),
          })
          .returning({ id: users.id });

        const [p] = await tx
          .insert(providers)
          .values({
            userId: u!.id,
            type: body.type,
            municipality: body.municipality,
            barangay: body.barangay || null,
            specialty: body.specialty || null,
            licenseNumber: body.licenseNumber || null,
            vehicleType: body.vehicleType || null,
            plateNumber: body.plateNumber || null,
            isAvailable: body.isAvailable ?? true,
            isAccredited: body.isAccredited ?? true,
          })
          .returning({ id: providers.id });

        await audit(c, tx, {
          action: 'provider.created',
          entityType: 'provider',
          entityId: p!.id,
          municipality: body.municipality,
          metadata: { type: body.type, specialty: body.specialty, vehicleType: body.vehicleType },
        });

        return p!.id;
      });
      return c.json({ id }, 201);
    } catch (err) {
      if (isUnique(err)) throw new ApiError(409, 'ALREADY_EXISTS', 'Someone already uses that email or mobile number.');
      throw err;
    }
  },
);

adminProviders.get('/providers/:id', validate('param', IdParam), async (c) => {
  const db = c.get('db');
  const staff = c.get('staff');
  const [row] = await db
    .select({
      provider: providers,
      fullName: providerUser.fullName,
      phone: providerUser.phoneNumber,
      email: providerUser.email,
      isActive: providerUser.isActive,
    })
    .from(providers)
    .innerJoin(providerUser, eq(providerUser.id, providers.userId))
    .where(eq(providers.id, c.req.valid('param').id))
    .limit(1);

  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Provider not found.');
  if (row.provider.type === 'DOCTOR' && staff.role !== 'SUPER_ADMIN') {
    throw new ApiError(404, 'NOT_FOUND', 'Provider not found.');
  }
  assertInScope(staff, row.provider.municipality, 'Provider');

  const requests = await db
    .select({
      id: serviceRequests.id,
      kind: serviceRequests.kind,
      status: serviceRequests.status,
      createdAt: serviceRequests.createdAt,
      scheduledAt: serviceRequests.scheduledAt,
      preferredAt: serviceRequests.preferredAt,
      clientId: clientProfiles.id,
      clientName: clientProfiles.fullName,
      municipality: clientProfiles.municipality,
      barangay: clientProfiles.barangay,
    })
    .from(serviceRequests)
    .innerJoin(clientProfiles, eq(clientProfiles.id, serviceRequests.clientId))
    .where(and(eq(serviceRequests.assignedProviderId, row.provider.id), scopeCondition(staff, clientProfiles.municipality)))
    .orderBy(desc(serviceRequests.createdAt))
    .limit(100);

  const completed = requests.filter((r) => r.status === 'COMPLETED');
  const active = requests.filter((r) => ['SUBMITTED', 'IN_REVIEW', 'SCHEDULED'].includes(r.status));

  return c.json({
    provider: {
      ...row.provider,
      fullName: row.fullName,
      email: row.email,
      phone: maskPhone(row.phone),
      accountActive: row.isActive,
    },
    requests: requests.map((r) => ({
      ...r,
      ref: serviceRef(r.id),
      client: { id: r.clientId, name: r.clientName },
    })),
    stats: {
      completedCount: completed.length,
      activeCount: active.length,
      totalCount: requests.length,
    },
  });
});

adminProviders.patch(
  '/providers/:id',
  validate('param', IdParam),
  validate(
    'json',
    v.strictObject({
      isAvailable: v.optional(v.boolean()),
      isAccredited: v.optional(v.boolean()),
      specialty: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(120))),
      licenseNumber: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(50))),
      vehicleType: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(50))),
      plateNumber: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(20))),
      municipality: v.optional(v.pipe(v.string(), v.check(isKnownMunicipality, 'Choose a municipality in Cagayan.'))),
      barangay: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100))),
      active: v.optional(v.boolean()),
    }),
  ),
  async (c) => {
    const db = c.get('db');
    const staff = c.get('staff');
    const body = c.req.valid('json');
    const [row] = await db
      .select({ p: providers, isActive: providerUser.isActive })
      .from(providers)
      .innerJoin(providerUser, eq(providerUser.id, providers.userId))
      .where(eq(providers.id, c.req.valid('param').id))
      .limit(1);

    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Provider not found.');
    if (row.p.type === 'DOCTOR' && staff.role !== 'SUPER_ADMIN') {
      throw new ApiError(403, 'FORBIDDEN', 'Only Super Admins can update doctors and teleconsultants.');
    }
    assertInScope(staff, row.p.municipality, 'Provider');
    if (body.municipality && !inScope(staff, body.municipality)) throw new ApiError(403, 'FORBIDDEN', 'You can only move providers within your own municipalities.');

    const pChanges: Partial<typeof providers.$inferInsert> = {};
    if (body.isAvailable !== undefined) pChanges.isAvailable = body.isAvailable;
    if (body.isAccredited !== undefined) pChanges.isAccredited = body.isAccredited;
    if (body.specialty !== undefined) pChanges.specialty = body.specialty || null;
    if (body.licenseNumber !== undefined) pChanges.licenseNumber = body.licenseNumber || null;
    if (body.vehicleType !== undefined) pChanges.vehicleType = body.vehicleType || null;
    if (body.plateNumber !== undefined) pChanges.plateNumber = body.plateNumber || null;
    if (body.municipality !== undefined) pChanges.municipality = body.municipality;
    if (body.barangay !== undefined) pChanges.barangay = body.barangay || null;

    await db.transaction(async (tx) => {
      if (Object.keys(pChanges).length) {
        await tx.update(providers).set(pChanges).where(eq(providers.id, row.p.id));
      }
      if (body.active !== undefined && body.active !== row.isActive) {
        await tx.update(users).set({ isActive: body.active }).where(eq(users.id, row.p.userId));
      }
      await audit(c, tx, {
        action: 'provider.updated',
        entityType: 'provider',
        entityId: row.p.id,
        municipality: body.municipality ?? row.p.municipality,
        metadata: { changes: Object.keys(pChanges), activeChanged: body.active !== undefined },
      });
    });

    return c.json({ ok: true });
  },
);
