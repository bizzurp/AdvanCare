import { and, desc, eq, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Hono, type Context } from 'hono';
import * as v from 'valibot';
import { careNotes, caregivers, clientProfiles, idempotencyRecords, payments, shifts, users } from '../db/schema';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { validate } from '../lib/validation';
import { requireClient } from '../middleware/auth';
import { withDb } from '../middleware/staff';
import { sha256Hex } from '../staff/crypto';
import { manilaDate, manilaDayStart, requestRef } from '../staff/scope';

/** ADR-002 flat 8-hour rates. The server sets them; the app never sends prices. */
export const RATES = {
  BGAY_HOME_300: { grossRate: '300', caregiverPayout: '240', platformMargin: '60' },
  CVMC_INSTITUTIONAL_500: { grossRate: '500', caregiverPayout: '400', platformMargin: '100' },
} as const;
const BOOK_PATH = '/api/v1/shifts/request';
const IDEMPOTENCY_TTL_MS = 24 * 3600_000;
const MAX_DAYS_AHEAD = 90;
export const MIN_LEAD_MS = 12 * 3600_000;

const ShiftRequest = v.strictObject({
  /** Server client id, or the profile's id on the phone (deviceRef). */
  clientId: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{6,64}$/)),
  shiftTier: v.picklist(['BGAY_HOME_300', 'CVMC_INSTITUTIONAL_500']),
  scheduledDate: v.pipe(v.string(), v.isoDate('Choose a valid date.')),
  /** "08:00", or a full timestamp (what the app sends); stored as Asia/Manila wall time. */
  scheduledStartTime: v.pipe(
    v.string(),
    v.transform(toManilaTime),
    v.regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a valid start time.'),
  ),
  locationDetails: v.pipe(v.string(), v.trim(), v.minLength(3, 'Add where the caregiver should go.'), v.maxLength(500)),
});

/** "08:00" / "08:00:00" stay as-is; an ISO timestamp becomes its Asia/Manila HH:MM; anything else is left to fail validation. */
export function toManilaTime(input: string): string {
  const plain = /^([01]\d|2[0-3]):([0-5]\d)(:00)?$/.exec(input);
  if (plain) return `${plain[1]}:${plain[2]}`;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(input)) return input;
  const ms = Date.parse(input);
  if (Number.isNaN(ms)) return input;
  return new Date(ms + 8 * 3600_000).toISOString().slice(11, 16);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Bookings from the app (ADV-BOOK-001) and their live status (feeds the app's request tracker). */
export const appShifts = new Hono<AppEnv>();
appShifts.use('/shifts/*', withDb, requireClient);

appShifts.post('/shifts/request', validate('json', ShiftRequest), async (c) => {
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
      .where(and(eq(idempotencyRecords.idempotencyKey, key), eq(idempotencyRecords.requestMethod, 'POST'), eq(idempotencyRecords.requestPath, BOOK_PATH)))
      .limit(1);
    if (!prior) return null;
    if (prior.userId !== userId || prior.requestHash !== requestHash) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'This request id was already used for a different booking.');
    return c.json(prior.responseBody as Record<string, unknown>, (prior.responseStatus ?? 201) as 201);
  };
  const earlier = await replay();
  if (earlier) return earlier;

  const [client] = await db
    .select({ id: clientProfiles.id })
    .from(clientProfiles)
    .where(and(eq(clientProfiles.userId, userId), UUID.test(body.clientId) ? or(eq(clientProfiles.id, body.clientId), eq(clientProfiles.deviceRef, body.clientId)) : eq(clientProfiles.deviceRef, body.clientId)))
    .limit(1);
  if (!client) throw new ApiError(404, 'CLIENT_NOT_FOUND', 'We couldn’t find this client’s profile. Open the profile, save it, and try again.');

  const today = manilaDate(manilaDayStart(0));
  const last = manilaDate(manilaDayStart(MAX_DAYS_AHEAD));
  if (body.scheduledDate < today) throw new ApiError(422, 'VALIDATION_FAILED', 'Choose today or a later date.', { nested: { scheduledDate: ['Choose today or a later date.'] } });
  // Shifts are pre-scheduled at least 12 hours ahead (same rule the app shows).
  if (Date.parse(`${body.scheduledDate}T${body.scheduledStartTime}:00+08:00`) < Date.now() + MIN_LEAD_MS) {
    throw new ApiError(422, 'VALIDATION_FAILED', 'Book at least 12 hours before the shift starts.', { nested: { scheduledStartTime: ['Choose a start at least 12 hours from now.'] } });
  }
  if (body.scheduledDate > last) throw new ApiError(422, 'VALIDATION_FAILED', `Bookings open up to ${MAX_DAYS_AHEAD} days ahead.`, { nested: { scheduledDate: [`Choose a date within ${MAX_DAYS_AHEAD} days.`] } });

  try {
    const response = await db.transaction(async (tx) => {
      const [shift] = await tx
        .insert(shifts)
        .values({
          clientId: client.id,
          requestedByUserId: userId,
          shiftTier: body.shiftTier,
          status: 'REQUESTED',
          scheduledDate: body.scheduledDate,
          scheduledStartTime: body.scheduledStartTime,
          locationDetails: body.locationDetails,
          ...RATES[body.shiftTier],
        })
        .returning();
      const out = {
        id: shift!.id,
        ref: requestRef(shift!.id),
        status: shift!.status,
        shiftTier: shift!.shiftTier,
        scheduledDate: shift!.scheduledDate,
        scheduledStartTime: shift!.scheduledStartTime,
        grossRate: Number(shift!.grossRate),
        createdAt: shift!.createdAt,
      };
      await tx.insert(idempotencyRecords).values({
        idempotencyKey: key,
        userId,
        requestMethod: 'POST',
        requestPath: BOOK_PATH,
        requestHash,
        responseStatus: 201,
        responseBody: out,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      });
      return out;
    });
    return c.json(response, 201);
  } catch (err) {
    // A parallel retry with the same key won the race: answer with its result.
    if ((err as { code?: string; cause?: { code?: string } }).code === '23505' || (err as { cause?: { code?: string } }).cause?.code === '23505') {
      const raced = await replay();
      if (raced) return raced;
    }
    throw err;
  }
});

