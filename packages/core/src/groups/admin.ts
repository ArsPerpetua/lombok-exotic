import { and, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index';
import { writeAudit } from '../audit';
import { queueNotification } from '../notifications/deliver';
import { normalizeMsisdn } from '../phone';
import { orderNumber as newOrderNumber } from '../ids';
import { getPaymentProvider } from '../payment/index';
import { getNumberSetting } from '../settings';
import { type Executor, reserveStock, StockUnavailableError } from '../orders/stock';

const {
  groupPreorders,
  groupPreorderItems,
  productVariants,
  customers,
  orders,
  orderItems,
  orderEvents,
  payments,
  user,
} = schema;

export interface AdminActor {
  userId: string;
  label: string;
  ip?: string | null;
  userAgent?: string | null;
}

export const GROUP_TRANSITIONS: Record<string, string[]> = {
  new: ['quoted', 'cancelled'],
  quoted: ['confirmed', 'cancelled'],
  confirmed: ['paid', 'cancelled'],
  paid: ['fulfilled', 'cancelled'],
  fulfilled: [],
  cancelled: [],
};

// ── Listing / detail ───────────────────────────────────────────────────────

export async function listGroupPreorders(status?: string | null) {
  const where =
    status && GROUP_TRANSITIONS[status] !== undefined
      ? eq(groupPreorders.status, status as never)
      : undefined;
  const rows = await db
    .select({
      id: groupPreorders.id,
      reference: groupPreorders.reference,
      status: groupPreorders.status,
      agentName: groupPreorders.agentName,
      companyName: groupPreorders.companyName,
      arrivalDate: groupPreorders.arrivalDate,
      headcount: groupPreorders.headcount,
      estimatedValueIdr: groupPreorders.estimatedValueIdr,
      createdAt: groupPreorders.createdAt,
      itemCount: sql<number>`count(${groupPreorderItems.id})`.mapWith(Number),
    })
    .from(groupPreorders)
    .leftJoin(groupPreorderItems, eq(groupPreorderItems.groupPreorderId, groupPreorders.id))
    .where(where)
    .groupBy(groupPreorders.id)
    .orderBy(desc(groupPreorders.createdAt));
  return rows;
}

export async function getGroupPreorder(id: string) {
  const g = await db.query.groupPreorders.findFirst({
    where: eq(groupPreorders.id, id),
    with: {
      items: { with: { variant: { with: { product: { columns: { name: true } } } } } },
      tourLeader: true,
      quoteOrder: { columns: { orderNumber: true, status: true, grandTotalIdr: true } },
    },
  });
  if (!g) return null;
  const staff = await db.select({ id: user.id, name: user.name }).from(user);
  return {
    ...g,
    itemsTotalIdr: g.items.reduce((n, i) => n + (i.unitPriceIdr ?? 0) * i.quantity, 0),
    allowedTransitions: GROUP_TRANSITIONS[g.status] ?? [],
    staff,
  };
}

// ── Line items ─────────────────────────────────────────────────────────────

export interface GroupItemInput {
  variantId?: string | null;
  description: string;
  quantity: number;
  unitPriceIdr?: number | null;
  notes?: string | null;
}

export async function saveGroupItem(
  groupPreorderId: string,
  itemId: string | null,
  input: GroupItemInput,
  actor: AdminActor,
): Promise<{ ok: true }> {
  // If a variant is linked and no price given, default to the variant price.
  let unitPriceIdr = input.unitPriceIdr ?? null;
  if (unitPriceIdr == null && input.variantId) {
    const v = await db.query.productVariants.findFirst({
      where: eq(productVariants.id, input.variantId),
      columns: { priceIdr: true },
    });
    unitPriceIdr = v?.priceIdr ?? null;
  }
  const values = {
    variantId: input.variantId || null,
    description: input.description.trim(),
    quantity: Math.max(1, Math.round(input.quantity)),
    unitPriceIdr: unitPriceIdr == null ? null : Math.round(unitPriceIdr),
    notes: input.notes?.trim() || null,
  };

  if (itemId) {
    await db.update(groupPreorderItems).set(values).where(eq(groupPreorderItems.id, itemId));
  } else {
    await db.insert(groupPreorderItems).values({ ...values, groupPreorderId });
  }
  await recomputeEstimate(groupPreorderId);
  await writeAudit(db, {
    actorUserId: actor.userId,
    actorLabel: actor.label,
    action: itemId ? 'group_preorder.item.update' : 'group_preorder.item.add',
    entityType: 'group_preorder',
    entityId: groupPreorderId,
    ip: actor.ip,
    userAgent: actor.userAgent,
  });
  return { ok: true };
}

export async function removeGroupItem(groupPreorderId: string, itemId: string, actor: AdminActor) {
  await db.delete(groupPreorderItems).where(eq(groupPreorderItems.id, itemId));
  await recomputeEstimate(groupPreorderId);
  await writeAudit(db, {
    actorUserId: actor.userId,
    actorLabel: actor.label,
    action: 'group_preorder.item.remove',
    entityType: 'group_preorder',
    entityId: groupPreorderId,
    ip: actor.ip,
    userAgent: actor.userAgent,
  });
}

// ── Assignment / status / notes ────────────────────────────────────────────

export async function assignGroupPreorder(id: string, staffUserId: string | null, actor: AdminActor) {
  await db.update(groupPreorders).set({ assignedTo: staffUserId }).where(eq(groupPreorders.id, id));
  await writeAudit(db, {
    actorUserId: actor.userId,
    actorLabel: actor.label,
    action: 'group_preorder.assign',
    entityType: 'group_preorder',
    entityId: id,
    after: { assignedTo: staffUserId },
    ip: actor.ip,
    userAgent: actor.userAgent,
  });
}

export async function setGroupNotes(id: string, notes: string, actor: AdminActor) {
  await db.update(groupPreorders).set({ internalNotes: notes || null }).where(eq(groupPreorders.id, id));
  await writeAudit(db, {
    actorUserId: actor.userId,
    actorLabel: actor.label,
    action: 'group_preorder.notes',
    entityType: 'group_preorder',
    entityId: id,
    ip: actor.ip,
    userAgent: actor.userAgent,
  });
}

export type GroupTransitionResult =
  | { ok: true; status: string }
  | { ok: false; error: 'not_found' | 'illegal_transition' | 'needs_quote' };

export async function transitionGroupPreorder(
  id: string,
  to: string,
  actor: AdminActor,
): Promise<GroupTransitionResult> {
  const g = await db.query.groupPreorders.findFirst({
    where: eq(groupPreorders.id, id),
    columns: { id: true, status: true, quoteOrderId: true },
  });
  if (!g) return { ok: false, error: 'not_found' };
  if (!(GROUP_TRANSITIONS[g.status] ?? []).includes(to)) {
    return { ok: false, error: 'illegal_transition' };
  }
  if (to === 'confirmed' && !g.quoteOrderId) return { ok: false, error: 'needs_quote' };

  await db.update(groupPreorders).set({ status: to as never }).where(eq(groupPreorders.id, id));
  await writeAudit(db, {
    actorUserId: actor.userId,
    actorLabel: actor.label,
    action: `group_preorder.transition:${g.status}->${to}`,
    entityType: 'group_preorder',
    entityId: id,
    before: { status: g.status },
    after: { status: to },
    ip: actor.ip,
    userAgent: actor.userAgent,
  });
  return { ok: true, status: to };
}

// ── Quote → order ──────────────────────────────────────────────────────────

export type QuoteResult =
  | { ok: true; orderNumber: string; redirectUrl: string | null; grandTotalIdr: number }
  | { ok: false; error: 'not_found' | 'no_items' | 'no_price' | 'already_quoted' | 'stock_unavailable' | 'payment_failed' };

/**
 * Turn a group pre-order into a real order + a payment charge (no shipping —
 * the group picks the packages up). Sets `quoteOrderId` and status → `quoted`.
 */
export async function generateQuote(
  id: string,
  actor: AdminActor,
  appUrl: string,
): Promise<QuoteResult> {
  const g = await db.query.groupPreorders.findFirst({
    where: eq(groupPreorders.id, id),
    with: {
      items: { with: { variant: { columns: { sku: true, isActive: true } } } },
      tourLeader: { columns: { id: true } },
    },
  });
  if (!g) return { ok: false, error: 'not_found' };
  if (g.quoteOrderId) return { ok: false, error: 'already_quoted' };
  if (g.items.length === 0) return { ok: false, error: 'no_items' };
  if (g.items.some((i) => i.unitPriceIdr == null)) return { ok: false, error: 'no_price' };

  const lines = g.items.map((i) => ({
    variantId: i.variantId,
    sku: i.variant?.sku ?? i.description.slice(0, 40),
    name: i.description,
    quantity: i.quantity,
    unitPriceIdr: i.unitPriceIdr as number,
  }));
  const subtotalIdr = lines.reduce((n, l) => n + l.unitPriceIdr * l.quantity, 0);

  let created: { orderId: string; orderNumber: string };
  try {
    created = await db.transaction(async (tx) => {
      const phone = normalizeMsisdn(g.agentPhone);
      const [cust] = await tx
        .insert(customers)
        .values({ name: g.agentName, phone, email: g.agentEmail || null, type: 'agent', companyName: g.companyName || null })
        .onConflictDoUpdate({
          target: customers.phone,
          set: { name: g.agentName, email: g.agentEmail || null, type: 'agent', updatedAt: new Date() },
        })
        .returning({ id: customers.id });
      if (!cust) throw new Error('customer upsert failed');

      const num = newOrderNumber('GRP');
      const [ord] = await tx
        .insert(orders)
        .values({
          orderNumber: num,
          customerId: cust.id,
          channel: 'group_preorder',
          status: 'pending_payment',
          currency: 'IDR',
          subtotalIdr,
          discountTotalIdr: 0,
          shippingTotalIdr: 0,
          grandTotalIdr: subtotalIdr,
          tourLeaderId: g.tourLeader?.id ?? null,
          customerNote: `Rombongan ${g.reference} — ${g.headcount} pax, tiba ${g.arrivalDate}`,
          internalNote: `group:${g.id}`,
          placedAt: new Date(),
        })
        .returning({ id: orders.id, orderNumber: orders.orderNumber });
      if (!ord) throw new Error('order insert failed');

      await tx.insert(orderItems).values(
        lines.map((l) => ({
          orderId: ord.id,
          variantId: l.variantId,
          productName: l.name,
          variantName: l.variantId ? l.sku : '—',
          sku: l.sku,
          unitPriceIdr: l.unitPriceIdr,
          quantity: l.quantity,
          weightGrams: 0,
          lineTotalIdr: l.unitPriceIdr * l.quantity,
        })),
      );

      // Reserve stock for the linked variants (free-text lines hold nothing).
      const stockLines = lines
        .filter((l): l is typeof l & { variantId: string } => l.variantId != null)
        .map((l) => ({ variantId: l.variantId, quantity: l.quantity }));
      await reserveStock(tx as Executor, stockLines);

      await tx.insert(orderEvents).values({
        orderId: ord.id,
        status: 'pending_payment',
        note: 'Quote rombongan dibuat',
        actorLabel: actor.label,
      });
      await tx
        .update(groupPreorders)
        .set({ status: 'quoted', quoteOrderId: ord.id })
        .where(eq(groupPreorders.id, g.id));

      return { orderId: ord.id, orderNumber: ord.orderNumber };
    });
  } catch (err) {
    if (err instanceof StockUnavailableError) return { ok: false, error: 'stock_unavailable' };
    console.error('[group] generateQuote txn failed:', err);
    return { ok: false, error: 'payment_failed' };
  }

  // Charge (external).
  const provider = getPaymentProvider();
  const expiryMin = await getNumberSetting('checkout.payment_expiry_minutes', 1440);
  const expiresAt = new Date(Date.now() + expiryMin * 60_000);
  let redirectUrl: string | null = null;
  try {
    const charge = await provider.createCharge({
      reference: created.orderNumber,
      amount: subtotalIdr,
      customer: { name: g.agentName, email: g.agentEmail, phone: normalizeMsisdn(g.agentPhone) },
      items: lines.map((l) => ({ id: l.sku.slice(0, 50), name: l.name, price: l.unitPriceIdr, quantity: l.quantity })),
      expiresAt: expiresAt.toISOString(),
      callbackFinishUrl: `${appUrl}/id/pesanan/${created.orderNumber}`,
    });
    redirectUrl = charge.redirectUrl;
    await db.insert(payments).values({
      orderId: created.orderId,
      provider: provider.name,
      providerRef: created.orderNumber,
      amountIdr: subtotalIdr,
      status: 'pending',
      snapToken: charge.token,
      snapRedirectUrl: charge.redirectUrl,
      expiresAt,
    });
  } catch (err) {
    console.error('[group] generateQuote charge failed:', err);
  }

  await writeAudit(db, {
    actorUserId: actor.userId,
    actorLabel: actor.label,
    action: 'group_preorder.quote',
    entityType: 'group_preorder',
    entityId: g.id,
    after: { orderNumber: created.orderNumber, total: subtotalIdr },
    ip: actor.ip,
    userAgent: actor.userAgent,
  });
  await queueNotification(db, {
    templateKey: 'group_preorder.quote',
    recipient: g.agentEmail || 'admin',
    payload: { orderNumber: created.orderNumber, reference: g.reference, redirectUrl },
    entityType: 'group_preorder',
    entityId: g.id,
  });

  return { ok: true, orderNumber: created.orderNumber, redirectUrl, grandTotalIdr: subtotalIdr };
}

// ── helpers ────────────────────────────────────────────────────────────────

async function recomputeEstimate(groupPreorderId: string): Promise<void> {
  const rows = await db
    .select({
      total: sql<number | null>`sum(${groupPreorderItems.unitPriceIdr} * ${groupPreorderItems.quantity})`,
    })
    .from(groupPreorderItems)
    .where(eq(groupPreorderItems.groupPreorderId, groupPreorderId));
  const total = rows[0]?.total ?? null;
  await db
    .update(groupPreorders)
    .set({ estimatedValueIdr: total == null ? null : Number(total) })
    .where(eq(groupPreorders.id, groupPreorderId));
}
