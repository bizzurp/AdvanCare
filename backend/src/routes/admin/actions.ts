import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Hono, type Context } from 'hono';
import * as v from 'valibot';
import { audit } from '../../audit';
import { caregivers, clientProfiles, payments, shifts, users } from '../../db/schema';
import type { AppEnv } from '../../env';
import { ApiError } from '../../lib/errors';
import { notifyFamily } from '../../lib/notify';
import { validate } from '../../lib/validation';
import { isKnownMunicipality } from '../../staff/municipalities';
import { actionProblem, assignmentCheck, BADGES, type ShiftStatus, type ShiftTier } from '../../staff/requestRules';
import { assertInScope, inScope, maskPhone, requestRef, scopeCondition } from '../../staff/scope';

const IdParam = v.object({ id: v.pipe(v.string(), v.uuid()) });
const Reason = v.pipe(v.string(), v.trim(), v.minLength(5, 'Give a short reason (at least 5 characters).'), v.maxLength(300));
const Phone = v.pipe(v.string(), v.trim(), v.regex(/^(\+63|0)9\d{9}$/, 'Enter a Philippine mobile number, like 09171234567.'));
const Email = v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email('Enter a valid email address.'), v.maxLength(255));
const Badges = v.pipe(v.array(v.picklist(BADGES)), v.maxLength(BADGES.length));

const caregiverUser = alias(users, 'caregiver_user');
const requester = alias(users, 'requester');

/** Staff actions (phase C / P1): manage caregivers, act on requests, record money. All audited and scoped. */
export const adminActions = new Hono<AppEnv>();

/** Unique-constraint violations from Postgres (e.g. the email or phone is already used). */
const isUnique = (err: unknown) => (err as { code?: string; cause?: { code?: string } }).code === '23505' || (err as { cause?: { code?: string } }).cause?.code === '23505';
const normalizePhone = (p: string) => (p.startsWith('+63') ? `0${p.slice(3)}` : p);

// ---------- Caregivers ----------

adminActions.post(
  '/caregivers',
  validate(
    'json',
    v.strictObject({
      fullName: v.pipe(v.string(), v.trim(), v.minLength(2, 'Enter the caregiver’s full name.'), v.maxLength(255)),
      email: Email,
      phone: Phone,
      municipality: v.pipe(v.string(), v.check(isKnownMunicipality, 'Choose a municipality in Cagayan.')),
      barangay: v.pipe(v.string(), v.trim(), v.minLength(2, 'Enter the barangay.'), v.maxLength(100)),
      sitio: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100))),
      badges: v.optional(Badges, []),
      isAccredited: v.optional(v.boolean(), false),
    }),
  ),
  async (c) => {
    const db = c.get('db');
    const body = c.req.valid('json');
    if (!inScope(c.get('staff'), body.municipality)) throw new ApiError(403, 'FORBIDDEN', 'You can only add caregivers in your own municipalities.');
    try {
      const id = await db.transaction(async (tx) => {
        const [u] = await tx.insert(users).values({ role: 'CAREGIVER', fullName: body.fullName, email: body.email, phoneNumber: normalizePhone(body.phone) }).returning({ id: users.id });
        const [cg] = await tx
          .insert(caregivers)
          .values({ userId: u!.id, municipality: body.municipality, barangay: body.barangay, sitio: body.sitio || null, badges: [...new Set(body.badges)], isAccredited: body.isAccredited, isAvailable: false })
          .returning({ id: caregivers.id });
        await audit(c, tx, { action: 'caregiver.created', entityType: 'caregiver', entityId: cg!.id, municipality: body.municipality, metadata: { badges: body.badges, accredited: body.isAccredited } });
        return cg!.id;
      });
      return c.json({ id }, 201);
    } catch (err) {
      if (isUnique(err)) throw new ApiError(409, 'ALREADY_EXISTS', 'Someone already uses that email or mobile number.');
      throw err;
    }
  },
);

