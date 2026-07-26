# Zodiacs.org household-name program

Last updated: 2026-07-25

Active phase: **Phase 4 private sharing loop — implementation merged and the
owner-only private canary completed successfully. Fable's independent
live-canary review passed with no open P0/P1, and the owner explicitly
authorized public launch for signed-in users with a synchronized saved chart.
The separately gated public-authorization release remains in progress. Phase
5 has not begun; Phase 1 external closure monitoring continues
independently.**

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

- Locale routing and UI catalogs live under `src/lib/i18n/`; the released locale roots remain `/es/`, `/pt/`, `/fr/`, and `/it/`.
- The owner-approved Russian workstream is staged separately from the six product phases. R0 added availability-aware locale plumbing without a visible change. R1 released 27 complete Russian preview routes under `/ru/`, all with `noindex` and absent from public discovery.
- R2 is released: 26 reviewed Russian core pages have localized social cards and public selector/alternate/sitemap discovery; `/ru/404/` remains `noindex`. Russian search and every deferred route family remain excluded. Arabic routes and content remain absent.
- Daily horoscopes, Today and event publications, Registry, birthday pages, Ask, and email/push publication content remain outside the Russian launch set. Russian pages label linked English-only material plainly rather than implying that it is translated.

### Computation and current horoscope pipeline

- Browser chart computation lives under `src/lib/engine/`. `engine/full.ts` is the only browser module allowed to import the ephemeris; `server-ephemeris.ts` is the server-only adapter. Bundle checks enforce the boundary.
- Daily facts are computed by `scripts/daily-snapshot-lib.mjs` and `scripts/build-daily.mjs` into `src/data/daily.json`: Moon sign and phase, ten body positions, retrograde state, ingresses, lunations, stations, and exact aspects.
- `src/lib/daily.ts` maps those facts to each Sun sign with whole-sign solar houses.
- `src/lib/daily-publication.ts` produces a versioned, evidence-linked publication and enforces the editorial constitution, lexicon, source references, deterministic regeneration, and pairwise distinctness. The committed publication and manifest live in `src/data/daily-publication*.json`.
- **Current prose mode — degraded but shippable:** daily prose uses deterministic composition from a curated phrase library keyed to the facts layer. It meets the publication, evidence, voice, safety, length, and distinctness contracts, but it is a fallback rather than the editorial ceiling. The existing constitution correctly forbids unreceipted free-form model output from publishing. The preferred model-assisted build remains a later quality upgrade and may be enabled only behind the Phase 1 evidence gate described below.
- Existing monthly prose is stored as twelve MDX entries per month under `src/content/horoscopes/`, grounded in `src/data/transits-YYYY-MM.json`.
- `.github/workflows/daily-horoscopes.yml` computes, verifies, replays, commits, deploy-verifies, and IndexNow-pings the daily edition from an exact 00:00 UTC schedule declaration. GitHub may start a scheduled runner later. `.github/workflows/transits-monthly.yml` computes the next month's event catalog on the 25th.

### Backend and external dependencies

- Supabase already supports magic-link auth, RLS-protected profile/chart sync, chart-deletion tombstones, and weekly-digest opt-in. Assistant quota and push-subscription surfaces also exist; their production schema must be migration-backed before their flags are enabled.
- Email capture supports Resend, Buttondown, or Loops and fails closed when the chosen provider is incomplete. The program standard is Resend so capture, confirmation, and automated sends use one provider.
- Push, weekly digest, Registry Collection, wallet chart, analytics, and Ask Zodiacs all have off-by-default or configuration-dependent behavior. Exact setup is consolidated in `SETUP.md`.
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
- The deterministic phrase-library renderer is the active **degraded-but-shippable** no-key publishing mode. A model-assisted build is preferred as a later quality upgrade, but is permitted only when it consumes the facts record, emits structured evidence references, passes the independent copy/fact verifier, and produces the same signed manifest contract. The verifier is deliberately separate from the builders and generator validators; `DAILY_PROSE_ENABLED` remains off unless that complete contract passes.
- Exact-aspect records describe refined exact-hit instants, so their explicit orb is `0`: at the recorded UTC exactitude there is no residual angular separation. Missing or non-zero orbs fail closed through the transit, daily, publication, and horoscope-program gates; sampled near-aspects would require a different fact type rather than a misleading non-zero value on an exact hit.
- The existing daily workflow is extended rather than duplicated. It generates today/tomorrow/love/career every day and weekly content on Mondays, then always proves the exact edition in production and notifies IndexNow—even on a safe no-op retry where the edition commit already exists. Each successful run leaves an immutable receipt artifact; failures open or update an operational incident.
- Yearly pages are derived from a committed 2027 catalog of major ingresses, eclipses, and retrograde periods mapped to solar houses. They must be live and indexable before 2026-10-01.
- A quiet sky strip uses existing ticker patterns, at most two fact markers, and no more than one subtle line of motion. It cannot delay LCP, and reduced motion receives a meaningful static state. Discarding any third marker is the Phase 1 restraint/accessory removal.
- Every sign × period route has its own OG card: daily, tomorrow, weekly, monthly, love, career, and 2027. The 84 horoscope cards bring the generated v2 asset set to about 12.46MB, so its generated-output ceiling is raised from 10MB to 15MB. This adds no runtime dependency or client bundle cost.

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

