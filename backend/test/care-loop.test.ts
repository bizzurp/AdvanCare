import { env } from 'cloudflare:workers';
import { SELF } from 'cloudflare:test';
import { and, eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { connectDb } from '../src/db/client';
import { auditLogs, clientLoginCodes, clientProfiles, shifts, staffCredentials, staffMunicipalityAssignments, staffSessions, users } from '../src/db/schema';
import { codeHash } from '../src/routes/auth';
import { randomToken, sha256Hex } from '../src/staff/crypto';
import { manilaDate } from '../src/staff/scope';

/**
 * The full P1 care loop against a disposable Postgres:
 * staff add a caregiver → assign → caregiver signs in, clocks in, writes a note, clocks out →
 * family reads the note → staff record payment and payout. Plus scope/permission checks.
 */
const API = 'https://api.test/api/v1';
const run = env.TEST_DB_DISPOSABLE === 'true';
const tag = crypto.randomUUID().slice(0, 6);
const ip = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

async function withDb<T>(fn: (db: NonNullable<Awaited<ReturnType<typeof connectDb>>>['db']) => Promise<T>): Promise<T> {
  const client = (await connectDb(env))!;
  try {
    return await fn(client.db);
  } finally {
    await client.close();
  }
}

const staffReq = (method: string, path: string, cookie: string, body?: unknown) =>
  SELF.fetch(`${API}/admin${path}`, {
    method,
    headers: { Cookie: cookie, Origin: 'http://localhost:5176', 'X-AdvanCare-Staff': '1', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
const appReq = (method: string, path: string, token: string, body?: unknown) =>
  SELF.fetch(`${API}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'CF-Connecting-IP': ip(), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });

async function staffSession(municipalities: string[]) {
  return withDb(async (db) => {
    const role = municipalities.length ? 'ADMIN' : 'SUPER_ADMIN';
    const [u] = await db.insert(users).values({ role, fullName: `Loop ${role} ${tag}`, email: `${crypto.randomUUID()}@loop.test` }).returning({ id: users.id });
    await db.insert(staffCredentials).values({ userId: u!.id, email: `${crypto.randomUUID()}@loop.test`, passwordHash: 'x', mfaEnabled: true, status: 'ACTIVE' });
    if (municipalities.length) await db.insert(staffMunicipalityAssignments).values(municipalities.map((municipality) => ({ userId: u!.id, municipality })));
    const token = randomToken();
    await db.insert(staffSessions).values({ userId: u!.id, tokenHash: await sha256Hex(token), expiresAt: new Date(Date.now() + 3600_000) });
    return { id: u!.id, cookie: `adv_staff=${token}` };
  });
}

/** App sign-in by email code (the code is replaced with a known one, as the inbox can't be read). */
async function appSignIn(email: string) {
  const json = (path: string, body: unknown) => SELF.fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip() }, body: JSON.stringify(body) });
  expect((await json('/auth/request-otp', { email })).status).toBe(202);
  const hash = await codeHash(email, '135790');
  await withDb((db) => db.update(clientLoginCodes).set({ codeHash: hash }).where(eq(clientLoginCodes.email, email)));
  const res = await json('/auth/verify-otp', { email, otp: '135790' });
  expect(res.status).toBe(200);
  return (await res.json<{ accessToken: string; user: { role: string } }>());
}

describe.runIf(run)('P1 care loop', () => {
  let admin: { id: string; cookie: string };
  let otherAdmin: { id: string; cookie: string };
  let familyToken: string;
  let shiftId: string;
  let caregiverId: string;
  const caregiverEmail = `carer.${tag}@loop.test`;

  beforeAll(async () => {
    admin = await staffSession(['Solana']);
    otherAdmin = await staffSession(['Baggao']);
    familyToken = (await appSignIn(`family.${tag}@loop.test`)).accessToken;
    const deviceRef = `loop-${crypto.randomUUID()}`;
    expect((await appReq('POST', '/clients/sync', familyToken, { deviceRef, fullName: `Lolo Loop ${tag}`, municipality: 'Solana', barangay: 'Iraga', clinical: { conditions: ['Hypertension'] } })).status).toBe(200);
    // A shift starting now, so the caregiver can clock in (booking enforces 12 h ahead, so it's placed directly).
    const now = new Date(Date.now() + 8 * 3600_000);
    shiftId = await withDb(async (db) => {
      const [client] = await db.select({ id: clientProfiles.id, userId: clientProfiles.userId }).from(clientProfiles).where(eq(clientProfiles.deviceRef, deviceRef));
      const [s] = await db
        .insert(shifts)
        .values({ clientId: client!.id, requestedByUserId: client!.userId, shiftTier: 'BGAY_HOME_300', scheduledDate: manilaDate(new Date()), scheduledStartTime: now.toISOString().slice(11, 16), locationDetails: 'Home', grossRate: '300', caregiverPayout: '240', platformMargin: '60' })
        .returning({ id: shifts.id });
      return s!.id;
    });
  });

  it('staff add a caregiver in their municipality only', async () => {
    const outside = await staffReq('POST', '/caregivers', admin.cookie, { fullName: 'Out Side', email: `out.${tag}@loop.test`, phone: '09170000999', municipality: 'Baggao', barangay: 'San Jose' });
    expect(outside.status).toBe(403);
    const res = await staffReq('POST', '/caregivers', admin.cookie, { fullName: `Maria Loop ${tag}`, email: caregiverEmail, phone: `0917${String(Math.random()).slice(2, 9)}`, municipality: 'Solana', barangay: 'Iraga', badges: ['BADGE_ADL'] });
    expect(res.status).toBe(201);
    caregiverId = (await res.json<{ id: string }>()).id;
    expect((await staffReq('POST', '/caregivers', admin.cookie, { fullName: 'Dup', email: caregiverEmail, phone: '09170000998', municipality: 'Solana', barangay: 'Iraga' })).status).toBe(409);
  });

  it('won’t assign an unaccredited caregiver, then assigns once accredited', async () => {
    const before = await staffReq('POST', `/requests/${shiftId}/assign`, admin.cookie, { caregiverId });
    expect(before.status).toBe(409);
    expect((await before.json<{ error: { message: string } }>()).error.message).toMatch(/accredited/);
    expect((await staffReq('PATCH', `/caregivers/${caregiverId}`, admin.cookie, { isAccredited: true, isAvailable: true })).status).toBe(200);
    const candidates = await (await staffReq('GET', `/requests/${shiftId}/candidates`, admin.cookie)).json<{ candidates: { id: string; eligible: boolean }[] }>();
    expect(candidates.candidates.find((g) => g.id === caregiverId)?.eligible).toBe(true);
    expect((await staffReq('POST', `/requests/${shiftId}/assign`, otherAdmin.cookie, { caregiverId })).status).toBe(404); // out of scope
    const res = await staffReq('POST', `/requests/${shiftId}/assign`, admin.cookie, { caregiverId });
    expect(res.status).toBe(200);
    const [row] = await withDb((db) => db.select().from(shifts).where(eq(shifts.id, shiftId)));
    expect(row).toMatchObject({ status: 'CONFIRMED', caregiverId });
    const [entry] = await withDb((db) => db.select().from(auditLogs).where(and(eq(auditLogs.action, 'request.assigned'), eq(auditLogs.entityId, shiftId))));
    expect(entry?.actorUserId).toBe(admin.id);
  });

  it('the caregiver signs in, sees the client, clocks in, notes, clocks out', async () => {
    const signedIn = await appSignIn(caregiverEmail);
    expect(signedIn.user.role).toBe('CAREGIVER');
    const token = signedIn.accessToken;
    expect((await appReq('GET', '/caregiver/me', familyToken)).status).toBe(403); // families aren't caregivers
    const list = await (await appReq('GET', '/caregiver/shifts', token)).json<{ shifts: { id: string; client: { name: string; background: unknown } }[] }>();
    const mine = list.shifts.find((s) => s.id === shiftId)!;
    expect(mine.client.name).toBe(`Lolo Loop ${tag}`);
    expect(mine.client.background).toMatchObject({ conditions: ['Hypertension'] });

    expect((await appReq('POST', `/caregiver/shifts/${shiftId}/notes`, token, { notes: 'Too early' })).status).toBe(409);
    expect((await appReq('POST', `/caregiver/shifts/${shiftId}/clock-in`, token)).status).toBe(200);
    expect((await appReq('POST', `/caregiver/shifts/${shiftId}/notes`, token, { vitals: { bpSystolic: 400 }, notes: 'x'.repeat(10) })).status).toBe(422);
    expect((await appReq('POST', `/caregiver/shifts/${shiftId}/notes`, token, { vitals: { bpSystolic: 128, bpDiastolic: 82 }, tasks: ['Bathing', 'Meal prep'], notes: 'Ate well, walked in the yard.', familySummary: 'Good day, ate lunch.' })).status).toBe(201);
    expect((await appReq('POST', `/caregiver/shifts/${shiftId}/clock-out`, token)).status).toBe(200);
    const [row] = await withDb((db) => db.select().from(shifts).where(eq(shifts.id, shiftId)));
    expect(row?.status).toBe('COMPLETED');
    expect(row?.clockOut).toBeTruthy();
  });

  it('the family reads the note and sees the payment', async () => {
    const notes = await (await appReq('GET', `/shifts/${shiftId}/notes`, familyToken)).json<{ notes: { vitals: Record<string, number>; caregiverFirstName: string }[] }>();
    expect(notes.notes[0]).toMatchObject({ vitals: { bpSystolic: 128, bpDiastolic: 82 }, caregiverFirstName: 'Maria' });
    expect(notes.notes[0]?.vitals).not.toHaveProperty('pulse'); // unmeasured stays absent
    const stranger = (await appSignIn(`stranger.${tag}@loop.test`)).accessToken;
    expect((await appReq('GET', `/shifts/${shiftId}/notes`, stranger)).status).toBe(404);

    expect((await staffReq('POST', `/requests/${shiftId}/payments`, admin.cookie, { method: 'GCASH' })).status).toBe(422); // needs a reference
    expect((await staffReq('POST', `/requests/${shiftId}/payments`, admin.cookie, { method: 'CASH' })).status).toBe(201);
    expect((await staffReq('POST', `/requests/${shiftId}/payments`, admin.cookie, { method: 'CASH' })).status).toBe(409);
    expect((await staffReq('POST', `/requests/${shiftId}/payout`, admin.cookie, { reference: 'GC-123' })).status).toBe(200);
    expect((await staffReq('POST', `/requests/${shiftId}/payout`, admin.cookie, {})).status).toBe(409);
    const mine = await (await appReq('GET', '/shifts/mine', familyToken)).json<{ shifts: { id: string; paid: boolean; careNotes: number; status: string }[] }>();
    expect(mine.shifts.find((s) => s.id === shiftId)).toMatchObject({ status: 'COMPLETED', paid: true, careNotes: 1 });
  });

  it('cancel and escalate need a reason and the right status', async () => {
    expect((await staffReq('POST', `/requests/${shiftId}/status`, admin.cookie, { action: 'cancel', reason: 'Family request' })).status).toBe(409); // already completed
    expect((await staffReq('POST', `/requests/${shiftId}/status`, admin.cookie, { action: 'escalate' })).status).toBe(422);
  });
});
