import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { isValidLocale, routing } from '@/i18n/routing';
import { clientConfig } from '../../../client.config';
import { tr } from '@lombok-exotic/core/config';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title = clientConfig.name;
  const description = tr(clientConfig.description, locale);
  return {
    metadataBase: new URL(clientConfig.seo.siteUrl),
    title: { default: `${title} — ${tr(clientConfig.tagline, locale)}`, template: `%s — ${title}` },
    description,
    openGraph: { title, description, images: [clientConfig.seo.defaultOgImage], locale },
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])) },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider>
          <SiteHeader locale={locale} />
          <main className="flex-1">{children}</main>
          <SiteFooter locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