- Signed-in Person A selects one synchronized chart and explicitly consents.
  The browser sends only the owned chart UUID, consent, and the
  invitation-specific email choice; the server derives a compact positions
  payload and then stores no chart UUID.
- Invite records are short-lived, revocable, RLS-protected, and hold only a
  normalized 24-character label, derived Sun sign, the exact compact
  twelve-body positions wire, consent state, capability digest, and bounded
  lifecycle timestamps. They never store birth input, email, or recipient
  data.
- A 32-byte capability is returned once. Only its SHA-256 digest is
  authoritative in storage. Completion, revocation, and expiry atomically
  destroy both that authority and the positions; positions-free operational
  evidence is retained for 30 days.
- Person B computes locally. B's details are not written unless B explicitly saves or creates an account.
- Person B explicitly sends the result back as the existing client-rendered
  compatibility image plus a client-only `#s=` positions link. No numeric
  score exists.
- Share cards render client-side from the existing visual system. The Big
  Three card returns to the birth-chart share sheet; no chart payload is
  uploaded to make an image.
- `PUBLIC_COMPAT_INVITES_ENABLED` controls the English reader UI.
  `COMPAT_INVITES_ENABLED` controls new creation and recipient open/session
  reads. Both remain off until the complete migration, CI, Fable review, and
  allowlisted canary ladder passes.

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

## Phase 4 formal closure

Phase 4 is **complete as of 2026-07-25**. The private canary, independent
Fable review, explicit owner authorization, separate public-authorization
change, full CI, production configuration, and live verification all passed.
Public creation remains limited to valid signed-in users selecting a
synchronized saved chart they own; authentication, explicit consent, caps,
terminal authority destruction, the paired kill switches, retained canary
allowlist, and hourly cleanup remain in force.

- Public-authorization PR: `#159`
- Production merge: `b7075f3d1dc94282cee472decbd94a0270adb331`
- Merge UTC: `2026-07-25T07:01:06Z`
- Post-merge Site Check: run `30148543319`, attempt 1, `success`
- Production deployment: `dpl_7S22DcjeFHkgWx5pJHDUJkcj61eU`
- Deployment URL:
  `https://zodiacs-pu8mdb794-zodiacsofficial.vercel.app`
- Production alias cutover: `2026-07-25T07:34:10.644Z`

Live verification found the English invitation UI in the production build,
an unauthenticated create request returned `401 sign_in_required`, and an
invalid token returned `303` to the generic unavailable state with
`private, no-store` and `noindex, nofollow, noarchive`. No invitation, email,
or notification was created during public-launch verification. Phase 5's
entry gate is open; this closeout contains no Phase 5 implementation.

## Phase 5B noindex pilot release candidate

Phase 5 is active at the deliberately bounded Phase 5B step. This repository
state adds one English `/people/` directory and twenty reviewed English profile
pages. Every People route remains `noindex, nofollow` and absent from global
navigation, search, sitemap, hreflang and assistant discovery. Phase 5C
indexing is not authorized.

- Production base: `51573a87ef492f15cb41177e727d0b46320d5fef`,
  which already contains the released Registry Collection rename and updates.
  The Phase 5B candidate changes no Registry or Collection source.
- Mailbox gate: `people@zodiacs.org` is a monitored alias of
  `admin@zodiacs.org`; the owner confirmed the final authorized receipt at
  `2026-07-26T14:23:53Z` after marking the sender safe.
- Independent Fable review: `40a5fd81c42b09481b6e6699e2d40bb0f435d4b1`,
  integrated as `a97f8309189348108098001280caf7495813f43d`.
- Review result: no P0. The single P1 was closed by naming every non-Moon
  placement whose sign changes during the unknown birth-time day and adding
  the matching reader-visible `Open signs` evidence row.
- Exact local closure evidence: 1,431/1,431 unit tests; 491/491 independent
  People data/content checks; 365/365 focused People browser assertions;
  21/21 noindex distribution checks; 15/15 visual references; R0 and R2
  localization gates green; three Lighthouse runs each at 98–100 performance
  and 100 accessibility/adjusted SEO; build, schema and bundle gates green.
- Content remains inside the reviewed bounds: 332–414 original words,
  12–15 substantive statements, and maximum pairwise similarity `0.3048`
  against the unchanged `0.32` ceiling.

Phase 5C remains blocked on qualified legal review of the personal-data
position and a separate exact-release review. Phase 6 has not begun.

## Phase 3 formal closure

Phase 3 is **complete as of 2026-07-23**. The implementation review has
no open P0 or P1 defect, both reviewed migrations are live with their
server-only security boundary, the three-edition Daily Email canary
completed, consent isolation and chart-stop → Sun-sign resume were proved
against production state, and the real Mercury-direct Sky Alert was
delivered once and rejected as a duplicate on replay. Phase 4 is now
authorized. Fable's reader-experience handoff and Sol's reconciled
privacy/security contract are now released in the flag-off production build.
The live migration, authenticated cleanup, and allowlisted private canary are
recorded below. This is not a public-launch claim: both Phase 4 flags are back
off, the owner allowlist remains in place, and Phase 5 has not begun.

