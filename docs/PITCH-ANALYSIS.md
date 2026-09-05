# Pitch Analysis — Lombok Exotic E-Commerce

Prepared for the Paralens Creative pitch. Feature triage, missing features,
MVP scope, technical risks, roadmap. Architecture is deliberately client-generic
so the same core serves a second client (Sasaku).

## Reframe

The feature list mixes three products: (1) an online store, (2) a B2B
group-order engine for tour agents, (3) a light operational backbone. Lombok
Exotic's revenue is **physical retail + tour-bus groups + tour-leader
commission**, not DTC. The website's jobs: pre-arrival catalog + group
pre-order, "ship home" for walk-in buyers, SEO/brand, and an owner-facing
operational view.

**What wins the pitch:** the group pre-order + tour-leader commission module.
Every agency can promise "full e-commerce"; almost none model the bus-group
business.

## Feature triage

`MVP` = in the demo · `MVP-lite` = minimal in demo, full later · `P2/P3` = phase ·
`Reconsider` = low fit for this model.

| Feature | Verdict |
|---|---|
| Customer database (WA as key) | MVP |
| Customer management (frequent-buyer views) | P2 |
| Customer account (login, history, addresses) | MVP-lite (guest checkout + order lookup in MVP) |
| Wishlist | Reconsider / P3 |
| Loyalty & repeat order | P2/P3 (reframe as agent pricing) |
| Admin dashboard | MVP |
| CMS admin (products, price, stock, media, promo, banner) | MVP |
| Order management + status flow | MVP |
| Inventory auto-decrement | MVP-lite (online only; POS reconcile = P2+) |
| Multi-role admin | MVP-lite (2 roles; 5-role matrix = P2) |
| Payment gateway (QRIS/VA/e-wallet/CC) | MVP (1 aggregator, sandbox; CC deferred) |
| Auto invoice | MVP |
| Auto notifications email/WA | MVP email; WA = MVP-lite (wa.me link), Cloud API = P2 |
| Shipping (ongkir/resi/tracking) | MVP ongkir; resi/tracking = MVP-lite |
| Promo management | MVP-lite (voucher + basic bundle; campaigns = P2) |
| Product variants (size/colour/motif/**weight**/price) | MVP — weight mandatory for Biteship |
| Blog & SEO CMS | SEO fundamentals = MVP; blog CMS = P2 |
| Sales report | MVP-lite (date-range basics; custom + export = P2) |
| Analytics | MVP via GA4/Umami embed |
| Abandoned cart | P2 |
| Export to Excel | P2 (CSV order export possible in MVP) |
| Multi-language | i18n EN/ID in MVP (foreign tourists in Senggigi) |
| Multi-currency | P2/P3 (display), P3 (charging) |
| Reseller/wholesale | P2 — but the data model ships in MVP |
| Backup & security | MVP — requirement, not a feature |

## Missing features (high fit for the bus-group model)

1. **Group pre-order** ("Pesanan Rombongan") — the differentiator. Built in MVP.
2. **Tour-leader / driver commission** — referral code + monthly payout report.
3. **Ship-from-store** for walk-in buyers (bridges physical → digital).
4. **Group visit scheduling** + cross-unit bundling (shop + cafe/resto + Bajang Bus).
5. **Hamper / package builder** ("Paket Oleh-Oleh Kustom", corporate gifting).
6. **WhatsApp-first** everywhere (order updates, click-to-chat, shareable catalog).
7. **Product provenance/story** (tenun motif, silver craft) — margin + SEO.
8. **QR-at-shelf → product page** (offline browsing → online action).
9. **Multi-outlet data model** from day one.
10. **Corporate receipt / faktur** for business travellers.
11. **Review capture** post-delivery via WA link.

## MVP (pitch demo — real vertical slice on the VPS)

Catalog + variants (weight/price/stock) + bundle · guest checkout · Midtrans Snap
(sandbox: QRIS/VA/e-wallet) · Biteship rate check + manual resi · order lifecycle
+ PDF invoice + email + wa.me · admin (2 roles, product CMS, orders, banner CMS,
simple voucher) · dashboard · **group pre-order (live)** · homepage + brand story +
HKI badge + 2-3 SEO articles + product-story · i18n EN/ID (IDR only) ·
non-functional: SEO baseline, daily DB backup, TLS, secure auth, audit log, Sentry,
payment tokenization.

Cut from MVP: wishlist, loyalty, full RBAC, abandoned cart, Excel export,
multi-currency, reseller UI, blog CMS UI, POS, custom-period reports, in-app
analytics.

## Technical risks — Next.js + Hostinger VPS + Biteship

- **VPS ops are yours:** PM2/systemd, Nginx, certbot, zero-downtime deploy, log
  rotation, OOM. `next build` on 2 vCPU can OOM → build in CI, static-render the
  catalog (ISR), Cloudflare in front.
- **DB:** on-VPS Postgres is a SPOF with backup discipline on you → Neon managed
  for MVP.
- **Deploys not atomic:** migrations before code, health check, symlink rollback.
- **Payment:** one aggregator (Midtrans). Production activation needs the
  client's legal entity (1-4 wks) → demo on sandbox. Webhook: verify signature,
  idempotency (dedupe key), reconciliation cron for missed webhooks (else:
  charged customer, stuck order — the classic silent failure).
- **WhatsApp:** no cheap instant official API. Cloud API needs Meta Business
  verification + approved templates. MVP = email + wa.me deep links; Cloud API in
  P2. Never use unofficial libraries on the client's number.
- **RBAC:** enforce server-side on every route/action/RSC fetch via one
  `authorize()` chokepoint; middleware is routing only. 2 roles in MVP.
- **Biteship:** rate accuracy needs accurate weight per variant (enforced in
  schema). Confirm courier pickup coverage from Senggigi. Idempotent tracking
  webhooks. Wrap behind `ShippingProvider`.
- **Reuse for Sasaku:** monorepo + shared core + per-client app/config, separate
  deploys. Not multi-tenant.

## Roadmap

| Phase | Scope | Why |
|---|---|---|
| **MVP (pitch)** | See MVP section above | Prove the stack + execution; land the differentiator live |
| **Phase 2** | Midtrans production + reconciliation + refunds · WhatsApp Cloud API · Biteship order/pickup/tracking automation · full RBAC · customer accounts · **reseller/agent portal** · **tour-leader commission** · ship-from-store · promo engine · blog CMS · reports + export · abandoned cart · GA4 · staging + CI/CD | Launch-ready; open the real B2B revenue channel |
| **Phase 3** | Loyalty · multi-currency + intl shipping · group visit scheduling + cross-unit bundling · POS / unified inventory · multi-outlet · corporate hamper portal + faktur · multi-tenant platform-ization · QR-at-shelf · marketplace sync · HA infra | Scale + monetise the tourism ecosystem |
