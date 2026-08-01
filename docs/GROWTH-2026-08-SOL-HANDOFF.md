# Growth review response — August 2026 (SOL handoff)

**Context.** The owner received an outside strategic assessment (ChatGPT Pro) of
zodiacs.org's path to top-10 astrology traffic. This document is the verified
response: what the assessment got right, what it got wrong against the actual
repo, and the ordered work plan for SOL to implement. Companion strategy docs:
`docs/STRATEGY.md` (operating strategy), `docs/MASTER-PLAN.md` (2026-07-10
evidence-based audit — still current; this plan builds on it, not over it).

Every claim below is checked against the repo as of `main` @ 64320b3.

---

## 1. Verdict on the assessment

**Directionally right on strategy, materially stale on facts.**

The core thesis — "many good reasons to visit once, no irresistible reason to
return daily; concentrate on the loop *chart → saved identity → personalized
daily sky → alert → Ask → share → return*" — is correct and matches what
`docs/MASTER-PLAN.md` already concluded independently. Its two concrete bug
reports are both real (§2). Its priority ordering is broadly the one this repo
has been executing since Phase 3.

But the assessment audited the site as a crawler and missed most of what has
shipped. Corrections that change the plan:

| Assessment claims missing | Actual state |
|---|---|
| Embeddable widgets + "Powered by" | Shipped: `/widgets/`, `/embed/moon|sky|chart` (`src/pages/embed/`, `src/pages/widgets/index.astro`) |
| Public calendar feeds | Shipped: `/feeds/` (daily-sky, horoscopes, events, almanac XML), `transits/sample.ics`, `api/calendar` |
| Sourced notable-people knowledge graph | Shipped Phase 5: `/people/` (`src/data/people.json`, source-quality discipline per `PHASE5-PEOPLE-*` docs) |
| Chart-grounded Ask (not a generic chatbot) | Shipped: Ask answers from a site-built context (`api/_assistant/context.ts`), names sources, attaches saved-chart placements only after user previews the exact text (`src/pages/ask/index.astro`), with grounding/red-team evals in `docs/phase6/eval/` |
| Solar returns | Shipped: `/solar-return/` |
| Email / push / calendar return mechanisms | Shipped: `api/push`, `api/email`, `PushOptIn.tsx`, PWA (`public/sw.js`), weekly digest (`docs/WEEKLY-DIGEST.md`), streaks on `/today/` |
| Share cards + private chart links | Shipped Phase 4: fragment-encoded server-blind share links, OG v2 cards sitewide |
| "Substantial ES content, other locales thin" | Six locales live (EN/ES/FR/IT/PT/RU) with per-locale tool pages; parity gaps are real but narrower than claimed |

**What it found that we had not:** the two crawler-visible reliability defects
in §2. That alone made the review worth having — an outside crawler sees what
our build-time checks (`check-dist.mjs`) structurally cannot: the *rendered,
dated* state of the live site.

**What it's right about that remains genuinely open:**