const caregiverUser = alias(users, 'caregiver_user');

appShifts.get('/shifts/mine', async (c) => {
  const rows = await c
    .get('db')
    .select({
      id: shifts.id,
      status: shifts.status,
      shiftTier: shifts.shiftTier,
      scheduledDate: shifts.scheduledDate,
      scheduledStartTime: shifts.scheduledStartTime,
      clockIn: shifts.clockIn,
      clockOut: shifts.clockOut,
      updatedAt: shifts.updatedAt,
      cancellationReason: shifts.cancellationReason,
      paid: sql<boolean>`exists (select 1 from ${payments} where ${payments.shiftId} = ${shifts.id} and ${payments.status} = 'SUCCEEDED')`,
      careNotes: sql<number>`(select count(*)::int from ${careNotes} where ${careNotes.shiftId} = ${shifts.id})`,
      clientId: clientProfiles.id,
      clientDeviceRef: clientProfiles.deviceRef,
      caregiverName: caregiverUser.fullName,
    })
    .from(shifts)
    .innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId))
    .leftJoin(caregivers, eq(caregivers.id, shifts.caregiverId))
    .leftJoin(caregiverUser, eq(caregiverUser.id, caregivers.userId))
    .where(eq(clientProfiles.userId, c.get('clientUserId')))
    .orderBy(desc(shifts.createdAt))
    .limit(100);
  return c.json({
    shifts: rows.map(({ caregiverName, ...r }) => ({
      ...r,
      ref: requestRef(r.id),
      // First name only: enough for the family to recognise who is coming.
      caregiverFirstName: caregiverName ? caregiverName.trim().split(/\s+/)[0] : null,
    })),
  });
});


/** Care notes for one of the family's own bookings (what the caregiver recorded). */
appShifts.get('/shifts/:id/notes', validate('param', v.object({ id: v.pipe(v.string(), v.uuid()) })), async (c) => {
  const db = c.get('db');
  const [own] = await db
    .select({ id: shifts.id })
    .from(shifts)
    .innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId))
    .where(and(eq(shifts.id, c.req.valid('param').id), eq(clientProfiles.userId, c.get('clientUserId'))))
    .limit(1);
  if (!own) throw new ApiError(404, 'NOT_FOUND', 'Request not found.');
  const notes = await db
    .select({ id: careNotes.id, recordedAt: careNotes.recordedAt, vitals: careNotes.vitalsRecorded, tasks: careNotes.tasksCompleted, notes: careNotes.rawCaregiverNotes, summary: careNotes.aiGeneratedFamilySummary, caregiverName: caregiverUser.fullName })
    .from(careNotes)
    .innerJoin(caregivers, eq(caregivers.id, careNotes.caregiverId))
    .innerJoin(caregiverUser, eq(caregiverUser.id, caregivers.userId))
    .where(eq(careNotes.shiftId, own.id))
    .orderBy(desc(careNotes.recordedAt));
  return c.json({ notes: notes.map(({ caregiverName, ...n }) => ({ ...n, caregiverFirstName: caregiverName ? caregiverName.trim().split(/\s+/)[0] : null })) });
});

const ShiftId = v.object({ id: v.pipe(v.string(), v.uuid()) });
/** Families change or cancel a booking themselves until a caregiver is assigned; after that staff handle it. */
const FAMILY_CHANGEABLE = ['REQUESTED', 'MATCHING', 'ESCALATED'] as const;

async function ownOpenShift(c: Context<AppEnv>, id: string) {
  const [row] = await c
    .get('db')
    .select({ id: shifts.id, status: shifts.status, caregiverId: shifts.caregiverId })
    .from(shifts)
    .innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId))
    .where(and(eq(shifts.id, id), eq(clientProfiles.userId, c.get('clientUserId'))))
    .limit(1);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Request not found.');
  if (!(FAMILY_CHANGEABLE as readonly string[]).includes(row.status) || row.caregiverId) {
    throw new ApiError(409, 'NOT_ALLOWED', 'A caregiver is already assigned or the shift has started. Call your care coordinator to change it.');
  }
  return row;
}

