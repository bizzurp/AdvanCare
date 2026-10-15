import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Database, Executor } from '../db/client';
import { staffCredentials, staffMunicipalityAssignments, staffSessions, users } from '../db/schema';
import type { AppEnv, Bindings } from '../env';
import { randomToken, sha256Hex } from './crypto';

export const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 30 * 60 * 1000;
/** last_seen_at is written at most once a minute per session. */
const TOUCH_INTERVAL_MS = 60 * 1000;

export type StaffRole = 'ADMIN' | 'SUPER_ADMIN';

export interface StaffContext {
  userId: string;
  sessionId: string;
  role: StaffRole;
  email: string;
  fullName: string | null;
  /** 'ALL' for Super Admins; otherwise the active municipality assignments. */
  municipalities: string[] | 'ALL';
}

/**
 * `__Host-` + Secure everywhere except local development, where the admin app runs on
 * http://localhost (Safari refuses Secure cookies there).
 */
export function sessionCookieName(env: Pick<Bindings, 'ENVIRONMENT'>): string {
  return env.ENVIRONMENT === 'development' ? 'adv_staff' : '__Host-adv_staff';
}

export function sessionCookieOptions(env: Pick<Bindings, 'ENVIRONMENT'>) {
  return {
    path: '/',
    httpOnly: true,
    secure: env.ENVIRONMENT !== 'development',
    sameSite: 'Strict' as const,
    maxAge: SESSION_ABSOLUTE_MS / 1000,
  };
}

export function clientIp(c: Context<AppEnv>): string | null {
  return c.req.header('CF-Connecting-IP') ?? null;
}

export async function startSession(c: Context<AppEnv>, db: Executor, userId: string): Promise<void> {
  const token = randomToken();
  await db.insert(staffSessions).values({
    userId,
    tokenHash: await sha256Hex(token),
    expiresAt: new Date(Date.now() + SESSION_ABSOLUTE_MS),
    ip: clientIp(c),
    userAgent: c.req.header('User-Agent')?.slice(0, 255) ?? null,
  });
  setCookie(c, sessionCookieName(c.env), token, sessionCookieOptions(c.env));
}

export function clearSessionCookie(c: Context<AppEnv>): void {
  deleteCookie(c, sessionCookieName(c.env), { path: '/', secure: c.env.ENVIRONMENT !== 'development' });
}

/**
 * Resolves the cookie to a live session of an ACTIVE, 2FA-enrolled staff account, or null.
 * Expired (8 h absolute / 30 min idle) sessions are revoked on sight.
 */
export async function loadStaffSession(c: Context<AppEnv>, db: Database, nowMs = Date.now()): Promise<StaffContext | null> {
  const token = getCookie(c, sessionCookieName(c.env));
  if (!token || token.length > 128) return null;
  const now = new Date(nowMs);
  const [row] = await db
    .select({
      sessionId: staffSessions.id,
      lastSeenAt: staffSessions.lastSeenAt,
      userId: users.id,
      role: users.role,
      fullName: users.fullName,
      email: staffCredentials.email,
      status: staffCredentials.status,
      mfaEnabled: staffCredentials.mfaEnabled,
    })
    .from(staffSessions)
    .innerJoin(users, eq(users.id, staffSessions.userId))
    .innerJoin(staffCredentials, eq(staffCredentials.userId, staffSessions.userId))
    .where(and(eq(staffSessions.tokenHash, await sha256Hex(token)), isNull(staffSessions.revokedAt), gt(staffSessions.expiresAt, now)))
    .limit(1);
  if (!row) return null;

  if (nowMs - row.lastSeenAt.getTime() > SESSION_IDLE_MS) {
    await db.update(staffSessions).set({ revokedAt: now }).where(eq(staffSessions.id, row.sessionId));
    return null;
  }
  if (row.status !== 'ACTIVE' || !row.mfaEnabled || (row.role !== 'ADMIN' && row.role !== 'SUPER_ADMIN')) return null;

  if (nowMs - row.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.update(staffSessions).set({ lastSeenAt: now }).where(eq(staffSessions.id, row.sessionId));
  }

  return {
    userId: row.userId,
    sessionId: row.sessionId,
    role: row.role,
    email: row.email,
    fullName: row.fullName,
    municipalities: row.role === 'SUPER_ADMIN' ? 'ALL' : await activeMunicipalities(db, row.userId),
  };
}

export async function activeMunicipalities(db: Executor, userId: string): Promise<string[]> {
  const rows = await db
    .select({ municipality: staffMunicipalityAssignments.municipality })
    .from(staffMunicipalityAssignments)
    .where(and(eq(staffMunicipalityAssignments.userId, userId), isNull(staffMunicipalityAssignments.revokedAt)))
    .orderBy(staffMunicipalityAssignments.municipality);
  return rows.map((r) => r.municipality);
}

/** Revokes every open session of a user (optionally keeping one). Returns how many were ended. */
export async function revokeUserSessions(db: Executor, userId: string, keepSessionId?: string): Promise<number> {
  const ended = await db
    .update(staffSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(staffSessions.userId, userId),
        isNull(staffSessions.revokedAt),
        keepSessionId ? sql`${staffSessions.id} <> ${keepSessionId}` : undefined,
      ),
    )
    .returning({ id: staffSessions.id });
  return ended.length;
}
