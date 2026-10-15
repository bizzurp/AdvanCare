import { and, eq, gt, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import * as v from 'valibot';
import { audit } from '../../audit';
import { staffCredentials, staffInvitations, staffMunicipalityAssignments, staffSessions, users } from '../../db/schema';
import type { AppEnv } from '../../env';
import { ApiError } from '../../lib/errors';
import { validate } from '../../lib/validation';
import { issueChallenge, readChallenge } from '../../staff/challenge';
import { decryptString, encryptString, sha256Hex } from '../../staff/crypto';
import { consumeSecondFactor, isLocked, limitSignIn, recordFailure, replaceRecoveryCodes, SIGN_IN_FAILED, staffKeys } from '../../staff/factors';
import { burnPasswordCheck, hashPassword, PASSWORD_MAX_LENGTH, passwordProblem, verifyPassword } from '../../staff/password';
import { staffProfile } from '../../staff/profile';
import { clearSessionCookie, revokeUserSessions, sessionCookieName, startSession } from '../../staff/sessions';
import { generateTotpSecret, otpauthUri } from '../../staff/totp';

const Email = v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email('Enter a valid email address.'), v.maxLength(255));
const Password = v.pipe(v.string(), v.minLength(1, 'Enter your password.'), v.maxLength(PASSWORD_MAX_LENGTH));
const Challenge = v.pipe(v.string(), v.minLength(10), v.maxLength(1024));
const Code = v.pipe(v.string(), v.trim(), v.minLength(6), v.maxLength(12));
const InviteToken = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{40,64}$/, 'This invite link is not valid.'));

export const adminAuth = new Hono<AppEnv>();

async function credentialsFor(db: AppEnv['Variables']['db'], userId: string) {
  const [creds] = await db.select().from(staffCredentials).where(eq(staffCredentials.userId, userId)).limit(1);
  return creds ?? null;
}

/** Step 1: email + password → a challenge for the 2FA step (or for 2FA enrollment). */
adminAuth.post('/auth/login', validate('json', v.strictObject({ email: Email, password: Password })), async (c) => {
  const { email, password } = c.req.valid('json');
  await limitSignIn(c, email);
  const db = c.get('db');
  const [creds] = await db.select().from(staffCredentials).where(eq(staffCredentials.email, email)).limit(1);
  if (!creds?.passwordHash) {
    await burnPasswordCheck(password);
    await audit(c, db, { action: 'auth.login_failed', actorUserId: creds?.userId ?? null, metadata: { reason: creds ? 'invite_not_accepted' : 'unknown_account' } });
    throw new ApiError(401, 'SIGN_IN_FAILED', SIGN_IN_FAILED);
  }
  const passwordOk = await verifyPassword(password, creds.passwordHash);
  if (isLocked(creds) || creds.status === 'SUSPENDED') {
    await audit(c, db, { action: 'auth.login_failed', actorUserId: creds.userId, entityType: 'staff', entityId: creds.userId, metadata: { reason: isLocked(creds) ? 'locked' : 'suspended' } });
    throw new ApiError(401, 'SIGN_IN_FAILED', SIGN_IN_FAILED);
  }
  if (!passwordOk) {
    await recordFailure(c, db, creds, 'auth.login_failed');
    throw new ApiError(401, 'SIGN_IN_FAILED', SIGN_IN_FAILED);
  }
  const keys = await staffKeys(c);
  if (!creds.mfaEnabled) return c.json({ next: 'enroll', challenge: await issueChallenge(keys, creds.userId, 'enroll') });
  return c.json({ next: 'mfa', challenge: await issueChallenge(keys, creds.userId, 'mfa') });
});

/** Step 2: authenticator code or recovery code → session cookie. */
adminAuth.post('/auth/mfa', validate('json', v.strictObject({ challenge: Challenge, code: Code })), async (c) => {
  const { challenge, code } = c.req.valid('json');
  await limitSignIn(c);
  const db = c.get('db');
  const keys = await staffKeys(c);
  const userId = await readChallenge(keys, challenge, 'mfa');
  if (!userId) throw new ApiError(401, 'CHALLENGE_EXPIRED', 'Your sign-in expired. Please start again.');
  const creds = await credentialsFor(db, userId);
  if (!creds || !creds.mfaEnabled || creds.status !== 'ACTIVE' || isLocked(creds)) {
    if (creds) await audit(c, db, { action: 'auth.login_failed', actorUserId: creds.userId, entityType: 'staff', entityId: creds.userId, metadata: { reason: isLocked(creds) ? 'locked' : 'not_active', step: 'mfa' } });
    throw new ApiError(401, 'SIGN_IN_FAILED', SIGN_IN_FAILED);
  }
  const factor = await consumeSecondFactor(db, keys, creds, code);
  if (!factor) {
    await recordFailure(c, db, creds, 'auth.mfa_failed');
    throw new ApiError(401, 'SIGN_IN_FAILED', SIGN_IN_FAILED);
  }
  await db.transaction(async (tx) => {
    await tx.update(staffCredentials).set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(staffCredentials.userId, userId));
    await startSession(c, tx, userId);
    await audit(c, tx, { action: 'auth.login', actorUserId: userId, entityType: 'staff', entityId: userId, metadata: { method: factor.method } });
    if (factor.method === 'recovery') await audit(c, tx, { action: 'auth.recovery_code_used', actorUserId: userId, entityType: 'staff', entityId: userId });
  });
  return c.json({ me: await staffProfile(db, userId) });
});

