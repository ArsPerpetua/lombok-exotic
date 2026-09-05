import { setRequestLocale } from 'next-intl/server';
import { db, schema } from '@lombok-exotic/core/db';
import { and, eq } from 'drizzle-orm';
import { clientConfig } from '../../../../client.config';
import { tr } from '@lombok-exotic/core/config';

export const metadata = { title: 'Tentang' };

async function loadPage(locale: 'id' | 'en') {
  try {
    return await db.query.contentPages.findFirst({
      where: and(
        eq(schema.contentPages.slug, 'tentang'),
        eq(schema.contentPages.locale, locale),
        eq(schema.contentPages.status, 'published'),
      ),
    });
  } catch {
    return null;
  }
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await loadPage(locale === 'en' ? 'en' : 'id');

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">{page?.title ?? `Tentang ${clientConfig.name}`}</h1>
      <div className="prose mt-4 whitespace-pre-line text-[var(--color-fg)]">
        {page?.body ?? tr(clientConfig.description, locale)}
      </div>
    </div>
  );
}
