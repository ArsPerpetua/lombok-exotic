import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { primaryId, timestamps } from './_shared';
import { shipmentStatus } from './enums';
import { orders } from './orders';

export const shipments = pgTable(
  'shipments',
  {
    id: primaryId('shp'),
    orderId: varchar('order_id', { length: 30 })
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    provider: varchar('provider', { length: 20 }).notNull().default('biteship'),
    providerOrderId: varchar('provider_order_id', { length: 80 }),
    courierCompany: varchar('courier_company', { length: 40 }),
    courierType: varchar('courier_type', { length: 40 }),
    // Resi / airway bill. Nullable until the courier allocates it.
    trackingNumber: varchar('tracking_number', { length: 60 }),
    trackingUrl: text('tracking_url'),
    status: shipmentStatus('status').notNull().default('draft'),
    weightGrams: integer('weight_grams').notNull().default(0),
    costIdr: integer('cost_idr').notNull().default(0),
    originAddress: jsonb('origin_address'),
    destinationAddress: jsonb('destination_address'),
    rawPayload: jsonb('raw_payload'),
    ...timestamps,
  },
  (t) => [
    index('shipments_order_idx').on(t.orderId),
    index('shipments_tracking_idx').on(t.trackingNumber),
    index('shipments_status_idx').on(t.status),
  ],
);

// Tracking history from Biteship webhooks / polling.
export const shipmentEvents = pgTable(
  'shipment_events',
  {
    id: primaryId('sev'),
    shipmentId: varchar('shipment_id', { length: 30 })
      .notNull()
      .references(() => shipments.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 40 }).notNull(),
    note: text('note'),
    eventTime: timestamp('event_time', { withTimezone: true }),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('shipment_events_shipment_idx').on(t.shipmentId)],
);
