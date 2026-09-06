import 'server-only';
import { db, schema } from '@lombok-exotic/core/db';
import { and, asc, desc, eq, sql } from 'drizzle-orm';

const { products, productImages, productVariants, categories } = schema;

export interface CatalogItem {
  id: string;
  slug: string;
  name: string;
  type: 'simple' | 'variable' | 'bundle';
  priceFromIdr: number | null;
  imageUrl: string | null;
  imageAlt: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  inStock: boolean;
}

export interface CategoryOption {
  id: string;
  slug: string;
  name: string;
  productCount: number;
}

export const CATALOG_SORTS = ['featured', 'price-asc', 'price-desc', 'newest'] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export function parseSort(value: string | undefined): CatalogSort {
  return (CATALOG_SORTS as readonly string[]).includes(value ?? '')
    ? (value as CatalogSort)
    : 'featured';
}

export const DEFAULT_PER_PAGE = 12;

export interface CatalogQuery {
  categorySlug?: string | null;
  sort?: CatalogSort;
  page?: number;
  perPage?: number;
}

export interface CatalogPage {
  items: CatalogItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  categorySlug: string | null;
  sort: CatalogSort;
}

type VariantStockRow = { stock: number; reserved: number };

function anyInStock(variants: VariantStockRow[]): boolean {
  return variants.some((v) => v.stock - v.reserved > 0);
}

/**
 * Featured products for the homepage. Returns [] on any DB error so the page
 * renders an empty state instead of a 500.
 */
export async function getFeaturedProducts(limit = 8): Promise<CatalogItem[]> {
  try {
    const rows = await db.query.products.findMany({
      where: and(eq(products.status, 'active'), eq(products.isFeatured, true)),
      with: {
        images: { orderBy: [asc(productImages.position)], limit: 1 },
        variants: { columns: { stock: true, reserved: true } },
        category: true,
      },
      orderBy: [asc(products.name)],
      limit,
    });
    return rows.map(toCatalogItem);
  } catch (err) {
    console.warn('[catalog] getFeaturedProducts failed, rendering empty state:', err);
    return [];
  }
}

/** Active categories that have at least one active product, for the filter bar. */
export async function getCategories(): Promise<CategoryOption[]> {
  try {
    const rows = await db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        productCount: sql<number>`count(${products.id})::int`,
      })
      .from(categories)
      .leftJoin(
        products,
        and(eq(products.categoryId, categories.id), eq(products.status, 'active')),
      )
      .where(eq(categories.isActive, true))
      .groupBy(categories.id)
      .orderBy(asc(categories.position), asc(categories.name));

    return rows.filter((r) => r.productCount > 0);
  } catch (err) {
    console.warn('[catalog] getCategories failed:', err);
    return [];
  }
}

function orderByFor(sort: CatalogSort) {
  switch (sort) {
    case 'price-asc':
      return [asc(products.priceFrom), asc(products.name)];
    case 'price-desc':
      return [desc(products.priceFrom), asc(products.name)];
    case 'newest':
      return [desc(products.createdAt)];
    default:
      return [desc(products.isFeatured), asc(products.name)];
  }
}

