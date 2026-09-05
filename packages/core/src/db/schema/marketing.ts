import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { primaryId, timestamps } from './_shared';
import { bannerPosition, contentStatus, discountType, locale } from './enums';

export const vouchers = pgTable(
  'vouchers',
  {
    id: primaryId('vch'),
    code: varchar('code', { length: 40 }).notNull().unique(),
    description: text('description'),
    discountType: discountType('discount_type').notNull(),
    discountValue: integer('discount_value').notNull(),
    minOrderValueIdr: integer('min_order_value_idr'),
    maxDiscountIdr: integer('max_discount_idr'),
    usageLimit: integer('usage_limit'),
    usedCount: integer('used_count').notNull().default(0),
    perCustomerLimit: integer('per_customer_limit').notNull().default(1),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [index('vouchers_active_idx').on(t.isActive)],
);

// Redemption ledger — enforces per-customer limits and feeds promo reporting.
// FK to orders is added via relations (avoids a schema import cycle).
export const voucherRedemptions = pgTable(
  'voucher_redemptions',
  {
    id: primaryId('vrd'),
    voucherId: varchar('voucher_id', { length: 30 })
      .notNull()
      .references(() => vouchers.id, { onDelete: 'cascade' }),
    orderId: varchar('order_id', { length: 30 }).notNull(),
    customerId: varchar('customer_id', { length: 30 }),
    amountIdr: integer('amount_idr').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('voucher_redemption_order_unique').on(t.voucherId, t.orderId),
    index('voucher_redemptions_customer_idx').on(t.customerId),
  ],
);

export const banners = pgTable(
  'banners',
  {
    id: primaryId('ban'),
    title: text('title'),
    imageUrl: text('image_url').notNull(),
    linkUrl: text('link_url'),
    position: bannerPosition('position').notNull().default('hero'),
    locale: locale('locale').notNull().default('id'),
    sortOrder: integer('sort_order').notNull().default(0),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [index('banners_position_idx').on(t.position, t.locale)],
);

export const articles = pgTable(
  'articles',
  {
    id: primaryId('art'),
    slug: varchar('slug', { length: 180 }).notNull(),
    locale: locale('locale').notNull().default('id'),
    title: text('title').notNull(),
    excerpt: text('excerpt'),
    body: text('body').notNull().default(''),
    coverImageUrl: text('cover_image_url'),
    author: text('author'),
    status: contentStatus('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    ...timestamps,
  },
  (t) => [unique('articles_slug_locale_unique').on(t.slug, t.locale)],
);

// Editable static pages (about, brand story, FAQ, shipping policy).
export const contentPages = pgTable(
  'content_pages',
  {
    id: primaryId('pag'),
    slug: varchar('slug', { length: 120 }).notNull(),
    locale: locale('locale').notNull().default('id'),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    status: contentStatus('status').notNull().default('draft'),
    ...timestamps,
  },
  (t) => [unique('content_pages_slug_locale_unique').on(t.slug, t.locale)],
);
