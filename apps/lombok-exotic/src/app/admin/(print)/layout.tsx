import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { isAdminRole } from '@lombok-exotic/core/auth';
import { getSessionUser } from '@/lib/auth-server';

/** Sidebar-less admin layout for printable documents (invoices). */
export default async function AdminPrintLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/admin/login');
  if (!isAdminRole(user.role) || !user.isActive) redirect('/admin');
  return <div className="mx-auto max-w-3xl bg-white p-8 text-[var(--color-fg,#0a0a0a)]">{children}</div>;
}
