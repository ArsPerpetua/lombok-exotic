import { eq } from 'drizzle-orm';
import { db, schema } from './db/index';

/**
 * Typed reader for the `settings` key/value table (jsonb values). Falls back to
 * the provided default on a missing key or any DB error, so a caller never
 * crashes on a fresh database.
 */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await db.query.settings.findFirst({
      where: eq(schema.settings.key, key),
      columns: { value: true },
    });
    if (row?.value == null || row.value === '') return fallback;
    return row.value as T;
  } catch (err) {
    console.warn(`[settings] read "${key}" failed, using fallback:`, err);
    return fallback;
  }
}

export async function getNumberSetting(key: string, fallback: number): Promise<number> {
  const raw = await getSetting<unknown>(key, fallback);
  const n = typeof raw === 'string' ? Number(raw) : (raw as number);
  return Number.isFinite(n) ? n : fallback;
}
