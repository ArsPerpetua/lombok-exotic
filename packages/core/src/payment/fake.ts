import type {
  CreateChargeInput,
  CreateChargeResult,
  NormalizedPaymentStatus,
  PaymentProvider,
  RefundInput,
  RefundResult,
  WebhookVerification,
} from './provider';

/**
 * A stand-in payment provider for local dev and phase 3.2a, before the Midtrans
 * sandbox dashboard + webhook tunnel are set up. Same `PaymentProvider`
 * contract, so `createCheckout` and the route handlers are exercised for real.
 *
 * `createCharge` returns a redirect to an in-app fake payment page
 * (`/{locale}/pesanan/{orderNumber}?fake_pay=1`) where a dev-only button posts a
 * synthetic webhook. `verifyWebhook` accepts a plain `{ order_id, status }`
 * body with no signature.
 *
 * Enable with `PAYMENT_PROVIDER=fake`. Never resolves in production
 * (`getPaymentProvider` ignores it when `NODE_ENV === 'production'`).
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly name = 'fake';

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    const sum = input.items.reduce((n, i) => n + i.price * i.quantity, 0);
    if (sum !== input.amount) {
      // Mirror Midtrans' gross_amount === Σ item_details rule so the fake
      // catches the same bug class in dev (plan amendment A14).
      throw new Error(
        `FakePaymentProvider: amount ${input.amount} != sum(items) ${sum} — add the shipping line`,
      );
    }
    const base = input.callbackFinishUrl ?? `/pesanan/${input.reference}`;
    const redirectUrl = `${base}${base.includes('?') ? '&' : '?'}fake_pay=1`;
    return {
      providerRef: input.reference,
      token: `fake-${input.reference}`,
      redirectUrl,
      expiresAt: input.expiresAt ?? null,
      raw: { fake: true, amount: input.amount },
    };
  }

  verifyWebhook(rawBody: unknown): WebhookVerification {
    const b = (rawBody ?? {}) as Record<string, string>;
    const providerRef = b.order_id ?? '';
    const status = normalizeFakeStatus(b.status ?? b.transaction_status ?? 'settlement');
    return {
      valid: true,
      providerRef,
      status,
      method: b.payment_type ?? 'fake',
      paidAt: status === 'settlement' ? new Date().toISOString() : null,
      dedupeKey: `fake:${providerRef}:${status}:${b.event_id ?? Date.now()}`,
      raw: rawBody,
    };
  }

  async getStatus(providerRef: string): Promise<WebhookVerification> {
    // The fake has no server-side record; callers in 3.2b that need real
    // reconciliation use Midtrans. Report pending so reconcile is a no-op.
    return {
      valid: true,
      providerRef,
      status: 'pending',
      method: 'fake',
      paidAt: null,
      dedupeKey: `fake:${providerRef}:pending:reconcile`,
      raw: { fake: true },
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return { providerRef: input.providerRef, status: 'success', raw: { fake: true } };
  }
}

function normalizeFakeStatus(s: string): NormalizedPaymentStatus {
  switch (s) {
    case 'settlement':
    case 'capture':
    case 'paid':
      return 'settlement';
    case 'expire':
    case 'expired':
      return 'expired';
    case 'deny':
    case 'cancel':
    case 'failure':
    case 'failed':
      return 'failed';
    case 'refund':
      return 'refunded';
    default:
      return 'pending';
  }
}
