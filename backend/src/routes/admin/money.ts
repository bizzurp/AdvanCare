import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Hono } from 'hono';
import * as v from 'valibot';
import { audit } from '../../audit';
import { caregivers, clientProfiles, payments, shifts, users } from '../../db/schema';
import type { AppEnv } from '../../env';
import { ApiError } from '../../lib/errors';
import { validate } from '../../lib/validation';
import { manilaDate, paymentRef, requestRef, scopeCondition, shortName, toCsv } from '../../staff/scope';
import { PAGE_SIZE, requestConditions, requestLedgerQuery, SHIFT_STATUSES, SHIFT_TIERS } from './operations';

const caregiverUser = alias(users, 'caregiver_user');
const IsoDate = v.pipe(v.string(), v.isoDate());
const EXPORT_LIMIT = 10_000;

const TIER_LABEL: Record<string, string> = { BGAY_HOME_300: 'Barangay home caregiver (₱300/8h)', CVMC_INSTITUTIONAL_500: 'CVMC institutional caregiver (₱500/8h)' };

const PaymentFilters = v.object({
  status: v.optional(v.picklist(['PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED'])),
  method: v.optional(v.picklist(['GCASH', 'MAYA', 'CASH', 'BANK_TRANSFER'])),
  from: v.optional(IsoDate),
  to: v.optional(IsoDate),
  page: v.optional(v.pipe(v.string(), v.regex(/^\d{1,4}$/), v.transform(Number)), '1'),
});

/** Payments ledger and CSV exports (phase B). */
export const adminMoney = new Hono<AppEnv>();

function paymentQuery(db: AppEnv['Variables']['db'], where: ReturnType<typeof and>) {
  return db
    .select({
      id: payments.id,
      amount: payments.amount,
      method: payments.method,
      status: payments.status,
      providerReference: payments.providerReference,
      paidAt: payments.paidAt,
      createdAt: payments.createdAt,
      shiftId: shifts.id,
      tier: shifts.shiftTier,
      shiftStatus: shifts.status,
      grossRate: shifts.grossRate,
      caregiverPayout: shifts.caregiverPayout,
      platformMargin: shifts.platformMargin,
      clientId: clientProfiles.id,
      clientName: clientProfiles.fullName,
      barangay: clientProfiles.barangay,
      municipality: clientProfiles.municipality,
      caregiverId: caregivers.id,
      caregiverName: caregiverUser.fullName,
    })
    .from(payments)
    .innerJoin(shifts, eq(shifts.id, payments.shiftId))
    .innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId))
    .leftJoin(caregivers, eq(caregivers.id, shifts.caregiverId))
    .leftJoin(caregiverUser, eq(caregiverUser.id, caregivers.userId))
    .where(where)
    .orderBy(desc(payments.createdAt), desc(payments.id))
    .$dynamic();
}

function paymentConditions(staff: AppEnv['Variables']['staff'], f: v.InferOutput<typeof PaymentFilters>) {
  return and(
    scopeCondition(staff, clientProfiles.municipality),
    f.status ? eq(payments.status, f.status) : undefined,
    f.method ? eq(payments.method, f.method) : undefined,
    f.from ? gte(payments.createdAt, new Date(`${f.from}T00:00:00+08:00`)) : undefined,
    f.to ? lte(payments.createdAt, new Date(`${f.to}T23:59:59.999+08:00`)) : undefined,
  );
}

adminMoney.get('/payments', validate('query', PaymentFilters), async (c) => {
  const db = c.get('db');
  const f = c.req.valid('query');
  const where = paymentConditions(c.get('staff'), f);
  const joined = () => db.select({ n: count() }).from(payments).innerJoin(shifts, eq(shifts.id, payments.shiftId)).innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId));
  const [rows, [total], [sums]] = await Promise.all([
    paymentQuery(db, where).limit(PAGE_SIZE).offset((f.page - 1) * PAGE_SIZE),
    joined().where(where),
    db
      .select({
        succeeded: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'SUCCEEDED'), 0)`,
        pending: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'PENDING'), 0)`,
        pendingCount: sql<number>`count(*) filter (where ${payments.status} = 'PENDING')::int`,
        failedCount: sql<number>`count(*) filter (where ${payments.status} = 'FAILED')::int`,
      })
      .from(payments)
      .innerJoin(shifts, eq(shifts.id, payments.shiftId))
      .innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId))
      // Totals cover every status (same scope, method and dates), so the tiles stay meaningful while filtering.
      .where(paymentConditions(c.get('staff'), { ...f, status: undefined })),
  ]);
  return c.json({
    payments: rows.map((r) => ({
      id: r.id,
      ref: paymentRef(r.id),
      amount: Number(r.amount),
      method: r.method,
      status: r.status,
      providerReference: r.providerReference,
      paidAt: r.paidAt,
      createdAt: r.createdAt,
      request: { id: r.shiftId, ref: requestRef(r.shiftId), tier: r.tier, status: r.shiftStatus },
      split: { gross: Number(r.grossRate), caregiver: Number(r.caregiverPayout), platform: Number(r.platformMargin) },
      client: { id: r.clientId, name: shortName(r.clientName) },
      municipality: r.municipality,
      caregiver: r.caregiverId ? { id: r.caregiverId, name: r.caregiverName ?? 'Unnamed' } : null,
    })),
    totals: { succeeded: Number(sums?.succeeded ?? 0), pending: Number(sums?.pending ?? 0), pendingCount: sums?.pendingCount ?? 0, failedCount: sums?.failedCount ?? 0 },
    total: total?.n ?? 0,
    page: f.page,
    pageSize: PAGE_SIZE,
  });
});

