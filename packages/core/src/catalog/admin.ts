import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db, schema } from '../db/index';
import { writeAudit } from '../audit';
import type { Executor } from '../orders/stock';

const { products, productVariants, productImages, categories } = schema;

export interface AdminActor {
  userId: string;
  label: string;
  ip?: string | null;
  userAgent?: string | null;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 150);
}

// ── Listing / detail ───────────────────────────────────────────────────────

export async function listAdminProducts(query: { q?: string | null; status?: string | null } = {}) {
  const conds = [];
  if (query.status && ['draft', 'active', 'archived'].includes(query.status)) {
    conds.push(eq(products.status, query.status as never));
  }
  if (query.q?.trim()) {
    const t = `%${query.q.trim()}%`;
    conds.push(or(ilike(products.name, t), ilike(products.slug, t)));
  }
  const rows = await db.query.products.findMany({
    where: conds.length ? and(...conds) : undefined,
    orderBy: [desc(products.updatedAt)],
    with: {
      category: { columns: { name: true } },
      variants: { columns: { priceIdr: true, stock: true, reserved: true, isActive: true } },
      images: { columns: { url: true }, orderBy: [asc(productImages.position)], limit: 1 },
    },
    limit: 200,
  });
  return rows.map((p) => {
    const active = p.variants.filter((v) => v.isActive);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      type: p.type,
      status: p.status,
      isFeatured: p.isFeatured,
      categoryName: p.category?.name ?? null,
      imageUrl: p.images[0]?.url ?? null,
      variantCount: active.length,
      priceFromIdr: active.length ? Math.min(...active.map((v) => v.priceIdr)) : null,
      totalStock: active.reduce((n, v) => n + Math.max(0, v.stock - v.reserved), 0),
    };
  });
}

export async function getAdminProduct(id: string) {
  return db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      variants: { orderBy: [asc(productVariants.priceIdr)] },
      images: { orderBy: [asc(productImages.position)] },
      category: true,
    },
  });
}

export async function listCategoriesForAdmin() {
  return db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .orderBy(asc(categories.position), asc(categories.name));
}

// ── Product mutations ──────────────────────────────────────────────────────

export interface ProductInput {
  name: string;
  slug?: string | null;
  categoryId?: string | null;
  type: 'simple' | 'variable' | 'bundle';
  status: 'draft' | 'active' | 'archived';
  shortDescription?: string | null;
  description?: string | null;
  story?: string | null;
  isFeatured: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export type SaveProductResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; error: 'slug_taken' | 'not_found' };