### Live schema and consent evidence

- The live project contains the consent, confirmation, delivery,
  subscription, schedule, and claim objects introduced by
  `20260720074516_phase3_habit_layer.sql` and
  `20260720145526_phase3_delivery_guards.sql`. The real Daily Email and Sky
  Alert workflows successfully used those objects.
- At `2026-07-23T10:16:10Z`, anonymous/publishable-key reads against all
  nine Phase 3 tables returned `401`: `daily_chart_preferences`,
  `daily_sun_preferences`, `daily_sun_confirmation_requests`,
  `daily_sun_confirmation_rate_limits`, `daily_email_deliveries`,
  `push_subscriptions`, `daily_chart_confirmation_send_claims`,
  `push_alert_schedule`, and `push_delivery_claims`. The privileged
  scheduling RPC is not exposed to the public API. This matches the
  committed RLS, revoked public grants, and service-role-only execution
  contract.
- The admin test address received the real Aries double-opt-in email on
  2026-07-21; the live row records confirmation at
  `2026-07-21T16:34:36.291978Z`. The chart tier separately completed its
  own double opt in before the 2026-07-22 chart delivery. No preference
  was manufactured or edited directly.
- On 2026-07-23 the signed chart-tier unsubscribe returned its production
  success page. A fresh live read changed
  `daily_chart_preferences` from one row to zero while the confirmed Aries
  `daily_sun_preferences` row remained present with its original
  confirmation timestamp.
- Workflow run `29998119153` then selected exactly that surviving
  `sun_sign` tier for `admin@zodiacs.org` in dry-run mode:
  `considered=1 reserved=0 sent=0 failed=0 duplicate=0 dryRun=1`.
  This proves chart stop → confirmed Sun-sign resume without sending a
  fourth message.

### Three qualifying Daily Email editions

All three editions are distinct real publication dates, delivered only to
the approved admin test address, and have matching workflow, provider,
mailbox, and database receipts.

| Edition | Tier | Workflow / release SHA | Delivery result | Provider receipt / sent UTC | Mailbox receipt |
| --- | --- | --- | --- | --- | --- |
| 2026-07-21 | Sun sign (Aries) | `29849683804` / `b3e3c80fc309486fae7814f8ceb47ac81753ce45` | `considered=1 reserved=1 sent=1 failed=0 duplicate=0` | `22509174-e862-483f-ac2d-c3ad81d1b746` / `2026-07-21T16:41:50Z` | `Aries today — relationships come into focus`, received in the admin mailbox |
| 2026-07-22 | Chart | `29908738347` / `bcedd5374dc69d70ed9c9c43b6bf6981db56b674` | `considered=1 reserved=1 sent=1 failed=0 duplicate=0` | `d83e6991-5993-492d-9e22-c51124ce7b82` / `2026-07-22T09:38:30Z` | `Your chart today — Sun opens for your natal Moon`, received in the admin mailbox |
| 2026-07-23 | Chart | `29995921748` / `90b724722e3d8567647ab04397089fede7b091ea` | `considered=1 reserved=1 sent=1 failed=0 duplicate=0` | `c67dc5ef-7c41-428b-a94e-dadddadff5c6` / `2026-07-23T09:35:49Z` | `Your chart today — Moon challenges your natal Ascendant`, received in the admin mailbox |

The GitHub test sender was disabled at `2026-07-23T10:12:34Z` after this
evidence closed. Vercel public Daily Email enrollment remains absent, the
workflow still has no public/all-recipient release path, and the
unsubscribe endpoint remains live.

### Sky Alert delivery and duplicate protection

- Natural scheduled run `29995058826` on release
  `90b724722e3d8567647ab04397089fede7b091ea` selected
  `mercury-stations-direct-2026-07-23`, verified its live canonical
  destination, and reported
  `schedule=selected considered=1 reserved=1 sent=1 failed=0 duplicate=0`.
- The schedule ledger contains one row for the event, rank 4, selected at
  `2026-07-23T09:23:29.548655Z`. The delivery ledger contains one `sent`
  row, claimed at `2026-07-23T09:23:29Z`, finalized at
  `2026-07-23T09:23:30Z`, with provider HTTP status `201`.
- Safe same-day replay `29998221975` on the same release passed live
  destination verification and returned
  `schedule=selected considered=1 reserved=0 sent=0 failed=0 duplicate=1`.
  A post-replay live read still showed exactly one unchanged delivery
  claim. No second notification was sent.
- Public push remains off: the production worker is stamped
  `PUSH_ENABLED = false`. The GitHub sender remains restricted to test
  subscription `1`; the public UI was not enabled and the test allowlist
  was not cleared.

## Current Phase 4 status

Phase 4 is a **released, flag-off implementation with a successful private
canary**. PR #151 merged at
`9a975477a380513e3f28145721346b745d9ced61`; post-merge Site Check run
`30075164453` passed on attempt 2. Fable's design/copy/proof commit
`9809c3d247c0c6a0c1ecaf20cbddd51c0cea0795` and implementation review are
integrated. `docs/PHASE4-SHARING-INTEGRATION-DECISIONS.md` reconciles the
reader experience with the stricter capability, retention, and privacy
boundary. Exact operational evidence is in
`docs/PHASE4-SHARING-CANARY.md`.