/** Enrollment, part 1: create (or replace) the not-yet-confirmed authenticator secret. */
adminAuth.post('/auth/mfa/setup', validate('json', v.strictObject({ challenge: Challenge })), async (c) => {
  const { challenge } = c.req.valid('json');
  const db = c.get('db');
  const keys = await staffKeys(c);
  const userId = await readChallenge(keys, challenge, 'enroll');
  const creds = userId ? await credentialsFor(db, userId) : null;
  if (!creds) throw new ApiError(401, 'CHALLENGE_EXPIRED', 'Your sign-in expired. Please start again.');
  if (creds.mfaEnabled) throw new ApiError(409, 'MFA_ALREADY_ENABLED', 'Two-step verification is already set up. Sign in instead.');
  if (creds.status === 'SUSPENDED') throw new ApiError(401, 'SIGN_IN_FAILED', SIGN_IN_FAILED);
  // Reuse a pending (unconfirmed) secret, so a repeated call (reload, double render) can't
  // leave the phone and the server with different secrets. Accepting an invite or a 2FA
  // reset clears it, so each enrollment still starts from a fresh secret.
  if (creds.totpSecretEnc) {
    const pending = await decryptString(keys.cipher, creds.totpSecretEnc);
    return c.json({ secret: pending, otpauthUri: otpauthUri(pending, creds.email) });
  }
  const secret = generateTotpSecret();
  await db.update(staffCredentials).set({ totpSecretEnc: await encryptString(keys.cipher, secret), lastTotpStep: null }).where(eq(staffCredentials.userId, creds.userId));
  return c.json({ secret, otpauthUri: otpauthUri(secret, creds.email) });
});

