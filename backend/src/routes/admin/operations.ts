import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Hono } from 'hono';
import * as v from 'valibot';
import { auditLogs, careNotes, caregivers, clientProfiles, payments, serviceRequests, shifts, users } from '../../db/schema';
import type { AppEnv } from '../../env';
import { ApiError } from '../../lib/errors';
import { validate } from '../../lib/validation';
import { assertInScope, manilaDate, manilaDayStart, maskPhone, paymentRef, requestRef, scopeCondition, shortName } from '../../staff/scope';

export const SHIFT_STATUSES = ['REQUESTED', 'MATCHING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ESCALATED'] as const;
export const SHIFT_TIERS = ['BGAY_HOME_300', 'CVMC_INSTITUTIONAL_500'] as const;
const WAITING = ['REQUESTED', 'MATCHING'] as const;
export const PAGE_SIZE = 50;

const caregiverUser = alias(users, 'caregiver_user');
const IdParam = v.object({ id: v.pipe(v.string(), v.uuid()) });
const IsoDate = v.pipe(v.string(), v.isoDate());

/** Read-only operations dashboards (phase B). Every query is limited to the staff member's municipalities. */
export const adminOperations = new Hono<AppEnv>();

// ---------- Overview ----------

adminOperations.get('/overview', validate('query', v.object({ range: v.optional(v.picklist(['7', '30', '90']), '30') })), async (c) => {
  const db = c.get('db');
  const staff = c.get('staff');
  const days = Number(c.req.valid('query').range);
  const from = manilaDayStart(-(days - 1));
  const today = manilaDayStart(0);
  const scope = scopeCondition(staff, clientProfiles.municipality);
  const completedAt = sql`coalesce(${shifts.clockOut}, ${shifts.updatedAt})`;

  const shiftBase = () => db.select().from(shifts).innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId)).$dynamic();

  const [[k], byDay, byService, byStatus, waiting, escalated, [cg], [cl], [svc]] = await Promise.all([
    db
      .select({
        requests: sql<number>`count(*) filter (where ${shifts.createdAt} >= ${from})::int`,
        requestsToday: sql<number>`count(*) filter (where ${shifts.createdAt} >= ${today})::int`,
        waiting: sql<number>`count(*) filter (where ${shifts.status} in ('REQUESTED','MATCHING'))::int`,
        inProgress: sql<number>`count(*) filter (where ${shifts.status} = 'IN_PROGRESS')::int`,
        escalated: sql<number>`count(*) filter (where ${shifts.status} = 'ESCALATED')::int`,
        confirmedUpcoming: sql<number>`count(*) filter (where ${shifts.status} = 'CONFIRMED')::int`,
        completed: sql<number>`count(*) filter (where ${shifts.status} = 'COMPLETED' and ${completedAt} >= ${from})::int`,
        cancelled: sql<number>`count(*) filter (where ${shifts.status} = 'CANCELLED' and ${shifts.createdAt} >= ${from})::int`,
        revenue: sql<string>`coalesce(sum(${shifts.grossRate}) filter (where ${shifts.status} = 'COMPLETED' and ${completedAt} >= ${from}), 0)`,
        payouts: sql<string>`coalesce(sum(${shifts.caregiverPayout}) filter (where ${shifts.status} = 'COMPLETED' and ${completedAt} >= ${from}), 0)`,
        margin: sql<string>`coalesce(sum(${shifts.platformMargin}) filter (where ${shifts.status} = 'COMPLETED' and ${completedAt} >= ${from}), 0)`,
        clientsServed: sql<number>`count(distinct ${shifts.clientId}) filter (where ${shifts.createdAt} >= ${from})::int`,
      })
      .from(shifts)
      .innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId))
      .where(scope),
    db
      .select({ day: sql<string>`to_char(${shifts.createdAt} at time zone 'Asia/Manila', 'YYYY-MM-DD')`, n: count() })
      .from(shifts)
      .innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId))
      .where(and(scope, gte(shifts.createdAt, from)))
      .groupBy(sql`1`),
    db
      .select({ tier: shifts.shiftTier, n: count() })
      .from(shifts)
      .innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId))
      .where(and(scope, gte(shifts.createdAt, from)))
      .groupBy(shifts.shiftTier),
    db
      .select({ status: shifts.status, n: count() })
      .from(shifts)
      .innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId))
      .where(and(scope, gte(shifts.createdAt, from)))
      .groupBy(shifts.status),
    shiftBase()
      .where(and(scope, inArray(shifts.status, [...WAITING])))
      .orderBy(asc(shifts.createdAt))
      .limit(8),
    shiftBase()
      .where(and(scope, eq(shifts.status, 'ESCALATED')))
      .orderBy(asc(shifts.updatedAt))
      .limit(8),
    db
      .select({
        total: count(),
        accredited: sql<number>`count(*) filter (where ${caregivers.isAccredited})::int`,
        available: sql<number>`count(*) filter (where ${caregivers.isAccredited} and ${caregivers.isAvailable})::int`,
      })
      .from(caregivers)
      .where(scopeCondition(staff, caregivers.municipality)),
    db.select({ registered: count() }).from(clientProfiles).where(scope),
    db
      .select({
        open: sql<number>`count(*) filter (where ${serviceRequests.status} in ('SUBMITTED','IN_REVIEW','SCHEDULED'))::int`,
        waiting: sql<number>`count(*) filter (where ${serviceRequests.status} = 'SUBMITTED')::int`,
      })
      .from(serviceRequests)
      .innerJoin(clientProfiles, eq(clientProfiles.id, serviceRequests.clientId))
      .where(scope),
  ]);

  const counts = new Map(byDay.map((d) => [d.day, d.n]));
  const series = Array.from({ length: days }, (_, i) => {
    const day = manilaDate(manilaDayStart(-(days - 1) + i));
    return { day, requests: counts.get(day) ?? 0 };
  });
  const alertRow = (r: (typeof waiting)[number]) => ({
    id: r.shifts.id,
    ref: requestRef(r.shifts.id),
    createdAt: r.shifts.createdAt,
    updatedAt: r.shifts.updatedAt,
    status: r.shifts.status,
    tier: r.shifts.shiftTier,
    scheduledDate: r.shifts.scheduledDate,
    scheduledStartTime: r.shifts.scheduledStartTime,
    client: { id: r.client_profiles.id, name: shortName(r.client_profiles.fullName) },
    barangay: r.client_profiles.barangay,
    municipality: r.client_profiles.municipality,
  });

  return c.json({
    range: days,
    from,
    kpis: {
      ...k!,
      revenue: Number(k!.revenue),
      payouts: Number(k!.payouts),
      margin: Number(k!.margin),
      clientsRegistered: cl?.registered ?? 0,
      servicesOpen: svc?.open ?? 0,
      servicesNew: svc?.waiting ?? 0,
      caregivers: { total: cg?.total ?? 0, accredited: cg?.accredited ?? 0, available: cg?.available ?? 0 },
    },
    daily: series,
    byService: SHIFT_TIERS.map((tier) => ({ tier, requests: byService.find((s) => s.tier === tier)?.n ?? 0 })),
    byStatus: SHIFT_STATUSES.map((status) => ({ status, requests: byStatus.find((s) => s.status === status)?.n ?? 0 })),
    alerts: { waiting: waiting.map(alertRow), escalated: escalated.map(alertRow) },
  });
});

