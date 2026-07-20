# Phase 2 sky-events frontend — Fable handoff

Branch: `fable/phase2-astrology-events` (worktree from `2aa0927`, Phase 1
release cutover). Author: Fable, product/frontend lead for Phase 2. This
branch is **preparation while Phase 2 stays gate-locked**: nothing here
merges, deploys, or updates `PLAN.md` status. Every route ships `noindex`
and stays out of the sitemap, feeds, and search index until the
verification pass flips eligibility deliberately.

## What exists on this branch

### Typed contract and adapter (`src/lib/events/`)

- `types.ts` — the presentation contract: `EventFacts` (id, family,
  subtype, path, title, instants/spans, bodies, signs, degrees, eclipse
  and aspect detail, moon names, provenance), `EventRelations`
  (previous/next comparable, nearby-with-reason, eclipse↔lunation,
  station→cycle), `EventInterpretation` (lead, body, reflections,
  sign notes via whole-sign solar houses, limitations), `CatalogEvent`
  (+ `indexEligible`, `fixture`, `lastModified`). `EVENTS_INDEX_ELIGIBLE`
  is the branch-wide `false`.
- `catalog.ts` — the read-side adapter over the committed catalogs:
  `sky.json` (lunation instants, retrograde windows 2026–2027),
  `eclipses.json` (2026–2028), `ingresses.json` (slow-planet windows),
  every `transits-YYYY-MM.json` via glob (currently 2026-07, 2026-08).
  Derivations are limited to reading sign/degree from the engine at a
  committed instant — the idiom `/full-moon-calendar/` already uses.
  Relations are computed deterministically here, so the future
  verification agent can prove them from the same inputs.
- `format.ts` — ids, paths, titles, meta titles/descriptions, timeline
  one-liners, moon-name tradition (duplicated from the
  `/full-moon-calendar/` page table — dedup opportunity noted below).
- `interpretations.ts` — authored editorial copy keyed by event id
  (8 events, all five families; every factual claim pinned by tests).
- `fixtures.ts` — three labeled samples (2030 dates, `source: 'fixture'`)
  covering minimal-fields, everything-on, and open-ended-span variants.

### Routes

Production-shaped (all `noindex` on this branch):

| Route | Source | Count now |
| --- | --- | --- |
| `/events/` | hub | 1 |
| `/full-moon/{YYYY-MM-DD}/` | sky.json + transit months | 25 |
| `/new-moon/{YYYY-MM-DD}/` | same | 25 |
| `/eclipses/{YYYY-MM-DD}/` | eclipses.json | 14 |
| `/mercury-retrograde/{YYYY-MM-DD}/` | sky.json | 6 |
| `/venus-retrograde/{YYYY-MM-DD}/` | sky.json | 1 |
| `/mars-retrograde/{YYYY-MM-DD}/` | sky.json | 1 |
| `/events/{planet}-enters-{sign}-{date}/` | ingresses.json (Jupiter…Pluto) | 5 |
| `/events/{a}-{type}-{b}-{date}/` | transit months, slow pairs only | 7 |

Test-only, permanently noindex: `/events/preview/` + three fixture pages.

Route decisions, documented: the master brief's `/events/` hub +
per-family URL map controls, refined by PLAN.md's exact-date rule
(month/year aliases can 301 later, only where unambiguous). Retrograde
cycle URLs key to the **retrograde-station date**. Outer-planet cycles
(Jupiter–Pluto) deliberately have no standalone pages — their catalog
entries and station rows link to the matching `/retrogrades/` table
anchors (`#retrograde-{planet}-{date}`), which already exist. Sun and
personal-planet ingresses stay off the hub (the almanac and dailies
carry them); slow-pair aspects only, for standalone alignment pages.
`/astrology-events/` was NOT introduced (would compete with `/events/`).

### Components (`src/components/events/`)

