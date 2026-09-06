import Link from 'next/link';
import { formatIdr } from '@lombok-exotic/core/money';
import { listGroupPreorders } from '@lombok-exotic/core/groups';
import { requireCapability } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const STATUS_ID: Record<string, string> = {
  new: 'Baru',
  quoted: 'Ditawar',
  confirmed: 'Dikonfirmasi',
  paid: 'Dibayar',
  fulfilled: 'Selesai',
  cancelled: 'Batal',
};

export default async function AdminGroupPreordersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCapability('group_preorder:read');
  const sp = await searchParams;
  const status = typeof sp.status === 'string' ? sp.status : '';
  const rows = await listGroupPreorders(status || null);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pesanan Rombongan</h1>

      <div className="flex flex-wrap gap-2">
        {[['', 'Semua'], ...Object.entries(STATUS_ID)].map(([v, label]) => (
          <Link
            key={v}
            href={v ? `/admin/rombongan?status=${v}` : '/admin/rombongan'}
            className={`rounded-full border px-3 py-1 text-sm ${
              status === v ? 'border-brand bg-brand text-brand-foreground' : 'bg-white hover:border-brand'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2">Ref</th>
              <th className="px-3 py-2">Agen / Perusahaan</th>
              <th className="px-3 py-2">Kedatangan</th>
              <th className="px-3 py-2 text-right">Pax</th>
              <th className="px-3 py-2 text-right">Estimasi</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[var(--color-muted)]">
                  Belum ada permintaan rombongan.
                </td>
              </tr>
            )}
            {rows.map((g) => (
              <tr key={g.id} className="hover:bg-black/5">
                <td className="px-3 py-2">
                  <Link href={`/admin/rombongan/${g.id}`} className="font-mono text-brand hover:underline">
                    {g.reference}
                  </Link>
                  <span className="ml-2 text-xs text-[var(--color-muted)]">×{g.itemCount} item</span>
                </td>
                <td className="px-3 py-2">
                  {g.agentName}
                  {g.companyName && (
                    <span className="block text-xs text-[var(--color-muted)]">{g.companyName}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {new Date(g.arrivalDate).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-3 py-2 text-right">{g.headcount}</td>
                <td className="px-3 py-2 text-right">
                  {g.estimatedValueIdr != null ? formatIdr(g.estimatedValueIdr) : '—'}
                </td>
                <td className="px-3 py-2">{STATUS_ID[g.status] ?? g.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
