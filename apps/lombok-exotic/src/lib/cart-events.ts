'use client';

import type { CartView } from '@/lib/cart';

/** Broadcast + subscribe to cart changes across client components in the tab. */
const EVENT = 'le:cart-changed';

export function dispatchCartChanged(cart: CartView): void {
  window.dispatchEvent(new CustomEvent<CartView>(EVENT, { detail: cart }));
}

export function onCartChanged(handler: (cart: CartView) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<CartView>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