### Released flag-off implementation

- The live migration creates three server-owned, RLS-enabled tables with
  zero browser policies, revoked public/browser grants, fixed-search-path
  service-role-only RPCs, concurrent 12-active and rolling-24-hour creation
  limits, atomic terminal transitions, one-shot email claims, owner hiding,
  and 30-day evidence cleanup.
- The server derives the exact twelve-body v2 positions wire from an
  authenticated owner's synchronized chart. The request cannot submit a
  label, positions, owner identity, birth input, or email, and no saved-chart
  ID is stored on the invitation.
- A 32-byte raw capability is returned only in the successful creation URL.
  Completion, revocation, and expiry destroy the authority digest and
  positions immediately.
- The multi-tab security hardening is implemented: `/c/{token}/` mints a
  non-secret 16-byte, 22-character base64url session handle, places the raw
  capability only in `zodiacs_compat_invite_{handle}`, an HttpOnly cookie
  scoped to `/api/compatibility`, and redirects to
  `/compatibility/#invite={handle}`. Session and completion select only that
  handle's cookie, so two invitation tabs cannot overwrite or cross-read one
  another. Its focused unit/API isolation suite passes 47/47. The dedicated
  feature-off browser suite passes 8/8 and the fixture-enabled A→B suite passes
  35/35, including two invitations in parallel tabs with no cross-read or
  cross-completion.
- English-only invitation creation, arrival, profile management, completion,
  send-back, conversion, and returned-reading surfaces exist behind the
  disabled public flag. B's chart calculation remains local.
- The client-only `s1.` return codec carries two strict positions tokens,
  bounded labels, and time-known state. Big Three sharing is re-exposed beside
  the existing full-chart and compatibility images; no numeric score is
  introduced.
- The invitation-specific completion email is separate from every Phase 3
  consent. It uses a keyed recipient HMAC, durable delivery claim, and provider
  idempotency. Analytics uses only Fable's six allowlisted funnel events and
  closed enum/boolean properties.
- A private OG asset, noindex/no-store/no-referrer route contract, disposable
  PostgreSQL harness, focused unit/API/UI tests, and an hourly authenticated
  cleanup workflow are included in the released flag-off implementation.

### Private canary closure and remaining public-launch gates

- [x] Finish the complete build, check, unit, browser, schema, bundle, visual,
  locale, Registry, security, and three-run Lighthouse gates, including a
  no-secret and byte-parity flag-off build. Candidate PR CI passed, and
  post-merge Site Check run `30075164453` passed all jobs on merge
  `9a975477a380513e3f28145721346b745d9ced61` after rerunning the one known
  `/ru/birth-chart/` Lighthouse flake.
- [x] Complete the browser-level two-invitation/two-tab isolation evidence for
  the implemented handle-scoped capability hardening. Focused malformed and
  cross-handle unit/API tests pass 47/47; the fixture-enabled browser drive
  passes 35/35 and proves independent handles, cookies, reads, and completions.
- [x] Complete Fable's bounded implementation review and resolve only genuine
  P0/P1 release blockers. Review commit
  `751a95f46ba01ff38d1a1020a81b458d21741f06` found one scoped responsive
  blocker; the CSS fix is included in the released merge.
- [x] Obtain green PR CI and merge through the normal path with both Phase 4
  flags still off.
- [x] Apply the Phase 4 migration through the reviewed live path and verify its
  tables, RLS, grants, service-only RPCs, caps, races, terminal destruction,
  and retention against production.
- [x] Provision the sweep and recipient-hash secrets, keep the exact approved
  canary Auth UUID in `COMPAT_INVITE_TEST_USER_IDS`, and verify the hourly
  cleanup path without enabling public use. Workflow run `30076393065`
  authenticated successfully and returned `expired=0`, `pruned=0`,
  `batches=1` while both flags were off.
- [x] Run one genuine controlled A→B→send-back canary with the paired flags on
  only for the allowlisted owner. Record network privacy, provider/database
  email evidence when opted in, duplicate prevention, return card/link,
  revocation, expiry, cleanup, accessibility, reduced motion, responsive
  screenshots, and 1×/2× card review. The preview proved A→B, return link,
  revocation, multi-tab containment, responsive behavior, and authority
  destruction. The production canary delivered exactly one completion email
  to the approved owner, retained one delivery claim after a repeat, and
  ended with both flags off.
- [x] Obtain Fable's bounded review of the live private canary against the
  committed handoff. The 2026-07-25 independent review returned **PASS** with
  no open P0/P1; the honest first-load status fallback remains P2 backlog.
- [x] Obtain explicit owner approval before allowing anyone beyond the canary
  allowlist. The owner authorized public creation on 2026-07-25 for signed-in
  users selecting a synchronized saved chart, with Phase 5 paused.
- [x] Release the separate `COMPAT_INVITES_PUBLIC_ENABLED=1` authorization
  change through green CI, then enable it with the existing server/UI flags
  and verify production. PR `#159` merged as
  `b7075f3d1dc94282cee472decbd94a0270adb331`; post-merge Site Check run
  `30148543319` passed, and deployment `dpl_7S22DcjeFHkgWx5pJHDUJkcj61eU`
  was aliased to production at `2026-07-25T07:34:10.644Z`.

