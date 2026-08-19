# Growth record — Full marketing, UX, SEO & competitive audit

- **Record ID:** GROWTH-2026-08-19-full-marketing-audit
- **Date:** 2026-08-19
- **Scope:** whole consumer site + wing boundary; codebase, live production, and market
- **Method:** 14 parallel research passes — 7 codebase audits (IA, homepage conversion,
  calculator UX, SEO/AEO, shareability, retention, content quality), 4 market studies
  (Astro-Seek, app cohort, SEO incumbents, Reddit/TikTok community norms), 3 independent
  strategist syntheses. Load-bearing claims re-verified against source before recording.
- **Evidence quality:** file/line-cited for repo claims; live-HTML-verified for production
  state (2026-08-19); third-party traffic estimates (Semrush/Similarweb) directional only;
  subreddit rules from knowledge current to early 2026 (Reddit blocks automated access —
  spot-check sidebars before acting).

---

## 1. Verdict

The best-engineered astrology site in the category is running with the lights off.
This is an **activation problem, not a growth problem**: roughly half of what a
world-class marketer would prescribe already exists in the repo as finished,
reviewed, dark-launched code. Month one is flipping switches, not building.

Strong and verified: 3-field client-side chart with CI-enforced budgets; best-in-class
unknown-birth-time honesty and accessibility; transit-grounded daily horoscope pipeline
with fail-closed freshness; a day-2 experience (/today/, streak, Living Chart, year-ahead,
calendar feeds, PWA) that beats what Co-Star gates behind an account; top-decile
hand-written EN editorial; category-best technical SEO plumbing.

Dark or broken: analytics, Search Console, the whole email/push layer, the share loop,
and the internal link graph between the two crown-jewel clusters.

## 2. Target audience & positioning

**Beachhead:** the chart-literate sharer — mobile-first women 18–34 who know their big
three, learned astrology from TikTok/Reddit, post in r/AskAstrologers and
r/astrologyreadings, and were burned by Co-Star paywall creep / Nebula billing. The
highest-leverage subset is the **answerers** who read charts in threads and enforce the
astro-seek default; win them and posters follow. Secondary ring: app-paywall refugees
("co-star compatibility free alternative", "birth chart calculator no sign up").
Second front (12–18 mo): Spanish horoscope readers. Not the beachhead: professionals,
daily-horoscope head-term browsers, crypto collectors (must never see the consumer face).

**Positioning:** "Your whole chart, computed in your browser — astro-seek accuracy,
no signup, nothing to cancel, and a chart you can actually share." Every clause is a
verifiable architectural fact no funded competitor can copy. Today all three
differentiators are whispered (one word above the fold; the rest in collapsed FAQs).

## 3. Critical findings — what is switched off

1. **Analytics hard-disabled.** `src/layouts/Base.astro:72` — `const guideRuntimeEnabled
   = true;` gates Plausible off on every consumer page regardless of env; two tests pin
   it; the crypto wing pages are the only surfaces that load analytics. GSC verification
   still an open to-do (docs/LAUNCH.md). Fix: scope the exclusion to `privateSurface`,
   update pinning tests + docs/ANALYTICS.md, set Plausible env vars, verify GSC + Bing,
   add `source: fresh|shared_details|shared_positions` to `chart_computed`.
2. **Phase-3 retention layer dark.** Email/push habit layer is implementation-complete,
   closeout-reviewed, canary-proven (real Resend sends 2026-07-23) — and off:
   `EMAIL_PROVIDER` unset (no capture form renders anywhere, live-verified),
   `DAILY_EMAIL_ENABLED` unset, live sw.js ships `PUSH_ENABLED = false`. The daily cron
   publishes into a void; day-1 users can never be reached again. Fix: env vars.
   Flip push last (Sky alerts only), after email deliverability proves.
3. **Digest trust leak.** /profile/ collects weekly-digest opt-ins while the Monday
   sender is gated off — flip DIGEST_ENABLED or hide the checkbox.
4. **/today/ not in the nav.** The canonical daily surface is footer-only. One-line fix
   in SiteNav.astro; also cross-link /race/ (live weekly mechanic, invisible).
5. **localStorage fragility.** Safari ITP can erase saved charts/streaks in 7 days for
   non-installed sites; sync is offered only in a /profile/ footnote. Surface one quiet
   "keep this on every device" line at second save; lean on PWA install on iOS.

## 4. The Reddit play (astro-seek displacement)

Currently fails all three requirements:

- The only copyable chart link encodes full birth data; the positions-only v2 codec is
  built, receivable, translated in six locales — and no UI calls `encodePositionsLink`
  for a chart result (verified; only synastry invite + calendar do).
