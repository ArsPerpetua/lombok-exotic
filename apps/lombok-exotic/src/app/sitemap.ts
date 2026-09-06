import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getAllProductSlugs } from '@/lib/catalog';
import { getAllArticleSlugs } from '@/lib/content';
import { clientConfig } from '../../client.config';

// Keep in step with the storefront ISR window (lib/seo.ts).
export const revalidate = 300;

const STATIC_PATHS = ['', '/katalog', '/artikel', '/tentang', '/pesanan-rombongan'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = clientConfig.seo.siteUrl.replace(/\/$/, '');
  const [products, articleSlugs] = await Promise.all([getAllProductSlugs(), getAllArticleSlugs()]);
  const now = new Date();

  /** hreflang `alternates.languages` for a locale-prefixed path. */
  const langs = (path: string) =>
    Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}${path}`]));

  const entries: MetadataRoute.Sitemap = [];

  for (const path of STATIC_PATHS) {
    entries.push({
      url: `${base}/${routing.defaultLocale}${path}`,
      lastModified: now,
      changeFrequency: path === '' ? 'weekly' : 'monthly',
      priority: path === '' ? 1 : 0.7,
      alternates: { languages: langs(path) },
    });
  }

  for (const product of products) {
    const path = `/produk/${product.slug}`;
    entries.push({
      url: `${base}/${routing.defaultLocale}${path}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: { languages: langs(path) },
    });
  }

  // Articles are authored per-locale (not mirrored), so each is its own entry.
  for (const article of articleSlugs) {
    entries.push({
      url: `${base}/${article.locale}/artikel/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  }

  return entries;
}
