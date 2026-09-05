import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { primaryId, timestamps } from './_shared';
import { cartStatus, locale, orderChannel, orderStatus } from './enums';
import { customers } from './customers';
import { productVariants } from './catalog';
import { locations } from './system';
import { vouchers } from './marketing';
import { tourLeaders } from './groups';

/**
 * Guest-friendly cart. `token` lives in an httpOnly cookie; `customerId`
 * fills in when the shopper authenticates. Persisted so Phase 2 abandoned-cart
 * follow-up has data to work with.
 */
export const carts = pgTable(
  'carts',
  {
    id: primaryId('crt'),
    token: varchar('token', { length: 40 }).notNull().unique(),
    customerId: varchar('customer_id', { length: 30 }).references(() => customers.id, {
      onDelete: 'set null',
    }),
    contactPhone: varchar('contact_phone', { length: 32 }),
    contactEmail: text('contact_email'),
    status: cartStatus('status').notNull().default('active'),
    locale: locale('locale').notNull().default('id'),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [index('carts_status_activity_idx').on(t.status, t.lastActivityAt)],
);

export const cartItems = pgTable(
  'cart_items',
  {
    id: primaryId('cti'),
    cartId: varchar('cart_id', { length: 30 })
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    variantId: varchar('variant_id', { length: 30 })
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('cart_item_unique').on(t.cartId, t.variantId)],
);

export const orders = pgTable(
  'orders',
  {
    id: primaryId('ord'),
    // Human-facing, e.g. LEX-260905-0007. Generated in the app.
    orderNumber: varchar('order_number', { length: 24 }).notNull().unique(),
    customerId: varchar('customer_id', { length: 30 })
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    locationId: varchar('location_id', { length: 30 }).references(() => locations.id, {
      onDelete: 'set null',
    }),
    channel: orderChannel('channel').notNull().default('online'),
    status: orderStatus('status').notNull().default('pending_payment'),
    currency: varchar('currency', { length: 3 }).notNull().default('IDR'),
    subtotalIdr: integer('subtotal_idr').notNull().default(0),
    discountTotalIdr: integer('discount_total_idr').notNull().default(0),
    shippingTotalIdr: integer('shipping_total_idr').notNull().default(0),
    grandTotalIdr: integer('grand_total_idr').notNull().default(0),
    voucherId: varchar('voucher_id', { length: 30 }).references(() => vouchers.id, {
      onDelete: 'set null',
    }),
    // Sales attribution to the tour leader / driver who referred the buyer.
    tourLeaderId: varchar('tour_leader_id', { length: 30 }).references(() => tourLeaders.id, {
      onDelete: 'set null',
    }),
    // Shipping choice captured at checkout (courier, service, eta, rate).
    shippingSelection: jsonb('shipping_selection').$type<{
      courierCompany: string;
      courierType: string;
      serviceName: string;
      etd: string | null;
      priceIdr: number;
    } | null>(),
    customerNote: text('customer_note'),
    internalNote: text('internal_note'),
    placedAt: timestamp('placed_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('orders_status_idx').on(t.status),
    index('orders_customer_idx').on(t.customerId),
    index('orders_placed_idx').on(t.placedAt),
    index('orders_channel_idx').on(t.channel),
  ],
);

/**
 * Line items snapshot product/variant data at purchase time so history
 * survives later catalog edits. `variantId` is nullable for that reason.
 */
export const orderItems = pgTable(
  'order_items',
  {
    id: primaryId('oit'),
    orderId: varchar('order_id', { length: 30 })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    variantId: varchar('variant_id', { length: 30 }).references(() => productVariants.id, {
      onDelete: 'set null',
    }),
    productName: text('product_name').notNull(),
    variantName: text('variant_name').notNull(),
    sku: varchar('sku', { length: 64 }).notNull(),
    unitPriceIdr: integer('unit_price_idr').notNull(),
    quantity: integer('quantity').notNull(),
    weightGrams: integer('weight_grams').notNull(),
    lineTotalIdr: integer('line_total_idr').notNull(),
  },
  (t) => [index('order_items_order_idx').on(t.orderId)],
);

// Ordered status history for the order timeline shown to staff and customer.
export const orderEvents = pgTable(
  'order_events',
  {
    id: primaryId('oev'),
    orderId: varchar('order_id', { length: 30 })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: orderStatus('status').notNull(),
    note: text('note'),
    actorLabel: text('actor_label'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('order_events_order_idx').on(t.orderId)],
);
