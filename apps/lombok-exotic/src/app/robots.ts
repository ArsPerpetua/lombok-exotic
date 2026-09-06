import type { MetadataRoute } from 'next';
import { clientConfig } from '../../client.config';

export default function robots(): MetadataRoute.Robots {
  const base = clientConfig.seo.siteUrl.replace(/\/$/, '');
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/keranjang', '/lacak'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
