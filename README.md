# Lombok Exotic — E-Commerce Platform

Next.js storefront + admin for **Lombok Exotic** (oleh-oleh, cafe resto & Bajang Bus,
Senggigi). Built as a reusable platform: a second client (e.g. Sasaku) is a new
`apps/<client>` + config + theme, **zero changes to `@lombok-exotic/core`**.

Pitch context, feature triage, risk analysis and the full roadmap:
[`docs/PITCH-ANALYSIS.md`](docs/PITCH-ANALYSIS.md).

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, standalone output) + React 19 + TypeScript |
| DB | PostgreSQL (Neon managed for MVP) + Drizzle ORM |
| Auth | better-auth, DB sessions, capability-based RBAC |
| i18n | next-intl (`id` default, `en`) |
| Styling | Tailwind CSS v4 |
| Payments | Midtrans Snap (behind `PaymentProvider` interface) |
| Shipping | Biteship (behind `ShippingProvider` interface) |
| Email | Resend (transactional) |
| Jobs | pg-boss (Postgres-backed, no Redis) |
| Hosting | Hostinger VPS (KVM 2) + Nginx + PM2 + Cloudflare |

## Layout

```
apps/lombok-exotic/     Next.js app — storefront + admin + worker + client.config.ts
packages/core/          @lombok-exotic/core — db schema, auth/rbac, payment,
                        shipping, email, jobs, money, config
deploy/                 nginx / pm2 / deploy.sh for the VPS
docs/                   analysis, architecture, deploy notes
```

## Local setup

```bash
nvm use                       # Node 22
pnpm install
cp .env.example .env          # fill DATABASE_URL at minimum
pnpm db:generate              # generate SQL migrations from schema
pnpm db:migrate               # apply to your database
pnpm db:seed                  # demo catalog + owner login
pnpm dev                      # http://localhost:3000  (redirects to /id)
```

The app renders an **empty state** if the DB is unreachable, so `pnpm dev`
works before you provision a database.

### Background worker

```bash
pnpm --filter @lombok-exotic/web worker
```

## Scripts

| Command | What |
|---|---|
| `pnpm dev` | all apps in dev |
| `pnpm build` | production build (run in CI, not on the VPS) |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | checks |
| `pnpm db:generate` / `db:migrate` / `db:studio` / `db:seed` | database |

## Deploy

Tag `vX.Y.Z` (or run the **Deploy (VPS)** workflow) → GitHub Actions builds,
ships a tarball over SSH, runs migrations, swaps the release symlink, health-checks
`/api/health`, rolls back on failure. See [`deploy/README.md`](deploy/README.md).

## Status

Scaffold. MVP build plan (5 weeks) and open decisions in
[`docs/TODOS.md`](docs/TODOS.md).
