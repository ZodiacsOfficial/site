# SOL — Growth Activation Implementation Run (from the 2026-08-19 audit)

You are implementing the findings of the full marketing/UX/SEO audit recorded at
`docs/growth/records/2026/GROWTH-2026-08-19-full-marketing-audit.md`
(read it first, along with `CLAUDE.md`, `docs/STRATEGY.md`, and
`docs/growth/README.md`).

You are explicitly authorized to prepare branches and pull requests. You are NOT
authorized to merge, deploy, change production/Vercel settings, send email, post
to any external service, or alter indexation of pages other than those named
below. Every PR stops at human review.

## Mission

The audit's verdict: the site's problem is activation, not construction. Your job
is to wire up what's dark, fix the conversion front door, ship the shareable
chart artifact, repair the internal link graph, and prune the thin programmatic
tail — in that order. Do NOT build anything not listed here.

## Ground rules (non-negotiable)

1. **Content boundary:** zero token/market/crypto language on consumer surfaces
   (`src/`). The sanctioned cross-links are listed in CLAUDE.md; do not add new
   ones. The share artifact and everything one click from it must be
   Registry-sterile.
2. **Voice:** plain, confident, warm, dry (`src/lib/interpretations.ts` is the
   register). Banned: "properly", "shows its work", "no mush", "not vibes",
   mono-caps eyebrows, salesy urgency. Kickers are sentence-case serif italic.
3. **Design system:** Cosmic Void only. No gold anywhere (Warm Gilt is retired).
   The 12 pastel sign hues are the only chroma.
4. **Generated files:** never hand-edit generated output; run the owning script
   and commit source + regenerated output together (CI fails on drift). OG cards
   come from `scripts/build-og-void.mjs`. When regenerating anything, keep
   `PUBLIC_REGISTRY_COLLECTION_ENABLED` unset — committed state is flag-OFF.
5. **Frozen guide template:** `src/pages/[sign]/index.astro` is protected by
   `scripts/phase1-scope-guard.mjs`. Changes to it require a scope allowance via
   `.github/phase1-scope-allowance.json` (see how prior packets did it). Include
   the allowance in the same PR and say so in the PR body.
6. **Budgets:** `budgets.json` is CI-enforced (homepage 42KB gz JS, /birth-chart/
   69KB, engine chunk 25KB). Anything you add to the calculator result must be
   lazy-loaded. `astronomy-engine` may only be imported by `src/lib/engine/full.ts`
   (browser) and `server-ephemeris.ts` (server).
7. **Verification before every PR:**
   `npm run build && npm run check && npm test && node scripts/check-dist.mjs`.
   All green or the PR doesn't go up.
8. **Page velocity:** net-new indexable pages ≤10 per rolling 7 days (Growth OS
   rule). Packet H exceeds that in total — split it across two weeks as noted.
9. One PR per packet, in the order below. Small diffs. Reference the audit
   record ID `GROWTH-2026-08-19-full-marketing-audit` in each PR body.

## Packet A — Turn measurement on (code side)

1. `src/layouts/Base.astro:72` — replace the hardcoded
   `const guideRuntimeEnabled = true;` kill switch. Plausible must load on
   consumer pages when the `PUBLIC_PLAUSIBLE_*` env vars are set; the Guide
   privacy exclusion must be scoped (use the existing `privateSurface` prop /
   a route- or session-scoped mechanism), not global.
2. Update the two tests that pin the old behavior:
   `src/lib/account-v2/cutover.test.ts:143` and
   `src/lib/assistant/open-assistant.test.ts:485`. Update `docs/ANALYTICS.md`
   to document the new gate.
3. `src/lib/analytics-config.mjs` — extend `chart_computed` with
   `source: 'fresh' | 'shared_details' | 'shared_positions'` (bounded enum, no
   free text) and emit it in `ChartCalculator.tsx` based on whether the chart
   came from an inbound `#a=` token, an inbound `#p=` token, or fresh input.
   This is the share-loop k-factor metric.

Acceptance: with the env vars set locally, built HTML on `/birth-chart/`
contains the Plausible script; with them unset, it doesn't; Guide surfaces never
load it; all tests green.

## Packet B — The front door

1. `src/pages/index.astro:674–693` — delete the liquid-glass override on
   `.hero__ctas .btn` for the PRIMARY button only. "Get your free birth chart"
   uses the sitewide solid `.btn--primary`; "See your forecasts" keeps the glass
   ghost treatment.
2. Add a one-line trust strip directly under the hero CTAs:
   "Free · No signup · Calculated in your browser" (mirror the existing line on
   `src/pages/tools/index.astro:220`; mono, quiet, factual).
3. `src/components/SiteNav.astro` — on consumer pages, the persistent mobile
   chip becomes "Birth chart" → `/birth-chart/`; Astrofolio moves into the
   burger menu and footer. Desktop: add Today to the nav links array (EN),
   positioned first.
