import { and, count, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import * as v from 'valibot';
import { clientLoginCodes, users } from '../db/schema';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { sendMail } from '../lib/mailer';
import { validate } from '../lib/validation';
import { issueClientSession, requireClient, revokeCurrentClientSession } from '../middleware/auth';
import { withDb } from '../middleware/staff';
import { sha256Hex, timingSafeEqualString } from '../staff/crypto';

/**
 * App sign-in (ADV-AUTH-001): a 6-digit code sent by email (free; SMS can replace the
 * delivery later without changing the flow). The same email always maps to the same account.
 */
export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;
export const MAX_CODES_PER_HOUR = 5;

const Email = v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email('Enter a valid email address.'), v.maxLength(255));
const Code = v.pipe(v.string(), v.trim(), v.regex(/^\d{6}$/, 'Enter the 6-digit code.'));

export const auth = new Hono<AppEnv>();
auth.use('/auth/*', withDb);

/** Uniform 6-digit code (rejection sampling avoids modulo bias). */
export function generateCode(): string {
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0]! < 4_294_000_000) return String(buf[0]! % 1_000_000).padStart(6, '0');
  }
}

export const codeHash = (email: string, code: string) => sha256Hex(`${email}:${code}`);

async function limit(c: Context<AppEnv>, email: string) {
  const limiter = c.env.CLIENT_AUTH_LIMITER;
  if (!limiter) return;
  for (const key of [`ip:${c.req.header('CF-Connecting-IP') ?? 'local'}`, `email:${email}`]) {
    if (!(await limiter.limit({ key: `client-auth:${key}` })).success) {
      throw new ApiError(429, 'RATE_LIMITED', 'Too many tries. Please wait a minute and try again.');
    }
  }
}

auth.post('/auth/request-otp', validate('json', v.strictObject({ email: Email })), async (c) => {
  const { email } = c.req.valid('json');
  await limit(c, email);
  const db = c.get('db');
  const [recent] = await db
    .select({ n: count() })
    .from(clientLoginCodes)
    .where(and(eq(clientLoginCodes.email, email), gt(clientLoginCodes.createdAt, new Date(Date.now() - 3600_000))));
  if ((recent?.n ?? 0) >= MAX_CODES_PER_HOUR) {
    throw new ApiError(429, 'TOO_MANY_CODES', 'You’ve asked for several codes already. Use the newest email, or try again in an hour.');
  }
  const code = generateCode();
  const now = new Date();
  // Only the newest code works.
  await db.update(clientLoginCodes).set({ consumedAt: now }).where(and(eq(clientLoginCodes.email, email), isNull(clientLoginCodes.consumedAt)));
  const [row] = await db
    .insert(clientLoginCodes)
    .values({ email, codeHash: await codeHash(email, code), expiresAt: new Date(now.getTime() + CODE_TTL_MS), ip: c.req.header('CF-Connecting-IP') ?? null })
    .returning({ id: clientLoginCodes.id });

  let delivery: 'sent' | 'logged';
  try {
    delivery = await sendMail(
      c.env,
      {
        to: email,
        subject: `${code} is your AdvanCare code`,
        text: `Your AdvanCare sign-in code is ${code}\n\nIt works once and expires in 10 minutes.\nIf you didn’t ask for this code, you can ignore this email. Never share the code with anyone, including AdvanCare staff.`,
        html: `<div style="font-family:Arial,sans-serif;color:#173e37;max-width:420px"><p>Your AdvanCare sign-in code is</p><p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:8px 0">${code}</p><p>It works once and expires in 10 minutes.</p><p style="color:#536d65;font-size:13px">If you didn’t ask for this code, you can ignore this email. Never share the code with anyone, including AdvanCare staff.</p></div>`,
      },
      c.get('requestId'),
    );
  } catch (err) {
    await db.update(clientLoginCodes).set({ consumedAt: new Date() }).where(eq(clientLoginCodes.id, row!.id));
    throw err;
  }
  return c.json({ sent: true, expiresInMinutes: CODE_TTL_MS / 60000, ...(delivery === 'logged' ? { devNote: 'Development: the code was written to the API log instead of emailed.' } : {}) }, 202);
});

