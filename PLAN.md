# Zodiacs.org household-name program

Last updated: 2026-07-19

Active phase: **Phase 1 — The Daily Horoscope Engine**

## Authority and operating rule

The owner-supplied **MASTER BUILD BRIEF — zodiacs.org: From Reference Site to Household Name** dated 2026-07-19 controls this six-phase program. This file is its operational source of truth.

`docs/MASTER-PLAN.md` remains useful as a historical product, design, trust, and engineering audit. Where it conflicts with the new brief, it is superseded. In particular, its decisions to avoid daily horoscope expansion, push, a people directory, and an AI assistant no longer control; those are now Phases 1, 3, 5, and 6. Its Cosmic Void design rules, privacy posture, computation standards, performance budgets, and trust findings continue to apply where they do not conflict.

Phases are strict gates. **No work may begin on the next phase until every item in the active phase's Definition of Done is verified and logged here.** A phase is not complete because its code exists; it is complete only when its content, operations, accessibility, performance, and automated-run evidence all pass.

Execution is AI-only:

- Sol Ultra owns implementation, deterministic verification, and release evidence.
- Fable owns adversarial product, visual, motion, and editorial review of each new template family.
- A generator may not approve its own output. Facts audit, copy verification, and the final deterministic publishing gate remain separate roles.
- Organization authorship remains truthful. Do not invent a human editor or put a prominent “AI-operated” badge on reader-facing pages. Explain the editorial system calmly on About/Methodology and in machine-readable provenance.

## Phase 0 audit summary

### Platform and rendering

- Astro 7 is the primary build system. Pages under `src/pages/` are statically pre-rendered; Preact islands add client behavior without owning crawlable content.
- Content collections under `src/content/` drive guides, compatibility pairs, Learn, birthdays, almanac entries, and the existing monthly horoscopes.
- Vercel serves the static build and the isolated TypeScript functions under `api/`.
- The Registry is a preserved legacy wing under `public/`. Its generated files have explicit builders and drift gates. The six-phase program must not modify the Registry, SDK pages, existing sign guides, existing Learn copy, or locale trees except for the additive links named in the brief.
- `Base.astro`, `SiteNav.astro`, and `SiteFooter.astro` are the shared layout, navigation, footer, metadata, analytics, and progressive-enhancement boundary.

### Design system

- Core surfaces use the `#060709` void family, cool ink and hairline tokens, 4px-based spacing, radii from 8px to 30px, and 180/420/800ms motion tokens in `src/styles/tokens.css`.
- Typography is self-hosted: EB Garamond for display, Instrument Sans for body/UI, and JetBrains Mono for data receipts.
- The twelve pastel zodiac hues are the only chroma. Their current source values and approximate OKLCH equivalents are:

| Sign | Source | Approximate OKLCH |
| --- | --- | --- |
| Aries | `#DE8E79` | `oklch(72.4% 0.103 35.4)` |
| Taurus | `#B9D4BE` | `oklch(84.4% 0.042 150.7)` |
| Gemini | `#B29DD0` | `oklch(73.2% 0.076 303.4)` |
| Cancer | `#B6D4E4` | `oklch(85.3% 0.039 231.1)` |
| Leo | `#E0A9B4` | `oklch(78.9% 0.066 5.4)` |
| Virgo | `#B7D9B0` | `oklch(85.0% 0.067 140.3)` |
| Libra | `#D3A9DE` | `oklch(79.0% 0.087 319.2)` |
| Scorpio | `#B9DCE8` | `oklch(87.3% 0.040 220.6)` |
| Sagittarius | `#E0B080` | `oklch(79.0% 0.084 66.1)` |
| Capricorn | `#C0DEA8` | `oklch(86.5% 0.079 131.5)` |
| Aquarius | `#AE8FC9` | `oklch(69.9% 0.090 308.6)` |
| Pisces | `#A9D4C4` | `oklch(83.5% 0.050 170.4)` |

New work reuses these tokens. It introduces no new decorative color, chrome language, framework, or font.

### SEO, structured data, and distribution

