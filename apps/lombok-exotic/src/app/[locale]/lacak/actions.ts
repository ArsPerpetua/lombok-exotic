'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { findOrderForTracking, type TrackedOrder } from '@lombok-exotic/core/orders';

const input = z.object({
  orderNumber: z.string().trim().min(6).max(30),
  phone: z.string().trim().min(4).max(20),
});

export type TrackState =
  | { status: 'idle' }
  | { status: 'error'; code: 'invalid' | 'rate_limited' | 'not_found' }
  | { status: 'found'; order: TrackedOrder };

// Crude per-IP limiter — process-local, resets on redeploy. A real one lives
// behind Cloudflare later (plan A20). Order number + phone is already two factors.
const hits = new Map<string, { n: number; ts: number }>();
function limited(ip: string): boolean {
  const now = Date.now();
  const e = hits.get(ip);
  if (!e || now - e.ts > 60_000) {
    hits.set(ip, { n: 1, ts: now });
    return false;
  }
  e.n += 1;
  return e.n > 10;
}

export async function lookupOrderAction(
  _prev: TrackState,
  formData: FormData,
): Promise<TrackState> {
  const parsed = input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: 'error', code: 'invalid' };

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (limited(ip)) return { status: 'error', code: 'rate_limited' };

  const order = await findOrderForTracking(parsed.data.orderNumber, parsed.data.phone);
  if (!order) return { status: 'error', code: 'not_found' };
  return { status: 'found', order };
}
