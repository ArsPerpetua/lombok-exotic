import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  time,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { primaryId, timestamps } from './_shared';
import { commissionStatus, discountType, groupPreorderStatus } from './enums';
import { productVariants } from './catalog';
import { user } from './auth';

/**
 * Tour leaders / drivers who bring bus groups to the store. Standard in the
 * oleh-oleh trade: they earn a commission on their group's spend. A referral
 * code (also renderable as a QR) attributes walk-in and online orders back
 * to them.
 */
export const tourLeaders = pgTable('tour_leaders', {
  id: primaryId('tl'),
  name: text('name').notNull(),
  phone: varchar('phone', { length: 32 }).notNull().unique(),
  agencyName: text('agency_name'),
  referralCode: varchar('referral_code', { length: 24 }).notNull().unique(),
  commissionType: discountType('commission_type').notNull().default('percent'),
  commissionValue: integer('commission_value').notNull().default(0),
  bankName: varchar('bank_name', { length: 60 }),
  bankAccount: varchar('bank_account', { length: 40 }),
  bankHolder: text('bank_holder'),
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  ...timestamps,
});

/**
 * Accrued commission, one row per attributed order or group pre-order.
 * `period` (YYYY-MM) drives the monthly payout report.
 * order/preorder ids are plain varchar to avoid a schema import cycle;
 * relations wire the joins.
 */
export const commissions = pgTable(
  'commissions',
  {
    id: primaryId('com'),
    tourLeaderId: varchar('tour_leader_id', { length: 30 })
      .notNull()
      .references(() => tourLeaders.id, { onDelete: 'restrict' }),
    orderId: varchar('order_id', { length: 30 }),
    groupPreorderId: varchar('group_preorder_id', { length: 30 }),
    baseAmountIdr: integer('base_amount_idr').notNull(),
    commissionAmountIdr: integer('commission_amount_idr').notNull(),
    status: commissionStatus('status').notNull().default('accrued'),
    period: varchar('period', { length: 7 }).notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    note: text('note'),
    ...timestamps,
  },
  (t) => [
    index('commissions_tl_period_idx').on(t.tourLeaderId, t.period),
    index('commissions_status_idx').on(t.status),
  ],
);

/**
 * THE differentiator. A tour leader / travel agent submits an intended
 * group order before the bus arrives; staff pre-pack the packages so 30
 * people with 40 minutes move fast. Converts to a real `order` on confirm.
 */
export const groupPreorders = pgTable(
  'group_preorders',
  {
    id: primaryId('grp'),
    reference: varchar('reference', { length: 20 }).notNull().unique(),
    status: groupPreorderStatus('status').notNull().default('new'),
    agentName: text('agent_name').notNull(),
    agentPhone: varchar('agent_phone', { length: 32 }).notNull(),
    agentEmail: text('agent_email'),
    companyName: text('company_name'),
    arrivalDate: date('arrival_date').notNull(),
    arrivalTime: time('arrival_time'),
    headcount: integer('headcount').notNull(),
    busInfo: text('bus_info'),
    // Free-text of what they want ("30 paket @ Rp150k: kopi + kaos + gantungan").
    packageNotes: text('package_notes'),
    estimatedValueIdr: integer('estimated_value_idr'),
    quoteOrderId: varchar('quote_order_id', { length: 30 }),
    assignedTo: text('assigned_to').references(() => user.id, { onDelete: 'set null' }),
    tourLeaderId: varchar('tour_leader_id', { length: 30 }).references(() => tourLeaders.id, {
      onDelete: 'set null',
    }),
    internalNotes: text('internal_notes'),
    ...timestamps,
  },
  (t) => [
    index('group_preorders_status_idx').on(t.status),
    index('group_preorders_arrival_idx').on(t.arrivalDate),
  ],
);

export const groupPreorderItems = pgTable(
  'group_preorder_items',
  {
    id: primaryId('gpi'),
    groupPreorderId: varchar('group_preorder_id', { length: 30 })
      .notNull()
      .references(() => groupPreorders.id, { onDelete: 'cascade' }),
    variantId: varchar('variant_id', { length: 30 }).references(() => productVariants.id, {
      onDelete: 'set null',
    }),
    description: text('description').notNull(),
    quantity: integer('quantity').notNull().default(1),
    unitPriceIdr: integer('unit_price_idr'),
    notes: text('notes'),
  },
  (t) => [index('group_preorder_items_parent_idx').on(t.groupPreorderId)],
);
