import Link from 'next/link';
import { clientConfig } from '../../client.config';

/**
 * Global fallback for paths that match no route at all (e.g. a mistyped URL
 * outside any locale segment). Renders its own document — `app/layout.tsx`
 * and next-intl context are not available here — so styles are inline and
 * copy is Indonesian (the default locale).
 */
export default function GlobalNotFound() {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.25rem',
          padding: '2rem',
          textAlign: 'center',
          background: '#211c18',
          color: '#ede6d8',
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-dark.svg"
          alt={clientConfig.name}
          width={220}
          height={97}
          style={{ width: '100%', maxWidth: 220, height: 'auto' }}
        />
        <p style={{ fontSize: '3rem', fontWeight: 700, margin: 0, color: '#d8a13a' }}>404</p>
        <p style={{ margin: 0, fontSize: '1.125rem' }}>Halaman yang kamu cari tidak ada.</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            href="/id"
            style={{
              background: '#9e2b25',
              color: '#fdf4f2',
              padding: '0.75rem 1.5rem',
              borderRadius: 2,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Kembali ke Beranda
          </Link>
          <Link
            href="/id/katalog"
            style={{
              border: '1px solid rgba(237,230,216,0.4)',
              color: '#ede6d8',
              padding: '0.75rem 1.5rem',
              borderRadius: 2,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Lihat Katalog
          </Link>
        </div>
      </body>
    </html>
  );
}
