import { env } from 'cloudflare:workers';
import { SELF } from 'cloudflare:test';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectDb } from '../src/db/client';
import { auditLogs, caregivers, careNotes, clientProfiles, payments, shifts, staffCredentials, staffMunicipalityAssignments, staffSessions, users } from '../src/db/schema';
import { randomToken, sha256Hex } from '../src/staff/crypto';

/**
 * Role × scope matrix for the operations dashboards, against a real (disposable) Postgres.
 * Runs only with TEST_LOCAL_DATABASE_URL (see vitest.config.ts).
 */
const BASE = 'https://api.test/api/v1/admin';
const run = env.TEST_DB_DISPOSABLE === 'true';
const tag = crypto.randomUUID().slice(0, 6);

let db: NonNullable<Awaited<ReturnType<typeof connectDb>>>;
const ids = {} as Record<'superCookie' | 'adminCookie' | 'suspendedCookie' | 'adminId' | 'inClient' | 'outClient' | 'inShift' | 'outShift' | 'inCaregiver' | 'outCaregiver', string>;

async function staff(role: 'ADMIN' | 'SUPER_ADMIN', municipalities: string[], status: 'ACTIVE' | 'SUSPENDED' = 'ACTIVE') {
  const [u] = await db.db.insert(users).values({ role, fullName: `Test ${role} ${tag}`, email: `${role}.${crypto.randomUUID()}@scope.test` }).returning({ id: users.id });
  await db.db.insert(staffCredentials).values({ userId: u!.id, email: `${crypto.randomUUID()}@scope.test`, passwordHash: 'x', mfaEnabled: true, status });
  if (municipalities.length) await db.db.insert(staffMunicipalityAssignments).values(municipalities.map((municipality) => ({ userId: u!.id, municipality })));
  const token = randomToken();
  await db.db.insert(staffSessions).values({ userId: u!.id, tokenHash: await sha256Hex(token), expiresAt: new Date(Date.now() + 3600_000) });
  return { id: u!.id, cookie: `adv_staff=${token}` };
}

async function clientWithShift(municipality: string) {
  const [u] = await db.db.insert(users).values({ role: 'CLIENT', fullName: `Client ${municipality} ${tag}`, phoneNumber: `09${String(Math.random()).slice(2, 11)}` }).returning({ id: users.id });
  const [cp] = await db.db.insert(clientProfiles).values({ userId: u!.id, fullName: `Scope ${municipality} Client ${tag}`, barangay: 'Centro', municipality, philhealthId: 'PH-SECRET-123', clinicalBaseline: { note: 'baseline' } }).returning({ id: clientProfiles.id });
  const [cgUser] = await db.db.insert(users).values({ role: 'CAREGIVER', fullName: `Carer ${municipality} ${tag}`, phoneNumber: `09${String(Math.random()).slice(2, 11)}` }).returning({ id: users.id });
  const [cg] = await db.db.insert(caregivers).values({ userId: cgUser!.id, municipality, isAccredited: true, isAvailable: true, badges: ['BADGE_ADL'] }).returning({ id: caregivers.id });
  const [s] = await db.db
    .insert(shifts)
    .values({ clientId: cp!.id, requestedByUserId: u!.id, caregiverId: cg!.id, shiftTier: 'BGAY_HOME_300', status: 'COMPLETED', scheduledDate: '2026-10-14', scheduledStartTime: '08:00', locationDetails: 'Home', grossRate: '300', caregiverPayout: '240', platformMargin: '60', clockIn: new Date('2026-10-14T00:00:00Z'), clockOut: new Date('2026-10-14T08:00:00Z') })
    .returning({ id: shifts.id });
  await db.db.insert(payments).values({ shiftId: s!.id, payerUserId: u!.id, amount: '300', method: 'GCASH', status: 'SUCCEEDED', providerReference: `T${crypto.randomUUID()}` });
  await db.db.insert(careNotes).values({ shiftId: s!.id, caregiverId: cg!.id, rawCaregiverNotes: 'Scope test note', recordedAt: new Date() });
  return { client: cp!.id, shift: s!.id, caregiver: cg!.id };
}

