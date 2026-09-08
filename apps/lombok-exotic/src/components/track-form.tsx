'use client';

import { useActionState } from 'react';
import { formatIdr } from '@lombok-exotic/core/money';
import { Link } from '@/i18n/navigation';
import type { TrackedOrder } from '@lombok-exotic/core/orders';
import { lookupOrderAction, type TrackState } from '@/app/[locale]/lacak/actions';

export interface TrackLabels {
  orderNumber: string;
  orderNumberHint: string;
  phone: string;
  phoneHint: string;
  submit: string;
  submitting: string;
  errorInvalid: string;
  errorRateLimited: string;
  errorNotFound: string;
  timeline: string;
  payment: string;
  courier: string;
  tracking: string;
  openTracking: string;
  total: string;
  placed: string;
  again: string;
  statusLabels: Record<string, string>;
}

const initial: TrackState = { status: 'idle' };

export function TrackForm({ labels: t }: { labels: TrackLabels }) {
  const [state, action, pending] = useActionState(lookupOrderAction, initial);

  const errorMsg =
    state.status === 'error'
      ? state.code === 'invalid'
        ? t.errorInvalid
        : state.code === 'rate_limited'
          ? t.errorRateLimited
          : t.errorNotFound
      : null;

  return (
    <div className="mt-8">
      <form action={action} className="grid max-w-md gap-3">
        <label className="block">
          <span className="text-sm font-medium">{t.orderNumber}</span>
          <input
            name="orderNumber"
            required
            placeholder={t.orderNumberHint}
            autoComplete="off"
            className="mt-1 w-full rounded border px-3 py-2 text-base uppercase"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t.phone}</span>
          <input
            name="phone"
            required
            inputMode="tel"
            placeholder={t.phoneHint}
            className="mt-1 w-full rounded border px-3 py-2 text-base"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="justify-self-start rounded bg-brand px-6 py-2.5 font-medium text-brand-foreground disabled:opacity-60"
        >
          {pending ? t.submitting : t.submit}
        </button>
        {errorMsg && <p className="text-sm text-brand">{errorMsg}</p>}
      </form>

      {state.status === 'found' && <Result order={state.order} t={t} />}
    </div>
  );
}

function Result({ order, t }: { order: TrackedOrder; t: TrackLabels }) {
  return (
    <div className="mt-10 max-w-2xl border-t pt-8">
      <p className="text-sm text-[var(--color-muted)]">{t.orderNumber}</p>
      <h2 className="font-display text-2xl">{order.orderNumber}</h2>
      <p className="mt-1 font-medium text-brand">
        {t.statusLabels[order.status] ?? order.status}
      </p>

      <dl className="mt-4 space-y-1 text-sm text-[var(--color-muted)]">
        <div className="flex gap-2">
          <dt>{t.placed}:</dt>
          <dd>{new Date(order.createdAt).toLocaleString('id-ID')}</dd>
        </div>
        <div className="flex gap-2">
          <dt>{t.total}:</dt>
          <dd>{formatIdr(order.grandTotalIdr)}</dd>
        </div>
        {order.paymentStatus && (
          <div className="flex gap-2">
            <dt>{t.payment}:</dt>
            <dd>{order.paymentStatus}</dd>
          </div>
        )}
        {order.shippingSelection && (
          <div className="flex gap-2">
            <dt>{t.courier}:</dt>
            <dd>
              {order.shippingSelection.courierCompany} — {order.shippingSelection.serviceName}
              {order.shippingSelection.etd ? ` (${order.shippingSelection.etd})` : ''}
            </dd>
          </div>
        )}
      </dl>

      {order.shipment?.trackingNumber && (
        <div className="mt-4 rounded border p-3 text-sm">
          <p>
            {t.tracking}: <strong>{order.shipment.trackingNumber}</strong>
          </p>
          {order.shipment.trackingUrl && (
            <a
              href={order.shipment.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              {t.openTracking} →
            </a>
          )}
        </div>
      )}

      <h3 className="mt-8 text-sm font-medium">{t.timeline}</h3>
      <ol className="mt-3 space-y-3 border-l pl-4">
        {[...order.timeline].reverse().map((e, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand" />
            <p className="text-sm font-medium">{t.statusLabels[e.status] ?? e.status}</p>
            {e.note && <p className="text-xs text-[var(--color-muted)]">{e.note}</p>}
            <p className="text-xs text-[var(--color-muted)]">
              {new Date(e.at).toLocaleString('id-ID')}
            </p>
          </li>
        ))}
      </ol>

      {order.shipment && order.shipment.events.length > 0 && (
        <ol className="mt-4 space-y-2 border-l pl-4 text-sm">
          {order.shipment.events.map((e, i) => (
            <li key={i}>
              <span className="font-medium">{e.status}</span>
              {e.note ? ` — ${e.note}` : ''}
              {e.at && (
                <span className="block text-xs text-[var(--color-muted)]">
                  {new Date(e.at).toLocaleString('id-ID')}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      <Link
        href="/katalog"
        className="mt-10 inline-block rounded border px-5 py-2 text-sm hover:border-brand"
      >
        {t.again}
      </Link>
    </div>
  );
}
