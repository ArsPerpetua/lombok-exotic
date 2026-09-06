import { and, eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index';

const { productVariants, stockMovements } = schema;

/** A drizzle transaction handle (or the base db). */
export type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface StockLine {
  variantId: string;
  quantity: number;
}

export class StockUnavailableError extends Error {
  constructor(public readonly variantId: string) {
    super(`stock unavailable for variant ${variantId}`);
    this.name = 'StockUnavailableError';
  }
}

/**
 * Soft-hold stock for an in-flight checkout. One atomic conditional UPDATE per
 * line — `stock - reserved >= qty` is checked in the same statement that
 * increments `reserved`, so two concurrent checkouts for the last unit can
 * never both succeed. 0 rows updated ⇒ oversold ⇒ throw (caller's transaction
 * rolls back).
 */
export async function reserveStock(tx: Executor, lines: StockLine[]): Promise<void> {
  for (const line of lines) {
    if (line.quantity <= 0) continue;
    const rows = await tx
      .update(productVariants)
      .set({ reserved: sql`${productVariants.reserved} + ${line.quantity}` })
      .where(
        and(
          eq(productVariants.id, line.variantId),
          sql`${productVariants.stock} - ${productVariants.reserved} >= ${line.quantity}`,
        ),
      )
      .returning({ id: productVariants.id });
    if (rows.length === 0) throw new StockUnavailableError(line.variantId);
  }
}

/** Give back a hold (payment expired / checkout aborted). Never goes below 0. */
export async function releaseStock(tx: Executor, lines: StockLine[]): Promise<void> {
  for (const line of lines) {
    if (line.quantity <= 0) continue;
    await tx
      .update(productVariants)
      .set({
        reserved: sql`GREATEST(0, ${productVariants.reserved} - ${line.quantity})`,
      })
      .where(eq(productVariants.id, line.variantId));
  }
}

/**
 * Convert a hold into a sale (payment settled): decrement `stock`, release the
 * `reserved` hold, write one `stock_movements` ledger row per line. `stock` is
 * clamped at 0 so a settle-after-release (plan A1/A16 — payment landed after the
 * hold was freed and the units resold) never writes a negative column; the
 * ledger row still records the true `-qty`, so the audit sum reveals the gap.
 * Returns the variant ids whose on-hand stock could not cover the line (oversold).
 */
export async function commitSale(
  tx: Executor,
  lines: StockLine[],
  orderNumber: string,
  locationId?: string | null,
): Promise<string[]> {
  const oversold: string[] = [];
  for (const line of lines) {
    if (line.quantity <= 0) continue;
    const before = await tx.query.productVariants.findFirst({
      where: eq(productVariants.id, line.variantId),
      columns: { stock: true },
    });
    if (before && before.stock < line.quantity) oversold.push(line.variantId);
    await tx
      .update(productVariants)
      .set({
        stock: sql`GREATEST(0, ${productVariants.stock} - ${line.quantity})`,
        reserved: sql`GREATEST(0, ${productVariants.reserved} - ${line.quantity})`,
      })
      .where(eq(productVariants.id, line.variantId));
    await tx.insert(stockMovements).values({
      variantId: line.variantId,
      locationId: locationId ?? null,
      delta: -line.quantity,
      reason: 'sale',
      reference: orderNumber,
    });
  }
  return oversold;
}
