import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getAllProductSlugs } from '@/lib/catalog';
import { clientConfig } from '../../client.config';

const STATIC_PATHS = ['', '/katalog', '/artikel', '/tentang', '/pesanan-rombongan'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = clientConfig.seo.siteUrl.replace(/\/$/, '');
  const products = await getAllProductSlugs();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [];

  for (const path of STATIC_PATHS) {
    for (const locale of routing.locales) {
      entries.push({
        url: `${base}/${locale}${path}`,
        lastModified: now,
        changeFrequency: path === '' ? 'weekly' : 'monthly',
        priority: path === '' ? 1 : 0.7,
      });
    }
  }

  for (const product of products) {
    for (const locale of routing.locales) {
      entries.push({
        url: `${base}/${locale}/produk/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  return entries;
}
