import {
  boolean,
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
import { paymentStatus } from './enums';
import { orders } from './orders';

/**
 * One payment attempt per order (Midtrans Snap transaction).
 * Unique (provider, providerRef) makes webhook handling idempotent.
 */
export const payments = pgTable(
  'payments',
  {
    id: primaryId('pay'),
    orderId: varchar('order_id', { length: 30 })
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    provider: varchar('provider', { length: 20 }).notNull().default('midtrans'),
    // Midtrans order_id / transaction_id.
    providerRef: varchar('provider_ref', { length: 80 }).notNull(),
    method: varchar('method', { length: 40 }),
    amountIdr: integer('amount_idr').notNull(),
    status: paymentStatus('status').notNull().default('pending'),
    snapToken: text('snap_token'),
    snapRedirectUrl: text('snap_redirect_url'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    rawPayload: jsonb('raw_payload'),
    ...timestamps,
  },
  (t) => [
    unique('payment_provider_ref_unique').on(t.provider, t.providerRef),
    index('payments_order_idx').on(t.orderId),
    index('payments_status_idx').on(t.status),
  ],
);

/**
 * Every webhook hit, stored before processing. `signatureValid` + the unique
 * key let us drop replays; the row is the evidence trail when a customer
 * says "I paid but the order is stuck".
 */
export const paymentEvents = pgTable(
  'payment_events',
  {
    id: primaryId('pev'),
    paymentId: varchar('payment_id', { length: 30 }).references(() => payments.id, {
      onDelete: 'set null',
    }),
    provider: varchar('provider', { length: 20 }).notNull().default('midtrans'),
    providerRef: varchar('provider_ref', { length: 80 }).notNull(),
    eventType: varchar('event_type', { length: 40 }).notNull(),
    signatureValid: boolean('signature_valid').notNull(),
    // Idempotency key derived from the payload (status_code + transaction_status + ...).
    dedupeKey: varchar('dedupe_key', { length: 120 }).notNull(),
    payload: jsonb('payload').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('payment_event_dedupe_unique').on(t.dedupeKey),
    index('payment_events_ref_idx').on(t.provider, t.providerRef),
  ],
);

// Refunds issued back through the provider.
export const refunds = pgTable(
  'refunds',
  {
    id: primaryId('rfd'),
    paymentId: varchar('payment_id', { length: 30 })
      .notNull()
      .references(() => payments.id, { onDelete: 'restrict' }),
    amountIdr: integer('amount_idr').notNull(),
    reason: text('reason'),
    providerRef: varchar('provider_ref', { length: 80 }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    rawPayload: jsonb('raw_payload'),
    ...timestamps,
  },
  (t) => [index('refunds_payment_idx').on(t.paymentId)],
);
