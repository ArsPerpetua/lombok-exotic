import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminProduct, listCategoriesForAdmin } from '@lombok-exotic/core/catalog';
import { requireCapability } from '@/lib/auth-server';
import { ImageManager, ProductFields, VariantEditor } from '@/components/admin/product-form';

export const dynamic = 'force-dynamic';

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability('catalog:write');
  const { id } = await params;
  const isNew = id === 'baru';

  const [categories, product] = await Promise.all([
    listCategoriesForAdmin(),
    isNew ? Promise.resolve(null) : getAdminProduct(id),
  ]);
  if (!isNew && !product) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/produk" className="text-sm text-brand hover:underline">
          ← Semua produk
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          {isNew ? 'Produk Baru' : product!.name}
        </h1>
        {!isNew && (
          <p className="text-xs text-[var(--color-muted)]">
            /{product!.slug} ·{' '}
            <Link
              href={`/id/produk/${product!.slug}`}
              target="_blank"
              className="text-brand hover:underline"
            >
              lihat di toko →
            </Link>
          </p>
        )}
      </div>

      <ProductFields
        product={
          product
            ? {
                id: product.id,
                name: product.name,
                slug: product.slug,
                categoryId: product.categoryId,
                type: product.type,
                status: product.status,
                shortDescription: product.shortDescription,
                description: product.description,
                story: product.story,
                isFeatured: product.isFeatured,
                metaTitle: product.metaTitle,
                metaDescription: product.metaDescription,
              }
            : null
        }
        categories={categories}
      />

      {isNew ? (
        <p className="rounded border border-dashed p-4 text-sm text-[var(--color-muted)]">
          Simpan produk dulu, lalu tambahkan varian & gambar.
        </p>
      ) : (
        <>
          <VariantEditor
            productId={product!.id}
            variants={product!.variants.map((v) => ({
              id: v.id,
              sku: v.sku,
              name: v.name,
              priceIdr: v.priceIdr,
              compareAtIdr: v.compareAtIdr,
              weightGrams: v.weightGrams,
              lengthCm: v.lengthCm,
              widthCm: v.widthCm,
              heightCm: v.heightCm,
              stock: v.stock,
              reserved: v.reserved,
              lowStockThreshold: v.lowStockThreshold,
              attributes: v.attributes,
              isActive: v.isActive,
            }))}
          />
          <ImageManager
            productId={product!.id}
            images={product!.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt }))}
          />
        </>
      )}
    </div>
  );
}
