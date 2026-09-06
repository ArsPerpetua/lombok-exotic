'use client';

import { useActionState, useState } from 'react';
import { formatIdr } from '@lombok-exotic/core/money';
import {
  assignGroupAction,
  generateQuoteAction,
  type GroupState,
  removeGroupItemAction,
  saveGroupItemAction,
  setNotesAction,
  transitionGroupAction,
} from '@/app/admin/(app)/rombongan/actions';

const initial: GroupState = { status: 'idle' };
const inp = 'rounded border px-2 py-1.5 text-sm';

function Msg({ s }: { s: GroupState }) {
  if (s.status === 'idle') return null;
  return <p className={`text-sm ${s.status === 'ok' ? 'text-green-700' : 'text-brand'}`}>{s.message}</p>;
}

export interface GroupItem {
  id: string;
  variantId: string | null;
  description: string;
  quantity: number;
  unitPriceIdr: number | null;
  notes: string | null;
  productName: string | null;
}

const TLABEL: Record<string, string> = {
  quoted: 'Tandai Ditawar',
  confirmed: 'Tandai Dikonfirmasi',
  paid: 'Tandai Dibayar',
  fulfilled: 'Tandai Selesai',
  cancelled: 'Batalkan',
};

export function GroupControls({
  groupId,
  allowedTransitions,
  items,
  itemsTotalIdr,
  hasQuote,
  quoteOrderNumber,
  staff,
  assignedTo,
  internalNotes,
  appUrl,
}: {
  groupId: string;
  allowedTransitions: string[];
  items: GroupItem[];
  itemsTotalIdr: number;
  hasQuote: boolean;
  quoteOrderNumber: string | null;
  staff: Array<{ id: string; name: string }>;
  assignedTo: string | null;
  internalNotes: string | null;
  appUrl: string;
}) {
  const [iState, iAction, iPending] = useActionState(saveGroupItemAction, initial);
  const [rState, rAction] = useActionState(removeGroupItemAction, initial);
  const [tState, tAction, tPending] = useActionState(transitionGroupAction, initial);
  const [qState, qAction, qPending] = useActionState(generateQuoteAction, initial);
  const [aState, aAction] = useActionState(assignGroupAction, initial);
  const [nState, nAction] = useActionState(setNotesAction, initial);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      {/* Line items */}
      <section className="rounded border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Item ({items.length})</h2>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="rounded border px-2 py-1 text-xs hover:border-brand"
          >
            {adding ? 'Batal' : '+ Tambah item'}
          </button>
        </div>
        <Msg s={iState} />
        <Msg s={rState} />

        {adding && (
          <form action={iAction} className="mt-2 grid gap-2 rounded bg-black/5 p-3 sm:grid-cols-4">
            <input type="hidden" name="groupId" value={groupId} />
            <input name="description" required placeholder="Deskripsi (mis. Paket A: kopi+kaos)" className={`${inp} sm:col-span-2`} />
            <input name="quantity" inputMode="numeric" placeholder="Qty" defaultValue={1} className={inp} />
            <input name="unitPriceIdr" inputMode="numeric" placeholder="Harga satuan (Rp)" className={inp} />
            <input name="variantId" placeholder="ID varian (opsional)" className={`${inp} sm:col-span-2`} />
            <input name="notes" placeholder="Catatan" className={`${inp} sm:col-span-2`} />
            <button type="submit" disabled={iPending} className="rounded bg-brand px-3 py-1.5 text-sm text-brand-foreground disabled:opacity-50 sm:col-span-4">
              {iPending ? 'Menyimpan…' : 'Tambah'}
            </button>
          </form>
        )}

        <ul className="mt-3 divide-y">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                <span className="font-medium">{it.description}</span>
                {it.productName && <span className="text-[var(--color-muted)]"> · {it.productName}</span>}
                <span className="block text-xs text-[var(--color-muted)]">
                  {it.quantity} × {it.unitPriceIdr != null ? formatIdr(it.unitPriceIdr) : '(harga?)'}
                  {it.notes ? ` — ${it.notes}` : ''}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span>{it.unitPriceIdr != null ? formatIdr(it.unitPriceIdr * it.quantity) : '—'}</span>
                {!hasQuote && (
                  <form action={rAction}>
                    <input type="hidden" name="groupId" value={groupId} />
                    <input type="hidden" name="itemId" value={it.id} />
                    <button type="submit" className="text-xs text-[var(--color-muted)] hover:text-brand">
                      Hapus
                    </button>
                  </form>
                )}
              </span>
            </li>
          ))}
          {items.length === 0 && <li className="py-2 text-sm text-[var(--color-muted)]">Belum ada item.</li>}
        </ul>
        <p className="mt-3 border-t pt-2 text-right text-sm font-semibold">
          Total: {formatIdr(itemsTotalIdr)}
        </p>
      </section>

      {/* Quote */}
      <section className="rounded border bg-white p-4">
        <h2 className="text-sm font-medium">Penawaran</h2>
        <Msg s={qState} />
        {hasQuote ? (
          <p className="mt-1 text-sm">
            Sudah dibuat: pesanan <span className="font-mono">{quoteOrderNumber}</span>.
          </p>
        ) : (
          <form action={qAction} className="mt-2">
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="appUrl" value={appUrl} />
            <button
              type="submit"
              disabled={qPending || items.length === 0}
              className="rounded bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
            >
              {qPending ? 'Membuat…' : 'Buat Penawaran & Kirim'}
            </button>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Membuat pesanan, memesan stok, dan mengirim penawaran + link bayar ke agen.
            </p>
          </form>
        )}
      </section>

      {/* Status + assign */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded border bg-white p-4">
          <h2 className="text-sm font-medium">Status</h2>
          <Msg s={tState} />
          <div className="mt-2 flex flex-wrap gap-2">
            {allowedTransitions.map((to) => (
              <form key={to} action={tAction}>
                <input type="hidden" name="groupId" value={groupId} />
                <input type="hidden" name="to" value={to} />
                <button
                  type="submit"
                  disabled={tPending}
                  className={`rounded border px-3 py-1.5 text-sm disabled:opacity-50 ${
                    to === 'cancelled' ? 'border-brand text-brand' : 'bg-white hover:border-brand'
                  }`}
                >
                  {TLABEL[to] ?? to}
                </button>
              </form>
            ))}
            {allowedTransitions.length === 0 && (
              <span className="text-sm text-[var(--color-muted)]">Status akhir.</span>
            )}
          </div>
        </div>

        <div className="rounded border bg-white p-4">
          <h2 className="text-sm font-medium">Ditugaskan ke</h2>
          <Msg s={aState} />
          <form action={aAction} className="mt-2 flex gap-2">
            <input type="hidden" name="groupId" value={groupId} />
            <select name="staffId" defaultValue={assignedTo ?? ''} className={inp}>
              <option value="">— belum —</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded border px-3 py-1.5 text-sm hover:border-brand">
              Simpan
            </button>
          </form>
        </div>
      </section>

      {/* Internal notes */}
      <section className="rounded border bg-white p-4">
        <h2 className="text-sm font-medium">Catatan Internal</h2>
        <Msg s={nState} />
        <form action={nAction} className="mt-2">
          <input type="hidden" name="groupId" value={groupId} />
          <textarea name="notes" rows={3} defaultValue={internalNotes ?? ''} className={`${inp} w-full`} />
          <button type="submit" className="mt-2 rounded border px-3 py-1.5 text-sm hover:border-brand">
            Simpan Catatan
          </button>
        </form>
      </section>
    </div>
  );
}
