import { env } from 'cloudflare:workers';
import { SELF } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { connectDb } from '../src/db/client';
import { clientLoginCodes, shifts } from '../src/db/schema';
import { codeHash, CODE_TTL_MS } from '../src/routes/auth';
import { manilaDate, manilaDayStart } from '../src/staff/scope';

/** App sign-in by email code, profile sync and booking, end to end against a disposable Postgres. */
const BASE = 'https://api.test/api/v1';
const run = env.TEST_DB_DISPOSABLE === 'true';
/** A short-lived connection per use, like the request handlers (a long-lived one can hang on close in workerd). */
async function withDb<T>(fn: (db: NonNullable<Awaited<ReturnType<typeof connectDb>>>['db']) => Promise<T>): Promise<T> {
  const client = (await connectDb(env))!;
  try {
    return await fn(client.db);
  } finally {
    await client.close();
  }
}

// A distinct caller IP per request keeps the per-IP sign-in limit (tested elsewhere) out of the way.
const ip = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
const json = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  SELF.fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip(), ...headers }, body: JSON.stringify(body) });

/** Puts a known code in place of the emailed one (tests can't read the inbox). */
async function knownCode(email: string, code = '424242') {
  const hash = await codeHash(email, code);
  await withDb((db) => db.update(clientLoginCodes).set({ codeHash: hash }).where(eq(clientLoginCodes.email, email)));
  return code;
}

async function signIn(email: string) {
  expect((await json('/auth/request-otp', { email })).status).toBe(202);
  const res = await json('/auth/verify-otp', { email, otp: await knownCode(email) });
  expect(res.status).toBe(200);
  return (await res.json<{ accessToken: string; user: { id: string; isNew: boolean } }>()).accessToken;
}

const profile = (deviceRef: string, municipality = 'Solana') => ({
  deviceRef,
  fullName: 'Lola Remedios Test',
  dateOfBirth: '1945-03-02',
  gender: 'Female',
  municipality,
  barangay: 'Iraga',
  sitio: 'Purok 3',
  landmarkNotes: 'Green gate',
  clinical: { conditions: ['Hypertension'], mobility: '', allergies: '' },
  family: [{ name: 'Ana Test', relationship: 'Daughter', phone: '+63 917 000 0000', isPrimary: true, isRemoteSponsor: false }],
});

const tomorrow = () => manilaDate(manilaDayStart(2)); // ≥ 12 h ahead whatever the time of day

