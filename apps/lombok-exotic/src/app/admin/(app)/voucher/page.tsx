import Link from 'next/link';
import { formatIdr } from '@lombok-exotic/core/money';
import { listVouchers } from '@lombok-exotic/core/marketing';
import { requireCapability } from '@/lib/auth-server';
import { VoucherToggle } from '@/components/admin/voucher-form';

export const dynamic = 'force-dynamic';

export default async function AdminVouchersPage() {
  await requireCapability('marketing:write');
  const vouchers = await listVouchers();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Voucher</h1>
        <Link
          href="/admin/voucher/baru"
          className="rounded bg-brand px-4 py-2 text-sm font-medium text-brand-foreground"
        >
          + Voucher Baru
        </Link>
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2">Kode</th>
              <th className="px-3 py-2">Diskon</th>
              <th className="px-3 py-2">Syarat</th>
              <th className="px-3 py-2">Pemakaian</th>
              <th className="px-3 py-2">Berlaku</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {vouchers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[var(--color-muted)]">
                  Belum ada voucher.
                </td>
              </tr>
            )}
            {vouchers.map((v) => (
              <tr key={v.id} className="hover:bg-black/5">
                <td className="px-3 py-2">
                  <Link href={`/admin/voucher/${v.id}`} className="font-mono font-medium text-brand hover:underline">
                    {v.code}
                  </Link>
                  {v.description && (
                    <span className="block text-xs text-[var(--color-muted)]">{v.description}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {v.discountType === 'percent'
                    ? `${v.discountValue}%`
                    : formatIdr(v.discountValue)}
                  {v.maxDiscountIdr && (
                    <span className="block text-xs text-[var(--color-muted)]">
                      maks {formatIdr(v.maxDiscountIdr)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-[var(--color-muted)]">
                  {v.minOrderValueIdr ? `min ${formatIdr(v.minOrderValueIdr)}` : '—'}
                </td>
                <td className="px-3 py-2 text-xs">
                  {v.usedCount}
                  {v.usageLimit ? ` / ${v.usageLimit}` : ''}
                  <span className="block text-[var(--color-muted)]">
                    {v.perCustomerLimit}× / pelanggan
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-[var(--color-muted)]">
                  {v.startsAt ? new Date(v.startsAt).toLocaleDateString('id-ID') : '—'}
                  {' – '}
                  {v.endsAt ? new Date(v.endsAt).toLocaleDateString('id-ID') : '∞'}
                </td>
                <td className="px-3 py-2">
                  <span className={v.isActive ? 'text-green-700' : 'text-[var(--color-muted)]'}>
                    {v.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <VoucherToggle id={v.id} isActive={v.isActive} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--color-muted)]">
        Catatan: penerapan voucher di halaman checkout belum aktif (menyusul). Voucher di sini
        sudah bisa dikelola dan siap dipakai saat fitur checkout-voucher live.
      </p>
    </div>
  );
}