/** Paginated, filterable, sortable catalog listing. */
export async function getCatalogPage(query: CatalogQuery = {}): Promise<CatalogPage> {
  const sort = query.sort ?? 'featured';
  const perPage = Math.max(1, query.perPage ?? DEFAULT_PER_PAGE);
  const requestedPage = Math.max(1, Math.floor(query.page ?? 1));
  const categorySlug = query.categorySlug?.trim() || null;

  const empty: CatalogPage = {
    items: [],
    total: 0,
    page: 1,
    perPage,
    totalPages: 0,
    categorySlug,
    sort,
  };

  try {
    let categoryId: string | null = null;
    if (categorySlug) {
      const cat = await db.query.categories.findFirst({
        where: and(eq(categories.slug, categorySlug), eq(categories.isActive, true)),
        columns: { id: true },
      });
      if (!cat) return empty;
      categoryId = cat.id;
    }

    const where = categoryId
      ? and(eq(products.status, 'active'), eq(products.categoryId, categoryId))
      : eq(products.status, 'active');

    const countRows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(products)
      .where(where);
    const total = countRows[0]?.total ?? 0;

    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const page = Math.min(requestedPage, totalPages);

    if (total === 0) return { ...empty, total: 0, totalPages: 0 };

    const rows = await db.query.products.findMany({
      where,
      with: {
        images: { orderBy: [asc(productImages.position)], limit: 1 },
        variants: { columns: { stock: true, reserved: true } },
        category: true,
      },
      orderBy: orderByFor(sort),
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    return {
      items: rows.map(toCatalogItem),
      total,
      page,
      perPage,
      totalPages,
      categorySlug,
      sort,
    };
  } catch (err) {
    console.warn('[catalog] getCatalogPage failed, rendering empty state:', err);
    return empty;
  }
}

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  type: 'simple' | 'variable' | 'bundle';
  priceFrom: number | null;
  images: Array<{ url: string; alt: string | null }>;
  variants: VariantStockRow[];
  category: { name: string; slug: string } | null;
};

function toCatalogItem(p: ProductRow): CatalogItem {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    type: p.type,
    priceFromIdr: p.priceFrom,
    imageUrl: p.images[0]?.url ?? null,
    imageAlt: p.images[0]?.alt ?? null,
    categoryName: p.category?.name ?? null,
    categorySlug: p.category?.slug ?? null,
    inStock: anyInStock(p.variants),
  };
}

/** Slugs of all active products — for `sitemap.ts`. */
export async function getAllProductSlugs(): Promise<Array<{ slug: string; updatedAt: Date }>> {
  try {
    return await db
      .select({ slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .where(eq(products.status, 'active'))
      .orderBy(asc(products.slug));
  } catch (err) {
    console.warn('[catalog] getAllProductSlugs failed:', err);
    return [];
  }
}

// ── Product detail ─────────────────────────────────────────────────────────

export async function getProductDetail(slug: string) {
  try {
    const product = await db.query.products.findFirst({
      where: and(eq(products.slug, slug), eq(products.status, 'active')),
      with: {
        images: { orderBy: [asc(productImages.position)] },
        variants: {
          where: eq(productVariants.isActive, true),
          orderBy: [asc(productVariants.priceIdr)],
        },
        category: true,
        bundleItems: {
          with: {
            variant: {
              with: {
                product: {
                  columns: { slug: true, name: true },
                  with: { images: { orderBy: [asc(productImages.position)], limit: 1 } },
                },
              },
            },
          },
        },
      },
    });
    return product ?? null;
  } catch (err) {
    console.warn('[catalog] getProductDetail failed:', err);
    return null;
  }
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductDetail>>>;

export interface BundleComponent {
  variantId: string;
  productSlug: string;
  label: string;
  imageUrl: string | null;
  quantity: number;
  unitPriceIdr: number;
  available: number;
}

export interface BundleBreakdown {
  components: BundleComponent[];
  componentsTotalIdr: number;
  /** How many complete sets the current component stock can fulfil. */
  maxSets: number;
}

/** Derive a bundle's component list, list price, and buildable quantity. */
export function bundleBreakdown(product: ProductDetail): BundleBreakdown | null {
  if (product.type !== 'bundle' || product.bundleItems.length === 0) return null;

  const components: BundleComponent[] = product.bundleItems.map((item) => {
    const v = item.variant;
    const label =
      v.product.name === v.name ? v.product.name : `${v.product.name} — ${v.name}`;
    return {
      variantId: v.id,
      productSlug: v.product.slug,
      label,
      imageUrl: v.product.images[0]?.url ?? null,
      quantity: item.quantity,
      unitPriceIdr: v.priceIdr,
      available: Math.max(0, v.stock - v.reserved),
    };
  });

  const componentsTotalIdr = components.reduce(
    (sum, c) => sum + c.unitPriceIdr * c.quantity,
    0,
  );
  const maxSets = components.reduce(
    (min, c) => Math.min(min, Math.floor(c.available / c.quantity)),
    Number.POSITIVE_INFINITY,
  );

  return {
    components,
    componentsTotalIdr,
    maxSets: Number.isFinite(maxSets) ? maxSets : 0,
  };
}