export async function saveProduct(
  id: string | null,
  input: ProductInput,
  actor: AdminActor,
): Promise<SaveProductResult> {
  const slug = (input.slug?.trim() || slugify(input.name)) || `produk-${Date.now()}`;

  const clash = await db.query.products.findFirst({
    where: id ? and(eq(products.slug, slug), sql`${products.id} <> ${id}`) : eq(products.slug, slug),
    columns: { id: true },
  });
  if (clash) return { ok: false, error: 'slug_taken' };

  const values = {
    name: input.name.trim(),
    slug,
    categoryId: input.categoryId || null,
    type: input.type,
    status: input.status,
    shortDescription: input.shortDescription?.trim() || null,
    description: input.description?.trim() || null,
    story: input.story?.trim() || null,
    isFeatured: input.isFeatured,
    metaTitle: input.metaTitle?.trim() || null,
    metaDescription: input.metaDescription?.trim() || null,
  };

  if (id) {
    const before = await db.query.products.findFirst({ where: eq(products.id, id) });
    if (!before) return { ok: false, error: 'not_found' };
    await db.update(products).set(values).where(eq(products.id, id));
    await writeAudit(db, {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: 'product.update',
      entityType: 'product',
      entityId: id,
      before: { name: before.name, status: before.status },
      after: { name: values.name, status: values.status },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    await recomputePriceFrom(db, id);
    return { ok: true, id, slug };
  }

  const [row] = await db.insert(products).values(values).returning({ id: products.id });
  if (!row) return { ok: false, error: 'not_found' };
  await writeAudit(db, {
    actorUserId: actor.userId,
    actorLabel: actor.label,
    action: 'product.create',
    entityType: 'product',
    entityId: row.id,
    after: { name: values.name },
    ip: actor.ip,
    userAgent: actor.userAgent,
  });
  return { ok: true, id: row.id, slug };
}

// ── Variant mutations ──────────────────────────────────────────────────────

export interface VariantInput {
  sku: string;
  name: string;
  priceIdr: number;
  compareAtIdr?: number | null;
  weightGrams: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  stock: number;
  lowStockThreshold?: number | null;
  attributes?: Record<string, string>;
  isActive: boolean;
}

export type SaveVariantResult =
  | { ok: true; id: string }
  | { ok: false; error: 'sku_taken' | 'weight_invalid' | 'not_found' };

export async function saveVariant(
  productId: string,
  variantId: string | null,
  input: VariantInput,
  actor: AdminActor,
): Promise<SaveVariantResult> {
  if (!Number.isFinite(input.weightGrams) || input.weightGrams <= 0) {
    return { ok: false, error: 'weight_invalid' };
  }
  const sku = input.sku.trim();
  const clash = await db.query.productVariants.findFirst({
    where: variantId
      ? and(eq(productVariants.sku, sku), sql`${productVariants.id} <> ${variantId}`)
      : eq(productVariants.sku, sku),
    columns: { id: true },
  });
  if (clash) return { ok: false, error: 'sku_taken' };

  const values = {
    sku,
    name: input.name.trim(),
    priceIdr: Math.round(input.priceIdr),
    compareAtIdr: input.compareAtIdr ? Math.round(input.compareAtIdr) : null,
    weightGrams: Math.round(input.weightGrams),
    lengthCm: input.lengthCm ?? null,
    widthCm: input.widthCm ?? null,
    heightCm: input.heightCm ?? null,
    stock: Math.max(0, Math.round(input.stock)),
    lowStockThreshold: input.lowStockThreshold ?? 5,
    attributes: input.attributes ?? {},
    isActive: input.isActive,
  };

  let vid: string;
  if (variantId) {
    const exists = await db.query.productVariants.findFirst({
      where: eq(productVariants.id, variantId),
      columns: { id: true },
    });
    if (!exists) return { ok: false, error: 'not_found' };
    await db.update(productVariants).set(values).where(eq(productVariants.id, variantId));
    vid = variantId;
  } else {
    const [row] = await db
      .insert(productVariants)
      .values({ ...values, productId })
      .returning({ id: productVariants.id });
    if (!row) return { ok: false, error: 'not_found' };
    vid = row.id;
  }

  await recomputePriceFrom(db, productId);
  await writeAudit(db, {
    actorUserId: actor.userId,
    actorLabel: actor.label,
    action: variantId ? 'variant.update' : 'variant.create',
    entityType: 'variant',
    entityId: vid,
    after: { sku, priceIdr: values.priceIdr, stock: values.stock },
    ip: actor.ip,
    userAgent: actor.userAgent,
  });
  return { ok: true, id: vid };
}

/** Soft-delete: variants may be referenced by historical orders, so never hard-delete. */
export async function deactivateVariant(
  variantId: string,
  actor: AdminActor,
): Promise<{ ok: boolean }> {
  const v = await db.query.productVariants.findFirst({
    where: eq(productVariants.id, variantId),
    columns: { id: true, productId: true },
  });
  if (!v) return { ok: false };
  await db.update(productVariants).set({ isActive: false }).where(eq(productVariants.id, variantId));
  await recomputePriceFrom(db, v.productId);
  await writeAudit(db, {
    actorUserId: actor.userId,
    actorLabel: actor.label,
    action: 'variant.deactivate',
    entityType: 'variant',
    entityId: variantId,
    ip: actor.ip,
    userAgent: actor.userAgent,
  });
  return { ok: true };
}

// ── Images ─────────────────────────────────────────────────────────────────

export async function attachImage(
  productId: string,
  url: string,
  alt: string | null,
): Promise<void> {
  const rows = await db
    .select({ maxPos: sql<number>`coalesce(max(${productImages.position}), -1)` })
    .from(productImages)
    .where(eq(productImages.productId, productId));
  const nextPos = Number(rows[0]?.maxPos ?? -1) + 1;
  await db
    .insert(productImages)
    .values({ productId, url, alt: alt || null, position: nextPos });
}

export async function detachImage(imageId: string): Promise<void> {
  await db.delete(productImages).where(eq(productImages.id, imageId));
}

// ── helpers ────────────────────────────────────────────────────────────────

async function recomputePriceFrom(exec: Executor | typeof db, productId: string): Promise<void> {
  const rows = await exec
    .select({ min: sql<number | null>`min(${productVariants.priceIdr})` })
    .from(productVariants)
    .where(and(eq(productVariants.productId, productId), eq(productVariants.isActive, true)));
  const min = rows[0]?.min ?? null;
  await exec
    .update(products)
    .set({ priceFrom: min == null ? null : Number(min) })
    .where(eq(products.id, productId));
}
