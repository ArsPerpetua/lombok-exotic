'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { saveVoucher, toggleVoucher } from '@lombok-exotic/core/marketing';
import { AuthorizationError } from '@lombok-exotic/core/auth';
import { requireAdminActor } from '@/lib/auth-server';

export type FormState =
  | { status: 'idle' }
  | { status: 'ok'; message: string }
  | { status: 'error'; message: string };

const int = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const optInt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(s.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const optDate = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

export async function saveVoucherAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get('id') ?? '') || null;
  const code = String(formData.get('code') ?? '').trim();
  if (code.length < 3) return { status: 'error', message: 'Kode minimal 3 karakter.' };

  try {
    const actor = await requireAdminActor('marketing:write');
    const res = await saveVoucher(
      id,
      {
        code,
        description: String(formData.get('description') ?? '').trim() || null,
        discountType: formData.get('discountType') === 'fixed' ? 'fixed' : 'percent',
        discountValue: int(formData.get('discountValue')),
        minOrderValueIdr: optInt(formData.get('minOrderValueIdr')),
        maxDiscountIdr: optInt(formData.get('maxDiscountIdr')),
        usageLimit: optInt(formData.get('usageLimit')),
        perCustomerLimit: Math.max(1, int(formData.get('perCustomerLimit')) || 1),
        startsAt: optDate(formData.get('startsAt')),
        endsAt: optDate(formData.get('endsAt')),
        isActive: formData.get('isActive') === 'on',
      },
      actor,
    );
    if (!res.ok) return { status: 'error', message: 'Kode voucher sudah dipakai.' };
    revalidatePath('/admin/voucher');
    if (!id) redirect('/admin/voucher');
    return { status: 'ok', message: 'Voucher disimpan.' };
  } catch (err) {
    if (err instanceof AuthorizationError) return { status: 'error', message: 'Tidak punya izin.' };
    if (typeof err === 'object' && err && 'digest' in err) throw err;
    console.error('[admin] saveVoucherAction:', err);
    return { status: 'error', message: 'Terjadi kesalahan.' };
  }
}

export async function toggleVoucherAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireAdminActor('marketing:write');
    await toggleVoucher(
      String(formData.get('id') ?? ''),
      formData.get('isActive') === 'true',
      actor,
    );
    revalidatePath('/admin/voucher');
    return { status: 'ok', message: 'Diperbarui.' };
  } catch (err) {
    if (err instanceof AuthorizationError) return { status: 'error', message: 'Tidak punya izin.' };
    return { status: 'error', message: 'Terjadi kesalahan.' };
  }
}
