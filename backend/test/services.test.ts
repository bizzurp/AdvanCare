import { env } from 'cloudflare:workers';
import { SELF } from 'cloudflare:test';
import { and, eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { auditLogs, serviceRequests, staffCredentials, staffMunicipalityAssignments, staffSessions, users } from '../src/db/schema';
import { randomToken, sha256Hex } from '../src/staff/crypto';
import { serviceTransitionProblem } from '../src/staff/serviceRules';
import { appUser, withDb } from './helpers';

const API = 'https://api.test/api/v1';
const run = env.TEST_DB_DISPOSABLE === 'true';
const tag = crypto.randomUUID().slice(0, 6);

describe('service request status rules', () => {
  it('moves forward only, allows rescheduling, and closes for good', () => {
    expect(serviceTransitionProblem('SUBMITTED', 'IN_REVIEW')).toBeNull();
    expect(serviceTransitionProblem('SUBMITTED', 'SCHEDULED')).toBeNull();
    expect(serviceTransitionProblem('SCHEDULED', 'SCHEDULED')).toBeNull();
    expect(serviceTransitionProblem('COMPLETED', 'CANCELLED')).toMatch(/completed/);
    expect(serviceTransitionProblem('CANCELLED', 'IN_REVIEW')).toMatch(/cancelled/);
  });
});

const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const app = (method: string, path: string, token: string, body?: unknown, headers: Record<string, string> = {}) =>
  SELF.fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
const staffReq = (method: string, path: string, cookie: string, body?: unknown) =>
  SELF.fetch(`${API}/admin${path}`, {
    method,
    headers: { Cookie: cookie, Origin: 'http://localhost:5176', 'X-AdvanCare-Staff': '1', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

async function staffSession(municipalities: string[]) {
  return withDb(async (db) => {
    const role = municipalities.length ? 'ADMIN' : 'SUPER_ADMIN';
    const [u] = await db.insert(users).values({ role, fullName: `Svc ${role}`, email: `${crypto.randomUUID()}@svc.test` }).returning({ id: users.id });
    await db.insert(staffCredentials).values({ userId: u!.id, email: `${crypto.randomUUID()}@svc.test`, passwordHash: 'x', mfaEnabled: true, status: 'ACTIVE' });
    if (municipalities.length) await db.insert(staffMunicipalityAssignments).values(municipalities.map((municipality) => ({ userId: u!.id, municipality })));
    const token = randomToken();
    await db.insert(staffSessions).values({ userId: u!.id, tokenHash: await sha256Hex(token), expiresAt: new Date(Date.now() + 3600_000) });
    return { id: u!.id, cookie: `adv_staff=${token}` };
  });
}

describe.runIf(run)('P2: services reach staff', () => {
  let family: { id: string; token: string };
  let solana: { id: string; cookie: string };
  let baggao: { id: string; cookie: string };
  const deviceRef = `svc-${crypto.randomUUID()}`;
  let uploadId = '';
  let rxId = '';

  beforeAll(async () => {
    family = await appUser();
    solana = await staffSession(['Solana']);
    baggao = await staffSession(['Baggao']);
    expect((await app('POST', '/clients/sync', family.token, { deviceRef, fullName: `Lola Svc ${tag}`, municipality: 'Solana', barangay: 'Iraga' })).status).toBe(200);
  });

  it('uploads only real JPEG/PNG/PDF files, for signed-in users', async () => {
    const up = (body: Uint8Array, type: string, token = family.token) =>
      SELF.fetch(`${API}/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': type, 'X-File-Name': encodeURIComponent('Reseta ni Lola.png') }, body });
    expect((await up(PNG, 'image/png', 'not-a-real-token-1234567890')).status).toBe(401);
    expect((await up(new TextEncoder().encode('<html>not an image'), 'image/png')).status).toBe(422);
    expect((await up(PNG, 'image/gif')).status).toBe(422);
    const res = await up(PNG, 'image/png');
    expect(res.status).toBe(201);
    const body = await res.json<{ id: string; fileName: string }>();
    expect(body.fileName).toBe('Reseta ni Lola.png');
    uploadId = body.id;
  });

  it('accepts each service once per Idempotency-Key and attaches files', async () => {
    const send = (kind: string, details: Record<string, unknown>, key: string, extra: Record<string, unknown> = {}) =>
      app('POST', '/service-requests', family.token, { kind, clientId: deviceRef, summary: `${kind} test`, details, ...extra }, { 'Idempotency-Key': key });
    const key = `rx-${crypto.randomUUID()}`;
    const rx = await send('prescription', { type: 'refill', medicines: 'Amlodipine 5 mg' }, key, { uploadIds: [uploadId] });
    expect(rx.status).toBe(201);
    const made = await rx.json<{ id: string; ref: string; status: string }>();
    expect(made).toMatchObject({ status: 'SUBMITTED' });
    expect(made.ref).toMatch(/^SVC-[0-9A-F]{8}$/);
    rxId = made.id;
    const again = await send('prescription', { type: 'refill', medicines: 'Amlodipine 5 mg' }, key, { uploadIds: [uploadId] });
    expect((await again.json<{ id: string }>()).id).toBe(rxId);
    // A file can only be attached once.
    expect((await send('prescription', { type: 'new' }, `rx2-${crypto.randomUUID()}`, { uploadIds: [uploadId] })).status).toBe(422);
    const cases: [string, Record<string, unknown>, string | null][] = [
      ['telehealth', { reason: 'Follow-up for BP', mode: 'video' }, new Date(Date.now() + 86400e3).toISOString()],
      ['rhu', { service: 'Prenatal check-up', providerType: 'midwife' }, null],
      ['triage', { concern: 'Dizzy since morning', onset: 'today' }, null],
      ['transport', { pickup: 'Purok 3, Iraga', destination: 'CVMC' }, new Date(Date.now() + 2 * 86400e3).toISOString()],
    ];
    for (const [kind, details, preferredAt] of cases) {
      expect((await send(kind, details, `${kind}-${crypto.randomUUID()}`, { preferredAt })).status, kind).toBe(201);
    }
    expect((await send('surgery', {}, `x-${crypto.randomUUID()}`)).status).toBe(422);
    const other = await appUser();
    const foreign = await app('POST', '/service-requests', other.token, { kind: 'rhu', clientId: deviceRef, summary: 'x x', details: {} }, { 'Idempotency-Key': `o-${crypto.randomUUID()}` });
    expect(foreign.status).toBe(404);
  });

  it('shows staff the inbox only within their municipalities, and audits health details', async () => {
    const inbox = await (await staffReq('GET', `/service-requests?q=Lola Svc ${tag}`, solana.cookie)).json<{ requests: { id: string; files: number }[] }>();
    expect(inbox.requests.length).toBe(5);
    expect(inbox.requests.find((r) => r.id === rxId)?.files).toBe(1);
    expect((await (await staffReq('GET', `/service-requests?q=Lola Svc ${tag}`, baggao.cookie)).json<{ requests: unknown[] }>()).requests).toEqual([]);
    expect((await staffReq('GET', `/service-requests/${rxId}`, baggao.cookie)).status).toBe(404);

    const detail = await (await staffReq('GET', `/service-requests/${rxId}`, solana.cookie)).json<{ request: { details: { medicines: string } }; files: { id: string }[] }>();
    expect(detail.request.details.medicines).toBe('Amlodipine 5 mg');
    const [viewed] = await withDb((db) => db.select().from(auditLogs).where(and(eq(auditLogs.action, 'service_request.viewed'), eq(auditLogs.entityId, rxId))));
    expect(viewed?.actorUserId).toBe(solana.id);

    const file = await staffReq('GET', `/service-requests/${rxId}/files/${detail.files[0]!.id}`, solana.cookie);
    expect(file.status).toBe(200);
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(PNG);
    const [fileViewed] = await withDb((db) => db.select().from(auditLogs).where(and(eq(auditLogs.action, 'service_request.file_viewed'), eq(auditLogs.entityId, rxId))));
    expect(fileViewed).toBeTruthy();
  });

  it('lets staff review, schedule and complete; the family sees status and note', async () => {
    expect((await staffReq('POST', `/service-requests/${rxId}/status`, solana.cookie, { status: 'SCHEDULED' })).status).toBe(422); // needs a time
    expect((await staffReq('POST', `/service-requests/${rxId}/status`, solana.cookie, { status: 'IN_REVIEW' })).status).toBe(200);
    const when = new Date(Date.now() + 2 * 86400e3).toISOString();
    const note = 'Pick up at the barangay health center after 2 PM.';
    expect((await staffReq('POST', `/service-requests/${rxId}/status`, solana.cookie, { status: 'SCHEDULED', scheduledAt: when, note })).status).toBe(200);
    const mine = await (await app('GET', '/service-requests/mine', family.token)).json<{ requests: { id: string; status: string; staffNote: string; scheduledAt: string }[] }>();
    expect(mine.requests.find((r) => r.id === rxId)).toMatchObject({ status: 'SCHEDULED', staffNote: note, scheduledAt: when });
    expect((await app('POST', `/service-requests/${rxId}/cancel`, family.token, {})).status).toBe(409); // already scheduled
    expect((await staffReq('POST', `/service-requests/${rxId}/status`, solana.cookie, { status: 'COMPLETED' })).status).toBe(200);
    expect((await staffReq('POST', `/service-requests/${rxId}/status`, solana.cookie, { status: 'CANCELLED', reason: 'Too late now' })).status).toBe(409);
  });

  it('lets the family withdraw a request that isn’t scheduled yet', async () => {
    const mine = await (await app('GET', '/service-requests/mine', family.token)).json<{ requests: { id: string; kind: string }[] }>();
    const rhu = mine.requests.find((r) => r.kind === 'rhu')!;
    expect((await app('POST', `/service-requests/${rhu.id}/cancel`, family.token, {})).status).toBe(200);
    const [row] = await withDb((db) => db.select().from(serviceRequests).where(eq(serviceRequests.id, rhu.id)));
    expect(row?.status).toBe('CANCELLED');
  });
});
