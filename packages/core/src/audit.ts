import { db, schema } from './db/index';
import type { Executor } from './orders/stock';

export interface AuditEntry {
  actorUserId?: string | null;
  actorLabel?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Append-only record of a mutating admin action. Cheap to write now, impossible
 * to reconstruct later. Call on every admin mutation (plan / Week 4).
 */
export async function writeAudit(exec: Executor | typeof db, entry: AuditEntry): Promise<void> {
  try {
    await exec.insert(schema.auditLog).values({
      actorUserId: entry.actorUserId ?? null,
      actorLabel: entry.actorLabel ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
    });
  } catch (err) {
    // Never fail the mutation because the audit write failed — but shout about it.
    console.error('[audit] write failed:', entry.action, err);
  }
}
