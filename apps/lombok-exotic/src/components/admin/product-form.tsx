'use client';

import { useActionState, useState } from 'react';
import { formatIdr } from '@lombok-exotic/core/money';
import {
  addImageAction,
  deactivateVariantAction,
  type FormState,
  removeImageAction,
  saveProductAction,
  saveVariantAction,
} from '@/app/admin/(app)/produk/actions';

const initial: FormState = { status: 'idle' };

function Msg({ s }: { s: FormState }) {
  if (s.status === 'idle') return null;
  return (
    <p className={`text-sm ${s.status === 'ok' ? 'text-green-700' : 'text-brand'}`}>{s.message}</p>
  );
}

const input = 'mt-1 w-full rounded border px-3 py-2 text-sm';

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  categoryId: string | null;
  type: string;
  status: string;
  shortDescription: string | null;
  description: string | null;
  story: string | null;
  isFeatured: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
}

export function ProductFields({
  product,
  categories,
}: {
  product: ProductRow | null;
  categories: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(saveProductAction, initial);
  const p = product;

  return (
    <form action={action} className="space-y-4 rounded border bg-white p-4">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Nama produk</span>
          <input name="name" required defaultValue={p?.name ?? ''} className={input} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Slug (opsional)</span>
          <input name="slug" defaultValue={p?.slug ?? ''} placeholder="auto dari nama" className={input} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Kategori</span>
          <select name="categoryId" defaultValue={p?.categoryId ?? ''} className={input}>
            <option value="">— tanpa kategori —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Tipe</span>
          <select name="type" defaultValue={p?.type ?? 'variable'} className={input}>
            <option value="simple">Simple (1 varian)</option>
            <option value="variable">Variable (banyak varian)</option>
            <option value="bundle">Bundle (paket)</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Status</span>
          <select name="status" defaultValue={p?.status ?? 'draft'} className={input}>
            <option value="draft">Draft</option>
            <option value="active">Aktif</option>
            <option value="archived">Arsip</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Deskripsi singkat</span>
          <input name="shortDescription" defaultValue={p?.shortDescription ?? ''} className={input} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Deskripsi lengkap</span>
          <textarea name="description" rows={3} defaultValue={p?.description ?? ''} className={input} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Cerita di balik produk</span>
          <textarea name="story" rows={3} defaultValue={p?.story ?? ''} className={input} />
        </label>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" name="isFeatured" defaultChecked={p?.isFeatured ?? false} />
          <span className="text-sm">{'Tampilkan di “Produk Pilihan” (beranda)'}</span>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-brand px-5 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
        >
          {pending ? 'Menyimpan…' : 'Simpan Produk'}
        </button>
        <Msg s={state} />
      </div>
    </form>
  );
}

interface VariantRow {
  id: string;
  sku: string;
  name: string;
  priceIdr: number;
  compareAtIdr: number | null;
  weightGrams: number;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  stock: number;
  reserved: number;
  lowStockThreshold: number;
  attributes: Record<string, string>;
  isActive: boolean;
}

export function VariantEditor({
  productId,
  variants,
}: {
  productId: string;
  variants: VariantRow[];
}) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-3 rounded border bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Varian ({variants.length})</h2>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded border px-2 py-1 text-xs hover:border-brand"
        >
          {adding ? 'Batal' : '+ Tambah varian'}
        </button>
      </div>

      {adding && <VariantForm productId={productId} variant={null} onDone={() => setAdding(false)} />}

      <ul className="divide-y">
        {variants.map((v) => (
          <li key={v.id} className="py-2">
            <VariantRowItem productId={productId} variant={v} />
          </li>
        ))}
        {variants.length === 0 && !adding && (
          <li className="py-3 text-sm text-[var(--color-muted)]">Belum ada varian.</li>
        )}
      </ul>
    </div>
  );
}

function VariantRowItem({ productId, variant }: { productId: string; variant: VariantRow }) {
  const [open, setOpen] = useState(false);
  const [delState, delAction, delPending] = useActionState(deactivateVariantAction, initial);
  const avail = variant.stock - variant.reserved;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-left">
          <span className="font-medium">{variant.name}</span>
          <span className="ml-2 text-xs text-[var(--color-muted)]">
            {variant.sku} · {formatIdr(variant.priceIdr)} · {variant.weightGrams} g · stok {avail}
          </span>
          {!variant.isActive && <span className="ml-2 text-xs text-brand">(nonaktif)</span>}
        </button>
        {variant.isActive && (
          <form action={delAction}>
            <input type="hidden" name="variantId" value={variant.id} />
            <input type="hidden" name="productId" value={productId} />
            <button
              type="submit"
              disabled={delPending}
              className="text-xs text-[var(--color-muted)] hover:text-brand"
            >
              Nonaktifkan
            </button>
          </form>
        )}
      </div>
      <Msg s={delState} />
      {open && <VariantForm productId={productId} variant={variant} onDone={() => setOpen(false)} />}
    </div>
  );
}