Phase 4 is formally closed. Production keeps the reader, server, and public
authorization flags enabled together, retains the exact canary owner as the
rollback boundary, and keeps cleanup operational. Phase 5 may now begin as a
separate bounded phase.

## Current Phase 1 status

Implementation is **85 of 85 required routes pre-rendered**: the hub plus seven surfaces for each of the twelve signs. The deterministic phrase-library renderer is the active degraded-but-shippable no-key mode; model-assisted copy remains a later quality upgrade, not a hidden claim about the current pipeline. The independent verifier checks facts, evidence, structure, periods, length, voice, safety, meaning-first openings, and distinctness without importing the renderer, builders, or generator validators.

### Locally complete and verified

- [x] Deterministic daily sky snapshot with positions, Moon phase, events, UTC receipts, and whole-sign solar-house translation.
- [x] Versioned publication schema, editorial constitution, evidence references, manifest hashes, independent copy/fact verification, fail-closed exact replay, and pairwise-distinctness gates. The final semantic audit independently reconciles phase, body, sign, aspect, date, and solar-house claims in the prose to their cited fact records.
- [x] Full Moon on 2026-07-29 and Mercury retrograde on 2026-07-18 regression vectors.
- [x] Exact-hit aspects carry an explicit zero-degree orb and exact UTC time; missing/non-zero exact orbs fail closed. The 2027 catalog includes every retrograde period overlapping the year and both station boundaries, including adjacent-year boundaries needed to describe the complete cycle.
- [x] Daily-first `/horoscopes/{sign}/` canonicals and separate tomorrow, weekly, monthly, love, career, and 2027 routes for all twelve signs.
- [x] All prose-length contracts pass: daily/tomorrow 90–140, weekly 200–300, love/career 60–100, and yearly 1,200–1,800 words.
- [x] Shared sky strip with no more than two evidence-derived markers, breadcrumbs, period navigation, FAQ where useful, unique metadata, canonicals, Article/Breadcrumb schema, sitemap entries, and source notes.
- [x] Unique OG cards for all 84 sign × period pages. The generated v2 card set remains below its documented 15MB ceiling; the larger generated-asset allowance adds no runtime dependency.
- [x] Twelve distinct hub teasers and twelve per-sign daily RSS feeds with feed discovery.
- [x] Server-rendered `/today/` and horoscope pages remain complete without JavaScript; saved-chart behavior is progressive enhancement.
- [x] Route, length, voice, fact-reference, distinctness, schema, sitemap, RSS, OG, and named-vector checks pass.
- [x] All seven surfaces pass browser QA at 360px and 1280px, including server-rendered sky facts, sign-feed discovery, reduced-motion behavior, pastel icon identity, and no-JavaScript coverage.
- [x] Three-run mobile Lighthouse gates pass every Phase 1 template: performance 97–99, accessibility 100, SEO 100, LCP ≤2.431s, CLS 0, and TBT ≤6ms. `/today/` is mandatory in the runner and the weakest—not the median—of all three runs controls the gate.
- [x] Static build, Astro check, dist integrity, schema validation, and bundle budgets pass; the build pre-renders 3,419 pages.
- [x] The scheduled workflow has bounded timeouts, unconditional live-edition and IndexNow checks, immutable operation receipts, and incident reporting. A separate operations verifier rejects manual runs, missing steps/artifacts, gaps, and failures.
- [x] Scope guard: this Phase 1 closeout changed no Registry source, generated Registry asset, SDK page, sign guide, Learn copy, or locale tree. Earlier owner-directed Registry work remains separate from this closeout.

### External Phase 1 close gates

- [x] The existing 85-route release is live. Production checks established public `200` responses, self-canonicals, sitemap membership, robots permission, and no `noindex` directive for all twelve 2027 pages; the live horoscope canonicals were submitted for discovery through IndexNow. This proves the live route baseline, not literal inclusion in a search engine's index.
- [x] Historical baseline SHA `4fdd6495a7cf581db69f414d00d796c604ad1031` passed the exact-SHA pull-request suite and post-merge main run `29691713607`, deployed to production, and passed its live audit: 85/85 routes, 12/12 feeds, 85 referenced OG assets, self-canonicals, sitemap membership, robots/indexability, scoped critical CSS, and a live Daily Sky edition matching its inputs and hashes. IndexNow accepted all 103 submitted canonical/feed URLs with HTTP `200`. Its `2026-07-19T15:01:32Z` cutover is retained as historical evidence but is superseded for strict closeout by the current hardening candidate; no run after the old cutover may count toward the new release's streak.
- [ ] Ship the current Phase 1 hardening candidate, record its exact production SHA, pass the live route/feed/OG/canonical/sitemap/robots/daily-hash audit, submit the canonical set through IndexNow, and establish a new UTC release-evidence cutover.
- [ ] Obtain independent search-index inclusion evidence for each of the twelve 2027 canonical URLs, using search-engine-owned inspection/indexing evidence rather than inferring inclusion from a successful crawl, sitemap membership, or IndexNow acceptance.
- [ ] After the final Phase 1 closeout release establishes a commit SHA and UTC cutover, log three consecutive eligible scheduled Daily Sky publications on the live site without manual intervention. Record the immutable pair as `PHASE1_CUTOVER_SHA=<full 40-hex closeout SHA>` and `PHASE1_CUTOVER_UTC=<ISO UTC instant ending in Z>`, then prove the streak with `npm run editorial:phase1:operations -- --cutover-sha "$PHASE1_CUTOVER_SHA" --after "$PHASE1_CUTOVER_UTC" --min-runs 3`. Each counted run must be `schedule`-triggered strictly after the cutover, succeed through exact production verification and IndexNow, publish its immutable receipt artifact, and have a receipt commit that contains the exact closeout SHA. Pre-cutover runs, manual dispatches/reruns, receipt commits behind or diverged from the closeout SHA, failed/gapped dates, and no-receipt runs do not count.

