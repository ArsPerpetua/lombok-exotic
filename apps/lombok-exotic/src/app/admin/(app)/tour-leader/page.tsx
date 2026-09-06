import Link from 'next/link';
import { formatIdr } from '@lombok-exotic/core/money';
import { listTourLeaders } from '@lombok-exotic/core/tour-leaders';
import { requireCapability } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export default async function AdminTourLeadersPage() {
  await requireCapability('tour_leader:read');
  const leaders = await listTourLeaders();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tour Leader</h1>
      <p className="text-sm text-[var(--color-muted)]">
        Pemandu wisata &amp; sopir yang membawa rombongan ke toko. Setiap tour leader punya
        kode referral (bisa dicetak sebagai QR) untuk mengaitkan pesanan ke mereka.
      </p>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2">Nama / Agensi</th>
              <th className="px-3 py-2">Kode Referral</th>
              <th className="px-3 py-2">Komisi</th>
              <th className="px-3 py-2 text-right">Pesanan</th>
              <th className="px-3 py-2 text-right">Omzet Terkait</th>
              <th className="px-3 py-2 text-right">Proyeksi Komisi</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {leaders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[var(--color-muted)]">
                  Belum ada tour leader.
                </td>
              </tr>
            )}
            {leaders.map((l) => (
              <tr key={l.id} className="hover:bg-black/5">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/tour-leader/${l.id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {l.name}
                  </Link>
                  {l.agencyName && (
                    <span className="block text-xs text-[var(--color-muted)]">{l.agencyName}</span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{l.referralCode}</td>
                <td className="px-3 py-2 text-xs">
                  {l.commissionType === 'percent'
                    ? `${l.commissionValue}%`
                    : formatIdr(l.commissionValue)}
                </td>
                <td className="px-3 py-2 text-right">{l.orderCount}</td>
                <td className="px-3 py-2 text-right">{formatIdr(l.attributedRevenueIdr)}</td>
                <td className="px-3 py-2 text-right text-[var(--color-muted)]">
                  {formatIdr(l.projectedCommissionIdr)}
                </td>
                <td className="px-3 py-2">
                  <span className={l.isActive ? 'text-green-700' : 'text-[var(--color-muted)]'}>
                    {l.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--color-muted)]">
        Catatan: pencatatan komisi otomatis pada pesanan yang dibayar (accrual + laporan payout
        bulanan) menyusul di Fase 2. Angka &ldquo;proyeksi komisi&rdquo; di sini adalah estimasi
        dari omzet pesanan yang sudah dikaitkan ke tour leader &times; tarif komisinya.
      </p>
    </div>
  );
}
