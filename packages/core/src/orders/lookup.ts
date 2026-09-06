import { asc, desc, eq } from 'drizzle-orm';
import { db, schema } from '../db/index';
import { msisdnLastDigits } from '../phone';

const { orders, payments } = schema;

/** Normalise a user-typed order number: uppercase, strip stray whitespace. */
export function normalizeOrderNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Load an order for the confirmation page (`/pesanan/[orderNumber]`).
 * `waLast4` gates the PII (recipient, address, line items) — the page is public
 * because Midtrans redirects to it, and order numbers are low-entropy (A20).
 */
export async function getOrderForConfirmation(orderNumber: string, waLast4?: string | null) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.orderNumber, normalizeOrderNumber(orderNumber)),
    with: {
      items: true,
      customer: { columns: { name: true, phone: true, email: true } },
      payments: { orderBy: [desc(payments.createdAt)], limit: 1 },
      events: { orderBy: [desc(schema.orderEvents.createdAt)] },
    },
  });
  if (!order) return null;

  const authorized = Boolean(
    waLast4 && order.customer && msisdnLastDigits(order.customer.phone, 4) === waLast4,
  );

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    subtotalIdr: order.subtotalIdr,
    shippingTotalIdr: order.shippingTotalIdr,
    discountTotalIdr: order.discountTotalIdr,
    grandTotalIdr: order.grandTotalIdr,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    shippingSelection: order.shippingSelection,
    payment: order.payments[0]
      ? {
          status: order.payments[0].status,
          expiresAt: order.payments[0].expiresAt,
          redirectUrl: order.payments[0].snapRedirectUrl,
        }
      : null,
    authorized,
    // PII — only when the phone last-4 matches.
    recipient: authorized ? order.customer?.name ?? null : null,
    items: authorized
      ? order.items.map((i) => ({
          productName: i.productName,
          variantName: i.variantName,
          quantity: i.quantity,
          unitPriceIdr: i.unitPriceIdr,
          lineTotalIdr: i.lineTotalIdr,
        }))
      : [],
  };
}

export interface TrackedOrder {
  orderNumber: string;
  status: string;
  createdAt: Date;
  paidAt: Date | null;
  grandTotalIdr: number;
  shippingSelection: {
    courierCompany: string;
    serviceName: string;
    etd: string | null;
  } | null;
  paymentStatus: string | null;
  timeline: Array<{ status: string; note: string | null; at: Date }>;
  shipment: {
    courierCompany: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    status: string;
    events: Array<{ status: string; note: string | null; at: Date | null }>;
  } | null;
}

/**
 * Order + status timeline for `/lacak`. Matches on the order number AND the
 * last 4 digits of the customer's WhatsApp number (two factors). Returns null
 * on any miss — the caller must not reveal which factor was wrong.
 */
export async function findOrderForTracking(
  orderNumber: string,
  phone: string,
): Promise<TrackedOrder | null> {
  const last4 = msisdnLastDigits(phone, 4);
  if (last4.length < 4) return null;

  const order = await db.query.orders.findFirst({
    where: eq(orders.orderNumber, normalizeOrderNumber(orderNumber)),
    with: {
      customer: { columns: { phone: true } },
      payments: { orderBy: [desc(payments.createdAt)], limit: 1, columns: { status: true } },
      events: { orderBy: [asc(schema.orderEvents.createdAt)] },
      shipments: {
        orderBy: [desc(schema.shipments.createdAt)],
        limit: 1,
        with: { events: { orderBy: [asc(schema.shipmentEvents.createdAt)] } },
      },
    },
  });
  if (!order || !order.customer || msisdnLastDigits(order.customer.phone, 4) !== last4) {
    return null;
  }

  const shp = order.shipments[0] ?? null;
  const sel = order.shippingSelection;
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    grandTotalIdr: order.grandTotalIdr,
    shippingSelection: sel
      ? { courierCompany: sel.courierCompany, serviceName: sel.serviceName, etd: sel.etd }
      : null,
    paymentStatus: order.payments[0]?.status ?? null,
    timeline: order.events.map((e) => ({ status: e.status, note: e.note, at: e.createdAt })),
    shipment: shp
      ? {
          courierCompany: shp.courierCompany,
          trackingNumber: shp.trackingNumber,
          trackingUrl: shp.trackingUrl,
          status: shp.status,
          events: shp.events.map((e) => ({ status: e.status, note: e.note, at: e.eventTime })),
        }
      : null,
  };
}
