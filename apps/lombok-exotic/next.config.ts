import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const monorepoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Standalone output for the VPS deploy (`node .next/standalone/.../server.js`).
  // Opt-in via env: the trace step uses symlinks, which Windows blocks locally.
  // CI (Linux) sets BUILD_STANDALONE=1; see .github/workflows/deploy.yml.
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,
  // Trace workspace deps from the monorepo root so the standalone bundle is complete.
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ['@lombok-exotic/core'],
  // core imports pg / pg-boss — keep them external to the server bundle.
  serverExternalPackages: ['pg', 'pg-boss'],
  // @lombok-exotic/core is TS ESM with explicit .js import specifiers that
  // point at .ts files (the TS/NodeNext idiom). Turbopack resolves these, the
  // webpack build needs this alias.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
