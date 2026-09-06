import { and, eq } from 'drizzle-orm';
import { db, schema } from '../db/index';
import { getNumberSetting } from '../settings';
import { getPaymentProvider } from '../payment/index';
import { type Executor, reserveStock, StockUnavailableError } from './stock';

const { orders, orderItems, payments, orderEvents } = schema;

const MAX_RETRIES = 3;

export type RepayError =
  | 'not_found'
  | 'not_repayable'
  | 'retry_limit'
  | 'stock_unavailable'
  | 'payment_failed';

export type RepayResult =
  | { ok: true; orderNumber: string; redirectUrl: string; grandTotalIdr: number }
  | { ok: false; error: RepayError };

/**
 * Issue a fresh payment for an order the shopper couldn't pay in time (A19).
 * Midtrans forbids reusing an expired `order_id`, so the new charge gets a
 * suffixed reference (`LEX-…-r2`) and its own `payments` row. If the order was
 * already `cancelled` (hold released), re-reserve stock first.
 */
export async function repayOrder(orderNumber: string, appUrl: string): Promise<RepayResult> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.orderNumber, orderNumber),
    with: {
      items: { columns: { variantId: true, quantity: true, productName: true, sku: true, unitPriceIdr: true } },
      payments: { columns: { id: true } },
    },
  });
  if (!order) return { ok: false, error: 'not_found' };
  if (order.status !== 'pending_payment' && order.status !== 'cancelled') {
    return { ok: false, error: 'not_repayable' };
  }
  if (order.payments.length >= MAX_RETRIES) return { ok: false, error: 'retry_limit' };

  const stockLines = order.items
    .filter((i): i is typeof i & { variantId: string } => i.variantId != null)
    .map((i) => ({ variantId: i.variantId, quantity: i.quantity }));

  // Re-reserve if the hold was already released.
  if (order.status === 'cancelled') {
    try {
      await db.transaction(async (tx) => {
        await reserveStock(tx as Executor, stockLines);
        await tx
          .update(orders)
          .set({ status: 'pending_payment' })
          .where(and(eq(orders.id, order.id), eq(orders.status, 'cancelled')));
        await tx.insert(orderEvents).values({
          orderId: order.id,
          status: 'pending_payment',
          note: 'Pembayaran ulang diminta, stok dipesan kembali',
          actorLabel: 'system',
        });
      });
    } catch (err) {
      if (err instanceof StockUnavailableError) return { ok: false, error: 'stock_unavailable' };
      console.error('[repay] re-reserve failed:', err);
      return { ok: false, error: 'payment_failed' };
    }
  }

  const attempt = order.payments.length + 1;
  const reference = `${orderNumber}-r${attempt}`;
  const expiryMin = await getNumberSetting('checkout.payment_expiry_minutes', 1440);
  const expiresAt = new Date(Date.now() + expiryMin * 60_000);
  const shippingIdr = order.grandTotalIdr - order.subtotalIdr + order.discountTotalIdr;

  const provider = getPaymentProvider();
  let charge;
  try {
    charge = await provider.createCharge({
      reference,
      amount: order.grandTotalIdr,
      customer: { name: 'Pelanggan' },
      items: [
        ...order.items.map((i) => ({
          id: i.sku.slice(0, 50),
          name: i.productName,
          price: i.unitPriceIdr,
          quantity: i.quantity,
        })),
        { id: 'shipping', name: 'Ongkir', price: Math.max(0, shippingIdr), quantity: 1 },
      ],
      expiresAt: expiresAt.toISOString(),
      callbackFinishUrl: `${appUrl}/id/pesanan/${orderNumber}`,
    });
  } catch (err) {
    console.error('[repay] createCharge failed:', err);
    return { ok: false, error: 'payment_failed' };
  }

  await db.insert(payments).values({
    orderId: order.id,
    provider: provider.name,
    providerRef: reference,
    amountIdr: order.grandTotalIdr,
    status: 'pending',
    snapToken: charge.token,
    snapRedirectUrl: charge.redirectUrl,
    expiresAt,
  });

  return {
    ok: true,
    orderNumber,
    redirectUrl: charge.redirectUrl,
    grandTotalIdr: order.grandTotalIdr,
  };
}
