import { z } from 'zod';

/**
 * Everything client-specific about a storefront lives here. The core code and
 * schema know nothing about "Lombok Exotic" or "Bajang Bus" — a second client
 * (Sasaku) is a new `client.config.ts` + theme + content, no core changes.
 */
export const clientConfigSchema = z.object({
  /** Stable slug, used for asset paths and the deploy target. */
  key: z.string().min(2),
  name: z.string().min(2),
  legalName: z.string().optional(),
  tagline: z.record(z.string()).default({}),
  description: z.record(z.string()).default({}),

  locales: z.object({
    default: z.enum(['id', 'en']),
    supported: z.array(z.enum(['id', 'en'])).min(1),
  }),
  currency: z.literal('IDR').default('IDR'),

  contact: z.object({
    whatsapp: z.string().regex(/^\d{8,15}$/, 'E.164 digits only, no + or spaces'),
    email: z.string().email().optional(),
    addressLine: z.string().optional(),
    city: z.string().optional(),
    mapsUrl: z.string().url().optional(),
  }),

  social: z
    .object({
      instagram: z.string().url().optional(),
      facebook: z.string().url().optional(),
      tiktok: z.string().url().optional(),
    })
    .default({}),

  /** Design tokens consumed by the app's Tailwind theme + CSS variables. */
  theme: z.object({
    primary: z.string(),
    primaryForeground: z.string(),
    accent: z.string(),
    background: z.string(),
    foreground: z.string(),
    logoDark: z.string(),
    logoLight: z.string(),
    fontDisplay: z.string().default('Georgia, serif'),
    fontSans: z.string().default('system-ui, sans-serif'),
  }),

  features: z
    .object({
      groupPreorder: z.boolean().default(true),
      tourLeaderCommission: z.boolean().default(true),
      wishlist: z.boolean().default(false),
      loyalty: z.boolean().default(false),
      blog: z.boolean().default(true),
      reseller: z.boolean().default(false),
      multiCurrency: z.boolean().default(false),
    })
    .default({}),

  seo: z.object({
    siteUrl: z.string().url(),
    defaultOgImage: z.string(),
    twitterHandle: z.string().optional(),
    organizationSameAs: z.array(z.string().url()).default([]),
  }),

  /** Business units for cross-sell copy (cafe/resto, tour bus). Display only. */
  businessUnits: z
    .array(z.object({ key: z.string(), label: z.record(z.string()) }))
    .default([]),
});

export type ClientConfig = z.infer<typeof clientConfigSchema>;
