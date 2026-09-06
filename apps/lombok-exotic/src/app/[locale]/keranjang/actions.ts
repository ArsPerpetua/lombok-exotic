'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@lombok-exotic/core/db';
import {
  type CartView,
  EMPTY_CART,
  getCartViewByToken,
  getOrCreateCartForMutation,
  loadVariantForCart,
  MAX_LINE_QTY,
  readCartToken,
} from '@/lib/cart';

const { carts, cartItems } = schema;

export type CartActionResult =
  | { ok: true; cart: CartView; notice?: 'clamped' | 'adjusted' }
  | { ok: false; error: 'invalid' | 'not_found' | 'out_of_stock' | 'failed'; cart: CartView };

const addInput = z.object({
  variantId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(MAX_LINE_QTY).default(1),
});
const updateInput = z.object({
  itemId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(0).max(MAX_LINE_QTY),
});
const removeInput = z.object({ itemId: z.string().trim().min(1) });

function revalidateCart() {
  revalidatePath('/[locale]/keranjang', 'page');
  revalidatePath('/[locale]', 'layout');
}

async function currentView(): Promise<CartView> {
  const token = await readCartToken();
  return token ? getCartViewByToken(token) : EMPTY_CART;
}

export async function addToCartAction(raw: unknown): Promise<CartActionResult> {
  const parsed = addInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid', cart: await currentView() };
  const { variantId, quantity } = parsed.data;

  try {
    const variant = await loadVariantForCart(variantId);
    if (!variant || variant.product?.status !== 'active') {
      return { ok: false, error: 'not_found', cart: await currentView() };
    }

    const available = Math.max(0, variant.stock - variant.reserved);
    if (available <= 0) {
      return { ok: false, error: 'out_of_stock', cart: await currentView() };
    }

    const { id: cartId, token } = await getOrCreateCartForMutation();
    const existing = await db.query.cartItems.findFirst({
      where: and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)),
    });

    const cap = Math.min(available, MAX_LINE_QTY);
    const desired = (existing?.quantity ?? 0) + quantity;
    const nextQty = Math.min(desired, cap);

    if (existing) {
      await db
        .update(cartItems)
        .set({ quantity: nextQty })
        .where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({ cartId, variantId, quantity: nextQty });
    }
    await db
      .update(carts)
      .set({ lastActivityAt: sql`now()` })
      .where(eq(carts.id, cartId));

    revalidateCart();
    return {
      ok: true,
      cart: await getCartViewByToken(token),
      notice: nextQty < desired ? 'clamped' : undefined,
    };
  } catch (err) {
    console.error('[cart] addToCartAction failed:', err);
    return { ok: false, error: 'failed', cart: await currentView() };
  }
}

export async function updateCartItemAction(raw: unknown): Promise<CartActionResult> {
  const parsed = updateInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid', cart: await currentView() };
  const { itemId, quantity } = parsed.data;

  try {
    const token = await readCartToken();
    if (!token) return { ok: false, error: 'not_found', cart: EMPTY_CART };

    const item = await db.query.cartItems.findFirst({
      where: eq(cartItems.id, itemId),
      with: { cart: { columns: { token: true } }, variant: { columns: { stock: true, reserved: true } } },
    });
    if (!item || item.cart?.token !== token) {
      return { ok: false, error: 'not_found', cart: await getCartViewByToken(token) };
    }

    if (quantity === 0) {
      await db.delete(cartItems).where(eq(cartItems.id, itemId));
    } else {
      const available = Math.max(0, (item.variant?.stock ?? 0) - (item.variant?.reserved ?? 0));
      const nextQty = Math.min(quantity, available, MAX_LINE_QTY);
      if (nextQty <= 0) {
        await db.delete(cartItems).where(eq(cartItems.id, itemId));
      } else {
        await db.update(cartItems).set({ quantity: nextQty }).where(eq(cartItems.id, itemId));
      }
    }

    revalidateCart();
    return { ok: true, cart: await getCartViewByToken(token) };
  } catch (err) {
    console.error('[cart] updateCartItemAction failed:', err);
    return { ok: false, error: 'failed', cart: await currentView() };
  }
}

export async function removeCartItemAction(raw: unknown): Promise<CartActionResult> {
  const parsed = removeInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'invalid', cart: await currentView() };

  try {
    const token = await readCartToken();
    if (!token) return { ok: false, error: 'not_found', cart: EMPTY_CART };

    const item = await db.query.cartItems.findFirst({
      where: eq(cartItems.id, parsed.data.itemId),
      with: { cart: { columns: { token: true } } },
    });
    if (!item || item.cart?.token !== token) {
      return { ok: false, error: 'not_found', cart: await getCartViewByToken(token) };
    }

    await db.delete(cartItems).where(eq(cartItems.id, parsed.data.itemId));
    revalidateCart();
    return { ok: true, cart: await getCartViewByToken(token) };
  } catch (err) {
    console.error('[cart] removeCartItemAction failed:', err);
    return { ok: false, error: 'failed', cart: await currentView() };
  }
}

export async function getCartAction(): Promise<CartView> {
  return currentView();
}
