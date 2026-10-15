import { env } from 'cloudflare:workers';
import { connectDb } from '../src/db/client';
import { clientSessions, users } from '../src/db/schema';
import { randomToken, sha256Hex } from '../src/staff/crypto';

/** A short-lived connection per use, like the request handlers (a long-lived one can hang on close in workerd). */
export async function withDb<T>(fn: (db: NonNullable<Awaited<ReturnType<typeof connectDb>>>['db']) => Promise<T>): Promise<T> {
  const client = (await connectDb(env))!;
  try {
    return await fn(client.db);
  } finally {
    await client.close();
  }
}

/** An app user with a live session (skips the email code). */
export async function appUser(role: 'CLIENT' | 'CAREGIVER' = 'CLIENT') {
  return withDb(async (db) => {
    const [u] = await db.insert(users).values({ role, email: `${crypto.randomUUID()}@helpers.test` }).returning({ id: users.id });
    const token = randomToken();
    await db.insert(clientSessions).values({ userId: u!.id, tokenHash: await sha256Hex(token), expiresAt: new Date(Date.now() + 3600_000) });
    return { id: u!.id, token };
  });
}
