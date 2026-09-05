import { MidtransProvider } from './midtrans';
import type { PaymentProvider } from './provider';

export * from './provider';
export { MidtransProvider };

let instance: PaymentProvider | null = null;

/** The configured payment provider for this deployment. */
export function getPaymentProvider(): PaymentProvider {
  if (!instance) {
    // Only Midtrans today. Add a switch on an env var when a second provider lands.
    instance = new MidtransProvider();
  }
  return instance;
}
