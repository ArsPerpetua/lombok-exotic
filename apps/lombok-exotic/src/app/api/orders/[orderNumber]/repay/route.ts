import { NextResponse } from 'next/server';
import { repayOrder } from '@lombok-exotic/core/orders';

export const dynamic = 'force-dynamic';

/** Issue a fresh payment for an unpaid / expired order (A19). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const { orderNumber } = await params;
  const result = await repayOrder(orderNumber, new URL(req.url).origin);
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : result.error === 'payment_failed' ? 502 : 409;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
