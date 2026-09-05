# Architecture

## Reusable-platform model

One monorepo, one shared core, one app per client. **Not** multi-tenant (single
DB with `tenant_id`) — that only pays off at 3+ clients and adds a data-isolation
burden. For Lombok Exotic + Sasaku:

```
packages/core          domain logic + schema — knows nothing client-specific
apps/lombok-exotic     client.config.ts + theme + content + messages
apps/sasaku            (future) copy of the app dir, different config
```

Each app deploys to its own VPS / database. Client-specific names ("Bajang Bus",
"Lombok Exotic") live only in `client.config.ts` and `messages/*.json`.

## Data flow — checkout (MVP)

```
 shopper                app (Next.js)                  core                 external
   │  add to cart  ────▶ POST server action ──▶ carts / cart_items (pg)
   │  checkout     ────▶ server action:
   │                       reserve stock (variant.reserved += qty, TTL)
   │                       create order (pending_payment)
   │                       PaymentProvider.createCharge() ───────────────▶ Midtrans Snap
   │  ◀──── snap redirect / token ◀────────────────────────────────────────┘
   │  pays on Midtrans page
   │
 Midtrans ──webhook──▶ /api/webhooks/midtrans
                          verifyWebhook (SHA512 sig)         [reject if invalid]
                          insert payment_events (dedupeKey)  [drop if duplicate]
                          order → paid, payment → settlement
                          enqueue notifications.deliver
                          enqueue commission accrual (if tourLeaderId)
                          release leftover stock hold
                                │
 worker (pg-boss) ──────────────┘
   notifications.deliver  → Resend email + wa.me link for admin
   payments.reconcile     → poll getStatus() for orders stuck > 15 min  ◀── the anti-silent-failure net
   stock.release-holds    → free reserved stock for expired payments
```

**Shadow paths that must be handled (see money/checkout code + tests):**
- webhook never arrives → `payments.reconcile` cron catches it
- webhook arrives twice / out of order → `payment_events.dedupeKey` unique
- payment settles after expiry → reconcile still promotes to paid, un-expires order
- stock sold out between add-to-cart and pay → reservation check fails the checkout
- zero-weight variant → DB + Zod reject before it reaches Biteship

## Data flow — group pre-order (the differentiator)

```
 tour leader ─▶ /pesanan-rombongan form ─▶ submitGroupPreorder (server action)
                    Zod validate → insert group_preorders (status=new)
                    enqueue notifications.deliver (staff)
 admin ─▶ /admin/rombongan queue
             add line items → generate quote (creates an `order`, links quoteOrderId)
             send quote (email + wa.me) → status=quoted
 agent confirms → status=confirmed → pay via VA → status=paid
             on fulfilment → accrue tour-leader commission
```

## Authorization

`packages/core/src/auth/rbac.ts` is the single capability matrix. Every admin
route, server action and RSC data fetch calls `requireCapability(cap)` /
`authorize(user, cap)`. **Middleware does i18n routing only** — it is never the
security boundary (it runs before the request reaches API route handlers and is
trivially bypassed for them).

MVP hands out `owner` + `staff`. All six roles resolve today, so unlocking the
full matrix in Phase 2 is a UI change, not a migration.

## Money

Always an integer number of rupiah. Every column is `*_idr integer`. `money.ts`
guards with `assertIdr`. No floats, ever.

## Schema map

| File | Tables |
|---|---|
| `auth.ts` | user, session, account, verification |
| `system.ts` | locations, settings, audit_log |
| `catalog.ts` | categories, products, product_images, product_variants, bundle_items, stock_movements |
| `customers.ts` | price_tiers, customers, addresses |
| `orders.ts` | carts, cart_items, orders, order_items, order_events |
| `payments.ts` | payments, payment_events, refunds |
| `shipping.ts` | shipments, shipment_events |
| `marketing.ts` | vouchers, voucher_redemptions, banners, articles, content_pages |
| `groups.ts` | tour_leaders, commissions, group_preorders, group_preorder_items |
| `notifications.ts` | notifications (outbox) |

Forward-looking columns present now (UI in Phase 2, no migration later):
`customers.type` / `priceTierId`, `price_tiers`, `orders.tourLeaderId`,
`tour_leaders`, `commissions`, `locations` on every stock/order row.
