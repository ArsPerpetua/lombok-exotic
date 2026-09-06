'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { recordShipment, transitionOrder } from '@lombok-exotic/core/orders';
import { AuthorizationError } from '@lombok-exotic/core/auth';
import { requireAdminActor } from '@/lib/auth-server';

export type AdminActionState =
  | { status: 'idle' }
  | { status: 'ok'; message: string }
  | { status: 'error'; message: string };

const ERR: Record<string, string> = {
  not_found: 'Pesanan tidak ditemukan.',
  illegal_transition: 'Perubahan status tidak diizinkan dari status sekarang.',
  needs_shipment: 'Isi nomor resi dulu sebelum menandai "Dikirim".',
  bad_status: 'Status pesanan tidak memungkinkan input resi.',
};

const transitionInput = z.object({
  orderNumber: z.string().trim().min(4),
  to: z.enum(['processing', 'shipped', 'completed', 'cancelled']),
  note: z.string().trim().max(300).optional().or(z.literal('')),
});

export async function transitionAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = transitionInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: 'error', message: 'Input tidak valid.' };

  try {
    const actor = await requireAdminActor('order:write');
    const res = await transitionOrder(
      parsed.data.orderNumber,
      parsed.data.to,
      actor,
      parsed.data.note || undefined,
    );
    if (!res.ok) return { status: 'error', message: ERR[res.error] ?? res.error };
    revalidatePath(`/admin/pesanan/${parsed.data.orderNumber}`);
    revalidatePath('/admin/pesanan');
    return { status: 'ok', message: 'Status diperbarui.' };
  } catch (err) {
    if (err instanceof AuthorizationError) return { status: 'error', message: 'Tidak punya izin.' };
    console.error('[admin] transitionAction:', err);
    return { status: 'error', message: 'Terjadi kesalahan.' };
  }
}

const shipmentInput = z.object({
  orderNumber: z.string().trim().min(4),
  courierCompany: z.string().trim().min(2).max(40),
  courierType: z.string().trim().max(40).optional().or(z.literal('')),
  trackingNumber: z.string().trim().min(4).max(60),
  trackingUrl: z.string().trim().url().optional().or(z.literal('')),
  note: z.string().trim().max(300).optional().or(z.literal('')),
});

export async function recordShipmentAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = shipmentInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: 'error', message: 'Isi nama kurir dan nomor resi.' };

  try {
    const actor = await requireAdminActor('order:write');
    const res = await recordShipment(
      parsed.data.orderNumber,
      {
        courierCompany: parsed.data.courierCompany,
        courierType: parsed.data.courierType || null,
        trackingNumber: parsed.data.trackingNumber,
        trackingUrl: parsed.data.trackingUrl || null,
        note: parsed.data.note || null,
      },
      actor,
    );
    if (!res.ok) return { status: 'error', message: ERR[res.error] ?? res.error };
    revalidatePath(`/admin/pesanan/${parsed.data.orderNumber}`);
    revalidatePath('/admin/pesanan');
    return { status: 'ok', message: 'Resi disimpan, pesanan ditandai "Dikirim".' };
  } catch (err) {
    if (err instanceof AuthorizationError) return { status: 'error', message: 'Tidak punya izin.' };
    console.error('[admin] recordShipmentAction:', err);
    return { status: 'error', message: 'Terjadi kesalahan.' };
  }
}