4. Homepage FAQ: replace the Astrofolio item with "What if I don't know my
   birth time?" (answer from the calculator's real behavior: 12:00 reference,
   no fabricated houses/ASC, moon-ambiguity honesty).
5. Regenerate the homepage OG card — it still carries the retired headline
   "Explore the stars behind your story". Update the source string
   (`src/strings/seo.en.mjs`) and run `node --experimental-strip-types
   scripts/build-og-void.mjs`; commit the regenerated asset.
6. Calculator form: stop disabling the submit button
   (`src/islands/ChartCalculator.tsx:1513`). Keep it enabled; on submit,
   validate and focus the first incomplete field with an inline message. When
   text is typed in the place field but no city committed
   (`PlaceSearch.tsx:26` sets city null per keystroke), show a persistent hint:
   "Pick your birthplace from the list." Empty-state copy becomes: "Not listed?
   Choose the nearest town — a few km rarely changes the chart."

Acceptance: hero primary visually dominant; trust strip present EN homepage;
mobile nav shows Birth chart chip; no dead-button state reachable; OG card
regenerated by script (not hand-edited); budgets still pass.

## Packet C — Boundary hygiene (do this before any share work ships)

1. `src/pages/about/index.astro:75–83` — rewrite the wing paragraph in the
   records register: no "official Zodiac tokens", no "market desk". Remove the
   `astrofolio.xyz` outbound link (also check `/terms/`), per the 2026-08-16
   owner decision in `docs/GAMES-SITE-MAP.md` §6.
