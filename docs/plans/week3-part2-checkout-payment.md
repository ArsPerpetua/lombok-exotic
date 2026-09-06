<!-- /autoplan restore point: /c/Users/Dfive/.gstack/projects/lombok-exotic-app/main-autoplan-restore-20260906-102811.md -->
<!-- STATUS: APPROVED 2026-09-06 via /autoplan (as-is: T1 defer voucher, T2 no-migration idempotency, T3 FakePaymentProvider for 3.2a). 23 amendments folded. Build order: 3.2a → 3.2b → 3.2c. -->
<!-- 3.2a BUILT 2026-09-06: core/orders/{stock,checkout,lookup}, core/phone + FakePayment/FakeShipping providers, /api/checkout + /api/shipping/*, <CheckoutForm>, /pesanan/[orderNumber]. e2e-smoked green. Also added: FakeShippingProvider (SHIPPING_PROVIDER=fake), core/settings.ts, core/shipping/origin.ts. Remaining 3.2a: DB integration tests (needs *.integration.test.ts vitest split). Next: 3.2b. -->
<!-- 3.2b will need: applyPaymentUpdate reuses core/orders/stock.commitSale + a status-guarded conditional UPDATE; the fake provider's redirectUrl is /pesanan/{n}?fake_pay=1 — 3.2b adds a dev-only button there that POSTs a synthetic webhook to /api/webhooks/midtrans. -->
<!-- 3.2b BUILT 2026-09-06: core/orders/{payment-state,workers,repay}, /api/{webhooks/midtrans,orders/[n]/{status,repay}}, worker handlers, <OrderStatusWatcher>, commissions.accrue queue. e2e-smoked (settlement/dedup/idempotent/expire/A17-mismatch/workers/repay/retry). Remaining 3.2b: real Midtrans sandbox (dashboard notif URL + tunnel), DB integration tests. Then 3.2c (/lacak + manual postal fallback + i18n polish). -->
<!-- 3.2c BUILT 2026-09-06: findOrderForTracking → TrackedOrder DTO + normalizeOrderNumber, /lacak page + actions + <TrackForm> timeline, track.* i18n. Manual postal fallback was already in 3.2a. e2e-smoked. WEEK 3 PART 2 CODE-COMPLETE except: (1) real Midtrans sandbox wiring (dashboard notif URL + tunnel), (2) DB integration tests (*.integration.test.ts vitest split). Both carry to a follow-up. -->
<!-- REMAINING NON-CODE: Midtrans dashboard config (client/setup dep), cloudflared/ngrok tunnel for local webhook, then flip PAYMENT_PROVIDER off. -->
# Week 3 Part 2 — Checkout + Payment Spine

**Branch:** main · **Depends on:** Week 3 Part 1 (cart) — done, uncommitted
**Design doc:** `docs/ARCHITECTURE.md` → "Data flow — checkout (MVP)" + "Shadow paths"

## Goal

A guest shopper with a cart can enter a shipping address, pick a courier rate,
pay on Midtrans (sandbox), and land on an order confirmation page. Midtrans
webhook promotes the order to `paid`; a reconcile worker catches dropped
webhooks; a release-holds worker frees stock for abandoned payments. `/lacak`
lets a shopper check status later with order number + WhatsApp number.

This is the riskiest slice of the MVP: real money, async webhooks, stock race
conditions. The plan front-loads the failure-mode handling from
ARCHITECTURE.md's "Shadow paths" list.

## Scope

### In

1. **Stock reservation** — checkout increments `product_variants.reserved`;
   `payments.expires_at` is the hold deadline. No new table, no new column.
2. **Checkout page** (`/checkout`) — contact + address form, Biteship area
   autocomplete, courier rate selection, submit.
3. **`POST /api/checkout`** — thin adapter over `core` `createCheckout()`:
   revalidate cart prices/stock from DB, upsert customer by phone, create
   address + order + order_items (snapshot), reserve stock,
   `PaymentProvider.createCharge()` (Midtrans Snap), persist `payments` row.
4. **`GET /api/shipping/areas?q=`** and **`POST /api/shipping/rates`** — thin
   adapters over `getShippingProvider()`. Rates derives items server-side from
   the cart (client sends only `destinationAreaId`).
5. **`POST /api/webhooks/midtrans`** — `verifyWebhook` (SHA512 sig),
   `payment_events` insert with `dedupeKey` unique (drop duplicates), then
   `applyPaymentUpdate()` state machine. Always returns 200 to Midtrans.
6. **`applyPaymentUpdate()` state machine** (`core`) — shared by webhook +
   reconcile. `pending_payment → paid | cancelled` only. Idempotent: guarded on
   current order status. On `paid`: decrement `stock` and `reserved`, write
   `stock_movements` (`reason: 'sale'`), `order_event`, enqueue
   `notifications.deliver`. On `expired`/`failed`: release `reserved`,
   `order_event`, enqueue notification.
7. **`payments.reconcile` worker** — every 5 min, orders `pending_payment` with
   a payment older than 15 min → `provider.getStatus()` → `applyPaymentUpdate()`.
   The anti-silent-failure net. Handles: webhook never arrived; settle-after-expiry.
8. **`stock.release-holds` worker** — every 10 min, orders `pending_payment`
   whose payment `expires_at < now()` → release `reserved`, cancel order,
   `order_event`. Blind timeout; converges with reconcile via the status guard.
9. **Order confirmation page** (`/pesanan/[orderNumber]`) — public by order
   number (Midtrans `finish` callback lands here). Status, items, totals,
   shipping selection. "Bayar sekarang" re-link to `payments.snap_redirect_url`
   while `pending_payment`.
10. **`/lacak`** — form (order number + WA phone) → server action matches
    `order_number` AND normalized `customers.phone` → status timeline from
    `order_events` + shipment tracking if present.
11. **i18n** — `checkout.*`, `order.*`, `track.*` namespaces (id + en).
12. **Tests** (`packages/core`) — `applyPaymentUpdate` (settle / expire /
    idempotent re-apply / settle-after-expire), stock reserve/release/commit,
    `MidtransProvider.verifyWebhook` (known-good + tampered sig), order-total math.

### Out (with reason)

- **Customer accounts / login** → Phase 2. MVP checkout is guest-only.
- **Guest-cart merge on login** → Phase 2, follows customer accounts. The Week 1
  TODO line stays unchecked; nothing to merge into without a customer session.
- **Voucher application at checkout** → Week 4 (`simple voucher CRUD`). Schema
  supports it; checkout stays single-path for now.
- **Tour-leader referral capture at checkout** → Week 5 differentiator. No
  `tourLeaderId` set by MVP checkout; `applyPaymentUpdate` leaves the commission
  hook as a `// TODO(week5)` comment, no `commissions.accrue` queue yet.
- **Biteship order creation / pickup request** → Phase 2. MVP stores the rate
  choice only; Week 4 adds manual resi entry.
- **Refund UI / flow** → Phase 2.
- **Admin order management** (list, status transitions) → Week 4.
- **Tax / PPN, multi-currency** → not in MVP.

## What already exists (reuse, do not rebuild)

- `PaymentProvider` + `MidtransProvider` (`core/payment`) — `createCharge`,
  `verifyWebhook`, `getStatus`, `refund`. Snap v1 + SHA512 sig already coded.
- `ShippingProvider` + `BiteshipProvider` (`core/shipping`) — `searchAreas`,
  `getRates`, `createShipment`, `getTracking`.
- `enqueue` / `QUEUES` / pg-boss worker scaffold (`core/jobs`,
  `apps/lombok-exotic/src/worker/index.ts`) — reconcile + release-holds queues
  already declared + scheduled; handlers are stubs to fill.
- `orderNumber()` (`core/ids`) — `LEX-260906-4821`.
- `money.ts` — `formatIdr`, `discountAmount`, `sumLines`, `assertIdr`.
- Cart layer from Part 1 — `lib/cart.ts` (`getCartView`, `getCartViewByToken`),
  `keranjang/actions.ts`. Checkout reads the cart by the `le_cart` cookie token.
- Schema is complete: `carts`, `cart_items`, `orders`, `order_items`,
  `order_events`, `payments`, `payment_events`, `shipments`, `customers`,
  `addresses`, `stock_movements`, `notifications`. **No migration needed.**
- `settings` table seeded: `contact.whatsapp`, `shipping.origin_area_id` (empty),
  `checkout.payment_expiry_minutes` (60).
- `sendEmail` + `waMeLink` (`core/email`) — notification delivery lands in Week 4;
  this plan only enqueues.

## Architecture decisions

### D1. Domain logic in `packages/core`, route handlers are thin
`core/src/orders/` — `checkout.ts`, `payment-state.ts`, `stock.ts`,
`lookup.ts`. Matches the existing `payment/` `shipping/` `jobs/` pattern and
makes the money-critical logic unit-testable (the app has no test runner).
Route handlers parse the request, call core, return JSON.

### D2. Stock reservation at checkout, not cart-add
Cart holds nothing. `createCheckout()` reserves inside a transaction:
`UPDATE product_variants SET reserved = reserved + $qty WHERE id = $id AND stock - reserved >= $qty` — 0 rows updated ⇒ oversold ⇒ abort the whole checkout.
Matches ARCHITECTURE.md.

### D3. Transaction boundaries around the Midtrans call
Can't hold a DB transaction across an HTTP call. Sequence:
1. **txn A** — upsert customer, insert address, insert order (`pending_payment`)
   + order_items, reserve stock, `order_event`. Commit.
2. `provider.createCharge()` (external).
3. **txn B** — insert `payments` row (snap token, redirect url, `expires_at`).
4. On step 2/3 failure → **txn C** — release `reserved`, set order `cancelled`,
   `order_event 'cancelled'` (note: charge failed). Return a 502-ish error to
   the client.
Orphan risk (order created, charge never attempted) is bounded: `stock.release-holds`
will not touch it (no `expires_at`), so add: release-holds also cancels
`pending_payment` orders with **no payment row** older than 30 min.

### D4. Snap redirect, not Snap.js popup
`createCheckout()` returns `{ orderNumber, redirectUrl }`; client does
`window.location.href = redirectUrl`. No client key in the bundle, no external
script (CSP-friendly). Midtrans `finish` callback → `/{locale}/pesanan/{orderNumber}`.

### D5. Store origin resolution
`shippingOrigin()` helper: `settings['shipping.origin_area_id']` →
`process.env.STORE_ORIGIN_AREA_ID` → **seeded fallback** (a real Mataram/Senggigi
Biteship area id, hardcoded in seed + this plan, flagged as a client-dependency
to confirm). Without an origin, rates can't be quoted — the demo needs a working default.

### D6. Confirmation page is public by order number; `/lacak` needs number + phone
Order numbers carry a 4-digit random suffix and are not enumerable in bulk.
`/pesanan/{orderNumber}` shows order summary + payment CTA (must be reachable
from Midtrans' redirect, unauthenticated). `/lacak` gates the full event
timeline on `order_number` + normalized `customers.phone` match.

### D7. `payment_events` is the idempotency ledger
Every webhook hit inserted first (`dedupeKey` unique, `ON CONFLICT DO NOTHING`).
Conflict ⇒ replay ⇒ return 200 without reprocessing. Invalid signature ⇒ still
insert (`signature_valid = false`), return 200, do not process. `applyPaymentUpdate`
is also guarded on order status so a reconcile + webhook race is a no-op on the loser.

## File-by-file

> **Amended.** The review adds: `core/src/phone.ts`,
> `core/src/orders/{reconcile,release-holds,repay}.ts`,
> `app/api/orders/[orderNumber]/status/route.ts`,
> `app/api/orders/[orderNumber]/repay/route.ts`, and a `commissions.accrue`
> queue. See "Amendments folded into the plan" (A14-A23) for the authoritative
> delta and the revised D3.

### `packages/core`
- **new** `src/orders/stock.ts` — `reserveStock(tx, lines)`, `releaseStock(tx, lines)`,
  `commitSale(tx, lines, orderNumber)` (stock -= qty, reserved -= qty, insert
  `stock_movements`).
- **new** `src/orders/checkout.ts` — `createCheckout(input): Promise<CheckoutResult>`.
  `input`: cart token, contact {name, phone, email}, address fields,
  `shippingSelection` (the chosen RateOption), locale. Revalidates every line
  against the DB (price, active, weight > 0, stock), recomputes totals, never
  trusts the client amounts.
- **new** `src/orders/payment-state.ts` — `applyPaymentUpdate(verification): Promise<Result>`.
  Loads payment + order by `providerRef`, normalizes, transitions, side-effects.
- **new** `src/orders/lookup.ts` — `getOrderByNumber(orderNumber)`,
  `findOrderForTracking(orderNumber, phone)`.
- **new** `src/orders/index.ts` — barrel.
- **new** `src/orders/*.test.ts` — see test plan.
- **new** `src/payment/midtrans.test.ts` — `verifyWebhook`.
- **edit** `src/index.ts` — export `createCheckout`, `applyPaymentUpdate`,
  `getOrderByNumber`, `findOrderForTracking`, types.
- **edit** `src/db/seed.ts` — set `shipping.origin_area_id` to a real area id;
  optionally seed a demo `paid` order for the confirmation-page screenshot.

### `apps/lombok-exotic`
- **replace** `src/app/[locale]/checkout/page.tsx` — cart summary (server) +
  `<CheckoutForm>` (client). Redirect to `/keranjang` if cart empty.
- **new** `src/components/checkout-form.tsx` — client. Contact + address fields
  (zod-mirrored), Biteship area autocomplete (debounced `GET /api/shipping/areas`),
  "hitung ongkir" → `POST /api/shipping/rates` → radio list of `RateOption`,
  submit → `POST /api/checkout` → `window.location = redirectUrl`.
- **new** `src/app/api/checkout/route.ts` — `POST`. Zod parse → `createCheckout` →
  `{ orderNumber, redirectUrl }` or error. `dynamic = 'force-dynamic'`.
- **new** `src/app/api/shipping/areas/route.ts` — `GET`. `q` (min 3 chars) →
  `searchAreas`. Cache-Control short.
- **new** `src/app/api/shipping/rates/route.ts` — `POST`. `{ destinationAreaId }`;
  items from the cart cookie server-side. → `getRates`.
- **new** `src/app/api/webhooks/midtrans/route.ts` — `POST`. Raw body → verify →
  insert `payment_events` → `applyPaymentUpdate`. Optional source-IP allowlist
  from `MIDTRANS_WEBHOOK_ALLOWLIST`. Always 200 (except 400 on unparseable body).
- **new** `src/app/[locale]/pesanan/[orderNumber]/page.tsx` — confirmation/status.
  `generateMetadata` `robots: noindex`.
- **replace** `src/app/[locale]/lacak/page.tsx` — `<TrackForm>` client + result.
- **new** `src/app/[locale]/lacak/actions.ts` — `lookupOrderAction`.
- **edit** `src/worker/index.ts` — implement `paymentsReconcile` +
  `stockReleaseHolds` handlers (call core).
- **new** messages: `checkout.*`, `order.*`, `track.*` in `messages/{id,en}.json`.
- **edit** `src/app/[locale]/keranjang` CTA already points at `/checkout` — no change.

## Failure modes (from ARCHITECTURE.md "Shadow paths")

| Failure | Handling | Tested by |
|---|---|---|
| Webhook never arrives | `payments.reconcile` polls `getStatus` after 15 min | `payment-state.test.ts` (reconcile path) |
| Webhook arrives twice / out of order | `payment_events.dedupeKey` unique + order-status guard | `payment-state.test.ts` (idempotent re-apply) |
| Payment settles after expiry | reconcile promotes to `paid`, un-expires | `payment-state.test.ts` (settle-after-expire) |
| Stock sold out between add-to-cart and pay | `reserveStock` 0-rows ⇒ checkout aborts, nothing charged | `stock.test.ts` + `checkout.test.ts` |
| Zero-weight variant | zod `weightGrams > 0` in `createCheckout` before Biteship | `checkout.test.ts` |
| Midtrans `createCharge` fails | txn C releases reservation, cancels order | `checkout.test.ts` (mock provider throws) |
| Order created, charge never attempted (crash between txn A and step 2) | release-holds cancels payment-less `pending_payment` orders > 30 min | `stock.test.ts` |
| Invalid webhook signature | store `signature_valid=false`, 200, no processing | webhook route (manual) + `midtrans.test.ts` |
| Reconcile + webhook race | both call `applyPaymentUpdate`; status guard makes the loser a no-op | `payment-state.test.ts` |

## Test plan

`packages/core` (vitest, already wired):
- `orders/stock.test.ts` — reserve success; reserve fails at `stock - reserved < qty`;
  release restores; `commitSale` writes movements + decrements both counters.
- `orders/payment-state.test.ts` — `settlement` promotes `pending_payment→paid`
  + side-effects fire once; re-apply is a no-op; `expire` cancels + releases;
  `settlement` after `expire` still promotes; unknown `providerRef` is a safe no-op.
- `orders/checkout.test.ts` — happy path builds order + items + reservation +
  payment; price mismatch (cart stale) recomputes from DB; empty cart rejects;
  weight-0 line rejects; provider-throws path releases + cancels.
- `payment/midtrans.test.ts` — `verifyWebhook` accepts a hand-computed SHA512
  sig, rejects a tampered `gross_amount`, normalizes `settlement`/`expire`/`deny`.

Manual (dev DB + sandbox keys):
- Full checkout → Midtrans sandbox Snap → pay → confirmation flips to `paid`.
- Simulate webhook with `curl` (valid + duplicate + bad-sig payloads).
- Let a payment expire → release-holds frees `reserved`, order `cancelled`.
- `/lacak` with correct + wrong phone.

## Proposed phasing (3 landable pieces)

- **3.2a — checkout to payment (happy path).** `core/orders/{stock,checkout}.ts`
  + `/api/checkout` + `/api/shipping/*` + `<CheckoutForm>` + confirmation page
  (read-only) + core tests for stock/checkout. Ship when a sandbox payment
  completes and the order shows `pending_payment`.
- **3.2b — the money-safety net.** `payment-state.ts` + `/api/webhooks/midtrans`
  + both workers + `payment-state` / `midtrans` tests. Ship when a webhook flips
  an order to `paid` and reconcile catches a suppressed webhook.
- **3.2c — lookup + polish.** `/lacak` + `lookup.ts` + confirmation-page payment
  CTA + i18n pass + empty/error states. Ship when `/lacak` returns a timeline.

## Open questions (for review)

1. **STORE_ORIGIN_AREA_ID** — need a real Biteship area id for Senggigi/Mataram
   for the demo. Hardcode a plausible one now + flag for client confirmation, or
   block on the client? (Recommend: hardcode + flag.)
2. **Phasing** — land 3.2a/b/c as three commits/PRs, or one Week-3-Part-2 commit?
3. **Confirmation-page protection** — public by order number enough, or also
   require `?wa=` last-4? (Recommend: public, it must work from Midtrans redirect.)
4. **Seed a demo paid order** for pitch screenshots, or keep seed clean?
5. **`/lacak` abuse** — any rate limiting for MVP, or accept the risk (order
   number + phone is already two factors)?

---

# GSTACK REVIEW REPORT

_/autoplan · 2026-09-06 · SELECTIVE EXPANSION · Codex unavailable (not installed) → `[subagent-only]`_

## Amendments folded into the plan (auto-approved)

These are now part of the plan above — implement them:

**A1 (from CEO-2 / ENG) — settle-after-expire must not silently oversell.**
When `applyPaymentUpdate` promotes a `cancelled`/expired order back to `paid`
(payment settled after the hold was released), it MUST re-check stock. If the
freed units are gone, still mark `paid` (the shopper paid) but set an
`order_event` + enqueue an admin notification flagged `oversold_needs_restock` —
never silently decrement into negative availability.

**A2 (ENG-1) — race-safe transition.** The status flip is a single conditional
statement: `UPDATE orders SET status='paid', paid_at=now() WHERE id=$1 AND status='pending_payment' RETURNING id`.
Side-effects (stock commit, order_event, notification outbox row) fire only when
a row is returned. Same pattern for `→ cancelled`. This replaces the
read-then-write guard and closes the webhook-vs-reconcile race.

**A3 (ENG-2) — notification via the outbox, in-transaction.**
`applyPaymentUpdate` INSERTs the `notifications` row (channel `email` +
`whatsapp_link`) inside the same transaction as the status flip. The worker
delivers separately (Week 4). A crash after commit never loses the notification
because the row is already durable. Do NOT `enqueue()` the notification from
inside `applyPaymentUpdate` as the sole delivery trigger.

**A4 (ENG-3) — re-quote shipping server-side.** `createCheckout` does NOT trust
`shippingSelection.priceIdr` from the client. It recomputes cart weight, calls
`getRates` again, matches the chosen `courierCompany + courierType`, and uses the
fresh price. Rate mismatch > small tolerance → return an error so the shopper
re-picks.

**A5 (ENG-4) — checkout idempotency without a migration.** If a `pending_payment`
order for this cart token exists and was created < 2 min ago with a live payment,
`createCheckout` returns that order's existing `{ orderNumber, redirectUrl }`
instead of creating a second order + charge.

**A6 (ENG-7) — `applyPaymentUpdate` upserts the payment row.** If txn B failed
(order + Midtrans charge exist, local `payments` row does not), the webhook /
reconcile path creates the `payments` row from the verification data keyed on
`providerRef`. Add tests: "txn B fails" and "payment row missing → created".

**A7 (ENG-9) — payment expiry reflects VA reality.** Bump the seeded
`checkout.payment_expiry_minutes` from 60 to **1440** (24 h). Virtual-account
transfer is the dominant Indonesian method and the shopper often pays hours
later; a 60-minute hold cancels real orders. `stock.release-holds` keys off
`payments.expires_at` (unchanged).

**A8 (ENG-5) — bound the worker batches.** `payments.reconcile` and
`stock.release-holds` process at most 20 orders per run.

**A9 (CEO-1) — prerequisite section added.** Before 3.2b can be tested end to
end: configure the Midtrans sandbox dashboard (Payment Notification URL =
`{tunnel}/api/webhooks/midtrans`, Finish Redirect URL =
`{app}/id/pesanan/`), and run a local tunnel (cloudflared / ngrok) so Midtrans
can reach the dev webhook. `curl` payloads unblock webhook work before the
tunnel exists.

**A10 (CEO-D2 / DESIGN-4) — manual postal-code fallback for shipping.** When
Biteship area search returns nothing (rural addresses, API hiccup), the form
offers a manual postal-code field that feeds `POST /api/shipping/rates` via
`destinationPostalCode` instead of `destinationAreaId`. ~15 lines, closes a
dead-end.

**A11 (DESIGN-2) — double-submit guard on the pay button** (disable + spinner +
full-screen "menyiapkan pembayaran…" the instant it's clicked; API also dedupes
via A5).

**A12 (DESIGN-3) — confirmation-page "just paid, still pending" state.** Copy is
"Menunggu konfirmasi pembayaran (biasanya < 1 menit)" with a "Cek status" button
(re-fetch) — not a scary "Belum dibayar". Move this + A6 into phase **3.2b**
(they're part of "payment actually works"), not 3.2c.

**A13 (DESIGN-1) — mobile form basics.** `inputmode="tel"` / `"numeric"`,
16px+ inputs, 44px tap targets on the rate radios, single-page (no wizard).
Clear `shippingSelection` + the rate list on ANY address-field change; block
submit until a rate for the current address is chosen (D5). Area options render
`name — district, city, province` (kecamatan names collide).

**A14 (E4, blocker) — Midtrans line-item sum.** `createCheckout` builds the
`items` array passed to `createCharge` as: every cart line **plus**
`{ id:'shipping', name:'Ongkir <courier>', price: shippingIdr, quantity:1 }`
(plus a negative `{ id:'discount', price: -discountIdr }` line when vouchers land).
Midtrans rejects any charge where `gross_amount ≠ Σ(item_details.price × qty)` —
without this the first sandbox call fails.

**A15 (D1, critical) — convert the cart.** In `createCheckout` txn A, set
`carts.status = 'converted'` for the cart token. `/checkout` redirects to the
order page (or `/keranjang`) if the token's cart is already `converted`, so the
browser back-button after redirect can't re-submit. The header cart badge reads
0 after conversion (cart lookup already filters `status = 'active'`).

**A16 (E3, critical — supersedes the blind-timeout half of A1) — no worker
cancels without asking the provider.** `stock.release-holds` and
`payments.reconcile` both call one core function `settleOrExpireOrder(order)`
that ALWAYS calls `provider.getStatus()` first: settled → run the paid
transition (even from `cancelled`, with the A1 stock re-check); genuinely
expired/failed → cancel + release. release-holds only chooses *which* orders to
check (payment `expires_at` passed, or payment-less > 30 min); it never sets
`cancelled` on its own. This closes the release-holds-wins-then-settlement race.

**A17 (E5) — verify the paid amount.** On a settlement, `applyPaymentUpdate`
asserts the provider's `gross_amount` equals `payments.amountIdr`. Mismatch →
do not promote; write an `order_event` + admin notification `payment_amount_mismatch`.

**A18 (E6) — phone normalizer in core.** New `core/src/phone.ts`
`normalizeMsisdn(raw): string` → canonical `62…` digits (handles `08…`, `+62…`,
`62…`, spaces, dashes). Applied at customer upsert (so the `customers.phone`
unique constraint actually dedupes) and at `/lacak` lookup. Unit-tested. Replaces
the app-only `toWaDigits` in `lib/validators.ts` (re-export from core for the WA
links).

**A19 (C4) — pay-after-expiry path.** Confirmation page, while the order is
`pending_payment` or `cancelled`-but-recent: a "Buat pembayaran baru" action →
`POST /api/orders/[orderNumber]/repay` → new `createCharge` with a suffixed
reference (`LEX-…-r2`), new `payments` row, fresh `redirectUrl`; re-reserves
stock if it was released (abort with a clear message if sold out). Cap retries at
3. The stale `snap_redirect_url` link is removed once expired.

**A20 (C5 — reverses plan decision D6) — confirmation page shows minimal data
publicly.** `/pesanan/[orderNumber]` with no `?wa=` param: order number, status,
grand total, and the pay / repay CTA only. Name, phone, address, and line items
render only when `?wa=<last 4 of the phone>` matches (same check `/lacak` uses).
Order numbers carry a known date + 4 digits (~10⁴/day) — treat them as
low-entropy. `/lacak` gets a trivial per-IP attempt counter.

**A21 (C2 — resolves audit #4) — declare `commissions.accrue` now.** Add
`QUEUES.commissionsAccrue` and a stub worker handler. `applyPaymentUpdate`'s paid
transition does `if (order.tourLeaderId) enqueue(QUEUES.commissionsAccrue, {orderId}, {singletonKey})`
— a guarded no-op today (no MVP checkout sets `tourLeaderId`). Week 5 populates
the column + fills the handler without reopening the audited state machine.

**A22 (E8) — worker selection logic in core.** `core/src/orders/reconcile.ts`
(`findStuckOrders()`) and `release-holds.ts` (`findExpiredHolds()`,
`findOrphanedOrders()`) return candidate lists; the worker handlers iterate and
call `settleOrExpireOrder`. Selection queries are vitest-tested.

**A23 (E9) — dedupe notification enqueues.** Every `enqueue()` for an
order-scoped notification passes `{ singletonKey: \`<template>:<orderId>\` }`.

### Revised D3 — transaction boundaries (replaces the plan's D3)

1. **txn A** — `SELECT … FOR UPDATE` the `carts` row; abort if already
   `converted`. Upsert customer (normalized phone), insert address, insert order
   (`pending_payment`) + order_items, `reserveStock` (atomic conditional
   `UPDATE`), set `carts.status='converted'`, `order_event`. Commit.
   (Idempotency: if a `pending_payment` order for this cart token exists < 2 min
   old with a live payment, skip A-D and return its `{orderNumber, redirectUrl}`.)
2. `getRates` server-side, match chosen courier/service, use the fresh price;
   build `items` = lines + shipping line (A14).
3. `provider.createCharge()`.
4. **txn B** — insert `payments` row (snap token, redirect url, `expires_at` =
   now + 24 h).
5. Failure at 2-4 → **txn C** — `releaseStock`, order `cancelled`, `order_event`.
   Return a retryable error.
6. Every state transition anywhere is the conditional form
   `UPDATE orders SET status=$new, … WHERE id=$1 AND status=$expected RETURNING id`;
   side-effects (stock commit, `order_event`, `notifications` outbox row) run in
   the SAME transaction and only when a row is returned.

## Decision Audit Trail

| # | Phase | Decision | Class | Principle | Rationale | Rejected |
|---|-------|----------|-------|-----------|-----------|----------|
| 1 | CEO | Mode = SELECTIVE EXPANSION | Mechanical | P2 | autoplan default for a scoped feature plan | FULL_REWRITE, MINIMAL |
| 2 | CEO | Defer voucher-at-checkout to Week 4 | **Taste** | P3/P6 | voucher touches order-total math + redemption ledger + per-customer limits — more than a code field; keeps the payment spine single-path | include a minimal code field now |
| 3 | CEO | Defer cart-merge-on-login to Phase 2 | Mechanical | P3 | no customer login in MVP — nothing to merge into | build a stub now |
| 4 | CEO | Commission accrual = TODO comment, no queue | Mechanical | P3 | Week 5 differentiator; no tourLeaderId capture in MVP checkout | add `commissions.accrue` queue now |
| 5 | CEO | Seed one demo `paid` order for screenshots | Mechanical | P2 | seed.ts already in blast radius, ~10 lines, helps the pitch | keep seed clean |
| 6 | CEO | A1: settle-after-expire re-checks stock, flags oversell | Mechanical | P1 | silent oversell is a correctness bug on money+inventory | "un-expire" as written |
| 7 | CEO | A9: Midtrans dashboard + tunnel prerequisite | Mechanical | P6 | unblocks realistic webhook testing | leave implicit |
| 8 | CEO | A10: manual postal-code shipping fallback | Mechanical | P1 | area search dead-ends on rural addresses | area-id only |
| 9 | Design | Single-page checkout, no wizard | Mechanical | P5 | mid-range Android shoppers abandon multi-step | wizard |
| 10 | Design | A11: double-submit guard + full-screen paying state | Mechanical | P1 | double-submit here = double order + double charge | rely on API dedupe alone |
| 11 | Design | A12: "just paid, still pending" copy + Cek status | Mechanical | P1 | webhook lag makes a paid shopper see "unpaid" and panic | show raw status |
| 12 | Design | A13: mobile input attrs + tap targets | Mechanical | P5 | table stakes for the actual user | desktop-first |
| 13 | Eng | A2: race-safe conditional UPDATE for transitions | Mechanical | P5 | webhook+reconcile concurrency; explicit + simple | mutex / advisory lock |
| 14 | Eng | A3: notification row written in-transaction (outbox) | Mechanical | P5 | the schema's outbox pattern; crash-safe | enqueue() as sole trigger |
| 15 | Eng | A4: re-quote shipping server-side | Mechanical | P1 | client-supplied shipping price is trust-on-input | signed rate token (more complex) |
| 16 | Eng | A5: no-migration checkout idempotency (recent cart-token order) | **Taste** | P5 | avoids a migration; 2-min window is a heuristic, not airtight | add `orders.idempotency_key` unique column (migration) |
| 17 | Eng | A6: applyPaymentUpdate upserts missing payment row | Mechanical | P1 | txn B failure otherwise strands the order | fail the webhook |
| 18 | Eng | A7: payment_expiry_minutes 60 → 1440 | Mechanical | P1 | VA transfers settle hours later; 60 min cancels real orders | method-aware expiry now (over-built) |
| 19 | Eng | A8: cap worker batches at 20/run | Mechanical | P3 | backlog shouldn't hang the worker on N HTTP calls | unbounded |
| 20 | Eng | Move A6 + A12 into phase 3.2b | Mechanical | P2 | they're part of "payment works", not polish | leave in 3.2c |
| 21 | Eng | ENG-6 (verify sig before event insert) | Mechanical | P3 | minor hardening; note as cleanup, not a blocker | block on it |
| 22 | Eng | A14: Midtrans shipping-as-line-item | Mechanical | P1 | `gross_amount ≠ Σ item_details` → first sandbox call 400s | leave items as cart lines only |
| 23 | Design/Eng | A15: mark cart `converted` in txn A | Mechanical | P1 | back-button after redirect otherwise re-submits the order | rely on UI guard only |
| 24 | Eng | A16: `settleOrExpireOrder` — workers always ask the provider before cancelling | Mechanical | P1 | blind release-holds can cancel a paid order silently | blind timeout (plan's original A1) |
| 25 | Eng | A17: assert paid amount == `payments.amountIdr` | Mechanical | P1 | valid-sig underpayment still flips to paid | trust status only |
| 26 | Eng | A18: `core/phone.ts normalizeMsisdn` + test | Mechanical | P5 | `customers.phone` unique won't dedupe `08…` vs `62…`; `/lacak` misses | keep app-only `toWaDigits` |
| 27 | Eng/Design | A19: pay-after-expiry "buat pembayaran baru" (new charge, suffixed ref, cap 3) | Mechanical | P1 | VA shopper paying late has no path; cart already gone | dead re-link to stale snap url |
| 28 | Eng | A20: confirmation page — PII behind `?wa=` match (reverses plan D6) | Mechanical | P1 | `LEX-YYMMDD-NNNN` ≈ 10⁴/day → scrapeable name/phone/address | fully public page |
| 29 | CEO/Eng | A21: declare `commissions.accrue` queue + guarded no-op enqueue now | Mechanical | P2 | ~5 lines now vs reopening the audited state machine in Week 5 | pure `// TODO` (audit #4, revised) |
| 30 | Eng | A22: worker selection queries → `core/orders/{reconcile,release-holds}.ts`, tested | Mechanical | P5 | selection logic is untestable in the app | leave in worker/index.ts |
| 31 | Eng | A23: `singletonKey` on order-scoped `enqueue()` | Mechanical | P3 | re-entry / manual reconcile double-sends admin email | accept duplicates |
| 32 | Eng | Move A6, A12, A19, D2-poll, D3, D4 into phase 3.2b | Mechanical | P2 | they are "payment works", not polish | leave in 3.2c |

## Failure Modes Registry (review additions to the plan's table)

| # | Failure | Handling | Status |
|---|---------|----------|--------|
| FM-A | Midtrans dashboard notification URL not set → webhook never fires | reconcile is the fallback; A9 documents setup | mitigated |
| FM-B | Biteship area search empty for a valid address → shopper stuck | A10 manual postal-code fallback | fixed by amendment |
| FM-C | Crash between txn A and createCharge → order + reserved stock, no payment | release-holds cancels payment-less `pending_payment` > 30 min | in plan (D3) |
| FM-D | Concurrent checkout for last unit | atomic `UPDATE ... WHERE stock-reserved>=qty` (0 rows → abort) | in plan (D2) |
| FM-E | Payment settles after release-holds cancelled the order + freed stock | A1: promote to paid, re-check stock, flag oversell for admin | fixed by amendment |
| FM-F | txn B fails → order+charge exist, no local payment row | A6: applyPaymentUpdate upserts the payment row | fixed by amendment |
| FM-G | Webhook + reconcile hit applyPaymentUpdate together | A2: conditional UPDATE, side-effects only on returned row | fixed by amendment |
| FM-H | Shopper changes cart in another tab after quoting shipping | A4: re-quote server-side in createCheckout | fixed by amendment |
| FM-I | VA shopper pays 3 h later, hold expired at 60 min | A7: 24 h expiry | fixed by amendment |
| FM-J | Webhook spam fills payment_events | verify sig first (ENG-6); Cloudflare + IP allowlist later | noted, low priority |
| FM-K | Back-button after Midtrans redirect → re-submit | A15: cart set `converted` in txn A; `/checkout` bounces converted carts | fixed by amendment |
| FM-L | `release-holds` cancels an order that just settled (webhook dropped) | A16: `settleOrExpireOrder` always calls `getStatus()` before cancelling | fixed by amendment (supersedes A1's blind half) |
| FM-M | First Midtrans sandbox call 400s (`gross_amount ≠ Σ item_details`) | A14: shipping sent as an `item_details` line | fixed by amendment |
| FM-N | Valid-signature underpayment flips order to `paid` | A17: assert `gross_amount == payments.amountIdr` on settle | fixed by amendment |
| FM-O | Same shopper → two `customers` rows (`08…` vs `62…`); `/lacak` misses | A18: `normalizeMsisdn` at upsert + lookup | fixed by amendment |
| FM-P | VA shopper pays after the 24 h hold, order + cart gone | A19: "buat pembayaran baru" → fresh charge + re-reserve | fixed by amendment |
| FM-Q | Confirmation page scraped for name/phone/address via guessed order numbers | A20: PII gated behind `?wa=` last-4 match | fixed by amendment |
| FM-R | Redirect from Midtrans beats the webhook → shopper sees "belum dibayar" | A12: client-polls `GET /api/orders/[n]/status` ~60s before showing the unpaid CTA | fixed by amendment |

## Dream-state delta

This plan delivers the transactional core (guest checkout → Midtrans → order
lifecycle with a webhook + reconcile safety net). Everything deferred —
customer accounts, saved addresses, vouchers, tour-leader commission accrual,
WhatsApp Cloud API, Biteship order creation + tracking, refunds, reseller
pricing — sits cleanly on top: the `core/orders` module, the `notifications`
outbox, and the `applyPaymentUpdate` state machine are the seams they attach to.
No deferred item forces a rework of what this plan builds.

## Independent voice — CLAUDE SUBAGENT (all lenses)

Verdict: **not ready to build from as written.** Architecture shape is right
(thin handlers over core, conditional-`UPDATE` reservation, `payment_events`
ledger, reconcile-as-safety-net), phasing sensible — but "front-loads failure
handling" doesn't hold: state-machine idempotency is asserted not designed;
release-holds can silently cancel a paid order; the happy path fails on the
first real Midtrans call (shipping not sent as a line item); shipping cost is
client-trusted; the cart is never converted so the back button mints duplicates.

Findings (severity): **critical** — C1 client-trusted shipping price · D1 cart
never `converted` → back-button double-orders · E1/E2 state-machine race +
partial-failure double-decrement · E3 release-holds cancels paid orders.
**high** — C4 no pay-after-expiry path (order + cart gone) · D2 redirect beats
webhook → "belum dibayar" after paying · D3 Biteship autocomplete failure blocks
checkout · D4 no double-submit guard · E4 Midtrans `gross_amount ≠ Σ item_details`
· E7 concurrent checkout on one cart token. **medium** — C2 no `commissions.accrue`
queue → Week 5 reopens the audited state machine · C3 could ship 3.2a on a
`FakePaymentProvider` · C5 confirmation page leaks PII (order numbers ~10⁴
guesses/day) · D5 stale rate after address edit · D6 checkout-error retry drains
stock · E5 paid-amount not verified against `payments.amountIdr` · E6 no phone
normalizer → customer dupes + `/lacak` misses · E8 worker selection logic in the
untestable app · E10 six missing test cases. **low** — D7 mobile input hygiene ·
E9 notification enqueue not deduped.

## CONSENSUS

```
DUAL VOICES — CONSENSUS  (primary = me, independent = subagent; Codex unavailable)
════════════════════════════════════════════════════════════════════════════════
  Finding                                    Primary  Subagent  Consensus
  ─────────────────────────────────────────  ───────  ────────  ─────────
  Race-safe transition (cond. UPDATE + txn)  A2       E1/E2     CONFIRMED (critical)
  Server-side shipping re-quote              A4       C1        CONFIRMED (critical)
  Cart marked `converted` at checkout        —        D1        CONFIRMED (critical) — primary MISSED
  release-holds must ask provider before     A1       E3        CONFIRMED (critical) — primary's A1
    cancelling (never blind)                                      covered only the reconcile-wins race
  Midtrans: shipping as an item_details line —        E4        CONFIRMED (high) — primary MISSED
  Redirect beats webhook → poll status       A12      D2        CONFIRMED (high) — subagent stronger
  Biteship autocomplete → manual postal      A10      D3        CONFIRMED (high)
  Double-submit guard (UI + API)             A11/A5   D4/E7     CONFIRMED (high)
  Pay-after-expiry path                      —        C4        CONFIRMED (high) — primary MISSED
  Checkout idempotency (no migration)        A5       D6/E7     CONFIRMED (taste on mechanism)
  Confirmation page PII / public scope       D6=public C5       DISAGREE → primary reverses: adopt C5
  Verify paid amount == payments.amountIdr   —        E5        CONFIRMED (medium) — primary MISSED
  Phone normalizer in core + test            ENG-8    E6        CONFIRMED (medium) — subagent stronger
  Worker selection logic → core, tested      partial  E8        CONFIRMED (medium)
  commissions.accrue queue now               #4=defer C2        DISAGREE → resolve: add queue + guarded
                                                                  no-op enqueue now (cheap, avoids reopen)
  Ship 3.2a on FakePaymentProvider           —        C3        TASTE → T3
  24h payment expiry (VA reality)            A7       (n/a)     primary-only, CONFIRMED
  Bound worker batches                       A8       (n/a)     primary-only, CONFIRMED
════════════════════════════════════════════════════════════════════════════════
Both voices agree the plan needs a revision pass before build. Architecture and
phasing survive; the D3 transaction-boundary section and the failure-mode table
are rewritten by the amendments below.
```

## FINAL APPROVAL GATE — items for the human

**Both voices agreed the original plan was not build-ready.** 23 amendments
(A1-A23) are now folded into the plan above — all mechanical correctness fixes
(race-safe transitions, provider-checked cancellation, Midtrans line-item sum,
cart conversion, PII scoping, phone normalization, pay-after-expiry, 24h expiry).
The architecture (thin handlers over `core`, conditional-`UPDATE` reservation,
`payment_events` ledger, reconcile-as-safety-net) and the 3-phase split survive
unchanged. With the amendments, the plan is build-ready. Three taste calls remain.

**Taste decision T3 — build 3.2a against a fake payment provider first?**
The subagent notes 3.2a (checkout → order) could ship against a trivial
`FakePaymentProvider` (the `PaymentProvider` interface already exists), wiring
real Midtrans sandbox only for 3.2b. Recommend **yes**: it decouples the
checkout-form + order-building work from Midtrans dashboard setup + the local
tunnel, and the fake exercises the exact same `createCharge` contract.
Completeness: fake-first = 8/10 (real integration proven in 3.2b anyway),
straight-to-sandbox = 8/10 (one less abstraction, but 3.2a is then blocked on
tunnel setup). Net: fake-first lands the visible UI progress sooner and the
Midtrans-specific risk lands isolated in 3.2b. Kind, not coverage.

**Taste decision T1 — voucher at checkout (Decision #2).**
Recommend DEFER to Week 4. The seeded `LOMBOK10` voucher exists and a demo of an
oleh-oleh shop arguably wants "diskon pembukaan" visible. But done right it
touches order-total math, the redemption ledger, and per-customer limits — not a
30-line field. Completeness: defer = 7/10 (payment spine complete, promo later),
include-now = 6/10 (adds a second path through money code before the first is
proven). Net: cleaner to land the payment spine first; a voucher field is a
half-day follow-up.

**Taste decision T2 — checkout idempotency mechanism (Decision #16).**
Recommend the no-migration approach (reuse a recent `pending_payment` order for
the same cart token, 2-min window). The airtight alternative is an
`orders.idempotency_key` unique column, which is a migration + a client-generated
key. Completeness: no-migration = 7/10 (covers the realistic double-submit /
retry within 2 min; a determined 3-min double-submit slips through), migration =
10/10. Net: the UI guard (A11) plus a 2-min server window covers every realistic
case for a demo; add the column if this ever handles real volume.

**No User Challenges.** Both the premise set and the plan structure hold up —
guest-only checkout, core-module architecture, 3-phase split, and every deferral
are sound. Nothing where the models think your stated direction should change.

