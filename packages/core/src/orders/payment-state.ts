import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '../db/index';
import { enqueue, QUEUES } from '../jobs/index';
import { getPaymentProvider } from '../payment/index';
import type { WebhookVerification } from '../payment/provider';
import { queueNotification } from '../notifications/deliver';
import { type Executor, commitSale, releaseStock } from './stock';

const { orders, orderItems, orderEvents, payments, customers } = schema;

export type ApplyOutcome =
  | 'paid'
  | 'cancelled'
  | 'already_applied'
  | 'noop'
  | 'amount_mismatch'
  | 'refund_noted'
  | 'unknown_order'
  | 'payment_created';

export interface ApplyResult {
  outcome: ApplyOutcome;
  orderNumber?: string;
  oversold?: string[];
}

/**
 * The one place a payment result becomes an order state change. Called by the
 * Midtrans webhook AND the reconcile / release-holds workers, so it must be
 * idempotent and race-safe: every transition is a conditional
 * `UPDATE ... WHERE status = <expected> RETURNING`, side-effects fire only when a
 * row comes back, and the order row is `SELECT ... FOR UPDATE`-locked first.
 * See docs/plans/week3-part2-checkout-payment.md amendments A1/A2/A3/A6/A16/A17.
 */
export async function applyPaymentUpdate(v: WebhookVerification): Promise<ApplyResult> {
  if (!v.providerRef) return { outcome: 'unknown_order' };

  return db.transaction(async (tx) => {
    // 1. Resolve payment + order (create the payment row if txn B failed — A6).
    let payment = await tx.query.payments.findFirst({
      where: eq(payments.providerRef, v.providerRef),
    });

    let orderId: string;
    let createdPayment = false;
    if (payment) {
      orderId = payment.orderId;
    } else {
      const ord = await tx.query.orders.findFirst({
        where: eq(orders.orderNumber, v.providerRef),
        columns: { id: true, grandTotalIdr: true },
      });
      if (!ord) return { outcome: 'unknown_order' as const };
      orderId = ord.id;
      const [row] = await tx
        .insert(payments)
        .values({
          orderId,
          provider: getPaymentProvider().name,
          providerRef: v.providerRef,
          amountIdr: ord.grandTotalIdr,
          status: 'pending',
        })
        .returning();
      payment = row;
      createdPayment = true;
    }
    if (!payment) return { outcome: 'unknown_order' as const };

    // 2. Lock the order row.
    const [order] = await tx
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        grandTotalIdr: orders.grandTotalIdr,
        locationId: orders.locationId,
        customerId: orders.customerId,
        tourLeaderId: orders.tourLeaderId,
        channel: orders.channel,
        internalNote: orders.internalNote,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for('update');
    if (!order) return { outcome: 'unknown_order' as const };

    const lines = await tx
      .select({ variantId: orderItems.variantId, quantity: orderItems.quantity })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
    const stockLines = lines
      .filter((l): l is { variantId: string; quantity: number } => l.variantId != null)
      .map((l) => ({ variantId: l.variantId, quantity: l.quantity }));

    // 3. Branch on the normalised status.
    if (v.status === 'pending') {
      return { outcome: createdPayment ? 'payment_created' : 'noop', orderNumber: order.orderNumber };
    }

    if (v.status === 'refunded') {
      await tx.update(payments).set({ status: 'refunded' }).where(eq(payments.id, payment.id));
      await tx.insert(orderEvents).values({
        orderId,
        status: order.status,
        note: 'Provider melaporkan refund — perlu tindak lanjut manual (Phase 2)',
        actorLabel: 'system',
      });
      return { outcome: 'refund_noted', orderNumber: order.orderNumber };
    }

    if (v.status === 'settlement') {
      // A17 — the amount the provider says was paid must match what we charged.
      const paid = extractPaidAmount(v);
      if (paid != null && paid !== payment.amountIdr) {
        await tx
          .update(payments)
          .set({ status: 'settlement', method: v.method, rawPayload: v.raw as object })
          .where(eq(payments.id, payment.id));
        await tx.insert(orderEvents).values({
          orderId,
          status: order.status,
          note: `Nominal bayar (${paid}) != tagihan (${payment.amountIdr}) — tahan, cek manual`,
          actorLabel: 'system',
        });
        await queueNotification(tx, {
          templateKey: 'order.payment_amount_mismatch',
          recipient: 'admin',
          payload: { orderId, orderNumber: order.orderNumber },
          entityType: 'order',
          entityId: orderId,
        });
        return { outcome: 'amount_mismatch', orderNumber: order.orderNumber };
      }

      const promoted = await tx
        .update(orders)
        .set({ status: 'paid', paidAt: new Date(v.paidAt ?? Date.now()) })
        .where(
          and(eq(orders.id, orderId), inArray(orders.status, ['pending_payment', 'cancelled'])),
        )
        .returning({ id: orders.id });

      await tx
        .update(payments)
        .set({
          status: 'settlement',
          method: v.method,
          paidAt: new Date(v.paidAt ?? Date.now()),
          rawPayload: v.raw as object,
        })
        .where(eq(payments.id, payment.id));

      if (promoted.length === 0) {
        return { outcome: 'already_applied', orderNumber: order.orderNumber };
      }

      const wasCancelled = order.status === 'cancelled';
      const oversold = await commitSale(
        tx as Executor,
        stockLines,
        order.orderNumber,
        order.locationId,
      );

      await tx.insert(orderEvents).values({
        orderId,
        status: 'paid',
        note: wasCancelled
          ? 'Pembayaran masuk setelah pesanan sempat dibatalkan — dipulihkan'
          : 'Pembayaran diterima',
        actorLabel: 'system',
      });

      if (oversold.length > 0) {
        await tx.insert(orderEvents).values({
          orderId,
          status: 'paid',
          note: `STOK KURANG untuk varian ${oversold.join(', ')} — perlu restock / hubungi pembeli`,
          actorLabel: 'system',
        });
        await queueNotification(tx, {
          templateKey: 'order.oversold_needs_restock',
          recipient: 'admin',
          payload: { orderId, orderNumber: order.orderNumber },
          entityType: 'order',
          entityId: orderId,
        });
      }

      await queueNotification(tx, {
        templateKey: 'order.paid',
        recipient: await customerEmail(tx, order.customerId),
        payload: { orderId, orderNumber: order.orderNumber },
        entityType: 'order',
        entityId: orderId,
      });

      if (order.tourLeaderId) {
        try {
          await enqueue(
            QUEUES.commissionsAccrue,
            { orderId },
            { singletonKey: `commission:${orderId}` },
          );
        } catch (err) {
          console.warn('[payment-state] commission enqueue failed:', err);
        }
      }

      // A group pre-order's quote order settling → advance the group record.
      if (order.channel === 'group_preorder' && order.internalNote?.startsWith('group:')) {
        const groupId = order.internalNote.slice(6);
        await tx
          .update(schema.groupPreorders)
          .set({ status: 'paid' })
          .where(
            and(
              eq(schema.groupPreorders.id, groupId),
              inArray(schema.groupPreorders.status, ['quoted', 'confirmed']),
            ),
          );
      }

      return { outcome: 'paid', orderNumber: order.orderNumber, oversold };
    }

    // expired | failed
    if (v.status === 'expired' || v.status === 'failed') {
      const cancelled = await tx
        .update(orders)
        .set({ status: 'cancelled' })
        .where(and(eq(orders.id, orderId), eq(orders.status, 'pending_payment')))
        .returning({ id: orders.id });

      await tx
        .update(payments)
        .set({ status: v.status, rawPayload: v.raw as object })
        .where(eq(payments.id, payment.id));

      if (cancelled.length === 0) {
        return { outcome: 'already_applied', orderNumber: order.orderNumber };
      }

      await releaseStock(tx as Executor, stockLines);
      await tx.insert(orderEvents).values({
        orderId,
        status: 'cancelled',
        note: v.status === 'expired' ? 'Pembayaran kedaluwarsa' : 'Pembayaran gagal',
        actorLabel: 'system',
      });
      return { outcome: 'cancelled', orderNumber: order.orderNumber };
    }

    return { outcome: 'noop', orderNumber: order.orderNumber };
  });
}

