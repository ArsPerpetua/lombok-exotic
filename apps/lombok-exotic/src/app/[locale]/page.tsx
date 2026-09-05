import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { formatIdr } from '@lombok-exotic/core/money';
import { clientConfig } from '../../../client.config';
import { tr } from '@lombok-exotic/core/config';
import { getFeaturedProducts } from '@/lib/catalog';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const products = await getFeaturedProducts();

  return (
    <>
      <section className="bg-black text-white">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <p className="font-display text-3xl text-brand sm:text-5xl">{clientConfig.name}</p>
          <p className="mt-2 text-sm uppercase tracking-widest text-white/70">
            {tr(clientConfig.tagline, locale)}
          </p>
          <h1 className="mx-auto mt-8 max-w-2xl text-2xl font-semibold sm:text-4xl">
            {t('heroTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-white/80">{t('heroSubtitle')}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/katalog"
              className="rounded bg-brand px-6 py-3 font-medium text-brand-foreground"
            >
              {t('shopNow')}
            </Link>
            {clientConfig.features.groupPreorder && (
              <Link
                href="/pesanan-rombongan"
                className="rounded border border-white/40 px-6 py-3 font-medium hover:bg-white/10"
              >
                {t('groupCta')}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-xl font-semibold">{t('featured')}</h2>
        {products.length === 0 ? (
          <p className="mt-6 rounded border border-dashed p-8 text-center text-[var(--color-muted)]">
            {t('emptyCatalog')}
          </p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <li key={p.id} className="rounded border">
                <Link href={`/produk/${p.slug}`} className="block p-4">
                  <div className="aspect-square rounded bg-[var(--color-accent,#e5e7eb)]" />
                  <p className="mt-3 text-sm font-medium">{p.name}</p>
                  {p.priceFromIdr != null && (
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {formatIdr(p.priceFromIdr)}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
