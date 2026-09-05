import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set (see .env.example)');
}

/**
 * One pool per process. Next.js dev reloads modules, so we stash it on
 * globalThis to avoid exhausting connections on hot reload.
 */
const globalForDb = globalThis as unknown as { __lePool?: Pool };

const pool =
  globalForDb.__lePool ??
  new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX ?? 10),
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__lePool = pool;
}

export const db = drizzle(pool, { schema, casing: 'snake_case' });
export { schema };
export type Database = typeof db;