function VariantForm({
  productId,
  variant,
  onDone,
}: {
  productId: string;
  variant: VariantRow | null;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(saveVariantAction, initial);
  const v = variant;
  if (state.status === 'ok') {
    // collapse on success (revalidation re-renders the list)
    setTimeout(onDone, 300);
  }
  return (
    <form action={action} className="mt-2 grid gap-2 rounded bg-black/5 p-3 sm:grid-cols-3">
      <input type="hidden" name="productId" value={productId} />
      {v && <input type="hidden" name="variantId" value={v.id} />}
      <Field name="sku" label="SKU" defaultValue={v?.sku} required />
      <Field name="vname" label="Nama varian" defaultValue={v?.name} required />
      <Field name="priceIdr" label="Harga (Rp)" defaultValue={v?.priceIdr} required inputMode="numeric" />
      <Field name="compareAtIdr" label="Harga coret" defaultValue={v?.compareAtIdr ?? ''} inputMode="numeric" />
      <Field name="weightGrams" label="Berat (g) *" defaultValue={v?.weightGrams} required inputMode="numeric" />
      <Field name="stock" label="Stok" defaultValue={v?.stock ?? 0} required inputMode="numeric" />
      <Field name="lengthCm" label="P (cm)" defaultValue={v?.lengthCm ?? ''} inputMode="numeric" />
      <Field name="widthCm" label="L (cm)" defaultValue={v?.widthCm ?? ''} inputMode="numeric" />
      <Field name="heightCm" label="T (cm)" defaultValue={v?.heightCm ?? ''} inputMode="numeric" />
      <Field
        name="attributes"
        label='Atribut JSON (mis. {"ukuran":"L"})'
        defaultValue={v ? JSON.stringify(v.attributes) : ''}
        className="sm:col-span-3"
      />
      <label className="flex items-center gap-2 text-sm sm:col-span-3">
        <input type="checkbox" name="isActive" defaultChecked={v?.isActive ?? true} />
        Aktif
      </label>
      <div className="flex items-center gap-3 sm:col-span-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-brand px-4 py-1.5 text-sm font-medium text-brand-foreground disabled:opacity-50"
        >
          {pending ? 'Menyimpan…' : 'Simpan Varian'}
        </button>
        <Msg s={state} />
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required,
  inputMode,
  className = '',
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  required?: boolean;
  inputMode?: 'numeric' | 'text';
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-medium">{label}</span>
      <input
        name={name}
        required={required}
        inputMode={inputMode}
        defaultValue={defaultValue ?? ''}
        className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
      />
    </label>
  );
}

export function ImageManager({
  productId,
  images,
}: {
  productId: string;
  images: Array<{ id: string; url: string; alt: string | null }>;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addState, addAction] = useActionState(addImageAction, initial);
  const [rmState, rmAction] = useActionState(removeImageAction, initial);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(
          json.error === 'too_large'
            ? 'Ukuran maks 5 MB.'
            : json.error === 'not_image'
              ? 'Format harus JPG/PNG/WebP/AVIF.'
              : 'Gagal unggah.',
        );
        return;
      }
      const af = new FormData();
      af.set('productId', productId);
      af.set('url', json.url);
      af.set('alt', file.name.replace(/\.[^.]+$/, ''));
      addAction(af);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="space-y-3 rounded border bg-white p-4">
      <h2 className="text-sm font-medium">Gambar ({images.length})</h2>
      <div className="flex flex-wrap gap-3">
        {images.map((img) => (
          <div key={img.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.alt ?? ''} className="h-24 w-24 rounded border object-cover" />
            <form action={rmAction} className="absolute -right-2 -top-2">
              <input type="hidden" name="imageId" value={img.id} />
              <input type="hidden" name="productId" value={productId} />
              <button
                type="submit"
                className="rounded-full bg-black px-1.5 text-xs text-white"
                title="Hapus"
              >
                ×
              </button>
            </form>
          </div>
        ))}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm hover:border-brand">
        <input type="file" accept="image/*" onChange={onFile} className="hidden" />
        {uploading ? 'Mengunggah…' : '+ Unggah gambar'}
      </label>
      {error && <p className="text-sm text-brand">{error}</p>}
      <Msg s={addState} />
      <Msg s={rmState} />
    </div>
  );
}