describe.runIf(run)('app sign-in by email code', () => {
  it('signs in with the emailed code, once, and maps the same email to the same account', async () => {
    const email = `Family.${crypto.randomUUID().slice(0, 8)}@Example.test`;
    const res = await json('/auth/request-otp', { email });
    expect(res.status).toBe(202);
    expect(await res.json()).toMatchObject({ sent: true, devNote: expect.any(String) });
    const code = await knownCode(email.toLowerCase());
    expect((await json('/auth/verify-otp', { email, otp: '000000' })).status).toBe(401);
    const ok = await json('/auth/verify-otp', { email, otp: code });
    expect(ok.status).toBe(200);
    const first = await ok.json<{ accessToken: string; user: { id: string; isNew: boolean } }>();
    expect(first.user.isNew).toBe(true);
    expect((await json('/auth/verify-otp', { email, otp: code })).status).toBe(401); // used up

    const again = await signIn(email.toLowerCase());
    const me = await (await SELF.fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${again}` } })).json<{ me: { id: string } }>();
    expect(me.me.id).toBe(first.user.id);
  });

  it('locks a code after 5 wrong tries', async () => {
    const email = `lock.${crypto.randomUUID().slice(0, 8)}@example.test`;
    await json('/auth/request-otp', { email });
    const code = await knownCode(email);
    for (let i = 0; i < 5; i++) await json('/auth/verify-otp', { email, otp: '111111' });
    const res = await json('/auth/verify-otp', { email, otp: code });
    expect(res.status).toBe(401);
    expect((await res.json<{ error: { code: string } }>()).error.code).toBe('CODE_LOCKED');
  });

  it('rate-limits code requests per email', async () => {
    const email = `burst.${crypto.randomUUID().slice(0, 8)}@example.test`;
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await json('/auth/request-otp', { email })).status);
    expect(statuses.slice(0, 5)).toEqual([202, 202, 202, 202, 202]);
    expect(statuses[5]).toBe(429); // max 5 codes per hour per email
  });

  it('refuses expired codes', async () => {
    const email = `exp.${crypto.randomUUID().slice(0, 8)}@example.test`;
    await json('/auth/request-otp', { email });
    const code = await knownCode(email);
    await withDb((db) => db.update(clientLoginCodes).set({ expiresAt: new Date(Date.now() - CODE_TTL_MS) }).where(eq(clientLoginCodes.email, email)));
    expect((await json('/auth/verify-otp', { email, otp: code })).status).toBe(401);
  });

  it('signs out', async () => {
    const email = `out.${crypto.randomUUID().slice(0, 8)}@example.test`;
    const token = await signIn(email);
    expect((await json('/auth/sign-out', {}, { Authorization: `Bearer ${token}` })).status).toBe(200);
    expect((await SELF.fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })).status).toBe(401);
  });
});

describe.runIf(run)('profile sync and booking', () => {
  let token: string;
  let other: string;
  const deviceRef = `dev-${crypto.randomUUID()}`;
  beforeAll(async () => {
    token = await signIn(`book.${crypto.randomUUID().slice(0, 8)}@example.test`);
    other = await signIn(`other.${crypto.randomUUID().slice(0, 8)}@example.test`);
    // Every booking test starts from a synced profile, so each can run on its own.
    expect((await json('/clients/sync', profile(deviceRef), { Authorization: `Bearer ${token}` })).status).toBe(200);
  });

  const book = (body: unknown, key: string, t = token) => json('/shifts/request', body, { Authorization: `Bearer ${t}`, 'Idempotency-Key': key });
  const booking = (over: Record<string, unknown> = {}) => ({ clientId: deviceRef, shiftTier: 'BGAY_HOME_300', scheduledDate: tomorrow(), scheduledStartTime: '08:00', locationDetails: 'Home, Purok 3, Brgy. Iraga', ...over });

  it('requires sign-in', async () => {
    expect((await json('/clients/sync', profile(deviceRef))).status).toBe(401);
    expect((await book(booking(), `k-${crypto.randomUUID()}`, 'not-a-real-token-1234567890')).status).toBe(401);
  });

  it('syncs the profile idempotently and validates the municipality', async () => {
    const first = await (await json('/clients/sync', profile(deviceRef), { Authorization: `Bearer ${token}` })).json<{ clientId: string }>();
    const second = await (await json('/clients/sync', { ...profile(deviceRef), barangay: 'Natappian East' }, { Authorization: `Bearer ${token}` })).json<{ clientId: string }>();
    expect(second.clientId).toBe(first.clientId);
    expect((await json('/clients/sync', profile(`x-${crypto.randomUUID()}`, 'Atlantis'), { Authorization: `Bearer ${token}` })).status).toBe(422);
  });

  it('books at the server-set rate, once per Idempotency-Key', async () => {
    const key = `k-${crypto.randomUUID()}`;
    const res = await book(booking(), key);
    expect(res.status).toBe(201);
    const made = await res.json<{ id: string; ref: string; status: string; grossRate: number }>();
    expect(made).toMatchObject({ status: 'REQUESTED', grossRate: 300 });
    expect(made.ref).toMatch(/^REQ-[0-9A-F]{8}$/);

    const retry = await book(booking(), key);
    expect(retry.status).toBe(201);
    expect((await retry.json<{ id: string }>()).id).toBe(made.id);
    expect((await book(booking({ scheduledStartTime: '09:00' }), key)).status).toBe(409);

    const [row] = await withDb((db) => db.select().from(shifts).where(eq(shifts.id, made.id)));
    expect(row).toMatchObject({ grossRate: '300.00', caregiverPayout: '240.00', platformMargin: '60.00', requestedByUserId: expect.any(String) });

    const mine = await (await SELF.fetch(`${BASE}/shifts/mine`, { headers: { Authorization: `Bearer ${token}` } })).json<{ shifts: { id: string; clientDeviceRef: string }[] }>();
    expect(mine.shifts.map((s) => s.id)).toContain(made.id);
    expect(mine.shifts[0]?.clientDeviceRef).toBe(deviceRef);
  });

  it('rejects other families’ clients, missing keys, past dates and prices', async () => {
    expect((await book(booking(), `k-${crypto.randomUUID()}`, other)).status).toBe(404);
    expect((await json('/shifts/request', booking(), { Authorization: `Bearer ${token}` })).status).toBe(400);
    expect((await book(booking({ scheduledDate: '2020-01-01' }), `k-${crypto.randomUUID()}`)).status).toBe(422);
    expect((await book(booking({ grossRate: 1 }), `k-${crypto.randomUUID()}`)).status).toBe(422);
    const other0 = await (await SELF.fetch(`${BASE}/shifts/mine`, { headers: { Authorization: `Bearer ${other}` } })).json<{ shifts: unknown[] }>();
    expect(other0.shifts).toEqual([]);
  });
});
