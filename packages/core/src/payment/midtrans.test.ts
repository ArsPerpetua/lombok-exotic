import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MidtransProvider } from './midtrans';

const SERVER_KEY = 'SB-Mid-server-testkey';
const provider = new MidtransProvider({
  serverKey: SERVER_KEY,
  clientKey: 'SB-Mid-client-testkey',
  isProduction: false,
});

function sign(orderId: string, statusCode: string, grossAmount: string): string {
  return createHash('sha512')
    .update(orderId + statusCode + grossAmount + SERVER_KEY)
    .digest('hex');
}

function notification(over: Partial<Record<string, string>> = {}) {
  const base = {
    order_id: 'LEX-260906-4821',
    status_code: '200',
    gross_amount: '185000.00',
    transaction_status: 'settlement',
    transaction_id: 'trx-abc-123',
    payment_type: 'bank_transfer',
    settlement_time: '2026-09-06 10:00:00',
    ...over,
  };
  return {
    ...base,
    signature_key: sign(base.order_id, base.status_code, base.gross_amount),
  };
}

describe('MidtransProvider.verifyWebhook', () => {
  it('accepts a correctly signed settlement notification', () => {
    const v = provider.verifyWebhook(notification());
    expect(v.valid).toBe(true);
    expect(v.providerRef).toBe('LEX-260906-4821');
    expect(v.status).toBe('settlement');
    expect(v.method).toBe('bank_transfer');
    expect(v.paidAt).toBe('2026-09-06 10:00:00');
  });

  it('rejects a tampered gross_amount (signature no longer matches)', () => {
    const body = notification();
    body.gross_amount = '1000.00'; // changed after signing
    const v = provider.verifyWebhook(body);
    expect(v.valid).toBe(false);
  });

  it('rejects a missing signature', () => {
    const body = notification();
    delete (body as Record<string, unknown>).signature_key;
    expect(provider.verifyWebhook(body).valid).toBe(false);
  });

  it('normalises transaction statuses', () => {
    expect(provider.verifyWebhook(notification({ transaction_status: 'expire' })).status).toBe(
      'expired',
    );
    expect(provider.verifyWebhook(notification({ transaction_status: 'deny' })).status).toBe(
      'failed',
    );
    expect(provider.verifyWebhook(notification({ transaction_status: 'cancel' })).status).toBe(
      'failed',
    );
    expect(provider.verifyWebhook(notification({ transaction_status: 'pending' })).status).toBe(
      'pending',
    );
  });

  it('treats fraud-flagged capture as pending, accepted capture as settled', () => {
    expect(
      provider.verifyWebhook(
        notification({ transaction_status: 'capture', fraud_status: 'challenge' }),
      ).status,
    ).toBe('pending');
    expect(
      provider.verifyWebhook(
        notification({ transaction_status: 'capture', fraud_status: 'accept' }),
      ).status,
    ).toBe('settlement');
  });

  it('produces a stable dedupe key from the payload', () => {
    const a = provider.verifyWebhook(notification());
    const b = provider.verifyWebhook(notification());
    expect(a.dedupeKey).toBe(b.dedupeKey);
    expect(a.dedupeKey).toContain('LEX-260906-4821');
  });
});
