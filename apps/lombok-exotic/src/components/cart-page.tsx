'use client';

import { useState, useTransition } from 'react';
import { formatIdr } from '@lombok-exotic/core/money';
import { Link } from '@/i18n/navigation';
import { IkatBand } from '@/components/ikat-band';
import {
  type CartActionResult,
  removeCartItemAction,
  updateCartItemAction,
} from '@/app/[locale]/keranjang/actions';
import type { CartView } from '@/lib/cart';
import { dispatchCartChanged } from '@/lib/cart-events';

export interface CartLabels {
  empty: string;
  browse: string;
  adjusted: string;
  unit: string;
  remove: string;
  subtotal: string;
  totalWeight: string;
  shippingNote: string;
  checkout: string;
  stockLeft: string;
  genericError: string;
}

export function CartPageClient({
  initial,
  labels,
  checkoutHref = '/checkout',
}: {
  initial: CartView;
  labels: CartLabels;
  checkoutHref?: string;
}) {
  const [cart, setCart] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function apply(run: () => Promise<CartActionResult>) {
    setError(null);
    startTransition(async () => {
      const res = await run();
      setCart(res.cart);
      dispatchCartChanged(res.cart);
      if (!res.ok) setError(labels.genericError);
    });
  }

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <IkatBand className="mx-auto mb-8 w-24" />
        <p className="text-[var(--color-muted)]">{labels.empty}</p>
        <Link
          href="/katalog"
          className="mt-6 inline-block rounded bg-brand px-5 py-2.5 font-medium text-brand-foreground"
        >
          {labels.browse}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-6 py-12 lg:grid-cols-[1fr_20rem]">
      <div>
        {cart.adjusted && (
          <p className="mb-4 rounded border border-brand bg-red-50 p-3 text-sm text-brand">
            {labels.adjusted}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded border border-brand bg-red-50 p-3 text-sm text-brand">
            {error}
          </p>
        )}

        <ul className="divide-y">
          {cart.lines.map((line) => (
            <li key={line.itemId} className="flex gap-4 py-4">
              <div className="aspect-square w-20 flex-none overflow-hidden rounded bg-[var(--color-accent,#e5e7eb)]">
                {line.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={line.imageUrl}
                    alt={line.productName}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <div className="flex flex-1 flex-col">
                <Link
                  href={`/produk/${line.productSlug}`}
                  className="text-sm font-medium hover:text-brand"
                >
                  {line.productName}
                </Link>
                <p className="text-xs text-[var(--color-muted)]">{line.variantName}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {formatIdr(line.unitPriceIdr)} {labels.unit}
                </p>

                <div className="mt-auto flex items-center gap-3 pt-2">
                  <div className="flex items-center rounded border">
                    <button
                      type="button"
                      aria-label="-"
                      disabled={pending}
                      onClick={() =>
                        apply(() =>
                          updateCartItemAction({
                            itemId: line.itemId,
                            quantity: line.quantity - 1,
                          }),
                        )
                      }
                      className="px-3 py-1 text-sm disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="min-w-8 text-center text-sm">{line.quantity}</span>
                    <button
                      type="button"
                      aria-label="+"
                      disabled={pending || line.quantity >= line.maxQuantity}
                      onClick={() =>
                        apply(() =>
                          updateCartItemAction({
                            itemId: line.itemId,
                            quantity: line.quantity + 1,
                          }),
                        )
                      }
                      className="px-3 py-1 text-sm disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      apply(() => removeCartItemAction({ itemId: line.itemId }))
                    }
                    className="text-xs text-[var(--color-muted)] underline hover:text-brand disabled:opacity-40"
                  >
                    {labels.remove}
                  </button>

                  {line.quantity >= line.maxQuantity && (
                    <span className="text-xs text-brand">
                      {labels.stockLeft.replace('{n}', String(line.available))}
                    </span>
                  )}
                </div>
              </div>

              <p className="flex-none text-sm font-medium">{formatIdr(line.lineTotalIdr)}</p>
            </li>
          ))}
        </ul>
      </div>

      <aside className="h-max rounded border p-5">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--color-muted)]">{labels.subtotal}</dt>
            <dd className="font-medium">{formatIdr(cart.subtotalIdr)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--color-muted)]">{labels.totalWeight}</dt>
            <dd>{(cart.totalWeightGrams / 1000).toFixed(2)} kg</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-[var(--color-muted)]">{labels.shippingNote}</p>
        <Link
          href={checkoutHref}
          aria-disabled={pending}
          className="mt-4 block rounded bg-brand px-5 py-3 text-center font-medium text-brand-foreground"
        >
          {labels.checkout}
        </Link>
      </aside>
    </div>
  );
}
