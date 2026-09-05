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

/**
 * Transactional-message outbox. Every order/payment/shipping notification is
 * written here first, then a job worker delivers it. Gives retries, an audit
 * of what was sent, and a clean seam to add the WhatsApp Cloud API channel in
 * Phase 2 without touching call sites.
 *
 * channel: 'email' (Resend, live now) | 'whatsapp' (Cloud API, Phase 2)
 *          | 'whatsapp_link' (wa.me deep link surfaced in admin, MVP fallback)
 */
export const notifications = pgTable(
  'notifications',
  {
    id: primaryId('ntf'),
    channel: varchar('channel', { length: 20 }).notNull(),
    templateKey: varchar('template_key', { length: 60 }).notNull(),
    recipient: varchar('recipient', { length: 160 }).notNull(),
    // e.g. { orderId, orderNumber } — what the template renders from.
    payload: jsonb('payload').notNull().default({}),
    entityType: varchar('entity_type', { length: 40 }),
    entityId: varchar('entity_id', { length: 30 }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    providerRef: varchar('provider_ref', { length: 120 }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('notifications_status_idx').on(t.status),
    index('notifications_entity_idx').on(t.entityType, t.entityId),
  ],
);
