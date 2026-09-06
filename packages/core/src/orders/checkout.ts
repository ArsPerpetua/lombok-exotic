import { and, eq, gt } from 'drizzle-orm';
import { db, schema } from '../db/index';
import { orderNumber as newOrderNumber } from '../ids';
import { normalizeMsisdn } from '../phone';
import { getNumberSetting } from '../settings';
import { getPaymentProvider } from '../payment/index';
import { getShippingProvider } from '../shipping/index';
import { resolveStoreOrigin } from '../shipping/origin';
import { type Executor, reserveStock, releaseStock, StockUnavailableError } from './stock';

const {
  carts,
  cartItems,
  customers,
  addresses,
  orders,
  orderItems,
  orderEvents,
  payments,
  locations,
} = schema;

const IDEMPOTENCY_WINDOW_MS = 2 * 60_000;

export interface CheckoutContact {
  name: string;
  phone: string;
  email?: string | null;
}

export interface CheckoutAddress {
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  district?: string | null;
  postalCode?: string | null;
  addressLine: string;
  /** Biteship area id when picked from the autocomplete; null on the manual path. */
  areaId?: string | null;
  notes?: string | null;
}

export interface CheckoutShipping {
  courierCompany: string;
  courierType: string;
  serviceName: string;
  etd: string | null;
  priceIdr: number;
}

export interface CreateCheckoutInput {
  cartToken: string;
  contact: CheckoutContact;
  address: CheckoutAddress;
  shipping: CheckoutShipping;
  locale: 'id' | 'en';
  customerNote?: string | null;
  /** Absolute app origin, e.g. https://exotic.example — for the payment finish callback. */
  appUrl: string;
}

export type CheckoutError =
  | 'invalid_contact'
  | 'cart_empty'
  | 'cart_converted'
  | 'cart_changed'
  | 'stock_unavailable'
  | 'weight_invalid'
  | 'shipping_unavailable'
  | 'shipping_price_changed'
  | 'payment_failed'
  | 'failed';

export type CreateCheckoutResult =
  | { ok: true; orderNumber: string; redirectUrl: string; grandTotalIdr: number }
  | { ok: false; error: CheckoutError; newShipping?: CheckoutShipping };

interface OrderLine {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  unitPriceIdr: number;
  quantity: number;
  weightGrams: number;
}

class CheckoutAbort extends Error {
  constructor(public readonly reason: CheckoutError) {
    super(reason);
  }
}

/**
 * Turn the current cart into an order + a payment charge. Revised D3 in
 * docs/plans/week3-part2-checkout-payment.md:
 *   pre-txn cart read → server-side rate re-quote → txn A (lock cart, revalidate,
 *   create order + reserve stock, convert cart) → createCharge → txn B (payment
 *   row) → txn C on failure.
 */