2. `public/llms.txt` — restructure so the consumer identity (free tools,
   guides, privacy posture) leads. Move the Astrofolio/Terminal/Registry/token
   block (currently lines ~53–65, including "follow a simple guide to buying
   it" and the "{sign} coin" citation instruction) to `llms-full.txt`, keeping
   only a one-line read-only pointer in `llms.txt`. Preserve the read-only-
   posture paragraph.
3. Add a CI boundary check: a script that greps consumer surfaces
   (`src/content/`, `src/pages/` minus `registry/`, legal pages, and the
   sanctioned carve-outs) for token/market/crypto vocabulary and fails on hits;
   wire it into the existing check pipeline.

Acceptance: no token/market vocabulary reachable from About; llms.txt first
screen is consumer-only; CI check passes on current tree and fails on a
seeded test string.

## Packet D — The share loop (the astro-seek play)

1. **Positions-only link becomes primary.** In the chart share dialog, wire the
   existing dead strings (`src/islands/PositionsShareSurface.tsx:33–44`) to a
   "Copy positions-only link" action calling `encodePositionsLink`
   (`src/lib/share-positions.ts`). The v1 full-birth-data link (currently the
   only one, in the "More actions" disclosure at `ChartCalculator.tsx:2018–2045`)
   becomes secondary with an explicit "includes your birth details" label.
   Fire the already-allowlisted `chart_share` variant `positions_link`.
2. **Signature card.** Add the signature variant to `ChartShareDialog` —
   `primaryShareCardVariant()` (`src/lib/share-card.ts:47–50`) already declares
   it the EN primary and `drawSignatureCard` exists; this is wiring.
3. **Moon/rising share.** In `mode === 'moon' | 'rising'` results, add a share
   affordance: big-three-style single-placement card
   (`prepareBigThreeCard` accepts partial charts, `share-card.ts:917`) plus the
   positions-only link.
4. **Fix the receiver.** In `PositionsOnlyResult`
   (`PositionsShareSurface.tsx:199–205`): recompute major aspects client-side
   from the decoded longitudes and derive whole-sign cusps from the ASC when
   present, instead of rendering `cusps={null} aspects={[]}`. A received link
   must support a real reading.
5. **The Reddit chart sheet.** New export composition in `share-card.ts`: one
   tall PNG — wheel + full positions table (every point: sign, degree°minute′,
   house) + aspect grid + a stamped settings line ("Whole sign · Tropical" or
   as configured) + small corner "zodiacs.org" wordmark. Nothing else on the
   image: no QR, no CTA, no URL slogan. ≥1600px short edge; dual-label key
   points (glyph + short text); verify legibility at 33% zoom. Include a
   "Hide birth details" toggle: positions/houses/degrees intact, birth-data
   line replaced by the settings line. Keep it lazy-loaded (budgets).
6. **Dynamic link preview.** New Vercel edge function (e.g. `api/og/chart`)
   using `@vercel/og`/satori: renders a big-three/signature OG card from a
   positions-only v2 token passed as `?p=` query param. No storage, no birth
   data ever server-side, self-contained assets (no external fetches). In the
   share dialog this is an explicit opt-in "Copy link with preview" beside the
   default private fragment link, with one dry sentence explaining the
   difference. The share/OG surfaces must contain zero Registry links
   (packet C's CI check should cover the share templates).

Acceptance: from a computed chart on mobile, one tap reaches the native share
sheet with the chart-sheet PNG; positions-only link round-trips into a readable
chart (houses + aspects present); preview link unfurls with that chart's card;
moon/rising results shareable; `/birth-chart/` budget still ≤69KB gz.

## Packet E — Link-graph surgery

1. With a scope allowance: add a horoscope band to the sign-guide template
   ("Aries today · this week · this month" → `/horoscopes/{sign}/…`), and a
   "Full {Sign} guide →" link on `src/components/HoroscopeProgramPage.astro`.
2. Add the STRATEGY §9 guide-footer hook: "Is {Sign} your sun sign? Add it to
   your profile." (profile store API is `src/lib/profile/store.ts`).
3. Append "Read Moon in {sign} →" links to `ReadingPath.tsx` story cards and
   the deep-read module footers, targeting the existing
   `/learn/placements/…` pages.
4. Calendar hubs link their event pages: `/full-moon-calendar/` rows →
   `/full-moon/{date}/`, `/eclipses/` → `/eclipses/{date}/`
   (`src/data/events-publication.json` maps paths).
5. Nav: add "All tools →" to the Tools dropdown and mobile menu; make
   `src/lib/nav-tools.ts` the single source of truth for the nav, footer, and
   `/tools/` hub lists (currently three divergent lists).
6. Point the ES homepage hero CTA at real content instead of the noindex
   "not translated" stub — use the RU pattern (English href + "— por ahora en
   inglés" annotation).

Acceptance: guides and horoscopes bidirectionally linked; a chart result links
into the placements library; check-dist passes (it validates every dist link).

## Packet F — Prune the thin tail

1. Localized birthday pages (`src/pages/{es,fr,it,pt}/birthday/[slug].astro`,
   ~1,460 pages of template boilerplate): add noindex and remove from the
   sitemap until they carry translated editorial bodies.
2. `/people/`: fix the "a axis" article bug in the copy generator (appears 18×
   in `src/data/people.json` output — fix the generator, regenerate); keep the
   ~100 most-searched people indexable via the existing `INDEXABLE_PEOPLE`
   mechanism; noindex the tail.
3. RU sign guides (`src/data/ru-guides.ts` — one mad-libs skeleton × 12):
   noindex until genuinely rewritten. Do not rewrite them in this run.
4. Sitemap: drop the `/llms.txt`, `/llms-full.txt`, and
   `/registry/zodiacs.registry.json` entries (`src/lib/legacy/urls.ts`).

Acceptance: sitemap contains no noindexed URL (existing invariant); indexable
page count drops materially; no consumer link 404s.

## Packet G — Content deadlines (time-critical, do alongside A)

1. Draft the 2026-09 monthly horoscopes (12 files) per
   `docs/HOROSCOPE-GENERATION.md`, grounded in `src/data/transits-2026-09.json`
   — every dated claim must exist in the transit JSON. Open as a DRAFT PR
   clearly marked for human editorial review; do not flip `draft:false`
   yourself. The freshness gate (`scripts/verify-horoscope-freshness.mjs`)
   blocks deploys if the month rolls over empty.
2. Add a workflow that opens an issue on the 20th of each month if next
   month's horoscope files are missing.
3. Draft the September almanac entry (`src/content/almanac/`) in the style of
   `sky-2026-08.mdx`: NASA-cited, exact UTC receipts. Draft PR, human review.

## Packet H — SERP flank pages (only after A–G are merged; split over 2 weeks)

Week 1 (≤10 indexable pages): `/synastry/` lander (mount the existing
`SynastryCalculator`, synastry-vocabulary copy, distinct title/meta/JSON-LD);
`/learn/big-three/` (1,500+ words, three calculators embedded);
`/horoscopes/weekly/` and `/horoscopes/monthly/` all-sign hubs from the program
JSON. Week 2: the 12 `/compatibility/{sign}/` hub pages, each linking its 12
existing pair pages; enrich pair-page titles with love/friendship/marriage
modifiers. Every page: working tool or computed data (Growth OS "earn the
index" rule), full SEO component usage, internal links from the relevant hubs.

## Owner-only actions — surface these in your final report, do NOT attempt

- Vercel env: `PUBLIC_PLAUSIBLE_*`; `EMAIL_PROVIDER` + Resend keys;
  `DAILY_EMAIL_ENABLED=1`; `DIGEST_ENABLED` decision (or hide the /profile/
  checkbox — flag this choice to the owner); `PUSH_ENABLED` stays off for now.
- Google Search Console + Bing verification (DNS) and sitemap submission.
- Manual verification of r/AskAstrologers and r/astrologyreadings sidebar
  rules; all Reddit seeding is human-only.
- Publishing the 25 finished Pinterest pins (`public/assets/og/v2/pin/`).
- Recruiting the human reviewer for the E-E-A-T layer.

## End-of-run report

For each packet: PR link, what changed, check results (build/check/test/
check-dist/budgets), anything deferred and why, plus the owner-action checklist
above with exact env var names. Decision and evidence quality per the Growth OS
record format; link the durable record.
