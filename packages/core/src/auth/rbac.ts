/**
 * Central authorization. Every admin route handler, server action and RSC
 * data fetch calls `authorize(user, action)` — never scatter role checks or
 * rely on middleware alone (middleware runs before the request reaches the
 * handler and is trivially bypassed for API routes).
 *
 * MVP ships `owner` + `staff`. The other roles resolve today (so no migration
 * later) but are only handed out in Phase 2 when the full matrix UI lands.
 */

export type AdminRole = 'staff' | 'cashier' | 'warehouse' | 'cs' | 'admin' | 'owner';

export type Capability =
  | 'catalog:read'
  | 'catalog:write'
  | 'order:read'
  | 'order:write'
  | 'order:refund'
  | 'inventory:write'
  | 'customer:read'
  | 'customer:write'
  | 'group_preorder:read'
  | 'group_preorder:write'
  | 'tour_leader:read'
  | 'tour_leader:write'
  | 'commission:read'
  | 'commission:pay'
  | 'marketing:write'
  | 'content:write'
  | 'report:read'
  | 'report:finance'
  | 'settings:write'
  | 'staff:manage'
  | 'audit:read';

const ALL: Capability[] = [
  'catalog:read',
  'catalog:write',
  'order:read',
  'order:write',
  'order:refund',
  'inventory:write',
  'customer:read',
  'customer:write',
  'group_preorder:read',
  'group_preorder:write',
  'tour_leader:read',
  'tour_leader:write',
  'commission:read',
  'commission:pay',
  'marketing:write',
  'content:write',
  'report:read',
  'report:finance',
  'settings:write',
  'staff:manage',
  'audit:read',
];

const MATRIX: Record<AdminRole, Capability[]> = {
  owner: ALL,
  admin: ALL.filter((c) => c !== 'staff:manage' && c !== 'settings:write'),
  staff: [
    'catalog:read',
    'catalog:write',
    'order:read',
    'order:write',
    'inventory:write',
    'customer:read',
    'group_preorder:read',
    'group_preorder:write',
    'marketing:write',
    'content:write',
    'report:read',
  ],
  cashier: ['catalog:read', 'order:read', 'order:write', 'customer:read'],
  warehouse: ['catalog:read', 'order:read', 'order:write', 'inventory:write'],
  cs: [
    'order:read',
    'customer:read',
    'customer:write',
    'group_preorder:read',
    'group_preorder:write',
  ],
};

export function isAdminRole(role: string): role is AdminRole {
  return role in MATRIX;
}

export function can(role: string, capability: Capability): boolean {
  if (!isAdminRole(role)) return false;
  return MATRIX[role].includes(capability);
}

export class AuthorizationError extends Error {
  readonly code = 'FORBIDDEN';
  constructor(capability: Capability) {
    super(`Missing capability: ${capability}`);
    this.name = 'AuthorizationError';
  }
}

/** Throwing gate for use in server actions / route handlers. */
export function authorize(
  actor: { role: string; isActive?: boolean } | null | undefined,
  capability: Capability,
): void {
  if (!actor || actor.isActive === false || !can(actor.role, capability)) {
    throw new AuthorizationError(capability);
  }
}

export function capabilitiesFor(role: string): Capability[] {
  return isAdminRole(role) ? [...MATRIX[role]] : [];
}
