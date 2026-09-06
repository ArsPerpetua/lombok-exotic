/**
 * @lombok-exotic/core — shared domain layer for the storefront platform.
 * Import from the subpath exports (`@lombok-exotic/core/db`, `/payment`, ...)
 * in app code; this barrel is for convenience in scripts and tests.
 */
export * as schema from './db/schema/index';
export { db } from './db/index';
export type { Database } from './db/index';

export { defineClientConfig, clientConfigSchema, tr } from './config/index';
export type { ClientConfig } from './config/index';

export { auth } from './auth/index';
export {
  authorize,
  can,
  capabilitiesFor,
  isAdminRole,
  AuthorizationError,
} from './auth/rbac';
export type { AdminRole, Capability } from './auth/rbac';

export { getPaymentProvider, MidtransProvider, FakePaymentProvider } from './payment/index';
export { normalizeMsisdn, isValidMsisdn, msisdnLastDigits } from './phone';
export type {
  PaymentProvider,
  CreateChargeInput,
  WebhookVerification,
} from './payment/index';

export { getShippingProvider, BiteshipProvider, FakeShippingProvider } from './shipping/index';
export type { ShippingProvider, RateOption, RateQuoteInput, AreaResult } from './shipping/index';

export {
  createCheckout,
  reserveStock,
  releaseStock,
  commitSale,
  StockUnavailableError,
  getOrderForConfirmation,
  findOrderForTracking,
  normalizeOrderNumber,
  applyPaymentUpdate,
  reconcilePendingOrder,
  expireStaleHold,
  cancelOrphanedOrder,
  findStuckOrders,
  findExpiredHolds,
  findOrphanedOrders,
  repayOrder,
} from './orders/index';
export type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  CheckoutError,
  CheckoutContact,
  CheckoutAddress,
  CheckoutShipping,
  StockLine,
  ApplyResult,
  ApplyOutcome,
  RepayResult,
  RepayError,
  TrackedOrder,
} from './orders/index';
export { getSetting, getNumberSetting } from './settings';
export { writeAudit } from './audit';
export {
  slugify,
  listAdminProducts,
  getAdminProduct,
  listCategoriesForAdmin,
  saveProduct,
  saveVariant,
  deactivateVariant,
  attachImage,
  detachImage,
} from './catalog/index';

export { sendEmail, waMeLink } from './email/index';
export { enqueue, getBoss, stopBoss, QUEUES } from './jobs/index';
export { deliverPendingNotifications, queueNotification, renderEmail } from './notifications/index';

export { assertIdr, formatIdr, discountAmount, sumLines } from './money';
export type { Idr } from './money';
export { orderNumber, groupPreorderReference, referralCode } from './ids';
