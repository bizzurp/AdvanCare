import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import proxy from '../public/_worker.js';

test('forwards staff writes and preserves response cookies and security headers', async () => {
  const body = JSON.stringify({ email: 'staff@example.test' });
  const request = new Request('https://advancare-admin.pages.dev/api/v1/admin/auth/login?next=%2Frequests', {
    method: 'POST',
    headers: {
      Origin: 'https://advancare-admin.pages.dev',
      Cookie: '__Host-adv_staff=test-session',
      'X-AdvanCare-Staff': '1',
      'Content-Type': 'application/json',
    },
    body,
  });
  const cookie = '__Host-adv_staff=new-test-session; Path=/; HttpOnly; Secure; SameSite=Strict';
  const fetchMock = mock.method(globalThis, 'fetch', async (forwarded, options) => {
    assert.equal(forwarded.url, 'https://advancare-api.mcleinonza0531.workers.dev/api/v1/admin/auth/login?next=%2Frequests');
    assert.equal(forwarded.method, 'POST');
    for (const name of ['Origin', 'Cookie', 'X-AdvanCare-Staff', 'Content-Type']) {
      assert.equal(forwarded.headers.get(name), request.headers.get(name));
    }
    assert.equal(await forwarded.text(), body);
    assert.equal(options.redirect, 'manual');
    return new Response('{"ok":true}', { status: 201, headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' } });
  });
  try {
    const response = await proxy.fetch(request, {});
    assert.equal(response.status, 201);
    assert.equal(await response.text(), '{"ok":true}');
    assert.deepEqual(response.headers.getSetCookie(), [cookie]);
    assert.equal(response.headers.get('Content-Type'), 'application/json');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
    assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
    assert.equal(response.headers.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=()');
  } finally {
    fetchMock.mock.restore();
  }
});

test('cannot select another upstream through the query string', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async (forwarded) => {
    assert.equal(new URL(forwarded.url).origin, 'https://advancare-api.mcleinonza0531.workers.dev');
    assert.equal(new URL(forwarded.url).pathname, '/api');
    return new Response(null, { status: 204 });
  });
  try {
    const response = await proxy.fetch(new Request('https://advancare-admin.pages.dev/api?url=https://example.test'), {});
    assert.equal(response.status, 204);
  } finally {
    fetchMock.mock.restore();
  }
});

test('leaves non-API paths to Pages assets and its SPA fallback', async () => {
  const request = new Request('https://advancare-admin.pages.dev/apiary');
  const response = await proxy.fetch(request, {
    ASSETS: {
      fetch(incoming) {
        assert.equal(incoming, request);
        return new Response('app shell');
      },
    },
  });
  assert.equal(await response.text(), 'app shell');
});