The prior release cutover is superseded; the current hardening candidate must establish a new exact-SHA production cutover before any scheduled run can count. After that, two independent external Phase 1 evidence gates remain: search-engine-owned inclusion evidence for all twelve 2027 URLs and the three-date operational proof. Phase 2 remains locked until both pass; Phase 1 is not complete merely because the routes are indexable, discovery was submitted, and one-day checks are green.

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

- Release-gate follow-up: the unchanged Registry selector's keyboard-focus assertion missed once locally and then passed its isolated rerun 20/20. Do not change Registry for Phase 1; stabilize the browser timing only if the failure recurs in CI.
- Vedic/sidereal mode and nakshatras.
- Public API and additional embeddable widgets.
- Numerology wing.
- Additional locale expansion.

Keep clean data and route seams for these; do not implement them inside this program.

## Change log

### 2026-07-25 — Phase 4 publicly launched and formally complete

- Released public authorization through PR `#159` at merge
  `b7075f3d1dc94282cee472decbd94a0270adb331`; post-merge Site Check run
  `30148543319` passed all jobs on attempt 1.
- Enabled the English reader UI, server create/open path, and public
  authorization together. Creation still requires a valid signed-in account,
  explicit consent, and one synchronized saved chart owned by that account.
- Redeployed the exact green merge as
  `dpl_7S22DcjeFHkgWx5pJHDUJkcj61eU`; `zodiacs.org` cut over at
  `2026-07-25T07:34:10.644Z`.
- Verified the public UI, guest rejection, generic private token failure,
  responsive layouts, and unchanged Registry Collection operation without
  creating an invitation or sending an email or notification.
- Retained the canary allowlist, paired kill switches, terminal cleanup, and
  hourly sweep as the reviewed rollback and lifecycle boundary. Phase 5's
  entry gate is open; no Phase 5 implementation is included here.

### 2026-07-24 — Phase 4 private canary complete; public launch remains off

- Released the Phase 4 implementation flag-off through PR #151 at merge
  `9a975477a380513e3f28145721346b745d9ced61`. Post-merge Site Check run
  `30075164453` passed all jobs on attempt 2.
- Applied migration `20260724003109_phase4_compat_invites.sql` and verified
  the three live RLS tables, zero browser policies/grants, fixed search paths,
  and service-only RPC boundary. Provisioned separate sweep and recipient-HMAC
  secrets plus the exact owner-only allowlist.
- Proved the authenticated cleanup path with workflow run `30076393065` while
  the feature was off. The bounded run completed successfully with
  `expired=0`, `pruned=0`, and `batches=1`.
- Completed the private preview ladder with public historical fixtures only:
  two independent guest sessions opened the same invitation safely, one
  completed locally, its positions-only `#s=` return link reopened as a
  settled reading, and a second invitation was revoked. Both terminal records
  destroyed their token authority and positions; forbidden stored birth/email
  fields remained zero.
- Completed the owner-only production email canary. The invitation was created
  at `2026-07-24T08:32:00.660739Z`, completed at
  `2026-07-24T08:34:17.656670Z`, and produced one finalized delivery claim
  with provider HTTP `200`; the approved admin mailbox received exactly one
  `Your invitation was read` message. A second pre-opened guest session made
  the same completion attempt without creating a second claim or message.
- Returned both production and preview flags to off. Production flag-off
  deployment `dpl_C5NuAAZm65p1U7uu569jFJZpDqfW` was live-verified at
  `2026-07-24T08:43:57Z`; the private route still returned `303`,
  `private, no-store`, and `noindex, nofollow, noarchive`.
- Phase 4 is not publicly launched or formally closed. Fable's bounded
  live-canary review and a separate explicit owner approval remain required.
  Phase 5 was not begun.

### 2026-07-24 — Phase 4 isolated implementation candidate in progress

- Integrated Fable's decision-complete sharing-loop handoff and static
  responsive proofs, then recorded the binding security reconciliation for
  the invitation secret, cookie exchange, server-derived twelve-body payload,
  immediate authority destruction, 30-day evidence boundary, one-shot email,
  generic terminal response, and client-only `#s=` return link.
- Added the isolated candidate's migration, server APIs, English UI, profile
  register, meeting motion, send-back/conversion loop, Big Three share-sheet
  entry, completion email, privacy-filtered analytics, private route/OG
  contract, focused tests, and hourly cleanup workflow.
