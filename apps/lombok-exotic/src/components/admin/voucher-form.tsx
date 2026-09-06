'use client';

import { useActionState } from 'react';
import { type FormState, saveVoucherAction, toggleVoucherAction } from '@/app/admin/(app)/voucher/actions';

const initial: FormState = { status: 'idle' };
const input = 'mt-1 w-full rounded border px-2 py-1.5 text-sm';

interface Voucher {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minOrderValueIdr: number | null;
  maxDiscountIdr: number | null;
  usageLimit: number | null;
  perCustomerLimit: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
}

const asDate = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export function VoucherForm({ voucher }: { voucher: Voucher | null }) {
  const [state, action, pending] = useActionState(saveVoucherAction, initial);
  const v = voucher;
  return (
    <form action={action} className="grid max-w-xl gap-3 rounded border bg-white p-4 sm:grid-cols-2">
      {v && <input type="hidden" name="id" value={v.id} />}
      <label className="block">
        <span className="text-xs font-medium">Kode</span>
        <input name="code" required defaultValue={v?.code ?? ''} className={`${input} uppercase`} />
      </label>
      <label className="block">
        <span className="text-xs font-medium">Deskripsi</span>
        <input name="description" defaultValue={v?.description ?? ''} className={input} />
      </label>
      <label className="block">
        <span className="text-xs font-medium">Tipe diskon</span>
        <select name="discountType" defaultValue={v?.discountType ?? 'percent'} className={input}>
          <option value="percent">Persen (%)</option>
          <option value="fixed">Nominal (Rp)</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium">Nilai diskon</span>
        <input name="discountValue" required inputMode="numeric" defaultValue={v?.discountValue ?? ''} className={input} />
      </label>
      <label className="block">
        <span className="text-xs font-medium">Min. belanja (Rp)</span>
        <input name="minOrderValueIdr" inputMode="numeric" defaultValue={v?.minOrderValueIdr ?? ''} className={input} />
      </label>
      <label className="block">
        <span className="text-xs font-medium">Maks. potongan (Rp)</span>
        <input name="maxDiscountIdr" inputMode="numeric" defaultValue={v?.maxDiscountIdr ?? ''} className={input} />
      </label>
      <label className="block">
        <span className="text-xs font-medium">Batas total pemakaian</span>
        <input name="usageLimit" inputMode="numeric" defaultValue={v?.usageLimit ?? ''} className={input} />
      </label>
      <label className="block">
        <span className="text-xs font-medium">Batas per pelanggan</span>
        <input name="perCustomerLimit" inputMode="numeric" defaultValue={v?.perCustomerLimit ?? 1} className={input} />
      </label>
      <label className="block">
        <span className="text-xs font-medium">Mulai berlaku</span>
        <input type="date" name="startsAt" defaultValue={asDate(v?.startsAt ?? null)} className={input} />
      </label>
      <label className="block">
        <span className="text-xs font-medium">Berakhir</span>
        <input type="date" name="endsAt" defaultValue={asDate(v?.endsAt ?? null)} className={input} />
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="isActive" defaultChecked={v?.isActive ?? true} />
        Aktif
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-brand px-5 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
        >
          {pending ? 'Menyimpan…' : 'Simpan Voucher'}
        </button>
        {state.status !== 'idle' && (
          <span className={`text-sm ${state.status === 'ok' ? 'text-green-700' : 'text-brand'}`}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

export function VoucherToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [, action, pending] = useActionState(toggleVoucherAction, initial);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="isActive" value={String(!isActive)} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs text-brand hover:underline disabled:opacity-50"
      >
        {isActive ? 'Nonaktifkan' : 'Aktifkan'}
      </button>
    </form>
  );
}
