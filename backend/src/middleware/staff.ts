import { createMiddleware } from 'hono/factory';
import { connectDb } from '../db/client';
import type { AppEnv, Bindings } from '../env';
import { ApiError } from '../lib/errors';
import { loadStaffSession, type StaffRole } from '../staff/sessions';

export const STAFF_HEADER = 'X-AdvanCare-Staff';
const LOCAL_DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function adminOrigins(env: Pick<Bindings, 'ADMIN_ORIGINS'>): string[] {
  return (env.ADMIN_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function isAdminOrigin(env: Pick<Bindings, 'ADMIN_ORIGINS' | 'ENVIRONMENT'>, origin: string | undefined): boolean {
  if (!origin) return false;
  return adminOrigins(env).includes(origin) || (env.ENVIRONMENT === 'development' && LOCAL_DEV_ORIGIN.test(origin));
}

/**
 * CSRF defence for cookie-authenticated admin writes, on top of SameSite=Strict:
 * the request must come from an admin origin and carry `X-AdvanCare-Staff: 1`
 * (a custom header forces a CORS preflight, which other origins fail).
 */
export const staffCsrf = createMiddleware<AppEnv>(async (c, next) => {
  if (!SAFE_METHODS.has(c.req.method)) {
    if (c.req.header(STAFF_HEADER) !== '1' || !isAdminOrigin(c.env, c.req.header('Origin'))) {
      throw new ApiError(403, 'CSRF_REJECTED', 'This request was blocked. Reload the admin console and try again.');
    }
  }
  await next();
});

/** Opens one database client for the request and closes it afterwards. */
export const withDb = createMiddleware<AppEnv>(async (c, next) => {
  const client = await connectDb(c.env);
  if (!client) throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'The service is temporarily unavailable.');
  c.set('db', client.db);
  try {
    await next();
  } finally {
    await client.close();
  }
});

/**
 * Requires a signed-in staff member (and, if given, one of the roles). Runs after `withDb`.
 * Suspension, a 2FA reset or a revoked session take effect on the very next request.
 */
export const requireStaff = (...roles: StaffRole[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const staff = await loadStaffSession(c, c.get('db'));
    if (!staff) throw new ApiError(401, 'UNAUTHENTICATED', 'Your session has ended. Please sign in again.');
    if (roles.length > 0 && !roles.includes(staff.role)) {
      throw new ApiError(403, 'FORBIDDEN', 'You don’t have access to this page.');
    }
    c.set('staff', staff);
    await next();
  });
