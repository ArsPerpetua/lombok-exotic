import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveRequestOrigin } from './http';

function req(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

describe('resolveRequestOrigin', () => {
  const original = process.env.APP_URL;
  beforeEach(() => {
    delete process.env.APP_URL;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = original;
  });

  it('uses the Host header the client actually reached us on, not req.url', () => {
    // Regression: Next dev reports req.url as http://localhost:3000 regardless of
    // the real host, which broke the post-checkout redirect for LAN/phone users.
    const r = req('http://localhost:3000/api/checkout', { host: '192.168.1.50:3000' });
    expect(resolveRequestOrigin(r)).toBe('http://192.168.1.50:3000');
  });

  it('prefers x-forwarded-host and x-forwarded-proto behind a proxy', () => {
    const r = req('http://localhost:3000/api/checkout', {
      host: 'internal:3000',
      'x-forwarded-host': 'shop.example.com',
      'x-forwarded-proto': 'https',
    });
    expect(resolveRequestOrigin(r)).toBe('https://shop.example.com');
  });

  it('takes the first value when x-forwarded-proto is a list', () => {
    const r = req('http://localhost:3000/x', {
      host: 'shop.example.com',
      'x-forwarded-proto': 'https, http',
    });
    expect(resolveRequestOrigin(r)).toBe('https://shop.example.com');
  });

  it('falls back to APP_URL when there is no host header', () => {
    process.env.APP_URL = 'https://exotic.example/';
    const r = new Request('http://localhost:3000/api/checkout');
    // node strips a genuinely absent Host, but be explicit about intent:
    r.headers.delete('host');
    expect(resolveRequestOrigin(r)).toBe('https://exotic.example');
  });
});
