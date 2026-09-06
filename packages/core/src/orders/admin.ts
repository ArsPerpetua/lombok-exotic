import { and, count, desc, eq, gte, ilike, inArray, or, sql } from 'drizzle-orm';
import { db, schema } from '../db/index';
import { writeAudit } from '../audit';
import { queueNotification } from '../notifications/deliver';
import { normalizeOrderNumber } from './lookup';

const { orders, orderItems, orderEvents, customers, payments, shipments, shipmentEvents, productVariants, products } =
  schema;

const REVENUE_STATUSES = ['paid', 'processing', 'shipped', 'completed'] as const;

// Allowed forward transitions for the admin state machine (Week 4).
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
  refunded: [],
};

export interface AdminActor {
  userId: string;
  label: string;
  ip?: string | null;
  userAgent?: string | null;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export async function dashboardStats() {
  const [byStatus, revToday, revWeek, revMonth, recent, low, top] = await Promise.all([
    db
      .select({ status: orders.status, n: count() })
      .from(orders)
      .groupBy(orders.status),
    revenueSince(sql`now() - interval '1 day'`),
    revenueSince(sql`now() - interval '7 days'`),
    revenueSince(sql`now() - interval '30 days'`),
    db
      .select({
        orderNumber: orders.orderNumber,
        status: orders.status,
        grandTotalIdr: orders.grandTotalIdr,
        createdAt: orders.createdAt,
        customerName: customers.name,
      })
      .from(orders)
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .orderBy(desc(orders.createdAt))
      .limit(8),
    db
      .select({
        sku: productVariants.sku,
        name: products.name,
        variantName: productVariants.name,
        stock: productVariants.stock,
        reserved: productVariants.reserved,
        threshold: productVariants.lowStockThreshold,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(
          eq(productVariants.isActive, true),
          sql`${productVariants.stock} - ${productVariants.reserved} <= ${productVariants.lowStockThreshold}`,
        ),
      )
      .orderBy(sql`${productVariants.stock} - ${productVariants.reserved}`)
      .limit(10),
    db
      .select({
        productName: orderItems.productName,
        qty: sql<number>`sum(${orderItems.quantity})::int`,
        revenueIdr: sql<number>`sum(${orderItems.lineTotalIdr})::bigint`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(inArray(orders.status, [...REVENUE_STATUSES]))
      .groupBy(orderItems.productName)
      .orderBy(sql`sum(${orderItems.quantity}) desc`)
      .limit(5),
  ]);

  const ordersByStatus: Record<string, number> = {};
  for (const r of byStatus) ordersByStatus[r.status] = r.n;

  return {
    ordersByStatus,
    revenue: { today: revToday, week: revWeek, month: revMonth },
    recentOrders: recent,
    lowStock: low,
    topProducts: top.map((t) => ({ ...t, revenueIdr: Number(t.revenueIdr) })),
  };
}

async function revenueSince(since: ReturnType<typeof sql>): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${orders.grandTotalIdr}), 0)::bigint` })
    .from(orders)
    .where(and(inArray(orders.status, [...REVENUE_STATUSES]), gte(orders.paidAt, since)));
  return Number(row?.total ?? 0);
}

// ── List ───────────────────────────────────────────────────────────────────

export interface OrderListQuery {
  status?: string | null;
  q?: string | null;
  page?: number;
  perPage?: number;
}

export async function listOrders(query: OrderListQuery = {}) {
  const perPage = Math.min(50, Math.max(1, query.perPage ?? 20));
  const requestedPage = Math.max(1, Math.floor(query.page ?? 1));

  const conds = [];
  if (query.status && ORDER_TRANSITIONS[query.status] !== undefined) {
    conds.push(eq(orders.status, query.status as never));
  }
  if (query.q?.trim()) {
    const term = `%${query.q.trim()}%`;
    conds.push(
      or(
        ilike(orders.orderNumber, term),
        ilike(customers.name, term),
        ilike(customers.phone, term),
      ),
    );
  }
  const where = conds.length ? and(...conds) : undefined;

  const totalRows = await db
    .select({ total: count() })
    .from(orders)
    .leftJoin(customers, eq(customers.id, orders.customerId))
    .where(where);
  const total = totalRows[0]?.total ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(requestedPage, totalPages);

  const rows = await db
    .select({
      orderNumber: orders.orderNumber,
      status: orders.status,
      grandTotalIdr: orders.grandTotalIdr,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      customerName: customers.name,
      customerPhone: customers.phone,
      itemCount: sql<number>`(select coalesce(sum(${orderItems.quantity}),0)::int from ${orderItems} where ${orderItems.orderId} = ${orders.id})`,
    })
    .from(orders)
    .leftJoin(customers, eq(customers.id, orders.customerId))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(perPage)
    .offset((page - 1) * perPage);

  return { items: rows, total, page, perPage, totalPages };
}

// ── Detail ─────────────────────────────────────────────────────────────────

export async function getAdminOrderDetail(orderNumber: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.orderNumber, normalizeOrderNumber(orderNumber)),
    with: {
      items: true,
      customer: true,
      payments: { orderBy: [desc(payments.createdAt)] },
      events: { orderBy: [desc(orderEvents.createdAt)] },
      shipments: { orderBy: [desc(shipments.createdAt)], with: { events: { orderBy: [desc(shipmentEvents.createdAt)] } } },
    },
  });
  if (!order) return null;

  // Fetch the customer's most recent address (checkout creates one per order).
  const address = order.customer
    ? await db.query.addresses.findFirst({
        where: eq(schema.addresses.customerId, order.customer.id),
        orderBy: [desc(schema.addresses.createdAt)],
      })
    : null;

  return {
    ...order,
    address,
    allowedTransitions: ORDER_TRANSITIONS[order.status] ?? [],
  };
}

// ── Mutations ──────────────────────────────────────────────────────────────

export type TransitionError = 'not_found' | 'illegal_transition' | 'needs_shipment';
export type TransitionResult = { ok: true; status: string } | { ok: false; error: TransitionError };

export async function transitionOrder(
  orderNumber: string,
  to: string,
  actor: AdminActor,
  note?: string,
): Promise<TransitionResult> {
  const num = normalizeOrderNumber(orderNumber);
  const current = await db.query.orders.findFirst({
    where: eq(orders.orderNumber, num),
    columns: { id: true, status: true },
    with: { shipments: { columns: { trackingNumber: true }, limit: 1 } },
  });
  if (!current) return { ok: false, error: 'not_found' };
  if (!(ORDER_TRANSITIONS[current.status] ?? []).includes(to)) {
    return { ok: false, error: 'illegal_transition' };
  }
  if (to === 'shipped' && !current.shipments.some((s) => s.trackingNumber)) {
    return { ok: false, error: 'needs_shipment' };
  }

  return db.transaction(async (tx) => {
    const updated = await tx
      .update(orders)
      .set({
        status: to as never,
        ...(to === 'completed' ? {} : {}),
      })
      .where(and(eq(orders.id, current.id), eq(orders.status, current.status as never)))
      .returning({ id: orders.id });
    if (updated.length === 0) return { ok: false as const, error: 'illegal_transition' as const };

    await tx.insert(orderEvents).values({
      orderId: current.id,
      status: to as never,
      note: note ?? null,
      actorLabel: actor.label,
    });
    await writeAudit(tx, {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: `order.transition:${current.status}->${to}`,
      entityType: 'order',
      entityId: current.id,
      before: { status: current.status },
      after: { status: to },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    return { ok: true as const, status: to };
  });
}

export interface ShipmentInput {
  courierCompany: string;
  courierType?: string | null;
  trackingNumber: string;
  trackingUrl?: string | null;
  note?: string | null;
}

export type ShipmentResult = { ok: true } | { ok: false; error: 'not_found' | 'bad_status' };

export async function recordShipment(
  orderNumber: string,
  input: ShipmentInput,
  actor: AdminActor,
): Promise<ShipmentResult> {
  const num = normalizeOrderNumber(orderNumber);
  const order = await db.query.orders.findFirst({
    where: eq(orders.orderNumber, num),
    columns: { id: true, status: true, shippingTotalIdr: true },
    with: { shipments: { columns: { id: true }, limit: 1 } },
  });
  if (!order) return { ok: false, error: 'not_found' };
  if (!['paid', 'processing', 'shipped'].includes(order.status)) {
    return { ok: false, error: 'bad_status' };
  }

  return db.transaction(async (tx) => {
    const existing = order.shipments[0];
    let shipmentId: string;
    if (existing) {
      await tx
        .update(shipments)
        .set({
          courierCompany: input.courierCompany,
          courierType: input.courierType ?? null,
          trackingNumber: input.trackingNumber,
          trackingUrl: input.trackingUrl ?? null,
          status: 'in_transit',
        })
        .where(eq(shipments.id, existing.id));
      shipmentId = existing.id;
    } else {
      const [row] = await tx
        .insert(shipments)
        .values({
          orderId: order.id,
          provider: 'manual',
          courierCompany: input.courierCompany,
          courierType: input.courierType ?? null,
          trackingNumber: input.trackingNumber,
          trackingUrl: input.trackingUrl ?? null,
          status: 'in_transit',
          costIdr: order.shippingTotalIdr,
        })
        .returning({ id: shipments.id });
      if (!row) throw new Error('shipment insert returned no row');
      shipmentId = row.id;
    }

    await tx.insert(shipmentEvents).values({
      shipmentId,
      status: 'manifested',
      note: input.note ?? `Resi ${input.courierCompany}: ${input.trackingNumber}`,
      eventTime: new Date(),
    });

    // Move the order to shipped in the same transaction.
    if (order.status === 'paid' || order.status === 'processing') {
      await tx
        .update(orders)
        .set({ status: 'shipped' as never })
        .where(eq(orders.id, order.id));
      await tx.insert(orderEvents).values({
        orderId: order.id,
        status: 'shipped' as never,
        note: `Dikirim via ${input.courierCompany} (${input.trackingNumber})`,
        actorLabel: actor.label,
      });
      await queueNotification(tx, {
        templateKey: 'order.shipped',
        recipient: await customerEmailFor(tx, order.id),
        payload: { orderNumber: num, trackingNumber: input.trackingNumber },
        entityType: 'order',
        entityId: order.id,
      });
    }

    await writeAudit(tx, {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: 'order.shipment.record',
      entityType: 'order',
      entityId: order.id,
      after: { courier: input.courierCompany, resi: input.trackingNumber },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    return { ok: true as const };
  });
}

async function customerEmailFor(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  orderId: string,
): Promise<string> {
  const row = await tx
    .select({ email: customers.email })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.id, orderId))
    .limit(1);
  return row[0]?.email ?? '';
}
