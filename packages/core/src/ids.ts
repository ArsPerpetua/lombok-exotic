import { customAlphabet } from 'nanoid';

const digits = customAlphabet('0123456789', 4);
const upper = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

/** LEX-260905-4821 — prefix + yymmdd + random. Human-quotable, low collision. */
export function orderNumber(prefix = 'LEX', at = new Date()): string {
  const y = at.getFullYear().toString().slice(-2);
  const m = String(at.getMonth() + 1).padStart(2, '0');
  const d = String(at.getDate()).padStart(2, '0');
  return `${prefix}-${y}${m}${d}-${digits()}`;
}

/** GRP-7K2M9Q — group pre-order reference. */
export function groupPreorderReference(prefix = 'GRP'): string {
  return `${prefix}-${upper()}`;
}

/** Tour-leader referral code, e.g. TL-9QX2K7. */
export function referralCode(prefix = 'TL'): string {
  return `${prefix}-${upper()}`;
}
