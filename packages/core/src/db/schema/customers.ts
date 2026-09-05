import { boolean, index, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { primaryId, timestamps } from './_shared';
import { customerType, discountType } from './enums';
import { user } from './auth';

/**
 * B2B pricing levels. A `retail` customer has no tier (list price).
 * `agent` / `reseller` customers point at a tier. UI for managing these
 * lands in Phase 2; the model exists now so orders can price correctly.
 */
export const priceTiers = pgTable('price_tiers', {
  id: primaryId('tier'),
  name: text('name').notNull(),
  code: varchar('code', { length: 40 }).notNull().unique(),
  discountType: discountType('discount_type').notNull(),
  discountValue: integer('discount_value').notNull(),
  minOrderValueIdr: integer('min_order_value_idr'),
  minOrderQty: integer('min_order_qty'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
});

/**
 * CRM record. Keyed by WhatsApp number (the primary identity for Indonesian
 * retail). A guest checkout creates a customer row with no `userId`;
 * an account link fills it in later.
 */
export const customers = pgTable(
  'customers',
  {
    id: primaryId('cus'),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    phone: varchar('phone', { length: 32 }).notNull().unique(),
    email: text('email'),
    type: customerType('type').notNull().default('retail'),
    priceTierId: varchar('price_tier_id', { length: 30 }).references(() => priceTiers.id, {
      onDelete: 'set null',
    }),
    companyName: text('company_name'),
    notes: text('notes'),
    // Denormalised rollups for the admin "frequent buyer" view (Phase 2).
    totalOrders: integer('total_orders').notNull().default(0),
    totalSpentIdr: integer('total_spent_idr').notNull().default(0),
    firstOrderAt: timestamp('first_order_at', { withTimezone: true }),
    lastOrderAt: timestamp('last_order_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('customers_type_idx').on(t.type)],
);

export const addresses = pgTable(
  'addresses',
  {
    id: primaryId('adr'),
    customerId: varchar('customer_id', { length: 30 })
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 40 }),
    recipientName: text('recipient_name').notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    province: text('province').notNull(),
    city: text('city').notNull(),
    district: text('district'),
    postalCode: varchar('postal_code', { length: 10 }),
    addressLine: text('address_line').notNull(),
    // Biteship destination area id (resolved from the maps/areas endpoint).
    areaId: text('area_id'),
    notes: text('notes'),
    isDefault: boolean('is_default').notNull().default(false),
    ...timestamps,
  },
  (t) => [index('addresses_customer_idx').on(t.customerId)],
);
