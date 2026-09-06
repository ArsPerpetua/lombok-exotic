# TODOS

Living list. Every deferred decision lives here — vague intentions don't count.

## Open decisions (need input — not blocking scaffold)

- [ ] **VPS sharing.** Is KVM 2 (`srv1921909`, 31.97.48.99) already hosting
      SIKAPKI NTB (`sikapki-ntb.tech`)? If yes, plan resource split + separate
      Nginx server blocks; reinforces Neon for the DB.
- [ ] **Domain.** No Lombok Exotic domain in the Hostinger account yet. Register
      `lombokexotic.com` / `.co.id` / `.id`. Demo can run on a subdomain.
- [ ] **DB host.** Recommended: Neon managed for MVP. Alternative: Postgres on the
      KVM 2 (8 GB RAM can take it) — only if data residency / cost demands it.
      If on-VPS: automated `pg_dump` → Backblaze/S3 daily + weekly restore test.
- [ ] **Payment provider.** Midtrans (assumed). Confirm before wiring webhooks.
- [ ] **Pitch date / timeline.** Assumed ~4-5 weeks. Confirm to lock the build plan.

## Client dependencies (critical path — client + Paralens own these)

- [ ] Midtrans **production** onboarding: PT docs, NPWP, bank account, site review
      (1-4 weeks). Demo runs on sandbox keys.
- [ ] Meta Business verification + decide which WhatsApp number moves to Cloud API
      (that number leaves the normal WhatsApp app). 1-2 weeks. Email works day 1.
- [ ] Product data: ~20-30 SKUs with real photos + **accurate weight/dimensions
      per variant** (Paralens).
- [ ] Biteship: confirm which couriers actually pick up from Senggigi/Mataram and
      typical lead times; set `STORE_ORIGIN_AREA_ID`.
- [x] Brand assets: `assets/logo-*.pdf` → `public/brand/logo-{light,dark}.{svg,png}`
      (`assets/convert-logos.py`, pymupdf+PIL). Wired into header (light), hero + footer
      (dark, silver linework recoloured from the light source so PNG stays transparent).

## MVP build plan (5 weeks)

### Week 1 — foundations
- [x] Monorepo scaffold: `packages/core` (schema, auth/rbac, payment, shipping,
      email, jobs, config) + `apps/lombok-exotic` (storefront + worker)
- [x] `pnpm install`, typecheck + lint + tests green, production build green
- [x] Initial migration generated (`packages/core/drizzle/0000_init.sql`)
- [x] Local dev DB: PostgreSQL 17 `lombok_exotic` (postgres/12345), migrated + seeded
      (7 products / 12 variants / owner login). App verified: `/id`, `/en`,
      `/api/health` (db:ok), catalog from DB, better-auth sign-in returns `role`.
- [ ] Push repo to GitHub (`ArsPerpetua/lombok-exotic`) — CI workflow runs on push
      (approved 2026-09-06; needs empty repo created + auth as ArsPerpetua)

**Deploy/infra DEFERRED (2026-09-06):** client's boss is buying a *separate*
dedicated VPS for Lombok Exotic. The existing KVM 2 (`srv1921909`, 31.97.48.99)
is already running 3 unrelated apps (SIKAPKI NTB, "Lombok Paradise Tours" on
`lombok.sikapki-ntb.tech`, "Cinta Holidays" on `cinta.sikapki-ntb.tech`) — do
NOT deploy here, and `lombok.sikapki-ntb.tech` is taken. Redo the items below
against the new box when it lands. Neon still the plan for the DB. Focus until
then = feature build (Weeks 2-5).
- [ ] Provision **Neon** DB for staging/prod (local Postgres is dev-only), point
      `DATABASE_URL` at it, `pnpm db:migrate && db:seed`
