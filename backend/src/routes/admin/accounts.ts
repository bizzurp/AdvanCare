import { and, desc, eq, gt, inArray, isNull, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Hono, type Context } from 'hono';
import * as v from 'valibot';
import { audit } from '../../audit';
import type { Executor } from '../../db/client';
import { staffCredentials, staffInvitations, staffMunicipalityAssignments, staffRecoveryCodes, staffSessions, users } from '../../db/schema';
import type { AppEnv } from '../../env';
import { ApiError } from '../../lib/errors';
import { validate } from '../../lib/validation';
import { randomToken, sha256Hex } from '../../staff/crypto';
import { CAGAYAN_MUNICIPALITIES } from '../../staff/municipalities';
import { approvalProblem, reactivateProblem, scopeProblem, selfChangeProblem, suspendProblem, type TargetAccount } from '../../staff/rules';
import { revokeUserSessions, type StaffRole } from '../../staff/sessions';

export const INVITE_TTL_MS = 72 * 60 * 60 * 1000;

const IdParam = v.object({ id: v.pipe(v.string(), v.uuid()) });
const Municipalities = v.pipe(v.array(v.pipe(v.string(), v.trim(), v.maxLength(100))), v.maxLength(CAGAYAN_MUNICIPALITIES.length));

/** Any signed-in staff member: the municipality list for forms and filters. */
export const adminReference = new Hono<AppEnv>();
adminReference.get('/municipalities', (c) => c.json({ municipalities: CAGAYAN_MUNICIPALITIES }));

/** Super Admin only: invite, scope, suspend and reset staff accounts. */
export const adminAccounts = new Hono<AppEnv>();

const inviter = alias(users, 'inviter');

async function listAccounts(db: Executor, ids?: string[]) {
  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      role: users.role,
      email: staffCredentials.email,
      status: staffCredentials.status,
      mfaEnabled: staffCredentials.mfaEnabled,
      hasPassword: sql<boolean>`${staffCredentials.passwordHash} IS NOT NULL`,
      lockedUntil: staffCredentials.lockedUntil,
      lastLoginAt: staffCredentials.lastLoginAt,
      createdAt: staffCredentials.createdAt,
      createdBy: { id: inviter.id, fullName: inviter.fullName },
    })
    .from(users)
    .innerJoin(staffCredentials, eq(staffCredentials.userId, users.id))
    .leftJoin(inviter, eq(inviter.id, staffCredentials.createdByUserId))
    .where(ids ? inArray(users.id, ids) : undefined)
    .orderBy(users.fullName);
  if (!rows.length) return [];
  const userIds = rows.map((r) => r.id);
  const [assignments, invites, sessions] = await Promise.all([
    db
      .select({ userId: staffMunicipalityAssignments.userId, municipality: staffMunicipalityAssignments.municipality })
      .from(staffMunicipalityAssignments)
      .where(and(inArray(staffMunicipalityAssignments.userId, userIds), isNull(staffMunicipalityAssignments.revokedAt))),
    db
      .select({
        userId: staffInvitations.userId,
        id: staffInvitations.id,
        role: staffInvitations.role,
        municipalities: staffInvitations.municipalities,
        invitedByUserId: staffInvitations.invitedByUserId,
        approvedByUserId: staffInvitations.approvedByUserId,
        expiresAt: staffInvitations.expiresAt,
      })
      .from(staffInvitations)
      .where(and(inArray(staffInvitations.userId, userIds), isNull(staffInvitations.acceptedAt), isNull(staffInvitations.revokedAt)))
      .orderBy(desc(staffInvitations.createdAt)),
    db
      .select({ userId: staffSessions.userId, count: sql<number>`count(*)::int` })
      .from(staffSessions)
      .where(and(inArray(staffSessions.userId, userIds), isNull(staffSessions.revokedAt), gt(staffSessions.expiresAt, new Date())))
      .groupBy(staffSessions.userId),
  ]);
  const now = Date.now();
  return rows.map((r) => {
    const invite = invites.find((i) => i.userId === r.id);
    const active = assignments.filter((a) => a.userId === r.id).map((a) => a.municipality).sort();
    return {
      ...r,
      role: r.role as StaffRole,
      createdBy: r.createdBy?.id ? r.createdBy : null,
      locked: r.lockedUntil !== null && r.lockedUntil.getTime() > now,
      // Until the invite is accepted, the scope that will apply is the one on the invite.
      municipalities: r.role === 'SUPER_ADMIN' ? ('ALL' as const) : r.status === 'INVITED' && invite ? invite.municipalities : active,
      activeSessions: sessions.find((s) => s.userId === r.id)?.count ?? 0,
      pendingInvite: invite
        ? {
            id: invite.id,
            expiresAt: invite.expiresAt,
            expired: invite.expiresAt.getTime() <= now,
            awaitingApproval: invite.role === 'SUPER_ADMIN' && invite.invitedByUserId !== null && invite.approvedByUserId === null,
            invitedByUserId: invite.invitedByUserId,
          }
        : null,
    };
  });
}

