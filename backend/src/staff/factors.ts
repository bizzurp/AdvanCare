import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Context } from 'hono';
import type { Executor } from '../db/client';
import { staffCredentials, staffRecoveryCodes } from '../db/schema';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { audit } from '../audit';
import { decryptString, deriveStaffKeys, sha256Hex, type StaffKeys } from './crypto';
import { generateRecoveryCodes, normalizeRecoveryCode } from './recovery';
import { verifyTotp } from './totp';

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

/** One message for every sign-in failure, so it never reveals which part was wrong. */
export const SIGN_IN_FAILED = 'Sign-in failed. Check your details and try again. After 5 failed attempts the account is locked for 15 minutes.';

export async function staffKeys(c: Context<AppEnv>): Promise<StaffKeys> {
  try {
    return await deriveStaffKeys(c.env.STAFF_ENCRYPTION_KEY);
  } catch (err) {
    console.error(JSON.stringify({ requestId: c.get('requestId'), level: 'error', message: (err as Error).message }));
    throw new ApiError(503, 'STAFF_AUTH_UNCONFIGURED', 'Staff sign-in is not configured on this server.');
  }
}

export type Credentials = typeof staffCredentials.$inferSelect;

export function isLocked(creds: Pick<Credentials, 'lockedUntil'>, nowMs = Date.now()): boolean {
  return creds.lockedUntil !== null && creds.lockedUntil.getTime() > nowMs;
}

/** Counts a wrong password or 2FA code; the 5th in a row locks the account for 15 minutes. */
export async function recordFailure(c: Context<AppEnv>, db: Executor, creds: Credentials, action: string): Promise<void> {
  const attempts = creds.failedAttempts + 1;
  const locks = attempts >= MAX_FAILED_ATTEMPTS;
  await db
    .update(staffCredentials)
    .set(locks ? { failedAttempts: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MS) } : { failedAttempts: attempts })
    .where(eq(staffCredentials.userId, creds.userId));
  await audit(c, db, { action, actorUserId: creds.userId, entityType: 'staff', entityId: creds.userId, metadata: { attempt: attempts } });
  if (locks) await audit(c, db, { action: 'auth.locked', actorUserId: creds.userId, entityType: 'staff', entityId: creds.userId, metadata: { minutes: LOCKOUT_MS / 60000 } });
}

export type SecondFactor = { method: 'totp'; step: number } | { method: 'recovery'; codeId: string };

/**
 * Checks a 6-digit authenticator code or a one-time recovery code. On success the code is
 * consumed (TOTP step recorded / recovery code marked used) and the method is returned.
 */
export async function consumeSecondFactor(db: Executor, keys: StaffKeys, creds: Credentials, input: string, { allowRecovery = true } = {}): Promise<SecondFactor | null> {
  const code = input.trim().replace(/\s/g, '');
  if (/^\d{6}$/.test(code)) {
    if (!creds.totpSecretEnc) return null;
    const secret = await decryptString(keys.cipher, creds.totpSecretEnc);
    const step = await verifyTotp(secret, code, { lastUsedStep: creds.lastTotpStep });
    if (step === null) return null;
    // Conditional update: two parallel requests with the same code can't both succeed.
    const updated = await db
      .update(staffCredentials)
      .set({ lastTotpStep: step })
      .where(and(eq(staffCredentials.userId, creds.userId), sql`coalesce(${staffCredentials.lastTotpStep}, -1) < ${step}`))
      .returning({ userId: staffCredentials.userId });
    return updated.length ? { method: 'totp', step } : null;
  }
  if (!allowRecovery) return null;
  const recovery = normalizeRecoveryCode(code);
  if (!recovery) return null;
  const [used] = await db
    .update(staffRecoveryCodes)
    .set({ usedAt: new Date() })
    .where(and(eq(staffRecoveryCodes.userId, creds.userId), eq(staffRecoveryCodes.codeHash, await sha256Hex(recovery)), isNull(staffRecoveryCodes.usedAt)))
    .returning({ id: staffRecoveryCodes.id });
  return used ? { method: 'recovery', codeId: used.id } : null;
}

/** Replaces all recovery codes; returns the new plaintext codes (shown once). */
export async function replaceRecoveryCodes(db: Executor, userId: string): Promise<string[]> {
  const codes = generateRecoveryCodes();
  await db.delete(staffRecoveryCodes).where(eq(staffRecoveryCodes.userId, userId));
  await db.insert(staffRecoveryCodes).values(await Promise.all(codes.map(async (code) => ({ userId, codeHash: await sha256Hex(code) }))));
  return codes;
}

/**
 * Rate limit by IP (generous: staff may share an office or venue network) and, when known,
 * strictly by email. Missing binding (tests) = no limit.
 */
export async function limitSignIn(c: Context<AppEnv>, email?: string): Promise<void> {
  const checks: [RateLimit | undefined, string][] = [[c.env.ADMIN_LOGIN_IP_LIMITER, `ip:${c.req.header('CF-Connecting-IP') ?? 'local'}`]];
  if (email) checks.push([c.env.ADMIN_LOGIN_LIMITER, `email:${email}`]);
  for (const [limiter, key] of checks) {
    if (!limiter) continue;
    const { success } = await limiter.limit({ key: `admin-login:${key}` });
    if (!success) throw new ApiError(429, 'RATE_LIMITED', 'Too many attempts. Please wait a minute and try again.');
  }
}
