import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import * as v from 'valibot';
import { audit } from '../../audit';
import { staffCredentials, staffRecoveryCodes, staffSessions } from '../../db/schema';
import type { AppEnv } from '../../env';
import { ApiError } from '../../lib/errors';
import { validate } from '../../lib/validation';
import { consumeSecondFactor, recordFailure, replaceRecoveryCodes, staffKeys } from '../../staff/factors';
import { hashPassword, PASSWORD_MAX_LENGTH, passwordProblem, verifyPassword } from '../../staff/password';
import { staffProfile } from '../../staff/profile';
import { clearSessionCookie, revokeUserSessions } from '../../staff/sessions';

const Code = v.pipe(v.string(), v.trim(), v.regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app.'));

/** The signed-in staff member's own account ("My account"). Mounted behind requireStaff(). */
export const adminMe = new Hono<AppEnv>();

adminMe.get('/me', async (c) => {
  const me = await staffProfile(c.get('db'), c.get('staff').userId);
  if (!me) throw new ApiError(401, 'UNAUTHENTICATED', 'Your session has ended. Please sign in again.');
  return c.json({ me });
});

async function ownCredentials(c: Context<AppEnv>) {
  const [creds] = await c.get('db').select().from(staffCredentials).where(eq(staffCredentials.userId, c.get('staff').userId)).limit(1);
  if (!creds) throw new ApiError(401, 'UNAUTHENTICATED', 'Your session has ended. Please sign in again.');
  return creds;
}

/** Changing the password signs out every other session. */
adminMe.post(
  '/me/password',
  validate('json', v.strictObject({ currentPassword: v.pipe(v.string(), v.maxLength(PASSWORD_MAX_LENGTH)), newPassword: v.pipe(v.string(), v.maxLength(PASSWORD_MAX_LENGTH)) })),
  async (c) => {
    const { currentPassword, newPassword } = c.req.valid('json');
    const db = c.get('db');
    const staff = c.get('staff');
    const creds = await ownCredentials(c);
    if (!creds.passwordHash || !(await verifyPassword(currentPassword, creds.passwordHash))) {
      await recordFailure(c, db, creds, 'me.password_change_failed');
      throw new ApiError(422, 'VALIDATION_FAILED', 'Your current password is incorrect.', { nested: { currentPassword: ['Your current password is incorrect.'] } });
    }
    const problem = passwordProblem(newPassword, creds.email);
    if (problem) throw new ApiError(422, 'VALIDATION_FAILED', problem, { nested: { newPassword: [problem] } });
    const passwordHash = await hashPassword(newPassword);
    const ended = await db.transaction(async (tx) => {
      await tx.update(staffCredentials).set({ passwordHash, failedAttempts: 0 }).where(eq(staffCredentials.userId, staff.userId));
      const count = await revokeUserSessions(tx, staff.userId, staff.sessionId);
      await audit(c, tx, { action: 'me.password_changed', entityType: 'staff', entityId: staff.userId, metadata: { otherSessionsEnded: count } });
      return count;
    });
    return c.json({ otherSessionsEnded: ended });
  },
);

adminMe.get('/me/sessions', async (c) => {
  const staff = c.get('staff');
  const rows = await c
    .get('db')
    .select({ id: staffSessions.id, createdAt: staffSessions.createdAt, lastSeenAt: staffSessions.lastSeenAt, expiresAt: staffSessions.expiresAt, ip: staffSessions.ip, userAgent: staffSessions.userAgent })
    .from(staffSessions)
    .where(and(eq(staffSessions.userId, staff.userId), isNull(staffSessions.revokedAt), gt(staffSessions.expiresAt, new Date())))
    .orderBy(desc(staffSessions.lastSeenAt));
  return c.json({ sessions: rows.map((s) => ({ ...s, current: s.id === staff.sessionId })) });
});

adminMe.post('/me/sessions/:id/revoke', validate('param', v.object({ id: v.pipe(v.string(), v.uuid()) })), async (c) => {
  const staff = c.get('staff');
  const db = c.get('db');
  const { id } = c.req.valid('param');
  const [ended] = await db
    .update(staffSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(staffSessions.id, id), eq(staffSessions.userId, staff.userId), isNull(staffSessions.revokedAt)))
    .returning({ id: staffSessions.id });
  if (!ended) throw new ApiError(404, 'NOT_FOUND', 'That session has already ended.');
  await audit(c, db, { action: 'me.session_revoked', entityType: 'staff_session', entityId: id });
  if (id === staff.sessionId) clearSessionCookie(c);
  return c.body(null, 204);
});

adminMe.post('/me/sessions/revoke-others', async (c) => {
  const staff = c.get('staff');
  const db = c.get('db');
  const count = await revokeUserSessions(db, staff.userId, staff.sessionId);
  await audit(c, db, { action: 'me.sessions_revoked', entityType: 'staff', entityId: staff.userId, metadata: { count } });
  return c.json({ ended: count });
});

/** New recovery codes (the old ones stop working). Needs a current authenticator code. */
adminMe.post('/me/recovery-codes', validate('json', v.strictObject({ code: Code })), async (c) => {
  const db = c.get('db');
  const creds = await ownCredentials(c);
  if (!(await consumeSecondFactor(db, await staffKeys(c), creds, c.req.valid('json').code, { allowRecovery: false }))) {
    await recordFailure(c, db, creds, 'auth.mfa_failed');
    throw new ApiError(422, 'MFA_CODE_INVALID', 'That code didn’t match. Enter the newest code from your app.');
  }
  const recoveryCodes = await db.transaction(async (tx) => {
    const codes = await replaceRecoveryCodes(tx, creds.userId);
    await audit(c, tx, { action: 'me.recovery_codes_regenerated', entityType: 'staff', entityId: creds.userId });
    return codes;
  });
  return c.json({ recoveryCodes });
});

/**
 * Re-enroll 2FA (e.g. a new phone): turns 2FA off and signs out everywhere. The next
 * sign-in with the password goes straight to enrollment.
 */
adminMe.post('/me/mfa/reset', validate('json', v.strictObject({ code: Code })), async (c) => {
  const db = c.get('db');
  const creds = await ownCredentials(c);
  if (!(await consumeSecondFactor(db, await staffKeys(c), creds, c.req.valid('json').code, { allowRecovery: false }))) {
    await recordFailure(c, db, creds, 'auth.mfa_failed');
    throw new ApiError(422, 'MFA_CODE_INVALID', 'That code didn’t match. Enter the newest code from your app.');
  }
  await db.transaction(async (tx) => {
    await tx.update(staffCredentials).set({ mfaEnabled: false, totpSecretEnc: null, lastTotpStep: null }).where(eq(staffCredentials.userId, creds.userId));
    await tx.delete(staffRecoveryCodes).where(eq(staffRecoveryCodes.userId, creds.userId));
    await revokeUserSessions(tx, creds.userId);
    await audit(c, tx, { action: 'me.mfa_reset', entityType: 'staff', entityId: creds.userId });
  });
  clearSessionCookie(c);
  return c.body(null, 204);
});