adminActions.patch(
  '/caregivers/:id',
  validate('param', IdParam),
  validate(
    'json',
    v.strictObject({
      isAccredited: v.optional(v.boolean()),
      isAvailable: v.optional(v.boolean()),
      active: v.optional(v.boolean()),
      badges: v.optional(Badges),
      municipality: v.optional(v.pipe(v.string(), v.check(isKnownMunicipality, 'Choose a municipality in Cagayan.'))),
      barangay: v.optional(v.pipe(v.string(), v.trim(), v.minLength(2), v.maxLength(100))),
      phone: v.optional(Phone),
      email: v.optional(Email),
      reason: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(300))),
    }),
  ),
  async (c) => {
    const db = c.get('db');
    const staff = c.get('staff');
    const body = c.req.valid('json');
    const [row] = await db.select({ cg: caregivers, active: caregiverUser.isActive }).from(caregivers).innerJoin(caregiverUser, eq(caregiverUser.id, caregivers.userId)).where(eq(caregivers.id, c.req.valid('param').id)).limit(1);
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Caregiver not found.');
    assertInScope(staff, row.cg.municipality, 'Caregiver');
    if (body.municipality && !inScope(staff, body.municipality)) throw new ApiError(403, 'FORBIDDEN', 'You can only move caregivers within your own municipalities.');
    const cgChanges = {
      ...(body.isAccredited !== undefined ? { isAccredited: body.isAccredited } : {}),
      ...(body.isAvailable !== undefined ? { isAvailable: body.isAvailable } : {}),
      ...(body.badges ? { badges: [...new Set(body.badges)] } : {}),
      ...(body.municipality ? { municipality: body.municipality } : {}),
      ...(body.barangay ? { barangay: body.barangay } : {}),
    };
    const userChanges = {
      ...(body.active !== undefined ? { isActive: body.active } : {}),
      ...(body.phone ? { phoneNumber: normalizePhone(body.phone) } : {}),
      ...(body.email ? { email: body.email } : {}),
    };
    if (!Object.keys(cgChanges).length && !Object.keys(userChanges).length) throw new ApiError(422, 'VALIDATION_FAILED', 'Nothing to change.');
    try {
      await db.transaction(async (tx) => {
        if (Object.keys(cgChanges).length) await tx.update(caregivers).set(cgChanges).where(eq(caregivers.id, row.cg.id));
        if (Object.keys(userChanges).length) await tx.update(users).set(userChanges).where(eq(users.id, row.cg.userId));
        await audit(c, tx, {
          action: 'caregiver.updated',
          entityType: 'caregiver',
          entityId: row.cg.id,
          municipality: body.municipality ?? row.cg.municipality,
          // Field names and new non-personal values only (no phone/email values in the log).
          metadata: { ...cgChanges, ...(body.active !== undefined ? { active: body.active } : {}), ...(body.phone ? { phone: 'changed' } : {}), ...(body.email ? { email: 'changed' } : {}), reason: body.reason ?? null },
        });
      });
    } catch (err) {
      if (isUnique(err)) throw new ApiError(409, 'ALREADY_EXISTS', 'Someone already uses that email or mobile number.');
      throw err;
    }
    return c.json({ ok: true });
  },
);

// ---------- Requests ----------

async function loadRequest(c: Context<AppEnv>, id: string) {
  const [row] = await c
    .get('db')
    .select({ shift: shifts, municipality: clientProfiles.municipality, clientName: clientProfiles.fullName, familyEmail: requester.email })
    .from(shifts)
    .innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId))
    .innerJoin(requester, eq(requester.id, shifts.requestedByUserId))
    .where(eq(shifts.id, id))
    .limit(1);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Request not found.');
  assertInScope(c.get('staff'), row.municipality, 'Request');
  return row;
}

/** Caregivers in the viewer's scope, ranked for this request, with blockers and warnings each. */
adminActions.get('/requests/:id/candidates', validate('param', IdParam), async (c) => {
  const db = c.get('db');
  const req = await loadRequest(c, c.req.valid('param').id);
  const list = await db
    .select({
      id: caregivers.id,
      fullName: caregiverUser.fullName,
      phone: caregiverUser.phoneNumber,
      accountActive: caregiverUser.isActive,
      municipality: caregivers.municipality,
      barangay: caregivers.barangay,
      isAccredited: caregivers.isAccredited,
      isAvailable: caregivers.isAvailable,
      badges: caregivers.badges,
      averageRating: caregivers.averageRating,
      totalShiftsCompleted: caregivers.totalShiftsCompleted,
      sameDayStarts: sql<string[]>`coalesce((select array_agg(to_char(${shifts.scheduledStartTime}, 'HH24:MI')) from ${shifts} where ${shifts.caregiverId} = ${caregivers.id} and ${shifts.scheduledDate} = ${req.shift.scheduledDate} and ${shifts.status} in ('CONFIRMED','IN_PROGRESS') and ${shifts.id} <> ${req.shift.id}), '{}')`,
    })
    .from(caregivers)
    .innerJoin(caregiverUser, eq(caregiverUser.id, caregivers.userId))
    .where(scopeCondition(c.get('staff'), caregivers.municipality));
  const ranked = list
    .map((g) => {
      const check = assignmentCheck(
        { isAccredited: g.isAccredited, isAvailable: g.isAvailable, accountActive: g.accountActive, badges: g.badges, municipality: g.municipality, sameDayStarts: g.sameDayStarts },
        { tier: req.shift.shiftTier as ShiftTier, municipality: req.municipality, startTime: req.shift.scheduledStartTime.slice(0, 5) },
      );
      return { ...g, phone: maskPhone(g.phone), averageRating: g.averageRating === null ? null : Number(g.averageRating), current: g.id === req.shift.caregiverId, ...check };
    })
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.warnings.length - b.warnings.length || (b.averageRating ?? 0) - (a.averageRating ?? 0) || b.totalShiftsCompleted - a.totalShiftsCompleted);
  return c.json({ candidates: ranked });
});

