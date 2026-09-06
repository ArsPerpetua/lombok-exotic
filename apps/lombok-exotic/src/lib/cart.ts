import 'server-only';
import { cookies } from 'next/headers';
import { db, schema } from '@lombok-exotic/core/db';
import { and, asc, eq } from 'drizzle-orm';

const { carts, productVariants, productImages } = schema;

export const CART_COOKIE = 'le_cart';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
/** Hard per-line cap regardless of stock — guards against fat-finger quantities. */
export const MAX_LINE_QTY = 99;

export interface CartLine {
  itemId: string;
  variantId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  sku: string;
  unitPriceIdr: number;
  quantity: number;
  lineTotalIdr: number;
  weightGrams: number;
  imageUrl: string | null;
  /** stock − reserved for this variant right now. */
  available: number;
  /** Largest quantity this line may hold (min of available and MAX_LINE_QTY). */
  maxQuantity: number;
}

export interface CartView {
  token: string | null;
  lines: CartLine[];
  /** Sum of line quantities. */
  itemCount: number;
  subtotalIdr: number;
  totalWeightGrams: number;
  /** True when a line was clamped/dropped because stock moved under it. */
  adjusted: boolean;
}

export const EMPTY_CART: CartView = {
  token: null,
  lines: [],
  itemCount: 0,
  subtotalIdr: 0,
  totalWeightGrams: 0,
  adjusted: false,
};

export async function readCartToken(): Promise<string | null> {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

/**
 * Resolve the caller's active cart, creating one (and setting the cookie) when
 * needed. MUST be called from a Server Action or Route Handler — it writes a
 * cookie.
 */
export async function getOrCreateCartForMutation(): Promise<{ id: string; token: string }> {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value ?? null;

  if (token) {
    const existing = await db.query.carts.findFirst({
      where: and(eq(carts.token, token), eq(carts.status, 'active')),
      columns: { id: true },
    });
    if (existing) return { id: existing.id, token };
  }

  const newToken = crypto.randomUUID();
  const [row] = await db.insert(carts).values({ token: newToken }).returning({ id: carts.id });
  if (!row) throw new Error('cart insert returned no row');
  jar.set(CART_COOKIE, newToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return { id: row.id, token: newToken };
}

interface CartItemRow {
  id: string;
  quantity: number;
  addedAt: Date;
  variant: {
    id: string;
    name: string;
    sku: string;
    priceIdr: number;
    weightGrams: number;
    stock: number;
    reserved: number;
    isActive: boolean;
    product: { slug: string; name: string; images: Array<{ url: string }> } | null;
  } | null;
}

function toLine(item: CartItemRow): CartLine | null {
  const v = item.variant;
  if (!v || !v.isActive || !v.product) return null;
  const available = Math.max(0, v.stock - v.reserved);
  const maxQuantity = Math.min(available, MAX_LINE_QTY);
  const quantity = Math.min(item.quantity, maxQuantity);
  if (quantity <= 0) return null;
  return {
    itemId: item.id,
    variantId: v.id,
    productSlug: v.product.slug,
    productName: v.product.name,
    variantName: v.name,
    sku: v.sku,
    unitPriceIdr: v.priceIdr,
    quantity,
    lineTotalIdr: v.priceIdr * quantity,
    weightGrams: v.weightGrams,
    imageUrl: v.product.images[0]?.url ?? null,
    available,
    maxQuantity,
  };
}

function summarize(token: string | null, items: CartItemRow[]): CartView {
  const sorted = [...items].sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime());
  const lines: CartLine[] = [];
  let adjusted = false;
  for (const item of sorted) {
    const line = toLine(item);
    if (!line) {
      adjusted = true;
      continue;
    }
    if (line.quantity !== item.quantity) adjusted = true;
    lines.push(line);
  }
  return {
    token,
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotalIdr: lines.reduce((n, l) => n + l.lineTotalIdr, 0),
    totalWeightGrams: lines.reduce((n, l) => n + l.weightGrams * l.quantity, 0),
    adjusted,
  };
}

async function loadCartItems(token: string): Promise<CartItemRow[] | null> {
  const cart = await db.query.carts.findFirst({
    where: and(eq(carts.token, token), eq(carts.status, 'active')),
    with: {
      items: {
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
  return cart ? (cart.items as CartItemRow[]) : null;
}

/** Read-only cart snapshot for the current request. Safe in RSC. */
export async function getCartView(): Promise<CartView> {
  try {
    const token = await readCartToken();
    if (!token) return EMPTY_CART;
    const items = await loadCartItems(token);
    if (!items) return { ...EMPTY_CART, token };
    return summarize(token, items);
  } catch (err) {
    console.warn('[cart] getCartView failed:', err);
    return EMPTY_CART;
  }
}

export async function getCartViewByToken(token: string): Promise<CartView> {
  const items = await loadCartItems(token);
  if (!items) return { ...EMPTY_CART, token };
  return summarize(token, items);
}

/** Lightweight badge count. Never throws. */
export async function getCartCount(): Promise<number> {
  try {
    const view = await getCartView();
    return view.itemCount;
  } catch {
    return 0;
  }
}

export async function loadVariantForCart(variantId: string) {
  return db.query.productVariants.findFirst({
    where: and(eq(productVariants.id, variantId), eq(productVariants.isActive, true)),
    with: { product: { columns: { status: true } } },
  });
}
