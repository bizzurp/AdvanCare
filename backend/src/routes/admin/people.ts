import { and, asc, count, desc, eq, ilike, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Hono, type Context } from 'hono';
import * as v from 'valibot';
import { audit } from '../../audit';
import { careNotes, caregivers, clientProfiles, familyProfiles, shifts, users } from '../../db/schema';
import type { AppEnv } from '../../env';
import { ApiError } from '../../lib/errors';
import { validate } from '../../lib/validation';
import { assertInScope, maskPhone, requestRef, scopeCondition, shortName } from '../../staff/scope';
import { PAGE_SIZE } from './operations';

const IdParam = v.object({ id: v.pipe(v.string(), v.uuid()) });
const Page = v.optional(v.pipe(v.string(), v.regex(/^\d{1,4}$/), v.transform(Number)), '1');
const like = (q: string) => `%${q.replace(/[%_\\]/g, '\\$&')}%`;
const OPEN = ['REQUESTED', 'MATCHING', 'CONFIRMED', 'IN_PROGRESS', 'ESCALATED'] as const;

const manager = alias(users, 'manager');
const caregiverUser = alias(users, 'caregiver_user');

/** Clients and caregivers (phase B). Phones are masked, government ID numbers never leave the server. */
export const adminPeople = new Hono<AppEnv>();

// ---------- Clients ----------

adminPeople.get(
  '/clients',
  validate('query', v.object({ q: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100))), municipality: v.optional(v.pipe(v.string(), v.maxLength(100))), barangay: v.optional(v.pipe(v.string(), v.maxLength(100))), page: Page })),
  async (c) => {
    const db = c.get('db');
    const f = c.req.valid('query');
    const where = and(
      scopeCondition(c.get('staff'), clientProfiles.municipality),
      f.municipality ? eq(clientProfiles.municipality, f.municipality) : undefined,
      f.barangay ? eq(clientProfiles.barangay, f.barangay) : undefined,
      f.q ? ilike(clientProfiles.fullName, like(f.q)) : undefined,
    );
    const [rows, [total]] = await Promise.all([
      db
        .select({
          id: clientProfiles.id,
          fullName: clientProfiles.fullName,
          sitio: clientProfiles.sitio,
          barangay: clientProfiles.barangay,
          municipality: clientProfiles.municipality,
          createdAt: clientProfiles.createdAt,
          managerPhone: manager.phoneNumber,
          openRequests: sql<number>`(select count(*)::int from ${shifts} where ${shifts.clientId} = ${clientProfiles.id} and ${shifts.status} in ('REQUESTED','MATCHING','CONFIRMED','IN_PROGRESS','ESCALATED'))`,
          totalRequests: sql<number>`(select count(*)::int from ${shifts} where ${shifts.clientId} = ${clientProfiles.id})`,
          lastRequestAt: sql<string | null>`(select max(${shifts.createdAt}) from ${shifts} where ${shifts.clientId} = ${clientProfiles.id})`,
        })
        .from(clientProfiles)
        .innerJoin(manager, eq(manager.id, clientProfiles.userId))
        .where(where)
        .orderBy(asc(clientProfiles.fullName))
        .limit(PAGE_SIZE)
        .offset((f.page - 1) * PAGE_SIZE),
      db.select({ n: count() }).from(clientProfiles).where(where),
    ]);
    return c.json({
      clients: rows.map(({ managerPhone, ...r }) => ({ ...r, phone: maskPhone(managerPhone) })),
      total: total?.n ?? 0,
      page: f.page,
      pageSize: PAGE_SIZE,
    });
  },
);

async function loadClient(c: Context<AppEnv>, id: string) {
  const [row] = await c.get('db').select().from(clientProfiles).where(eq(clientProfiles.id, id)).limit(1);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Client not found.');
  assertInScope(c.get('staff'), row.municipality, 'Client');
  return row;
}

