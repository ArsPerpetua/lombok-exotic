import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/index';
import * as schema from '../db/schema/index';

/**
 * better-auth instance. Email + password only for the admin panel in MVP.
 * DB-backed sessions (not stateless JWT) so a departing staff member's
 * sessions can be revoked immediately.
 *
 * The Next.js app mounts this at /api/auth/[...all] and re-exports typed
 * client/server helpers.
 */
export const auth = betterAuth({
  appName: 'Lombok Exotic',
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.APP_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'customer', input: false },
      isActive: { type: 'boolean', defaultValue: true, input: false },
    },
  },
  advanced: {
    cookiePrefix: 'lex',
  },
});

export type Auth = typeof auth;
export * from './rbac';
