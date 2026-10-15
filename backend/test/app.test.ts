import { env } from 'cloudflare:workers';
import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

const BASE = 'https://api.test/api/v1';

describe('middleware', () => {
  it('mints an X-Request-Id and echoes a well-formed incoming one', async () => {
    const minted = await SELF.fetch(`${BASE}/nope`);
    expect(minted.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/);

    const echoed = await SELF.fetch(`${BASE}/nope`, { headers: { 'X-Request-Id': 'client-req-12345' } });
    expect(echoed.headers.get('X-Request-Id')).toBe('client-req-12345');

    const replaced = await SELF.fetch(`${BASE}/nope`, { headers: { 'X-Request-Id': 'bad id<script>' } });
    expect(replaced.headers.get('X-Request-Id')).not.toBe('bad id<script>');
  });

  it('returns the error envelope for unknown routes', async () => {
    const res = await SELF.fetch(`${BASE}/nope`);
    expect(res.status).toBe(404);
    const body = await res.json<{ error: { code: string; requestId: string } }>();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toBe(res.headers.get('X-Request-Id'));
  });

  it('allows CORS only for listed origins', async () => {
    const preflight = (origin: string) =>
      SELF.fetch(`${BASE}/storage/upload-url`, {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,idempotency-key',
        },
      });
    const ok = await preflight('http://localhost:5174');
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5174');
    expect(ok.headers.get('Access-Control-Allow-Headers')?.toLowerCase()).toContain('idempotency-key');

    const denied = await preflight('https://evil.example');
    expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull();

    // Development only: any localhost port; lookalike hosts are still refused.
    expect((await preflight('http://localhost:5177')).headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5177');
    expect((await preflight('http://localhost.evil.example')).headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

describe('GET /health', () => {
  it.runIf(env.TEST_HAS_DATABASE === 'false')('reports degraded (503) when no database is configured', async () => {
    const res = await SELF.fetch(`${BASE}/health`);
    expect(res.status).toBe(503);
    const body = await res.json<{ status: string; checks: { database: { status: string } } }>();
    expect(body.status).toBe('degraded');
    expect(body.checks.database.status).toBe('unconfigured');
  });

  it.runIf(env.TEST_HAS_DATABASE === 'true')('reports ok (200) against the configured database', async () => {
    const res = await SELF.fetch(`${BASE}/health`);
    const body = await res.json<{ status: string; checks: { database: { status: string; source: string } } }>();
    expect(body.checks.database).toMatchObject({ status: 'ok', source: 'direct' });
    expect(res.status).toBe(200);
  });
});

describe('POST /storage/upload-url', () => {
  const request = (body: unknown) =>
    SELF.fetch(`${BASE}/storage/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('returns a 15-minute presigned PUT bound to type and size', async () => {
    const res = await request({ contentType: 'application/pdf', contentLength: 2_000_000 });
    expect(res.status).toBe(201);
    const body = await res.json<{ key: string; uploadUrl: string; method: string; headers: Record<string, string> }>();
    expect(body.key).toMatch(/^uploads\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.pdf$/);
    expect(body.method).toBe('PUT');

    const url = new URL(body.uploadUrl);
    expect(url.host).toBe('testaccount.r2.cloudflarestorage.com');
    expect(url.pathname).toBe(`/${env.R2_BUCKET_NAME}/${body.key}`);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
    const signed = url.searchParams.get('X-Amz-SignedHeaders')?.split(';') ?? [];
    expect(signed).toEqual(expect.arrayContaining(['content-type', 'content-length', 'host']));
    expect(body.headers).toEqual({ 'Content-Type': 'application/pdf', 'Content-Length': '2000000' });
  });

  it.each([
    ['image/jpeg', 5 * 1024 * 1024, 201],
    ['image/jpeg', 5 * 1024 * 1024 + 1, 422],
    ['image/png', 5 * 1024 * 1024 + 1, 422],
    ['application/pdf', 10 * 1024 * 1024, 201],
    ['application/pdf', 10 * 1024 * 1024 + 1, 422],
  ])('enforces size limit for %s at %i bytes → %i', async (contentType, contentLength, status) => {
    expect((await request({ contentType, contentLength })).status).toBe(status);
  });

  it.each([
    [{ contentType: 'image/gif', contentLength: 100 }],
    [{ contentType: 'text/html', contentLength: 100 }],
    [{ contentType: 'image/png', contentLength: 0 }],
    [{ contentType: 'image/png', contentLength: 1.5 }],
    [{ contentType: 'image/png' }],
    [{ contentType: 'image/png', contentLength: 100, key: 'uploads/../../etc' }],
  ])('rejects invalid payload %j with 422', async (payload) => {
    const res = await request(payload);
    expect(res.status).toBe(422);
    const body = await res.json<{ error: { code: string } }>();
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('GET /storage/file/:key', () => {
  it('streams a stored object with no-store caching', async () => {
    const key = `uploads/2026/10/${crypto.randomUUID()}.png`;
    await env.UPLOADS.put(key, new Uint8Array([137, 80, 78, 71]), { httpMetadata: { contentType: 'image/png' } });

    const res = await SELF.fetch(`${BASE}/storage/file/${key}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]));
  });

  it('404s for missing objects and keys outside the upload namespace', async () => {
    for (const key of [`uploads/2026/10/${crypto.randomUUID()}.png`, 'secrets/config.json', 'uploads/2026/10/x.png']) {
      const res = await SELF.fetch(`${BASE}/storage/file/${key}`);
      expect(res.status).toBe(404);
    }
  });
});