adminActions.post('/requests/:id/assign', validate('param', IdParam), validate('json', v.strictObject({ caregiverId: v.pipe(v.string(), v.uuid()) })), async (c) => {
  const db = c.get('db');
  const req = await loadRequest(c, c.req.valid('param').id);
  const problem = actionProblem('assign', req.shift.status as ShiftStatus);
  if (problem) throw new ApiError(409, 'NOT_ALLOWED', problem);
  const { caregiverId } = c.req.valid('json');
  const [g] = await db
    .select({ cg: caregivers, fullName: caregiverUser.fullName, accountActive: caregiverUser.isActive })
    .from(caregivers)
    .innerJoin(caregiverUser, eq(caregiverUser.id, caregivers.userId))
    .where(eq(caregivers.id, caregiverId))
    .limit(1);
  if (!g || !inScope(c.get('staff'), g.cg.municipality)) throw new ApiError(404, 'NOT_FOUND', 'Caregiver not found.');
  const sameDay = await db
    .select({ start: shifts.scheduledStartTime })
    .from(shifts)
    .where(and(eq(shifts.caregiverId, caregiverId), eq(shifts.scheduledDate, req.shift.scheduledDate), inArray(shifts.status, ['CONFIRMED', 'IN_PROGRESS']), ne(shifts.id, req.shift.id)));
  const check = assignmentCheck(
    { isAccredited: g.cg.isAccredited, isAvailable: g.cg.isAvailable, accountActive: g.accountActive, badges: g.cg.badges, municipality: g.cg.municipality, sameDayStarts: sameDay.map((s) => s.start.slice(0, 5)) },
    { tier: req.shift.shiftTier as ShiftTier, municipality: req.municipality, startTime: req.shift.scheduledStartTime.slice(0, 5) },
  );
  if (!check.eligible) throw new ApiError(409, 'NOT_ELIGIBLE', check.blockers.join(' '));
  await db.transaction(async (tx) => {
    await tx.update(shifts).set({ caregiverId, status: 'CONFIRMED', escalationReason: null }).where(eq(shifts.id, req.shift.id));
    await audit(c, tx, {
      action: 'request.assigned',
      entityType: 'shift',
      entityId: req.shift.id,
      municipality: req.municipality,
      metadata: { caregiverId, previousCaregiverId: req.shift.caregiverId, warnings: check.warnings },
    });
  });
  const firstName = (g.fullName ?? 'your caregiver').trim().split(/\s+/)[0];
  const email = await notifyFamily(c.env, c.get('requestId'), req.familyEmail, {
    subject: `Caregiver confirmed for ${requestRef(req.shift.id)}`,
    lines: [`Good news: ${firstName} will be your AdvanCare caregiver.`, `Request ${requestRef(req.shift.id)} is confirmed for ${req.shift.scheduledDate} at ${req.shift.scheduledStartTime.slice(0, 5)}.`],
  });
  return c.json({ ok: true, familyEmail: email, warnings: check.warnings });
});

