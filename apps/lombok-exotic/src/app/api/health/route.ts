import { NextResponse } from 'next/server';
import { db } from '@lombok-exotic/core/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Liveness + DB readiness. The deploy script curls this after a release and
 * rolls back on non-200. Uptime monitor points here too.
 */
export async function GET() {
  const checks: Record<string, 'ok' | 'fail'> = { app: 'ok', db: 'fail' };
  try {
    await db.execute(sql`select 1`);
    checks.db = 'ok';
  } catch (err) {
    console.error('[health] db check failed:', err);
  }
  const healthy = Object.values(checks).every((v) => v === 'ok');
  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', checks, ts: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}
