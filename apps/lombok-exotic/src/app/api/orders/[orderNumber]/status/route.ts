import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@lombok-exotic/core/db';

export const dynamic = 'force-dynamic';

/** Lightweight status poll for the confirmation page (A12). Status alone is not PII. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const { orderNumber } = await params;
  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.orderNumber, orderNumber),
    columns: { status: true, paidAt: true },
  });
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ status: order.status, paidAt: order.paidAt });
}
