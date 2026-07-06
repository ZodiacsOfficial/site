# Handoff — zodiacs.org, remaining backend + audit

**For:** the next engineer (Codex) picking up the two backend items and a
formal audit. Everything shipped so far is a static Astro site with
client-only islands; there is **no server code yet** — that is precisely
what remains.

**Repo state at handoff**
- Branch: `claude/zodiacs-org-strategy-hevw5u` (Vercel deploys production
  from `main`; this branch is the working line, opened as a PR when ready)
- HEAD: `ebc7f40` — "Placements cluster complete: all 120 pages"
- Working tree: clean
- Latest local build: **`dist/`** at the repo root — **292 HTML files**,
  267 Astro-built pages + the legacy wing served verbatim. Rebuild with
  `npm run build`. (This `dist/` is git-ignored; it is the artifact, not
  the source of truth.)
- Gate at handoff: `npm run build && npm run check && npm test` green (59
  vitest vectors), `node scripts/check-dist.mjs` green, total island JS
  **61.2 KB gz across 24 chunks**, homepage carries zero ephemeris.

---

## 1. Architecture you must not break

These four invariants are enforced by CI (`.github/workflows/site-check.yml`)
and are the load-bearing walls of the project. Read `CLAUDE.md` before
touching anything.

1. **Two wings.** New consumer site in `src/` (Astro, "Cosmic Void" design
   system) vs. the legacy crypto-token registry served **byte-identical**
   from `public/` (`/collect/`, `/thesis/`, `/archive/`, `/sdk/`,
   discovery pages). CI greps `src/` for crypto/market vocabulary and
   fails on a hit. Never link `src/styles/tokens.css` into the wing;
   never link `discovery.css` into new pages.
2. **Legacy drift gate.** `public/collect/{sign}/`, `public/assets/app.js`,
   and `public/archive/` are generated. CI regenerates them and runs
   `git diff --exit-code -- public/`. If you touch a generator source, you
   must commit the regenerated output in the same change.
3. **Engine bundle isolation.** `src/lib/engine/full.ts` is the **only**
   module that may `import 'astronomy-engine'`. Everything else lazy-imports
   it (`enginePromise ??= import('../lib/engine/full')`). The homepage and
   the synastry saved-chart path must never pull the ~45 KB ephemeris.
   `scripts/report-bundles.mjs` is the check.
4. **Voice.** `CLAUDE.md` bans a list of smug tells; CI now greps
   `src/content` + `src/pages` + `src/components` + `src/islands` for them.

**Data → page provenance** (all generators listed in `CLAUDE.md`; the
JSON is committed, computed by scripts, never hand-edited):
`src/data/sky.json`, `ingresses.json`, `transits-YYYY-MM.json` feed the
moon-phase, mercury-retrograde, placement, and horoscope pages as
build-time receipts. `src/lib/dignities.ts` (7 classical planets) is
cross-locked to `src/lib/signs.ts` rulerships by a structural vitest.

---

## 2. Remaining backend — the actual work

### 2a. Supabase accounts + cross-device sync  *(the only real backend)*

**Why it's next:** the whole product funnels toward "save your chart," and
today saves are localStorage-only (`src/lib/profile/`). The schema was
**designed for this migration** — do not redesign it:
- `src/lib/profile/schema.ts`: `Profile { version: 1, settings, charts }`;
  `SavedChart` has a client-generated **UUID `id`**, `createdAt`,
  `updatedAt`, birth input as source of truth, and an
  `engineVersion`-stamped `summary` render-cache. The UUID + timestamps
  make server sync an **idempotent bulk upsert** — that is deliberate.
- `src/lib/profile/store.ts`: `loadProfile / saveChart / deleteChart /
  renameChart`, each dispatching `zodiacs:profile` on `window`. This is
  the seam: a synced store implements the same four functions plus a
  background push/pull.

**Build plan:**
1. Provision a Supabase project (owner action — needs the URL + anon key
   in Vercel env). Tables: `profiles(user_id pk)`, `charts(id uuid pk,
   user_id fk, payload jsonb, updated_at)`. **Row-Level Security on from
   day one** — a user reads/writes only `user_id = auth.uid()`. This is
   the #1 security item; audit it explicitly.
2. Auth: Supabase magic-link / OAuth. The only page allowed to upsell an
   account is `/profile/` (see `docs/STRATEGY.md` §A8 conversion rules).
