import { routing } from '@/i18n/routing';
import { clientConfig } from '../../client.config';

/**
 * ISR window for pages holding storefront / CMS data. Next requires the
 * `export const revalidate` value to be a literal, so each page repeats `300`
 * with a comment pointing here — keep them in sync.
 */
export const CONTENT_REVALIDATE_SECONDS = 300;

const BASE = clientConfig.seo.siteUrl.replace(/\/$/, '');

/**
 * `alternates` for a locale-prefixed path (pass it WITHOUT the leading locale,
 * e.g. `/katalog` or `/produk/foo`). Emits a self-canonical plus hreflang
 * entries for every supported locale + `x-default`.
 */
export function localizedAlternates(locale: string, pathWithoutLocale: string) {
  const path = pathWithoutLocale === '/' ? '' : pathWithoutLocale;
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `/${l}${path}`;
  languages['x-default'] = `/${routing.defaultLocale}${path}`;
  return { canonical: `/${locale}${path}`, languages };
}

/** Organization schema — emit once, on the homepage. */
export function organizationJsonLd(locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: clientConfig.name,
    legalName: clientConfig.legalName ?? clientConfig.name,
    url: `${BASE}/${locale}`,
    logo: `${BASE}${clientConfig.theme.logoLight}`,
    image: `${BASE}${clientConfig.seo.defaultOgImage}`,
    ...(clientConfig.contact.whatsapp
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: `+${clientConfig.contact.whatsapp}`,
            contactType: 'customer service',
            areaServed: 'ID',
            availableLanguage: ['id', 'en'],
          },
        }
      : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: clientConfig.contact.addressLine,
      addressLocality: clientConfig.contact.city,
      addressRegion: 'Nusa Tenggara Barat',
      addressCountry: 'ID',
    },
    ...(clientConfig.seo.organizationSameAs?.length
      ? { sameAs: clientConfig.seo.organizationSameAs }
      : {}),
  };
}

/** WebSite schema with a catalog SearchAction. */
export function websiteJsonLd(locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: clientConfig.name,
    url: `${BASE}/${locale}`,
    inLanguage: locale,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BASE}/${locale}/katalog?cari={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}