const get = (path: string, cookie: string) => SELF.fetch(`${BASE}${path}`, { headers: { Cookie: cookie } });
const post = (path: string, cookie: string, body: unknown) =>
  SELF.fetch(`${BASE}${path}`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json', Origin: 'http://localhost:5176', 'X-AdvanCare-Staff': '1' }, body: JSON.stringify(body) });

describe.runIf(run)('operations dashboards: role × scope', () => {
  beforeAll(async () => {
    db = (await connectDb(env))!;
    const sup = await staff('SUPER_ADMIN', []);
    const adm = await staff('ADMIN', ['Solana']);
    const susp = await staff('ADMIN', ['Solana'], 'SUSPENDED');
    const inside = await clientWithShift('Solana');
    const outside = await clientWithShift('Baggao');
    Object.assign(ids, {
      superCookie: sup.cookie,
      adminCookie: adm.cookie,
      suspendedCookie: susp.cookie,
      adminId: adm.id,
      inClient: inside.client,
      outClient: outside.client,
      inShift: inside.shift,
      outShift: outside.shift,
      inCaregiver: inside.caregiver,
      outCaregiver: outside.caregiver,
    });
  });
  afterAll(async () => db?.close());

  it('lists only in-scope requests, clients, caregivers and payments for an Admin', async () => {
    for (const [path, key] of [['/requests?q=' + tag, 'requests'], ['/clients?q=' + tag, 'clients'], ['/caregivers?q=' + tag, 'caregivers'], ['/payments', 'payments']] as const) {
      const body = await (await get(path, ids.adminCookie)).json<Record<string, { municipality: string }[]>>();
      expect(body[key]!.length, path).toBeGreaterThan(0);
      expect(body[key]!.every((r) => r.municipality === 'Solana'), path).toBe(true);
    }
    const sup = await (await get('/requests?q=' + tag, ids.superCookie)).json<{ requests: { municipality: string }[] }>();
    expect(new Set(sup.requests.map((r) => r.municipality))).toEqual(new Set(['Solana', 'Baggao']));
  });

  it('answers 404 (not 403) for out-of-scope records', async () => {
    for (const path of [`/requests/${ids.outShift}`, `/clients/${ids.outClient}`, `/caregivers/${ids.outCaregiver}`]) {
      expect((await get(path, ids.adminCookie)).status, path).toBe(404);
      expect((await get(path, ids.superCookie)).status, path).toBe(200);
    }
    expect((await post(`/clients/${ids.outClient}/clinical-access`, ids.adminCookie, { reason: 'Checking the care plan for a visit' })).status).toBe(404);
    // A municipality filter can't widen the scope.
    const filtered = await (await get('/requests?municipality=Baggao', ids.adminCookie)).json<{ total: number }>();
    expect(filtered.total).toBe(0);
  });

  it('never returns government ID numbers or full phone numbers, and audits opening a client', async () => {
    const res = await get(`/clients/${ids.inClient}`, ids.adminCookie);
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).not.toContain('PH-SECRET-123');
    expect(text).not.toContain('baseline');
    expect(JSON.parse(text).client.idsOnFile.philhealth).toBe(true);
    expect(JSON.parse(text).account.phone).toMatch(/^\d{4}•••\d{4}$/);
    const [row] = await db.db.select().from(auditLogs).where(and(eq(auditLogs.action, 'client.viewed'), eq(auditLogs.entityId, ids.inClient), eq(auditLogs.actorUserId, ids.adminId)));
    expect(row?.municipality).toBe('Solana');
  });

  it('requires a reason for clinical notes and audits it', async () => {
    expect((await post(`/clients/${ids.inClient}/clinical-access`, ids.adminCookie, { reason: 'why' })).status).toBe(422);
    const res = await post(`/clients/${ids.inClient}/clinical-access`, ids.adminCookie, { reason: 'Preparing the caregiver handover' });
    expect(res.status).toBe(200);
    const body = await res.json<{ careNotes: { rawCaregiverNotes: string }[]; clinicalBaseline: unknown }>();
    expect(body.careNotes[0]?.rawCaregiverNotes).toBe('Scope test note');
    const [row] = await db.db.select().from(auditLogs).where(and(eq(auditLogs.action, 'client.clinical_viewed'), eq(auditLogs.entityId, ids.inClient)));
    expect(row?.metadata).toMatchObject({ reason: 'Preparing the caregiver handover', notes: 1 });
  });

  it('exports only in-scope rows and audits the download', async () => {
    const res = await get('/exports/requests', ids.adminCookie);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    const csv = await res.text();
    expect(csv).toContain(`Scope Solana Client ${tag}`);
    expect(csv).not.toContain(`Scope Baggao Client ${tag}`);
    const [row] = await db.db.select().from(auditLogs).where(and(eq(auditLogs.action, 'export.downloaded'), eq(auditLogs.actorUserId, ids.adminId)));
    expect(row?.metadata).toMatchObject({ table: 'requests', scope: ['Solana'] });
  });

  it('scopes the overview numbers and breakdowns by municipality', async () => {
    const admin = await (await get('/overview?range=90', ids.adminCookie)).json<{ kpis: { clientsRegistered: number }; daily: unknown[]; byMunicipality: { municipality: string; district: string }[] }>();
    const sup = await (await get('/overview?range=90', ids.superCookie)).json<{ kpis: { clientsRegistered: number }; byMunicipality: { municipality: string; district: string }[] }>();
    expect(admin.daily).toHaveLength(90);
    expect(sup.kpis.clientsRegistered).toBeGreaterThan(admin.kpis.clientsRegistered);
    // Super Admin gets all 29 LGUs by default
    expect(sup.byMunicipality).toHaveLength(29);
    // Scoped Admin gets only their assigned municipality
    expect(admin.byMunicipality).toHaveLength(1);
    expect(admin.byMunicipality[0]?.municipality).toBe('Solana');
    expect(admin.byMunicipality[0]?.district).toBe('District 3');

    // Super Admin filtering to specific subset
    const filteredSup = await (await get('/overview?range=90&municipalities=Solana,Tuguegarao%20City', ids.superCookie)).json<{ byMunicipality: { municipality: string }[] }>();
    expect(filteredSup.byMunicipality).toHaveLength(2);
    expect(filteredSup.byMunicipality.map((m) => m.municipality).sort()).toEqual(['Solana', 'Tuguegarao City']);

    // Admin filtering to out-of-scope municipality yields empty intersection
    const outOfScopeAdmin = await (await get('/overview?range=90&municipalities=Baggao', ids.adminCookie)).json<{ kpis: { requests: number }; byMunicipality: unknown[] }>();
    expect(outOfScopeAdmin.byMunicipality).toHaveLength(0);
    expect(outOfScopeAdmin.kpis.requests).toBe(0);

    // Empty municipalities param yields 0 results and empty breakdown
    const emptySup = await (await get('/overview?range=90&municipalities=', ids.superCookie)).json<{ kpis: { requests: number }; byMunicipality: unknown[] }>();
    expect(emptySup.byMunicipality).toHaveLength(0);
    expect(emptySup.kpis.requests).toBe(0);

    // Unknown/fictitious municipality strings are filtered out
    const fictitious = await (await get('/overview?range=90&municipalities=Atlantis,Tuguegarao', ids.superCookie)).json<{ byMunicipality: unknown[] }>();
    expect(fictitious.byMunicipality).toHaveLength(0);
  });

  it('keeps account management Super Admin only, and rejects suspended staff everywhere', async () => {
    expect((await get('/accounts', ids.adminCookie)).status).toBe(403);
    expect((await get('/accounts', ids.superCookie)).status).toBe(200);
    for (const path of ['/overview', '/requests', '/clients', '/payments']) expect((await get(path, ids.suspendedCookie)).status, path).toBe(401);
  });
});
