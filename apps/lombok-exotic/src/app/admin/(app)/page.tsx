import Link from 'next/link';
import { formatIdr } from '@lombok-exotic/core/money';
import { dashboardStats } from '@lombok-exotic/core/orders';
import { requireCapability } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const STATUS_ID: Record<string, string> = {
  pending_payment: 'Menunggu bayar',
  paid: 'Dibayar',
  processing: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Batal',
  refunded: 'Refund',
};

export default async function AdminDashboard() {
  await requireCapability('report:read');
  const s = await dashboardStats();

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Pendapatan hari ini" value={formatIdr(s.revenue.today)} />
        <Stat label="Pendapatan 7 hari" value={formatIdr(s.revenue.week)} />
        <Stat label="Pendapatan 30 hari" value={formatIdr(s.revenue.month)} />
      </section>

      <section>
        <h2 className="text-sm font-medium text-[var(--color-muted)]">Pesanan per status</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(STATUS_ID).map(([k, label]) => (
            <Link
              key={k}
              href={`/admin/pesanan?status=${k}`}
              className="rounded border bg-white px-3 py-1.5 text-sm hover:border-brand"
            >
              {label}: <strong>{s.ordersByStatus[k] ?? 0}</strong>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--color-muted)]">Pesanan terbaru</h2>
            <Link href="/admin/pesanan" className="text-xs text-brand hover:underline">
              Semua →
            </Link>
          </div>
          <ul className="mt-2 divide-y rounded border bg-white text-sm">
            {s.recentOrders.length === 0 && (
              <li className="px-3 py-4 text-[var(--color-muted)]">Belum ada pesanan.</li>
            )}
            {s.recentOrders.map((o) => (
              <li key={o.orderNumber}>
                <Link
                  href={`/admin/pesanan/${o.orderNumber}`}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-black/5"
                >
                  <span>
                    <span className="font-mono text-xs">{o.orderNumber}</span>
                    <span className="ml-2 text-[var(--color-muted)]">{o.customerName ?? '—'}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-muted)]">
                      {STATUS_ID[o.status] ?? o.status}
                    </span>
                    <span className="font-medium">{formatIdr(o.grandTotalIdr)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-medium text-[var(--color-muted)]">Stok menipis</h2>
          <ul className="mt-2 divide-y rounded border bg-white text-sm">
            {s.lowStock.length === 0 && (
              <li className="px-3 py-4 text-[var(--color-muted)]">Semua stok aman.</li>
            )}
            {s.lowStock.map((v) => (
              <li key={v.sku} className="flex items-center justify-between px-3 py-2.5">
                <span>
                  {v.name} <span className="text-[var(--color-muted)]">— {v.variantName}</span>
                </span>
                <span className={v.stock - v.reserved <= 0 ? 'font-medium text-brand' : ''}>
                  {v.stock - v.reserved} tersisa
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-medium text-[var(--color-muted)]">Produk terlaris</h2>
          <ul className="mt-2 divide-y rounded border bg-white text-sm">
            {s.topProducts.length === 0 && (
              <li className="px-3 py-4 text-[var(--color-muted)]">Belum ada penjualan.</li>
            )}
            {s.topProducts.map((p) => (
              <li key={p.productName} className="flex items-center justify-between px-3 py-2.5">
                <span>{p.productName}</span>
                <span className="text-[var(--color-muted)]">
                  {p.qty} terjual · {formatIdr(p.revenueIdr)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-white p-4">
      <p className="text-xs text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
