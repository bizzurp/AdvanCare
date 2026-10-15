import { and, desc, eq, gte, lt, lte, or, type SQL } from 'drizzle-orm';
import { Hono } from 'hono';
import * as v from 'valibot';
import { auditLogs, users } from '../../db/schema';
import type { AppEnv } from '../../env';
import { validate } from '../../lib/validation';

const PAGE_SIZE = 50;

/**
 * Audit log. Super Admins search everyone's entries; an Admin only ever sees their own
 * (the actor filter is forced server-side, whatever the query says).
 */
export const adminAudit = new Hono<AppEnv>();

const Query = v.object({
  actor: v.optional(v.pipe(v.string(), v.uuid())),
  action: v.optional(v.pipe(v.string(), v.regex(/^[a-z_.]{2,64}$/))),
  entityType: v.optional(v.pipe(v.string(), v.regex(/^[a-z_]{2,40}$/))),
  entityId: v.optional(v.pipe(v.string(), v.maxLength(64))),
  municipality: v.optional(v.pipe(v.string(), v.maxLength(100))),
  from: v.optional(v.pipe(v.string(), v.isoDate())),
  to: v.optional(v.pipe(v.string(), v.isoDate())),
  /** Cursor: `<createdAt ISO>_<id>` of the last entry on the previous page. */
  before: v.optional(v.pipe(v.string(), v.regex(/^[0-9T:.\-+Z]+_[0-9a-f-]{36}$/))),
});

adminAudit.get('/audit', validate('query', Query), async (c) => {
  const q = c.req.valid('query');
  const staff = c.get('staff');
  const actor = staff.role === 'SUPER_ADMIN' ? q.actor : staff.userId;
  const conditions: (SQL | undefined)[] = [
    actor ? eq(auditLogs.actorUserId, actor) : undefined,
    q.action ? eq(auditLogs.action, q.action) : undefined,
    q.entityType ? eq(auditLogs.entityType, q.entityType) : undefined,
    q.entityId ? eq(auditLogs.entityId, q.entityId) : undefined,
    q.municipality ? eq(auditLogs.municipality, q.municipality) : undefined,
    q.from ? gte(auditLogs.createdAt, new Date(`${q.from}T00:00:00+08:00`)) : undefined,
    q.to ? lte(auditLogs.createdAt, new Date(`${q.to}T23:59:59.999+08:00`)) : undefined,
  ];
  if (q.before) {
    const [at, id] = q.before.split('_') as [string, string];
    const cursor = new Date(at);
    conditions.push(or(lt(auditLogs.createdAt, cursor), and(eq(auditLogs.createdAt, cursor), lt(auditLogs.id, id))));
  }
  const rows = await c
    .get('db')
    .select({
      id: auditLogs.id,
      createdAt: auditLogs.createdAt,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      municipality: auditLogs.municipality,
      metadata: auditLogs.metadata,
      ip: auditLogs.ip,
      requestId: auditLogs.requestId,
      actor: { id: users.id, fullName: users.fullName, email: users.email },
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorUserId))
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(PAGE_SIZE + 1);
  const page = rows.slice(0, PAGE_SIZE);
  const last = page[page.length - 1];
  return c.json({
    entries: page.map((r) => ({ ...r, actor: r.actor?.id ? r.actor : null })),
    nextCursor: rows.length > PAGE_SIZE && last ? `${last.createdAt.toISOString()}_${last.id}` : null,
    scope: staff.role === 'SUPER_ADMIN' ? 'all' : 'own',
  });
});
