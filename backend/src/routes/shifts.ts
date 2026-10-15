import { and, desc, eq, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Hono } from 'hono';
import * as v from 'valibot';
import { caregivers, clientProfiles, idempotencyRecords, shifts, users } from '../db/schema';
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
  if (Date.parse(`${body.scheduledDate}T${body.scheduledStartTime}:00+08:00`) <= Date.now()) {
    throw new ApiError(422, 'VALIDATION_FAILED', 'That start time has already passed.', { nested: { scheduledStartTime: ['Choose a later start time.'] } });
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

