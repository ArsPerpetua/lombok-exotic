/**
 * Background worker process. Runs alongside the web process on the VPS.
 * Handles the queues declared in @lombok-exotic/core/jobs.
 *
 * MVP scope: payment reconciliation + stock-hold release (Week 3 Part 2).
 * Notification delivery + shipping tracking are Week 4 / Phase 2.
 */
import 'dotenv/config';
import { getBoss, QUEUES, stopBoss } from '@lombok-exotic/core/jobs';
import {
  cancelOrphanedOrder,
  expireStaleHold,
  findExpiredHolds,
  findOrphanedOrders,
  findStuckOrders,
  reconcilePendingOrder,
} from '@lombok-exotic/core/orders';
import { deliverPendingNotifications } from '@lombok-exotic/core/notifications';

async function forEach(nums: string[], fn: (n: string) => Promise<unknown>, label: string) {
  for (const n of nums) {
    try {
      const r = await fn(n);
      console.log(`[worker] ${label}`, n, r);
    } catch (err) {
      console.error(`[worker] ${label} failed for ${n}:`, err);
    }
  }
}

async function main() {
  const boss = await getBoss();

  await boss.work(QUEUES.notificationsDeliver, async () => {
    const r = await deliverPendingNotifications(20);
    if (r.processed) console.log('[worker] notifications.deliver', r);
  });

  await boss.work(QUEUES.paymentsReconcile, async () => {
    const nums = await findStuckOrders(20);
    if (nums.length) console.log(`[worker] payments.reconcile — ${nums.length} stuck`);
    await forEach(nums, reconcilePendingOrder, 'payments.reconcile');
  });

  await boss.work(QUEUES.stockReleaseHolds, async () => {
    const expired = await findExpiredHolds(20);
    if (expired.length) console.log(`[worker] stock.release-holds — ${expired.length} expired`);
    await forEach(expired, expireStaleHold, 'stock.release-holds');

    const orphans = await findOrphanedOrders(20);
    if (orphans.length) console.log(`[worker] stock.release-holds — ${orphans.length} orphaned`);
    await forEach(orphans, cancelOrphanedOrder, 'orphan-cleanup');
  });

  await boss.work(QUEUES.commissionsAccrue, async (jobs) => {
    for (const job of jobs) console.log('[worker] commissions.accrue (stub — Week 5)', job.data);
  });

  await boss.work(QUEUES.shippingPollTracking, async (jobs) => {
    for (const job of jobs) console.log('[worker] shipping.poll-tracking', job.data);
    // TODO(week 4 / Phase 2): refresh tracking for in-transit shipments.
  });

  // Recurring schedules (pg-boss cron).
  await boss.schedule(QUEUES.paymentsReconcile, '*/5 * * * *', {});
  await boss.schedule(QUEUES.stockReleaseHolds, '*/10 * * * *', {});
  await boss.schedule(QUEUES.notificationsDeliver, '*/2 * * * *', {});

  console.log('[worker] running. queues:', Object.values(QUEUES).join(', '));
}

main().catch(async (err) => {
  console.error('[worker] fatal:', err);
  await stopBoss();
  process.exit(1);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, async () => {
    console.log(`[worker] ${sig} — shutting down`);
    await stopBoss();
    process.exit(0);
  });
}