adminActions.post(
  '/requests/:id/status',
  validate('param', IdParam),
  validate('json', v.variant('action', [
    v.strictObject({ action: v.literal('matching') }),
    v.strictObject({ action: v.literal('unassign'), reason: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(300))) }),
    v.strictObject({ action: v.literal('escalate'), reason: Reason }),
    v.strictObject({ action: v.literal('cancel'), reason: Reason }),
  ])),
  async (c) => {
    const db = c.get('db');
    const req = await loadRequest(c, c.req.valid('param').id);
    const body = c.req.valid('json');
    const problem = actionProblem(body.action, req.shift.status as ShiftStatus);
    if (problem) throw new ApiError(409, 'NOT_ALLOWED', problem);
    const reason = 'reason' in body ? (body.reason ?? null) : null;
    const change =
      body.action === 'matching'
        ? { status: 'MATCHING' as const }
        : body.action === 'unassign'
          ? { status: 'MATCHING' as const, caregiverId: null, escalationReason: null }
          : body.action === 'escalate'
            ? { status: 'ESCALATED' as const, escalationReason: reason }
            : { status: 'CANCELLED' as const, cancelledAt: new Date(), cancellationReason: reason };
    await db.transaction(async (tx) => {
      await tx.update(shifts).set(change).where(eq(shifts.id, req.shift.id));
      await audit(c, tx, { action: `request.${body.action === 'matching' ? 'matching' : body.action === 'unassign' ? 'unassigned' : body.action === 'escalate' ? 'escalated' : 'cancelled'}`, entityType: 'shift', entityId: req.shift.id, municipality: req.municipality, metadata: { from: req.shift.status, reason } });
    });
    let familyEmail: string | undefined;
    if (body.action === 'cancel') {
      familyEmail = await notifyFamily(c.env, c.get('requestId'), req.familyEmail, {
        subject: `Request ${requestRef(req.shift.id)} was cancelled`,
        lines: [`Your AdvanCare request ${requestRef(req.shift.id)} for ${req.shift.scheduledDate} was cancelled.`, `Reason: ${reason}`, 'If you still need care, you can book again in the app or contact your coordinator.'],
      });
    }
    return c.json({ ok: true, ...(familyEmail ? { familyEmail } : {}) });
  },
);

// ---------- Money ----------

/** Records a payment the family made (cash collected, GCash/Maya/bank received). One paid record per request. */
adminActions.post(
  '/requests/:id/payments',
  validate('param', IdParam),
  validate(
    'json',
    v.strictObject({
      method: v.picklist(['CASH', 'GCASH', 'MAYA', 'BANK_TRANSFER']),
      providerReference: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(120))),
    }),
  ),
  async (c) => {
    const db = c.get('db');
    const req = await loadRequest(c, c.req.valid('param').id);
    const body = c.req.valid('json');
    if (req.shift.status === 'CANCELLED' || req.shift.status === 'REQUESTED' || req.shift.status === 'MATCHING') {
      throw new ApiError(409, 'NOT_ALLOWED', 'Record payments for confirmed, in-progress or completed requests only.');
    }
    if (body.method !== 'CASH' && !body.providerReference) throw new ApiError(422, 'VALIDATION_FAILED', 'Enter the GCash/Maya/bank reference number.', { nested: { providerReference: ['Enter the reference number.'] } });
    const [paid] = await db.select({ id: payments.id }).from(payments).where(and(eq(payments.shiftId, req.shift.id), eq(payments.status, 'SUCCEEDED'))).limit(1);
    if (paid) throw new ApiError(409, 'ALREADY_PAID', 'A payment is already recorded for this request.');
    try {
      const id = await db.transaction(async (tx) => {
        const [p] = await tx
          .insert(payments)
          .values({ shiftId: req.shift.id, payerUserId: req.shift.requestedByUserId, amount: req.shift.grossRate, method: body.method, status: 'SUCCEEDED', providerReference: body.providerReference || null, paidAt: new Date() })
          .returning({ id: payments.id });
        await audit(c, tx, { action: 'payment.recorded', entityType: 'shift', entityId: req.shift.id, municipality: req.municipality, metadata: { paymentId: p!.id, method: body.method, amount: Number(req.shift.grossRate) } });
        return p!.id;
      });
      return c.json({ id }, 201);
    } catch (err) {
      if (isUnique(err)) throw new ApiError(409, 'ALREADY_EXISTS', 'That reference number is already recorded.');
      throw err;
    }
  },
);

/** Marks the caregiver's share (80%) as paid out. Completed requests only, once. */
adminActions.post('/requests/:id/payout', validate('param', IdParam), validate('json', v.strictObject({ reference: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(120))) })), async (c) => {
  const db = c.get('db');
  const req = await loadRequest(c, c.req.valid('param').id);
  if (req.shift.status !== 'COMPLETED') throw new ApiError(409, 'NOT_ALLOWED', 'Pay caregivers after the shift is completed.');
  if (req.shift.payoutPaidAt) throw new ApiError(409, 'ALREADY_PAID', 'This payout is already marked as sent.');
  const reference = c.req.valid('json').reference || null;
  await db.transaction(async (tx) => {
    await tx.update(shifts).set({ payoutPaidAt: new Date(), payoutReference: reference, payoutMarkedByUserId: c.get('staff').userId }).where(eq(shifts.id, req.shift.id));
    await audit(c, tx, { action: 'payout.sent', entityType: 'shift', entityId: req.shift.id, municipality: req.municipality, metadata: { amount: Number(req.shift.caregiverPayout), caregiverId: req.shift.caregiverId, reference } });
  });
  return c.json({ ok: true });
});
