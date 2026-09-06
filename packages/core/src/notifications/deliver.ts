import { and, asc, eq, lt, or } from 'drizzle-orm';
import { db, schema } from '../db/index';
import { sendEmail } from '../email/index';
import { renderEmail } from './templates';

const { notifications } = schema;
const MAX_ATTEMPTS = 5;

/** Dry-run when there is no real Resend key (demo) — logs instead of sending. */
function isDryRun(): boolean {
  const key = process.env.RESEND_API_KEY ?? '';
  return process.env.NOTIFICATIONS_DRY_RUN === '1' || key === '' || key.includes('dev') || key.includes('xxx');
}

function resolveRecipient(recipient: string): string | null {
  if (recipient === 'admin') return process.env.ADMIN_ALERT_EMAIL || null;
  return recipient || null;
}

export interface DeliverResult {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}

/** Deliver a batch of pending email notifications. Called by the worker. */
export async function deliverPendingNotifications(limit = 20): Promise<DeliverResult> {
  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.channel, 'email'),
        or(
          eq(notifications.status, 'pending'),
          and(eq(notifications.status, 'failed'), lt(notifications.attempts, MAX_ATTEMPTS)),
        ),
      ),
    )
    .orderBy(asc(notifications.createdAt))
    .limit(limit);

  const result: DeliverResult = { processed: rows.length, sent: 0, failed: 0, skipped: 0 };

  for (const n of rows) {
    try {
      const rendered = await renderEmail(n.templateKey, n.payload as Record<string, unknown>);
      const to = resolveRecipient(n.recipient);

      if (!rendered || !to) {
        await db
          .update(notifications)
          .set({ status: 'skipped', lastError: !rendered ? 'no template/entity' : 'no recipient' })
          .where(eq(notifications.id, n.id));
        result.skipped += 1;
        continue;
      }

      if (isDryRun()) {
        console.log(`[notifications] DRY-RUN email → ${to}: ${rendered.subject}`);
        await db
          .update(notifications)
          .set({ status: 'sent', sentAt: new Date(), providerRef: 'dry-run' })
          .where(eq(notifications.id, n.id));
        result.sent += 1;
        continue;
      }

      const { id } = await sendEmail({ to, subject: rendered.subject, html: rendered.html, text: rendered.text });
      await db
        .update(notifications)
        .set({ status: 'sent', sentAt: new Date(), providerRef: id })
        .where(eq(notifications.id, n.id));
      result.sent += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db
        .update(notifications)
        .set({ status: 'failed', attempts: n.attempts + 1, lastError: msg.slice(0, 500) })
        .where(eq(notifications.id, n.id));
      result.failed += 1;
      console.error('[notifications] deliver failed', n.id, msg);
    }
  }

  return result;
}

/** Insert an outbox row. Safe to call inside a transaction (pass `exec`). */
export async function queueNotification(
  exec: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
  n: {
    channel?: string;
    templateKey: string;
    recipient: string;
    payload: Record<string, unknown>;
    entityType?: string;
    entityId?: string | null;
  },
): Promise<void> {
  await exec
    .insert(notifications)
    .values({
      channel: n.channel ?? 'email',
      templateKey: n.templateKey,
      recipient: n.recipient || 'admin',
      payload: n.payload,
      entityType: n.entityType ?? null,
      entityId: n.entityId ?? null,
      status: 'pending',
    })
    .onConflictDoNothing();
}
