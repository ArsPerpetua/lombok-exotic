import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatIdr } from '@lombok-exotic/core/money';
import { waMeLink } from '@lombok-exotic/core/email';
import { getTourLeader, referralUrl } from '@lombok-exotic/core/tour-leaders';
import { requireCapability } from '@/lib/auth-server';
import { qrSvg } from '@/lib/qr';

export const dynamic = 'force-dynamic';

const ORDER_STATUS_ID: Record<string, string> = {
  pending_payment: 'Belum dibayar',
  paid: 'Lunas',
  processing: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Batal',
  refunded: 'Refund',
};

const GROUP_STATUS_ID: Record<string, string> = {
  new: 'Baru',
  quoted: 'Ditawar',
  confirmed: 'Dikonfirmasi',
  paid: 'Dibayar',
  fulfilled: 'Selesai',
  cancelled: 'Batal',
};

function baseUrl(h: Headers): string {
  return `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host') ?? 'localhost:3000'}`;
}

export default async function AdminTourLeaderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability('tour_leader:read');
  const { id } = await params;
  const l = await getTourLeader(id);
  if (!l) notFound();

  const h = await headers();
  const refUrl = referralUrl(baseUrl(h), l.referralCode);
  const qr = await qrSvg(refUrl, 200);
  const wa = waMeLink(l.phone, `Halo ${l.name}, `);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/tour-leader" className="text-sm text-brand hover:underline">
          ← Semua tour leader
        </Link>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-semibold">{l.name}</h1>
          <span className={`rounded border bg-white px-3 py-1 text-sm ${l.isActive ? '' : 'text-[var(--color-muted)]'}`}>
            {l.isActive ? 'Aktif' : 'Nonaktif'}
          </span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
        <div className="space-y-4 rounded border bg-white p-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-[var(--color-muted)]">Kontak</p>
              <p>{l.phone}</p>
              <a href={wa} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:underline">
                Chat WhatsApp →
              </a>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-[var(--color-muted)]">Agensi</p>
              <p>{l.agencyName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-[var(--color-muted)]">Komisi</p>
              <p>
                {l.commissionType === 'percent'
                  ? `${l.commissionValue}%`
                  : formatIdr(l.commissionValue)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-[var(--color-muted)]">Rekening</p>
              {l.bankName || l.bankAccount ? (
                <p>
                  {l.bankName} {l.bankAccount}
                  {l.bankHolder && (
                    <span className="block text-xs text-[var(--color-muted)]">a.n. {l.bankHolder}</span>
                  )}
                </p>
              ) : (
                <p className="text-[var(--color-muted)]">—</p>
              )}
            </div>
          </div>
          {l.notes && (
            <div>
              <p className="text-xs font-medium uppercase text-[var(--color-muted)]">Catatan</p>
              <p className="whitespace-pre-line">{l.notes}</p>
            </div>
          )}
        </div>

        <div className="rounded border bg-white p-4 text-center">
          <p className="text-xs font-medium uppercase text-[var(--color-muted)]">Kode Referral</p>
          <p className="my-1 font-mono text-lg font-semibold">{l.referralCode}</p>
          <div
            className="mx-auto h-[200px] w-[200px] [&_svg]:h-full [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <p className="mt-1 max-w-[200px] break-all text-[10px] text-[var(--color-muted)]">{refUrl}</p>
          <Link
            href={`/admin/tour-leader/${l.id}/qr`}
            className="mt-2 inline-block rounded border px-3 py-1 text-xs hover:border-brand"
          >
            Kartu QR (cetak) →
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded border bg-white p-4">
          <p className="text-xs text-[var(--color-muted)]">Pesanan terkait</p>
          <p className="text-lg font-semibold">{l.orderCount}</p>
        </div>
        <div className="rounded border bg-white p-4">
          <p className="text-xs text-[var(--color-muted)]">Omzet terkait</p>
          <p className="text-lg font-semibold">{formatIdr(l.attributedRevenueIdr)}</p>
        </div>
        <div className="rounded border bg-white p-4">
          <p className="text-xs text-[var(--color-muted)]">Proyeksi komisi</p>
          <p className="text-lg font-semibold">{formatIdr(l.projectedCommissionIdr)}</p>
        </div>
      </div>

      {l.commissionByPeriod.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold">Komisi per periode</h2>
          <div className="overflow-x-auto rounded border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-[var(--color-muted)]">
                <tr>
                  <th className="px-3 py-2">Periode</th>
                  <th className="px-3 py-2 text-right">Baris</th>
                  <th className="px-3 py-2 text-right">Terhutang</th>
                  <th className="px-3 py-2 text-right">Dibayar</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {l.commissionByPeriod.map((p) => (
                  <tr key={p.period}>
                    <td className="px-3 py-2 font-mono">{p.period}</td>
                    <td className="px-3 py-2 text-right">{p.rows}</td>
                    <td className="px-3 py-2 text-right">{formatIdr(p.accruedIdr)}</td>
                    <td className="px-3 py-2 text-right">{formatIdr(p.paidIdr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold">Pesanan yang dikaitkan</h2>
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2">No. Pesanan</th>
                <th className="px-3 py-2">Kanal</th>
                <th className="px-3 py-2">Tanggal</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {l.attributedOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[var(--color-muted)]">
                    Belum ada pesanan yang dikaitkan.
                  </td>
                </tr>
              )}
              {l.attributedOrders.map((o) => (
                <tr key={o.id} className="hover:bg-black/5">
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/pesanan/${o.orderNumber}`}
                      className="font-mono text-brand hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs">{o.channel}</td>
                  <td className="px-3 py-2 text-xs">
                    {o.placedAt ? new Date(o.placedAt).toLocaleDateString('id-ID') : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">{formatIdr(o.grandTotalIdr)}</td>
                  <td className="px-3 py-2 text-xs">{ORDER_STATUS_ID[o.status] ?? o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {l.groupPreorders.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold">Rombongan yang dikaitkan</h2>
          <div className="overflow-x-auto rounded border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-[var(--color-muted)]">
                <tr>
                  <th className="px-3 py-2">Ref</th>
                  <th className="px-3 py-2">Kedatangan</th>
                  <th className="px-3 py-2 text-right">Pax</th>
                  <th className="px-3 py-2 text-right">Estimasi</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {l.groupPreorders.map((g) => (
                  <tr key={g.id} className="hover:bg-black/5">
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/rombongan/${g.id}`}
                        className="font-mono text-brand hover:underline"
                      >
                        {g.reference}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {new Date(g.arrivalDate).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-3 py-2 text-right">{g.headcount}</td>
                    <td className="px-3 py-2 text-right">
                      {g.estimatedValueIdr != null ? formatIdr(g.estimatedValueIdr) : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs">{GROUP_STATUS_ID[g.status] ?? g.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--color-muted)]">
        Tampilan ini hanya-baca. Tambah / ubah data tour leader &amp; pencatatan komisi otomatis
        menyusul di Fase 2.
      </p>
    </div>
  );
}
