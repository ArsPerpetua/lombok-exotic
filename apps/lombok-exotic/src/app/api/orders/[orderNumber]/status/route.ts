import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@lombok-exotic/core/db';
import { reconcilePendingOrder } from '@lombok-exotic/core/orders';

export const dynamic = 'force-dynamic';

/**
 * Lightweight status poll for the confirmation page (A12). Status alone is not PII.
 *
 * `?sync=1` first reconciles against the payment provider (Midtrans `getStatus`)
 * — used by the manual "Cek status" button and on return from the Snap page, so
 * a paid order flips to `paid` even when the async webhook can't reach us (local
 * dev / no public notification URL). The 3s auto-poll omits it and just reads.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const { orderNumber } = await params;
  const sync = new URL(req.url).searchParams.get('sync') === '1';

  let order = await db.query.orders.findFirst({
    where: eq(schema.orders.orderNumber, orderNumber),
    columns: { status: true, paidAt: true },
  });
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (sync && order.status === 'pending_payment') {
    await reconcilePendingOrder(orderNumber);
    order =
      (await db.query.orders.findFirst({
        where: eq(schema.orders.orderNumber, orderNumber),
        columns: { status: true, paidAt: true },
      })) ?? order;
  }

  return NextResponse.json({ status: order.status, paidAt: order.paidAt });
}
