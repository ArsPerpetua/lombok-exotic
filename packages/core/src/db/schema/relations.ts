import { relations } from 'drizzle-orm';
import { categories, bundleItems, productImages, products, productVariants } from './catalog';
import { addresses, customers, priceTiers } from './customers';
import { carts, cartItems, orderEvents, orderItems, orders } from './orders';
import { paymentEvents, payments, refunds } from './payments';
import { shipmentEvents, shipments } from './shipping';
import { commissions, groupPreorderItems, groupPreorders, tourLeaders } from './groups';
import { voucherRedemptions, vouchers } from './marketing';

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'category_tree',
  }),
  children: many(categories, { relationName: 'category_tree' }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
  variants: many(productVariants),
  bundleItems: many(bundleItems, { relationName: 'bundle_parent' }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  inBundles: many(bundleItems, { relationName: 'bundle_component' }),
}));

export const bundleItemsRelations = relations(bundleItems, ({ one }) => ({
  bundle: one(products, {
    fields: [bundleItems.bundleProductId],
    references: [products.id],
    relationName: 'bundle_parent',
  }),
  variant: one(productVariants, {
    fields: [bundleItems.variantId],
    references: [productVariants.id],
    relationName: 'bundle_component',
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  priceTier: one(priceTiers, {
    fields: [customers.priceTierId],
    references: [priceTiers.id],
  }),
  addresses: many(addresses),
  orders: many(orders),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  customer: one(customers, { fields: [addresses.customerId], references: [customers.id] }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  customer: one(customers, { fields: [carts.customerId], references: [customers.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  voucher: one(vouchers, { fields: [orders.voucherId], references: [vouchers.id] }),
  tourLeader: one(tourLeaders, { fields: [orders.tourLeaderId], references: [tourLeaders.id] }),
  items: many(orderItems),
  events: many(orderEvents),
  payments: many(payments),
  shipments: many(shipments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  events: many(paymentEvents),
  refunds: many(refunds),
}));

export const paymentEventsRelations = relations(paymentEvents, ({ one }) => ({
  payment: one(payments, { fields: [paymentEvents.paymentId], references: [payments.id] }),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  payment: one(payments, { fields: [refunds.paymentId], references: [payments.id] }),
}));

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  order: one(orders, { fields: [shipments.orderId], references: [orders.id] }),
  events: many(shipmentEvents),
}));

export const shipmentEventsRelations = relations(shipmentEvents, ({ one }) => ({
  shipment: one(shipments, { fields: [shipmentEvents.shipmentId], references: [shipments.id] }),
}));

export const vouchersRelations = relations(vouchers, ({ many }) => ({
  redemptions: many(voucherRedemptions),
}));

export const voucherRedemptionsRelations = relations(voucherRedemptions, ({ one }) => ({
  voucher: one(vouchers, {
    fields: [voucherRedemptions.voucherId],
    references: [vouchers.id],
  }),
  order: one(orders, {
    fields: [voucherRedemptions.orderId],
    references: [orders.id],
  }),
}));

export const tourLeadersRelations = relations(tourLeaders, ({ many }) => ({
  commissions: many(commissions),
  groupPreorders: many(groupPreorders),
  orders: many(orders),
}));

export const commissionsRelations = relations(commissions, ({ one }) => ({
  tourLeader: one(tourLeaders, {
    fields: [commissions.tourLeaderId],
    references: [tourLeaders.id],
  }),
  order: one(orders, { fields: [commissions.orderId], references: [orders.id] }),
  groupPreorder: one(groupPreorders, {
    fields: [commissions.groupPreorderId],
    references: [groupPreorders.id],
  }),
}));

export const groupPreordersRelations = relations(groupPreorders, ({ one, many }) => ({
  tourLeader: one(tourLeaders, {
    fields: [groupPreorders.tourLeaderId],
    references: [tourLeaders.id],
  }),
  quoteOrder: one(orders, {
    fields: [groupPreorders.quoteOrderId],
    references: [orders.id],
  }),
  items: many(groupPreorderItems),
}));

export const groupPreorderItemsRelations = relations(groupPreorderItems, ({ one }) => ({
  groupPreorder: one(groupPreorders, {
    fields: [groupPreorderItems.groupPreorderId],
    references: [groupPreorders.id],
  }),
  variant: one(productVariants, {
    fields: [groupPreorderItems.variantId],
    references: [productVariants.id],
  }),
}));
