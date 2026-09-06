import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createCheckout } from '@lombok-exotic/core/orders';
import { isValidMsisdn } from '@lombok-exotic/core/phone';
import { readCartToken } from '@/lib/cart';

export const dynamic = 'force-dynamic';

const opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

const schema = z.object({
  contact: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().refine(isValidMsisdn, 'Nomor WhatsApp tidak valid'),
    email: z.string().trim().email().optional().or(z.literal('')),
  }),
  address: z.object({
    recipientName: z.string().trim().min(2).max(120),
    phone: z.string().trim().refine(isValidMsisdn, 'Nomor penerima tidak valid'),
    province: z.string().trim().min(2).max(60),
    city: z.string().trim().min(2).max(60),
    district: opt(60),
    postalCode: z
      .string()
      .trim()
      .regex(/^\d{5}$/)
      .optional()
      .or(z.literal('')),
    addressLine: z.string().trim().min(6).max(500),
    areaId: opt(80),
    notes: opt(300),
  }),
  shipping: z.object({
    courierCompany: z.string().trim().min(1).max(40),
    courierType: z.string().trim().min(1).max(40),
    serviceName: z.string().trim().min(1).max(80),
    etd: z.string().max(60).nullable(),
    priceIdr: z.number().int().nonnegative(),
  }),
  customerNote: opt(300),
  locale: z.enum(['id', 'en']).default('id'),
});

export async function POST(req: Request) {
  const token = await readCartToken();
  if (!token) return NextResponse.json({ ok: false, error: 'cart_empty' }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const result = await createCheckout({
    cartToken: token,
    contact: { name: d.contact.name, phone: d.contact.phone, email: d.contact.email || null },
    address: {
      recipientName: d.address.recipientName,
      phone: d.address.phone,
      province: d.address.province,
      city: d.address.city,
      district: d.address.district || null,
      postalCode: d.address.postalCode || null,
      addressLine: d.address.addressLine,
      areaId: d.address.areaId || null,
      notes: d.address.notes || null,
    },
    shipping: d.shipping,
    locale: d.locale,
    customerNote: d.customerNote || null,
    appUrl: new URL(req.url).origin,
  });

  if (!result.ok) {
    const status =
      result.error === 'stock_unavailable' || result.error === 'shipping_price_changed'
        ? 409
        : result.error === 'payment_failed' || result.error === 'failed'
          ? 502
          : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
