import { MidtransProvider } from './midtrans';
import { FakePaymentProvider } from './fake';
import type { PaymentProvider } from './provider';

export * from './provider';
export { MidtransProvider, FakePaymentProvider };

let instance: PaymentProvider | null = null;

/**
 * The configured payment provider for this deployment. `PAYMENT_PROVIDER=fake`
 * swaps in {@link FakePaymentProvider} for local dev / phase 3.2a — ignored in
 * production so a stray env var can never take real checkouts offline.
 */
export function getPaymentProvider(): PaymentProvider {
  if (!instance) {
    const useFake =
      process.env.PAYMENT_PROVIDER === 'fake' && process.env.NODE_ENV !== 'production';
    instance = useFake ? new FakePaymentProvider() : new MidtransProvider();
  }
  return instance;
}