`EventPageLayout.astro` (composition: kicker → h1 → dateline → authored
lead → facts band → reading → questions → sign-by-sign → one primary
action → related → keep-following → visible limitations → closed
evidence), `EventFactsBand.astro`, `EventRelated.astro`,
`EventSignNotes.astro`, `EventEvidence.astro` (wraps the shared
`EvidenceDisclosure`, label "Behind this event"), `EventMark.astro`
(family marks: full/new discs, shadowed eclipse discs, ℞, ingress
arrival, `AspectGlyph` reuse — pastel sign hues only). Shared styles in
`src/styles/events.css`. Pages without authored interpretation render a
fact-grounded fallback lead that says the write-up is still to come —
they must not flip indexable in that state.

### Presentation rules encoded

- Meaning first: the lead answers "why does this matter" before any
  mechanics; exact numbers live in the closed disclosure (the
  consumer-copy gate strips closed `<details>`, so method vocabulary is
  sanctioned only there).
- Consequential limitations stay visible (eclipse ground-track,
  retrograde shadow periods) — never disclosure-only.
- Sign-by-sign sections exist only where the declared whole-sign
  solar-house method supports them (`solarHouse`/`ORDINAL` from
  `src/lib/daily.ts`), one distinct note per house, pinned by test.
- No schema.org `Event`/`Dataset` on the NEW per-event pages (Article +
  BreadcrumbList only) — celestial events are not attendable events.
  The existing family pages keep their Event/Dataset graphs untouched;
  reconciling the two conventions is an editorial decision for later.
- No-JS: a `<noscript>` style neutralizes the `.reveal` entrance system
  on these pages (Playwright's `isVisible` is opacity-blind — the drive
  asserts computed opacity instead).

## Verification on this branch

- `src/lib/events/catalog.test.ts` + `format.test.ts` — 30+ vectors:
  the 2026-07-29 full moon and 2026-06-29→07-23 Mercury cycle (PLAN.md's
  named regression facts), eclipse↔new-moon pairing on 2026-08-12,
  transit-vs-engine agreement at every monthly lunation, chronological +
  bidirectional prev/next, nearby ≤5 days with reasons, clamped-window
  honesty, fixture isolation, metadata uniqueness, banned-vocabulary
  sweep over all authored copy, moon-name pins (Buck / Blue 2026-05-31).
- `tests/events-drive.mjs` (`npm run test:events:browser`) — 102 browser
  checks: hierarchy order in DOM, closed-by-default disclosures, real
  keyboard focus (`Tab` → visible ring), genuine no-JS visibility,
  reduced motion, 360/1280 overflow, resolvable related links, noindex
  on every route, sitemap/search-index exclusion, fixture banners, zero
  console errors. Screenshots land in `tests/visual/artifacts/events/`.
- `tests/visual/lighthouse.mjs` gained an opt-in
  `LIGHTHOUSE_INCLUDE_EVENTS=1` block (six event templates), so the
  three-run weakest-run gate can cover the family without changing the
  default Phase 1 matrix.

### Lighthouse evidence (mobile, weakest of three runs)

Committed noindex state: hub 98/100/66, event pages 99/100/66–69 ·
LCP 1.96–2.11s · CLS 0.002 · TBT 0ms. The only failed SEO audit on every
route is `is-crawlable` — the deliberate branch-wide noindex.

Eligibility-flipped measurement build (temporary `EVENTS_INDEX_ELIGIBLE
= true`, `astro build` only, never committed — a full `npm run build`
in that state correctly fails check-dist until sitemap membership lands):

| Template | Perf | A11y | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- |
| /events/ | 99 | 100 | 100 | 1.96s | 0.002 | 0ms |
| /full-moon/2026-07-29/ | 99 | 100 | 100 | 2.03s | 0.002 | 0ms |
| /eclipses/2026-08-12/ | 99 | 100 | 100 | 1.96s | 0.002 | 0ms |
| /mercury-retrograde/2026-06-29/ | 99 | 100 | 100 | 1.96s | 0.002 | 0ms |
| /events/saturn-enters-aries-…/ | 99 | 100 | 100 | 2.11s | 0.002 | 0ms |
| /events/jupiter-trine-saturn-…/ | 99 | 100 | 100 | 2.11s | 0.002 | 0ms |

