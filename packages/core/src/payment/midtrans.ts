import { createHash } from 'node:crypto';
import type {
  CreateChargeInput,
  CreateChargeResult,
  NormalizedPaymentStatus,
  PaymentProvider,
  RefundInput,
  RefundResult,
  WebhookVerification,
} from './provider';

interface MidtransConfig {
  serverKey: string;
  clientKey: string;
  isProduction: boolean;
}

function readConfig(): MidtransConfig {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.MIDTRANS_CLIENT_KEY;
  if (!serverKey || !clientKey) {
    throw new Error('MIDTRANS_SERVER_KEY / MIDTRANS_CLIENT_KEY are not set');
  }
  return {
    serverKey,
    clientKey,
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  };
}

/** Midtrans returns gross_amount as a string like "150000.00". */
function amountKey(n: number | string): string {
  const num = typeof n === 'string' ? Number(n) : n;
  return num.toFixed(2);
}

function normalizeStatus(
  transactionStatus: string,
  fraudStatus?: string,
): NormalizedPaymentStatus {
  switch (transactionStatus) {
    case 'capture':
      return fraudStatus === 'accept' ? 'settlement' : 'pending';
    case 'settlement':
      return 'settlement';
    case 'pending':
      return 'pending';
    case 'deny':
    case 'cancel':
    case 'failure':
      return 'failed';
    case 'expire':
      return 'expired';
    case 'refund':
    case 'partial_refund':
      return 'refunded';
    default:
      return 'pending';
  }
}

export class MidtransProvider implements PaymentProvider {
  readonly name = 'midtrans';
  private readonly config: MidtransConfig;

  constructor(config?: MidtransConfig) {
    this.config = config ?? readConfig();
  }

  private get snapBase(): string {
    return this.config.isProduction
      ? 'https://app.midtrans.com/snap/v1'
      : 'https://app.sandbox.midtrans.com/snap/v1';
  }

  private get apiBase(): string {
    return this.config.isProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2';
  }

  private authHeader(): string {
    return `Basic ${Buffer.from(`${this.config.serverKey}:`).toString('base64')}`;
  }

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    const body = {
      transaction_details: {
        order_id: input.reference,
        gross_amount: input.amount,
      },
      item_details: input.items.map((i) => ({
        id: i.id,
        name: i.name.slice(0, 50),
        price: i.price,
        quantity: i.quantity,
      })),
      customer_details: {
        first_name: input.customer.name.slice(0, 50),
        email: input.customer.email ?? undefined,
        phone: input.customer.phone ?? undefined,
      },
      expiry: input.expiresAt
        ? { unit: 'minutes', duration: minutesUntil(input.expiresAt) }
        : undefined,
      callbacks: input.callbackFinishUrl ? { finish: input.callbackFinishUrl } : undefined,
    };

    const res = await fetch(`${this.snapBase}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: this.authHeader(),
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as {
      token?: string;
      redirect_url?: string;
      error_messages?: string[];
    };
    if (!res.ok || !json.token || !json.redirect_url) {
      throw new Error(
        `Midtrans createCharge failed (${res.status}): ${json.error_messages?.join('; ') ?? 'unknown'}`,
      );
    }

    return {
      providerRef: input.reference,
      token: json.token,
      redirectUrl: json.redirect_url,
      expiresAt: input.expiresAt ?? null,
      raw: json,
    };
  }

  verifyWebhook(rawBody: unknown): WebhookVerification {
    const b = (rawBody ?? {}) as Record<string, string>;
    const orderId = b.order_id ?? '';
    const statusCode = b.status_code ?? '';
    const grossAmount = b.gross_amount ?? '';
    const expected = createHash('sha512')
      .update(orderId + statusCode + grossAmount + this.config.serverKey)
      .digest('hex');
    const valid = safeEqual(expected, b.signature_key ?? '');

    const status = normalizeStatus(b.transaction_status ?? '', b.fraud_status);
    return {
      valid,
      providerRef: orderId,
      status,
      method: b.payment_type ?? null,
      paidAt: b.settlement_time ?? (status === 'settlement' ? (b.transaction_time ?? null) : null),
      dedupeKey: `midtrans:${orderId}:${b.transaction_status}:${statusCode}:${b.transaction_id ?? ''}`,
      raw: rawBody,
    };
  }

  async getStatus(providerRef: string): Promise<WebhookVerification> {
    const res = await fetch(`${this.apiBase}/${encodeURIComponent(providerRef)}/status`, {
      headers: { Accept: 'application/json', Authorization: this.authHeader() },
    });
    const json = (await res.json()) as Record<string, string>;
    const status = normalizeStatus(json.transaction_status ?? '', json.fraud_status);
    return {
      valid: true,
      providerRef,
      status,
      method: json.payment_type ?? null,
      paidAt: json.settlement_time ?? null,
      dedupeKey: `midtrans:${providerRef}:${json.transaction_status}:reconcile:${amountKey(json.gross_amount ?? 0)}`,
      raw: json,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const res = await fetch(
      `${this.apiBase}/${encodeURIComponent(input.providerRef)}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: this.authHeader(),
        },
        body: JSON.stringify({
          refund_key: `rf-${input.providerRef}-${Date.now()}`,
          amount: input.amount,
          reason: input.reason ?? 'Refund',
        }),
      },
    );
    const json = (await res.json()) as Record<string, unknown>;
    return {
      providerRef: input.providerRef,
      status: res.ok ? 'pending' : 'failed',
      raw: json,
    };
  }
}

function minutesUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(1, Math.round(ms / 60000));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
