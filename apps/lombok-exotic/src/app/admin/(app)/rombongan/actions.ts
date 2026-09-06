'use server';

import { revalidatePath } from 'next/cache';
import {
  assignGroupPreorder,
  generateQuote,
  removeGroupItem,
  saveGroupItem,
  setGroupNotes,
  transitionGroupPreorder,
} from '@lombok-exotic/core/groups';
import { AuthorizationError } from '@lombok-exotic/core/auth';
import { requireAdminActor } from '@/lib/auth-server';

export type GroupState =
  | { status: 'idle' }
  | { status: 'ok'; message: string }
  | { status: 'error'; message: string };

const ERR: Record<string, string> = {
  not_found: 'Data tidak ditemukan.',
  illegal_transition: 'Perubahan status tidak diizinkan.',
  needs_quote: 'Buat penawaran (quote) dulu.',
  no_items: 'Tambahkan minimal 1 item.',
  no_price: 'Semua item harus punya harga sebelum quote.',
  already_quoted: 'Penawaran sudah pernah dibuat.',
  stock_unavailable: 'Stok salah satu produk tidak cukup.',
  payment_failed: 'Gagal membuat penawaran. Coba lagi.',
};

const guard = async <T>(fn: () => Promise<T>, ok: string): Promise<GroupState> => {
  try {
    const res = (await fn()) as { ok?: boolean; error?: string } | undefined;
    if (res && res.ok === false) return { status: 'error', message: ERR[res.error ?? ''] ?? res.error ?? 'Gagal.' };
    return { status: 'ok', message: ok };
  } catch (err) {
    if (err instanceof AuthorizationError) return { status: 'error', message: 'Tidak punya izin.' };
    console.error('[admin/rombongan]', err);
    return { status: 'error', message: 'Terjadi kesalahan.' };
  }
};

const num = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export async function saveGroupItemAction(_p: GroupState, fd: FormData): Promise<GroupState> {
  const groupId = String(fd.get('groupId') ?? '');
  const itemId = String(fd.get('itemId') ?? '') || null;
  const s = await guard(async () => {
    const actor = await requireAdminActor('group_preorder:write');
    return saveGroupItem(
      groupId,
      itemId,
      {
        variantId: String(fd.get('variantId') ?? '') || null,
        description: String(fd.get('description') ?? '').trim(),
        quantity: num(fd.get('quantity')) || 1,
        unitPriceIdr: String(fd.get('unitPriceIdr') ?? '').trim() ? num(fd.get('unitPriceIdr')) : null,
        notes: String(fd.get('notes') ?? '').trim() || null,
      },
      actor,
    );
  }, 'Item disimpan.');
  revalidatePath(`/admin/rombongan/${groupId}`);
  return s;
}

export async function removeGroupItemAction(_p: GroupState, fd: FormData): Promise<GroupState> {
  const groupId = String(fd.get('groupId') ?? '');
  const s = await guard(async () => {
    const actor = await requireAdminActor('group_preorder:write');
    await removeGroupItem(groupId, String(fd.get('itemId') ?? ''), actor);
  }, 'Item dihapus.');
  revalidatePath(`/admin/rombongan/${groupId}`);
  return s;
}

export async function transitionGroupAction(_p: GroupState, fd: FormData): Promise<GroupState> {
  const groupId = String(fd.get('groupId') ?? '');
  const s = await guard(async () => {
    const actor = await requireAdminActor('group_preorder:write');
    return transitionGroupPreorder(groupId, String(fd.get('to') ?? ''), actor);
  }, 'Status diperbarui.');
  revalidatePath(`/admin/rombongan/${groupId}`);
  revalidatePath('/admin/rombongan');
  return s;
}

export async function assignGroupAction(_p: GroupState, fd: FormData): Promise<GroupState> {
  const groupId = String(fd.get('groupId') ?? '');
  const s = await guard(async () => {
    const actor = await requireAdminActor('group_preorder:write');
    await assignGroupPreorder(groupId, String(fd.get('staffId') ?? '') || null, actor);
  }, 'Ditugaskan.');
  revalidatePath(`/admin/rombongan/${groupId}`);
  return s;
}

export async function setNotesAction(_p: GroupState, fd: FormData): Promise<GroupState> {
  const groupId = String(fd.get('groupId') ?? '');
  const s = await guard(async () => {
    const actor = await requireAdminActor('group_preorder:write');
    await setGroupNotes(groupId, String(fd.get('notes') ?? '').trim(), actor);
  }, 'Catatan disimpan.');
  revalidatePath(`/admin/rombongan/${groupId}`);
  return s;
}

export async function generateQuoteAction(_p: GroupState, fd: FormData): Promise<GroupState> {
  const groupId = String(fd.get('groupId') ?? '');
  const appUrl = String(fd.get('appUrl') ?? '');
  const s = await guard(async () => {
    const actor = await requireAdminActor('group_preorder:write');
    return generateQuote(groupId, actor, appUrl);
  }, 'Penawaran dibuat & dikirim.');
  revalidatePath(`/admin/rombongan/${groupId}`);
  revalidatePath('/admin/rombongan');
  return s;
}
