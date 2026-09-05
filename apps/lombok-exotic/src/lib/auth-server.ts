import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@lombok-exotic/core/auth';
import { authorize, type Capability } from '@lombok-exotic/core/auth';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

/** Current admin/user session, or null. Safe to call in RSC + route handlers. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const u = session.user as unknown as SessionUser;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role ?? 'customer',
    isActive: u.isActive ?? true,
  };
}

/**
 * Gate an admin page/action on a capability. Redirects unauthenticated users
 * to login; throws AuthorizationError (→ 403) for authenticated-but-forbidden.
 * This is the security boundary — never rely on middleware for /admin.
 */
export async function requireCapability(capability: Capability): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/admin/login');
  authorize(user, capability);
  return user;
}
