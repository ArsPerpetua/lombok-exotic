'use client';

import { useMemo, useState, useTransition } from 'react';
import { formatIdr } from '@lombok-exotic/core/money';
import { addToCartAction } from '@/app/[locale]/keranjang/actions';
import { dispatchCartChanged } from '@/lib/cart-events';

export interface DetailVariant {
  id: string;
  name: string;
  sku: string;
  priceIdr: number;
  compareAtIdr: number | null;
  weightGrams: number;
  stock: number;
  reserved: number;
  attributes: Record<string, string>;
}

export interface ProductDetailLabels {
  selectVariant: string;
  inStock: string;
  lowStock: string;
  outOfStock: string;
  weight: string;
  sku: string;
  orderViaWhatsapp: string;
  quantity: string;
  addToCart: string;
  added: string;
  addFailed: string;
}

interface Props {
  productName: string;
  images: Array<{ url: string; alt: string | null }>;
  variants: DetailVariant[];
  whatsappNumber: string;
  /** Message with `{product}` and `{variant}` placeholders. */
  whatsappTemplate: string;
  labels: ProductDetailLabels;
}

function availableOf(v: DetailVariant): number {
  return Math.max(0, v.stock - v.reserved);
}

export function ProductDetail({
  productName,
  images,
  variants,
  whatsappNumber,
  whatsappTemplate,
  labels,
}: Props) {
  const firstAvailable = variants.find((v) => availableOf(v) > 0) ?? variants[0];
  const [selectedId, setSelectedId] = useState(firstAvailable?.id);
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<'added' | 'failed' | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = variants.find((v) => v.id === selectedId) ?? firstAvailable;
  const available = selected ? availableOf(selected) : 0;
  const maxQty = Math.min(available, 99);
  const cappedQty = Math.min(quantity, Math.max(1, maxQty));

  function handleAddToCart() {
    if (!selected || available <= 0) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await addToCartAction({ variantId: selected.id, quantity: cappedQty });
      setFeedback(res.ok ? 'added' : 'failed');
      if (res.ok) dispatchCartChanged(res.cart);
    });
  }

  const stockState: 'in' | 'low' | 'out' =
    available <= 0 ? 'out' : available <= 5 ? 'low' : 'in';

  const waHref = useMemo(() => {
    if (!selected) return undefined;
    const text = whatsappTemplate
      .replace('{product}', productName)
      .replace('{variant}', selected.name);
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
  }, [selected, productName, whatsappNumber, whatsappTemplate]);

  const activeImage = images[imageIndex] ?? images[0];

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Gallery */}
      <div>
        <div className="aspect-square overflow-hidden rounded bg-[var(--color-accent,#e5e7eb)]">
          {activeImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeImage.url}
              alt={activeImage.alt ?? productName}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                onClick={() => setImageIndex(i)}
                aria-current={i === imageIndex ? 'true' : undefined}
                className={`aspect-square w-16 flex-none overflow-hidden rounded border ${
                  i === imageIndex ? 'border-brand' : 'border-transparent'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt ?? `${productName} ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Buy box */}
      <div>
        {selected && (
          <p className="text-2xl font-semibold">
            {formatIdr(selected.priceIdr)}
            {selected.compareAtIdr != null && selected.compareAtIdr > selected.priceIdr && (
              <span className="ml-2 text-base font-normal text-[var(--color-muted)] line-through">
                {formatIdr(selected.compareAtIdr)}
              </span>
            )}
          </p>
        )}

        <p
          className={`mt-2 text-sm ${
            stockState === 'out'
              ? 'text-[var(--color-muted)]'
              : stockState === 'low'
                ? 'text-brand'
                : 'text-green-700'
          }`}
        >
          {stockState === 'out'
            ? labels.outOfStock
            : stockState === 'low'
              ? `${labels.lowStock} (${available})`
              : labels.inStock}
        </p>

        {variants.length > 1 && (
          <fieldset className="mt-6">
            <legend className="text-sm font-medium">{labels.selectVariant}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {variants.map((v) => {
                const out = availableOf(v) <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(v.id);
                      setQuantity(1);
                      setFeedback(null);
                    }}
                    aria-pressed={v.id === selected?.id}
                    className={`rounded border px-3 py-2 text-sm transition-colors ${
                      v.id === selected?.id
                        ? 'border-brand bg-brand text-brand-foreground'
                        : 'border-[var(--color-accent,#e5e7eb)] hover:border-brand'
                    } ${out ? 'opacity-50' : ''}`}
                  >
                    {v.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {selected && (
          <dl className="mt-6 space-y-1 text-sm text-[var(--color-muted)]">
            <div className="flex gap-2">
              <dt>{labels.weight}:</dt>
              <dd>{selected.weightGrams} g</dd>
            </div>
            <div className="flex gap-2">
              <dt>{labels.sku}:</dt>
              <dd>{selected.sku}</dd>
            </div>
            {Object.entries(selected.attributes).map(([k, val]) => (
              <div key={k} className="flex gap-2 capitalize">
                <dt>{k}:</dt>
                <dd>{val}</dd>
              </div>
            ))}
          </dl>
        )}

        {stockState !== 'out' && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded border">
              <button
                type="button"
                aria-label="-"
                disabled={pending || cappedQty <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-sm disabled:opacity-40"
              >
                −
              </button>
              <span className="min-w-8 text-center text-sm" aria-label={labels.quantity}>
                {cappedQty}
              </span>
              <button
                type="button"
                aria-label="+"
                disabled={pending || cappedQty >= maxQty}
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                className="px-3 py-2 text-sm disabled:opacity-40"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={pending}
              className="rounded bg-brand px-6 py-3 font-medium text-brand-foreground disabled:opacity-60"
            >
              {labels.addToCart}
            </button>
          </div>
        )}

        {feedback === 'added' && (
          <p className="mt-3 text-sm text-green-700">{labels.added}</p>
        )}
        {feedback === 'failed' && <p className="mt-3 text-sm text-brand">{labels.addFailed}</p>}

        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex rounded border border-brand px-6 py-3 font-medium text-brand hover:bg-brand/5"
          >
            {labels.orderViaWhatsapp}
          </a>
        )}
      </div>
    </div>
  );
}