3. Sync layer: last-write-wins on `updated_at` per chart id; import the
   local profile losslessly on first sign-in (union by id). Astro is
   static output today — this needs either a Vercel edge/serverless
   function or direct client→Supabase calls with RLS. **Prefer
   client-direct + RLS** (no server to secure, matches the "birth data
   never leaves the device unless you opt in" story); only add a function
   if you need service-role work.
4. Keep the local-first path fully working when signed out. Never gate the
   free tools behind auth (that's Co-Star's dark pattern; our
   differentiator is no-signup tools — `docs/STRATEGY.md` §A0).

### 2b. Horoscope generation step  *(half-built)*

The **hard half is done**: `scripts/build-transits.mjs` computes a month's
real events, and `.github/workflows/transits-monthly.yml` runs it on the
25th and opens a checklist issue. What's missing is the **prose step** —
today the 12 monthly MDX files are written by hand. Options for Codex:
- Wire an LLM call (needs an API-key decision from the owner) into a new
  workflow step that drafts the 12 entries against
  `src/content/horoscopes/2026-07-*.mdx` as the exemplar and the month's
  transit JSON, opening a PR rather than committing to `main`.
- Guardrails are non-negotiable: every claim must cite a dated event from
  the JSON, human review before merge, the CLAUDE.md voice rules + banned
  tells (`docs/STRATEGY.md` §A15). The staleness guard in
  `src/lib/horoscopes.ts` already renders the latest present month and
  warns (never fails) when stale.

### 2c. AI astrologer chat  *(deferred, needs budget)*

Grounded in the user's saved chart. Needs a backend + token budget + a
cost model before commit. Not started; flagged in `docs/STRATEGY.md` §A5
Phase 3. Lowest priority of the three.

---

## 3. Audit checklist — what's verified vs. open

**Verified this cycle (evidence in the branch):**
- Functional: 59 vitest vectors (engine accuracy vs. JPL Horizons,
  synastry, returns, dignities). 84-step Playwright journey in the
  session scratchpad covering every page type + the OG boundary.
- Link/artifact integrity: `scripts/check-dist.mjs` over 292 files incl.
  an `og:image`/`twitter:image` existence gate.
- Bundle budgets: `scripts/report-bundles.mjs`, ephemeris isolation
  confirmed on the synastry saved path.
- Brand: the new wing's share cards were migrated off the auction/token
  art to `public/assets/og/v2/` (the 13 gilt cards at
  `public/assets/og/*.png` remain, by design, for the wing only).

**Open — Codex should run these (none done yet, be honest about it):**
1. **Accessibility.** No axe/Lighthouse-a11y pass has been run. Audit
   colour contrast on the void palette, focus order on the nav
   dropdown/mobile sheet (`src/components/SiteNav.astro`), the calculator
   islands' labels, and `prefers-reduced-motion` coverage.
2. **Core Web Vitals on a real Vercel deploy.** Local preview only so far.
   Verify LCP on the homepage hero (`ZodiacWheelHero`) and CLS on the
   hydrating islands (SSR shells were added for synastry + moon-phase;
   confirm they hold).
3. **Structured-data validation.** JSON-LD is emitted on every page type
   (Article/FAQPage/BreadcrumbList/WebApplication) but has **not** been
   run through Google's Rich Results Test. Validate a sample of each type.
4. **Security review.** Client-only today, so the surface is small, but:
   (a) the legacy wing loads React from a third-party CDN (pre-existing,
   wing-only) — note it; (b) when 2a lands, RLS is the whole ballgame —
   review policies, never expose the service-role key, keep birth data
   opt-in. Run `/security-review` on the Supabase diff.
5. **SEO technical sweep.** Canonicals, the custom `sitemap.xml.ts`
   (covers both wings — verify no stale/duplicate locs after the
   placements add), robots, and internal-link depth to the 120 placement
   pages (they're 3 clicks from home; confirm crawlability).
6. **Content QA at scale.** 120 placement + 78 pair pages were
   agent-written. The wording/dignity/era-window facts were spot-checked
   and one era-boundary bug was repaired (commit `4ed551e`), but a
   full editorial read has not happened. Sample ~10% per planet.

---

## 4. Where things live (quick map)

| Thing | Path |
|---|---|
| Routes | `src/pages/` (25 files; `[sign]`, `[pair]`, `learn/**/[slug]`, `horoscopes/[sign]` are dynamic) |
| Islands (Preact) | `src/islands/` — Chart/Synastry/MoonPhase/SaturnReturn calculators, ProfileManager, hero/ticker |
| Engine | `src/lib/engine/` (`full.ts` = sole ephemeris importer) |
| Profile (sync target) | `src/lib/profile/{schema,store}.ts` |
| Content | `src/content/{guides,pairs,horoscopes,learn/**}` + `content.config.ts` |
| Computed data | `src/data/*.json` ← `scripts/build-*.mjs` |
| Design system | `src/styles/{tokens,base,calculator,prose}.css` |
| OG generator | `scripts/build-og-void.mjs` → `public/assets/og/v2/` |
| CI | `.github/workflows/{site-check,transits-monthly,pulse-refresh,distribution-refresh}.yml` |
| Strategy + rules | `docs/STRATEGY.md`, `CLAUDE.md` |
| Latest build artifact | **`dist/`** (git-ignored; `npm run build` to regenerate) |

**First commands for Codex:**
```bash
npm ci
npm run build && npm run check && npm test   # expect green
node scripts/check-dist.mjs                   # expect OK over 292 files
node scripts/report-bundles.mjs               # ephemeris isolation check
```
