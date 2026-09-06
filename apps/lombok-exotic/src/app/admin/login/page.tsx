import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isAdminRole } from '@lombok-exotic/core/auth';
import { getSessionUser } from '@/lib/auth-server';
import { AdminLoginForm } from '@/components/admin/login-form';

export const metadata: Metadata = { title: 'Masuk Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const user = await getSessionUser();
  if (user && isAdminRole(user.role) && user.isActive) redirect('/admin');

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="font-display text-2xl text-brand">Lombok Exotic</p>
      <h1 className="mt-1 text-lg font-semibold">Masuk Admin</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Panel pengelola toko. Hanya untuk staf.
      </p>
      <AdminLoginForm />
    </div>
  );
}
