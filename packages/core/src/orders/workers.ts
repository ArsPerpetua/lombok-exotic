import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { db, schema } from '../db/index';

const { orders, payments } = schema;

/**
 * Selection queries for the payment workers, kept in `core` (not the app) so
 * they are unit-testable — see plan amendment A22. Each returns a bounded list
 * of order numbers; the worker iterates and calls the `payment-state` fns.
 */

/** Orders stuck `pending_payment` with a payment older than 15 min → reconcile. */
export async function findStuckOrders(limit = 20): Promise<string[]> {
  const rows = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .where(
      and(
        eq(orders.status, 'pending_payment'),
        lt(payments.createdAt, sql`now() - interval '15 minutes'`),
      ),
    )
    .orderBy(payments.createdAt)
    .limit(limit);
  return rows.map((r) => r.orderNumber);
}

/** `pending_payment` orders whose payment hold has expired → try settle, then release. */
export async function findExpiredHolds(limit = 20): Promise<string[]> {
  const rows = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .where(
      and(
        eq(orders.status, 'pending_payment'),
        lt(payments.expiresAt, sql`now()`),
      ),
    )
    .orderBy(payments.expiresAt)
    .limit(limit);
  return rows.map((r) => r.orderNumber);
}

/** `pending_payment` orders with NO payment row, older than 30 min → orphan cleanup. */
export async function findOrphanedOrders(limit = 20): Promise<string[]> {
  const rows = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .leftJoin(payments, eq(payments.orderId, orders.id))
    .where(
      and(
        eq(orders.status, 'pending_payment'),
        isNull(payments.id),
        lt(orders.createdAt, sql`now() - interval '30 minutes'`),
      ),
    )
    .limit(limit);
  return rows.map((r) => r.orderNumber);
}