auth.post('/auth/verify-otp', validate('json', v.strictObject({ email: Email, otp: Code })), async (c) => {
  const { email, otp } = c.req.valid('json');
  await limit(c, email);
  const db = c.get('db');
  const wrong = () => new ApiError(401, 'CODE_INVALID', 'That code is wrong or has expired. Check the newest email, or ask for a new code.');
  const [code] = await db
    .select()
    .from(clientLoginCodes)
    .where(and(eq(clientLoginCodes.email, email), isNull(clientLoginCodes.consumedAt), gt(clientLoginCodes.expiresAt, new Date())))
    .orderBy(desc(clientLoginCodes.createdAt))
    .limit(1);
  if (!code) throw wrong();
  if (code.attempts >= MAX_CODE_ATTEMPTS) {
    await db.update(clientLoginCodes).set({ consumedAt: new Date() }).where(eq(clientLoginCodes.id, code.id));
    throw new ApiError(401, 'CODE_LOCKED', 'Too many wrong tries. Ask for a new code.');
  }
  if (!timingSafeEqualString(await codeHash(email, otp), code.codeHash)) {
    await db.update(clientLoginCodes).set({ attempts: sql`${clientLoginCodes.attempts} + 1` }).where(eq(clientLoginCodes.id, code.id));
    throw wrong();
  }

  const result = await db.transaction(async (tx) => {
    // Conditional consume: two parallel verifications can't both succeed.
    const [claimed] = await tx
      .update(clientLoginCodes)
      .set({ consumedAt: new Date() })
      .where(and(eq(clientLoginCodes.id, code.id), isNull(clientLoginCodes.consumedAt)))
      .returning({ id: clientLoginCodes.id });
    if (!claimed) throw wrong();
    const [existing] = await tx
      .select({ id: users.id, isActive: users.isActive, role: users.role })
      .from(users)
      .where(and(sql`lower(${users.email}) = ${email}`, sql`${users.role}::text NOT IN ('ADMIN', 'SUPER_ADMIN')`))
      .limit(1);
    if (existing && !existing.isActive) throw new ApiError(403, 'ACCOUNT_DISABLED', 'This account is turned off. Please contact AdvanCare.');
    const userId = existing?.id ?? (await tx.insert(users).values({ email, role: 'CLIENT' }).returning({ id: users.id }))[0]!.id;
    const session = await issueClientSession(tx, userId, c.req.header('User-Agent'));
    return { ...session, user: { id: userId, email, isNew: !existing, role: existing?.role ?? 'CLIENT' } };
  });
  return c.json(result);
});

auth.get('/auth/me', requireClient, async (c) => {
  const [me] = await c.get('db').select({ id: users.id, email: users.email, fullName: users.fullName, phoneNumber: users.phoneNumber, role: users.role }).from(users).where(eq(users.id, c.get('clientUserId'))).limit(1);
  return c.json({ me });
});

auth.post('/auth/sign-out', async (c) => {
  await revokeCurrentClientSession(c, c.get('db'));
  // 200 + JSON (not 204): the Workers test runner never exits after a bodiless 204.
  return c.json({ signedOut: true });
});

const AccountPatch = v.strictObject({
  fullName: v.optional(v.pipe(v.string(), v.trim(), v.minLength(2, 'Enter your full name.'), v.maxLength(255))),
  /** Philippine mobile in +63 format, or '' to remove it. */
  phoneNumber: v.optional(v.union([v.literal(''), v.pipe(v.string(), v.trim(), v.regex(/^\+639\d{9}$/, 'Enter a Philippine mobile number, like 0917 123 4567.'))])),
});

/** The signed-in person edits their own account name and mobile number (the email is how they sign in). */
auth.patch('/auth/me', requireClient, validate('json', AccountPatch), async (c) => {
  const body = c.req.valid('json');
  const db = c.get('db');
  const userId = c.get('clientUserId');
  const set: Partial<typeof users.$inferInsert> = {};
  if (body.fullName !== undefined) set.fullName = body.fullName;
  if (body.phoneNumber !== undefined) set.phoneNumber = body.phoneNumber || null;
  if (Object.keys(set).length) {
    try {
      await db.update(users).set(set).where(eq(users.id, userId));
    } catch (err) {
      const code = (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
      if (code === '23505') throw new ApiError(409, 'PHONE_IN_USE', 'That mobile number is already used by another AdvanCare account.');
      throw err;
    }
  }
  const [me] = await db.select({ id: users.id, email: users.email, fullName: users.fullName, phoneNumber: users.phoneNumber, role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  return c.json({ me });
});
