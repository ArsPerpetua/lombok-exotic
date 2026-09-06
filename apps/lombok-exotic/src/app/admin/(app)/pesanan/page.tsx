import Link from 'next/link';
import { formatIdr } from '@lombok-exotic/core/money';
import { listOrders } from '@lombok-exotic/core/orders';
import { requireCapability } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const STATUSES = [
  ['', 'Semua'],
  ['pending_payment', 'Menunggu bayar'],
  ['paid', 'Dibayar'],
  ['processing', 'Diproses'],
  ['shipped', 'Dikirim'],
  ['completed', 'Selesai'],
  ['cancelled', 'Batal'],
] as const;

const STATUS_ID: Record<string, string> = Object.fromEntries(STATUSES);

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCapability('order:read');
  const sp = await searchParams;
  const status = typeof sp.status === 'string' ? sp.status : '';
  const q = typeof sp.q === 'string' ? sp.q : '';
  const page = Number.parseInt(typeof sp.hal === 'string' ? sp.hal : '1', 10) || 1;

  const result = await listOrders({ status: status || null, q: q || null, page });

  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams();
    if (over.status ?? status) p.set('status', over.status ?? status);
    if (over.q ?? q) p.set('q', over.q ?? q);
    if (over.hal) p.set('hal', over.hal);
    const s = p.toString();
    return s ? `/admin/pesanan?${s}` : '/admin/pesanan';
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pesanan</h1>

      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map(([v, label]) => (
          <Link
            key={v}
            href={qs({ status: v, hal: '' })}
            className={`rounded-full border px-3 py-1 text-sm ${
              status === v ? 'border-brand bg-brand text-brand-foreground' : 'bg-white hover:border-brand'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <form className="flex gap-2" action="/admin/pesanan">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari no. pesanan / nama / WA"
          className="w-full max-w-xs rounded border px-3 py-1.5 text-sm"
        />
        <button className="rounded border bg-white px-3 py-1.5 text-sm hover:border-brand">Cari</button>
      </form>

      <p className="text-sm text-[var(--color-muted)]">{result.total} pesanan</p>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2">No. Pesanan</th>
              <th className="px-3 py-2">Pelanggan</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2">Tanggal</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {result.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--color-muted)]">
                  Tidak ada pesanan.
                </td>
              </tr>
            )}
            {result.items.map((o) => (
              <tr key={o.orderNumber} className="hover:bg-black/5">
                <td className="px-3 py-2">
                  <Link href={`/admin/pesanan/${o.orderNumber}`} className="font-mono text-xs text-brand hover:underline">
                    {o.orderNumber}
                  </Link>
                  <span className="ml-2 text-xs text-[var(--color-muted)]">×{o.itemCount}</span>
                </td>
                <td className="px-3 py-2">
                  {o.customerName ?? '—'}
                  <span className="block text-xs text-[var(--color-muted)]">{o.customerPhone}</span>
                </td>
                <td className="px-3 py-2">{STATUS_ID[o.status] ?? o.status}</td>
                <td className="px-3 py-2 text-right">{formatIdr(o.grandTotalIdr)}</td>
                <td className="px-3 py-2 text-xs text-[var(--color-muted)]">
                  {new Date(o.createdAt).toLocaleDateString('id-ID')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {result.page > 1 && (
            <Link href={qs({ hal: String(result.page - 1) })} className="rounded border px-3 py-1 hover:border-brand">
              ← Sebelumnya
            </Link>
          )}
          <span className="text-[var(--color-muted)]">
            Halaman {result.page} / {result.totalPages}
          </span>
          {result.page < result.totalPages && (
            <Link href={qs({ hal: String(result.page + 1) })} className="rounded border px-3 py-1 hover:border-brand">
              Berikutnya →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