async function loadTarget(db: Executor, id: string) {
  const [account] = await listAccounts(db, [id]);
  if (!account) throw new ApiError(404, 'NOT_FOUND', 'Account not found.');
  return account;
}

const asTarget = (a: Awaited<ReturnType<typeof loadTarget>>): TargetAccount => ({ id: a.id, role: a.role, status: a.status, hasPassword: a.hasPassword, mfaEnabled: a.mfaEnabled });

function refuse(problem: string | null, status: 403 | 409 | 422 = 409, code = 'NOT_ALLOWED') {
  if (problem) throw new ApiError(status, code, problem);
}

function inviteUrl(c: Context<AppEnv>, token: string): string {
  const base = (c.env.ADMIN_APP_URL || c.req.header('Origin') || '').replace(/\/$/, '');
  // The token travels in the fragment, so it never reaches server or proxy logs.
  return `${base}/accept-invite#token=${token}`;
}

async function issueInvite(tx: Executor, input: { userId: string; email: string; role: StaffRole; municipalities: string[]; invitedByUserId: string; approvedByUserId?: string | null }) {
  const token = randomToken();
  const [invite] = await tx
    .insert(staffInvitations)
    .values({ ...input, approvedByUserId: input.approvedByUserId ?? null, tokenHash: await sha256Hex(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS) })
    .returning({ id: staffInvitations.id, expiresAt: staffInvitations.expiresAt });
  return { token, invite: invite! };
}

adminAccounts.get('/accounts', async (c) => c.json({ accounts: await listAccounts(c.get('db')) }));

adminAccounts.get('/accounts/:id', validate('param', IdParam), async (c) => {
  const db = c.get('db');
  const account = await loadTarget(db, c.req.valid('param').id);
  const assigner = alias(users, 'assigner');
  const revoker = alias(users, 'revoker');
  const scopeHistory = await db
    .select({
      municipality: staffMunicipalityAssignments.municipality,
      assignedAt: staffMunicipalityAssignments.assignedAt,
      revokedAt: staffMunicipalityAssignments.revokedAt,
      assignedBy: { id: assigner.id, fullName: assigner.fullName },
      revokedBy: { id: revoker.id, fullName: revoker.fullName },
    })
    .from(staffMunicipalityAssignments)
    .leftJoin(assigner, eq(assigner.id, staffMunicipalityAssignments.assignedByUserId))
    .leftJoin(revoker, eq(revoker.id, staffMunicipalityAssignments.revokedByUserId))
    .where(eq(staffMunicipalityAssignments.userId, account.id))
    .orderBy(desc(staffMunicipalityAssignments.assignedAt));
  const invited = await db
    .select({ id: users.id, fullName: users.fullName, role: users.role })
    .from(staffCredentials)
    .innerJoin(users, eq(users.id, staffCredentials.userId))
    .where(eq(staffCredentials.createdByUserId, account.id))
    .orderBy(users.fullName);
  return c.json({
    account,
    scopeHistory: scopeHistory.map((h) => ({ ...h, assignedBy: h.assignedBy?.id ? h.assignedBy : null, revokedBy: h.revokedBy?.id ? h.revokedBy : null })),
    invitedAccounts: invited,
  });
});

