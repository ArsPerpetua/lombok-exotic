import Link from 'next/link';

// Global fallback for unmatched paths outside a locale segment.
export default function GlobalNotFound() {
  return (
    <html lang="id">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '4rem', textAlign: 'center' }}>
        <h1>404</h1>
        <p>Halaman tidak ditemukan.</p>
        <Link href="/id">Kembali ke beranda</Link>
      </body>
    </html>
  );
}
