import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { clientConfig } from '../../../../client.config';
import { tr } from '@lombok-exotic/core/config';
import { getContentPage, renderMarkdown } from '@/lib/content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getContentPage(locale, 'tentang');
  const title = page?.metaTitle ?? page?.title ?? `Tentang ${clientConfig.name}`;
  return {
    title,
    description: page?.metaDescription ?? tr(clientConfig.description, locale),
    alternates: { canonical: `/${locale}/tentang` },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getContentPage(locale, 'tentang');
  const bodyHtml = page?.body
    ? renderMarkdown(page.body)
    : renderMarkdown(tr(clientConfig.description, locale));

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl">{page?.title ?? `Tentang ${clientConfig.name}`}</h1>
      <div className="article-body mt-6" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </div>
  );
}
