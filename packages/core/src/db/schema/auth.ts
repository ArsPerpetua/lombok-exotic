import { boolean, index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { timestamps } from './_shared';
import { userRole } from './enums';

/**
 * better-auth core tables. Field names/shape follow the better-auth Drizzle
 * adapter contract — do not rename columns without regenerating the adapter.
 *
 * `role` and `isActive` are app extensions:
 *   - role drives admin RBAC (see packages/core/src/auth/rbac.ts)
 *   - isActive lets us disable a staff account without deleting history
 */
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: userRole('role').notNull().default('customer'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    ...timestamps,
  },
  (t) => [index('session_user_id_idx').on(t.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // better-auth 1.7+: account identity is scoped by issuer. For email/password
    // this is a local "credential" issuer; for OAuth it's the provider's issuer.
    issuer: text('issuer').notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    idToken: text('id_token'),
    password: text('password'),
    ...timestamps,
  },
  (t) => [
    index('account_user_id_idx').on(t.userId),
    unique('account_issuer_account_id_unique').on(t.issuer, t.accountId),
  ],
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);