- `src/pages/sitemap.xml.ts` is a custom sitemap because it must cover both Astro routes and legacy `public/` pages. Every new route family must be added there with truthful `lastmod` values.
- `SEO.astro` and `Base.astro` provide canonical, OG, and JSON-LD patterns. Existing pages use Article, CollectionPage, ItemList, BreadcrumbList, FAQPage, and application schemas.
- The current share-card pipeline is `scripts/build-og-void.mjs` → `public/assets/og/v2/`, verified by `scripts/verify-og-cards.mjs` and the dist gate.
- Existing feeds are `/feeds/daily-sky.xml`, `/feeds/horoscopes.xml`, and `/feeds/almanac.xml`. Phase 1 adds twelve daily sign feeds.
- Analytics is a cookieless, allowlisted Plausible-compatible shim. With no configured script URL it emits no provider script and all tracking calls become no-ops.

### Internationalization

- Locale routing and UI catalogs live under `src/lib/i18n/`; current locale roots are `/es/`, `/pt/`, `/fr/`, and `/it/`.
- This program is English-first. New templates must keep data and strings separable for later translation, but must not add machine-translated locale pages.

### Computation and current horoscope pipeline

- Browser chart computation lives under `src/lib/engine/`. `engine/full.ts` is the only browser module allowed to import the ephemeris; `server-ephemeris.ts` is the server-only adapter. Bundle checks enforce the boundary.
- Daily facts are computed by `scripts/daily-snapshot-lib.mjs` and `scripts/build-daily.mjs` into `src/data/daily.json`: Moon sign and phase, ten body positions, retrograde state, ingresses, lunations, stations, and exact aspects.
- `src/lib/daily.ts` maps those facts to each Sun sign with whole-sign solar houses.
- `src/lib/daily-publication.ts` produces a versioned, evidence-linked publication and enforces the editorial constitution, lexicon, source references, deterministic regeneration, and pairwise distinctness. The committed publication and manifest live in `src/data/daily-publication*.json`.
- Current daily prose is deterministic-template output. The existing constitution correctly forbids unreceipted free-form model output from publishing. An optional model-assisted mode may be added only behind the Phase 1 gate described below.
- Existing monthly prose is stored as twelve MDX entries per month under `src/content/horoscopes/`, grounded in `src/data/transits-YYYY-MM.json`.
- `.github/workflows/daily-horoscopes.yml` computes, verifies, replays, commits, deploy-verifies, and IndexNow-pings the daily edition at 00:15 UTC. `.github/workflows/transits-monthly.yml` computes the next month's event catalog on the 25th.

### Backend and external dependencies

- Supabase already supports magic-link auth, RLS-protected profile/chart sync, chart-deletion tombstones, and weekly-digest opt-in. Assistant quota and push-subscription surfaces also exist; their production schema must be migration-backed before their flags are enabled.
- Email capture supports Resend, Buttondown, or Loops and fails closed when the chosen provider is incomplete. The program standard is Resend so capture, confirmation, and automated sends use one provider.
- Push, weekly digest, Registry Aura, wallet chart, analytics, and Ask Zodiacs all have off-by-default or configuration-dependent behavior. Exact setup is consolidated in `SETUP.md`.
- The static site builds without server credentials. This remains a release invariant for all phases.

### Editorial voice

- Plain language, short sentences, calm specificity, and checkable UTC receipts are the house voice.
- Astrology is framed as a traditional or symbolic lens, not a causal certainty. No medical, legal, financial, pregnancy, or fertility predictions.
- No exclamation marks in generated horoscope copy. Keep the banned AI-tell list and the existing “smug tell” list enforced in code.
- A page should say what the sky data is and what the tradition makes of it, without boasting about computation or automation.

### Confirmed Phase 1 bugs

- **Fixed:** the hub's “today” line is no longer identical across all twelve signs. The publication gate asserts zero exact duplicates and bounded pairwise similarity.
- **Fixed:** `/today/` now server-renders the Sun-sign experience, with saved-chart comparison added as an enhancement. The browser suite verifies the no-JavaScript path.

## Architecture decisions

### Program-wide