adminAccounts.post(
  '/accounts/invite',
  validate(
    'json',
    v.strictObject({
      email: v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email('Enter a valid email address.'), v.maxLength(255)),
      fullName: v.pipe(v.string(), v.trim(), v.minLength(2, 'Enter their full name.'), v.maxLength(255)),
      role: v.picklist(['ADMIN', 'SUPER_ADMIN']),
      municipalities: Municipalities,
    }),
  ),
  async (c) => {
    const { email, fullName, role, municipalities } = c.req.valid('json');
    const scope = [...new Set(municipalities)].sort();
    refuse(scopeProblem(role, scope), 422, 'VALIDATION_FAILED');
    const db = c.get('db');
    const staff = c.get('staff');
    const [existing] = await db.select({ userId: staffCredentials.userId }).from(staffCredentials).where(eq(staffCredentials.email, email)).limit(1);
    if (existing) throw new ApiError(409, 'EMAIL_TAKEN', 'A staff account with this email already exists.');
    const { token, userId, expiresAt } = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ email, fullName, role, phoneNumber: null }).returning({ id: users.id });
      await tx.insert(staffCredentials).values({ userId: user!.id, email, status: 'INVITED', createdByUserId: staff.userId });
      const issued = await issueInvite(tx, { userId: user!.id, email, role, municipalities: scope, invitedByUserId: staff.userId });
      await audit(c, tx, { action: 'invite.created', entityType: 'staff', entityId: user!.id, metadata: { role, municipalities: scope, invitationId: issued.invite.id } });
      return { token: issued.token, userId: user!.id, expiresAt: issued.invite.expiresAt };
    });
    return c.json({ account: await loadTarget(db, userId), inviteUrl: inviteUrl(c, token), expiresAt, awaitingApproval: role === 'SUPER_ADMIN' }, 201);
  },
);

/** New link for someone who hasn't finished setting up (old links stop working). */
adminAccounts.post('/accounts/:id/invitation/renew', validate('param', IdParam), async (c) => {
  const db = c.get('db');
  const staff = c.get('staff');
  const account = await loadTarget(db, c.req.valid('param').id);
  refuse(account.status !== 'INVITED' ? 'Only people who haven’t finished setting up can get a new invite.' : null);
  const municipalities = account.municipalities === 'ALL' ? [] : account.municipalities;
  const { token, expiresAt } = await db.transaction(async (tx) => {
    const previous = await tx
      .update(staffInvitations)
      .set({ revokedAt: new Date() })
      .where(and(eq(staffInvitations.userId, account.id), isNull(staffInvitations.acceptedAt), isNull(staffInvitations.revokedAt)))
      .returning({ approvedByUserId: staffInvitations.approvedByUserId });
    // A renewal by someone other than the approver keeps an existing approval.
    const approvedBy = previous.find((p) => p.approvedByUserId && p.approvedByUserId !== staff.userId)?.approvedByUserId ?? null;
    const issued = await issueInvite(tx, { userId: account.id, email: account.email, role: account.role, municipalities, invitedByUserId: staff.userId, approvedByUserId: approvedBy });
    await audit(c, tx, { action: 'invite.renewed', entityType: 'staff', entityId: account.id, metadata: { invitationId: issued.invite.id } });
    return { token: issued.token, expiresAt: issued.invite.expiresAt };
  });
  return c.json({ account: await loadTarget(db, account.id), inviteUrl: inviteUrl(c, token), expiresAt });
});