/** Reconcile one order against the provider's truth (payments.reconcile worker). */
export async function reconcilePendingOrder(orderNumber: string): Promise<ApplyResult> {
  try {
    const v = await getPaymentProvider().getStatus(orderNumber);
    return await applyPaymentUpdate(v);
  } catch (err) {
    console.error('[payment-state] reconcile failed for', orderNumber, err);
    return { outcome: 'noop', orderNumber };
  }
}

/**
 * Expire a stale hold (stock.release-holds worker). Checks the provider FIRST
 * (A16 — a worker never cancels blind); only if the order is still
 * `pending_payment` afterwards does it force the cancel + stock release.
 */
export async function expireStaleHold(orderNumber: string): Promise<ApplyResult> {
  const reconciled = await reconcilePendingOrder(orderNumber);
  if (reconciled.outcome === 'paid' || reconciled.outcome === 'cancelled') return reconciled;

  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: orders.id, orderNumber: orders.orderNumber, status: orders.status })
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .for('update');
    if (!order) return { outcome: 'unknown_order' as const };

    const cancelled = await tx
      .update(orders)
      .set({ status: 'cancelled' })
      .where(and(eq(orders.id, order.id), eq(orders.status, 'pending_payment')))
      .returning({ id: orders.id });
    if (cancelled.length === 0) return { outcome: 'already_applied', orderNumber };

    const lines = await tx
      .select({ variantId: orderItems.variantId, quantity: orderItems.quantity })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    await releaseStock(
      tx as Executor,
      lines
        .filter((l): l is { variantId: string; quantity: number } => l.variantId != null)
        .map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    );
    await tx
      .update(payments)
      .set({ status: 'expired' })
      .where(and(eq(payments.providerRef, orderNumber), eq(payments.status, 'pending')));
    await tx.insert(orderEvents).values({
      orderId: order.id,
      status: 'cancelled',
      note: 'Hold pembayaran kedaluwarsa, stok dilepas',
      actorLabel: 'system',
    });
    return { outcome: 'cancelled', orderNumber };
  });
}

