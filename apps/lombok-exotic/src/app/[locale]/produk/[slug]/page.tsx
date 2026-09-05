import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { db, schema } from '@lombok-exotic/core/db';
import { and, asc, eq } from 'drizzle-orm';
import { formatIdr } from '@lombok-exotic/core/money';

async function loadProduct(slug: string) {
  try {
    return await db.query.products.findFirst({
      where: and(eq(schema.products.slug, slug), eq(schema.products.status, 'active')),
      with: {
        images: { orderBy: [asc(schema.productImages.position)] },
        variants: { where: eq(schema.productVariants.isActive, true) },
        category: true,
      },
    });
  } catch {
    return null;
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await loadProduct(slug);
  if (!product) notFound();

  // Week 3 adds: variant picker, add-to-cart, image gallery, JSON-LD Product.
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-6 py-12 md:grid-cols-2">
      <div className="aspect-square rounded bg-[var(--color-accent,#e5e7eb)]" />
      <div>
        {product.category && (
          <p className="text-sm text-[var(--color-muted)]">{product.category.name}</p>
        )}
        <h1 className="mt-1 text-2xl font-semibold">{product.name}</h1>
        {product.priceFrom != null && (
          <p className="mt-2 text-lg">{formatIdr(product.priceFrom)}</p>
        )}
        {product.shortDescription && <p className="mt-4">{product.shortDescription}</p>}
        {product.story && (
          <div className="mt-6 rounded bg-black/5 p-4 text-sm">
            <p className="font-medium">Cerita di balik produk</p>
            <p className="mt-1 whitespace-pre-line">{product.story}</p>
          </div>
        )}
        <ul className="mt-6 space-y-2 text-sm">
          {product.variants.map((v) => (
            <li key={v.id} className="flex justify-between rounded border px-3 py-2">
              <span>{v.name}</span>
              <span>
                {formatIdr(v.priceIdr)} · {v.weightGrams} g · stok {v.stock}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
