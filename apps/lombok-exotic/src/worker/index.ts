/**
 * Background worker process. Runs alongside the web process on the VPS
 * (PM2 app "worker"). Handles the queues declared in @lombok-exotic/core/jobs.
 *
 * MVP scope: notification delivery + payment reconciliation + stock-hold
 * release. Handlers are stubs here — filled in during MVP weeks 3-5.
 */
import 'dotenv/config';
import { getBoss, QUEUES, stopBoss } from '@lombok-exotic/core/jobs';

async function main() {
  const boss = await getBoss();

  await boss.work(QUEUES.notificationsDeliver, async (jobs) => {
    for (const job of jobs) console.log('[worker] notifications.deliver', job.data);
    // TODO(week 4): load notification row, render template, send via Resend,
    // mark sent / retry with backoff.
  });

  await boss.work(QUEUES.paymentsReconcile, async (jobs) => {
    for (const job of jobs) console.log('[worker] payments.reconcile', job.id);
    // TODO(week 3): for orders pending_payment > 15 min, call
    // getPaymentProvider().getStatus() and settle / expire.
  });

  await boss.work(QUEUES.stockReleaseHolds, async (jobs) => {
    for (const job of jobs) console.log('[worker] stock.release-holds', job.id);
    // TODO(week 3): release `reserved` for expired payment holds.
  });

  await boss.work(QUEUES.shippingPollTracking, async (jobs) => {
    for (const job of jobs) console.log('[worker] shipping.poll-tracking', job.data);
    // TODO(week 4/Phase2): refresh tracking for in-transit shipments.
  });

  // Recurring schedules (pg-boss cron).
  await boss.schedule(QUEUES.paymentsReconcile, '*/5 * * * *', {});
  await boss.schedule(QUEUES.stockReleaseHolds, '*/10 * * * *', {});

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
