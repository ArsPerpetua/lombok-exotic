'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface OrderWatcherLabels {
  awaitingConfirm: string;
  checkStatus: string;
  checking: string;
  repay: string;
  repayGeneric: string;
  repayLimit: string;
  repaySoldOut: string;
  fakePayDev: string;
}

interface Props {
  orderNumber: string;
  initialStatus: string;
  grandTotalIdr: number;
  showRepay: boolean;
  showFakePay: boolean;
  labels: OrderWatcherLabels;
}

const POLL_MS = 3000;
const MAX_POLLS = 30; // ~90s

export function OrderStatusWatcher({
  orderNumber,
  initialStatus,
  grandTotalIdr,
  showRepay,
  showFakePay,
  labels: t,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | 'check' | 'repay' | 'fake'>(null);
  const [error, setError] = useState<string | null>(null);
  const polls = useRef(0);

  const checkOnce = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderNumber}/status`, { cache: 'no-store' });
      const json = (await res.json()) as { status?: string };
      if (json.status && json.status !== initialStatus) {
        router.refresh();
        return true;
      }
    } catch {
      /* keep polling */
    }
    return false;
  }, [orderNumber, initialStatus, router]);

  useEffect(() => {
    if (initialStatus !== 'pending_payment') return;
    const id = setInterval(async () => {
      polls.current += 1;
      const changed = await checkOnce();
      if (changed || polls.current >= MAX_POLLS) clearInterval(id);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [initialStatus, checkOnce]);

  async function manualCheck() {
    setBusy('check');
    setError(null);
    await checkOnce();
    setBusy(null);
  }

  async function repay() {
    setBusy('repay');
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderNumber}/repay`, { method: 'POST' });
      const json = (await res.json()) as { ok: boolean; error?: string; redirectUrl?: string };
      if (json.ok && json.redirectUrl) {
        window.location.href = json.redirectUrl;
        return;
      }
      setError(
        json.error === 'retry_limit'
          ? t.repayLimit
          : json.error === 'stock_unavailable'
            ? t.repaySoldOut
            : t.repayGeneric,
      );
    } catch {
      setError(t.repayGeneric);
    }
    setBusy(null);
  }

  async function fakePay() {
    setBusy('fake');
    setError(null);
    try {
      await fetch('/api/webhooks/midtrans', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          order_id: orderNumber,
          status: 'settlement',
          gross_amount: String(grandTotalIdr),
          event_id: Date.now(),
        }),
      });
      await new Promise((r) => setTimeout(r, 400));
      router.refresh();
    } catch {
      setError(t.repayGeneric);
    }
    setBusy(null);
  }

  return (
    <div className="mt-4 space-y-3">
      {initialStatus === 'pending_payment' && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-brand" aria-hidden />
          <span className="text-sm text-[var(--color-muted)]">{t.awaitingConfirm}</span>
          <button
            type="button"
            onClick={manualCheck}
            disabled={busy != null}
            className="rounded border px-3 py-1 text-xs hover:border-brand disabled:opacity-40"
          >
            {busy === 'check' ? t.checking : t.checkStatus}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-brand">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {showRepay && (
          <button
            type="button"
            onClick={repay}
            disabled={busy != null}
            className="rounded bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
          >
            {busy === 'repay' ? '…' : t.repay}
          </button>
        )}
        {showFakePay && (
          <button
            type="button"
            onClick={fakePay}
            disabled={busy != null}
            className="rounded border border-dashed border-brand px-4 py-2 text-sm text-brand disabled:opacity-50"
          >
            {busy === 'fake' ? '…' : t.fakePayDev}
          </button>
        )}
      </div>
    </div>
  );
}
