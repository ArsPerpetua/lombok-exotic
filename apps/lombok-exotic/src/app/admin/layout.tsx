import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = { title: 'Admin — Lombok Exotic', robots: { index: false } };

/** Bare <html> shell for everything under /admin (single language, no i18n). */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[var(--color-accent,#f4f4f5)]/40 text-[var(--color-fg,#0a0a0a)]">
        {children}
      </body>
    </html>
  );
}
