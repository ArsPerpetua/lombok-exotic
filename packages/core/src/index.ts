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

export { getPaymentProvider, MidtransProvider } from './payment/index';
export type {
  PaymentProvider,
  CreateChargeInput,
  WebhookVerification,
} from './payment/index';

export { getShippingProvider, BiteshipProvider } from './shipping/index';
export type { ShippingProvider, RateOption, RateQuoteInput } from './shipping/index';

export { sendEmail, waMeLink } from './email/index';
export { enqueue, getBoss, stopBoss, QUEUES } from './jobs/index';

export { assertIdr, formatIdr, discountAmount, sumLines } from './money';
export type { Idr } from './money';
export { orderNumber, groupPreorderReference, referralCode } from './ids';
