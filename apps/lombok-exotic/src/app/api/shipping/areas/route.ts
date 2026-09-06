import { NextResponse } from 'next/server';
import { getShippingProvider } from '@lombok-exotic/core/shipping';

export const dynamic = 'force-dynamic';

/** Biteship area autocomplete for the checkout address field. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 3) return NextResponse.json({ areas: [] });

  try {
    const areas = await getShippingProvider().searchAreas(q);
    return NextResponse.json(
      { areas },
      { headers: { 'Cache-Control': 'private, max-age=60' } },
    );
  } catch (err) {
    console.error('[api/shipping/areas]', err);
    return NextResponse.json({ areas: [], error: 'lookup_failed' }, { status: 502 });
  }
}
