import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@lombok-exotic/core/db';
import { getPaymentProvider } from '@lombok-exotic/core/payment';
import { applyPaymentUpdate } from '@lombok-exotic/core/orders';

export const dynamic = 'force-dynamic';

const { paymentEvents } = schema;

/**
 * Midtrans payment notification. Always 200 on a handled outcome so Midtrans
 * stops retrying; 500 only when `applyPaymentUpdate` throws (it is idempotent,
 * so a retry is safe). Every hit is recorded in `payment_events` first.
 */
export async function POST(req: Request) {
  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw) return NextResponse.json({ ok: false }, { status: 400 });

  // Optional source-IP allowlist (comma-separated). Silently 200 on a miss.
  const allow = (process.env.MIDTRANS_WEBHOOK_ALLOWLIST ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allow.length > 0) {
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() ?? '';
    if (!allow.includes(ip)) {
      console.warn('[webhook/midtrans] ip not allowlisted:', ip);
      return NextResponse.json({ ok: true }, { status: 200 });
    }
  }

  const provider = getPaymentProvider();
  const v = provider.verifyWebhook(raw);

  // Forensic record — kept even for an invalid signature.
  try {
    await db
      .insert(paymentEvents)
      .values({
        provider: provider.name,
        providerRef: v.providerRef,
        eventType: String(raw.transaction_status ?? raw.status ?? 'unknown'),
        signatureValid: v.valid,
        dedupeKey: v.dedupeKey,
        payload: raw,
      })
      .onConflictDoNothing({ target: paymentEvents.dedupeKey });
  } catch (err) {
    console.error('[webhook/midtrans] event insert failed:', err);
  }

  if (!v.valid) {
    console.warn('[webhook/midtrans] invalid signature for', v.providerRef);
    return NextResponse.json({ ok: true, ignored: 'bad_signature' }, { status: 200 });
  }

  try {
    const result = await applyPaymentUpdate(v);
    // Link the freshest event row to the payment, best-effort.
    try {
      const pay = await db.query.payments.findFirst({
        where: eq(schema.payments.providerRef, v.providerRef),
        columns: { id: true },
      });
      if (pay) {
        await db
          .update(paymentEvents)
          .set({ paymentId: pay.id })
          .where(
            and(eq(paymentEvents.dedupeKey, v.dedupeKey), eq(paymentEvents.providerRef, v.providerRef)),
          );
      }
    } catch {
      /* non-critical */
    }
    return NextResponse.json({ ok: true, outcome: result.outcome }, { status: 200 });
  } catch (err) {
    console.error('[webhook/midtrans] applyPaymentUpdate threw:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
