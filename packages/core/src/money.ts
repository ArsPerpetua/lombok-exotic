/**
 * Money in this codebase is always an integer number of rupiah (IDR has no
 * sub-unit in practice). Never use floats for money. All `*_idr` columns and
 * fields follow this rule.
 */

export type Idr = number;

export function assertIdr(value: number, label = 'amount'): asserts value is Idr {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer number of rupiah, got ${value}`);
  }
  if (value < 0) {
    throw new Error(`${label} must not be negative, got ${value}`);
  }
}

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

/** 150000 -> "Rp150.000" */
export function formatIdr(value: Idr): string {
  return idrFormatter.format(value);
}

/**
 * Apply a percent or fixed discount, clamped so the result never goes below 0
 * and never exceeds an optional cap. Returns the discount amount (not the net).
 */
export function discountAmount(
  base: Idr,
  type: 'percent' | 'fixed',
  value: number,
  maxDiscount?: Idr | null,
): Idr {
  assertIdr(base, 'base');
  let amount = type === 'percent' ? Math.round((base * value) / 100) : Math.round(value);
  if (maxDiscount != null) amount = Math.min(amount, maxDiscount);
  return Math.max(0, Math.min(amount, base));
}

/** Sum line totals (qty * unit price) as integers. */
export function sumLines(lines: Array<{ unitPriceIdr: Idr; quantity: number }>): Idr {
  return lines.reduce((acc, l) => acc + l.unitPriceIdr * l.quantity, 0);
}