- No link can ever unfurl with the person's chart (fragment links + static OG only).
- The "signature" card is implemented/tested/unreachable (`primaryShareCardVariant()`
  has zero non-test callers); moon/rising results have no share at all; the
  positions-only receiver strips houses and aspects.

**Artifact spec (acceptance is data-completeness, not beauty):** one tall chart sheet —
wheel + full positions table (deg°min′, houses, Sun–Pluto + Node + ASC/MC) + aspect grid
+ stamped settings line ("Whole sign · Tropical"); ≥1600px short edge, legible at Reddit
mobile compression, dual-labeled glyph+text; ONE small corner wordmark, no QR/CTA (mod
spam-pattern); "hide birth details" toggle (first-party anonymization astro-seek lacks);
one-tap Web Share on mobile + copy-image on desktop; linked page must serve answerers
(no signup, one-tap Placidus↔whole-sign switch). Venues: r/AskAstrologers,
r/astrologyreadings (r/astrology bans chart requests).

**Seeding:** the default is enforced socially (sub wikis name astro-seek). Verify
sidebar rules by hand, then 30–60 min/day for ~8 weeks answering reading requests with
the artifact as a genuine participant; never auto-post/multi-account; then pitch mods
the utility case. Add a "how to ask about your chart on Reddit" guide to the result page.

**Social card set (volume flywheel):** Big Three card (9:16 + 1:1; also becomes the
moon/rising artifact), "today against your chart" one-liner (computed transit + one dry
line — Co-Star's screenshot genre minus the mysticism), chart bingo (4×4 auto-marked
from real placements). Publish the 25 finished Pinterest pins in public/assets/og/v2/pin/.

## 5. Front door & funnel

- Hero glass override (src/pages/index.astro:674–693) dresses the primary CTA as a twin
  of the ghost button, reversing base.css's own "ONE conversion anchor" rule. Restore
  solid `.btn--primary`; add trust strip "Free · No signup · Calculated in your browser".
- Mobile nav's only named destination is the ASTROFOLIO chip; the calculator is behind
  the burger. Swap: "Birth chart" gets the persistent slot; Astrofolio → burger/footer.
- Calculator: disabled submit is a silent dead end (validate on click, inline "Pick your
  birthplace from the list"); post-result choice overload (~12 competing actions —
  sequence tour + Save first); Save below the fold on mobile; city-search dead-end needs
  "choose the nearest town" recovery; moon mode demands a usually-unneeded birth time
  (ambiguity check already exists).
- Five locales get a gutted result: `showsEnglishInterpretation = locale === 'en'`
  withholds all meaning while /es/ promises "y qué significan"; ES hero CTA lands on a
  noindex "not translated yet" stub. Translate `bigThree()` + aspect tables for ES first.
- Smaller: stale homepage OG card; FAQ wastes a slot on Astrofolio; reading surfaces have
  zero outbound links (append "Read Moon in {sign} →" to the 120 placement pages);
  explain the whole-sign default at the result.

## 6. Link graph & content portfolio

- **Guides ↔ horoscopes never link to each other** (verified both directions). Add a
  horoscope band to guides + "Full {Sign} guide →" on horoscope pages (needs a
  phase1-scope allowance — mechanism exists). Also: calendars → their event pages;
  "All tools →" in nav; reconcile the three divergent tool lists; implement the §9
  guide-footer profile hook.
- **Prune:** 497 orphaned /people/ pages ("a axis" bug ×18 — fix, keep ~100, noindex
  tail), ~1,460 boilerplate localized birthday pages (noindex), RU mad-libs guides
  (noindex or rewrite), ~1,036 locale stubs. Release gate: no new programmatic cluster
  without an inbound-link plan.
- **E-E-A-T:** organization-only byline + "maintained by automated systems" caps
  link-earning; recruit one credentialed human reviewer ("reviewed by" + Person schema
  on guides/learn/monthlies only); fill the empty guide citation arrays from sign-lore;
  commit to the monthly almanac cadence; populate real social profiles; then pitch the
  two earned-media stories (ephemeris-verified horoscopes; revision-pinned celebrity
  chart provenance).
- **Strength:** hand-written EN clusters are top-decile with zero banned tells; the
  freshness/indexing gates are category-best. Portfolio shape, not craft, is the issue.

## 7. Crypto boundary leaks (fix this week)

Astrology communities are documented crypto-allergic (astrology-NFT rug pulls are
community lore). Three leaks sit where outsiders look first:

