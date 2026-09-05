import { describe, expect, it } from 'vitest';
import { assertIdr, discountAmount, formatIdr, sumLines } from './money';

describe('money', () => {
  it('formats IDR with grouping and no decimals', () => {
    // ICU may or may not insert a (non-breaking) space after "Rp".
    const out = formatIdr(150_000);
    expect(out).toMatch(/^Rp\s?150\.000$/);
    expect(out).not.toContain(',');
  });

  it('rejects non-integer and negative amounts', () => {
    expect(() => assertIdr(1.5)).toThrow();
    expect(() => assertIdr(-1)).toThrow();
  });

  it('applies percent discount, rounded', () => {
    expect(discountAmount(150_000, 'percent', 10)).toBe(15_000);
    expect(discountAmount(99_999, 'percent', 10)).toBe(10_000);
  });

  it('applies fixed discount clamped to base', () => {
    expect(discountAmount(50_000, 'fixed', 80_000)).toBe(50_000);
  });

  it('honours max discount cap', () => {
    expect(discountAmount(1_000_000, 'percent', 50, 100_000)).toBe(100_000);
  });

  it('sums line totals as integers', () => {
    expect(
      sumLines([
        { unitPriceIdr: 95_000, quantity: 3 },
        { unitPriceIdr: 55_000, quantity: 2 },
      ]),
    ).toBe(395_000);
  });
});