adminAccounts.post('/accounts/:id/invitation/approve', validate('param', IdParam), async (c) => {
  const db = c.get('db');
  const staff = c.get('staff');
  const account = await loadTarget(db, c.req.valid('param').id);
  const [invite] = await db
    .select()
    .from(staffInvitations)
    .where(and(eq(staffInvitations.userId, account.id), isNull(staffInvitations.acceptedAt), isNull(staffInvitations.revokedAt)))
    .orderBy(desc(staffInvitations.createdAt))
    .limit(1);
  if (!invite) throw new ApiError(404, 'NOT_FOUND', 'There is no open invite for this account.');
  refuse(approvalProblem(staff.userId, { role: invite.role as StaffRole, invitedByUserId: invite.invitedByUserId, approvedByUserId: invite.approvedByUserId }));
  await db.transaction(async (tx) => {
    await tx.update(staffInvitations).set({ approvedByUserId: staff.userId }).where(eq(staffInvitations.id, invite.id));
    await audit(c, tx, { action: 'invite.approved', entityType: 'staff', entityId: account.id, metadata: { invitationId: invite.id, invitedByUserId: invite.invitedByUserId } });
  });
  return c.json({ account: await loadTarget(db, account.id) });
});

/** Cancels an invite that hasn't been used; the account is kept (suspended) for the record. */
adminAccounts.post('/accounts/:id/invitation/revoke', validate('param', IdParam), async (c) => {
  const db = c.get('db');
  const account = await loadTarget(db, c.req.valid('param').id);
  refuse(account.status !== 'INVITED' ? 'This invite was already used. Suspend the account instead.' : null);
  await db.transaction(async (tx) => {
    await tx
      .update(staffInvitations)
      .set({ revokedAt: new Date() })
      .where(and(eq(staffInvitations.userId, account.id), isNull(staffInvitations.acceptedAt), isNull(staffInvitations.revokedAt)));
    await tx.update(staffCredentials).set({ status: 'SUSPENDED' }).where(eq(staffCredentials.userId, account.id));
    await revokeUserSessions(tx, account.id);
    await audit(c, tx, { action: 'invite.revoked', entityType: 'staff', entityId: account.id });
  });
  return c.json({ account: await loadTarget(db, account.id) });
});

adminAccounts.patch(
  '/accounts/:id',
  validate('param', IdParam),
  validate('json', v.strictObject({ status: v.optional(v.picklist(['ACTIVE', 'SUSPENDED'])), municipalities: v.optional(Municipalities), reason: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(300))) })),
  async (c) => {
    const db = c.get('db');
    const staff = c.get('staff');
    const body = c.req.valid('json');
    const account = await loadTarget(db, c.req.valid('param').id);
    refuse(selfChangeProblem(staff.userId, account), 403, 'FORBIDDEN');

    let scopeChange: { added: string[]; removed: string[] } | null = null;
    if (body.municipalities) {
      const next = [...new Set(body.municipalities)].sort();
      refuse(scopeProblem(account.role, next), 422, 'VALIDATION_FAILED');
      const current = account.municipalities === 'ALL' ? [] : account.municipalities;
      scopeChange = { added: next.filter((m) => !current.includes(m)), removed: current.filter((m) => !next.includes(m)) };
    }
    if (body.status === 'SUSPENDED' && account.status !== 'SUSPENDED') {
      const [others] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(users)
        .innerJoin(staffCredentials, eq(staffCredentials.userId, users.id))
        .where(and(eq(users.role, 'SUPER_ADMIN'), eq(staffCredentials.status, 'ACTIVE'), ne(users.id, account.id)));
      refuse(suspendProblem(asTarget(account), others?.n ?? 0));
    }
    if (body.status === 'ACTIVE' && account.status !== 'ACTIVE') refuse(reactivateProblem(asTarget(account)));

    await db.transaction(async (tx) => {
      if (scopeChange && (scopeChange.added.length || scopeChange.removed.length)) {
        if (account.status === 'INVITED') {
          // Not accepted yet: the scope lives on the open invite.
          await tx
            .update(staffInvitations)
            .set({ municipalities: [...new Set(body.municipalities)].sort() })
            .where(and(eq(staffInvitations.userId, account.id), isNull(staffInvitations.acceptedAt), isNull(staffInvitations.revokedAt)));
        } else {
          if (scopeChange.removed.length) {
            await tx
              .update(staffMunicipalityAssignments)
              .set({ revokedAt: new Date(), revokedByUserId: staff.userId })
              .where(and(eq(staffMunicipalityAssignments.userId, account.id), inArray(staffMunicipalityAssignments.municipality, scopeChange.removed), isNull(staffMunicipalityAssignments.revokedAt)));
          }
          if (scopeChange.added.length) {
            await tx.insert(staffMunicipalityAssignments).values(scopeChange.added.map((municipality) => ({ userId: account.id, municipality, assignedByUserId: staff.userId })));
          }
        }
        await audit(c, tx, { action: 'account.scope_changed', entityType: 'staff', entityId: account.id, metadata: { ...scopeChange, reason: body.reason ?? null } });
      }
      if (body.status === 'SUSPENDED' && account.status !== 'SUSPENDED') {
        await tx.update(staffCredentials).set({ status: 'SUSPENDED' }).where(eq(staffCredentials.userId, account.id));
        await tx
          .update(staffInvitations)
          .set({ revokedAt: new Date() })
          .where(and(eq(staffInvitations.userId, account.id), isNull(staffInvitations.acceptedAt), isNull(staffInvitations.revokedAt)));
        const ended = await revokeUserSessions(tx, account.id);
        await audit(c, tx, { action: 'account.suspended', entityType: 'staff', entityId: account.id, metadata: { sessionsEnded: ended, reason: body.reason ?? null } });
      }
      if (body.status === 'ACTIVE' && account.status !== 'ACTIVE') {
        await tx.update(staffCredentials).set({ status: 'ACTIVE', failedAttempts: 0, lockedUntil: null }).where(eq(staffCredentials.userId, account.id));
        await audit(c, tx, { action: 'account.reactivated', entityType: 'staff', entityId: account.id, metadata: { reason: body.reason ?? null } });
      }
    });
    return c.json({ account: await loadTarget(db, account.id) });
  },
);

