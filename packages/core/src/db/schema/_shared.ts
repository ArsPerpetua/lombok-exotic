import { nanoid } from 'nanoid';
import { timestamp, varchar } from 'drizzle-orm/pg-core';

/**
 * Prefixed, URL-safe primary keys (e.g. `ord_V1StGXR8_Z5jdHi6B`).
 * Readable in logs and safe to expose in URLs / admin.
 */
export function primaryId(prefix: string) {
  return varchar('id', { length: 30 })
    .primaryKey()
    .$defaultFn(() => `${prefix}_${nanoid(16)}`);
}

/** created_at / updated_at pair, both managed in the app + DB default. */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
