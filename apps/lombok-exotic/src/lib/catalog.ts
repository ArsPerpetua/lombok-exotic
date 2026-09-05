import 'server-only';
import { db, schema } from '@lombok-exotic/core/db';
import { and, asc, eq } from 'drizzle-orm';

export interface FeaturedProduct {
  id: string;
  slug: string;
  name: string;
  priceFromIdr: number | null;
  imageUrl: string | null;
  categoryName: string | null;
}

/**
 * Featured products for the homepage. Returns [] on any DB error so the page
 * renders an empty state instead of a 500 — the scaffold runs before a
 * database exists.
 */
export async function getFeaturedProducts(limit = 8): Promise<FeaturedProduct[]> {
  try {
    const rows = await db.query.products.findMany({
      where: and(eq(schema.products.status, 'active'), eq(schema.products.isFeatured, true)),
      with: {
        images: { orderBy: [asc(schema.productImages.position)], limit: 1 },
        category: true,
      },
      limit,
    });
    return rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      priceFromIdr: p.priceFrom,
      imageUrl: p.images[0]?.url ?? null,
      categoryName: p.category?.name ?? null,
    }));
  } catch (err) {
    console.warn('[catalog] getFeaturedProducts failed, rendering empty state:', err);
    return [];
  }
}
