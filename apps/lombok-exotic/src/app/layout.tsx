import type { ReactNode } from 'react';
import './globals.css';

// The real <html> lang is set in app/[locale]/layout.tsx via the segment.
// This root layout only exists because Next requires one above route groups.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
