# Design System — Lombok Exotic

> Preview: `~/.gstack/projects/lombok-exotic-app/designs/design-system-20260908/preview.html`
> (published artifact: https://claude.ai/code/artifact/1cd76ee6-79d0-4627-a793-ffad467e37ef)

## Product Context
- **What this is:** E-commerce storefront for a Senggigi (West Lombok) souvenir
  business — oleh-oleh (tenun ikat, silver, tees, local food), plus a cafe/resto
  and the "Bajang Bus" tour bus. Ships nationwide. Has a group pre-order
  (rombongan) flow for tour groups.
- **Who it's for:** Domestic Indonesian shoppers and tour groups buying
  oleh-oleh; tour leaders coordinating group orders.
- **Space/industry:** Indonesian craft / artisan commerce. Peers: SukkhaCitta,
  Threads of Life, Noesa, Du Anyam.
- **Project type:** Marketing + transactional storefront (hybrid). Next.js 15,
  bilingual `id`/`en`, IDR only.

## Aesthetic Direction
- **Direction:** Organic/Natural × Editorial.
- **Decoration level:** Intentional — a real Sasak tenun ikat lattice motif as
  the brand signature (section dividers, hero base, footer band). Photography and
  the products carry the rest. No decorative blobs, gradients-as-accent, or
  icon-in-circle grids.
- **Mood:** Warm, crafted, place-proud. The site should feel like Lombok, not
  like a generic Indonesian shop or a hushed Western "quiet luxury" boutique.
- **Memorable thing:** "This is authentic Lombok." Every decision serves it —
  including naming the weaver on each textile product.
- **Reference sites:** sukkhacitta.com, threadsoflife.com, noesa.co.id, duanyam.com

## Typography
- **Display/Hero:** **Fraunces** (soft "old-style" serif, optical sizing, slight
  handmade wonk). Warm and characterful. Replaces Cinzel, which read
  wedding-invite/law-firm and never actually loaded.
- **Body / UI / Labels:** **Plus Jakarta Sans** — clean, very legible, and an
  Indonesian typeface (commissioned for Jakarta): a quiet authenticity signal.
- **Data / prices / order numbers:** Plus Jakarta Sans with
  `font-variant-numeric: tabular-nums`.
- **Loading:** `next/font/google`, self-hosted, `display: swap`. Exposed as CSS
  vars `--font-fraunces` / `--font-jakarta`, composed into `--font-display` /
  `--font-sans` in `globals.css`. No `<link>` to Google, no runtime FOUT.
- **Scale (fluid, clamp):**
  | Level | Size | Use |
  |------|------|-----|
  | step-4 | 2.7 → 4.8rem | hero h1 |
  | step-3 | 2.0 → 3.2rem | section h2 |
  | step-2 | 1.5 → 2.1rem | sub-head |
  | step-1 | 1.2 → 1.45rem | lead / h3 |
  | step-0 | 1.0 → 1.1rem | body (min 16px) |
  | step--1 | 0.83 → 0.9rem | caption / label |
- **Headings:** `font-weight: 500` (600 for h3), `line-height: 1.08–1.15`,
  `letter-spacing: -0.012em`, `text-wrap: balance`.
- **Labels:** uppercase, `letter-spacing: 0.14–0.18em`, in turmeric.
- **Body:** `line-height: 1.65`, measure ~62ch.

## Color
- **Approach:** Expressive — palette pulled from Lombok natural dyes, so the
  colors inherently belong together. Spend boldness on indigo + morinda; keep
  surfaces calm.

| Token | Light | Dark | Role |
|------|------|------|------|
| `--indigo` (nila) | `#1E3A5F` | `#83A8CD` | primary — ink, headings, primary buttons |
| `--indigo-deep` | `#14293F` | `#0F2233` | hero / dark panel ground |
| `--morinda` (mengkudu) | `#9E2B25` | `#D0705F` | accent — CTA, sale, links |
| `--turmeric` (kunyit) text-safe | `#A8701A` | `#E0B057` | label text, kickers |
| `--turmeric-fill` | `#D8A13A` | `#D8A13A` | underlines, motif, large fills only |
| `--paper` (kapur / limewash) | `#F6F1E7` | `#1B1712` | page background |
| `--panel` | `#FDFBF5` | `#241E18` | raised surface |
| `--sunk` | `#EDE3D0` | `#14110D` | inset / bars |
| `--ink` | `#26211C` | `#EDE6D8` | body text (warm, not pure black/white) |
| `--muted` | `#6B635A` | `#A99E8C` | secondary text |
| `--line` | `#D9CEB8` | `#3A3128` | borders |
| `--timber` (arang) | `#211C18` | `#14110D` | darkest sections |

- **Semantic:** success/in-stock `#4A7A4A` (leaf), warning = turmeric,
  error = morinda, info = indigo. Map to the same natural set — no separate
  bright green/red/yellow.
- **Never:** pure `#000` / `#fff` as ground, the old hardware-red `#c81e1e`,
  purple/violet anything, gradient buttons.
- **Dark mode:** charred-timber surfaces with elevation (not a lightness
  inversion), indigo lightened + ~15% desaturated, text off-white `#EDE6D8`,
  `color-scheme: dark`.

## Spacing
- **Base unit:** 4px.
- **Density:** comfortable. Marketing sections 96–128px vertical rhythm;
  catalog/checkout tighter (32–48px).
- **Scale:** `4 · 8 · 16 · 24 · 32 · 48 · 64 · 96 · 128`.
- **Layout does spacing:** flex/grid + `gap`, not per-element margins.

## Layout
- **Approach:** Hybrid. Editorial + asymmetric for storefront/marketing
  (full-bleed photography, overlapping captions, ikat dividers);
  grid-disciplined for catalog, product, cart, checkout, admin.
- **Grid:** 2 col (mobile) → 3 → 4 for product grids; single readable column for
  editorial text.
- **Max content width:** 1180px.
- **Border radius:** **squared.** `--radius-sm: 2px` for controls/cards, `0` on
  large surfaces and images. No `rounded-lg` bubble cards — craft objects
  photograph better in hard rectangles.
- **Ikat band:** thin (`26px`, `40px` tall variant) lattice used as a section
  divider and at the hero base / footer. Restraint — never a full background.
- **Photography:** full-bleed, edge-to-edge. People and cloth, warm light.
  No stock-photo vibe.

## Motion
- **Approach:** Intentional, sparse.
- **Easing:** enter `ease-out`, exit `ease-in`, move `ease-in-out`.
- **Duration:** micro 50–120ms, short 150–250ms, reveal 400–500ms.
- **Patterns:** scroll reveal (fade + 12px rise); product hover crossfades to a
  second photo; cart-badge count bump. No page-transition theatrics.
- **`prefers-reduced-motion`:** all reveals/transitions off, content always
  visible.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-08 | Initial design system created | /design-consultation. User chose a culture-forward rebrand; memorable thing = "authentic Lombok". Research showed the craft-commerce category defaults to hushed beige for Western buyers; Lombok Exotic's domestic oleh-oleh audience + the actual colors of Sasak tenun ikat point the other way — the authentic move is also the more eye-catching one. |
| 2026-09-08 | Fraunces + Plus Jakarta Sans, loaded via `next/font` | Cinzel was referenced but never loaded (every heading fell back to Georgia); Inter fell back to system-ui. Fraunces gives warmth; Plus Jakarta Sans is Indonesian by origin. |
| 2026-09-08 | Natural-dye palette (nila/mengkudu/kunyit/kapur/arang) | Replaces `#c81e1e` + pure black/white. Every value maps to a real dye so the palette coheres. |
| 2026-09-08 | Squared corners + ikat motif signature | A proprietary visual mark the category doesn't have; the pattern does the decoration job authentically. |
