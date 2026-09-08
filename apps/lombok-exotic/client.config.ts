import { defineClientConfig } from '@lombok-exotic/core/config';

/**
 * The only client-specific file in the app. A second client (Sasaku) is a
 * copy of apps/lombok-exotic with a different config, theme + content —
 * zero changes to @lombok-exotic/core.
 */
export const clientConfig = defineClientConfig({
  key: 'lombok-exotic',
  name: 'Lombok Exotic',
  legalName: 'Lombok Exotic (HKI terdaftar, Kemenkumham RI)',
  tagline: {
    id: 'Oleh-Oleh, Cafe Resto & Bajang Bus',
    en: 'Lombok Souvenirs, Cafe Resto & Bajang Bus',
  },
  description: {
    id: 'Toko oleh-oleh terbesar di Senggigi, Lombok Barat. Tenun ikat, perak, kaos, makanan khas — kirim ke seluruh Indonesia.',
    en: "Senggigi's largest souvenir store. Handwoven ikat, silver, tees, local food — shipped across Indonesia.",
  },
  locales: { default: 'id', supported: ['id', 'en'] },
  currency: 'IDR',
  contact: {
    whatsapp: '6281900000000',
    email: 'halo@lombokexotic.example',
    addressLine: 'Jl. Raya Senggigi, Lombok Barat',
    city: 'Lombok Barat, Nusa Tenggara Barat',
  },
  social: {},
  // Design tokens — see DESIGN.md. Palette drawn from Lombok natural dyes.
  // The rendered source of truth is globals.css; these mirror it.
  theme: {
    primary: '#9e2b25', // mengkudu (morinda)
    primaryForeground: '#fdf4f2',
    accent: '#ede3d0', // sunk / inset surfaces
    background: '#f6f1e7', // kapur (limewash)
    foreground: '#26211c', // warm near-black
    logoDark: '/brand/logo-dark.png',
    logoLight: '/brand/logo-light.png',
    fontDisplay: '"Fraunces", Georgia, serif',
    fontSans: '"Plus Jakarta Sans", system-ui, sans-serif',
  },
  features: {
    groupPreorder: true,
    tourLeaderCommission: true,
    wishlist: false,
    loyalty: false,
    blog: true,
    reseller: false,
    multiCurrency: false,
  },
  seo: {
    siteUrl: 'https://lombokexotic.example',
    defaultOgImage: '/og-default.jpg',
    organizationSameAs: [],
  },
  businessUnits: [
    { key: 'oleh-oleh', label: { id: 'Toko Oleh-Oleh', en: 'Souvenir Store' } },
    { key: 'cafe-resto', label: { id: 'Cafe & Resto', en: 'Cafe & Resto' } },
    { key: 'bajang-bus', label: { id: 'Bajang Bus (Tour Bus)', en: 'Bajang Bus (Tour Bus)' } },
  ],
});

export type { ClientConfig } from '@lombok-exotic/core/config';
