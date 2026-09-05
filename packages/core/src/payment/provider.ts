import type { Idr } from '../money';

/**
 * Payment abstraction. The app only ever imports this interface, so swapping
 * Midtrans for Xendit (or adding a second provider) is one file.
 */

export interface CreateChargeInput {
  /** Our order number — becomes the provider's order_id. */
  reference: string;
  amount: Idr;
  customer: { name: string; email?: string | null; phone?: string | null };
  items: Array<{ id: string; name: string; price: Idr; quantity: number }>;
  /** ISO string; provider expires the payment after this. */
  expiresAt?: string;
  callbackFinishUrl?: string;
}

export interface CreateChargeResult {
  providerRef: string;
  token: string;
  redirectUrl: string;
  expiresAt: string | null;
  raw: unknown;
}

export type NormalizedPaymentStatus =
  | 'pending'
  | 'settlement'
  | 'expired'
  | 'failed'
  | 'refunded';

export interface WebhookVerification {
  valid: boolean;
  providerRef: string;
  status: NormalizedPaymentStatus;
  method: string | null;
  paidAt: string | null;
  /** Stable key for idempotent processing (dedupe on this). */
  dedupeKey: string;
  raw: unknown;
}

export interface RefundInput {
  providerRef: string;
  amount: Idr;
  reason?: string;
}

export interface RefundResult {
  providerRef: string;
  status: 'pending' | 'success' | 'failed';
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;
  /** Verify signature + normalize a raw webhook body. Never throws on bad sig. */
  verifyWebhook(rawBody: unknown): WebhookVerification;
  /** Pull current status from the provider (reconciliation cron). */
  getStatus(providerRef: string): Promise<WebhookVerification>;
  refund(input: RefundInput): Promise<RefundResult>;
}
