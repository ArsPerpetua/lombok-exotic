import { BiteshipProvider } from './biteship';
import type { ShippingProvider } from './provider';

export * from './provider';
export { BiteshipProvider };

let instance: ShippingProvider | null = null;

export function getShippingProvider(): ShippingProvider {
  if (!instance) {
    instance = new BiteshipProvider();
  }
  return instance;
}