export async function createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const phone = normalizeMsisdn(input.contact.phone);
  if (!phone) return { ok: false, error: 'invalid_contact' };

  // 1. Non-locking cart read (also the idempotency check for a re-submit).
  const preCart = await db.query.carts.findFirst({
    where: eq(carts.token, input.cartToken),
    with: {
      items: {
        with: {
          variant: {
            with: { product: { columns: { name: true, status: true } } },
          },
        },
      },
    },
  });

  if (!preCart || preCart.status !== 'active') {
    const existing = await findRecentPendingOrder(input.cartToken);
    if (existing) return { ok: true, ...existing };
    return { ok: false, error: preCart ? 'cart_converted' : 'cart_empty' };
  }

  const pre = buildLines(preCart.items);
  if ('error' in pre) return { ok: false, error: pre.error };
  if (pre.lines.length === 0) return { ok: false, error: 'cart_empty' };

  const subtotalIdr = lineSum(pre.lines);
  const totalWeight = weightSum(pre.lines);

  // 2. Re-quote shipping server-side — never trust the client's price (A4).
  const rated = await quoteChosenRate(input.address, pre.lines, input.shipping);
  if (!rated.ok) return { ok: false, error: rated.error, newShipping: rated.newShipping };
  const shippingIdr = rated.priceIdr;
  const grandTotalIdr = subtotalIdr + shippingIdr;

  // 3. txn A.
  let created: {
    orderId: string;
    orderNumber: string;
    locationId: string | null;
    lines: OrderLine[];
  };
  try {
    created = await db.transaction(async (tx) => {
      const [locked] = await tx
        .select({ id: carts.id, status: carts.status })
        .from(carts)
        .where(eq(carts.token, input.cartToken))
        .for('update');
      if (!locked) throw new CheckoutAbort('cart_empty');
      if (locked.status !== 'active') throw new CheckoutAbort('cart_converted');

      const items = await tx.query.cartItems.findMany({
        where: eq(cartItems.cartId, locked.id),
        with: {
          variant: { with: { product: { columns: { name: true, status: true } } } },
        },
      });
      const fresh = buildLines(items);
      if ('error' in fresh) throw new CheckoutAbort(fresh.error);
      if (fresh.lines.length === 0) throw new CheckoutAbort('cart_empty');
      if (lineSum(fresh.lines) !== subtotalIdr || Math.abs(weightSum(fresh.lines) - totalWeight) > 50) {
        throw new CheckoutAbort('cart_changed');
      }

      const [cust] = await tx
        .insert(customers)
        .values({ name: input.contact.name, phone, email: input.contact.email || null })
        .onConflictDoUpdate({
          target: customers.phone,
          set: { name: input.contact.name, email: input.contact.email || null, updatedAt: new Date() },
        })
        .returning({ id: customers.id });
      if (!cust) throw new CheckoutAbort('failed');

      await tx.insert(addresses).values({
        customerId: cust.id,
        recipientName: input.address.recipientName,
        phone: normalizeMsisdn(input.address.phone) || phone,
        province: input.address.province,
        city: input.address.city,
        district: input.address.district || null,
        postalCode: input.address.postalCode || null,
        areaId: input.address.areaId || null,
        addressLine: input.address.addressLine,
        notes: input.address.notes || null,
      });

      const locationId = await defaultLocationId(tx);
      const num = newOrderNumber();
      const [ord] = await tx
        .insert(orders)
        .values({
          orderNumber: num,
          customerId: cust.id,
          locationId,
          channel: 'online',
          status: 'pending_payment',
          currency: 'IDR',
          subtotalIdr,
          discountTotalIdr: 0,
          shippingTotalIdr: shippingIdr,
          grandTotalIdr,
          shippingSelection: {
            courierCompany: input.shipping.courierCompany,
            courierType: input.shipping.courierType,
            serviceName: input.shipping.serviceName,
            etd: input.shipping.etd,
            priceIdr: shippingIdr,
          },
          customerNote: input.customerNote || null,
          internalNote: `cart:${input.cartToken}`,
          placedAt: new Date(),
        })
        .returning({ id: orders.id, orderNumber: orders.orderNumber });
      if (!ord) throw new CheckoutAbort('failed');

      await tx.insert(orderItems).values(
        fresh.lines.map((l) => ({
          orderId: ord.id,
          variantId: l.variantId,
          productName: l.productName,
          variantName: l.variantName,
          sku: l.sku,
          unitPriceIdr: l.unitPriceIdr,
          quantity: l.quantity,
          weightGrams: l.weightGrams,
          lineTotalIdr: l.unitPriceIdr * l.quantity,
        })),
      );

      await reserveStock(
        tx as Executor,
        fresh.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      );

      await tx.update(carts).set({ status: 'converted' }).where(eq(carts.id, locked.id));
      await tx.insert(orderEvents).values({
        orderId: ord.id,
        status: 'pending_payment',
        note: 'Pesanan dibuat, menunggu pembayaran',
        actorLabel: 'system',
      });

      return { orderId: ord.id, orderNumber: ord.orderNumber, locationId, lines: fresh.lines };
    });
  } catch (err) {
    if (err instanceof CheckoutAbort) return { ok: false, error: err.reason };
    if (err instanceof StockUnavailableError) return { ok: false, error: 'stock_unavailable' };
    console.error('[checkout] txn A failed:', err);
    return { ok: false, error: 'failed' };
  }

  // 4. Create the charge (external).
  const provider = getPaymentProvider();
  const expiryMin = await getNumberSetting('checkout.payment_expiry_minutes', 1440);
  const expiresAt = new Date(Date.now() + expiryMin * 60_000);
  const chargeItems = [
    ...created.lines.map((l) => ({
      id: l.sku.slice(0, 50),
      name: l.productName,
      price: l.unitPriceIdr,
      quantity: l.quantity,
    })),
    { id: 'shipping', name: `Ongkir ${input.shipping.courierCompany}`, price: shippingIdr, quantity: 1 },
  ];

  let charge;
  try {
    charge = await provider.createCharge({
      reference: created.orderNumber,
      amount: grandTotalIdr,
      customer: { name: input.contact.name, email: input.contact.email, phone },
      items: chargeItems,
      expiresAt: expiresAt.toISOString(),
      callbackFinishUrl: `${input.appUrl}/${input.locale}/pesanan/${created.orderNumber}`,
    });
  } catch (err) {
    console.error('[checkout] createCharge failed:', err);
    await rollbackOrder(input.cartToken, created);
    return { ok: false, error: 'payment_failed' };
  }

  // 5. txn B — payment row. If this fails the charge still exists; the webhook
  // path (A6) upserts the missing row, so log and continue rather than roll back.
  try {
    await db.insert(payments).values({
      orderId: created.orderId,
      provider: provider.name,
      providerRef: created.orderNumber,
      amountIdr: grandTotalIdr,
      status: 'pending',
      snapToken: charge.token,
      snapRedirectUrl: charge.redirectUrl,
      expiresAt,
    });
  } catch (err) {
    console.error('[checkout] payment row insert failed (webhook will upsert):', err);
  }

  return { ok: true, orderNumber: created.orderNumber, redirectUrl: charge.redirectUrl, grandTotalIdr };
}

