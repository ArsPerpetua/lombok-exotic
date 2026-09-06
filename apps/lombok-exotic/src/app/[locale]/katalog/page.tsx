import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { formatIdr } from '@lombok-exotic/core/money';
import {
  CATALOG_SORTS,
  type CatalogSort,
  getCatalogPage,
  getCategories,
  parseSort,
} from '@/lib/catalog';

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'catalog' });
  return {
    title: t('title'),
    alternates: { canonical: `/${locale}/katalog` },
  };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildQuery(next: {
  kategori?: string | null;
  urut?: CatalogSort;
  hal?: number;
}): string {
  const sp = new URLSearchParams();
  if (next.kategori) sp.set('kategori', next.kategori);
  if (next.urut && next.urut !== 'featured') sp.set('urut', next.urut);
  if (next.hal && next.hal > 1) sp.set('hal', String(next.hal));
  const qs = sp.toString();
  return qs ? `/katalog?${qs}` : '/katalog';
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations('catalog');

  const activeCategory = first(sp.kategori) ?? null;
  const sort = parseSort(first(sp.urut));
  const requestedPage = Number.parseInt(first(sp.hal) ?? '1', 10);

  const [categories, result] = await Promise.all([
    getCategories(),
    getCatalogPage({
      categorySlug: activeCategory,
      sort,
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
    }),
  ]);

  const sortLabels: Record<CatalogSort, string> = {
    featured: t('sort.featured'),
    'price-asc': t('sort.priceAsc'),
    'price-desc': t('sort.priceDesc'),
    newest: t('sort.newest'),
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      {/* Category filter */}
      {categories.length > 0 && (
        <nav className="mt-6 flex flex-wrap gap-2" aria-label={t('categoryFilterLabel')}>
          <FilterChip
            href={buildQuery({ urut: sort })}
            active={!activeCategory}
            label={t('allCategories')}
          />
          {categories.map((c) => (
            <FilterChip
              key={c.id}
              href={buildQuery({ kategori: c.slug, urut: sort })}
              active={activeCategory === c.slug}
              label={`${c.name} (${c.productCount})`}
            />
          ))}
        </nav>
      )}

      {/* Sort + count */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <p className="text-sm text-[var(--color-muted)]">
          {t('resultCount', { count: result.total })}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[var(--color-muted)]">{t('sortLabel')}:</span>
          {CATALOG_SORTS.map((s) => (
            <FilterChip
              key={s}
              href={buildQuery({ kategori: activeCategory, urut: s })}
              active={sort === s}
              label={sortLabels[s]}
            />
          ))}
        </div>
      </div>

      {result.items.length === 0 ? (
        <p className="mt-8 rounded border border-dashed p-8 text-center text-[var(--color-muted)]">
          {result.total === 0 && !activeCategory ? t('emptySeed') : t('empty')}
        </p>
      ) : (
        <>
          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {result.items.map((p) => (
              <li key={p.id} className="group rounded border transition-colors hover:border-brand">
                <Link href={`/produk/${p.slug}`} className="block p-4">
                  <div className="relative aspect-square overflow-hidden rounded bg-[var(--color-accent,#e5e7eb)]">
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.imageAlt ?? p.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                    {!p.inStock && (
                      <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs text-white">
                        {t('outOfStock')}
                      </span>
                    )}
                    {p.type === 'bundle' && (
                      <span className="absolute right-2 top-2 rounded bg-brand px-2 py-0.5 text-xs text-brand-foreground">
                        {t('bundleBadge')}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-medium">{p.name}</p>
                  {p.categoryName && (
                    <p className="text-xs text-[var(--color-muted)]">{p.categoryName}</p>
                  )}
                  {p.priceFromIdr != null && (
                    <p className="mt-1 text-sm">
                      <span className="text-[var(--color-muted)]">{t('from')} </span>
                      {formatIdr(p.priceFromIdr)}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {result.totalPages > 1 && (
            <nav
              className="mt-10 flex items-center justify-center gap-4 text-sm"
              aria-label={t('paginationLabel')}
            >
              {result.page > 1 ? (
                <Link
                  href={buildQuery({
                    kategori: activeCategory,
                    urut: sort,
                    hal: result.page - 1,
                  })}
                  className="rounded border px-3 py-2 hover:border-brand"
                  rel="prev"
                >
                  ← {t('prev')}
                </Link>
              ) : (
                <span className="rounded border px-3 py-2 opacity-40">← {t('prev')}</span>
              )}
              <span className="text-[var(--color-muted)]">
                {t('pageOf', { page: result.page, total: result.totalPages })}
              </span>
              {result.page < result.totalPages ? (
                <Link
                  href={buildQuery({
                    kategori: activeCategory,
                    urut: sort,
                    hal: result.page + 1,
                  })}
                  className="rounded border px-3 py-2 hover:border-brand"
                  rel="next"
                >
                  {t('next')} →
                </Link>
              ) : (
                <span className="rounded border px-3 py-2 opacity-40">{t('next')} →</span>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? 'border-brand bg-brand text-brand-foreground'
          : 'border-[var(--color-accent,#e5e7eb)] hover:border-brand'
      }`}
    >
      {label}
    </Link>
  );
}