1. Keep Astro, static generation, content collections, and small Preact islands. Add no framework.
2. Crawlable meaning, navigation, dates, and fallback content must be complete in HTML before JavaScript.
3. Keep facts, interpretation, and presentation separate. Committed fact catalogs are the only source of astronomical claims.
4. Every server-dependent surface is off by default, has one explicit flag, and leaves a useful static page when unavailable.
5. Preserve the existing design tokens and pastel sign icon system. One orchestrated animation maximum per phase; all other motion is short transform/opacity feedback with reduced-motion fallbacks.
6. New runtime dependencies require a one-line justification in this file before installation. Current decision: none are required for Phase 1.
7. Every generated artifact has a deterministic builder, schema validation, and a CI drift or regeneration check.
8. Every phase closes with screenshots at 360px and 1280px, keyboard review, a reduced-motion pass, a cold read of three pages, and one accessory removed.
9. Reader pages serve the interpretation before the machinery. Exact positions, evidence receipts, and production details remain fully available in an optional keyboard-, touch-, and no-JavaScript-safe disclosure; hover is never the only route to trust information.

### Phase 1 — Daily Horoscope Engine

- `/horoscopes/{sign}/` becomes the canonical daily page. Existing monthly prose moves intact to `/horoscopes/{sign}/monthly/`; no redirect is needed because the old stable URL remains live as the daily canonical, but every old monthly internal link, feed entry, title, and canonical must be updated.
- One shared route/data contract renders Today, Tomorrow, Weekly, Monthly, Love, Career, and 2027 without duplicating computation or UI logic.
- Daily, tomorrow, love, and career are UTC editions. Weekly uses ISO weeks and changes Monday at 00:00 UTC. Every page prints its edition date or week and the computation basis.
- Daily facts and solar-house mappings remain deterministic. The same source events must drive prose receipts, sky strip, feeds, schema dates, event links, and verification.
- The deterministic phrase-library renderer remains the no-key fallback. A model-assisted build is permitted only when it consumes the facts record, emits structured evidence references, passes an independent fact audit and copy verifier, and produces the same signed manifest contract. `DAILY_PROSE_ENABLED` stays off until those checks exist.
- The existing daily workflow is extended rather than duplicated. It generates today/tomorrow/love/career every day and weekly content on Mondays, then proves the live edition before IndexNow notification.
- Yearly pages are derived from a committed 2027 catalog of major ingresses, eclipses, and retrograde periods mapped to solar houses. They must be live and indexable before 2026-10-01.
- A quiet sky strip uses existing ticker patterns and no more than one subtle line of motion. It cannot delay LCP.

### Phase 2 — Event Pages

- Generate a deterministic 2026–2030 event catalog from the existing ephemeris and eclipse data.
- Use exact-date canonical event URLs, not month-only URLs, because a month may contain multiple events of the same class. Examples: `/full-moon/2026-07-29/`, `/new-moon/2026-08-12/`, and `/eclipses/2026-08-12/`. Month/year aliases may redirect only when unambiguous.
- Astronomy and UTC instant come first; interpretive and twelve-sign sections follow. Nearby daily pages link to an event within approximately five days using the catalog, never prose inference.

### Phase 3 — Habit Layer

- Use Supabase only for consented subscription/profile state and Resend for mail delivery.
- Sun-sign subscriptions store normalized email, sign, consent state, and delivery timezone only. Chart-tier mail is limited to account-sync users who opt in; device-only charts stay device-only.
- Daily local-time delivery runs as an hourly idempotent batch and selects the 07:00 local cohort; unknown timezones use 07:00 UTC.
- PWA shell remains network-first for HTML and never caches Registry authority JSON. Push is separately gated and frequency-capped.

### Phase 4 — Compatibility Invite and Share Loop

- Invite records are short-lived, revocable, RLS-protected, and hold only Person A's explicitly consented chart payload plus a 14-day expiry.
- Person B computes locally. B's details are not written unless B explicitly saves or creates an account.
- Share cards render client-side from the existing visual system. No chart payload is uploaded to make an image.

### Phase 5 — People and Birthdays

- Public-figure facts come only from a reviewed repository data file sourced to Wikidata/Wikipedia. Do not scrape astrology sites or Astro-Databank.
- Unknown birth time means a noon chart with houses/rising omitted and a prominent data-quality label.
- Generate static templates from data, not hand-maintained pages. Index only pages that pass content-depth and provenance checks.

