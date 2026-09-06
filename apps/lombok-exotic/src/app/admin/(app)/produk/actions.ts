'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  attachImage,
  deactivateVariant,
  detachImage,
  saveProduct,
  saveVariant,
} from '@lombok-exotic/core/catalog';
import { AuthorizationError } from '@lombok-exotic/core/auth';
import { requireAdminActor } from '@/lib/auth-server';

export type FormState =
  | { status: 'idle' }
  | { status: 'ok'; message: string }
  | { status: 'error'; message: string };

const ERR: Record<string, string> = {
  slug_taken: 'Slug sudah dipakai produk lain.',
  sku_taken: 'SKU sudah dipakai varian lain.',
  weight_invalid: 'Berat harus lebih dari 0 gram.',
  not_found: 'Data tidak ditemukan.',
};

const num = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const optNum = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(s.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const productSchema = z.object({
  id: z.string().trim().optional().or(z.literal('')),
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(160).optional().or(z.literal('')),
  categoryId: z.string().trim().optional().or(z.literal('')),
  type: z.enum(['simple', 'variable', 'bundle']),
  status: z.enum(['draft', 'active', 'archived']),
  shortDescription: z.string().trim().max(400).optional().or(z.literal('')),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  story: z.string().trim().max(5000).optional().or(z.literal('')),
  isFeatured: z.string().optional(),
  metaTitle: z.string().trim().max(160).optional().or(z.literal('')),
  metaDescription: z.string().trim().max(320).optional().or(z.literal('')),
});

export async function saveProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: 'error', message: 'Periksa kembali isian.' };
  const d = parsed.data;

  try {
    const actor = await requireAdminActor('catalog:write');
    const res = await saveProduct(
      d.id || null,
      {
        name: d.name,
        slug: d.slug || null,
        categoryId: d.categoryId || null,
        type: d.type,
        status: d.status,
        shortDescription: d.shortDescription || null,
        description: d.description || null,
        story: d.story || null,
        isFeatured: d.isFeatured === 'on',
        metaTitle: d.metaTitle || null,
        metaDescription: d.metaDescription || null,
      },
      actor,
    );
    if (!res.ok) return { status: 'error', message: ERR[res.error] ?? res.error };
    revalidatePath('/admin/produk');
    if (!d.id) redirect(`/admin/produk/${res.id}`);
    revalidatePath(`/admin/produk/${res.id}`);
    return { status: 'ok', message: 'Produk disimpan.' };
  } catch (err) {
    if (err instanceof AuthorizationError) return { status: 'error', message: 'Tidak punya izin.' };
    if (isRedirect(err)) throw err;
    console.error('[admin] saveProductAction:', err);
    return { status: 'error', message: 'Terjadi kesalahan.' };
  }
}

export async function saveVariantAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const productId = String(formData.get('productId') ?? '');
  const variantId = String(formData.get('variantId') ?? '') || null;
  if (!productId) return { status: 'error', message: 'Produk tidak valid.' };

  let attributes: Record<string, string> = {};
  try {
    const raw = String(formData.get('attributes') ?? '').trim();
    if (raw) attributes = JSON.parse(raw);
  } catch {
    /* ignore malformed */
  }

  try {
    const actor = await requireAdminActor('catalog:write');
    const res = await saveVariant(
      productId,
      variantId,
      {
        sku: String(formData.get('sku') ?? '').trim(),
        name: String(formData.get('vname') ?? '').trim(),
        priceIdr: num(formData.get('priceIdr')),
        compareAtIdr: optNum(formData.get('compareAtIdr')),
        weightGrams: num(formData.get('weightGrams')),
        lengthCm: optNum(formData.get('lengthCm')),
        widthCm: optNum(formData.get('widthCm')),
        heightCm: optNum(formData.get('heightCm')),
        stock: num(formData.get('stock')),
        lowStockThreshold: optNum(formData.get('lowStockThreshold')),
        attributes,
        isActive: formData.get('isActive') === 'on',
      },
      actor,
    );
    if (!res.ok) return { status: 'error', message: ERR[res.error] ?? res.error };
    revalidatePath(`/admin/produk/${productId}`);
    return { status: 'ok', message: 'Varian disimpan.' };
  } catch (err) {
    if (err instanceof AuthorizationError) return { status: 'error', message: 'Tidak punya izin.' };
    console.error('[admin] saveVariantAction:', err);
    return { status: 'error', message: 'Terjadi kesalahan.' };
  }
}

export async function deactivateVariantAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const variantId = String(formData.get('variantId') ?? '');
  const productId = String(formData.get('productId') ?? '');
  try {
    const actor = await requireAdminActor('catalog:write');
    await deactivateVariant(variantId, actor);
    revalidatePath(`/admin/produk/${productId}`);
    return { status: 'ok', message: 'Varian dinonaktifkan.' };
  } catch (err) {
    if (err instanceof AuthorizationError) return { status: 'error', message: 'Tidak punya izin.' };
    return { status: 'error', message: 'Terjadi kesalahan.' };
  }
}

export async function addImageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const productId = String(formData.get('productId') ?? '');
  const url = String(formData.get('url') ?? '').trim();
  const alt = String(formData.get('alt') ?? '').trim();
  if (!productId || !url.startsWith('/uploads/')) {
    return { status: 'error', message: 'Gambar tidak valid.' };
  }
  try {
    await requireAdminActor('catalog:write');
    await attachImage(productId, url, alt || null);
    revalidatePath(`/admin/produk/${productId}`);
    return { status: 'ok', message: 'Gambar ditambahkan.' };
  } catch (err) {
    if (err instanceof AuthorizationError) return { status: 'error', message: 'Tidak punya izin.' };
    return { status: 'error', message: 'Terjadi kesalahan.' };
  }
}

export async function removeImageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const imageId = String(formData.get('imageId') ?? '');
  const productId = String(formData.get('productId') ?? '');
  try {
    await requireAdminActor('catalog:write');
    await detachImage(imageId);
    revalidatePath(`/admin/produk/${productId}`);
    return { status: 'ok', message: 'Gambar dihapus.' };
  } catch (err) {
    if (err instanceof AuthorizationError) return { status: 'error', message: 'Tidak punya izin.' };
    return { status: 'error', message: 'Terjadi kesalahan.' };
  }
}

function isRedirect(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'digest' in err &&
    typeof (err as { digest: unknown }).digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT');
}