1. **public/llms.txt** teaches AI assistants token-acquisition language ("a simple guide
   to buying it", "{sign} coin" citation instruction) in the consumer self-description.
   Demote Registry/Terminal to the tail of llms-full.txt.
2. **About page** (consumer surface): "official Zodiac tokens", "market desk", and the
   astrofolio.xyz link ordered removed 2026-08-16. Rewrite in records register.
3. **Mobile nav chip** (see §5).

Add the boundary grep (token/market/crypto over consumer surfaces) to CI.

## 8. Competition & traffic capture

| Competitor | Scale | Wins on | Exploitable weakness |
| --- | --- | --- | --- |
| Astro-Seek | ~10M visits/mo, ~2.8M organic | free breadth, Swiss-Ephemeris trust, socially-enforced Reddit default | mobile, density, no interpretation, raster charts, generic unfurls, 5-step share. NOT ad-ridden/paywalled — don't claim it |
| Cafe Astrology | ~4.5–6.8M, ~55% organic | the only true SEO incumbent; named human | calculator on subdomain splits equity; dated; links out instead of interpreting inline |
| astro.com | ~11M, ~0.5M organic | institutional authority | no SERP presence; registration friction. Benchmark, not occupant |
| astrology.com/horoscope.com | ~9.7M (one owner, Ingenio) | daily-horoscope head | psychic-upsell funnels; measurable decline; trust asymmetry |
| Co-Star/Pattern/CHANI/Nebula | 20M+ downloads (Co-Star) | natal-tied daily loop; friend-compat virality; screenshot voice | paywall creep, dark-pattern billing, notification fatigue, PII unease — occupy the abandoned free ground |

**Capture sequence:** 0–6 mo calculator long-tails (a new site provably ranks top-5 for
"saturn return calculator") + ephemeris/event SERPs (held by Britannica/almanacs, not
astrology sites). Ship the missing architecture: **/synastry/** lander (engine already
does it; astro-seek stronghold), **12 /compatibility/{sign}/ hubs**, **/learn/big-three/**
(high volume, weak competition, currently an anchor), weekly/monthly all-sign hubs,
pair-title intent modifiers. 6–12 mo: compat grid depth, birthday pages, next-year event
pages published early. 12–18 mo: placements/aspects library → "calculator as hub"
interlink pattern no incumbent has. Locked: daily-horoscope head terms (entrenched +
AI-Overview decay, ~39% of informational queries). ES is the second front — via
translated interpretations + /es/horoscopes/ from the language-neutral transit JSON;
freeze FR/IT/PT/RU until the ES loop is complete.

## 9. 90-day plan

- **Week 1 (switches):** analytics fix + GSC/Bing; email provider + daily sender;
  digest decision; draft 2026-09 horoscopes (freshness gate blocks deploys otherwise)
  + September almanac; About/llms.txt boundary fixes + CI grep; homepage CTA/trust
  strip/chip swap/Today-in-nav; regenerate stale OG card.
- **Weeks 2–6 (wiring):** Reddit chart sheet + positions-only link primary + signature
  card + moon/rising share + receiver fix; dynamic-OG edge function (opt-in, no
  storage); link surgery (guides↔horoscopes, result→placements, calendars→events);
  prune + ES CTA repoint; calculator UX fixes.
- **Weeks 6–12 (distribution):** Reddit seeding; social card set + Pinterest pins;
  SERP flank pages; ES front; human reviewer + citations + almanac cadence; push last.
- **Dashboard:** chart completions, saves, email signups + opens→/today/, inbound
  share-link opens (k-factor), query-class coverage. Not head-term rank, not pageviews.

## 10. Stop doing

1. Stop building programmatic pages (no new clusters/locales/people for a quarter;
   prune instead).
2. Stop starting new systems (Account Sync v2, calculator breadth, celebrity DB) until
   analytics + email + share loop have 60 days of data.
3. Stop giving the crypto wing consumer real estate.
4. Stop chasing locked daily-horoscope SERPs (dailies are retention, not acquisition).
5. Stop hiding the differentiators — say "free, no signup, computed in your browser,
   nothing to cancel" plainly, above the fold.
6. Stop dark-launching without a flag manifest; every finished feature gets a ship/kill
   decision.

## 11. Deadlines noticed

- 2026-09-01: September monthly horoscopes — nothing drafted as of 2026-08-19; the
  fail-closed gate will block deploys. Add a monthly reminder workflow (20th).
- September almanac due; cadence is the value.
- Digest opt-in leak is live until resolved.

---

- **Action owner:** site owner
- **Next review:** 2026-09-19 (30-day check on week-1 switch items)
- **Privacy check:** all inputs aggregate/public; no visitor identities, birth data, or
  saved-chart data ingested.
- **Page-velocity check:** this record recommends net **negative** indexable pages
  (prune/noindex); new-page proposals (synastry, hubs, big-three) total <10 in any
  rolling 7-day window and each carries a working tool or computed data.
