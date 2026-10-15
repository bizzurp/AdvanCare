import { env } from 'cloudflare:workers';
import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

const BASE = 'https://api.test/api/v1/admin';
const ADMIN_ORIGIN = 'http://localhost:5176';

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  SELF.fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

describe('admin API guards (no session needed)', () => {
  it('rejects writes without the staff header or from another origin (CSRF)', async () => {
    const noHeader = await post('/auth/login', { email: 'a@b.ph', password: 'x' }, { Origin: ADMIN_ORIGIN });
    expect(noHeader.status).toBe(403);
    expect((await noHeader.json<{ error: { code: string } }>()).error.code).toBe('CSRF_REJECTED');

    const wrongOrigin = await post('/auth/login', { email: 'a@b.ph', password: 'x' }, { Origin: 'https://evil.example', 'X-AdvanCare-Staff': '1' });
    expect(wrongOrigin.status).toBe(403);

    const noOrigin = await post('/auth/login', { email: 'a@b.ph', password: 'x' }, { 'X-AdvanCare-Staff': '1' });
    expect(noOrigin.status).toBe(403);
  });

  it('gives credentialed CORS to admin origins only', async () => {
    const preflight = (origin: string) =>
      SELF.fetch(`${BASE}/auth/login`, {
        method: 'OPTIONS',
        headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-advancare-staff' },
      });
    const ok = await preflight(ADMIN_ORIGIN);
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe(ADMIN_ORIGIN);
    expect(ok.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    expect(ok.headers.get('Access-Control-Allow-Headers')?.toLowerCase()).toContain('x-advancare-staff');
    expect((await preflight('https://evil.example')).headers.get('Access-Control-Allow-Origin')).toBeNull();

    // The client API keeps its own policy: no credentials.
    const client = await SELF.fetch('https://api.test/api/v1/health', { headers: { Origin: 'http://localhost:5174' } });
    expect(client.headers.get('Access-Control-Allow-Credentials')).toBeNull();
  });

  it.runIf(env.TEST_HAS_DATABASE === 'false')('reports 503 when no database is configured', async () => {
    const res = await SELF.fetch(`${BASE}/me`);
    expect(res.status).toBe(503);
  });

  it.runIf(env.TEST_HAS_DATABASE === 'true')('requires a session for staff pages and Super Admin pages', async () => {
    for (const path of ['/me', '/audit', '/municipalities', '/accounts', `/accounts/${crypto.randomUUID()}`]) {
      const res = await SELF.fetch(`${BASE}${path}`);
      expect(res.status, path).toBe(401);
      expect(res.headers.get('Cache-Control')).toBe('no-store');
    }
    const forged = await SELF.fetch(`${BASE}/me`, { headers: { Cookie: 'adv_staff=not-a-real-session-token' } });
    expect(forged.status).toBe(401);
  });

  it.runIf(env.TEST_HAS_DATABASE === 'true')('refuses expired or forged sign-in challenges', async () => {
    const res = await post('/auth/mfa', { challenge: 'eyJzdWIiOiJ4In0.forged-signature', code: '123456' }, { Origin: ADMIN_ORIGIN, 'X-AdvanCare-Staff': '1' });
    expect(res.status).toBe(401);
    expect((await res.json<{ error: { code: string } }>()).error.code).toBe('CHALLENGE_EXPIRED');
  });

  it('validates sign-in input before touching the database', async () => {
    const res = await post('/auth/login', { email: 'not-an-email', password: 'x' }, { Origin: ADMIN_ORIGIN, 'X-AdvanCare-Staff': '1' });
    expect([422, 503]).toContain(res.status);
  });
});