/** Opening a client record is a sensitive read: it's audited. Clinical data is NOT included here. */
adminPeople.get('/clients/:id', validate('param', IdParam), async (c) => {
  const db = c.get('db');
  const client = await loadClient(c, c.req.valid('param').id);
  const [[account], family, history] = await Promise.all([
    db.select({ fullName: users.fullName, role: users.role, phone: users.phoneNumber }).from(users).where(eq(users.id, client.userId)).limit(1),
    db.select().from(familyProfiles).where(eq(familyProfiles.clientId, client.id)).orderBy(desc(familyProfiles.isEmergencyContact), asc(familyProfiles.relativeName)),
    db
      .select({
        id: shifts.id,
        createdAt: shifts.createdAt,
        status: shifts.status,
        tier: shifts.shiftTier,
        scheduledDate: shifts.scheduledDate,
        grossRate: shifts.grossRate,
        caregiverId: caregivers.id,
        caregiverName: caregiverUser.fullName,
      })
      .from(shifts)
      .leftJoin(caregivers, eq(caregivers.id, shifts.caregiverId))
      .leftJoin(caregiverUser, eq(caregiverUser.id, caregivers.userId))
      .where(eq(shifts.clientId, client.id))
      .orderBy(desc(shifts.createdAt))
      .limit(100),
  ]);
  await audit(c, db, { action: 'client.viewed', entityType: 'client', entityId: client.id, municipality: client.municipality });
  const age = client.dateOfBirth ? Math.floor((Date.now() - new Date(client.dateOfBirth).getTime()) / (365.25 * 86400_000)) : null;
  return c.json({
    client: {
      id: client.id,
      fullName: client.fullName,
      age,
      gender: client.gender,
      sitio: client.sitio,
      barangay: client.barangay,
      municipality: client.municipality,
      landmarkNotes: client.landmarkNotes,
      createdAt: client.createdAt,
      // Only whether an ID is on file; the numbers themselves stay on the server.
      idsOnFile: { philhealth: !!client.philhealthId, yakap: !!client.yakapId, pwd: !!client.pwdId, senior: !!client.seniorId },
      hasClinicalBaseline: client.clinicalBaseline !== null,
    },
    account: account ? { fullName: account.fullName, role: account.role, phone: maskPhone(account.phone) } : null,
    family: family.map((f) => ({
      id: f.id,
      name: f.relativeName,
      relationship: f.relationship,
      phone: maskPhone(f.phoneNumber),
      isEmergencyContact: f.isEmergencyContact,
      isRemoteSponsor: f.isRemoteSponsor,
      location: f.locationCityCountry,
      notificationChannel: f.notificationChannel,
      hasAccount: f.userId !== null,
    })),
    requests: history.map((h) => ({
      id: h.id,
      ref: requestRef(h.id),
      createdAt: h.createdAt,
      status: h.status,
      tier: h.tier,
      scheduledDate: h.scheduledDate,
      grossRate: Number(h.grossRate),
      caregiver: h.caregiverId ? { id: h.caregiverId, name: h.caregiverName ?? 'Unnamed' } : null,
    })),
    summary: {
      totalRequests: history.length,
      openRequests: history.filter((h) => (OPEN as readonly string[]).includes(h.status)).length,
      completed: history.filter((h) => h.status === 'COMPLETED').length,
      spent: history.filter((h) => h.status === 'COMPLETED').reduce((sum, h) => sum + Number(h.grossRate), 0),
    },
  });
});

/** Clinical notes need a stated reason, every time; the reason and the access are audited. */
adminPeople.post(
  '/clients/:id/clinical-access',
  validate('param', IdParam),
  validate('json', v.strictObject({ reason: v.pipe(v.string(), v.trim(), v.minLength(10, 'Say why you need the clinical notes (at least 10 characters).'), v.maxLength(300)) })),
  async (c) => {
    const db = c.get('db');
    const client = await loadClient(c, c.req.valid('param').id);
    const notes = await db
      .select({
        id: careNotes.id,
        shiftId: careNotes.shiftId,
        recordedAt: careNotes.recordedAt,
        vitalsRecorded: careNotes.vitalsRecorded,
        tasksCompleted: careNotes.tasksCompleted,
        rawCaregiverNotes: careNotes.rawCaregiverNotes,
        familySummary: careNotes.aiGeneratedFamilySummary,
        caregiverName: caregiverUser.fullName,
      })
      .from(careNotes)
      .innerJoin(shifts, eq(shifts.id, careNotes.shiftId))
      .innerJoin(caregivers, eq(caregivers.id, careNotes.caregiverId))
      .innerJoin(caregiverUser, eq(caregiverUser.id, caregivers.userId))
      .where(eq(shifts.clientId, client.id))
      .orderBy(desc(careNotes.recordedAt))
      .limit(100);
    await audit(c, db, { action: 'client.clinical_viewed', entityType: 'client', entityId: client.id, municipality: client.municipality, metadata: { reason: c.req.valid('json').reason, notes: notes.length } });
    return c.json({
      clinicalBaseline: client.clinicalBaseline,
      careNotes: notes.map((n) => ({ ...n, ref: requestRef(n.shiftId) })),
    });
  },
);

// ---------- Caregivers ----------

