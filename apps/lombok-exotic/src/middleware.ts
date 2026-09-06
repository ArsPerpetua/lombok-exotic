import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * i18n routing only. NOTE: this middleware does NOT protect /admin — auth is
 * enforced server-side in the admin layout + every server action via
 * `authorize()` from @lombok-exotic/core. Middleware is a routing concern,
 * never the security boundary.
 */
export default createMiddleware(routing);

export const config = {
  // /admin is single-language (no locale prefix) and auth-gated server-side.
  matcher: ['/((?!api|admin|_next|_vercel|.*\\..*).*)'],
};
