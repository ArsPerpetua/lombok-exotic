'use client';

import { useActionState } from 'react';
import {
  type AdminActionState,
  recordShipmentAction,
  transitionAction,
} from '@/app/admin/(app)/pesanan/[orderNumber]/actions';

const initial: AdminActionState = { status: 'idle' };

const TRANSITION_LABEL: Record<string, string> = {
  processing: 'Tandai Diproses',
  shipped: 'Tandai Dikirim',
  completed: 'Tandai Selesai',
  cancelled: 'Batalkan Pesanan',
};

export function OrderControls({
  orderNumber,
  allowedTransitions,
  hasTracking,
}: {
  orderNumber: string;
  allowedTransitions: string[];
  hasTracking: boolean;
}) {
  const [tState, tAction, tPending] = useActionState(transitionAction, initial);
  const [sState, sAction, sPending] = useActionState(recordShipmentAction, initial);

  return (
    <div className="space-y-6">
      {/* Status transitions */}
      {allowedTransitions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium">Ubah status</h3>
          <Msg state={tState} />
          <div className="mt-2 flex flex-wrap gap-2">
            {allowedTransitions
              .filter((to) => !(to === 'shipped' && !hasTracking))
              .map((to) => (
                <form key={to} action={tAction}>
                  <input type="hidden" name="orderNumber" value={orderNumber} />
                  <input type="hidden" name="to" value={to} />
                  <button
                    type="submit"
                    disabled={tPending}
                    className={`rounded border px-3 py-1.5 text-sm disabled:opacity-50 ${
                      to === 'cancelled'
                        ? 'border-brand text-brand hover:bg-brand/5'
                        : 'bg-white hover:border-brand'
                    }`}
                  >
                    {TRANSITION_LABEL[to] ?? to}
                  </button>
                </form>
              ))}
          </div>
          {allowedTransitions.includes('shipped') && !hasTracking && (
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              {'Isi nomor resi di bawah untuk menandai “Dikirim”.'}
            </p>
          )}
        </div>
      )}

      {/* Manual resi */}
      <div>
        <h3 className="text-sm font-medium">Input Resi Manual</h3>
        <Msg state={sState} />
        <form action={sAction} className="mt-2 grid max-w-md gap-2">
          <input type="hidden" name="orderNumber" value={orderNumber} />
          <div className="grid grid-cols-2 gap-2">
            <input
              name="courierCompany"
              required
              placeholder="Kurir (mis. JNE)"
              className="rounded border px-3 py-2 text-sm"
            />
            <input
              name="courierType"
              placeholder="Layanan (opsional)"
              className="rounded border px-3 py-2 text-sm"
            />
          </div>
          <input
            name="trackingNumber"
            required
            placeholder="Nomor resi"
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            name="trackingUrl"
            placeholder="Link pelacakan (opsional)"
            className="rounded border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={sPending}
            className="justify-self-start rounded bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
          >
            {sPending ? 'Menyimpan…' : hasTracking ? 'Perbarui Resi' : 'Simpan Resi'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Msg({ state }: { state: AdminActionState }) {
  if (state.status === 'idle') return null;
  return (
    <p className={`mt-1 text-sm ${state.status === 'ok' ? 'text-green-700' : 'text-brand'}`}>
      {state.message}
    </p>
  );
}
