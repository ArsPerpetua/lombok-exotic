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
- [ ] Brand assets: convert `assets/logo-*.pdf` to PNG/SVG at
      `apps/lombok-exotic/public/brand/`.

## MVP build plan (5 weeks)

### Week 1 — foundations
- [x] Monorepo scaffold: `packages/core` (schema, auth/rbac, payment, shipping,
      email, jobs, config) + `apps/lombok-exotic` (storefront + worker)
- [x] `pnpm install`, typecheck + lint + tests green, production build green
- [x] Initial migration generated (`packages/core/drizzle/0000_init.sql`)
- [x] Local dev DB: PostgreSQL 17 `lombok_exotic` (postgres/12345), migrated + seeded
      (7 products / 12 variants / owner login). App verified: `/id`, `/en`,
      `/api/health` (db:ok), catalog from DB, better-auth sign-in returns `role`.
- [ ] CI actually running on GitHub (push repo, add secrets)
- [ ] Provision **Neon** DB for staging/prod (local Postgres is dev-only), point
      `DATABASE_URL` at it, `pnpm db:migrate && db:seed`
- [ ] VPS: create firewall group (22 from admin IP, 80, 443), Nginx, certbot,
      PM2, `/etc/lombok-exotic/web.env`, deploy user + SSH key
- [ ] Cloudflare in front (proxied DNS, cache rules for `/_next/static`)
- [ ] Sentry (web + worker), UptimeRobot on `/api/health`
- [ ] First deploy via GitHub Actions

### Week 2 — catalog
- [ ] Category browse + filters + pagination, product detail with variant picker
- [ ] Image upload in admin (start with local disk or Cloudflare R2)
- [ ] Bundle rendering (price/stock derived from components)
- [ ] JSON-LD `Product`, sitemap, robots, canonical, OG per product
- [ ] Real EN/ID copy for static strings

### Week 3 — cart, checkout, payment
- [ ] Cart server actions (add/update/remove), cookie token, merge on login
- [ ] Stock reservation with TTL hold + `stock.release-holds` worker
- [ ] Checkout: address form + Biteship area lookup + rate selection
- [ ] `POST /api/checkout` → order + `PaymentProvider.createCharge` (Midtrans Snap)
- [ ] `POST /api/webhooks/midtrans`: signature verify, `payment_events` dedupe,
      order state machine, enqueue notifications
- [ ] `payments.reconcile` worker (poll stuck orders) — the silent-failure net
- [ ] Order confirmation page + `/lacak` order lookup (number + WA)

### Week 4 — admin
- [ ] `better-auth` login page, session in admin layout, `requireCapability`
- [ ] Product CMS (CRUD + variants + weight validation + images)
- [ ] Order management: list, detail, status transitions, `order_events` timeline
- [ ] Manual resi entry + shipment record
- [ ] Invoice PDF per order (react-pdf or a print route)
- [ ] `notifications.deliver` worker: Resend templates (received/paid/shipped) +
      wa.me deep-link buttons in admin
- [ ] Banner CMS, simple voucher CRUD
- [ ] Dashboard: revenue (day/week/month), order count, top products, low stock
- [ ] `audit_log` writes on every admin mutation

### Week 5 — differentiator + content + polish
- [ ] Group pre-order: admin queue, line items, quote → order, quote email + wa.me,
      status flow, assign-to-staff
- [ ] Tour-leader model surfaced read-only in admin (referral code + QR render)
- [ ] Homepage polish, brand story page, 2-3 seed SEO articles, product-story on PDP
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
