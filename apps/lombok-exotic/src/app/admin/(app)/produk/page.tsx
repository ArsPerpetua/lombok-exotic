import Link from 'next/link';
import { formatIdr } from '@lombok-exotic/core/money';
import { listAdminProducts } from '@lombok-exotic/core/catalog';
import { requireCapability } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const STATUS_ID: Record<string, string> = { draft: 'Draft', active: 'Aktif', archived: 'Arsip' };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCapability('catalog:read');
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : '';
  const status = typeof sp.status === 'string' ? sp.status : '';
  const rows = await listAdminProducts({ q: q || null, status: status || null });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Produk</h1>
        <Link
          href="/admin/produk/baru"
          className="rounded bg-brand px-4 py-2 text-sm font-medium text-brand-foreground"
        >
          + Produk Baru
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          ['', 'Semua'],
          ['active', 'Aktif'],
          ['draft', 'Draft'],
          ['archived', 'Arsip'],
        ].map(([v, label]) => (
          <Link
            key={v}
            href={v ? `/admin/produk?status=${v}` : '/admin/produk'}
            className={`rounded-full border px-3 py-1 text-sm ${
              status === v ? 'border-brand bg-brand text-brand-foreground' : 'bg-white hover:border-brand'
            }`}
          >
            {label}
          </Link>
        ))}
        <form action="/admin/produk" className="ml-auto flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari produk"
            className="w-48 rounded border px-3 py-1.5 text-sm"
          />
          <button className="rounded border bg-white px-3 py-1.5 text-sm hover:border-brand">Cari</button>
        </form>
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2">Produk</th>
              <th className="px-3 py-2">Kategori</th>
              <th className="px-3 py-2">Varian</th>
              <th className="px-3 py-2 text-right">Harga dari</th>
              <th className="px-3 py-2 text-right">Stok</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[var(--color-muted)]">
                  Belum ada produk.
                </td>
              </tr>
            )}
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-black/5">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-[var(--color-accent,#e5e7eb)]">
                      {p.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <Link href={`/admin/produk/${p.id}`} className="font-medium text-brand hover:underline">
                      {p.name}
                    </Link>
                    {p.isFeatured && <span className="text-xs text-[var(--color-muted)]">★</span>}
                  </div>
                </td>
                <td className="px-3 py-2">{p.categoryName ?? '—'}</td>
                <td className="px-3 py-2">
                  {p.variantCount} <span className="text-xs text-[var(--color-muted)]">({p.type})</span>
                </td>
                <td className="px-3 py-2 text-right">
                  {p.priceFromIdr != null ? formatIdr(p.priceFromIdr) : '—'}
                </td>
                <td className="px-3 py-2 text-right">{p.totalStock}</td>
                <td className="px-3 py-2">{STATUS_ID[p.status] ?? p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
