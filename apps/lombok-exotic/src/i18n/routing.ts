import { defineRouting } from 'next-intl/routing';
import { clientConfig } from '../../client.config';

export const routing = defineRouting({
  locales: clientConfig.locales.supported,
  defaultLocale: clientConfig.locales.default,
  localePrefix: 'always',
});

export type AppLocale = (typeof routing.locales)[number];

export function isValidLocale(value: string): value is AppLocale {
  return (routing.locales as readonly string[]).includes(value);
}
