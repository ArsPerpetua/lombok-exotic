import { BiteshipProvider } from './biteship';
import { FakeShippingProvider } from './fake';
import type { ShippingProvider } from './provider';

export * from './provider';
export { BiteshipProvider, FakeShippingProvider };
export { resolveStoreOrigin } from './origin';

let instance: ShippingProvider | null = null;

/**
 * `SHIPPING_PROVIDER=fake` swaps in {@link FakeShippingProvider} for local dev /
 * phase 3.2a (before `STORE_ORIGIN_AREA_ID` is confirmed with Biteship) —
 * ignored in production.
 */
export function getShippingProvider(): ShippingProvider {
  if (!instance) {
    const useFake =
      process.env.SHIPPING_PROVIDER === 'fake' && process.env.NODE_ENV !== 'production';
    instance = useFake ? new FakeShippingProvider() : new BiteshipProvider();
  }
  return instance;
}
