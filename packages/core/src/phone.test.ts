import { describe, expect, it } from 'vitest';
import { isValidMsisdn, msisdnLastDigits, normalizeMsisdn } from './phone';

describe('normalizeMsisdn', () => {
  it('canonicalises the common Indonesian shapes to 62…', () => {
    for (const raw of [
      '08123456789',
      '+628123456789',
      '628123456789',
      '62 812-3456-789',
      '(0812) 3456 789',
      '8123456789',
    ]) {
      expect(normalizeMsisdn(raw)).toBe('628123456789');
    }
  });

  it('strips extra leading zeros', () => {
    expect(normalizeMsisdn('008123456789')).toBe('628123456789');
    expect(normalizeMsisdn('62008123456789')).toBe('628123456789');
  });

  it('returns empty string for unusable input', () => {
    expect(normalizeMsisdn('')).toBe('');
    expect(normalizeMsisdn('   ')).toBe('');
    expect(normalizeMsisdn('abc')).toBe('');
    expect(normalizeMsisdn('0')).toBe('');
  });

  it('leaves an unknown country shape as digits rather than guessing', () => {
    expect(normalizeMsisdn('15551234567')).toBe('15551234567');
  });
});

describe('isValidMsisdn', () => {
  it('accepts real Indonesian mobile numbers', () => {
    expect(isValidMsisdn('08123456789')).toBe(true);
    expect(isValidMsisdn('+62 851 5555 1234')).toBe(true);
  });

  it('rejects too-short, non-8-prefixed, or junk', () => {
    expect(isValidMsisdn('0812345')).toBe(false); // too short
    expect(isValidMsisdn('0217654321')).toBe(false); // landline (021…)
    expect(isValidMsisdn('')).toBe(false);
  });
});

describe('msisdnLastDigits', () => {
  it('returns the last 4 canonical digits regardless of input shape', () => {
    expect(msisdnLastDigits('0812-3456-789')).toBe('6789');
    expect(msisdnLastDigits('+628123456789')).toBe('6789');
  });
});
