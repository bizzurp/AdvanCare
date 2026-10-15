import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { connectDb, type Executor } from '../db/client';
import { clientSessions, users } from '../db/schema';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { randomToken, sha256Hex } from '../staff/crypto';

/** App sessions (ADV-AUTH-001): opaque bearer tokens, stored as SHA-256, valid 30 days. */
export const CLIENT_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export async function issueClientSession(db: Executor, userId: string, userAgent: string | undefined) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + CLIENT_SESSION_MS);
  await db.insert(clientSessions).values({ userId, tokenHash: await sha256Hex(token), expiresAt, userAgent: userAgent?.slice(0, 255) ?? null });
  return { accessToken: token, expiresAt };
}

function bearer(c: Context<AppEnv>): string | null {
  const header = c.req.header('Authorization') ?? '';
  const match = /^Bearer ([A-Za-z0-9_-]{20,128})$/.exec(header);
  return match ? match[1]! : null;
}

async function lookup(db: Executor, token: string): Promise<{ userId: string; sessionId: string } | null> {
  const [row] = await db
    .select({ userId: clientSessions.userId, sessionId: clientSessions.id, lastSeenAt: clientSessions.lastSeenAt })
    .from(clientSessions)
    .innerJoin(users, eq(users.id, clientSessions.userId))
    .where(and(eq(clientSessions.tokenHash, await sha256Hex(token)), isNull(clientSessions.revokedAt), gt(clientSessions.expiresAt, new Date()), eq(users.isActive, true)))
    .limit(1);
  if (!row) return null;
  if (Date.now() - row.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.update(clientSessions).set({ lastSeenAt: new Date() }).where(eq(clientSessions.id, row.sessionId));
  }
  return { userId: row.userId, sessionId: row.sessionId };
}

/**
 * The signed-in app user's id, or null. Only ever derived from the server-side session behind
 * the bearer token — never from a header, query or body field a client can set.
 */
export async function authenticatedUserId(c: Context<AppEnv>): Promise<string | null> {
  const known = c.get('clientUserId');
  if (known) return known;
  const token = bearer(c);
  if (!token) return null;
  const existing = c.get('db');
  const client = existing ? null : await connectDb(c.env).catch(() => null);
  const db = existing ?? client?.db;
  if (!db) return null;
  try {
    const found = await lookup(db, token);
    if (found) c.set('clientUserId', found.userId);
    return found?.userId ?? null;
  } finally {
    await client?.close();
  }
}

/** Requires a valid app session. Runs after `withDb`. */
export const requireClient = createMiddleware<AppEnv>(async (c, next) => {
  const token = bearer(c);
  const found = token ? await lookup(c.get('db'), token) : null;
  if (!found) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in again.');
  c.set('clientUserId', found.userId);
  await next();
});

/** Revokes the session behind the request's bearer token, if any. */
export async function revokeCurrentClientSession(c: Context<AppEnv>, db: Executor): Promise<void> {
  const token = bearer(c);
  if (!token) return;
  await db.update(clientSessions).set({ revokedAt: new Date() }).where(and(eq(clientSessions.tokenHash, await sha256Hex(token)), isNull(clientSessions.revokedAt)));
}
