import { and, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import * as v from 'valibot';
import { careNotes, caregivers, clientProfiles, familyProfiles, shifts, users } from '../db/schema';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { validate } from '../lib/validation';
import { requireClient } from '../middleware/auth';
import { withDb } from '../middleware/staff';
import { manilaDate, manilaDayStart, requestRef } from '../staff/scope';

/**
 * Caregiver mode (P1). A caregiver signs in with the same email code as families; their account
 * (role CAREGIVER) is linked to a `caregivers` row created by staff. They only ever see shifts
 * assigned to them, and client details (address, family contact, health background) only while
 * that shift is confirmed or in progress.
 */
export const CLOCK_IN_EARLY_MS = 2 * 3600_000;
const NOTE_WINDOW_MS = 24 * 3600_000;
const ACTIVE = ['CONFIRMED', 'IN_PROGRESS'] as const;

type CaregiverVars = AppEnv & { Variables: AppEnv['Variables'] & { caregiverId: string } };

const requireCaregiver = createMiddleware<CaregiverVars>(async (c, next) => {
  const [row] = await c
    .get('db')
    .select({ id: caregivers.id, role: users.role, active: users.isActive })
    .from(users)
    .innerJoin(caregivers, eq(caregivers.userId, users.id))
    .where(eq(users.id, c.get('clientUserId')))
    .limit(1);
  if (!row || row.role !== 'CAREGIVER' || !row.active) throw new ApiError(403, 'NOT_A_CAREGIVER', 'This account isn’t set up as an AdvanCare caregiver. Ask your coordinator.');
  c.set('caregiverId', row.id);
  await next();
});

export const caregiverApp = new Hono<CaregiverVars>();
caregiverApp.use('/caregiver/*', withDb, requireClient, requireCaregiver);

caregiverApp.get('/caregiver/me', async (c) => {
  const [me] = await c
    .get('db')
    .select({ id: caregivers.id, fullName: users.fullName, email: users.email, municipality: caregivers.municipality, barangay: caregivers.barangay, isAccredited: caregivers.isAccredited, isAvailable: caregivers.isAvailable, badges: caregivers.badges, totalShiftsCompleted: caregivers.totalShiftsCompleted, averageRating: caregivers.averageRating })
    .from(caregivers)
    .innerJoin(users, eq(users.id, caregivers.userId))
    .where(eq(caregivers.id, c.get('caregiverId')))
    .limit(1);
  return c.json({ me: { ...me!, averageRating: me!.averageRating === null ? null : Number(me!.averageRating) } });
});

/** Caregivers can say whether they're free for new shifts; accreditation stays with staff. */
caregiverApp.patch('/caregiver/me', validate('json', v.strictObject({ isAvailable: v.boolean() })), async (c) => {
  await c.get('db').update(caregivers).set({ isAvailable: c.req.valid('json').isAvailable }).where(eq(caregivers.id, c.get('caregiverId')));
  return c.json({ ok: true });
});

caregiverApp.get('/caregiver/shifts', async (c) => {
  const db = c.get('db');
  const since = manilaDate(manilaDayStart(-14));
  const rows = await db
    .select({ shift: shifts, client: clientProfiles })
    .from(shifts)
    .innerJoin(clientProfiles, eq(clientProfiles.id, shifts.clientId))
    .where(and(eq(shifts.caregiverId, c.get('caregiverId')), or(inArray(shifts.status, [...ACTIVE]), and(eq(shifts.status, 'COMPLETED'), gte(shifts.scheduledDate, since)))))
    .orderBy(shifts.scheduledDate, shifts.scheduledStartTime)
    .limit(100);
  const activeClientIds = [...new Set(rows.filter((r) => (ACTIVE as readonly string[]).includes(r.shift.status)).map((r) => r.client.id))];
  const contacts = activeClientIds.length
    ? await db.select().from(familyProfiles).where(and(inArray(familyProfiles.clientId, activeClientIds), eq(familyProfiles.isEmergencyContact, true)))
    : [];
  const noteCounts = rows.length
    ? await db
        .select({ shiftId: careNotes.shiftId, n: sql<number>`count(*)::int` })
        .from(careNotes)
        .where(inArray(careNotes.shiftId, rows.map((r) => r.shift.id)))
        .groupBy(careNotes.shiftId)
    : [];
  return c.json({
    shifts: rows.map(({ shift: s, client: cl }) => {
      const active = (ACTIVE as readonly string[]).includes(s.status);
      const contact = contacts.find((f) => f.clientId === cl.id);
      return {
        id: s.id,
        ref: requestRef(s.id),
        status: s.status,
        tier: s.shiftTier,
        scheduledDate: s.scheduledDate,
        scheduledStartTime: s.scheduledStartTime.slice(0, 5),
        locationDetails: s.locationDetails,
        clockIn: s.clockIn,
        clockOut: s.clockOut,
        caregiverPayout: Number(s.caregiverPayout),
        payoutPaid: s.payoutPaidAt !== null,
        notes: noteCounts.find((n) => n.shiftId === s.id)?.n ?? 0,
        client: active
          ? {
              name: cl.fullName,
              address: [cl.sitio, `Brgy. ${cl.barangay}`, cl.municipality].filter(Boolean).join(', '),
              landmark: cl.landmarkNotes,
              // What the family entered (conditions, mobility, allergies), to give safe care.
              background: cl.clinicalBaseline,
              emergencyContact: contact ? { name: contact.relativeName, relationship: contact.relationship, phone: contact.phoneNumber } : null,
            }
          : { name: cl.fullName.split(/\s+/)[0], address: `Brgy. ${cl.barangay}, ${cl.municipality}` },
      };
    }),
  });
});

async function ownShift(c: Context<CaregiverVars>, id: string) {
  const [s] = await c.get('db').select().from(shifts).where(and(eq(shifts.id, id), eq(shifts.caregiverId, c.get('caregiverId')))).limit(1);
  if (!s) throw new ApiError(404, 'NOT_FOUND', 'Shift not found.');
  return s;
}

const IdParam = v.object({ id: v.pipe(v.string(), v.uuid()) });

/** Start instant of a shift (date + wall time in Asia/Manila). */
export const shiftStartMs = (date: string, time: string) => Date.parse(`${date}T${time.slice(0, 5)}:00+08:00`);

caregiverApp.post('/caregiver/shifts/:id/clock-in', validate('param', IdParam), async (c) => {
  const s = await ownShift(c, c.req.valid('param').id);
  if (s.status !== 'CONFIRMED') throw new ApiError(409, 'NOT_ALLOWED', s.status === 'IN_PROGRESS' ? 'You already clocked in.' : 'This shift can’t be started.');
  const start = shiftStartMs(s.scheduledDate, s.scheduledStartTime);
  if (Date.now() < start - CLOCK_IN_EARLY_MS) throw new ApiError(409, 'TOO_EARLY', 'You can clock in up to 2 hours before the shift starts.');
  if (Date.now() > start + 8 * 3600_000) throw new ApiError(409, 'TOO_LATE', 'This shift’s time has passed. Ask your coordinator.');
  await c.get('db').update(shifts).set({ status: 'IN_PROGRESS', clockIn: new Date() }).where(and(eq(shifts.id, s.id), eq(shifts.status, 'CONFIRMED')));
  return c.json({ ok: true });
});

caregiverApp.post('/caregiver/shifts/:id/clock-out', validate('param', IdParam), async (c) => {
  const s = await ownShift(c, c.req.valid('param').id);
  if (s.status !== 'IN_PROGRESS') throw new ApiError(409, 'NOT_ALLOWED', 'Clock in first.');
  await c.get('db').transaction(async (tx) => {
    const done = await tx.update(shifts).set({ status: 'COMPLETED', clockOut: new Date() }).where(and(eq(shifts.id, s.id), eq(shifts.status, 'IN_PROGRESS'))).returning({ id: shifts.id });
    if (done.length) await tx.update(caregivers).set({ totalShiftsCompleted: sql`${caregivers.totalShiftsCompleted} + 1` }).where(eq(caregivers.id, c.get('caregiverId')));
  });
  return c.json({ ok: true });
});

const Measure = (min: number, max: number, label: string) => v.optional(v.pipe(v.number(), v.minValue(min, `${label} looks too low.`), v.maxValue(max, `${label} looks too high.`)));

caregiverApp.post(
  '/caregiver/shifts/:id/notes',
  validate('param', IdParam),
  validate(
    'json',
    v.strictObject({
      // Only what was actually measured; omitted = not measured (ADR-007, never a default).
      vitals: v.optional(
        v.strictObject({
          bpSystolic: Measure(60, 260, 'Systolic BP'),
          bpDiastolic: Measure(30, 160, 'Diastolic BP'),
          pulse: Measure(25, 220, 'Pulse'),
          tempC: Measure(32, 43, 'Temperature'),
          spo2: Measure(50, 100, 'Oxygen saturation'),
          glucoseMgDl: Measure(20, 600, 'Blood sugar'),
        }),
      ),
      tasks: v.optional(v.pipe(v.array(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80))), v.maxLength(20)), []),
      notes: v.pipe(v.string(), v.trim(), v.minLength(3, 'Write a short note.'), v.maxLength(2000)),
      familySummary: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500))),
    }),
  ),
  async (c) => {
    const s = await ownShift(c, c.req.valid('param').id);
    const recent = s.status === 'COMPLETED' && s.clockOut && Date.now() - s.clockOut.getTime() < NOTE_WINDOW_MS;
    if (s.status !== 'IN_PROGRESS' && !recent) throw new ApiError(409, 'NOT_ALLOWED', 'Add notes during the shift or within 24 hours after it.');
    const body = c.req.valid('json');
    const vitals = body.vitals ? Object.fromEntries(Object.entries(body.vitals).filter(([, val]) => val !== undefined)) : {};
    const [note] = await c
      .get('db')
      .insert(careNotes)
      .values({
        shiftId: s.id,
        caregiverId: c.get('caregiverId'),
        vitalsRecorded: Object.keys(vitals).length ? vitals : null,
        tasksCompleted: body.tasks.length ? body.tasks : null,
        rawCaregiverNotes: body.notes,
        aiGeneratedFamilySummary: body.familySummary || null,
        recordedAt: new Date(),
      })
      .returning({ id: careNotes.id });
    return c.json({ id: note!.id }, 201);
  },
);

