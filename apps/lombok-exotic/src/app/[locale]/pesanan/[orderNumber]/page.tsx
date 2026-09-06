import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { formatIdr } from '@lombok-exotic/core/money';
import { getOrderForConfirmation } from '@lombok-exotic/core/orders';
import { Link } from '@/i18n/navigation';
import { OrderStatusWatcher } from '@/components/order-status-watcher';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false } };

const STATUS_TONE: Record<string, string> = {
  pending_payment: 'text-brand',
  paid: 'text-green-700',
  processing: 'text-green-700',
  shipped: 'text-green-700',
  completed: 'text-green-700',
  cancelled: 'text-[var(--color-muted)]',
  refunded: 'text-[var(--color-muted)]',
};

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; orderNumber: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, orderNumber } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('order');

  const wa = typeof sp.wa === 'string' ? sp.wa.replace(/\D/g, '').slice(-4) : null;
  const order = await getOrderForConfirmation(orderNumber, wa);
  if (!order) notFound();

  const statusLabels: Record<string, string> = {
    pending_payment: t('status.pending_payment'),
    paid: t('status.paid'),
    processing: t('status.processing'),
    shipped: t('status.shipped'),
    completed: t('status.completed'),
    cancelled: t('status.cancelled'),
    refunded: t('status.refunded'),
  };
  const statusLabel = statusLabels[order.status] ?? order.status;
  const showRepay = order.status === 'pending_payment' || order.status === 'cancelled';
  const showFakePay =
    process.env.PAYMENT_PROVIDER === 'fake' &&
    process.env.NODE_ENV !== 'production' &&
    typeof sp.fake_pay !== 'undefined' &&
    order.status === 'pending_payment';

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm text-[var(--color-muted)]">{t('orderNumber')}</p>
      <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>

      <p className={`mt-2 font-medium ${STATUS_TONE[order.status] ?? ''}`}>{statusLabel}</p>
      {order.status === 'pending_payment' && (
        <p className="mt-1 text-sm text-[var(--color-muted)]">{t('pendingHint')}</p>
      )}

      {(showRepay || showFakePay || order.status === 'pending_payment') && (
        <OrderStatusWatcher
          orderNumber={order.orderNumber}
          initialStatus={order.status}
          grandTotalIdr={order.grandTotalIdr}
          showRepay={showRepay}
          showFakePay={showFakePay}
          labels={{
            awaitingConfirm: t('awaitingConfirm'),
            checkStatus: t('checkStatus'),
            checking: t('checking'),
            repay: t('repay'),
            repayGeneric: t('repayGeneric'),
            repayLimit: t('repayLimit'),
            repaySoldOut: t('repaySoldOut'),
            fakePayDev: t('fakePayDev'),
          }}
        />
      )}

      <dl className="mt-8 space-y-2 border-t pt-4 text-sm">
        <Row label={t('subtotal')} value={formatIdr(order.subtotalIdr)} />
        <Row label={t('shipping')} value={formatIdr(order.shippingTotalIdr)} />
        {order.discountTotalIdr > 0 && (
          <Row label={t('discount')} value={`- ${formatIdr(order.discountTotalIdr)}`} />
        )}
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <dt>{t('total')}</dt>
          <dd>{formatIdr(order.grandTotalIdr)}</dd>
        </div>
      </dl>

      {order.shippingSelection && (
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          {t('courier')}: {order.shippingSelection.courierCompany} —{' '}
          {order.shippingSelection.serviceName}
          {order.shippingSelection.etd ? ` (${order.shippingSelection.etd})` : ''}
        </p>
      )}

      {order.authorized ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium">{t('items')}</h2>
          <ul className="mt-2 divide-y rounded border text-sm">
            {order.items.map((i, idx) => (
              <li key={idx} className="flex justify-between gap-3 px-4 py-3">
                <span>
                  {i.productName}
                  <span className="text-[var(--color-muted)]">
                    {' '}
                    — {i.variantName} × {i.quantity}
                  </span>
                </span>
                <span>{formatIdr(i.lineTotalIdr)}</span>
              </li>
            ))}
          </ul>
          {order.recipient && (
            <p className="mt-3 text-sm text-[var(--color-muted)]">
              {t('recipient')}: {order.recipient}
            </p>
          )}
        </section>
      ) : (
        <p className="mt-8 rounded border border-dashed p-4 text-sm text-[var(--color-muted)]">
          {t('detailsLocked')}
        </p>
      )}

      <div className="mt-10 flex gap-3 text-sm">
        <Link href="/lacak" className="rounded border px-4 py-2 hover:border-brand">
          {t('trackCta')}
        </Link>
        <Link href="/katalog" className="rounded border px-4 py-2 hover:border-brand">
          {t('shopMore')}
        </Link>
      </div>
    </div>
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
