import type { Context } from 'hono';
import type { Executor } from './db/client';
import { auditLogs } from './db/schema';
import type { AppEnv } from './env';
import { clientIp } from './staff/sessions';

export interface AuditEntry {
  action: string;
  entityType?: string;
  entityId?: string;
  municipality?: string | null;
  /** Ids, field names, counts, reasons. Never clinical content, passwords, codes or tokens. */
  metadata?: Record<string, unknown>;
  /** Defaults to the signed-in staff member. */
  actorUserId?: string | null;
}

/**
 * Appends one audit row (ADR-011). Call it inside the same transaction as the write it
 * describes, so an action and its record are saved together or not at all.
 */
export async function audit(c: Context<AppEnv>, db: Executor, entry: AuditEntry): Promise<void> {
  await db.insert(auditLogs).values({
    actorUserId: entry.actorUserId === undefined ? (c.get('staff')?.userId ?? null) : entry.actorUserId,
    action: entry.action,
    entityType: entry.entityType ?? null,
    entityId: entry.entityId ?? null,
    municipality: entry.municipality ?? null,
    metadata: entry.metadata ?? null,
    ip: clientIp(c),
    requestId: c.get('requestId'),
  });
}
