import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatIdr } from '@lombok-exotic/core/money';
import { getAdminOrderDetail } from '@lombok-exotic/core/orders';
import { requireCapability } from '@/lib/auth-server';
import { clientConfig } from '../../../../../../../client.config';
import { PrintButton } from '@/components/admin/print-button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false } };

const STATUS_ID: Record<string, string> = {
  pending_payment: 'Belum dibayar',
  paid: 'Lunas',
  processing: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Batal',
  refunded: 'Refund',
};

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  await requireCapability('order:read');
  const { orderNumber } = await params;
  const order = await getAdminOrderDetail(orderNumber);
  if (!order) notFound();

  const addr = order.address;
  const paid = ['paid', 'processing', 'shipped', 'completed'].includes(order.status);

  return (
    <div className="text-sm">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="font-display text-xl text-brand">{clientConfig.name}</p>
          <p className="text-xs text-[var(--color-muted)]">
            {clientConfig.contact.addressLine}
            <br />
            {clientConfig.contact.city}
            <br />
            WA {clientConfig.contact.whatsapp}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">FAKTUR</p>
          <p className="font-mono">{order.orderNumber}</p>
          <p className="text-xs text-[var(--color-muted)]">
            {new Date(order.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <p className="mt-1 text-xs">
            Status: <strong>{STATUS_ID[order.status] ?? order.status}</strong>
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-6 border-y py-4">
        <div>
          <p className="text-xs font-medium uppercase text-[var(--color-muted)]">Pembeli</p>
          <p>{order.customer?.name}</p>
          <p className="text-[var(--color-muted)]">{order.customer?.phone}</p>
          {order.customer?.email && (
            <p className="text-[var(--color-muted)]">{order.customer.email}</p>
          )}
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-[var(--color-muted)]">Kirim ke</p>
          {addr ? (
            <>
              <p>{addr.recipientName}</p>
              <p>{addr.addressLine}</p>
              <p className="text-[var(--color-muted)]">
                {[addr.district, addr.city, addr.province, addr.postalCode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </>
          ) : (
            <p className="text-[var(--color-muted)]">—</p>
          )}
        </div>
      </div>

      <table className="w-full">
        <thead className="border-b text-left text-xs text-[var(--color-muted)]">
          <tr>
            <th className="py-1">Produk</th>
            <th className="py-1 text-right">Qty</th>
            <th className="py-1 text-right">Harga</th>
            <th className="py-1 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id} className="border-b">
              <td className="py-2">
                {i.productName}
                <span className="text-[var(--color-muted)]"> — {i.variantName}</span>
                <span className="block text-xs text-[var(--color-muted)]">{i.sku}</span>
              </td>
              <td className="py-2 text-right">{i.quantity}</td>
              <td className="py-2 text-right">{formatIdr(i.unitPriceIdr)}</td>
              <td className="py-2 text-right">{formatIdr(i.lineTotalIdr)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <table className="text-right">
          <tbody>
            <tr>
              <td className="pr-6 text-[var(--color-muted)]">Subtotal</td>
              <td>{formatIdr(order.subtotalIdr)}</td>
            </tr>
            {order.discountTotalIdr > 0 && (
              <tr>
                <td className="pr-6 text-[var(--color-muted)]">Diskon</td>
                <td>- {formatIdr(order.discountTotalIdr)}</td>
              </tr>
            )}
            <tr>
              <td className="pr-6 text-[var(--color-muted)]">Ongkir</td>
              <td>{formatIdr(order.shippingTotalIdr)}</td>
            </tr>
            <tr className="border-t text-base font-semibold">
              <td className="pr-6 pt-1">Total</td>
              <td className="pt-1">{formatIdr(order.grandTotalIdr)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-8 text-xs text-[var(--color-muted)]">
        {paid
          ? 'Pembayaran telah diterima. Terima kasih telah berbelanja di Lombok Exotic.'
          : 'Faktur ini bukan bukti pembayaran. Total di atas belum lunas.'}
      </p>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        {clientConfig.legalName ?? clientConfig.name}
      </p>

      <div className="mt-8">
        <PrintButton />
      </div>
    </div>
  );
}
