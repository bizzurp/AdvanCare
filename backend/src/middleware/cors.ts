import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../env';
import { REQUEST_ID_HEADER } from './request-id';
import { isAdminOrigin, STAFF_HEADER } from './staff';

const LOCAL_DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/;

/**
 * CORS restricted to the origins listed in ALLOWED_ORIGINS. Unlisted origins get no CORS headers.
 * In development only, any localhost port is allowed (Vite picks the next free port).
 *
 * The staff API (/api/v1/admin) is separate: only ADMIN_ORIGINS, with credentials (cookie session).
 */
export const corsMiddleware = createMiddleware<AppEnv>((c, next) => {
  if (c.req.path.startsWith('/api/v1/admin')) {
    return cors({
      origin: (origin) => (isAdminOrigin(c.env, origin) ? origin : null),
      credentials: true,
      allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
      allowHeaders: ['Content-Type', STAFF_HEADER, REQUEST_ID_HEADER],
      exposeHeaders: [REQUEST_ID_HEADER],
      maxAge: 600,
    })(c, next);
  }
  const allowed = (c.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return cors({
    origin: (origin) =>
      allowed.includes(origin) || (c.env.ENVIRONMENT === 'development' && LOCAL_DEV_ORIGIN.test(origin)) ? origin : null,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', REQUEST_ID_HEADER],
    exposeHeaders: [REQUEST_ID_HEADER],
    maxAge: 600,
  })(c, next);
});
