import type { MetadataRoute } from 'next';
import { clientConfig } from '../../client.config';

export default function robots(): MetadataRoute.Robots {
  const base = clientConfig.seo.siteUrl.replace(/\/$/, '');
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin',
        '/*/keranjang',
        '/*/checkout',
        '/*/lacak',
        '/*/pesanan/',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
