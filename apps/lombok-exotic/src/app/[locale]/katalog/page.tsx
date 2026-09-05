import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { formatIdr } from '@lombok-exotic/core/money';
import { getFeaturedProducts } from '@/lib/catalog';

export const metadata = { title: 'Katalog' };

// MVP week 2 replaces this with category filters + pagination + real images.
export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const products = await getFeaturedProducts(48);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Katalog</h1>
      {products.length === 0 ? (
        <p className="mt-6 rounded border border-dashed p-8 text-center text-[var(--color-muted)]">
          Belum ada produk. Jalankan <code>pnpm db:seed</code> untuk data demo.
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <li key={p.id} className="rounded border">
              <Link href={`/produk/${p.slug}`} className="block p-4">
                <div className="aspect-square rounded bg-[var(--color-accent,#e5e7eb)]" />
                <p className="mt-3 text-sm font-medium">{p.name}</p>
                {p.categoryName && (
                  <p className="text-xs text-[var(--color-muted)]">{p.categoryName}</p>
                )}
                {p.priceFromIdr != null && (
                  <p className="mt-1 text-sm">{formatIdr(p.priceFromIdr)}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