// ---------- Requests ledger ----------

const RequestFilters = v.object({
  status: v.optional(v.union([v.picklist(SHIFT_STATUSES), v.literal('WAITING'), v.literal('OPEN')])),
  tier: v.optional(v.picklist(SHIFT_TIERS)),
  municipality: v.optional(v.pipe(v.string(), v.maxLength(100))),
  barangay: v.optional(v.pipe(v.string(), v.maxLength(100))),
  clientId: v.optional(v.pipe(v.string(), v.uuid())),
  caregiverId: v.optional(v.pipe(v.string(), v.uuid())),
  from: v.optional(IsoDate),
  to: v.optional(IsoDate),
  q: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100))),
  page: v.optional(v.pipe(v.string(), v.regex(/^\d{1,4}$/), v.transform(Number)), '1'),
});

export type RequestFilterInput = v.InferOutput<typeof RequestFilters>;

/** Shared by the ledger and the CSV export, so both always agree. */
export function requestConditions(staff: AppEnv['Variables']['staff'], f: RequestFilterInput): SQL | undefined {
  const status: SQL | undefined =
    f.status === 'WAITING'
      ? inArray(shifts.status, [...WAITING])
      : f.status === 'OPEN'
        ? inArray(shifts.status, ['REQUESTED', 'MATCHING', 'CONFIRMED', 'IN_PROGRESS', 'ESCALATED'])
        : f.status
          ? eq(shifts.status, f.status)
          : undefined;
  return and(
    scopeCondition(staff, clientProfiles.municipality),
    status,
    f.tier ? eq(shifts.shiftTier, f.tier) : undefined,
    f.municipality ? eq(clientProfiles.municipality, f.municipality) : undefined,
    f.barangay ? eq(clientProfiles.barangay, f.barangay) : undefined,
    f.clientId ? eq(shifts.clientId, f.clientId) : undefined,
    f.caregiverId ? eq(shifts.caregiverId, f.caregiverId) : undefined,
    f.from ? gte(shifts.createdAt, new Date(`${f.from}T00:00:00+08:00`)) : undefined,
    f.to ? lte(shifts.createdAt, new Date(`${f.to}T23:59:59.999+08:00`)) : undefined,
    f.q
      ? or(
          ilike(clientProfiles.fullName, `%${f.q.replace(/[%_\\]/g, '\\$&')}%`),
          sql`upper(${shifts.id}::text) like ${`${f.q.toUpperCase().replace(/^REQ-/, '').replace(/[%_\\]/g, '')}%`}`,
        )
      : undefined,
  );
}

