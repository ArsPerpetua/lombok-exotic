import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { clientConfig } from '../../../../../client.config';
import { getArticle, getAllArticleSlugs, renderMarkdown } from '@/lib/content';

// ISR: prerender known articles, revalidate every 5 min, allow new slugs on demand.
export const revalidate = 300;

interface RouteParams {
  locale: string;
  slug: string;
}

export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs();
  return slugs.map((s) => ({ locale: s.locale, slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getArticle(locale, slug);
  if (!article) return {};
  const description = article.metaDescription ?? article.excerpt ?? undefined;
  const url = `/${locale}/artikel/${slug}`;
  return {
    title: article.metaTitle ?? article.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: article.title,
      description,
      url,
      images: article.coverImageUrl ? [article.coverImageUrl] : [clientConfig.seo.defaultOgImage],
      publishedTime: article.publishedAt?.toISOString(),
    },
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

export default async function ArticlePage({ params }: { params: Promise<RouteParams> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('article');
  const article = await getArticle(locale, slug);
  if (!article) notFound();

  const html = renderMarkdown(article.body);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.metaDescription ?? article.excerpt ?? undefined,
    image: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: { '@type': 'Organization', name: article.author ?? clientConfig.name },
    publisher: { '@type': 'Organization', name: clientConfig.name },
  };

  return (
    <article className="mx-auto max-w-2xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-[var(--color-muted)]">
        <Link href="/artikel" className="hover:text-brand">
          {t('crumb')}
        </Link>
      </nav>

      <h1 className="font-display mt-2 text-3xl leading-tight">{article.title}</h1>
      <p className="mt-3 text-xs uppercase tracking-wide text-[var(--color-muted)]">
        {fmtDate(article.publishedAt, locale)}
        {article.author ? ` · ${article.author}` : ''}
      </p>

      {article.coverImageUrl && (
        <div className="mt-6 aspect-[16/9] overflow-hidden rounded-lg bg-[var(--color-accent,#e5e7eb)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.coverImageUrl}
            alt={article.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="article-body mt-8" dangerouslySetInnerHTML={{ __html: html }} />

      <div className="bg-[var(--color-accent,#f4f4f5)]/40 mt-12 rounded-lg border p-6 text-center">
        <p className="font-medium">{t('ctaTitle')}</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{t('ctaBody')}</p>
        <Link
          href="/katalog"
          className="bg-brand text-brand-foreground mt-4 inline-block rounded px-5 py-2 text-sm font-medium"
        >
          {t('ctaButton')}
        </Link>
      </div>

      <Link href="/artikel" className="text-brand mt-8 inline-block text-sm hover:underline">
        ← {t('backToList')}
      </Link>
    </article>
  );
}
