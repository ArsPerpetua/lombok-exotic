import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { primaryId, timestamps } from './_shared';
import { productStatus, productType } from './enums';
import { locations } from './system';

export const categories = pgTable(
  'categories',
  {
    id: primaryId('cat'),
    parentId: varchar('parent_id', { length: 30 }).references((): AnyPgColumn => categories.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    description: text('description'),
    imageUrl: text('image_url'),
    position: integer('position').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [index('categories_parent_idx').on(t.parentId)],
);

export const products = pgTable(
  'products',
  {
    id: primaryId('prd'),
    slug: varchar('slug', { length: 160 }).notNull().unique(),
    name: text('name').notNull(),
    categoryId: varchar('category_id', { length: 30 }).references(() => categories.id, {
      onDelete: 'set null',
    }),
    type: productType('type').notNull().default('simple'),
    status: productStatus('status').notNull().default('draft'),
    shortDescription: text('short_description'),
    description: text('description'),
    // The story behind the piece — tenun ikat motif meaning, silver craft, etc.
    // Souvenir buyers pay for provenance; also strong SEO body copy.
    story: text('story'),
    // Denormalised "from" price in IDR (minor unit = rupiah, no cents).
    // Source of truth for money is always the variant.
    priceFrom: integer('price_from'),
    isFeatured: boolean('is_featured').notNull().default(false),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    ...timestamps,
  },
  (t) => [
    index('products_status_idx').on(t.status),
    index('products_category_idx').on(t.categoryId),
    index('products_featured_idx').on(t.isFeatured),
  ],
);

export const productImages = pgTable(
  'product_images',
  {
    id: primaryId('img'),
    productId: varchar('product_id', { length: 30 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    alt: text('alt'),
    position: integer('position').notNull().default(0),
  },
  (t) => [index('product_images_product_idx').on(t.productId)],
);

/**
 * Every purchasable unit is a variant — even a "simple" product has exactly one.
 * `weightGrams` is NOT NULL and must be > 0: Biteship rate accuracy depends on it
 * and a checkout with a zero-weight line is a silent shipping-cost loss.
 */
export const productVariants = pgTable(
  'product_variants',
  {
    id: primaryId('var'),
    productId: varchar('product_id', { length: 30 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sku: varchar('sku', { length: 64 }).notNull().unique(),
    name: text('name').notNull(),
    priceIdr: integer('price_idr').notNull(),
    compareAtIdr: integer('compare_at_idr'),
    weightGrams: integer('weight_grams').notNull(),
    lengthCm: integer('length_cm'),
    widthCm: integer('width_cm'),
    heightCm: integer('height_cm'),
    stock: integer('stock').notNull().default(0),
    // Soft stock hold for in-flight checkouts (released on payment expiry).
    reserved: integer('reserved').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    // { color: "Merah", size: "L", motif: "Subahnale" }
    attributes: jsonb('attributes').$type<Record<string, string>>().notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [index('variants_product_idx').on(t.productId)],
);

/**
 * Components of a `bundle`-type product ("Paket Oleh-Oleh").
 * Stock/price of a bundle derive from its items at checkout time.
 */
export const bundleItems = pgTable(
  'bundle_items',
  {
    id: primaryId('bnd'),
    bundleProductId: varchar('bundle_product_id', { length: 30 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    variantId: varchar('variant_id', { length: 30 })
      .notNull()
      .references(() => productVariants.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull().default(1),
  },
  (t) => [
    unique('bundle_item_unique').on(t.bundleProductId, t.variantId),
    index('bundle_items_bundle_idx').on(t.bundleProductId),
  ],
);

// Stock ledger — every movement (sale, restock, manual adjust, reservation
// release) is one row so the current `stock` value is always auditable.
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: primaryId('stk'),
    variantId: varchar('variant_id', { length: 30 })
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    locationId: varchar('location_id', { length: 30 }).references(() => locations.id, {
      onDelete: 'set null',
    }),
    delta: integer('delta').notNull(),
    reason: varchar('reason', { length: 40 }).notNull(),
    reference: varchar('reference', { length: 60 }),
    note: text('note'),
    ...timestamps,
  },
  (t) => [index('stock_movements_variant_idx').on(t.variantId)],
);