/** Cancel an order that has no payment row at all (crash between txn A and createCharge). */
export async function cancelOrphanedOrder(orderNumber: string): Promise<ApplyResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: orders.id, status: orders.status, internalNote: orders.internalNote })
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .for('update');
    if (!order) return { outcome: 'unknown_order' as const };

    const cancelled = await tx
      .update(orders)
      .set({ status: 'cancelled' })
      .where(and(eq(orders.id, order.id), eq(orders.status, 'pending_payment')))
      .returning({ id: orders.id });
    if (cancelled.length === 0) return { outcome: 'already_applied', orderNumber };

    const lines = await tx
      .select({ variantId: orderItems.variantId, quantity: orderItems.quantity })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    await releaseStock(
      tx as Executor,
      lines
        .filter((l): l is { variantId: string; quantity: number } => l.variantId != null)
        .map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    );
    await tx.insert(orderEvents).values({
      orderId: order.id,
      status: 'cancelled',
      note: 'Pesanan tanpa pembayaran dibersihkan',
      actorLabel: 'system',
    });
    const token = order.internalNote?.startsWith('cart:') ? order.internalNote.slice(5) : null;
    if (token) {
      await tx
        .update(schema.carts)
        .set({ status: 'active' })
        .where(and(eq(schema.carts.token, token), eq(schema.carts.status, 'converted')));
    }
    return { outcome: 'cancelled', orderNumber };
  });
}

// ── helpers ────────────────────────────────────────────────────────────────

function extractPaidAmount(v: WebhookVerification): number | null {
  const raw = (v.raw ?? {}) as Record<string, unknown>;
  const g = raw.gross_amount ?? raw.amount;
  if (g == null) return null;
  const n = typeof g === 'string' ? Number.parseFloat(g) : Number(g);
  return Number.isFinite(n) ? Math.round(n) : null;
}

async function customerEmail(tx: Executor, customerId: string): Promise<string> {
  const c = await tx.query.customers.findFirst({
    where: eq(customers.id, customerId),
    columns: { email: true },
  });
  return c?.email ?? '';
}

