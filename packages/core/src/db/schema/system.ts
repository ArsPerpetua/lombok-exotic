import { boolean, index, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { primaryId, timestamps } from './_shared';
import { user } from './auth';

/**
 * Physical outlets. MVP has one, but every stock/order row carries a
 * location so multi-outlet (Phase 3) needs no backfill.
 */
export const locations = pgTable('locations', {
  id: primaryId('loc'),
  name: text('name').notNull(),
  slug: varchar('slug', { length: 80 }).notNull().unique(),
  phone: varchar('phone', { length: 32 }),
  addressLine: text('address_line'),
  city: text('city'),
  province: text('province'),
  postalCode: varchar('postal_code', { length: 10 }),
  // Biteship area id for shipping origin when shipping from this outlet.
  originAreaId: text('origin_area_id'),
  isActive: boolean('is_active').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),
  ...timestamps,
});

/**
 * Key/value store settings editable from the admin CMS
 * (contact WhatsApp number, hero copy, shipping origin, tax config, ...).
 */
export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Append-only audit trail for every mutating admin action.
 * Cheap to write now, impossible to reconstruct later.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: primaryId('aud'),
    actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
    actorLabel: text('actor_label'),
    action: varchar('action', { length: 80 }).notNull(),
    entityType: varchar('entity_type', { length: 60 }).notNull(),
    entityId: varchar('entity_id', { length: 40 }),
    before: jsonb('before'),
    after: jsonb('after'),
    ip: varchar('ip', { length: 64 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_entity_idx').on(t.entityType, t.entityId),
    index('audit_actor_idx').on(t.actorUserId),
    index('audit_created_idx').on(t.createdAt),
  ],
);
