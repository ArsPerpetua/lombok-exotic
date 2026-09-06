import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatIdr } from '@lombok-exotic/core/money';
import { waMeLink } from '@lombok-exotic/core/email';
import { getAdminOrderDetail } from '@lombok-exotic/core/orders';
import { requireCapability } from '@/lib/auth-server';
import { OrderControls } from '@/components/admin/order-controls';

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

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  await requireCapability('order:read');
  const { orderNumber } = await params;
  const order = await getAdminOrderDetail(orderNumber);
  if (!order) notFound();

  const addr = order.address;
  const latestPayment = order.payments[0] ?? null;
  const hasTracking = order.shipments.some((s) => s.trackingNumber);
  const phone = order.customer?.phone ?? '';
  const resi = order.shipments[0]?.trackingNumber ?? '';
  const courier = order.shipments[0]?.courierCompany ?? order.shippingSelection?.courierCompany ?? '';
  const waLinks = phone
    ? [
        {
          label: 'Konfirmasi pembayaran',
          href: waMeLink(
            phone,
            `Halo, pembayaran pesanan ${order.orderNumber} sudah kami terima. Terima kasih! Pesanan segera kami siapkan.`,
          ),
          show: ['paid', 'processing', 'shipped', 'completed'].includes(order.status),
        },
        {
          label: 'Info pengiriman',
          href: waMeLink(
            phone,
            `Halo, pesanan ${order.orderNumber} sudah dikirim via ${courier}${resi ? ` (resi ${resi})` : ''}.`,
          ),
          show: order.status === 'shipped' || order.status === 'completed',
        },
        { label: 'Chat umum', href: waMeLink(phone, `Halo, terkait pesanan ${order.orderNumber}: `), show: true },
      ].filter((l) => l.show)
    : [];

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/admin/pesanan" className="text-sm text-brand hover:underline">
          ← Semua pesanan
        </Link>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-mono text-xl font-semibold">{order.orderNumber}</h1>
          <div className="flex items-center gap-2">
            <a
              href={`/admin/pesanan/${order.orderNumber}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border bg-white px-3 py-1 text-sm hover:border-brand"
            >
              Faktur
            </a>
            <span className="rounded border bg-white px-3 py-1 text-sm">
              {STATUS_ID[order.status] ?? order.status}
            </span>
          </div>
        </div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Dibuat {new Date(order.createdAt).toLocaleString('id-ID')}
          {order.paidAt && ` · Dibayar ${new Date(order.paidAt).toLocaleString('id-ID')}`}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card title="Pelanggan">
          <p>{order.customer?.name ?? '—'}</p>
          <p className="text-[var(--color-muted)]">{order.customer?.phone}</p>
          {order.customer?.email && <p className="text-[var(--color-muted)]">{order.customer.email}</p>}
        </Card>
        <Card title="Alamat Kirim">
          {addr ? (
            <>
              <p>{addr.recipientName}</p>
              <p className="text-[var(--color-muted)]">{addr.phone}</p>
              <p className="mt-1">{addr.addressLine}</p>
              <p className="text-[var(--color-muted)]">
                {[addr.district, addr.city, addr.province, addr.postalCode].filter(Boolean).join(', ')}
              </p>
            </>
          ) : (
            <p className="text-[var(--color-muted)]">—</p>
          )}
        </Card>
      </div>

      <Card title="Item">
        <ul className="divide-y">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-2">
              <span>
                {i.productName}
                <span className="text-[var(--color-muted)]"> — {i.variantName} × {i.quantity}</span>
                <span className="block text-xs text-[var(--color-muted)]">
                  {i.sku} · {i.weightGrams} g
                </span>
              </span>
              <span>{formatIdr(i.lineTotalIdr)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t pt-3 text-sm">
          <Row label="Subtotal" value={formatIdr(order.subtotalIdr)} />
          {order.discountTotalIdr > 0 && (
            <Row label="Diskon" value={`- ${formatIdr(order.discountTotalIdr)}`} />
          )}
          <Row label="Ongkir" value={formatIdr(order.shippingTotalIdr)} />
          <div className="flex justify-between border-t pt-1 font-semibold">
            <dt>Total</dt>
            <dd>{formatIdr(order.grandTotalIdr)}</dd>
          </div>
        </dl>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card title="Pembayaran">
          {latestPayment ? (
            <>
              <p>
                {latestPayment.provider} · <strong>{latestPayment.status}</strong>
              </p>
              <p className="text-[var(--color-muted)]">{formatIdr(latestPayment.amountIdr)}</p>
              {latestPayment.method && (
                <p className="text-[var(--color-muted)]">{latestPayment.method}</p>
              )}
              {order.payments.length > 1 && (
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {order.payments.length} percobaan pembayaran
                </p>
              )}
            </>
          ) : (
            <p className="text-[var(--color-muted)]">Belum ada</p>
          )}
        </Card>
        <Card title="Pengiriman">
          {order.shippingSelection && (
            <p>
              {order.shippingSelection.courierCompany} — {order.shippingSelection.serviceName}
              {order.shippingSelection.etd ? ` (${order.shippingSelection.etd})` : ''}
            </p>
          )}
          {order.shipments[0]?.trackingNumber ? (
            <p className="mt-1">
              Resi: <strong>{order.shipments[0].trackingNumber}</strong> (
              {order.shipments[0].courierCompany})
            </p>
          ) : (
            <p className="mt-1 text-[var(--color-muted)]">Resi belum diinput</p>
          )}
        </Card>
      </div>

      <Card title="Tindakan">
        <OrderControls
          orderNumber={order.orderNumber}
          allowedTransitions={order.allowedTransitions}
          hasTracking={hasTracking}
        />
      </Card>

      {waLinks.length > 0 && (
        <Card title="Kabari Pembeli (WhatsApp)">
          <div className="flex flex-wrap gap-2">
            {waLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border px-3 py-1.5 text-sm hover:border-brand"
              >
                {l.label}
              </a>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            Membuka WhatsApp dengan pesan siap kirim ke {phone}.
          </p>
        </Card>
      )}

      <Card title="Riwayat">
        <ol className="space-y-2 text-sm">
          {order.events.map((e) => (
            <li key={e.id} className="flex flex-wrap gap-x-2">
              <span className="font-medium">{STATUS_ID[e.status] ?? e.status}</span>
              {e.note && <span className="text-[var(--color-muted)]">— {e.note}</span>}
              <span className="text-xs text-[var(--color-muted)]">
                {new Date(e.createdAt).toLocaleString('id-ID')}
                {e.actorLabel ? ` · ${e.actorLabel}` : ''}
              </span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border bg-white p-4 text-sm">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