export function requestLedgerQuery(db: AppEnv['Variables']['db'], where: SQL | undefined) {
  return db
    .select({
      id: shifts.id,
      createdAt: shifts.createdAt,
      status: shifts.status,
      tier: shifts.shiftTier,
      scheduledDate: shifts.scheduledDate,
      scheduledStartTime: shifts.scheduledStartTime,
      grossRate: shifts.grossRate,
      caregiverPayout: shifts.caregiverPayout,
      platformMargin: shifts.platformMargin,
      clockIn: shifts.clockIn,
      clockOut: shifts.clockOut,
      locationDetails: shifts.locationDetails,
      clientId: clientProfiles.id,
      clientName: clientProfiles.fullName,
      sitio: clientProfiles.sitio,
      barangay: clientProfiles.barangay,
      municipality: clientProfiles.municipality,
      caregiverId: caregivers.id,
      caregiverName: caregiverUser.fullName,
    })
    .from(shifts)
    .innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId))
    .leftJoin(caregivers, eq(caregivers.id, shifts.caregiverId))
    .leftJoin(caregiverUser, eq(caregiverUser.id, caregivers.userId))
    .where(where)
    .orderBy(desc(shifts.createdAt), desc(shifts.id))
    .$dynamic();
}

adminOperations.get('/requests', validate('query', RequestFilters), async (c) => {
  const db = c.get('db');
  const f = c.req.valid('query');
  const where = requestConditions(c.get('staff'), f);
  const [rows, [total]] = await Promise.all([
    requestLedgerQuery(db, where)
      .limit(PAGE_SIZE)
      .offset((f.page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(shifts).innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId)).where(where),
  ]);
  return c.json({
    requests: rows.map((r) => ({
      id: r.id,
      ref: requestRef(r.id),
      createdAt: r.createdAt,
      status: r.status,
      tier: r.tier,
      scheduledDate: r.scheduledDate,
      scheduledStartTime: r.scheduledStartTime,
      grossRate: Number(r.grossRate),
      client: { id: r.clientId, name: shortName(r.clientName) },
      barangay: r.barangay,
      municipality: r.municipality,
      caregiver: r.caregiverId ? { id: r.caregiverId, name: r.caregiverName ?? 'Unnamed' } : null,
    })),
    total: total?.n ?? 0,
    page: f.page,
    pageSize: PAGE_SIZE,
  });
});