All six templates clear the Phase 1 release bar (≥95 / ≥95 / ≥95,
LCP ≤2.5s, CLS ≤0.05, TBT ≤200ms) once eligibility flips. The hub's
noindex reads from `EVENTS_INDEX_ELIGIBLE` like the event pages, so the
integration flip is a single constant plus the sitemap/check-dist set.

Unrelated observation from the same local matrix run: `/today/`
(Phase 1, untouched by this branch) measured weakest-run LCP 2.50–2.65s
against its 2.5s budget on this machine while still scoring perf 96.
Phase 1's CI evidence (≤2.415s on the pinned runner) remains the
authoritative gate; flagged here only so nobody mistakes local variance
for a branch regression.

## What Codex/Sol Ultra must still do (integration checklist)

1. **Catalog**: build + verify the deterministic 2026–2030 event catalog
   (extend `build-transits.mjs` months, or a dedicated builder) through
   explicit generation PRs — no scheduled job (SETUP.md rule). The
   adapter consumes new months automatically via the glob. Missing data
   the frontend is waiting on: exact aspects beyond 2026-08, station
   lists per month, retrograde **shadow periods** (limitation is visible
   on cycle pages until then), and any 2028–2030 facts.
2. **Interpretation coverage**: author interpretations for the 2026–2027
   editorial set (8 of ~85 pages have them; the rest render the honest
   fallback lead). `indexEligible` must additionally require authored
   interpretation — see `interpretationFor`.
3. **Indexing flip** (single deliberate change-set): set
   `EVENTS_INDEX_ELIGIBLE`/per-event eligibility, add the routes to
   `src/pages/sitemap.xml.ts` (+ `EVERGREEN_LASTMOD` for `/events/`),
   bump `scripts/check-dist.mjs` sitemap baseline (currently
   `total: 2392 + registryAuraIndexed`) and add an `indexedFamilies`
   entry, and re-run the reverse-canonical/search-index gates. Fixture
   previews must stay noindex forever.
4. **OG cards**: per-event cards need a `build-og-void.mjs` family and a
   ceiling decision — the generated v2 set sits ~12.46MB under a 15MB
   ceiling and ~85 new cards will not fit; either raise the documented
   ceiling or scope cards to the indexed 2026–2027 set. Until then every
   event page correctly falls back to `/assets/og/v2/share.png`.
   Design direction: dark void card, the family mark at left, event
   title in EB Garamond, date + UTC clock in JetBrains Mono, the sign's
   pastel disc as the single accent — composition mirrors the existing
   `v2/tool/*` cards.
5. **Navigation**: decide the `/events/` entry point (SiteNav "Horoscopes"
   cluster or the tools hub "Follow the sky" group + footer). Not added
   here to keep shared files untouched; the hub is currently reachable
   only from event pages (fine while noindex).
6. **Daily cross-links** (brief requirement): dailies reference the event
   page when one is ≤5 days out — the catalog's `nearby` machinery is
   reusable server-side; wire it into the Phase 1 renderer, never prose
   inference.
7. **Feeds**: an events RSS feed is prepared-for but not built (Base
   supports `rssFeed`); decide alongside indexing.
8. **Visual baselines**: add hub + one event page to
   `tests/visual/visual-regression.mjs` routes and bless darwin AND
   linux baselines (linux must come from CI artifacts).
9. **Localization**: EN-only per program policy; strings live in the
   pages/components, data in the catalog — separable when a locale pass
   is sanctioned.
10. **Dedup niceties** (optional): `MOON_MONTH_NAMES` + blue-moon rule
    exist here and inline on `/full-moon-calendar/` — pointing the page
    at `src/lib/events/format.ts` removes the duplication;
    `format.test.ts` pins them equal until then.

## Known limitations / honest notes

- The catalog's "now" (`buildNow`) freezes at build time, like every
  existing surface; the hub's "As of" band follows the daily rebuild.
- Venus/Mars family routes each render one real cycle (that's all the
  committed window holds); more appear as data lands.
- The three fixtures use 2030 dates so nothing labeled sample can be
  mistaken for a listed fact; the aspect fixture intentionally exercises
  every optional field at once.
- `check-dist`, `schema:check`, and `report-bundles` pass with the
  family in the build precisely because everything is noindex; step 3
  above is where those baselines must move.