- Implemented the final handle-scoped capability hardening needed to keep two
  invitation tabs independent. Its focused unit/API isolation suite passes
  47/47; the browser-level isolation proof remains an open candidate gate.
- Kept the work explicitly unreleased and uncanaried. No Phase 4 production
  flag, live migration, secret, scheduled cleanup, provider send, public
  indexing surface, or production release is claimed by this checkpoint.
- Phase 5 was not begun.

### 2026-07-23 — Phase 3 formally complete

- Closed the external Daily Email ladder with three genuine editions on
  2026-07-21, 2026-07-22, and 2026-07-23, each backed by a successful
  allowlisted workflow, provider receipt, delivery-ledger row, and admin
  mailbox receipt.
- Proved the two daily-email tiers are independent: the signed chart
  unsubscribe removed only the chart preference, retained the confirmed
  Aries Sun-sign preference, and the next no-send selector run resumed the
  Sun-sign tier.
- Closed the Sky Alert canary with the natural 2026-07-23 Mercury-direct
  delivery, provider HTTP `201`, durable schedule/delivery rows, and a
  same-day replay that returned `duplicate=1` and `sent=0` while leaving
  exactly one delivery claim.
- Re-verified the live Phase 3 schema and public-denial contract. Disabled
  the GitHub Daily Email canary sender after the third receipt; kept public
  Daily Email enrollment and public push UI off, and retained the push
  test allowlist.
- Phase 4 was not begun.

### 2026-07-22 — Russian R2 public release

- Prepared exactly 26 reviewed Russian core pages for indexability while keeping `/ru/404/` `noindex`; daily horoscopes, Today, events, birthday and Chinese-zodiac programs, Registry, Ask, search, and email/push publication content remain outside the Russian route set.
- Added reciprocal EN↔RU alternates, an availability-derived six-language selector on the launched core family, and exact Russian sitemap rows with English retained as `x-default`. Deferred and programmatic routes remain on the existing five-language policy.
- Added 27 localized 1200×630 Russian social cards, including the private 404 card, generated from the approved Russian deck with the canonical pastel sign artwork. The Russian set is about 521 KiB and the full card library remains below the existing 15 MiB ceiling.
- Added release gates for exact route/indexing inventory, reciprocal hreflang, sitemap counts, localized metadata and cards, Arabic absence, Russian search exclusion, 360px/1280px layout, keyboard navigation, reduced motion, chart calculation, font loading, and Russian Lighthouse coverage.
- Preserved the 62,880-byte Russian font payload under its 80 KiB cap and introduced no new runtime dependency, data store, product flag, or Registry change.
- Kept the Russian homepage poster under a 48 KiB gate while preserving its subtle mobile drift and interaction-only video loading.
- Released by PR #140 at merge `37cd2fc0a7dd948f1d5cd1507c5a8c89bf8d48b3` on `2026-07-22T13:33:15Z`. Exact-SHA Site Check run `29924409476` passed all seven jobs at `2026-07-22T13:50:56Z`; Vercel completed the production deployment at `2026-07-22T13:35:42Z`.
- The production audit passed all 26 Russian pages, all 26 reciprocal English alternates, all 26 localized social cards, the exact 26-URL sitemap inventory, the private Russian 404 contract, Russian search exclusion, Arabic absence, and existing-language/Registry smoke checks. A real-browser check also passed desktop and mobile rendering, the six-language selector, keyboard menu behavior, overflow, and console-error checks.
- IndexNow accepted the exact 26 released Russian URLs with HTTP 200.
- The owner-authorized Google Search Console setup completed under `admin@zodiacs.org`: the `sc-domain:zodiacs.org` property was automatically verified by the domain-name provider without a DNS change, and `https://zodiacs.org/sitemap.xml` was submitted successfully on `2026-07-22`. Search Console reported `Success`, a same-day last read, and 2,512 discovered pages. Indexing itself remains search-engine-owned and must not be inferred from sitemap acceptance.

### 2026-07-22 — Russian R1 private preview candidate

- Added the complete Russian UI catalog, twelve sign guides, core legal/method pages, astrology labels, grammar cases, and plural rules for the 27 approved core routes.
- Kept every Russian route private and `noindex`; no Russian selector entry, hreflang, sitemap row, search entry, or public discovery path was activated. Arabic remains absent.
- Added licensed Cyrillic font subsets totaling 62,880 bytes, below the 80KB localization allowance, with Russian-only loading and no change to the existing public font contract.
- Added build and browser gates for exact route count, Russian-language coverage, English-only seam labels, 360px/1280px layout, keyboard navigation, reduced motion, chart calculation, fonts, and discovery isolation.
- Kept deferred products honest: the birthday tool, search, English-backed email capture, push, assistant, daily publications, events, and Registry translation do not silently appear as Russian features.
- R2 release work is not included. Russian remains a hidden review candidate until a separate approval starts the indexable release gate.

### 2026-07-19 — Phase 1 closeout hardening; external evidence pending

