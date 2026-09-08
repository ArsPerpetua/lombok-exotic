import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { clientConfig } from '../../../../client.config';
import { getPublishedArticles } from '@/lib/content';
import { localizedAlternates } from '@/lib/seo';

// ISR: see CONTENT_REVALIDATE_SECONDS in lib/seo.ts.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'article' });
  return {
    title: t('indexTitle'),
    description: t('indexLead'),
    alternates: localizedAlternates(locale, '/artikel'),
  };
}

function fmtDate(d: Date | null, locale: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString(locale === 'en' ? 'en-GB' : 'id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function ArticlesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('article');
  const articles = await getPublishedArticles(locale);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl">{t('indexTitle')}</h1>
      <p className="mt-3 max-w-xl text-[var(--color-muted)]">{t('indexLead')}</p>

      {articles.length === 0 ? (
        <p className="mt-10 rounded border border-dashed p-8 text-center text-[var(--color-muted)]">
          {t('empty')}
        </p>
      ) : (
        <ul className="mt-10 divide-y border-y">
          {articles.map((a) => (
            <li key={a.slug} className="py-6">
              <Link href={`/artikel/${a.slug}`} className="group flex gap-4">
                {a.coverImageUrl && (
                  <div className="hidden aspect-[4/3] w-32 flex-none overflow-hidden rounded bg-[var(--color-accent,#e5e7eb)] sm:block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.coverImageUrl}
                      alt={a.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
                    {fmtDate(a.publishedAt, locale)}
                    {a.author ? ` · ${a.author}` : ''}
                  </p>
                  <h2 className="font-display group-hover:text-brand mt-1 text-xl">{a.title}</h2>
                  {a.excerpt && (
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">
                      {a.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-sm text-[var(--color-muted)]">
        {t('storeCta')}{' '}
        <Link href="/katalog" className="text-brand font-medium hover:underline">
          {clientConfig.name}
        </Link>
        .
      </p>
    </div>
  );
}