/** For a lost phone: 2FA off, recovery codes cleared, signed out. Their next sign-in enrolls again. */
adminAccounts.post('/accounts/:id/reset-mfa', validate('param', IdParam), async (c) => {
  const db = c.get('db');
  const staff = c.get('staff');
  const account = await loadTarget(db, c.req.valid('param').id);
  refuse(account.id === staff.userId ? 'Reset your own two-step verification from My account.' : null, 403, 'FORBIDDEN');
  refuse(!account.mfaEnabled ? 'Two-step verification isn’t set up for this account.' : null);
  await db.transaction(async (tx) => {
    await tx.update(staffCredentials).set({ mfaEnabled: false, totpSecretEnc: null, lastTotpStep: null, failedAttempts: 0, lockedUntil: null }).where(eq(staffCredentials.userId, account.id));
    await tx.delete(staffRecoveryCodes).where(eq(staffRecoveryCodes.userId, account.id));
    const ended = await revokeUserSessions(tx, account.id);
    await audit(c, tx, { action: 'account.mfa_reset', entityType: 'staff', entityId: account.id, metadata: { sessionsEnded: ended } });
  });
  return c.json({ account: await loadTarget(db, account.id) });
});

adminAccounts.post('/accounts/:id/unlock', validate('param', IdParam), async (c) => {
  const db = c.get('db');
  const account = await loadTarget(db, c.req.valid('param').id);
  await db.transaction(async (tx) => {
    await tx.update(staffCredentials).set({ failedAttempts: 0, lockedUntil: null }).where(eq(staffCredentials.userId, account.id));
    await audit(c, tx, { action: 'account.unlocked', entityType: 'staff', entityId: account.id });
  });
  return c.json({ account: await loadTarget(db, account.id) });
});

adminAccounts.post('/accounts/:id/sessions/revoke', validate('param', IdParam), async (c) => {
  const db = c.get('db');
  const staff = c.get('staff');
  const account = await loadTarget(db, c.req.valid('param').id);
  refuse(account.id === staff.userId ? 'Sign out your own sessions from My account.' : null, 403, 'FORBIDDEN');
  const ended = await db.transaction(async (tx) => {
    const count = await revokeUserSessions(tx, account.id);
    await audit(c, tx, { action: 'account.sessions_revoked', entityType: 'staff', entityId: account.id, metadata: { count } });
    return count;
  });
  return c.json({ ended, account: await loadTarget(db, account.id) });
});