adminPeople.get(
  '/caregivers',
  validate(
    'query',
    v.object({
      q: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100))),
      municipality: v.optional(v.pipe(v.string(), v.maxLength(100))),
      accredited: v.optional(v.picklist(['yes', 'no'])),
      available: v.optional(v.picklist(['yes', 'no'])),
      badge: v.optional(v.pipe(v.string(), v.maxLength(40))),
      page: Page,
    }),
  ),
  async (c) => {
    const db = c.get('db');
    const f = c.req.valid('query');
    const where = and(
      scopeCondition(c.get('staff'), caregivers.municipality),
      f.municipality ? eq(caregivers.municipality, f.municipality) : undefined,
      f.accredited ? eq(caregivers.isAccredited, f.accredited === 'yes') : undefined,
      f.available ? eq(caregivers.isAvailable, f.available === 'yes') : undefined,
      f.badge ? sql`${f.badge} = any(${caregivers.badges})` : undefined,
      f.q ? ilike(caregiverUser.fullName, like(f.q)) : undefined,
    );
    const [rows, [total]] = await Promise.all([
      db
        .select({
          id: caregivers.id,
          fullName: caregiverUser.fullName,
          phone: caregiverUser.phoneNumber,
          barangay: caregivers.barangay,
          municipality: caregivers.municipality,
          isAccredited: caregivers.isAccredited,
          isAvailable: caregivers.isAvailable,
          badges: caregivers.badges,
          averageRating: caregivers.averageRating,
          totalShiftsCompleted: caregivers.totalShiftsCompleted,
          activeShifts: sql<number>`(select count(*)::int from ${shifts} where ${shifts.caregiverId} = ${caregivers.id} and ${shifts.status} in ('CONFIRMED','IN_PROGRESS'))`,
        })
        .from(caregivers)
        .innerJoin(caregiverUser, eq(caregiverUser.id, caregivers.userId))
        .where(where)
        .orderBy(asc(caregiverUser.fullName))
        .limit(PAGE_SIZE)
        .offset((f.page - 1) * PAGE_SIZE),
      db.select({ n: count() }).from(caregivers).innerJoin(caregiverUser, eq(caregiverUser.id, caregivers.userId)).where(where),
    ]);
    return c.json({
      caregivers: rows.map((r) => ({ ...r, phone: maskPhone(r.phone), averageRating: r.averageRating === null ? null : Number(r.averageRating) })),
      total: total?.n ?? 0,
      page: f.page,
      pageSize: PAGE_SIZE,
    });
  },
);

adminPeople.get('/caregivers/:id', validate('param', IdParam), async (c) => {
  const db = c.get('db');
  const staff = c.get('staff');
  const [row] = await db
    .select({ caregiver: caregivers, fullName: caregiverUser.fullName, phone: caregiverUser.phoneNumber, isActive: caregiverUser.isActive })
    .from(caregivers)
    .innerJoin(caregiverUser, eq(caregiverUser.id, caregivers.userId))
    .where(eq(caregivers.id, c.req.valid('param').id))
    .limit(1);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Caregiver not found.');
  assertInScope(staff, row.caregiver.municipality, 'Caregiver');

  // Their shifts, limited to clients in the viewer's scope.
  const shiftRows = await db
    .select({
      id: shifts.id,
      status: shifts.status,
      tier: shifts.shiftTier,
      scheduledDate: shifts.scheduledDate,
      clockIn: shifts.clockIn,
      clockOut: shifts.clockOut,
      caregiverPayout: shifts.caregiverPayout,
      clientId: clientProfiles.id,
      clientName: clientProfiles.fullName,
      barangay: clientProfiles.barangay,
    })
    .from(shifts)
    .innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId))
    .where(and(eq(shifts.caregiverId, row.caregiver.id), scopeCondition(staff, clientProfiles.municipality)))
    .orderBy(desc(shifts.scheduledDate))
    .limit(100);
  const completed = shiftRows.filter((s) => s.status === 'COMPLETED');
  const cg = row.caregiver;
  return c.json({
    caregiver: {
      id: cg.id,
      fullName: row.fullName,
      phone: maskPhone(row.phone),
      accountActive: row.isActive,
      sitio: cg.sitio,
      barangay: cg.barangay,
      municipality: cg.municipality,
      isAccredited: cg.isAccredited,
      isAvailable: cg.isAvailable,
      badges: cg.badges,
      averageRating: cg.averageRating === null ? null : Number(cg.averageRating),
      totalShiftsCompleted: cg.totalShiftsCompleted,
      createdAt: cg.createdAt,
    },
    shifts: shiftRows.map(({ clientName, clientId, caregiverPayout, ...s }) => ({
      ...s,
      ref: requestRef(s.id),
      caregiverPayout: Number(caregiverPayout),
      client: { id: clientId, name: shortName(clientName) },
    })),
    earnings: {
      completedShifts: completed.length,
      payouts: completed.reduce((sum, s) => sum + Number(s.caregiverPayout), 0),
      upcoming: shiftRows.filter((s) => s.status === 'CONFIRMED').length,
    },
  });
});

