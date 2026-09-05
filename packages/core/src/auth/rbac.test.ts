import { describe, expect, it } from 'vitest';
import { authorize, AuthorizationError, can, capabilitiesFor } from './rbac';

describe('rbac', () => {
  it('owner can do everything including finance and staff mgmt', () => {
    expect(can('owner', 'report:finance')).toBe(true);
    expect(can('owner', 'staff:manage')).toBe(true);
    expect(can('owner', 'order:refund')).toBe(true);
  });

  it('staff cannot see finance reports or manage staff', () => {
    expect(can('staff', 'report:finance')).toBe(false);
    expect(can('staff', 'staff:manage')).toBe(false);
    expect(can('staff', 'order:refund')).toBe(false);
  });

  it('staff can run day-to-day catalog and orders', () => {
    expect(can('staff', 'catalog:write')).toBe(true);
    expect(can('staff', 'order:write')).toBe(true);
    expect(can('staff', 'group_preorder:write')).toBe(true);
  });

  it('unknown role has zero capabilities', () => {
    expect(capabilitiesFor('customer')).toHaveLength(0);
    expect(can('customer', 'order:read')).toBe(false);
  });

  it('authorize throws for inactive users', () => {
    expect(() => authorize({ role: 'owner', isActive: false }, 'order:read')).toThrow(
      AuthorizationError,
    );
  });

  it('authorize throws for missing capability', () => {
    expect(() => authorize({ role: 'cashier' }, 'report:finance')).toThrow(AuthorizationError);
    expect(() => authorize({ role: 'cashier' }, 'order:read')).not.toThrow();
  });
});
