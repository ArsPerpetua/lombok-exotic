import { clientConfigSchema, type ClientConfig } from './types';

export { clientConfigSchema };
export type { ClientConfig };

/**
 * Validate a raw client config object. Call this once at module load in the
 * app's `client.config.ts` so a malformed config fails the build, not a request.
 */
export function defineClientConfig(raw: unknown): ClientConfig {
  const parsed = clientConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Invalid client config:\n${parsed.error.issues
        .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
        .join('\n')}`,
    );
  }
  const config = parsed.data;
  if (!config.locales.supported.includes(config.locales.default)) {
    throw new Error('client config: locales.default must be in locales.supported');
  }
  return config;
}

export function tr(record: Record<string, string>, locale: string, fallback = 'id'): string {
  return record[locale] ?? record[fallback] ?? Object.values(record)[0] ?? '';
}
