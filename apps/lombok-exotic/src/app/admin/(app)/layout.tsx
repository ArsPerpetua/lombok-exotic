import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdminRole } from '@lombok-exotic/core/auth';
import { getSessionUser } from '@/lib/auth-server';
import { AdminSignOut } from '@/components/admin/sign-out';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/pesanan', label: 'Pesanan' },
  { href: '/admin/produk', label: 'Produk' },
  { href: '/admin/voucher', label: 'Voucher' },
];

export default async function AdminAppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/admin/login');

  if (!isAdminRole(user.role) || !user.isActive) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-xl font-semibold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Akun <strong>{user.email}</strong> tidak punya akses admin.
        </p>
        <div className="mt-4">
          <AdminSignOut />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-52 shrink-0 border-r bg-white p-4 sm:block">
        <p className="font-display text-lg text-brand">Lombok Exotic</p>
        <p className="mb-6 text-xs text-[var(--color-muted)]">Admin</p>
        <nav className="space-y-1 text-sm">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="block rounded px-2 py-1.5 hover:bg-black/5">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t pt-4 text-xs text-[var(--color-muted)]">
          <p className="truncate">{user.email}</p>
          <p className="capitalize">{user.role}</p>
          <AdminSignOut />
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
