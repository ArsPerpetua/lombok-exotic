import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { formatIdr } from '@lombok-exotic/core/money';
import type { CatalogItem } from '@/lib/catalog';
import { clientConfig } from '../../../client.config';
import { tr } from '@lombok-exotic/core/config';
import { getCategories, getFeaturedProducts } from '@/lib/catalog';
import { getLatestArticles } from '@/lib/content';
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo';
import { IkatBand } from '@/components/ikat-band';
import { ScrollReveal } from '@/components/scroll-reveal';

// ISR: storefront data may be up to 5 min stale; admin edits also revalidate on demand.
export const revalidate = 300;

/** Color field per category tile — natural-dye palette, cycled. */
const CAT_TONE = [
  'bg-[var(--color-indigo)] text-white',
  'bg-brand text-brand-foreground',
  'bg-[var(--color-timber)] text-white',
  'bg-[var(--color-turmeric-fill)] text-[var(--color-timber)]',
  'bg-[var(--color-indigo-deep)] text-white',
  'bg-brand text-brand-foreground',
];
const WEAVE = ['weave-1', 'weave-2', 'weave-3', 'weave-4'];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  const jsonLd = [organizationJsonLd(locale), websiteJsonLd(locale)];

  const [products, categories, articles] = await Promise.all([
    getFeaturedProducts(8),
    getCategories(),
    getLatestArticles(locale, 3),
  ]);

  const waHref = `https://wa.me/${clientConfig.contact.whatsapp}`;
  const heroProduct = products[0];
  const railProducts = products.slice(1, 4);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ScrollReveal />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative isolate flex min-h-[86vh] items-end overflow-hidden bg-[var(--color-indigo-deep)] text-white">
        <div
          id="hero-ikat"
          aria-hidden
          className="ikat-field pointer-events-none absolute -right-[6%] -top-[8%] z-0 h-[116%] w-[min(60%,720px)] opacity-90 [clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 z-[1] bg-[linear-gradient(105deg,var(--color-indigo-deep)_36%,transparent_80%)]"
        />
        <div className="relative z-[2] mx-auto w-full max-w-6xl px-6 pb-[clamp(3rem,7vw,5rem)] pt-[clamp(7rem,14vw,10rem)]">
          <p className="eyebrow eyebrow--on-dark">{tr(clientConfig.tagline, locale)}</p>
          <h1 className="font-display mt-6 max-w-[15ch] text-[clamp(2.6rem,2rem+6vw,6rem)] font-light leading-[1.02]">
            {t('heroTitle')}
          </h1>
          <p className="mt-6 max-w-[34ch] text-white/75 sm:text-lg">{t('heroSubtitle')}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/katalog" className="btn btn-fill">
              {t('shopNow')}
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            {clientConfig.features.groupPreorder && (
              <Link href="/pesanan-rombongan" className="btn btn-line">
                {t('groupCta')}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Trust ticker ────────────────────────────────────────────────── */}
      <div className="bg-[var(--color-timber)]">
        <ul className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-10 gap-y-2 px-6 py-4 text-center text-xs uppercase tracking-[0.14em] text-white/55">
          {[t('trust.hki'), t('trust.shipping'), t('trust.weight'), t('trust.store')].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span aria-hidden className="h-1 w-1 rotate-45 bg-[var(--color-turmeric-fill)]" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Browse by category ──────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-[clamp(4rem,9vw,7rem)]">
          <div className="reveal mb-[clamp(2rem,5vw,3rem)] flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{t('categoriesTitle')}</p>
              <h2 className="font-display mt-3 max-w-[16ch] text-[clamp(1.8rem,1.4rem+2vw,3rem)] font-light leading-[1.08]">
                {t('categoriesLead')}
              </h2>
            </div>
            <Link
              href="/katalog"
              className="border-b-[1.5px] border-brand pb-0.5 text-sm font-semibold text-brand"
            >
              {t('viewAll')}
            </Link>
          </div>
          <ul className="reveal grid grid-cols-2 gap-1.5 lg:grid-cols-3 [&>li]:min-h-[190px]">
            {categories.map((c, i) => (
              <li key={c.id} className={i === 0 ? 'col-span-2 lg:row-span-2' : ''}>
                <Link
                  href={`/katalog?kategori=${c.slug}`}
                  className={`group relative flex h-full flex-col justify-between overflow-hidden p-5 ${
                    CAT_TONE[i % CAT_TONE.length]
                  }`}
                >
                  <span className="text-[11px] uppercase tracking-[0.18em] opacity-70">
                    {c.productCount} {t('itemsWord')}
                  </span>
                  <span className="font-display text-xl leading-tight sm:text-2xl">{c.name}</span>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 opacity-40 transition-transform duration-500 group-hover:scale-110 [background-size:14px_14px] [background:repeating-linear-gradient(45deg,rgba(255,255,255,0.3)_0_2px,transparent_2px_12px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.3)_0_2px,transparent_2px_12px)]"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <IkatBand className="ikat-band--xl" />

      {/* ── Featured products (scale contrast) ──────────────────────────── */}
      <section className="bg-[var(--color-panel,#fdfbf5)] py-[clamp(4rem,9vw,7rem)]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="reveal mb-[clamp(2rem,5vw,3rem)] flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{t('featured')}</p>
              <h2 className="font-display mt-3 max-w-[16ch] text-[clamp(1.8rem,1.4rem+2vw,3rem)] font-light leading-[1.08]">
                {t('featuredLead')}
              </h2>
            </div>
            <Link
              href="/katalog"
              className="border-b-[1.5px] border-brand pb-0.5 text-sm font-semibold text-brand"
            >
              {t('viewAll')}
            </Link>
          </div>

          {products.length === 0 ? (
            <p className="border border-dashed p-8 text-center text-[var(--color-muted)]">
              {t('emptyCatalog')}
            </p>
          ) : (
            <div className="reveal grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
              {heroProduct && (
                <ProductCard
                  p={heroProduct}
                  index={0}
                  hero
                  fromLabel={t('priceFrom')}
                  bundleLabel={t('bundleBadge')}
                />
              )}
              <div className="grid gap-8">
                {railProducts.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    index={i + 1}
                    fromLabel={t('priceFrom')}
                    bundleLabel={t('bundleBadge')}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Why us (editorial, dark) ────────────────────────────────────── */}
      <section className="bg-[var(--color-timber)] py-[clamp(4rem,9vw,7rem)] text-white">
        <div className="reveal mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <h2 className="font-display max-w-[12ch] text-[clamp(2rem,1.5rem+3vw,3.6rem)] font-light leading-[1.04]">
            {t('whyTitle')}
          </h2>
          <div className="grid gap-6">
            {[
              { title: t('why.storyTitle'), body: t('why.storyBody') },
              { title: t('why.packTitle'), body: t('why.packBody') },
              { title: t('why.shipTitle'), body: t('why.shipBody') },
            ].map((it, i) => (
              <div
                key={it.title}
                className="grid grid-cols-[auto_1fr] gap-4 border-t border-white/15 pt-5"
              >
                <span className="font-display text-lg text-[var(--color-turmeric-fill)]">
                  0{i + 1}
                </span>
                <div>
                  <b className="font-display text-[1.05rem] font-medium">{it.title}</b>
                  <p className="mt-1 text-sm text-white/65">{it.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Group pre-order (the differentiator — loud) ─────────────────── */}
      {clientConfig.features.groupPreorder && (
        <section className="text-brand-foreground relative overflow-hidden bg-brand py-[clamp(4rem,9vw,7rem)]">
          <div
            aria-hidden
            className="absolute -left-[8%] -top-[40%] h-[180%] w-[45%] -rotate-6 opacity-[0.16] [background-size:18px_18px] [background:repeating-linear-gradient(45deg,#fff_0_3px,transparent_3px_16px),repeating-linear-gradient(-45deg,#fff_0_3px,transparent_3px_16px)]"
          />
          <div className="reveal relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-8 px-6">
            <div className="max-w-xl">
              <p className="eyebrow eyebrow--on-dark">{t('groupKicker')}</p>
              <h2 className="font-display mt-3 max-w-[14ch] text-[clamp(2rem,1.5rem+3vw,3.6rem)] font-light leading-[1.04]">
                {t('groupTitle')}
              </h2>
              <p className="mt-4 max-w-[40ch] text-[#fdf4f2]/85">{t('groupBody')}</p>
            </div>
            <Link
              href="/pesanan-rombongan"
              className="btn bg-[#fdf4f2] text-[var(--color-brand)] hover:bg-white"
            >
              {t('groupCtaFull')}
            </Link>
          </div>
        </section>
      )}

      {/* ── Story + latest articles ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-[clamp(4rem,9vw,7rem)]">
        <div className="reveal grid gap-[clamp(2.5rem,7vw,5rem)] md:grid-cols-2">
          <div>
            <p className="eyebrow">{t('storyCta')}</p>
            <h2 className="font-display mt-3 text-[clamp(1.6rem,1.3rem+1.4vw,2.4rem)] font-normal leading-[1.1]">
              {t('storyTitle')}
            </h2>
            <p className="mt-4 whitespace-pre-line text-[var(--color-muted)]">{t('storyBody')}</p>
            <Link href="/tentang" className="btn btn-line mt-6 text-brand">
              {t('storyCta')}
            </Link>
          </div>

          {articles.length > 0 && (
            <div>
              <p className="eyebrow">{t('articlesTitle')}</p>
              <ul className="mt-3">
                {articles.map((a) => (
                  <li key={a.slug} className="border-t py-4 last:border-b">
                    <Link href={`/artikel/${a.slug}`} className="group block">
                      <p className="font-display text-lg font-normal group-hover:text-brand">
                        {a.title}
                      </p>
                      {a.excerpt && (
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">
                          {a.excerpt}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ── Contact band ────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-indigo-deep)] py-[clamp(4rem,9vw,6.5rem)] text-center text-white">
        <div className="reveal mx-auto flex max-w-6xl flex-col items-center px-6">
          <p className="eyebrow eyebrow--on-dark">{t('contactCta')}</p>
          <h2 className="font-display mt-3 max-w-[16ch] text-[clamp(2rem,1.5rem+3vw,3.6rem)] font-light leading-[1.04]">
            {t('contactTitle')}
          </h2>
          <p className="mt-4 max-w-[40ch] text-white/70">{t('contactBody')}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn btn-fill">
              {t('contactCta')}
            </a>
            <Link href="/lacak" className="btn btn-line">
              {t('trackCta')}
            </Link>
          </div>
          {clientConfig.contact.addressLine && (
            <p className="mt-6 text-sm text-white/50">
              {t('visitUs')}: {clientConfig.contact.addressLine}
            </p>
          )}
        </div>
      </section>

      <IkatBand className="ikat-band--xl" />
    </>
  );
}

function ProductCard({
  p,
  index,
  hero = false,
  fromLabel,
  bundleLabel,
}: {
  p: CatalogItem;
  index: number;
  hero?: boolean;
  fromLabel: string;
  bundleLabel: string;
}) {
  return (
    <Link href={`/produk/${p.slug}`} className="group block">
      <div className={`relative overflow-hidden ${hero ? 'aspect-square' : 'aspect-[4/3]'}`}>
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imageUrl}
            alt={p.imageAlt ?? p.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span
            aria-hidden
            className={`absolute inset-0 transition-transform duration-500 group-hover:scale-105 ${
              WEAVE[index % WEAVE.length]
            }`}
          />
        )}
        {p.type === 'bundle' && (
          <span className="text-brand-foreground absolute left-3 top-3 bg-brand px-2 py-0.5 text-xs">
            {bundleLabel}
          </span>
        )}
      </div>
      <div className="pt-3">
        {p.categoryName && (
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-turmeric)]">
            {p.categoryName}
          </p>
        )}
        <p
          className={`font-display mt-1 leading-snug ${
            hero ? 'text-[clamp(1.5rem,1.2rem+1.4vw,2.3rem)]' : 'text-base sm:text-lg'
          }`}
        >
          {p.name}
        </p>
        {p.priceFromIdr != null && (
          <p className="mt-1 text-sm tabular-nums">
            <span className="text-[var(--color-muted)]">{fromLabel} </span>
            {formatIdr(p.priceFromIdr)}
          </p>
        )}
      </div>
    </Link>
  );
}
