import PgBoss from 'pg-boss';

/**
 * Background jobs on Postgres (pg-boss) — no Redis to run on the VPS.
 *
 * Queues:
 *   - notifications.deliver   : send one outbox row (email now, WA in Phase 2)
 *   - payments.reconcile      : poll provider for orders stuck pending_payment
 *   - shipping.poll-tracking  : refresh tracking for in-transit shipments
 *   - stock.release-holds     : free reserved stock for expired payments
 *
 * The worker process (apps/lombok-exotic/worker or a standalone script) calls
 * `startWorkers()`. The web process calls `getBoss()` only to enqueue.
 */

export const QUEUES = {
  notificationsDeliver: 'notifications.deliver',
  paymentsReconcile: 'payments.reconcile',
  shippingPollTracking: 'shipping.poll-tracking',
  stockReleaseHolds: 'stock.release-holds',
  // Declared now so the paid-order transition can enqueue without reopening the
  // audited state machine in Week 5; handler is a stub until then.
  commissionsAccrue: 'commissions.accrue',
} as const;

let boss: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
  if (!boss) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not set');
    boss = new PgBoss({ connectionString, schema: 'pgboss' });
    boss.on('error', (err) => console.error('[pg-boss]', err));
    await boss.start();
  }
  return boss;
}

export async function enqueue<T extends object>(
  queue: (typeof QUEUES)[keyof typeof QUEUES],
  data: T,
  options?: PgBoss.SendOptions,
): Promise<void> {
  const b = await getBoss();
  await b.send(queue, data, options ?? {});
}

export async function stopBoss(): Promise<void> {
  if (boss) {
    await boss.stop({ graceful: true });
    boss = null;
  }
}

export { PgBoss };