- [ ] New VPS: firewall group (22 from admin IP, 80, 443), Nginx, certbot,
      systemd units (match existing box's pattern — no PM2), env file, deploy user + SSH key
- [ ] Pick + point a demo subdomain (own domain, or a fresh `*.sikapki-ntb.tech` — NOT `lombok.`)
- [ ] Cloudflare in front (proxied DNS, cache rules for `/_next/static`)
- [ ] Sentry (web + worker), UptimeRobot on `/api/health`
- [ ] First deploy via GitHub Actions (verify standalone boots on Node 20 — new box likely matches)

### Week 2 — catalog
- [x] Category browse + filters + pagination, product detail with variant picker
      (`lib/catalog.ts`: `getCategories` / `getCatalogPage` / `getProductDetail`;
      server-rendered filter+sort chips via `?kategori/urut/hal`; client
      `ProductDetail` variant picker + gallery + WhatsApp order deep-link)
- [x] Image upload in admin — `POST /api/admin/upload` (local disk `public/uploads/products/`,
      gitignored; needs a volume in prod / swap for R2), wired into the Product CMS image manager.
- [x] Bundle rendering (price/stock derived from components) — `bundleBreakdown()`:
      component list, individual-price total, savings vs bundle price, `maxSets` buildable
- [x] JSON-LD `Product` + canonical + OG per product; `sitemap.ts` (static + all product
      URLs, both locales) + `robots.ts`. (Catalog/category-page JSON-LD can come later.)
- [~] `catalog.*` / `product.*` message namespaces added (id + en). Broader "real copy"
      pass for all static strings still pending.
- [x] Brand logo wired: `SiteHeader` (light), homepage hero + `SiteFooter` (dark).
      Text wordmark/tagline lines replaced by the logo image (logo already contains both).
- [x] Homepage rebuilt (benchmarked vs omiyago.com, hero kept). New sections:
      trust strip, Belanja per Kategori (`getCategories`), Produk Pilihan (real cards
      + price + bundle badge + hover), Kenapa Lombok Exotic (dark, 3 Lombok-specific
      differentiators), Pesanan Rombongan band (the differentiator omiyago lacks),
      brand-story + latest-article teaser (`lib/content.ts` `getLatestArticles`),
      WhatsApp contact band. `home.*` i18n expanded (id + en). Product photos still
      pending (client dep) — cards show grey placeholders.

### Week 3 — cart, checkout, payment
- [~] Cart server actions (add/update/remove/get), httpOnly cookie token (`le_cart`),
      guest carts persisted. **Done:** `lib/cart.ts` (getCartView / getOrCreateCartForMutation
      / getCartViewByToken / getCartCount), `keranjang/actions.ts`, real `/keranjang` page
      (`components/cart-page.tsx`), add-to-cart + qty stepper on PDP, header count badge
      (`components/cart-badge.tsx` + `lib/cart-events.ts`), stock-aware clamping, `catalog.ts`
      unchanged. Tested add/merge/update/remove/clamp via DB. **Still TODO: merge guest cart
      on login** (needs auth session in storefront — deferred with checkout).
**Week 3 Part 2 — checkout + payment spine.** Full plan reviewed + approved via
/autoplan: `docs/plans/week3-part2-checkout-payment.md` (23 amendments folded —
race-safe transitions, provider-checked cancellation, Midtrans line-item sum,
cart conversion, PII scoping, phone normalization, pay-after-expiry, 24h expiry,
FakePaymentProvider for 3.2a). Build order 3.2a → 3.2b → 3.2c.

- [~] **3.2a — checkout → order (happy path).** **Done:** `core/orders/{stock,checkout,lookup}.ts`,
      `core/phone.ts` (+7 tests), `core/settings.ts`, `core/shipping/origin.ts`,
      `FakePaymentProvider` + `FakeShippingProvider` (`*_PROVIDER=fake`, prod-ignored),
      `/api/checkout` + `/api/shipping/{areas,rates}`, `<CheckoutForm>` (contact + address +
      Biteship autocomplete + manual postal fallback + rate select + double-submit guard),
      real `/checkout` page, read-only `/pesanan/[orderNumber]` (PII behind `?wa=` last-4),
      `checkout.*`/`order.*` i18n, `midtrans.verifyWebhook` tests (+6). Cart → `converted` in
      txn A; server-side shipping re-quote (A4) verified rejecting a tampered price;
      2-min idempotency verified. e2e smoke through the fake providers: order + payment +
      reservation land correctly. **Still TODO: DB integration tests** (`stock.test.ts`
      concurrent reserve, `checkout.test.ts`) — needs a vitest-config split so
      `*.integration.test.ts` stays out of the no-DB CI run.
- [~] **3.2b — the money-safety net.** **Done:** `core/orders/payment-state.ts`
      (`applyPaymentUpdate` race-safe conditional-UPDATE state machine + `reconcilePendingOrder`
      + `expireStaleHold` (checks provider first, A16) + `cancelOrphanedOrder`),
      `core/orders/workers.ts` (`findStuckOrders`/`findExpiredHolds`/`findOrphanedOrders`),
      `core/orders/repay.ts` (A19, suffixed ref, re-reserve, cap 3), `commissions.accrue`
      queue declared (stub handler), `/api/webhooks/midtrans` (verify → `payment_events`
      dedupe → apply, always 200 except 500-on-throw), `/api/orders/[n]/{status,repay}`,
      worker handlers wired + scheduled (5min / 10min), confirmation-page
      `<OrderStatusWatcher>` (poll 90s + Cek status + repay + dev fake-pay button),
      `order.*` i18n. **e2e-smoked green:** settlement→paid+commitSale+movement+event+notif,
      duplicate webhook→`already_applied`, expire→cancel+release, amount mismatch→held
      (A17), worker selection, repay-from-cancelled→re-reserve, retry-webhook settles.
      **Still TODO: real Midtrans sandbox wiring** (dashboard notification URL + local
      tunnel — currently `PAYMENT_PROVIDER=fake`), **DB integration tests** (`payment-state`,
      `stock`, `checkout` — need the `*.integration.test.ts` vitest split).
- [x] **3.2c — lookup + polish.** `core/orders/lookup.ts` `findOrderForTracking`
      (clean `TrackedOrder` DTO: status + timeline from `order_events` + shipment
      tracking) + `normalizeOrderNumber`. `/lacak` real page + `lacak/actions.ts`
      (`lookupOrderAction`, two-factor: order number + WA last-4, crude per-IP
      limiter) + `components/track-form.tsx` (`useActionState`, vertical timeline).
      `track.*` i18n. Manual postal-code shipping fallback already shipped in 3.2a's
      `<CheckoutForm>` (`SHIPPING_PROVIDER=fake` handles `destinationPostalCode`).
      e2e-smoked: correct number+phone → timeline; wrong phone → "tidak ditemukan"; EN ok.
- [ ] Guest-cart merge on login → **Phase 2** (needs customer accounts; nothing
      to merge into in MVP). Moved out of Week 3.

### Week 4 — admin
- [x] `better-auth` login page (`/admin/login`), session gate in `app/admin/(app)/layout.tsx`
      (RBAC via `isAdminRole` + `isActive`; route-group split so `/admin/login` isn't in the
      redirect loop), `requireCapability` / `requireAdminActor`, sign-out, `/admin` excluded
      from i18n middleware. Login form is `signIn.email` (verify in a real browser — flaky in
      headless).
- [x] Product CMS — `core/catalog/admin.ts` (`listAdminProducts` / `getAdminProduct` /
      `saveProduct` / `saveVariant` / `deactivateVariant` (soft) / `attachImage` / `detachImage`,
      `slugify`, auto-recompute `priceFrom`). `/admin/produk` list + `/admin/produk/[id]` editor
      (`baru` = create → redirect to edit) with `<ProductFields>` / `<VariantEditor>` /
      `<ImageManager>`. Weight `> 0` enforced (client `required` + `weight_invalid` guard).
      `POST /api/admin/upload` (local disk, gitignored). e2e-smoked: create → variant →
      shows in storefront catalog + PDP; audit rows written.
- [x] Order management: list (status filter, search, pagination), detail (customer, address,
      items, payment, shipping, timeline), guarded state machine transitions, `order_events`.
- [x] Manual resi entry + shipment record (`recordShipment` → `shipments` + `shipment_events`,
      auto-transition to `shipped`; customer `/lacak` reflects it).
- [x] Invoice per order — print route `/admin/pesanan/[n]/invoice` under a sidebar-less
      `(print)` route group; `<PrintButton>` → `window.print()` (browser save-as-PDF).
      Store header + pembeli/kirim-to + line items + totals + paid/unpaid note. "Faktur"
      link on the order detail.
- [x] `notifications.deliver` worker — `core/notifications/` (`deliverPendingNotifications`
      polls the outbox, renders `templates.ts`, sends via Resend or **dry-run logs** when
      `RESEND_API_KEY` is a dev key / `NOTIFICATIONS_DRY_RUN=1`, retries failed ≤5×, marks
      sent/failed/skipped). Scheduled every 2 min. Templates: `order.{received,paid,shipped}`
      (customer) + `order.payment_amount_mismatch` / `order.oversold_needs_restock` /
      `group_preorder.new_internal` (admin, recipient `ADMIN_ALERT_EMAIL`). Shared
      `queueNotification(exec, …)` writes the outbox row in-txn (used by `payment-state.ts`,
      `admin.ts` recordShipment → `order.shipped`, the group-preorder form). **wa.me deep-link
      buttons** on the admin order detail (Konfirmasi pembayaran / Info pengiriman / Chat umum).
      e2e-smoked: paid → `order.paid` queued+delivered; resi → `order.shipped` queued+delivered;
      re-run deliver = 0 processed.
- [~] Voucher CRUD done — `core/marketing/admin.ts` (`listVouchers`/`getVoucher`/`saveVoucher`
      (code clash check)/`toggleVoucher`), `/admin/voucher` list + `/admin/voucher/[id]` form
      (`baru` = create), audit rows. `marketing:write` gate. **Banner CMS: core fns exist
      (`listBanners`/`saveBanner`/`deleteBanner`) but no admin UI + storefront doesn't render
      banners yet (static hero).** Voucher-at-checkout still deferred.
- [x] Dashboard: revenue (day/7d/30d), orders-by-status, recent orders, low stock, top products.
- [~] `audit_log` writes — done for orders (transition, shipment) + products (create/update,
      variant create/update/deactivate). Extend as more admin mutations land.

### Week 5 — differentiator + content + polish
- [x] Group pre-order admin — `core/groups/admin.ts` (`listGroupPreorders` /
      `getGroupPreorder` / `saveGroupItem` + auto-recompute estimate / `removeGroupItem` /
      `assignGroupPreorder` / `setGroupNotes` / `transitionGroupPreorder` guarded state
      machine `new→quoted→confirmed→paid→fulfilled` / `generateQuote`). `/admin/rombongan`
      queue + `/admin/rombongan/[id]` detail (`<GroupControls>`: line-item editor, quote
      button, status, assign-to-staff, internal notes, wa.me chat). `generateQuote` →
      real order (channel `group_preorder`, no shipping, `internal_note=group:<id>`),
      reserves stock for linked variants only, Midtrans/fake charge, links `quoteOrderId`,
      status → quoted, queues `group_preorder.quote` (agent). `applyPaymentUpdate` flips
      the group record → `paid` when the quote order settles. `group_preorder:write` gate,
      audit rows. e2e-smoked: storefront form → queue → add item → quote (order+payment) →
      pay webhook → group auto-`paid`.
- [x] Tour-leader model surfaced read-only in admin — `core/tour-leaders/admin.ts`
      (`listTourLeaders` with attributed order count / revenue / projected commission,
      `getTourLeader` detail: profile + bank + attributed orders + linked rombongan +
      commission-by-period, `referralUrl`). `/admin/tour-leader[/[id]]` read-only pages;
      QR (referral URL) rendered inline via `qrcode` + printable QR card at
      `/admin/tour-leader/[id]/qr` (sidebar-less `(print)` group + `<PrintButton>`).
      `tour_leader:read` gate. Nav: + Tour Leader. Seed: 3 tour leaders, stable codes
      (`TL-WAYAN01` / `TL-ARIANI1` / `TL-RUSDI01`). Auto commission accrual + payout
      report = Phase 2; `?ref=` capture = Phase 2.
- [~] Blog + brand story + product-story. Real `/artikel` list + `/artikel/[slug]` detail
      (`lib/content.ts`: `getPublishedArticles`/`getArticle`/`getAllArticleSlugs`/`getContentPage`/
      `renderMarkdown` via `marked`; `generateStaticParams`, JSON-LD `Article`, OG, canonical).
      `.article-body` typography in `globals.css`. `/tentang` rebuilt on `getContentPage('tentang')`
      + markdown + generateMetadata. Seed: `db/seed-content.ts` — 4 SEO articles (3 id + 1 en,
      staggered `publishedAt`, meta fields) + full brand-story `tentang` body; upserts on re-seed.
      `article.*` i18n (id+en). Sitemap includes article URLs. Product-story on PDP already shipped
      (`produk/[slug]` renders `product.story`). Homepage already rebuilt vs omiyago (Week 2) — its
      latest-articles links now resolve. Remaining: real product photos (client dep).
- [ ] SEO audit (Lighthouse), perf pass (ISR on catalog, image sizing)
- [ ] QA pass (`/qa`), accessibility basics, empty/error states
- [ ] Backup: Neon PITR confirmed OR `pg_dump` cron; document restore

## Phase 2 (post-deal → launch)

- [ ] Midtrans production cutover + reconciliation hardening + refund UI
- [ ] WhatsApp Cloud API channel behind the notification outbox + approved templates
- [ ] Biteship order creation + pickup request + tracking webhooks + auto status
- [ ] Full RBAC (5 roles) + permissions matrix UI
- [ ] Customer accounts: dashboard, saved addresses, order history/tracking
- [ ] Reseller / tour-agent portal: tiered pricing, MOQ, agent login
- [ ] Tour-leader commission: accrual on paid orders, monthly payout report, payout marking
- [ ] Ship-from-store flow for walk-in customers
- [ ] Promo engine: bundles builder, scheduled campaigns, voucher rules
- [ ] Blog CMS UI, full SEO tooling
- [ ] Reports: custom period + CSV/Excel export
- [ ] Abandoned cart capture + WA/email follow-up
- [ ] GA4 + on-site product analytics
- [ ] Staging environment, CI/CD hardening, offsite backup + tested restore

## Phase 3 (scale / expansion)

- [ ] Loyalty program (points/tiers), B2C + agent
- [ ] Multi-currency display + international shipping quote flow
- [ ] Group visit scheduling + cross-unit bundling (shop + cafe/resto + Bajang Bus)
- [ ] POS integration / unified online+offline inventory
- [ ] Multi-outlet / multi-origin
- [ ] Corporate / hamper B2B portal + faktur pajak
- [ ] Multi-tenant platform-ization (if 3+ clients)
- [ ] QR-at-shelf → product page with story + reviews
- [ ] Marketplace channel sync (Tokopedia / Shopee / TikTok Shop)
- [ ] HA infra: load balancer + multi-node, or move SSR to a platform

## Tech debt / watch

- **Deploy dry-run.** `deploy/deploy.sh` + `.github/workflows/deploy.yml` are
  written but never run against the real VPS. Do a full dry-run in week 1
  (standalone path, static/public copy, `drizzle-kit migrate` via pnpm, PM2
  reload, health check + rollback).
- `output: 'standalone'` is opt-in via `BUILD_STANDALONE=1` (Windows blocks the
  symlink trace step locally). CI sets it. Verify `.next/standalone/apps/lombok-exotic/server.js`
  boots on Linux with `pg`/`pg-boss` resolved.
- Core uses **extensionless relative imports** + `moduleResolution: Bundler`
  (works across tsc, webpack, turbopack, vitest, tsx, drizzle-kit). Do not add
  `.js` extensions — drizzle-kit's loader does not resolve them to `.ts`.
- Tailwind v4 + shadcn/ui: add components with the v4-compatible CLI when the
  admin UI starts.
- better-auth is **pinned to 1.7.2** (not `^`) — its schema changed across minors
  (1.7 added `account.issuer` + unique `(issuer, accountId)`). `additionalFields`
  (`role`, `isActive`) must match the `user` columns exactly. Bump deliberately:
  read the upgrade guide, regenerate the migration, re-test sign-in.
- `next lint` is deprecated in Next 16 — migrate the app to the ESLint CLI later.
- Root `app/layout.tsx` returns `children` only (next-intl pattern); `<html>` is
  in `app/[locale]/layout.tsx`.
