/**
 * Absolute origin (`http(s)://host`) that an incoming request actually reached
 * us on — for building external callback URLs (payment finish redirect, repay).
 *
 * `new URL(req.url).origin` is NOT reliable for this: Next's dev server reports
 * `http://localhost:3000` no matter which host the client used, so a shopper on
 * a phone at `http://192.168.1.x:3000` gets redirected to `localhost:3000` after
 * checkout and sees "connection refused". Trust the forwarded/Host header first
 * (what the client typed), then a configured `APP_URL`, then the raw URL.
 *
 * Proto defaults to `http` unless `x-forwarded-proto` says otherwise — matches
 * how the admin print pages already derive their base URL. A real reverse proxy
 * in production sets `x-forwarded-proto: https`.
 */
export function resolveRequestOrigin(req: Request): string {
  const h = req.headers;
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (host) {
    const proto = h.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'http';
    return `${proto}://${host}`;
  }
  const appUrl = process.env.APP_URL?.replace(/\/+$/, '');
  if (appUrl) return appUrl;
  try {
    return new URL(req.url).origin;
  } catch {
    return 'http://localhost:3000';
  }
}