/** Enrollment, part 2: confirm the first code → 2FA on, account ACTIVE, recovery codes, session. */
adminAuth.post('/auth/mfa/enroll', validate('json', v.strictObject({ challenge: Challenge, code: Code })), async (c) => {
  const { challenge, code } = c.req.valid('json');
  await limitSignIn(c);
  const db = c.get('db');
  const keys = await staffKeys(c);
  const userId = await readChallenge(keys, challenge, 'enroll');
  const creds = userId ? await credentialsFor(db, userId) : null;
  if (!creds) throw new ApiError(401, 'CHALLENGE_EXPIRED', 'Your sign-in expired. Please start again.');
  if (creds.mfaEnabled) throw new ApiError(409, 'MFA_ALREADY_ENABLED', 'Two-step verification is already set up. Sign in instead.');
  if (creds.status === 'SUSPENDED' || isLocked(creds) || !creds.passwordHash) throw new ApiError(401, 'SIGN_IN_FAILED', SIGN_IN_FAILED);
  if (!creds.totpSecretEnc) throw new ApiError(409, 'MFA_SETUP_REQUIRED', 'Scan the QR code first.');
  const factor = await consumeSecondFactor(db, keys, creds, code, { allowRecovery: false });
  if (!factor) {
    await recordFailure(c, db, creds, 'auth.mfa_failed');
    throw new ApiError(422, 'MFA_CODE_INVALID', 'That code didn’t match. Check the time on your phone and enter the newest code.');
  }
  const recoveryCodes = await db.transaction(async (tx) => {
    await tx
      .update(staffCredentials)
      .set({ mfaEnabled: true, status: 'ACTIVE', failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
      .where(eq(staffCredentials.userId, creds.userId));
    const codes = await replaceRecoveryCodes(tx, creds.userId);
    await startSession(c, tx, creds.userId);
    await audit(c, tx, { action: 'auth.mfa_enrolled', actorUserId: creds.userId, entityType: 'staff', entityId: creds.userId, metadata: { firstActivation: creds.status === 'INVITED' } });
    await audit(c, tx, { action: 'auth.login', actorUserId: creds.userId, entityType: 'staff', entityId: creds.userId, metadata: { method: 'enrollment' } });
    return codes;
  });
  return c.json({ recoveryCodes, me: await staffProfile(db, creds.userId) });
});

async function findOpenInvitation(db: AppEnv['Variables']['db'], token: string) {
  const [invite] = await db
    .select({
      id: staffInvitations.id,
      userId: staffInvitations.userId,
      email: staffInvitations.email,
      role: staffInvitations.role,
      municipalities: staffInvitations.municipalities,
      invitedByUserId: staffInvitations.invitedByUserId,
      approvedByUserId: staffInvitations.approvedByUserId,
      expiresAt: staffInvitations.expiresAt,
      fullName: users.fullName,
    })
    .from(staffInvitations)
    .innerJoin(users, eq(users.id, staffInvitations.userId))
    .where(
      and(
        eq(staffInvitations.tokenHash, await sha256Hex(token)),
        isNull(staffInvitations.acceptedAt),
        isNull(staffInvitations.revokedAt),
        gt(staffInvitations.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!invite) throw new ApiError(404, 'INVITE_INVALID', 'This invite link has expired or was already used. Ask a Super Admin for a new one.');
  return invite;
}

/** A Super Admin invite sent from the console needs a second Super Admin's approval; the CLI bootstrap invite doesn't. */
const awaitingApproval = (invite: { role: string; invitedByUserId: string | null; approvedByUserId: string | null }) =>
  invite.role === 'SUPER_ADMIN' && invite.invitedByUserId !== null && invite.approvedByUserId === null;

/** Lets the accept-invite page show who the invite is for before a password is chosen. */
adminAuth.post('/auth/invitation', validate('json', v.strictObject({ token: InviteToken })), async (c) => {
  await limitSignIn(c);
  const invite = await findOpenInvitation(c.get('db'), c.req.valid('json').token);
  let invitedBy: string | null = null;
  if (invite.invitedByUserId) {
    const [inviter] = await c.get('db').select({ fullName: users.fullName }).from(users).where(eq(users.id, invite.invitedByUserId)).limit(1);
    invitedBy = inviter?.fullName ?? null;
  }
  return c.json({
    email: invite.email,
    fullName: invite.fullName,
    role: invite.role,
    municipalities: invite.municipalities,
    invitedBy,
    expiresAt: invite.expiresAt,
    awaitingApproval: awaitingApproval(invite),
  });
});

adminAuth.post(
  '/auth/accept-invite',
  validate('json', v.strictObject({ token: InviteToken, password: v.pipe(v.string(), v.maxLength(PASSWORD_MAX_LENGTH)), fullName: v.pipe(v.string(), v.trim(), v.minLength(2, 'Enter your full name.'), v.maxLength(255)) })),
  async (c) => {
    const { token, password, fullName } = c.req.valid('json');
    await limitSignIn(c);
    const db = c.get('db');
    const invite = await findOpenInvitation(db, token);
    if (awaitingApproval(invite)) throw new ApiError(409, 'INVITE_AWAITING_APPROVAL', 'A second Super Admin must approve this invite before it can be used.');
    const problem = passwordProblem(password, invite.email);
    if (problem) throw new ApiError(422, 'VALIDATION_FAILED', problem, { nested: { password: [problem] } });
    const passwordHash = await hashPassword(password);
    await db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(staffInvitations)
        .set({ acceptedAt: new Date() })
        .where(and(eq(staffInvitations.id, invite.id), isNull(staffInvitations.acceptedAt)))
        .returning({ id: staffInvitations.id });
      if (!claimed) throw new ApiError(404, 'INVITE_INVALID', 'This invite link was already used.');
      await tx.update(users).set({ fullName }).where(eq(users.id, invite.userId));
      // Fresh credentials: any earlier 2FA from a previous invite is discarded.
      await tx
        .update(staffCredentials)
        .set({ passwordHash, totpSecretEnc: null, mfaEnabled: false, lastTotpStep: null, failedAttempts: 0, lockedUntil: null })
        .where(eq(staffCredentials.userId, invite.userId));
      if (invite.role === 'ADMIN') {
        await tx
          .update(staffMunicipalityAssignments)
          .set({ revokedAt: new Date() })
          .where(and(eq(staffMunicipalityAssignments.userId, invite.userId), isNull(staffMunicipalityAssignments.revokedAt)));
        if (invite.municipalities.length) {
          await tx.insert(staffMunicipalityAssignments).values(invite.municipalities.map((municipality) => ({ userId: invite.userId, municipality, assignedByUserId: invite.invitedByUserId })));
        }
      }
      await revokeUserSessions(tx, invite.userId);
      await audit(c, tx, { action: 'invite.accepted', actorUserId: invite.userId, entityType: 'staff', entityId: invite.userId, metadata: { invitationId: invite.id, role: invite.role } });
    });
    return c.json({ next: 'enroll', challenge: await issueChallenge(await staffKeys(c), invite.userId, 'enroll') });
  },
);

adminAuth.post('/auth/logout', async (c) => {
  const db = c.get('db');
  const token = getCookie(c, sessionCookieName(c.env));
  if (token) {
    const [ended] = await db
      .update(staffSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(staffSessions.tokenHash, await sha256Hex(token)), isNull(staffSessions.revokedAt)))
      .returning({ userId: staffSessions.userId });
    if (ended) await audit(c, db, { action: 'auth.logout', actorUserId: ended.userId, entityType: 'staff', entityId: ended.userId });
  }
  clearSessionCookie(c);
  return c.body(null, 204);
});