// ── helpers ────────────────────────────────────────────────────────────────

type CartItemWithVariant = {
  quantity: number;
  variant: {
    id: string;
    name: string;
    sku: string;
    priceIdr: number;
    weightGrams: number;
    isActive: boolean;
    product: { name: string; status: string } | null;
  } | null;
};

function buildLines(items: CartItemWithVariant[]): { lines: OrderLine[] } | { error: CheckoutError } {
  const lines: OrderLine[] = [];
  for (const it of items) {
    const v = it.variant;
    if (!v || !v.isActive || v.product?.status !== 'active') continue;
    if (v.weightGrams <= 0) return { error: 'weight_invalid' };
    if (it.quantity <= 0) continue;
    lines.push({
      variantId: v.id,
      productName: v.product.name,
      variantName: v.name,
      sku: v.sku,
      unitPriceIdr: v.priceIdr,
      quantity: it.quantity,
      weightGrams: v.weightGrams,
    });
  }
  return { lines };
}

const lineSum = (l: OrderLine[]) => l.reduce((n, x) => n + x.unitPriceIdr * x.quantity, 0);
const weightSum = (l: OrderLine[]) => l.reduce((n, x) => n + x.weightGrams * x.quantity, 0);

async function quoteChosenRate(
  address: CheckoutAddress,
  lines: OrderLine[],
  chosen: CheckoutShipping,
): Promise<
  | { ok: true; priceIdr: number }
  | { ok: false; error: CheckoutError; newShipping?: CheckoutShipping }
> {
  const origin = await resolveStoreOrigin();
  let rates;
  try {
    rates = await getShippingProvider().getRates({
      originAreaId: origin.areaId,
      originPostalCode: origin.postalCode,
      destinationAreaId: address.areaId || undefined,
      destinationPostalCode: address.postalCode || undefined,
      items: lines.map((l) => ({
        name: l.productName,
        quantity: l.quantity,
        weightGrams: l.weightGrams,
        valueIdr: l.unitPriceIdr,
      })),
    });
  } catch (err) {
    console.error('[checkout] getRates failed:', err);
    return { ok: false, error: 'shipping_unavailable' };
  }

  const match = rates.find(
    (r) => r.courierCompany === chosen.courierCompany && r.courierType === chosen.courierType,
  );
  if (!match) return { ok: false, error: 'shipping_unavailable' };
  if (Math.abs(match.priceIdr - chosen.priceIdr) > 1000) {
    return {
      ok: false,
      error: 'shipping_price_changed',
      newShipping: { ...chosen, priceIdr: match.priceIdr, etd: match.etd },
    };
  }
  return { ok: true, priceIdr: match.priceIdr };
}

async function defaultLocationId(tx: Executor): Promise<string | null> {
  const loc = await tx.query.locations.findFirst({
    where: eq(locations.isDefault, true),
    columns: { id: true },
  });
  return loc?.id ?? null;
}

async function findRecentPendingOrder(
  cartToken: string,
): Promise<{ orderNumber: string; redirectUrl: string; grandTotalIdr: number } | null> {
  const ord = await db.query.orders.findFirst({
    where: and(
      eq(orders.internalNote, `cart:${cartToken}`),
      eq(orders.status, 'pending_payment'),
      gt(orders.createdAt, new Date(Date.now() - IDEMPOTENCY_WINDOW_MS)),
    ),
    columns: { orderNumber: true, grandTotalIdr: true },
    with: { payments: { columns: { snapRedirectUrl: true, status: true }, limit: 1 } },
  });
  const url = ord?.payments[0]?.snapRedirectUrl;
  if (!ord || !url) return null;
  return { orderNumber: ord.orderNumber, redirectUrl: url, grandTotalIdr: ord.grandTotalIdr };
}

async function rollbackOrder(
  cartToken: string,
  created: { orderId: string; lines: OrderLine[] },
): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await releaseStock(
        tx as Executor,
        created.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      );
      await tx
        .update(orders)
        .set({ status: 'cancelled' })
        .where(and(eq(orders.id, created.orderId), eq(orders.status, 'pending_payment')));
      await tx.insert(orderEvents).values({
        orderId: created.orderId,
        status: 'cancelled',
        note: 'Pembayaran gagal dibuat, pesanan dibatalkan',
        actorLabel: 'system',
      });
      await tx.update(carts).set({ status: 'active' }).where(eq(carts.token, cartToken));
    });
  } catch (err) {
    console.error('[checkout] rollback (txn C) failed:', err);
  }
}
