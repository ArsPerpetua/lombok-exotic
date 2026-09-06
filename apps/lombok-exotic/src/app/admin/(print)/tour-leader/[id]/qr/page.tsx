import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTourLeader, referralUrl } from '@lombok-exotic/core/tour-leaders';
import { requireCapability } from '@/lib/auth-server';
import { qrSvg } from '@/lib/qr';
import { clientConfig } from '../../../../../../../client.config';
import { PrintButton } from '@/components/admin/print-button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false } };

export default async function TourLeaderQrCard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability('tour_leader:read');
  const { id } = await params;
  const l = await getTourLeader(id);
  if (!l) notFound();

  const h = await headers();
  const base = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host') ?? 'localhost:3000'}`;
  const refUrl = referralUrl(base, l.referralCode);
  const qr = await qrSvg(refUrl, 320);

  return (
    <div className="mx-auto max-w-sm text-center">
      <div className="rounded-2xl border-2 border-black p-8">
        <p className="font-display text-2xl text-brand">{clientConfig.name}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-[var(--color-muted)]">
          Kartu Tour Leader
        </p>

        <div
          className="mx-auto my-6 h-[320px] w-[320px] [&_svg]:h-full [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: qr }}
        />

        <p className="text-lg font-semibold">{l.name}</p>
        {l.agencyName && <p className="text-sm text-[var(--color-muted)]">{l.agencyName}</p>}
        <p className="mt-3 font-mono text-xl font-bold tracking-widest">{l.referralCode}</p>
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          Scan untuk belanja &amp; kaitkan pesanan ke tour leader ini
        </p>
      </div>

      <p className="mt-4 break-all text-[10px] text-[var(--color-muted)]">{refUrl}</p>

      <div className="mt-6">
        <PrintButton label="Cetak kartu / Simpan PDF" />
      </div>
    </div>
  );
}
