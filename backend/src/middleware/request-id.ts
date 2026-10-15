import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../env';

export const REQUEST_ID_HEADER = 'X-Request-Id';
const SAFE_INCOMING_ID = /^[A-Za-z0-9._-]{8,128}$/;

/** Reuses a well-formed incoming X-Request-Id, otherwise mints one; echoes it and logs the request. */
export const requestId = createMiddleware<AppEnv>(async (c, next) => {
  const incoming = c.req.header(REQUEST_ID_HEADER);
  const id = incoming && SAFE_INCOMING_ID.test(incoming) ? incoming : crypto.randomUUID();
  c.set('requestId', id);
  const started = Date.now();
  await next();
  c.header(REQUEST_ID_HEADER, id);
  console.log(
    JSON.stringify({
      requestId: id,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - started,
    }),
  );
});
