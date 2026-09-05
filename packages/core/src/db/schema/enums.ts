import { pgEnum } from 'drizzle-orm/pg-core';

// Admin / staff roles. MVP uses `owner` + `staff`; the rest are wired in Phase 2
// so the enum is stable and no migration is needed to unlock full RBAC.
export const userRole = pgEnum('user_role', [
  'customer',
  'staff',
  'cashier',
  'warehouse',
  'cs',
  'admin',
  'owner',
]);

export const customerType = pgEnum('customer_type', ['retail', 'agent', 'reseller']);

export const productType = pgEnum('product_type', ['simple', 'variable', 'bundle']);
export const productStatus = pgEnum('product_status', ['draft', 'active', 'archived']);

export const discountType = pgEnum('discount_type', ['percent', 'fixed']);

export const orderChannel = pgEnum('order_channel', ['online', 'in_store', 'group_preorder']);
export const orderStatus = pgEnum('order_status', [
  'pending_payment',
  'paid',
  'processing',
  'shipped',
  'completed',
  'cancelled',
  'refunded',
]);

export const paymentStatus = pgEnum('payment_status', [
  'pending',
  'settlement',
  'expired',
  'failed',
  'refunded',
]);

export const shipmentStatus = pgEnum('shipment_status', [
  'draft',
  'requested',
  'allocated',
  'picking_up',
  'picked',
  'in_transit',
  'delivered',
  'returned',
  'cancelled',
]);

export const groupPreorderStatus = pgEnum('group_preorder_status', [
  'new',
  'quoted',
  'confirmed',
  'paid',
  'fulfilled',
  'cancelled',
]);

export const commissionStatus = pgEnum('commission_status', [
  'accrued',
  'approved',
  'paid',
  'void',
]);

export const contentStatus = pgEnum('content_status', ['draft', 'published']);

export const bannerPosition = pgEnum('banner_position', ['hero', 'secondary', 'promo_bar']);

export const cartStatus = pgEnum('cart_status', ['active', 'converted', 'abandoned']);

export const locale = pgEnum('locale', ['id', 'en']);