### Phase 6 — Ask Zodiacs

- Extend the existing isolated assistant endpoint into `/ask/`; do not move model code into the page bundle.
- Send a structured chart summary only after plain-language consent. Do not retain conversations or chart summaries.
- Retrieval uses the site's own corpus and event/fact records. At least 90% of sampled substantive answers must include relevant internal source links.
- The existing `ASSISTANT_ENABLED` server flag remains the kill switch. Flag-off `/ask/` is a useful static guide, not an error shell.

## Phase gates

| Phase | Entry gate | Definition of Done |
| --- | --- | --- |
| 0. Audit | Program starts | Codebase/backend/design/editorial audit captured; `PLAN.md` and `SETUP.md` exist; conflicts resolved. |
| 1. Daily engine | Phase 0 complete | 85 required routes pre-rendered; `/today/` complete without JS; 2027 pages indexed; fact vectors and distinctness pass; per-sign RSS; every template passes Lighthouse ≥95 three times; three consecutive automated daily runs proven. |
| 2. Event pages | Phase 1 complete | Hub and all 2026–2027 event pages live; 2026–2030 catalog tested; nearby-event cross-link proven; sitemap/schema/OG complete; each template passes Lighthouse ≥95 three times. |
| 3. Habit layer | Phase 2 complete | Double opt-in and unsubscribe verified; three automated test-list sends; correct chart-tier test brief; installable offline-capable PWA; push separately gated; setup instructions reproducible. |
| 4. Sharing loop | Phase 3 complete | A→B→conversion, expiry, and revocation proven; B makes no unconsented writes; share cards pixel-reviewed at 1×/2× mobile; share/download analytics pass. |
| 5. People directory | Phase 4 complete | 500 people + 366 birthday pages live; schema/sitemap complete; 20 sampled charts verified; provenance and data-quality label on every person; no thin indexed pages. |
| 6. Ask Zodiacs | Phase 5 complete | Grounded chat behind flag; ≥90% internal-link sample; written red-team passes; rate limit and disclosure proven; static fallback useful. |

## Current Phase 1 status

Local implementation is **85 of 85 required routes pre-rendered**: the hub plus seven surfaces for each of the twelve signs. The deterministic phrase-library renderer remains the deliberate no-key publishing mode; model-assisted prose stays disabled until its independent fact-audit contract exists.

### Locally complete and verified

- [x] Deterministic daily sky snapshot with positions, Moon phase, events, UTC receipts, and whole-sign solar-house translation.
- [x] Versioned publication schema, editorial constitution, evidence references, manifest hashes, fail-closed verification, and pairwise-distinctness gates.
- [x] Full Moon on 2026-07-29 and Mercury retrograde on 2026-07-18 regression vectors.
- [x] Daily-first `/horoscopes/{sign}/` canonicals and separate tomorrow, weekly, monthly, love, career, and 2027 routes for all twelve signs.
- [x] All prose-length contracts pass: daily/tomorrow 90–140, weekly 200–300, love/career 60–100, and yearly 1,200–1,800 words.
- [x] Shared sky strip, breadcrumbs, period navigation, FAQ where useful, unique metadata, canonicals, Article/Breadcrumb schema, sitemap entries, OG assets, and source notes.
- [x] Twelve distinct hub teasers and twelve per-sign daily RSS feeds with feed discovery.
- [x] Server-rendered `/today/` and horoscope pages remain complete without JavaScript; saved-chart behavior is progressive enhancement.
- [x] Route, length, voice, fact-reference, distinctness, schema, sitemap, RSS, OG, and named-vector checks pass.
- [x] All seven surfaces pass browser QA at 360px and 1280px, with no-JavaScript coverage and 224 assertions.
- [x] Three-run mobile Lighthouse gates pass every new template: performance 98–99, accessibility 100, SEO 100, CLS ≤0.002, and TBT 0ms.
- [x] Static build, Astro check, dist integrity, schema validation, and bundle budgets pass; the build pre-renders 3,419 pages.

### External Phase 1 close gates

- [ ] Deploy the 85 routes, confirm that all twelve 2027 pages are publicly indexable, and submit the live canonicals for discovery.
- [ ] Log three consecutive scheduled daily publications on the live site without manual intervention.

