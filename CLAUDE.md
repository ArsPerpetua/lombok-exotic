# Lombok Exotic — platform

E-commerce + group pre-order platform. Monorepo: `packages/core` (client-generic
domain layer) + `apps/lombok-exotic` (Next.js 15 storefront + worker). A second
client (Sasaku) will be a copy of the app with a different `client.config.ts` and
zero changes to `core`.

## Commands

- `pnpm --filter @lombok-exotic/web dev` — storefront on :3000 (`/id`, `/en`)
- `pnpm --filter @lombok-exotic/web worker` — background jobs (pg-boss)
- `pnpm typecheck` / `pnpm lint` / `pnpm test` — run before every commit
- `pnpm db:migrate` / `pnpm db:seed` — local dev DB `lombok_exotic` (postgres/12345)
- Admin: `/admin/login` — `owner@lombokexotic.test` / `ChangeMe-Now-2026`

## Conventions

- Domain logic lives in `packages/core/src/**`; route handlers and server actions
  stay thin. Money is always integer IDR (`core/money.ts`).
- `core` uses extensionless relative imports + `moduleResolution: Bundler`. Do NOT
  add `.js` extensions.
- better-auth is pinned to `1.7.2` (not `^`). Bump deliberately.
- CI runs typecheck + lint + test on push (no `format:check`).

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
