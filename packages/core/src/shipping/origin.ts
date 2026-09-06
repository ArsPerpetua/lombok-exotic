import { getSetting } from '../settings';

/** Store origin used when `settings`/env don't provide one — see plan Open Q1. */
const FALLBACK_ORIGIN = { areaId: 'fake-area-mataram', postalCode: '83239' };

/**
 * Where shipments originate. `settings['shipping.origin_area_id']` wins, then
 * `STORE_ORIGIN_AREA_ID`, then a Mataram fallback so rates can always be quoted
 * in the demo. Confirm the real Biteship area id with the client (TODOS).
 */
export async function resolveStoreOrigin(): Promise<{ areaId?: string; postalCode?: string }> {
  const fromSettings = await getSetting<string>('shipping.origin_area_id', '');
  if (fromSettings) return { areaId: fromSettings };
  if (process.env.STORE_ORIGIN_AREA_ID) return { areaId: process.env.STORE_ORIGIN_AREA_ID };
  return FALLBACK_ORIGIN;
}