Phase 2 remains locked until both external gates are complete. Local code readiness alone does not open Phase 2.

## Release evidence required at every phase close

- Full clean run: `npm run build && npm run check && npm test`.
- Dist integrity, schema, bundle, drift, browser, and feature-specific suites all green.
- No-server-secret build and flag-off build both green.
- Screenshots at 360px and 1280px for every new template type, plus reduced-motion and keyboard evidence.
- Three cold-read pages pass facts, voice, uniqueness, and “could this be generic?” review.
- Canonical/redirect matrix, sitemap membership, RSS where applicable, OG existence, and JSON-LD validation recorded.
- Lighthouse reports show ≥95 performance/accessibility/SEO on mobile for three runs per template.
- Operational phases include the consecutive scheduled-run evidence named in their DoD.

## Program backlog, outside the six phases

- Vedic/sidereal mode and nakshatras.
- Public API and additional embeddable widgets.
- Numerology wing.
- Additional locale expansion.

Keep clean data and route seams for these; do not implement them inside this program.

## Change log

### 2026-07-19 — Meaning-first presentation sweep

- Adopted the site-wide reader hierarchy: interpretation first, useful action second, optional astrological rationale third, and exact evidence or production method in a native closed disclosure.
- Added one shared Astro/Preact evidence-disclosure pattern and applied it to Today, saved-chart readings, birth-chart receipts, transit and relationship results, solar returns, profiles, Moon/rising tools, birthday pages, compatibility pairs, About, feeds, and supporting SEO/PWA copy.
- Revised the six-surface horoscope renderer to v3 so daily, tomorrow, weekly, love, career, and yearly passages open with meaning or action before naming the sky mechanic. Removed repeated monthly-method boilerplate without altering the preserved readings themselves.
- Kept uncertainty, privacy, permission, and share-exposure notices visible. Exact positions, aspect orbs, timestamps, publication provenance, and automation details remain inspectable by keyboard, touch, and no-JavaScript users; direct planet-selection actions still return the requested longitude immediately.
- Added a production copy gate that rejects backstage language on default-visible consumer pages while allowing explicit Methodology/trust routes and closed evidence disclosures. Replaced the reader-facing “AI-operated” label with calm, truthful organizational language.
- Verified a 3,419-page production build, dist integrity, schema, bundle budgets, share cards, 30-day editorial replay, 372 horoscope evidence receipts, and 45 independently checked transit events. Browser acceptance passed 28/28 Today checks and 29/29 Solar Return checks, including mobile, offline, reduced-motion, no-JavaScript, no-time, and no-place states.
- Full Vitest currently passes 935/936 tests. The sole failure is a pre-existing Kahlo scene snapshot drift in untouched engine/scene code (sub-`1e-13` floating differences plus the existing North Node speed delta); all tests added or affected by this sweep pass.

### 2026-07-19 — Phase 1 locally complete; operational gate pending

- Pre-rendered and verified all 85 required horoscope routes from one evidence-linked program contract.
- Moved the preserved monthly readings to `/monthly/` and made each root sign URL the daily canonical.
- Added the full daily-through-yearly template family, twelve sign feeds, schema, sitemap coverage, OG assets, workflow integration, and IndexNow route coverage.
- Passed desktop, mobile, no-JavaScript, accessibility, performance, SEO, content-depth, distinctness, and deterministic-regeneration gates.
- Kept Phase 2 locked pending a live deployment/indexability check and three consecutive scheduled daily runs.

### 2026-07-19 — Phase 0 complete; Phase 1 active

- Declared the new household-name brief authoritative over conflicting sections of `docs/MASTER-PLAN.md`.
- Captured the current stack, computation pipeline, design tokens, editorial policy, backend, scheduling, and external-service surface.
- Confirmed both named Phase 1 bugs are already fixed in the current worktree.
- Recorded the existing Phase 1 foundations and the remaining 72-route/content/operations gap.
- Selected exact-date event URLs to avoid same-month event collisions.
- Preserved truthful Organization authorship for the AI-only operating model without a prominent reader-facing automation badge.

No later phase has started.