// ---------- Exports (every download is audited) ----------

const ExportQuery = v.object({ from: v.optional(IsoDate), to: v.optional(IsoDate), status: v.optional(v.picklist(SHIFT_STATUSES)), tier: v.optional(v.picklist(SHIFT_TIERS)) });

adminMoney.get('/exports/:table', validate('param', v.object({ table: v.picklist(['requests', 'payouts', 'payments']) })), validate('query', ExportQuery), async (c) => {
  const db = c.get('db');
  const staff = c.get('staff');
  const { table } = c.req.valid('param');
  const q = c.req.valid('query');
  let csv: string;
  let rowCount: number;

  if (table === 'requests' || table === 'payouts') {
    // Table 1 (service request ledger) and Table 2 (completed shifts & payouts).
    const where = requestConditions(staff, { ...q, status: table === 'payouts' ? 'COMPLETED' : q.status, page: 1 });
    const rows = await requestLedgerQuery(db, where).limit(EXPORT_LIMIT + 1);
    if (rows.length > EXPORT_LIMIT) throw new ApiError(422, 'EXPORT_TOO_LARGE', `More than ${EXPORT_LIMIT.toLocaleString()} rows. Choose a shorter date range.`);
    rowCount = rows.length;
    csv =
      table === 'requests'
        ? toCsv(
            ['Request ID', 'Created (UTC)', 'Client', 'Sitio', 'Barangay', 'Municipality', 'Service', 'Scheduled date', 'Start time', 'Caregiver', 'Status', 'Gross (PHP)'],
            rows.map((r) => [requestRef(r.id), r.createdAt, r.clientName, r.sitio, r.barangay, r.municipality, TIER_LABEL[r.tier], r.scheduledDate, r.scheduledStartTime, r.caregiverName, r.status, r.grossRate]),
          )
        : toCsv(
            ['Shift ID', 'Caregiver', 'Service', 'Location', 'Municipality', 'Clock in (UTC)', 'Clock out (UTC)', 'Gross (PHP)', 'Caregiver pay (PHP)', 'Platform margin (PHP)'],
            rows.map((r) => [requestRef(r.id), r.caregiverName, TIER_LABEL[r.tier], r.locationDetails, r.municipality, r.clockIn, r.clockOut, r.grossRate, r.caregiverPayout, r.platformMargin]),
          );
  } else {
    const rows = await paymentQuery(db, paymentConditions(staff, { from: q.from, to: q.to, page: 1 })).limit(EXPORT_LIMIT + 1);
    if (rows.length > EXPORT_LIMIT) throw new ApiError(422, 'EXPORT_TOO_LARGE', `More than ${EXPORT_LIMIT.toLocaleString()} rows. Choose a shorter date range.`);
    rowCount = rows.length;
    csv = toCsv(
      ['Payment ID', 'Created (UTC)', 'Request ID', 'Client', 'Municipality', 'Method', 'Status', 'Amount (PHP)', 'Provider reference', 'Paid at (UTC)'],
      rows.map((r) => [paymentRef(r.id), r.createdAt, requestRef(r.shiftId), r.clientName, r.municipality, r.method, r.status, r.amount, r.providerReference, r.paidAt]),
    );
  }

  await audit(c, db, { action: 'export.downloaded', entityType: 'export', entityId: table, metadata: { table, rows: rowCount, filters: q, scope: staff.municipalities } });
  const filename = `advancare-${table}-${manilaDate(new Date())}.csv`;
  return c.body(csv, 200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` });
});