1. The pieces of the daily loop exist but are not yet **one dominant surface**
   — Today, saved charts, transits, Ask, digest are adjacent products, not a
   single "My Sky" home. (Agrees with MASTER-PLAN's verdict.)
2. **The chart is still furniture** — the Living Birth Chart (synchronized
   wheel ↔ table ↔ prose ↔ transits) is the identified moat and is unbuilt.
   (MASTER-PLAN §1 said exactly this with file-level evidence: `Wheel.tsx` has
   zero event handlers.)
3. **Astrocartography does not exist** and is the strongest missing product:
   high search demand, visual/viral, and a natural extension of an engine we
   own client-side.
4. **Authority/backlinks (3/10) is fair.** The assets exist (widgets, feeds,
   people graph, methodology); the *distribution program* around them doesn't.
   Most of that program is business operations, not code — but the code-side
   prerequisites are listed in §5.
5. **No production monitoring.** MASTER-PLAN also flagged: no analytics/RUM
   exists at all.

**Where we push back — do not implement these as proposed:**

- **"Quarantine the Registry (subdomain, separate nav/metadata)."** Declined.
  The Part-Q architecture already does the part that matters: hard *content*
  separation (no token/market language in consumer journeys, CI vocab gates
  enforce it), records-register-only bridges, one nav label. A subdomain move
  would burn URL equity and re-litigate an owner-directed decision. The one
  real leak the assessment gestured at is already on MASTER-PLAN's defect
  list and IS in scope here: the consumer `Organization.sameAs` fusing the
  token project's identity into the consumer knowledge-graph entity (§4, P0-4).
- **"Add a named advisory board / expert reviewers."** Partially declined.
  Recruiting real astrologers is an owner/business decision, not buildable.
  What SOL *can* build is the scaffolding so that the day a real reviewer
  exists, their identity is structural: author/reviewer pages, `Person` +
  `reviewedBy` JSON-LD, per-page provenance labels (computed / AI-drafted /
  human-reviewed). Build the shelf, let the owner fill it. Never a fictional
  editor — the site's stated transparency position is a differentiator.
- **"3M–5M monthly visits" framing.** Fine as ambition; ignore as a planning
  input. The number that matters next quarter is unchanged from STRATEGY §16:
  tool completion → save → return rate. We currently cannot measure it
  (no analytics), which is why instrumentation is P1, not P3.
- Everything on its "would not prioritize" list (native app, forum, paywall,
  redesign, industrial horoscopes, tarot/numerology) — agreed, and already
  our stated policy. No action.

---

## 2. Verified defects (fix first — these damage the trust proposition)

### P0-1 · `/transits/` renders "The sky in December 2030" — real bug, all six locales

`latestTransitMonth()` (`src/lib/horoscopes.ts:43-46`) returns the *latest*
committed transit month. The repo now carries `src/data/transits-*.json`
through **2030-12**, so every transits page statically renders the December
2030 events block as if it were the current sky:

- `src/pages/transits/index.astro:10` (+ `es`, `fr`, `it`, `pt` twins; `ru`
  has a transits page too — verify its data path)

**Fix:** add `currentTransitMonth()` — the month containing the build date if
its file exists, else the latest month **≤ today** (never a future month).
Use it for the "The sky in {label}" display on all transits pages. Keep
`latestTransitMonth()` for `warnIfStale()` (staleness is correctly measured
against the latest file). Add a vitest: with files through 2030-12 and a
mocked today of 2026-08, the display month is `2026-08`; with only past files,
it's the latest past month; it is never `> today`'s month.

**Follow-up decision for the owner (flag, don't act):** whether pre-committing
transit JSON to 2030 is intentional. If the files exist to serve `/horoscopes/
[sign]/2027/` and the events catalog, keep them — the display fix makes them
harmless. If not intentional, prune to a rolling +13 months in the monthly cron.

### P0-2 · `/today/` shows "temporarily unavailable" to crawlers

`src/islands/today/TodayBrief.tsx:158` and `SunSignFallback.tsx:114` put the
string "Your saved-chart comparison is temporarily unavailable" in the SSR
DOM unconditionally (visibility is toggled by class/aria after hydration). A
crawler reads it as a standing outage on the site's flagship daily page — and
it's quoted verbatim in the outside review as a trust strike.

**Fix:** the failure message must not exist in server-rendered HTML. Render it
client-side only, when `comparisonUnavailable` is actually true (the state is
already computed at `TodayBrief.tsx:113-115`); or at minimum wrap the status
node in `data-nosnippet` AND ensure it's absent from the static DOM. While
in there, reword to state a fact instead of an apology, per voice rules:
"This browser hasn't loaded your saved chart yet — the {sign} Sun reading
below is complete." Apply to both components and any locale twins.

### P0-3 · Production smoke monitor (the class fix, so this never recurs)

`check-dist.mjs` validates the *built* artifact; nothing validates the *live,
rendered, dated* site — which is exactly where both defects above were
caught by an outsider. Add `.github/workflows/production-smoke.yml`, daily
after the 00:15 UTC sky cron, Playwright against production:

- `/today/` + locale twins: today's date renders; the string "temporarily
  unavailable" (and locale equivalents) is not present in rendered text.
- `/transits/` + twins: the "sky in" month equals the current UTC month.
- `/horoscopes/{sign}/`: today's edition date, every locale that has one.
- `/birth-chart/`: city typeahead returns results; compute completes for a
  fixture birth; result is non-empty (catches broken location search and
  empty chart states).
- Sitemap `lastmod` sanity; canonical + hreflang reciprocity spot-check on
  3 representative pages; JSON-LD parses on home, a sign guide, a horoscope.
- Any failure opens/updates a GitHub issue. No silent red.

Standard to encode: **no current-sky page may silently show a wrong or
unexplained date.**

### P0-4 · Consumer entity hygiene (from MASTER-PLAN, in scope now)

Split the consumer `Organization` JSON-LD from token-project identities
(`sameAs` → astrofolio properties) so search engines don't fuse the entities.
This — not a subdomain — is the correct version of the review's "separation"
concern. Also from MASTER-PLAN's HIGH list while we're at it: remove or
surface the invisible FAQPage JSON-LD on `/compatibility/`; wire the IndexNow
ping into the daily deploy.

---

## 3. P1 (next ~90 days): one loop, measured

### P1-1 · Instrument the funnel (prerequisite for everything)

Privacy-light, cookieless analytics (self-hosted Plausible-class or edge
counters — owner picks vendor; no PII ever, consistent with the privacy
promise). Events: the four STRATEGY §16 conversion flows — tool completion,
save, second chart, return-visit to Today, share created, Ask session, push/
digest opt-in. Without this we cannot tell whether any of the below works.

### P1-2 · Make Today the post-save home ("My Sky")

The single largest agreement with the review. Today already has streaks, the
saved-chart comparison, and sun-sign fallback. Missing to make it *the* home:

- **Top 3 transits for the saved chart** as the lead module (data exists:
  `selectTodayContacts` already computes contacts, `TodayBrief.tsx:100-110`).
- **"What changed since yesterday / what's approaching (7d, 30d)"** — a
  diffed timeline from the same transit selection, small and factual.
- **Saved-people module:** when ≥2 charts are saved, one line on today's sky
  vs. the strongest synastry contact, linking into `/compatibility/`.
- **Post-chart handoff:** the birth-chart result's final CTA becomes
  "See what today's sky does to this chart →" (records-register tone), and a
  returning visitor with a saved chart gets Today content surfaced from the
  homepage hero area. Save → Today must feel like one product.
- Push/digest opt-in offered at the moment a transit is *approaching*, not as
  a generic banner ("Saturn stations on your natal Sun on Aug 14 — want a
  note that morning?").

### P1-3 · Living Birth Chart, phase one (SVG, no rebuild)

Execute MASTER-PLAN's core prescription — the chart becomes explorable:

- `Wheel.tsx` gets selection state: tap/click/focus any planet → highlights
  its sign, house, aspect lines; placements table row, aspects list entries,
  and the relevant guided-reading paragraph scroll/glow in sync. Full
  keyboard + screen-reader support (also clears MASTER-PLAN's "zero focus()
  calls" defect for this island).
- Current-sky overlay toggle on the natal wheel (transiting positions as an
  outer ring — the engine and daily data already exist).
- "What makes this chart unusual" — 2–3 computed distinctions (tightest
  aspect, most-occupied house, rarest placement vs. the birthday baseline
  data), stated dryly with degrees, per voice rules.
- This interaction exists nowhere on the free web (MASTER-PLAN competitive
  audit). It is the moat; it ships before any new calculator.

### P1-4 · Ask Zodiacs: from panel to loop member

Ask is already grounded and evaluated. Wire it into the loop:

- Entry points from computed moments: on Today's transit lines and the chart
  result's aspects — "Ask why this matters" pre-fills a grounded question
  with the exact placement/transit attached (existing consent-preview flow).
- Every Ask answer that cites a placement links back into the Living Chart
  with that placement selected (the P1-3 selection state makes this a URL
  fragment).
- Keep the existing quota/privacy/eval discipline unchanged.

---

## 4. P2 (months ~2–5): the breakout product

### P2-1 · Astrocartography

The one major review recommendation that is both absent and right. Natural
fit: we own the engine client-side, so relocation math is private by
construction — no competitor can say that.

- **Math:** MC/IC lines are meridians of geocentric right ascension
  (straight in Mercator); AC/DC lines are the horizon-crossing curves solved
  from each body's RA/dec — all derivable from `astronomy-engine` equatorial
  coordinates already exposed in `engine/full.ts`. No new ephemeris dependency.
  Add engine test vectors against astro.com's ACG for two fixture charts
  (same gating discipline as `engine.test.ts`).
- **Product v1:** `/astrocartography/` — world map (self-hosted vector
  basemap, no external tiles — CSP/privacy), the 4 angle lines × 10 bodies
  with per-line plain-language explanations, city search reusing the GeoNames
  index ("what's within orb of {city}"), compare-current-city-vs-destination,
  save lists to the profile, share card. Bundle-isolate the map exactly like
  the ephemeris (`report-bundles.mjs` allowlist).
- **SEO cluster only after the tool works:** `/astrocartography/{line}/`
  explainer pages (40 pages: 10 bodies × 4 angles), each embedding the tool —
  STRATEGY §15's "earn the index" rule applies.

### P2-2 · Advanced charts, by demand order

Progressions (secondary), composite, annual profections — in that order,
gated on P1-1 search/usage data before each. Chiron + nodes via the
precomputed JPL daily-longitude table already specified in STRATEGY §11
(closes the methodology page's honest "not yet supported" gap). Each new
system ships with test vectors or it doesn't ship.

### P2-3 · Authority scaffolding (code side of the review's §2)

- Reviewer/author infrastructure per §1's pushback: `Person` pages,
  `reviewedBy`/`author` JSON-LD, provenance labels. Ships empty-but-real.
- **"State of the Sky" annual report** page template fed by the events
  catalog + pulse data — the citable original-research asset; owner writes
  the narrative, we compute every number.
- Widget/feeds adoption push is content + outreach (owner), but add a
  `/widgets/` analytics beacon (count of embeds by origin, privacy-light) so
  the program can be measured.

---

## 5. Explicitly not doing (so nobody re-opens these)

Registry subdomain migration · fictional editors or unnamed "experts" ·
native app · community/forum · paywall on calculations · industrial daily
AI horoscopes beyond the existing transit-grounded pipeline · tarot/
numerology · visual redesign (Cosmic Void stands) · new locales before
EN/ES/PT parity (review's §7 is right: depth beats breadth — measure P1-1
first).

---

## 6. Order of execution for SOL

1. **P0-1 → P0-4** in one PR series (small, verifiable, trust-critical).
   `npm run build && npm run check && npm test && node scripts/check-dist.mjs`
   green on each; the new smoke workflow must pass against production before
   the series closes.
2. **P1-1** (instrumentation) immediately after — it baselines everything.
3. **P1-2 and P1-3** in parallel tracks; P1-4 follows P1-3's selection-state
   URLs.
4. **P2-1** only after P1 ships; feasibility spike (ACG math + test vectors)
   may start earlier in parallel.
5. Re-audit against this doc at each phase close, per repo convention
   (`PHASE*-REVIEW.md`).

Voice rules, content-boundary rules, and generated-file rules in `CLAUDE.md`
bind every item above. No token language on any new consumer surface,
including Ask prompts, ACG pages, and smoke-test issue text.
