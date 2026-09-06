import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getShippingProvider, resolveStoreOrigin } from '@lombok-exotic/core/shipping';
import { getCartView } from '@/lib/cart';

export const dynamic = 'force-dynamic';

const body = z
  .object({
    destinationAreaId: z.string().trim().min(1).optional(),
    destinationPostalCode: z
      .string()
      .trim()
      .regex(/^\d{5}$/)
      .optional(),
  })
  .refine((d) => d.destinationAreaId || d.destinationPostalCode, {
    message: 'destination required',
  });

/** Courier rates for the current cart to a chosen destination. Items are taken
 *  server-side from the cart cookie — the client only supplies the destination. */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid', rates: [] }, { status: 400 });

  const cart = await getCartView();
  if (cart.lines.length === 0) {
    return NextResponse.json({ error: 'cart_empty', rates: [] }, { status: 400 });
  }

  const origin = await resolveStoreOrigin();
  try {
    const rates = await getShippingProvider().getRates({
      originAreaId: origin.areaId,
      originPostalCode: origin.postalCode,
      destinationAreaId: parsed.data.destinationAreaId,
      destinationPostalCode: parsed.data.destinationPostalCode,
      items: cart.lines.map((l) => ({
        name: l.productName,
        quantity: l.quantity,
        weightGrams: l.weightGrams,
        valueIdr: l.unitPriceIdr,
      })),
    });
    return NextResponse.json({ rates });
  } catch (err) {
    console.error('[api/shipping/rates]', err);
    return NextResponse.json({ error: 'rates_failed', rates: [] }, { status: 502 });
  }
}
