# Codex handoff — accounts, Spanish, horoscope generation

The block below is a single copy-paste prompt. Hand it to Codex verbatim;
it is self-contained. (Kept in the repo so the brief and the code travel
together — update it if the division of labor changes.)

---

```
You are picking up three work tracks on zodiacs.org — a live production
site. Work in this order: (1) Supabase accounts + sync, (2) Spanish
localization of the core surfaces, (3) the horoscope generation step.
A fourth (AI astrologer chat) is explicitly deferred; do not start it.

## Ground truth (verify before you begin)

- Production: https://zodiacs.org, deployed by Vercel from `main`.
- Stack: Astro static output; Preact islands in `src/islands/`; no
  server code anywhere yet. The chart engine runs entirely client-side.
- Branch discipline: create your own feature branch from the LATEST
  `main`. A "share layer + glass" PR landed recently and touched
  `ChartCalculator.tsx`, `SynastryCalculator.tsx`, `index.astro`, and
  `src/lib/share*.ts` — build on top of it, never behind it.
- First commands, expect all green before you change anything:
    npm ci
    npm run build && npm run check && npm test
    node scripts/check-dist.mjs
    node scripts/report-bundles.mjs

## Four invariants CI enforces (breaking these fails the build)

1. Two wings. `src/` is the consumer astrology site ("Cosmic Void"
   design system). `public/collect/`, `/thesis/`, `/archive/`, `/sdk/`
   are the legacy token-registry wing, served byte-identical. CI greps
   `src/` for crypto/market vocabulary and fails on a hit. No
   token/price language on new surfaces, ever.
2. Generated output is committed with its source. CI re-runs the wing
   generators plus the data pipelines and diffs. If you touch a
   generator, commit its output in the same change. Generator list:
   `CLAUDE.md` "Generated vs source".
3. Engine bundle isolation. `src/lib/engine/full.ts` is the ONLY module
   that may import `astronomy-engine`. Everything else lazy-imports via
   `enginePromise ??= import('../lib/engine/full')`. The homepage must
   never load the ephemeris. `scripts/report-bundles.mjs` checks.
4. Voice. `CLAUDE.md` bans a list of smug tells ("computed properly",
   "no mush", mono-caps eyebrow kickers, …). CI greps for them. New UI
   strings should sound like `src/lib/interpretations.ts`: dry, plain,
   specific. This applies to Spanish too — translate the register, not
   just the words.

## Track 1 — Supabase accounts + cross-device sync

Why: saves are localStorage-only (`src/lib/profile/`). The schema was
designed for this migration — do not redesign it. `SavedChart` carries a
client UUID `id`, `createdAt`/`updatedAt`, birth input as source of
truth, and an engineVersion-stamped `summary` cache; sync is therefore
an idempotent bulk upsert keyed on id + last-write-wins on `updatedAt`.

Architecture: client-direct Supabase with Row-Level Security. No
serverless functions unless you hit something that truly needs
service-role (you shouldn't). This preserves the product's core claim:
birth data stays on-device unless the user opts into an account.

Build steps:
1. SQL migration (commit under `supabase/migrations/`):
   `charts(id uuid primary key, user_id uuid not null references
   auth.users, payload jsonb not null, updated_at timestamptz not null)`
   with RLS ON and policies restricting select/insert/update/delete to
   `user_id = auth.uid()`. RLS is the entire security model — have
   `/security-review` run on the diff and audit the policies explicitly.
2. Client: lazy-load `@supabase/supabase-js` ONLY on `/profile/` (and
   an auth callback route). It must never enter the shared or homepage
   bundles — `report-bundles.mjs` will show you. Env:
   `PUBLIC_SUPABASE_URL` + `PUBLIC_SUPABASE_ANON_KEY`; when absent, the
   site must behave exactly as today (dark launch — build this so the
   owner can flip it on by adding env vars in Vercel and redeploying).
3. Auth UX on `/profile/` only: magic link (+ Google OAuth if cheap).
   The strategy doc's conversion rule stands: `/profile/` is the ONLY
   surface allowed to mention accounts. Calculators and content pages
   never upsell. Signed-out local-first flow keeps working forever.
4. Sync layer: wrap the existing seam — `src/lib/profile/store.ts`
   exposes `loadProfile/saveChart/deleteChart/renameChart`, each
   dispatching a `zodiacs:profile` window event. Keep that event
   contract EXACTLY: `WelcomeBack.tsx` (homepage strip) and
   `SynastryCalculator.tsx` subscribe to it. On first sign-in, union
   the local charts into the account by id (lossless import), then
   last-write-wins thereafter. Handle the 20-chart cap on both sides.
5. Copy, house voice, e.g.: "An account is optional. It does one thing:
   keeps your saved charts with you across devices." Say plainly that
   birth data is stored server-side once sync is on.

Definition of done: dark-launch merge is safe with no env keys; with
keys set, sign-in → save on device A → appears on device B; signed-out
behavior byte-identical to today; RLS policies reviewed; bundle report
unchanged for non-profile pages; a `docs/SUPABASE.md` with the
provisioning steps for the owner.

## Track 2 — Spanish (es) for the core surfaces

Scope (deliberately bounded): site chrome + the 10 tool pages + the
homepage + the 12 sign guides + 404. The long-tail content (78 pairs,
120 placements, learn deep-dives, horoscopes — ~170k words) STAYS
ENGLISH this round; the templates must simply not 404 under /es/ (link
back to the English page with a one-line note). Do not machine-translate
the deep content; that decision comes after es traffic exists.

Mechanics:
1. Astro i18n routing (`i18n: { locales: ['en','es'],
   defaultLocale: 'en', routing: { prefixDefaultLocale: false } }`) —
   English URLs must not change.
2. String catalog: a typed `src/lib/i18n/` module (`t(locale, key)`,
   catalogs `en.ts`/`es.ts`). Extract EVERY user-facing string from the
   islands and shared components — including the new share/invite
   strings in `ChartCalculator.tsx` and `SynastryCalculator.tsx` and
   the `WelcomeBack.tsx` strip. Islands receive `locale` as a prop from
   the page that mounts them.
3. Dates: 17 call sites hardcode `'en-US'` in `toLocaleDateString`/
   `Intl.DateTimeFormat` across `src/`. Replace with a
   `formatDate(locale, …)` helper in one module. Grep `en-US` to find
   them all; zero may remain outside that helper.
4. Sign/element/modality names: add Spanish label maps alongside
   `src/lib/signs.ts` (Aries/Tauro/Géminis/Cáncer/Leo/Virgo/Libra/
   Escorpio/Sagitario/Capricornio/Acuario/Piscis; fuego/tierra/aire/
   agua; cardinal/fijo/mutable). The engine's internal body names stay
   English (they key lookups); only rendered labels localize.
5. Pages under `src/pages/es/`: homepage, tools hub, the 7 calculator
   pages, /es/{sign}/ guides (translate the 12 MDX guides, ~16k words),
   methodology, 404. Translation quality gate: a native-register
   editorial pass on the guides — if that's you, read them aloud;
   they must not smell machine-translated. Keep astrological terms in
   natural Spanish usage (ascendente, carta natal, tránsitos).
6. SEO plumbing: `hreflang` alternates both directions in
   `src/components/SEO.astro`, `xhtml:link` alternates in
   `src/pages/sitemap.xml.ts`, `og:locale` per page, es lines in
   `public/llms.txt`. Canonicals per-locale, no cross-locale
   canonicalization.
7. CI: extend the voice-tell grep with the Spanish equivalents of the
   banned tells (e.g. "como es debido", "sin paja").

Definition of done: /es/ core surfaces fully Spanish (chrome included —
nav, footer, cookie-free notice, calculator labels, result copy);
`npm run build && npm run check && npm test` green; hreflang validates;
English URLs and bundles unchanged.

## Track 3 — Horoscope generation step

The computed half exists: `scripts/build-transits.mjs` writes each
month's real transit events, and `.github/workflows/transits-monthly.yml`
runs on the 25th and opens a checklist issue. Missing: the prose step
(the 12 monthly sign files are hand-written today).

Build: a workflow step (owner provides the LLM API key as a repo
secret) that drafts 12 MDX entries from the month's transit JSON, using
the current month's files in `src/content/horoscopes/` as exemplars,
and opens a PR — never a direct commit. Non-negotiable guardrails:
every dated claim must correspond to an event in the JSON (write an
assertion script, not a vibe check); the CLAUDE.md voice rules apply;
a human merges. The staleness guard in `src/lib/horoscopes.ts` already
degrades gracefully if a month is late.

## Deferred — do not build

AI astrologer chat. Needs a cost model and an owner decision first.

## What is already done (do not redo, do not regress)

- Launch hardening: security headers in `vercel.json`, axe clean on
  key pages, Lighthouse ≥ 95 perf on homepage locally, focus states,
  reduced-motion + reduced-transparency fallbacks (including the
  homepage liquid-glass chrome — leave `glass-maps.json` and the
  `zdx-lens-*` filters alone unless a bug report says otherwise).
- Share layer: `src/lib/share.ts` fragment codec (versioned, paranoid
  decoder, vitest-covered) — REUSE it for any future share surface;
  never move birth data into query strings (fragments only, they don't
  reach servers). `share-card.ts` renders the 1080×1350 PNG client-side.
- PWA-lite: `public/site.webmanifest` + app icons via
  `scripts/build-app-icons.mjs`. No service worker by decision (static
  site; stale-cache risk not worth offline value yet).
- Content: 283 pages live. Editorial QA sampled 15 pages at launch.

## Open items you may fold in opportunistically

- Structured data has not been through Google's Rich Results Test.
- Core Web Vitals on the real Vercel deploy (lab numbers were local).
- The legacy wing loads React from a CDN (pre-existing, wing-only;
  out of scope, just don't "fix" it into the new wing).

Ship each track as its own PR with the gates green:
`npm run build && npm run check && npm test`,
`node scripts/check-dist.mjs`, `node scripts/report-bundles.mjs`.
```