- Added the independent copy/fact verifier and fail-closed zero-orb contract for refined exact-aspect hits; completed the 2027 retrograde catalog with both station boundaries for every period overlapping the year.
- Moved the below-reading DailyForYou enhancement to visibility hydration. Visitors without a matching saved chart make zero personalization-script requests, returning-chart SSR and hydration remain intact with exact zero CLS, and the three-run mobile Lighthouse gate now tops out at 2.431s LCP.
- Added the restrained sky strip to every horoscope period, with at most two fact markers, one subtle line of motion, and a reduced-motion static state. The third possible marker was deliberately removed as the phase's accessory.
- Replaced the shared-per-sign horoscope card shortcut with 84 unique sign × period OG cards. The generated v2 set is about 12.46MB under a documented 15MB generated-asset ceiling, with no new runtime dependency.
- Hardened the scheduled publisher against no-op retries and silent failures: exact live verification and IndexNow are unconditional, successful runs upload immutable receipts, and failures create or update an incident. Added an independent verifier for three consecutive eligible schedule-triggered runs after the final release cutover.
- Bound scheduled generation and verification to the exact checked-out default-branch SHA. If the branch advances before or during publish, the job now fails closed so a rerun recomputes and reverifies the entire package on the new tree; verified artifacts are never rebased onto unverified code. No-change recovery runs remain idempotent.
- Added an operations verifier that downloads each operation-receipt artifact and validates its JSON schema, recorded commit, edition hashes, exact-live-verification result, and IndexNow acceptance. The proof command requires both the exact 40-hex closeout SHA (`--cutover-sha`) and its UTC release instant (`--after`); GitHub compare evidence must show that every counted receipt commit contains that exact closeout SHA. No receipt can count until a post-closeout scheduled run uploads it; the verifier then requires three consecutive eligible dates.
- Independently reconciled the horoscope prose's phase, body, sign, aspect, date, and solar-house statements against their cited fact records, beyond structural evidence-reference validation.
- Established live technical indexability and discovery-submission evidence for all 85 routes, including all twelve 2027 canonicals. Literal search-index inclusion is a separate open evidence gate, alongside the inherently time-based three-scheduled-edition proof; Phase 2 remains locked.
- Preserved the program boundary: this closeout made no Registry changes.

### 2026-07-19 — Meaning-first presentation sweep

- Adopted the site-wide reader hierarchy: interpretation first, useful action second, optional astrological rationale third, and exact evidence or production method in a native closed disclosure.
- Added one shared Astro/Preact evidence-disclosure pattern and applied it to Today, saved-chart readings, birth-chart receipts, transit and relationship results, solar returns, profiles, Moon/rising tools, birthday pages, compatibility pairs, About, feeds, and supporting SEO/PWA copy.
- Revised the six-surface horoscope renderer to v3 so daily, tomorrow, weekly, love, career, and yearly passages open with meaning or action before naming the sky mechanic. Removed repeated monthly-method boilerplate without altering the preserved readings themselves.
- Kept uncertainty, privacy, permission, and share-exposure notices visible. Exact positions, aspect orbs, timestamps, publication provenance, and automation details remain inspectable by keyboard, touch, and no-JavaScript users; direct planet-selection actions still return the requested longitude immediately.
- Added a production copy gate that rejects backstage language on default-visible consumer pages while allowing explicit Methodology/trust routes and closed evidence disclosures. Replaced the reader-facing “AI-operated” label with calm, truthful organizational language.
- Verified a 3,419-page production build, dist integrity, schema, bundle budgets, share cards, 30-day editorial replay, 372 horoscope evidence receipts, and 45 independently checked transit events. Browser acceptance passed 28/28 Today checks and 29/29 Solar Return checks, including mobile, offline, reduced-motion, no-JavaScript, no-time, and no-place states.
- At that checkpoint, full Vitest passed 935/936 tests; the remaining cross-platform Kahlo scene snapshot drift was subsequently normalized at display precision while retaining exact engine-to-scene parity assertions in the Phase 1 closeout.

### 2026-07-19 — Phase 1 locally complete; operational gate pending

- Pre-rendered and verified all 85 required horoscope routes from one evidence-linked program contract.
- Moved the preserved monthly readings to `/monthly/` and made each root sign URL the daily canonical.
- Added the full daily-through-yearly template family, twelve sign feeds, schema, sitemap coverage, OG assets, workflow integration, and IndexNow route coverage.
- Passed desktop, mobile, no-JavaScript, accessibility, performance, SEO, content-depth, distinctness, and deterministic-regeneration gates.
- Kept Phase 2 locked pending search-index inclusion evidence for all twelve 2027 URLs and three consecutive scheduled daily runs. Live publication, technical indexability, and discovery submission have since passed, but neither proves search-index inclusion.

### 2026-07-19 — Phase 0 complete; Phase 1 active

- Declared the new household-name brief authoritative over conflicting sections of `docs/MASTER-PLAN.md`.
- Captured the current stack, computation pipeline, design tokens, editorial policy, backend, scheduling, and external-service surface.
- Confirmed both named Phase 1 bugs are already fixed in the current worktree.
- Recorded the existing Phase 1 foundations and the remaining 72-route/content/operations gap.
- Selected exact-date event URLs to avoid same-month event collisions.
- Preserved truthful Organization authorship for the AI-only operating model without a prominent reader-facing automation badge.

Phase 4 is publicly launched and formally complete. Phase 5B is the active
bounded noindex pilot; Phase 5C indexing is not authorized, and Phase 6
remains gated on Phase 5 completion.
