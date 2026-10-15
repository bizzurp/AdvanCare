import { sql as rawSql } from 'drizzle-orm';
import { Hono } from 'hono';
import { connectDb, resolveConnection, type ConnectionSource } from '../db/client';
import type { AppEnv } from '../env';

type DatabaseCheck =
  | { status: 'ok'; source: ConnectionSource; latencyMs: number }
  | { status: 'error'; source: ConnectionSource; latencyMs: number }
  | { status: 'unconfigured' };

export const health = new Hono<AppEnv>();

/** Liveness plus a real database round trip. 200 only when the database answers. */
health.get('/health', async (c) => {
  const database = await checkDatabase(c.env, c.get('requestId'));
  const ok = database.status === 'ok';
  return c.json(
    {
      status: ok ? 'ok' : 'degraded',
      service: 'advancare-api',
      environment: c.env.ENVIRONMENT,
      time: new Date().toISOString(),
      requestId: c.get('requestId'),
      checks: { database },
    },
    ok ? 200 : 503,
  );
});

async function checkDatabase(env: AppEnv['Bindings'], requestId: string): Promise<DatabaseCheck> {
  const connection = resolveConnection(env);
  if (!connection) return { status: 'unconfigured' };
  const started = Date.now();
  let client: Awaited<ReturnType<typeof connectDb>> = null;
  try {
    client = await connectDb(env);
    await client!.db.execute(rawSql`select 1`);
    return { status: 'ok', source: connection.source, latencyMs: Date.now() - started };
  } catch (err) {
    // Driver errors can contain host names; log them, never return them.
    console.error(JSON.stringify({ requestId, level: 'error', check: 'database', message: (err as Error).message }));
    return { status: 'error', source: connection.source, latencyMs: Date.now() - started };
  } finally {
    await client?.close();
  }
}