adminOperations.get('/requests/:id', validate('param', IdParam), async (c) => {
  const db = c.get('db');
  const staff = c.get('staff');
  const { id } = c.req.valid('param');
  const requester = alias(users, 'requester');
  const [row] = await db
    .select({ shift: shifts, client: clientProfiles, caregiver: caregivers, caregiverName: caregiverUser.fullName, requester: { id: requester.id, fullName: requester.fullName, role: requester.role, phone: requester.phoneNumber } })
    .from(shifts)
    .innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId))
    .innerJoin(requester, eq(requester.id, shifts.requestedByUserId))
    .leftJoin(caregivers, eq(caregivers.id, shifts.caregiverId))
    .leftJoin(caregiverUser, eq(caregiverUser.id, caregivers.userId))
    .where(eq(shifts.id, id))
    .limit(1);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Request not found.');
  assertInScope(staff, row.client.municipality, 'Request');

  const [paymentRows, [notes], history] = await Promise.all([
    db.select().from(payments).where(eq(payments.shiftId, id)).orderBy(desc(payments.createdAt)),
    db.select({ n: count() }).from(careNotes).where(eq(careNotes.shiftId, id)),
    db
      .select({ id: auditLogs.id, createdAt: auditLogs.createdAt, action: auditLogs.action, metadata: auditLogs.metadata, actor: { id: users.id, fullName: users.fullName, email: users.email } })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorUserId))
      .where(and(eq(auditLogs.entityType, 'shift'), eq(auditLogs.entityId, id)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(20),
  ]);
  const s = row.shift;
  return c.json({
    request: {
      id: s.id,
      ref: requestRef(s.id),
      status: s.status,
      tier: s.shiftTier,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      scheduledDate: s.scheduledDate,
      scheduledStartTime: s.scheduledStartTime,
      durationHours: s.durationHours,
      locationDetails: s.locationDetails,
      grossRate: Number(s.grossRate),
      caregiverPayout: Number(s.caregiverPayout),
      platformMargin: Number(s.platformMargin),
      clockIn: s.clockIn,
      clockOut: s.clockOut,
      cancelledAt: s.cancelledAt,
      cancellationReason: s.cancellationReason,
      escalationReason: s.escalationReason,
      payoutPaidAt: s.payoutPaidAt,
      payoutReference: s.payoutReference,
      careNotes: notes?.n ?? 0,
    },
    client: { id: row.client.id, name: row.client.fullName, sitio: row.client.sitio, barangay: row.client.barangay, municipality: row.client.municipality, landmarkNotes: row.client.landmarkNotes },
    requestedBy: { name: row.requester.fullName, role: row.requester.role, phone: maskPhone(row.requester.phone) },
    caregiver: row.caregiver ? { id: row.caregiver.id, name: row.caregiverName ?? 'Unnamed', badges: row.caregiver.badges, isAccredited: row.caregiver.isAccredited } : null,
    payments: paymentRows.map((p) => ({ id: p.id, ref: paymentRef(p.id), amount: Number(p.amount), method: p.method, status: p.status, providerReference: p.providerReference, paidAt: p.paidAt, createdAt: p.createdAt })),
    history: history.map((h) => ({ ...h, actor: h.actor?.id ? h.actor : null })),
  });
});

// ---------- Shifts board ----------

adminOperations.get('/shifts', validate('query', v.object({ date: v.optional(IsoDate) })), async (c) => {
  const date = c.req.valid('query').date ?? manilaDate(new Date());
  const rows = await requestLedgerQuery(c.get('db'), and(scopeCondition(c.get('staff'), clientProfiles.municipality), eq(shifts.scheduledDate, date))).limit(500);
  return c.json({
    date,
    shifts: rows
      .sort((a, b) => a.scheduledStartTime.localeCompare(b.scheduledStartTime))
      .map((r) => ({
        id: r.id,
        ref: requestRef(r.id),
        status: r.status,
        tier: r.tier,
        scheduledStartTime: r.scheduledStartTime,
        clockIn: r.clockIn,
        clockOut: r.clockOut,
        client: { id: r.clientId, name: shortName(r.clientName) },
        barangay: r.barangay,
        municipality: r.municipality,
        caregiver: r.caregiverId ? { id: r.caregiverId, name: r.caregiverName ?? 'Unnamed' } : null,
      })),
  });
});