const ShiftChange = v.strictObject({
  scheduledDate: v.pipe(v.string(), v.isoDate('Choose a valid date.')),
  scheduledStartTime: v.pipe(v.string(), v.transform(toManilaTime), v.regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a valid start time.')),
  locationDetails: v.optional(v.pipe(v.string(), v.trim(), v.minLength(3, 'Add where the caregiver should go.'), v.maxLength(500))),
});

appShifts.patch('/shifts/:id', validate('param', ShiftId), validate('json', ShiftChange), async (c) => {
  const row = await ownOpenShift(c, c.req.valid('param').id);
  const body = c.req.valid('json');
  if (Date.parse(`${body.scheduledDate}T${body.scheduledStartTime}:00+08:00`) < Date.now() + MIN_LEAD_MS) {
    throw new ApiError(422, 'VALIDATION_FAILED', 'Book at least 12 hours before the shift starts.', { nested: { scheduledStartTime: ['Choose a start at least 12 hours from now.'] } });
  }
  if (body.scheduledDate > manilaDate(manilaDayStart(MAX_DAYS_AHEAD))) throw new ApiError(422, 'VALIDATION_FAILED', `Bookings open up to ${MAX_DAYS_AHEAD} days ahead.`);
  await c
    .get('db')
    .update(shifts)
    .set({ scheduledDate: body.scheduledDate, scheduledStartTime: body.scheduledStartTime, ...(body.locationDetails ? { locationDetails: body.locationDetails } : {}) })
    .where(eq(shifts.id, row.id));
  return c.json({ ok: true, scheduledDate: body.scheduledDate, scheduledStartTime: body.scheduledStartTime });
});

appShifts.post('/shifts/:id/cancel', validate('param', ShiftId), async (c) => {
  const row = await ownOpenShift(c, c.req.valid('param').id);
  await c.get('db').update(shifts).set({ status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: 'Cancelled by the family' }).where(eq(shifts.id, row.id));
  return c.json({ ok: true });
});

const ShiftRate = v.strictObject({
  rating: v.pipe(v.number(), v.integer(), v.minValue(1, 'Rating must be at least 1 star.'), v.maxValue(5, 'Rating cannot exceed 5 stars.')),
  review: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(1000))),
});

appShifts.post('/shifts/:id/rate', validate('param', ShiftId), validate('json', ShiftRate), async (c) => {
  const db = c.get('db');
  const shiftId = c.req.valid('param').id;
  const { rating, review } = c.req.valid('json');

  const [row] = await db
    .select({ id: shifts.id, status: shifts.status, caregiverId: shifts.caregiverId })
    .from(shifts)
    .innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId))
    .where(and(eq(shifts.id, shiftId), eq(clientProfiles.userId, c.get('clientUserId'))))
    .limit(1);

  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Shift not found.');
  if (row.status !== 'COMPLETED') throw new ApiError(409, 'NOT_ALLOWED', 'You can only rate a completed shift.');

  if (row.caregiverId) {
    const [cg] = await db.select().from(caregivers).where(eq(caregivers.id, row.caregiverId)).limit(1);
    if (cg) {
      const curRating = cg.averageRating !== null ? Number(cg.averageRating) : null;
      const count = cg.totalShiftsCompleted > 0 ? cg.totalShiftsCompleted : 1;
      const newRating = curRating !== null ? ((curRating * count) + rating) / (count + 1) : rating;
      const rounded = (Math.round(newRating * 100) / 100).toFixed(2);
      await db.update(caregivers).set({ averageRating: rounded }).where(eq(caregivers.id, cg.id));
    }
  }

  return c.json({ ok: true, rating, review: review || null });
});

const ShiftReport = v.strictObject({
  reason: v.pipe(v.string(), v.trim(), v.minLength(3, 'Select or describe the reason for your report.'), v.maxLength(200)),
  details: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(1000))),
});

appShifts.post('/shifts/:id/report', validate('param', ShiftId), validate('json', ShiftReport), async (c) => {
  const db = c.get('db');
  const shiftId = c.req.valid('param').id;
  const { reason, details } = c.req.valid('json');

  const [row] = await db
    .select({ id: shifts.id, status: shifts.status })
    .from(shifts)
    .innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId))
    .where(and(eq(shifts.id, shiftId), eq(clientProfiles.userId, c.get('clientUserId'))))
    .limit(1);

  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Shift not found.');

  const escalationReason = `[FAMILY REPORT: ${reason}]${details ? ` ${details}` : ''}`;
  const updateData: { escalationReason: string; status?: 'ESCALATED' } = { escalationReason };
  if (row.status !== 'COMPLETED' && row.status !== 'CANCELLED') {
    updateData.status = 'ESCALATED';
  }

  await db.update(shifts).set(updateData).where(eq(shifts.id, row.id));

  return c.json({ ok: true, escalated: updateData.status === 'ESCALATED' });
});

