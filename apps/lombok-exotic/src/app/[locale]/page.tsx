import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { formatIdr } from '@lombok-exotic/core/money';
import { clientConfig } from '../../../client.config';
import { tr } from '@lombok-exotic/core/config';
import { getCategories, getFeaturedProducts } from '@/lib/catalog';
import { getLatestArticles } from '@/lib/content';
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo';

// ISR: storefront data may be up to 5 min stale; admin edits also revalidate on demand.
export const revalidate = 300;

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Hero (kept) ─────────────────────────────────────────────────── */}
      <section className="bg-black text-white">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-dark.svg"
            alt={`${clientConfig.name} — ${tr(clientConfig.tagline, locale)}`}
            width={520}
            height={229}
            className="mx-auto w-full max-w-md"
          />
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

      {/* ── Trust strip ─────────────────────────────────────────────────── */}
      <div className="border-y bg-[var(--color-accent,#f4f4f5)]/40">
        <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6 py-3 text-center text-xs text-[var(--color-muted)] sm:text-sm">
          <li>{t('trust.hki')}</li>
          <li aria-hidden className="hidden sm:block">·</li>
          <li>{t('trust.shipping')}</li>
          <li aria-hidden className="hidden sm:block">·</li>
          <li>{t('trust.weight')}</li>
          <li aria-hidden className="hidden sm:block">·</li>
          <li>{t('trust.store')}</li>
        </ul>
      </div>

      {/* ── Browse by category ──────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <SectionHead title={t('categoriesTitle')} lead={t('categoriesLead')} />
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/katalog?kategori=${c.slug}`}
                  className="group flex aspect-square flex-col justify-between rounded-lg bg-black p-4 text-white transition-colors hover:bg-brand"
                >
                  <span className="text-[11px] uppercase tracking-wider text-white/50">
                    {c.productCount} {t('itemsWord')}
                  </span>
                  <span className="font-display text-lg leading-tight">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Featured products ───────────────────────────────────────────── */}
      <section className="bg-[var(--color-accent,#f4f4f5)]/30 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-end justify-between gap-4">
            <SectionHead title={t('featured')} lead={t('featuredLead')} />
            <Link
              href="/katalog"
              className="whitespace-nowrap text-sm font-medium text-brand hover:underline"
            >
              {t('viewAll')} →
            </Link>
          </div>

          {products.length === 0 ? (
            <p className="mt-8 rounded border border-dashed p-8 text-center text-[var(--color-muted)]">
              {t('emptyCatalog')}
            </p>
          ) : (
            <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <li
                  key={p.id}
                  className="group overflow-hidden rounded-lg border bg-[var(--color-bg,#fff)] transition-shadow hover:shadow-lg"
                >
                  <Link href={`/produk/${p.slug}`} className="block">
                    <div className="relative aspect-square overflow-hidden bg-[var(--color-accent,#e5e7eb)]">
                      {p.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imageUrl}
                          alt={p.imageAlt ?? p.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      )}
                      {p.type === 'bundle' && (
                        <span className="absolute left-2 top-2 rounded bg-brand px-2 py-0.5 text-xs text-brand-foreground">
                          {t('bundleBadge')}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      {p.categoryName && (
                        <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
                          {p.categoryName}
                        </p>
                      )}
                      <p className="mt-1 text-sm font-medium">{p.name}</p>
                      {p.priceFromIdr != null && (
                        <p className="mt-1 text-sm">
                          <span className="text-[var(--color-muted)]">{t('priceFrom')} </span>
                          {formatIdr(p.priceFromIdr)}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Why us (differentiators, dark) ──────────────────────────────── */}
      <section className="bg-black py-16 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-2xl text-brand sm:text-3xl">{t('whyTitle')}</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <Feature title={t('why.storyTitle')} body={t('why.storyBody')} />
            <Feature title={t('why.packTitle')} body={t('why.packBody')} />
            <Feature title={t('why.shipTitle')} body={t('why.shipBody')} />
          </div>
        </div>
      </section>

      {/* ── Group pre-order (the differentiator) ────────────────────────── */}
      {clientConfig.features.groupPreorder && (
        <section className="border-y-4 border-brand">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-14 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                {t('groupKicker')}
              </p>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl">{t('groupTitle')}</h2>
              <p className="mt-3 text-[var(--color-muted)]">{t('groupBody')}</p>
            </div>
            <Link
              href="/pesanan-rombongan"
              className="shrink-0 self-start rounded bg-black px-6 py-3 font-medium text-white hover:bg-brand md:self-auto"
            >
              {t('groupCtaFull')}
            </Link>
          </div>
        </section>
      )}

      {/* ── Story + latest article ──────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl">{t('storyTitle')}</h2>
            <p className="mt-4 whitespace-pre-line text-[var(--color-muted)]">{t('storyBody')}</p>
            <Link
              href="/tentang"
              className="mt-6 inline-block rounded border border-brand px-5 py-2 text-sm font-medium text-brand hover:bg-brand/5"
            >
              {t('storyCta')}
            </Link>
          </div>

          {articles.length > 0 && (
            <div>
              <h2 className="font-display text-2xl sm:text-3xl">{t('articlesTitle')}</h2>
              <ul className="mt-4 divide-y">
                {articles.map((a) => (
                  <li key={a.slug} className="py-4">
                    <Link href={`/artikel/${a.slug}`} className="group block">
                      <p className="font-medium group-hover:text-brand">{a.title}</p>
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
      <section className="bg-black py-14 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 text-center">
          <h2 className="font-display text-2xl sm:text-3xl">{t('contactTitle')}</h2>
          <p className="mx-auto max-w-lg text-white/70">{t('contactBody')}</p>
          <div className="mx-auto mt-2 flex flex-wrap justify-center gap-3">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-brand px-6 py-3 font-medium text-brand-foreground"
            >
              {t('contactCta')}
            </a>
            <Link
              href="/lacak"
              className="rounded border border-white/40 px-6 py-3 font-medium hover:bg-white/10"
            >
              {t('trackCta')}
            </Link>
          </div>
          {clientConfig.contact.addressLine && (
            <p className="mt-4 text-sm text-white/50">
              {t('visitUs')}: {clientConfig.contact.addressLine}
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function SectionHead({ title, lead }: { title: string; lead?: string }) {
  return (
    <div>
      <h2 className="font-display text-2xl sm:text-3xl">{title}</h2>
      {lead && <p className="mt-2 max-w-xl text-[var(--color-muted)]">{lead}</p>}
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-white/20 pt-5">
      <h3 className="font-display text-lg text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/70">{body}</p>
    </div>
  );
}
