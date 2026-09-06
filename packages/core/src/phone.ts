/**
 * Indonesian mobile numbers (MSISDN) arrive in many shapes: `08123456789`,
 * `+62 812-3456-789`, `62812345678`, `(0812) 3456 789`. Everything in this
 * codebase stores and compares the canonical form: digits only, `62` country
 * prefix, no leading `0`.
 *
 * `customers.phone` is UNIQUE — without normalising at write time, the same
 * person checking out as `0812…` then `+62812…` creates two customer rows and
 * `/lacak` fails to match. Normalise at every write and every lookup.
 */

/** Canonical MSISDN: `62` + national number, digits only. Empty string if unusable. */
export function normalizeMsisdn(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return '';

  let national: string;
  if (digits.startsWith('62')) {
    national = digits.slice(2);
  } else if (digits.startsWith('0')) {
    national = digits.replace(/^0+/, '');
  } else if (digits.startsWith('8')) {
    // Bare national number without a trunk `0` (common in typed input).
    national = digits;
  } else {
    // Unknown shape — return digits as-is rather than guess a country code.
    return digits;
  }

  national = national.replace(/^0+/, '');
  if (!national) return '';
  return `62${national}`;
}

/**
 * True when `raw` looks like a valid Indonesian mobile number.
 * Indonesian mobile national numbers start with `8` and run 9-12 digits
 * (so `62` + national = 11-14 digits total).
 */
export function isValidMsisdn(raw: string): boolean {
  const n = normalizeMsisdn(raw);
  return /^628\d{7,11}$/.test(n);
}

/** Last N digits of the canonical number — used for the `/lacak` + confirmation-page check. */
export function msisdnLastDigits(raw: string, n = 4): string {
  return normalizeMsisdn(raw).slice(-n);
}
