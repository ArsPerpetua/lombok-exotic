import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { formatIdr } from '@lombok-exotic/core/money';
import { Link } from '@/i18n/navigation';
import { clientConfig } from '../../../../../client.config';
import { routing } from '@/i18n/routing';
import { bundleBreakdown, getAllProductSlugs, getProductDetail } from '@/lib/catalog';
import { localizedAlternates } from '@/lib/seo';
import { ProductDetail } from '@/components/product-detail';

// ISR: prerender the catalog, refresh every 5 min; product/variant saves in
// admin also revalidate this route on demand. Stock shown here is a hint —
// checkout re-reserves against live stock.
export const revalidate = 300;

interface RouteParams {
  locale: string;
  slug: string;
}

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return routing.locales.flatMap((locale) => slugs.map(({ slug }) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductDetail(slug);
  if (!product) return {};

  const description =
    product.metaDescription ??
    product.shortDescription ??
    clientConfig.description[locale as 'id' | 'en'];
  const image = product.images[0]?.url ?? clientConfig.seo.defaultOgImage;
  const url = `/${locale}/produk/${slug}`;

  return {
    title: product.metaTitle ?? product.name,
    description,
    alternates: localizedAlternates(locale, `/produk/${slug}`),
    openGraph: {
      type: 'website',
      title: product.name,
      description: description ?? undefined,
      url,
      images: [image],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<RouteParams> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('product');

  const product = await getProductDetail(slug);
  if (!product) notFound();

  const bundle = bundleBreakdown(product);
  const prices = product.variants.map((v) => v.priceIdr);
  const lowPrice = prices.length ? Math.min(...prices) : (product.priceFrom ?? 0);
  const highPrice = prices.length ? Math.max(...prices) : (product.priceFrom ?? 0);
  const anyInStock = product.variants.some((v) => v.stock - v.reserved > 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? product.metaDescription ?? undefined,
    image: product.images.map((i) => i.url),
    category: product.category?.name,
    sku: product.variants[0]?.sku,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'IDR',
      lowPrice,
      highPrice,
      offerCount: product.variants.length || 1,
      availability: anyInStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-[var(--color-muted)]">
        <Link href="/katalog" className="hover:text-brand">
          {t('catalogCrumb')}
        </Link>
        {product.category && (
          <>
            {' / '}
            <Link
              href={`/katalog?kategori=${product.category.slug}`}
              className="hover:text-brand"
            >
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <h1 className="font-display mt-2 text-3xl sm:text-4xl">{product.name}</h1>
      {product.shortDescription && (
        <p className="mt-2 max-w-2xl text-[var(--color-muted)]">{product.shortDescription}</p>
      )}

      <div className="mt-8">
        <ProductDetail
          productName={product.name}
          images={product.images.map((i) => ({ url: i.url, alt: i.alt }))}
          variants={product.variants.map((v) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            priceIdr: v.priceIdr,
            compareAtIdr: v.compareAtIdr,
            weightGrams: v.weightGrams,
            stock: v.stock,
            reserved: v.reserved,
            attributes: v.attributes,
          }))}
          whatsappNumber={clientConfig.contact.whatsapp}
          whatsappTemplate={t.raw('waMessage')}
          labels={{
            selectVariant: t('selectVariant'),
            inStock: t('inStock'),
            lowStock: t('lowStock'),
            outOfStock: t('outOfStock'),
            weight: t('weight'),
            sku: t('sku'),
            orderViaWhatsapp: t('orderViaWhatsapp'),
            quantity: t('quantity'),
            addToCart: t('addToCart'),
            added: t('added'),
            addFailed: t('addFailed'),
          }}
        />
      </div>

      {bundle && (
        <section className="mt-12 rounded border p-6">
          <h2 className="font-display text-xl">{t('bundleContents')}</h2>
          <ul className="mt-4 divide-y">
            {bundle.components.map((c) => (
              <li key={c.variantId} className="flex items-center gap-4 py-3">
                <div className="aspect-square w-14 flex-none overflow-hidden rounded bg-[var(--color-accent,#e5e7eb)]">
                  {c.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.imageUrl}
                      alt={c.label}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <Link href={`/produk/${c.productSlug}`} className="text-sm hover:text-brand">
                    {c.label}
                  </Link>
                  <p className="text-xs text-[var(--color-muted)]">
                    {c.quantity} × {formatIdr(c.unitPriceIdr)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t pt-4 text-sm">
            <span className="text-[var(--color-muted)]">
              {t('bundleListPrice')}: <s>{formatIdr(bundle.componentsTotalIdr)}</s>
            </span>
            {product.priceFrom != null && bundle.componentsTotalIdr > product.priceFrom && (
              <span className="font-medium text-brand">
                {t('bundleSavings', {
                  amount: formatIdr(bundle.componentsTotalIdr - product.priceFrom),
                })}
              </span>
            )}
          </div>
        </section>
      )}

      {product.story && (
        <section className="mt-12 max-w-2xl">
          <h2 className="font-display text-xl">{t('story')}</h2>
          <p className="mt-2 whitespace-pre-line text-[var(--color-muted)]">{product.story}</p>
        </section>
      )}

      {product.description && (
        <section className="mt-8 max-w-2xl">
          <p className="whitespace-pre-line">{product.description}</p>
        </section>
      )}
    </div>
  );
}
