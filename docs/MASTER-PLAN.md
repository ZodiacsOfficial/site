# Zodiacs.org — Master Plan

**Prepared by Fable (principal product strategist / experience design director), 2026-07-10.**
Evidence base: full repository audit of `ZodiacsOfficial/site` (build executed, 942 pages, 149/149 tests green), live-site fetches of 40+ routes on zodiacs.org, byte-level bundle measurement of `dist/`, wing + thesis + Numinous Realm article review, and a competitive sweep of Astro-Seek, Cafe Astrology, astro.com, Stellarium Web, TheSkyLive, TimePassages/astrograph, Co-Star, and Wikipedia's *Astrological sign*. Every claim below is tagged **[M]** (measured — file/line or URL evidence) or **[I]** (inference/judgment).

---

## 1. Executive verdict

Zodiacs.org is **much further along than the blueprint assumes, and weaker in exactly one place the blueprint underweights.**

The foundations most astrology sites never achieve are already shipped and verified: a JPL-gated client-side engine (planets <0.05° vs Horizons, LMT-to-the-second timezones) [M `engine.test.ts:32-70`, `localToUtc.test.ts`], 942 static pages with build-time coverage assertions that make the IA impossible to silently rot [M `[sign]/index.astro:16-18` et al.], a 38.6 KB-gz homepage JS payload with the ephemeris provably absent [M dist chunk-graph analysis], daily computed-sky rebuilds that stamp real freshness into HTML, feeds, and sitemap [M `daily-horoscopes.yml`, live `dateModified: 2026-07-10T00:15Z`], the strongest privacy share model in the category (fragment-encoded, server-blind, re-share-contained) [M `share.ts`, `SynastryCalculator.tsx:333-336`], and a coherent Cosmic Void design system whose liquid-glass chrome is genuinely distinctive [M `index.astro:162-174`, `build-glass-maps.mjs`].

The one decisive gap: **the chart itself is furniture.** `Wheel.tsx` has zero event handlers, zero focus targets, zero selection state [M `Wheel.tsx`, grep]. The wheel, the placements table, the aspects list, and the guided reading are four disconnected renderings of the same object. Meanwhile the competitive sweep shows the synchronized chart-↔-prose interaction exists nowhere on the free web — astro.com's AstroClick and TimePassages' click-any-feature are the only implementations, one buried in 1990s IA, the other behind $79 software [M competitive audit §4]. That is the moat to take, and it does **not** require Three.js to take it.

**The verdict in one sentence:** do not rebuild anything; make the existing chart *explorable* (SVG-first, chapter-guided, synchronized with facts and prose), industrialize the already-excellent computed data into the citable reference layer no competitor can match (two of the top data competitors literally bot-block their own tables [M Cloudflare 403s]), fix a short list of trust leaks between the consumer surface and the Astrofolio wing (one of which — a misattributed quote on the archive's "quotes are verbatim" page — is urgent [M archive vs live article grep]), and defer true 3D to the single chapter where it teaches something the wheel can't: the horizon.

The strategy serves the stated ultimate purpose directly: zodiacs.org earns Astrofolio credence only by being **independently, verifiably the best astrology reference and instrument on the web** — credibility flows across the CollectBand bridge in exactly one direction, and every fix below either raises the consumer product's ceiling or stops a leak that would let the wing drag it down.

---

## 2. Verified current state

### 2.1 Scale and shape [all M]

| Fact | Value | Evidence |
|---|---|---|
| Astro-built pages | 942 (built in ~13–15s) | build log |
| Total dist HTML | 967 (942 + 25 wing pages copied from `public/`) | `find dist` |
| Indexable pages / sitemap locs | 704 / 707 | `dist/sitemap.xml` |
| EN indexable vs ES indexable | 655 vs 24 (3.7% parity) | dist scan, `i18n/index.ts:12-29` |
| Clusters | 366 birthdays · 120 placements · 78 pairs · 12 guides · 12 horoscopes · 12 rising · 12 houses · 10 planets · 5 aspects · 4 calendars | route inventory |
| Homepage JS (transitive) | 22 chunks, 86.7 KB raw / **38.6 KB br** | live chunk-graph |
| astronomy-engine in homepage bundle | **Absent** (lazy `full.D42qw0yO.js`, 21.9 KB gz, loaded on demand only) | grep of all 22 chunks |
| Sign-guide pages | **Zero JS** — pure static HTML | `dist/aries/index.html` |
| Total JS | 44 chunks, 155.5 KB gz (incl. a 52.7 KB gz Supabase `sync` chunk orphaned in env-less builds) | `report-bundles.mjs` output |
| Fonts | 6 self-hosted woff2, 169 KB, metric-matched fallbacks; zero Google Fonts | `tokens.css:9-99`, dist |
| Tests | 149/149 green, 16 files; engine gated vs JPL Horizons at 2 epochs | vitest run |
| CI gates | build + typecheck + tests + voice-grep + crypto-vocab-grep + full-dist link/OG/sitemap integrity + wing drift gate | `site-check.yml`, `check-dist.mjs` |
| Crons | daily sky (00:15 UTC, observed firing daily), weekly pulse/distribution, monthly transits, weekly digest | workflows + git log |
| Accounts | Supabase sync behind env gate; RLS owner-only on all tables, anon revoked, tombstoned deletes, tested merge | `supabase/migrations/*`, `merge.test.ts` |
| Hero video | 3.37 MB MP4, autoplays ≥720px, poster-first LCP discipline | live fetch |
| Analytics / RUM | **None exists** | grep of repo |
| Site search / glossary | **None exists** | `SEO.astro` (WebSite has no SearchAction, commented "site has no search") |
| WebGL / Three.js / scroll libs / state libs | **None anywhere** | `package.json` |

### 2.2 What the flagship flow actually does [M]

`/birth-chart/` server-renders a complete labeled form (combobox ARIA, disabled submit) → island hydrates (22.7 KB chunk) → engine lazy-loads on idle/focus → `computeChart` returns a clean renderer-neutral `Chart` `{bodies, angles, houses, aspects, flags}` [M `types.ts:60-69`] → renders: honesty notices (DST gap/fold, LMT, polar, no-time + moon-ambiguity double-compute), big-three cards, **static** wheel, glass share-card button, placements table, collapsible aspects, a 4-step guided reading with dignity data and per-placement links into `/learn/`, save-to-device, fragment share link, and the one sanctioned records line into `/registry/{sun}/`. The result surface is rich; nothing in it is connected to anything else in it.

### 2.3 Verified defect shortlist (full ranked list in §5)

- **[M][HIGH]** `/archive/` attributes a pull-quote ("Astrology enthusiasts, meme lovers, and crypto degens.") and origin claims (BRC-20, "January 2024", "perfect Lindy meme") to the Numinous Realm article; a grep of the full live article finds **zero** of them — directly under the header "Quotes are verbatim."
- **[M][HIGH]** `/compatibility/` carries FAQPage JSON-LD whose three Q&As appear nowhere in visible HTML (policy violation risk + wasted copy).
- **[M][HIGH]** Zero `focus()` calls in any island: after compute, screen-reader users hear nothing on all six calculators.
- **[M][HIGH]** Consumer homepage `Organization.sameAs` → `x.com/astrofoliosol`, `astrofolio.xyz` etc.: the token project's identity is fused into the consumer knowledge-graph entity.
- **[M][HIGH]** IndexNow key is deployed but no automation pings it — the site redeploys daily and never tells Bing/Copilot.
- **[M][HIGH]** Zero citations sitewide (single external link domain across 21 content pages: geonames.org); org-only authorship; no `datePublished` anywhere.
- **[M][MED]** ASC/MC have no external accuracy vector (only a 2.5°-tolerance sunrise invariant) — on a site selling a rising-sign calculator where 1° flips signs at cusps.
- **[M][MED]** `www.zodiacs.org` serves 200 duplicate content; trailing-slash variants 200 without redirect.
- **[M][MED]** `/tools/` and `/learn/` hubs have **no `<h1>`**.
- **[M][MED]** ES surface leaks English in SSR ("Pluto retrógrado", English sign names in the today strip, "Waning Crescent"), has real grammar defects in guides, and dead-ends into EN nav at the second click.
- **[M][MED]** The liquid glass exists as 3 divergent hand-copied recipes on 6 surfaces while ~28 other primary buttons are solid slabs; `--hair` and `--text-md` are consumed but never defined (mobile-menu separators silently render as none).
- **[M][MED]** `ZodiacWheelHero.tsx` (the "homepage signature asset") is dead code — mounted nowhere.
- **[M][MED]** Bundle isolation, the repo's most important performance rule, is convention-only — no CI assertion.

---

## 3. Observed-versus-supplied blueprint table

| # | Blueprint claim / assumption | Status vs. product | Evidence & decision |
|---|---|---|---|
| 1 | The signature experience should be a 2D→3D chart transformation (Three.js) | **Directionally correct but needs modification** | No WebGL exists [M package.json]; wheel is static [M]. The *synchronization* insight is right; wholesale 3D is wrong (astrological wheels are longitude schematics, not spatial pictures — naive 3D misleads). Decision: SVG-first Chart Explorer now; one 3D "horizon" chapter later where 3D genuinely teaches (§9–10). |
| 2 | Site needs saved charts / returning-user flows | **Already resolved** | Local-first profile (20-chart cap, engine-versioned summaries), WelcomeBack, Supabase sync w/ RLS [M `profile/*`, migrations]. Gaps: duplicate saves, transient synastry results [M]. |
| 3 | Mobile is a reduced desktop experience | **Mostly incorrect** | Single-DOM responsive, mobile poster-first LCP, mobile menu staggering [M]. What's missing is *touch-first chart interaction* (nothing to touch yet) — designed in §11. |
| 4 | Core Web Vitals at risk from heavy interaction | **Unsupported → currently false** | 38.6 KB br homepage JS, zero render-blocking external scripts, static sign pages [M]. Risk is *future* regression: no budgets in CI (report-bundles cannot fail) [M `report-bundles.mjs:47`]. Decision: budgets before signature work. |
| 5 | Avoid smooth-scroll libraries | **Already resolved** | Native `scroll-behavior: smooth` with reduced-motion revert; no Lenis/GSAP [M `base.css:8-14`]. |
| 6 | Needs global search + glossary | **Confirmed gap** | No search, no glossary, WebSite JSON-LD deliberately omits SearchAction [M `SEO.astro`]. Sequenced at REFERENCE gate. |
| 7 | Editorial authority missing (bylines, citations, revision history) | **Confirmed** | Org-only author, 0 citations, 0 datePublished [M content audit]. The single cheapest authority upgrade available. |
| 8 | "An llms.txt might be a gimmick" | **Already exists and is real** — but skewed | llms.txt is dense and useful; llms-full.txt is ~60% registry/SDK/token content and cites two self-authored gists as "External citations" [M `llms-full.txt:38-140,76-79`]. Rebalance, don't remove. |
| 9 | Registry visibility vs consumer clarity is unresolved | **Confirmed, with named leaks** | On-page copy boundary holds (0 market vocabulary on consumer pages [M grep]); the *graph* boundary doesn't: sameAs, sitewide footer wing links, llms-full skew, "Collector's wing" kicker resurrecting the retired Collect label [M]. Decisions in §5/§25. |
| 10 | Unknown-birth-time flow needs design | **Already resolved, well** | Noon chart + no-time flag + moon-sign ambiguity double-compute + honest notices [M `ChartCalculator.tsx:135-142`]. Keep; surface in Explorer as a dedicated chapter variant. |
| 11 | Whole Sign vs Placidus needs a flow | **Partially resolved** | Select exists with FAQ; no comparison view, no animated diff [M]. Explorer chapter 5 adds the morph + diff (§11). |
| 12 | Global "Today" vs local civil time unresolved | **Resolved by convention — keep it** | Positions stamped "12:00 UTC" and labeled; ticker computes client-side locally [M]. Decision: computed receipts stay UTC-stamped; presentation may add local phrasing. Never fake local precision. |
| 13 | Dark institutional identity vs day-mode reading | **Decided: stay dark-only for now** | Dark is asserted at three layers and is the brand [M `tokens.css:195`, Base.astro meta]. A "Day Atlas" is real work with real risk to identity; defer until reading-time data exists (needs analytics first). Human ratification in §25. |
| 14 | Full-spectrum branding vs one-accent-per-page | **Resolved in code** | Per-sign `--sign` custom-property tinting with `color-mix`; the 12 hues are the only chroma [M tokens/base]. Extend unchanged into Explorer selection states. |
| 15 | Static search pages vs interactive app state | **Resolved architecture** | Astro static + islands; app state never blocks crawlable HTML [M]. Explorer follows the same rule (all prose in DOM). |
| 16 | Private local computation vs shareability/sync | **Mostly resolved; one real gap** | Fragment share + strip-on-receipt + re-share containment [M]. Gap: share links always carry full birth data; no positions-only mode [M `share.ts`]. Fixed in §11/§24. |
| 17 | 2D convention vs 3D astronomical truth | **Confirmed tension — resolved by design** | Engine computes ecliptic-of-date longitudes; wheel is the convention. Decision: 2D wheel stays canonical; 3D appears only as the horizon/angles chapter, always framed as "where the sky actually was," never as "your chart in 3D" (§10–11). |
| 18 | Content breadth risks index dilution | **Confirmed for two clusters** | 366 birthdays (52% of sitemap, 333 avg words — mitigated by unique computed data) and the 8 thin wing discovery pages (96–291 words, closed link loop, one true orphan) [M route audit §7]. Consolidate discovery; watch birthdays. |
| 19 | Horoscopes are a treadmill risk | **Resolved better than planned** | Monthly editorial + daily *computed* block with same-day dateModified; no fake dailies [M]. Keep the model; decide archives (§25). |
| 20 | Calculation receipts / methodology needed | **Already a strength** | Per-chart UTC receipt + engine version; methodology page names Astronomy Engine, JPL gates, tz history [M]. Extend receipts to citations (§15). |
| 21 | ES is a growth surface | **Directionally correct but overstated today** | 24 real pages, quality defects, nav dead-ends [M §2.3]. Fix quality first, then grow template clusters (§15). |
| 22 | Widgets/feeds/embeds exist and matter | **Confirmed, underexposed** | Clean zero-request embed + 3 feeds; `/feeds/` itself 404s; autodiscovery on 4 templates only [M]. Cheap fixes queued. |
| 23 | Proposed Fable/Codex split | **Confirmed with boundary changes** | See §17 — the interactive wheel reference implementation moves wholly to Fable (taste-critical), the scene-model *extraction* stays Codex-executable against Fable's frozen interfaces. |

---

## 4. Most important strengths to preserve

1. **The honesty system as code.** DST gap/fold, LMT-era, polar-fallback, no-time, moon-ambiguity notices; UTC receipts on every chart; "midday UTC" labels [M]. This is the brand's spine. Nothing new may ship that fakes precision it doesn't have.
2. **Bundle discipline.** Ephemeris quarantined in one lazily-imported module; homepage provably clean; sign pages zero-JS [M]. Every roadmap item below carries a budget line because of this.
3. **The privacy share codec and its invariants** — fragment-only, strip-on-receipt, never re-share someone else's link data [M `share.ts`, `SynastryCalculator.tsx:333-336`]. Extend (positions-only mode), never weaken.
4. **Build-time IA assertions + the dist integrity gate.** 12/78/120/366 coverage asserted at build; every href, OG image, and sitemap loc verified in CI [M `check-dist.mjs`]. The reference layer can scale because of this.
5. **The computed-data spine.** Ingress/eclipse/station tables to the arcminute with UTC instants; "as of Jul 10, 2026" banners backed by a daily cron that actually fires [M]. This is the citation moat — §6 industrializes it.
6. **Cosmic Void + the twelve pastels as the only chroma**, per-sign `--sign` tinting, EB Garamond / Instrument Sans / JetBrains Mono role separation, the `.shell`/`.core` vs `.tile` hierarchy discipline [M tokens/base]. The system is real; it needs consolidation, not reinvention.
7. **The liquid-glass chrome** (displacement-lens + frosted floor + reduced-transparency fallback) [M] — the owner's instinct is right: this is a signature material. It needs to become one component, not three recipes.
8. **Wing containment at the copy level** — CI greps enforce the vocabulary boundary; the records register works [M `site-check.yml`]. The fixes needed are graph-level, not a redesign.
9. **The voice.** "Anger arrives fast and leaves fast. An Aries flare-up is weather, not climate" [M live]. The remaining smug tells are a short grep-able list (§5).
10. **Supabase security posture** — RLS owner-only, anon revoked, minimal service grants, opt-in-off digest [M migrations]. Retention work builds on this without rework.

---

## 5. Most important problems to solve

Ranked by (leverage × urgency). T = trust, X = experience, R = reach, F = foundation.

| # | Problem | Class | Evidence | Resolution owner |
|---|---|---|---|---|
| P1 | Archive misattributes quotes/claims to a source that doesn't contain them, under a "quotes are verbatim" banner | T | [M] wing-live audit §1.5 | Human decision + Codex fix (packet C4) — **this week** |
| P2 | The chart is inert: no selection, no synchronization between wheel/table/prose; the category's biggest open gap is unclaimed | X | [M] `Wheel.tsx` (0 handlers) | **Fable** — the vertical slice (§11) |
| P3 | Consumer entity fused to token project (sameAs → astrofoliosol/astrofolio.xyz); llms-full 60% wing; footer wing links sitewide | T/R | [M] `index.astro:45-49`, `llms-full.txt` | Human decision + Codex C4 |
| P4 | Authority-naked content: 0 citations, 0 bylines, 0 datePublished; calendars (the most citable pages) carry no machine-readable dates or Dataset markup | R | [M] content audit | Codex C1 (+ editorial policy, human) |
| P5 | No SR path after compute (0 focus management), fake tablist, moon-phase SSR lies to AT, no noscript | X | [M] islands audit §9 | Codex C2 |
| P6 | No analytics/RUM at all — signature-experience impact will be unmeasurable | F | [M] repo grep | Human vendor decision → Codex C1b |
| P7 | Performance rules unenforced: report-bundles can't fail; engine isolation un-asserted; no visual regression despite a shipped backdrop-filter minifier incident | F | [M] `report-bundles.mjs`, `astro.config.mjs:23-31` | Codex C3 |
| P8 | Glass system fragmentation (3 recipes / 6 surfaces / 28 solid buttons) + dead tokens (`--hair`, `--text-md` undefined-but-consumed; `--s-*` defined-but-unused) | X | [M] design audit P1/P2/P3/P5 | Fable defines → Codex rolls out |
| P9 | Discoverability leaks: IndexNow dormant, www 200-duplicates, no-slash 200s, hub pages h1-less, compatibility FAQ invisible, learn article anchor-less, /feeds/ 404 | R | [M] seo audits | Codex C1 |
| P10 | ES surface: English leaks in SSR, grammar defects, nav dead-ends, 12 ES pages with zero JSON-LD | R | [M] wing-live §1.7, seo audit | Codex C5 |
| P11 | ASC/MC accuracy gate too loose for a rising-sign product; Placidus house numbers mislabel at high latitude | T | [M] engine audit §7.1/7.3 | Codex C3 (vectors) + Fable (wheel label fix in slice) |
| P12 | Island duplication (birth fields ×5, engine loader ×6, profile listener ×6) makes every cross-cutting improvement a 5-file edit | F | [M] islands audit §11 | Codex C6 |
| P13 | Synastry results are transient (no save/share) while natal has all three — the relationship loop leaks | X | [M] islands audit §6 | Codex, post-slice (RETENTION) |
| P14 | Thin wing discovery cluster (8 doorway pages, self-gist "citations", one orphan) sits in the sitemap of a consumer domain | T/R | [M] wing audit §7 | Human + Codex C4 |
| P15 | Residual voice violations: "…, dated." fragment H1s ×4, "no vague cosmic weather", "Most astrology sites never explain their math. This one does" | X | [M] content audit | Codex C1 (copy edits, list supplied) |

---

## 6. "Wikipedia" reference strategy

The metaphor operationalized: Wikipedia wins because every entity has **one stable URL, one dense definition up front, cited claims, revision dates, anchors for deep linking, and a predictable structure**. Zodiacs.org can beat it on exactly one axis — **computed, year-exact, method-documented data** — and must match it on structure and provenance.

**Already in place [M]:** stable entity URLs for all 615 reference pages; per-entity schema (Article+Breadcrumb+FAQ on nearly all); anchors on sign guides; `dateModified` on collections; a real methodology page; EN guides averaging 1,008 words with non-templated heritage lore.

**The six moves (dependency order):**

1. **Provenance pass (Codex C1).** Every Article node gains `datePublished`, `publisher → #org`, `mainEntityOfPage`, `inLanguage`. Every calendar page gains `Dataset` markup (the wing already has it; the consumer surfaces — the *actually citable* ones — don't) plus per-event `Event` nodes with `startDate` for the next 12 months. Sitemap `lastmod` extended to the 67 evergreen URLs. Heading IDs on every learn article (the how-to-read tutorial currently has zero anchors).
2. **Sources system (Codex C1 + human editorial policy).** A `sources` frontmatter field on guides/learn/calendar templates rendering a compact "Sources" line (MUL.APIN editions, Ptolemy, NASA eclipse catalog, IANA tzdb, Astronomy Engine) with `citation` schema. This single change converts the site's biggest weakness at near-zero cost — the content audit's verdict was explicit: the gap between "excellent content" and "citable reference" is metadata, not writing.
3. **The Living Correspondence Chart** (`/learn/zodiac-dates/`) — the page Wikipedia can't build: the canonical master table (sign / glyph / Unicode / element / modality / polarity / rulers / house / both hemispheres' seasons) **plus computed year-exact ingress instants** from the already-generated `ingresses.json`, updated annually by the existing refresh cycle, with Dataset markup and a CSV download. Wikipedia footnotes its own imprecision ("Approximate… Start Dates[11]"); this page publishes the exact instants. Target: become the reference URL for "zodiac dates YYYY". Owner: Codex (template is deterministic); Fable reviews the table design.
4. **Authorship & review** (human + Codex). A named editorial identity (even one person) with an `/about/`-anchored Person entity, `author`/`reviewedBy` on Articles, and a visible "Reviewed · date" line. Without this, E-E-A-T stays capped regardless of content quality.
5. **Glossary + search** (REFERENCE gate). `/learn/glossary/` — ~120 terms, one paragraph + one receipt each, `DefinedTermSet` schema, anchor per term; becomes the internal-link substrate ("orb", "cusp", "applying" link to definitions sitewide). Search ships as a lazy client-side index over titles/descriptions/terms following the existing cities-shard pattern (no new deps) — Pagefind only if the hand-rolled index proves insufficient.
6. **Cluster hygiene** (Codex C1/C4): consolidate the 8 discovery doorways into `/sdk/` sections with 301s (human approval); keep birthdays but monitor indexation as its own GSC cohort; hubs get real `<h1>`s and 200-word intros (aspects hub is 104 words).

**What "citable" means concretely, and the test:** an LLM or journalist asking "when exactly does the Sun enter Leo in 2027?", "what were the 2026 Mercury stations?", "what is a Placidus house?" should find zodiacs.org pages that (a) contain the exact answer in HTML, (b) carry machine-readable dates and Dataset provenance, (c) name their method, and (d) are fetchable by any agent — the last being a monopoly position, since Astro-Seek and TheSkyLive serve Cloudflare 403s to non-browser agents [M].

---

## 7. "Google Maps" interactive utility strategy

The metaphor operationalized: Google Maps works because **one canonical interactive object (the map) is the interface to everything** — search lands on it, entities pin to it, layers toggle on it, directions animate over it, and every state is linkable. The zodiacs.org equivalent: **the chart wheel becomes the map.**

Concretely, the interaction system the metaphor requires:

- **One canonical object:** the natal wheel (later: bi-wheel for synastry/transits, sky wheel for today) rendered from one `ChartSceneModel` derived from the engine's `Chart`.
- **Entities:** every body, sign segment, house wedge, aspect chord, and angle is an addressable, selectable entity with a stable id (`body:Sun`, `house:7`, `aspect:Sun-square-Mars`) — the same identity keys the table rows and reading items already use [M `ChartCalculator.tsx:467,484`].
- **Layers:** zodiac / houses / planets / aspects toggles; aspect-type filters; label-density modes — the Maps traffic/transit/terrain equivalent.
- **The inspector:** selecting any entity opens a compact fact card (desktop: side panel; mobile: bottom sheet) with computed receipts and one prose line, linking into the reference layer (`/learn/placements/mars-in-scorpio/`) — the Maps place card.
- **Synchronized prose:** the guided reading and the wheel share selection state bidirectionally — tap Mars anywhere, Mars is selected everywhere.
- **Guided routes:** chapters (the "directions" of the metaphor) walk a first-timer through zodiac → horizon → big three → planets → houses → aspects, each chapter a declarative scene state, fully reversible.
- **Deep links:** `?sel=body:mars&layers=aspects` — every explored state is shareable without birth data (the map URL, not the home address).
- **Time (later, RETENTION):** the transit tracker becomes "the sky moving over your chart" — same wheel, second ring, a date scrubber; the year-scan module that already exists [M `year-scan.ts`] provides the itinerary.

The strategy is sequenced so the map exists *before* the ambitious cinematography: interactivity and synchronization first (they carry all of the utility), chapters second (they carry the pedagogy), the 3D horizon chapter last (it carries the one spatial truth the wheel cannot show). §9–11 specify this.

---

## 8. Product moat and growth flywheel

**A. Reference moat** — computed, cited, anchored, bilingual reference (§6) that agents can actually fetch. Competitors either bot-block, ship JS shells, or publish uncited prose [M competitive audit].
**B. Utility moat** — the private client-side studio: instant charts, no account, honesty flags, saved charts, synastry, transits; extended by the Explorer (§11), positions-only sharing, and calendar-native retention (iCal feeds of *your* transits computed in-browser — Co-Star-grade recurrence with zero data collection; Astro-Seek gates this behind accounts [M]).
**C. Interaction moat** — the one coherent selection/inspector/chapter language across natal, synastry, transits, and every learn explainer; the pastel-icon system as the interaction vocabulary (discs = identity, line-art glyphs = data, hues = selection tint).
**D. Distribution moat** — share cards and privacy-safe links; embeds/widgets with backlink-as-license; feeds; the correspondence chart and calendars as the linkable citation targets; the SDK/registry wing for builders (contained, §5).

**The flywheel:** Search/LLM citation lands a visitor on a reference or calendar page → embedded tool converts them to a chart (privacy promise lowers the barrier; no account wall — the anti-Co-Star move) → the Explorer makes the result *comprehensible*, which is what makes it worth saving → save fills the profile glyph → WelcomeBack + personalized Today + transit timeline give a reason to return → a second chart starts the relationship loop (synastry) → shares/cards/iCal/embeds put computed artifacts in other people's feeds and calendars → those artifacts link back to reference pages → authority compounds → more citations. The wing sits off the third turn of the wheel: a saved-chart user who becomes a collector finds the registry through the records register; nothing upstream depends on them doing so.

Each moat reinforces the others: the reference layer makes the tool results explainable (every placement links to a page); the tool generates the unique data that makes the reference citable; the interaction language makes both memorable; distribution feeds all three.
---

## 9. Three signature-experience concepts

### Concept A — "The Chart, Unfolded" (the proposed 2D→3D transformation)

- **Core metaphor:** the paper wheel lifts off the page and becomes a celestial armillary; scroll disassembles it into zodiac band, planet field, house frame, aspect web; it resolves back into the wheel.
- **User problem:** "what *is* this diagram?" answered by literally taking it apart.
- **Beginner value:** high theatrical clarity of the layer separation. **Expert value:** low — experts don't need the disassembly and will want the data density back.
- **Visual identity:** WebGL armillary in void space; pastel discs as planet sprites; garamond museum labels floating in depth.
- **Interaction:** scroll-scrubbed camera + chapter states; tap planets in 3D; 2D/3D toggle.
- **Mobile:** severe — scroll-scrub + camera + touch-orbit conflict; needs a fully separate chapter-tap mode.
- **Accessibility:** the entire 3D layer must be a mirror of DOM content (mandated); reduced-motion = static renders per chapter.
- **Technical:** Three.js (~150 KB gz min) or hand-rolled WebGL; renderer contract from ChartSceneModel; context-loss recovery; device tiers.
- **Performance risk:** high — the single biggest JS object in the site's history, on its money page.
- **Effort:** **XL.**
- **Gimmick risk:** high — the armillary is beautiful exactly once; the wheel's geometry (ecliptic longitude flattened to a ring) is *already* the correct projection, so 3D adds cinema, not information, for 5 of 7 chapters.
- **Defensible if:** the 3D representation taught something true. Mostly it doesn't — the zodiac ring, aspects, and houses are angular constructs best shown angularly.

### Concept B — "Chart Explorer" (the interactive instrument) ← **selected**

- **Core metaphor:** a museum instrument you're allowed to touch. The wheel is the map (§7); every mark is an entity; chapters are a guided tour of *your own* chart; facts, wheel, and prose are one synchronized object.
- **User problem:** the result page today is four disconnected renderings; beginners can't connect "Mars ♂ 8° Gemini · house 3" to the mark on the wheel to the sentence about their temper.
- **Beginner value:** highest of the three — the guided chapters are built from the existing guided-reading pedagogy [M `ChartCalculator.tsx:493-549`], now synchronized with the object itself.
- **Expert value:** high — selection receipts, aspect filters, orb-weighted chords, label-density "dense" mode, house-system morph with diff table, deep-linkable states.
- **Visual identity:** the existing wheel, elevated: selection lifts a body's disc (scale + hue ring + dim-others at 35% opacity), aspect chords weight by orb tightness, the sign ring already carries the pastel arcs [M `Wheel.tsx:102-135`]. No new visual language needed — the Cosmic Void system already contains it.
- **Interaction:** tap/click/keyboard select; inspector panel/bottom-sheet; chapter rail; layer chips; house-system toggle; anchor-rotation teaching toggle (ASC-left ↔ 0°-Aries-left).
- **Mobile:** designed independently (§11): bottom sheet with detents, chapter bar, 44px hit targets on a wheel that already renders at full-bleed width.
- **Accessibility:** the placements table remains the canonical accessible structure; selection is announced; chapters are real DOM sections; keyboard roving on the wheel is an enhancement, never the only path.
- **Technical:** ~300–400 new lines in Wheel + a pure `buildSceneModel()` extraction + explorer state in the island. Zero new dependencies. The share-card serialization path (the hard constraint [M `share-card.ts:47-88`]) keeps working because interaction props are optional.
- **Performance risk:** low — budgeted at +≤9 KB gz on `/birth-chart/` only.
- **Effort:** **M** (slice) + S (rollout per surface).
- **Gimmick risk:** low — every state answers "what am I looking at"; nothing moves that doesn't mean something.
- **Defensible because:** nobody offers free synchronized chart↔prose on the web [M competitive §4]; it compounds with the reference layer (every inspector links into `/learn/`), and its interaction grammar reuses across synastry, transits, and every explainer.

### Concept C — "The Horizon Dome" (3D where 3D is true)

- **Core metaphor:** stand at the birthplace at the birth minute; the dome of sky above you, the ecliptic arcing across it, planets where they actually were; the eastern horizon slices the ecliptic — *that intersection is the Ascendant.* Rotate the dome flat and it becomes the wheel.
- **User problem:** ASC/MC/houses are the concepts beginners genuinely cannot get from a 2D wheel ("why is Aries 'rising'? rising over *what*?"). This is the one place spatial truth beats the schematic.
- **Beginner value:** very high for exactly one lesson. **Expert value:** medium (a beautiful explainer, not a working tool).
- **Visual identity:** points + arcs + a horizon plane in the void — restrained, museum-register, no starfield kitsch.
- **Mobile:** single guided camera path, tap-to-advance; no free orbit needed.
- **Accessibility/fallback:** the same lesson as a 3-frame static SVG diagram (horizon line + ecliptic + ASC intersection) — required deliverable, also serves reduced-motion and WebGL-failure.
- **Technical:** small enough scene to hand-roll (points/lines/one plane) or use a stripped Three.js build; lazy module loaded only inside the chapter; target ≤60 KB gz or it doesn't ship.
- **Performance risk:** medium, fully contained by lazy boundary + device tiers.
- **Effort:** **L.**
- **Gimmick risk:** medium — controlled by scoping it to the horizon lesson only.
- **Defensible because:** it uses the same computed chart (GAST, obliquity, ASC already in the engine [M `houses.ts:14-20`]) — the interface *proves* the number by showing the geometry, which is the methodology page made visible.

---

## 10. Selected concept and rationale

**Concept B ships as the production vertical slice. Concept C becomes Chapter 2's deep-dive ("Your horizon"), built only after B's instrumentation proves engagement (SIGNATURE gate). Concept A is rejected as a wholesale approach** — its one honest lesson (layer separation) is delivered by B's chapter dimming at 1% of the cost, and its spatial framing is pedagogically wrong for zodiac/aspects/houses, which are angular constructs. This satisfies the non-negotiables directly: the SVG remains canonical; 3D appears only where it materially improves understanding (the horizon); nothing educational lives only in canvas; the homepage bundle is untouched.

**Why B is the right first bet, in order of weight:**
1. It attacks the verified weakest link (P2) with the lowest-risk technology (the renderer that already exists) and zero new dependencies — consistent with a codebase whose every strength is discipline.
2. It is the interaction language the whole roadmap reuses: synastry bi-wheel selection, transit ring scrubbing, and the learn explainers ("mini-wheels" showing a square vs a trine) are all `ChartSceneModel + selection + inspector` instances.
3. It converts comprehension into retention: the save/share CTAs sit at the end of a guided tour of *your own chart* instead of below an inert image. That is the measurable hypothesis (§20): explored charts save and share at a higher rate.
4. It is shippable incrementally behind clean gates: selection sync alone is a complete, valuable release (INTERACTION gate) before chapters (SIGNATURE gate) — the smallest release that tests the thesis.

---

## 11. Production vertical-slice specification — "Chart Explorer" on `/birth-chart/`

### 11.1 Scope

One route (`/birth-chart/`, EN; ES follows at rollout), `mode: 'full'` results only. Everything below the big-three cards is restructured into the Explorer: wheel + inspector + chapter rail + the guided reading (which becomes the chapters' prose). Moon/rising modes, synastry, and transits are out of scope (rollout wave 2).

### 11.2 Data contracts (frozen before any code)

```ts
// src/lib/scene/types.ts — pure data, no DOM, no ephemeris imports
import type { BodyName, AspectType, ChartFlag, Angles, HouseSystem } from '../engine/types';
import type { Dignity } from '../dignities';

export type SignSlug = 'aries' | /* … */ 'pisces';

export type EntityRef =
  | { kind: 'body'; body: BodyName }
  | { kind: 'sign'; sign: SignSlug }
  | { kind: 'house'; house: number }            // 1–12
  | { kind: 'aspect'; a: BodyName; b: BodyName; type: AspectType }
  | { kind: 'angle'; angle: 'asc' | 'mc' | 'dsc' | 'ic' };

export const entityId = (e: EntityRef) => string;  // stable, e.g. "body:Sun", "aspect:Sun-square-Mars"

export interface SceneBody {
  body: BodyName; lon: number; drawLon: number;   // drawLon = collision-nudged (moved out of Wheel render)
  sign: SignSlug; signDegree: number;             // 0–30 within sign
  house: number | null; speed: number; retrograde: boolean;
  dignity: Dignity | null;
  aspects: string[];                               // entityIds of aspects touching this body
}
export interface SceneHouse { index: number; cuspLon: number; spanDeg: number; midLon: number; }
export interface SceneAspect {
  a: BodyName; b: BodyName; type: AspectType; orb: number; applying: boolean;
  weight: 0 | 1 | 2;                               // orb-tightness class → stroke width (fixes the lost-orb defect)
}
export interface ChartSceneModel {
  engineVersion: string;
  anchor: { lon: number; mode: 'asc' | 'aries' };  // rotation anchor (teaching toggle)
  bodies: SceneBody[]; houses: SceneHouse[] | null; angles: Angles | null;
  aspects: SceneAspect[]; flags: ChartFlag[];
  houseSystem: HouseSystem;
}
// PURE function; unit-tested against the Kahlo fixture + parity-tested against Chart:
export function buildSceneModel(chart: Chart, opts?: { anchorMode?: 'asc' | 'aries' }): ChartSceneModel;
```

```ts
// src/lib/scene/state.ts
export interface ExplorerState {
  mode: 'free' | 'guided';
  chapter: number;                                  // 0–7, guided only
  selection: EntityRef | null;
  layers: { zodiac: boolean; houses: boolean; planets: boolean; aspects: boolean };
  aspectTypes: Set<AspectType>;
  labels: 'minimal' | 'standard' | 'dense';        // dense = degrees on wheel
}
export interface SceneEmphasis {                     // derived, consumed by every renderer
  dimmed: Set<string>; highlighted: Set<string>; labeled: Set<string>;
}
export function emphasisFor(scene: ChartSceneModel, state: ExplorerState): SceneEmphasis; // pure, tested
```

Renderer contract: `Wheel` gains **optional** props `{ scene?: ChartSceneModel; emphasis?: SceneEmphasis; selection?: EntityRef|null; onSelect?: (e: EntityRef|null) => void; interactive?: boolean }`. With all omitted it renders byte-identically to today — asserted by a share-card serialization snapshot test (the hard constraint). Numerical invariant: every `SceneBody.lon` equals the engine `BodyPosition.lon` exactly; `drawLon` may differ but ticks always render at true `lon` (already the Wheel's convention [M `Wheel.tsx:193-198`]).

### 11.3 Entry state & user intent

Result renders exactly as today (notices → big-three cards) and then the Explorer block: wheel (interactive immediately — hover/tap works with no mode ceremony), inspector dock, chapter rail reading "Read this chart, in order →" (the existing pedagogy's title, promoted). Returning users deep-linked via `?sel=body:mars` land in free mode with Mars selected. Intent split: first-timers follow the rail; the chart-literate ignore it and tap.

### 11.4 State machine

```
idle ──compute──▶ free ◀──┬── select(entity) / clear (Esc, tap-void)
                          ├── layerToggle / aspectFilter / labelDensity
                          ├── houseSystemToggle (recompute → morph)
                          └── anchorToggle (asc ↔ aries rotation)
free ──startTour──▶ guided(ch 0) ── next/prev/railJump ──▶ guided(ch n) ── exit/complete ──▶ free
recompute (any source: form edit, share link, house toggle) → state preserved where valid,
selection cleared if the entity no longer exists (e.g. houses gone on no-time chart)
```

Guided chapters **set** state declaratively (layers, emphasis, inspector content, prose anchor); user interaction inside a chapter is allowed and does not exit the tour; `prev` restores the exact prior chapter state (states are value objects, no accumulated mutation). URL reflects `mode/chapter/sel/layers` via `history.replaceState` — **never** birth data (that stays in the existing `#c=` codec).

### 11.5 Chapter table (the storyboard)

Desktop: chapters advance by rail click or by scrolling the prose column (IntersectionObserver on chapter sections — native scroll, no scroll-jacking; the wheel column is `position: sticky`). Mobile: the wheel is sticky-top, chapters are swipeable cards in a scroll-snap row + the same prose sections below. "Progress" = chapter index; there is no scrub-interpolation between states (discrete states, tweened transitions).

| Ch | Title (prose H3) | Visible layers | Emphasis / "camera" (SVG transform) | Inspector | DOM prose | Mobile equivalent | Reduced-motion |
|---|---|---|---|---|---|---|---|
| 0 | This is your sky | all | none; receipt line pulses once | receipt card (UTC instant, place, house system, engine ver) | "Computed from the {year} sky…" (existing receipt copy) | identical | pulse dropped |
| 1 | The zodiac ring | zodiac | houses/planets/aspects dim to 0.15; ring arcs to full opacity; the Sun's tick stays lit; optional anchor-toggle demo rotates ASC-left ↔ 0°-Aries (600ms, --ease) | sign card for user's Sun sign | what the 12 segments are; tropical note; link `/learn/zodiac-dates/` | identical; rotation on tap | rotation instant |
| 2 | Your horizon | zodiac + angles | ASC–DSC axis strokes to 1.0, MC–IC secondary; wheel tilts −4° perspective *hint* (CSS transform, ≤300ms) | angle card: ASC lon, sign, "the sign rising in the east" | why ASC sits left; birth-time dependency; **[later: “See the actual sky” → 3D dome module]** | tilt omitted (small screens: axis emphasis only) | tilt omitted |
| 3 | The big three | zodiac + planets | Sun → Moon → ASC highlighted in sequence on rail-advance (sub-steps 3a/3b/3c); others dim 0.25 | body card per sub-step | the existing bigThree() lines | sub-steps = swipes | sequence = instant swaps |
| 4 | The planets | planets (+zodiac 0.4) | each planet selectable; speed/Rx encoding legend appears; personal planets vs outer ring annotation | selected body card | existing planetInHouseLine/dignity prose per body | identical | — |
| 5 | The houses | houses (+planets 0.4) | wedges tinted by element at 6%; house numbers correct-positioned (fix: number at wedge *midpoint*, not cusp+15° [M defect `Wheel.tsx:149`]); house-system toggle morphs cusps (450ms) + diff table appears ("3 placements change house under Placidus") | house card: cusp lon, span, occupants | existing readRooms prose; whole-vs-Placidus explainer link | toggle in sheet header | morph instant, diff table only |
| 6 | The conversations | aspects (+planets 0.5) | chords weight by orb class; type filter chips; top-4 narrated with both bodies pulsing on select | aspect card: receipt (orb, applying) + natalAspectLine() | existing readAspects prose | chips scroll row | pulse dropped |
| 7 | The whole picture | all | everything returns (350ms stagger by layer); save/share CTAs + chart-weather lines | weather card | existing readWeather lines; "Save this chart" | identical | stagger dropped |

No-time charts: chapters 2 and 5 are replaced by a single "Why this chart has no houses" chapter (existing notice copy, expanded), and the ASC slot in chapter 3 shows the needs-birth-time card — the state machine handles this by chapter-list derivation from `scene.flags`.

### 11.6 Selection & inspector state

- Hit targets: body discs (existing 0.033·size circles [M `Wheel.tsx:199`]), sign arc segments, house wedges (transparent paths), aspect chords (invisible 12px hit-stroke under the 1px visible stroke), ASC/MC labels. All get `data-entity="{entityId}"`.
- Selection visual: selected entity at full opacity + `--sign`-hue ring (2px) + disc scale 1.08; related set (its aspects, its house, its sign) at 0.7; rest at 0.35. Colors come only from the twelve hues — no new chroma.
- Inspector (desktop): right column card in the existing `.shell/.core` vocabulary, `aria-live="polite"` heading. Fact block in `.mono` receipts; one interpretation sentence; "Read more →" into `/learn/…`.
- Inspector (mobile): bottom sheet, 3 detents (peek 88px / half / full), drag + Esc/scrim dismiss, `role="dialog"` at full detent only, scroll-locked body at full. Native touch (pointer events + CSS scroll-snap for detents; no gesture library).
- Table/prose sync: table rows and reading items get `aria-selected` + hue tint on selection; clicking them selects on the wheel (they already key by the same identity [M]). Scrolling prose in guided mode advances chapters; selecting in free mode scrolls the matching reading item into view (`scrollIntoView({block:'nearest'})`, suppressed under reduced motion).

### 11.7 Input models

- **Touch:** tap select / tap-void clear; swipe chapters; sheet drag; no pinch/rotate in v1 (the wheel is already full-width; free zoom adds cost without a lesson).
- **Keyboard:** wheel container `tabindex=0`, `role="group"`, `aria-roledescription="birth chart"`; Arrow←/→ cycle bodies in zodiac order, Arrow↑/↓ cycle entity kinds (bodies → houses → aspects), Enter opens inspector focus, Esc clears; chapter rail is a proper `tablist` (real one — roving tabindex, arrows, `aria-controls`); every wheel-reachable action also exists as DOM controls (table rows are buttons), so the SVG path is enhancement.
- **Screen reader:** selection announcements via one polite live region ("Mars. 8 degrees 6 minutes Gemini, third house, retrograde. Two aspects."); chapters are real `<section>`s with headings; the wheel keeps `role="img"` + label when non-interactive (share-card, demo) and switches to the group model only when `interactive`.
- **Reduced motion:** all transitions ≤120ms opacity-only or instant (per table above); scroll-snap off; `scrollIntoView` auto. Reduced transparency: inspector sheet goes opaque (existing pattern [M `calculator.css:292-298`]).

### 11.8 Recalculation, comparison, loading, failure

- Birth-data change or shared-link arrival: bodies tween along shortest arc 400ms `--ease`, cusps morph, aspects cross-fade; reduced-motion instant. Selection persists if the entity still exists.
- House-system comparison: toggle recomputes via existing engine call; diff table lists `body: house_ws → house_plac` rows; the "before/after" is the same morph replayed by the toggle (no separate mode).
- Loading: engine already lazy-loads with idle warm [M]; Explorer adds nothing to first paint; wheel skeleton = rings only while computing.
- Invalid input: unchanged existing error path (`role="alert"`).
- WebGL failure: N/A in the slice (no WebGL). For the later dome chapter: capability-check → static SVG diagram fallback (a required deliverable of that chapter, also the reduced-motion form).
- Print: print stylesheet — wheel (SVG prints natively), placements table, reading; chrome hidden.
- Export/share: existing card + `#c=` link unchanged; **new `#p=` positions-only token** (v2 wire: computed longitudes ×12, angles, house system, engine version — no date/time/place) rendering a read-only chart with a "positions only — birth details not included" notice; card dialog gains a "hide birth details" toggle that swaps the receipt line for the engine-version line.

### 11.9 Assets, tiers, budget

No new raster assets (discs and glyph paths exist). New CSS ≤3 KB gz in `calculator.css`/new `explorer.css`. JS budget: **`/birth-chart/` page JS +≤9 KB gz over current** (scene 2, emphasis 1, explorer UI 4, sheet 2) — enforced by the C3 budget gate. Device tiers: none needed for SVG (the collision-nudge is O(n²) over 11 bodies); `will-change` only during transitions.

### 11.10 Instrumentation (requires analytics baseline, §16/§25)

`explorer_ready`, `select {kind}`, `tour_start`, `chapter_view {n}`, `tour_complete`, `layer_toggle {layer,on}`, `aspect_filter {type}`, `house_toggle {to}`, `anchor_toggle`, `share_positions`, `save {explored: bool, chapters_seen}` — the last powers the §20 hypothesis test.

### 11.11 Acceptance tests

1. **Parity:** `buildSceneModel(kahlo).bodies[*].lon` strictly equals engine output; snapshot of the full SceneModel for the Kahlo fixture committed (extends the existing `GENERATE_FIXTURE` pattern [M `engine.test.ts:252-279`]).
2. **Serialization regression:** share-card SVG for the Kahlo chart is string-identical before/after the Wheel refactor with interaction props omitted.
3. **A11y:** axe clean on result state; keyboard traversal e2e (tab→wheel→arrows→Enter→inspector→Esc); focus lands on results heading after compute (ties into C2); live-region announces selection.
4. **Reduced motion e2e:** with `prefers-reduced-motion`, no transition exceeds 120ms; chapter changes are instant.
5. **Budget:** `/birth-chart/` transitive JS ≤ (current + 9 KB gz) in CI.
6. **No-time chart:** chapter list derives correctly; no dead chapter; selection of `house:*` impossible.
7. **State restore:** guided → prev → prev reproduces exact emphasis sets (value-object equality).

---

## 12. Information architecture recommendation

**Verdict: the IA is fundamentally right — protect it, prune the wing's edge, and add three reference nodes.** No URL migrations for consumer surfaces (search equity is accruing on stable, asserted-coverage URLs).

Keep as-is: `/{sign}/` guides at top level (the crown jewels), flat tool slugs, `/learn/` clusters, `/birthday/`, `/compatibility/{pair}/`, `/horoscopes/{sign}/` replace-in-place model (stable URLs accumulate equity; decide archives per §25 but default is keep-replacing), `/registry/` wing URLs.

Changes (all additive or hygiene):
1. `<h1>` on `/tools/` and `/learn/` + 150–250-word intros on the three thin learn hubs [M].
2. **Add `/learn/zodiac-dates/`** — the Living Correspondence Chart (§6.3).
3. **Add `/learn/glossary/`** (REFERENCE gate) — the internal-link substrate.
4. **Add `/feeds/`** index page (currently 404 while llms.txt points near it [M]).
5. Sign guide → `/rising-sign/{sign}/` direct links (the missing highest-relevance edge, ×12×2 [M content audit]).
6. Homepage: link `/birthday/` and one calendar (currently zero homepage paths into two big clusters [M route audit §6]).
7. Wing: consolidate 8 discovery pages → `/sdk/` sections + 301s; de-orphan or delete `/astrofolio-sdk/`; fix the two stale `/`-pointing links [M]. (Human approval §25.)
8. ES: fix quality first (C5), then extend `LOCALIZED_PATHS` cluster-by-cluster (horoscopes → pairs → learn) with real translations; kill or canonical-to-EN the 259 noindex stubs' self-canonicals [M seo audit].
9. Navigation unchanged (Signs/Tools/Learn/Horoscopes/Saved + Registry chip) — it tested clean in the live audit; do not add Explorer as a nav item (it lives inside results).

---

## 13. Visual and motion system

The system exists; this section consolidates it into law and extends it to the Explorer. One design language, two registers (consumer void / wing museum) — unchanged.

### 13.1 Icon & glyph tiers (the pastel system as interaction vocabulary)

- **Tier 1 — Sign discs** (the twelve pastels, AVIF/WebP at 48/128/400): identity marks. Rule stays `≤24px→48, ≤64px→128, else→400` [M `SignIcon.astro:20`]; fix the two violations (TodayBySign 30px@48 [M]). Discs never carry UI state other than the `--sign` tint of their container.
- **Tier 2 — Line-art glyphs** (planets/aspects from `glyphs/paths.ts`): data marks, inherit `currentColor`, tint via `--sign`. In the Explorer these are the selectable entities' symbols.
- **Tier 3 — House badges** (serif numerals on pastel radial discs): structural marks.
- **Medallion moments** (400-tier disc + drop-shadow halo): guide heroes and chapter-1 emphasis only — reserved, never in grids.

### 13.2 Sign color usage (selection model)

`--sign` custom property remains the only tint channel. Selection = hue ring + `color-mix` washes at the existing 6–16% alphas; dimming = opacity, never desaturation (keeps the pastels honest). Aspect chords keep their fixed semantic colors [M `Wheel.tsx:28-34`] with a non-color channel added: stroke-width by orb class + dash for separating (fixes the color-only encoding [M a11y finding]).

### 13.3 The glass system (the owner's directive, made law)

Three tiers, one component, shipped as `.btn--glass` in `base.css` + `GlassDefs.astro` in the layout:

- **G1 — Frosted (universal):** the calc-share recipe [M `calculator.css:267-279`] — gradient sheen + `blur(12px) saturate(140%) brightness(1.16)` + rim light. Default glass everywhere over void.
- **G2 — Frosted-over-media:** the hero recipe (blur 14/150%/1.12, stronger rim) — only over footage/imagery.
- **G3 — Lens (progressive):** the SVG displacement refraction, applied via `html.zdx-lens` on G1/G2 surfaces when the filter defs are present. Defs + `glass-maps.json` move into `Base.astro` (they're 9.8 KB inline; gate inclusion per-page by a layout prop so text-only pages skip them).
- **Fallback:** `prefers-reduced-transparency` → opaque `rgba(10,12,17,0.86+)` (existing pattern, promoted to the component).
- **Hierarchy decision (Fable):** the solid ink slab remains the **one** primary conversion CTA per page (highest luminance = highest priority); glass becomes the standard for **secondary and contextual** actions (share, save, ghost CTAs, nav, inspector chrome, chapter rail). This preserves CTA contrast (glass base is mid-luminance) while giving the owner sitewide glass consistency. If the owner wants glass primaries, G2+solid-orb is the compromise spec — flagged in §25.
- Rollout: Codex applies the class across the ~28 audited sites after Fable lands the component.

### 13.4 Motion grammar (each pattern's meaning stated; anything meaningless is banned)

| Primitive | Means | Spec | Where |
|---|---|---|---|
| Draw-in | "this was just computed" | wheel stroke draw 900ms once [M exists] | first result render only |
| Arc tween | "the same object, new inputs" | 400ms `--ease`, shortest arc | recompute, house morph, anchor rotate |
| Dim/lift | "attention, not deletion" | opacity 0.35/0.7/1.0 + 1.08 scale, 180ms | selection, chapter emphasis |
| Stagger | "these are members of a set" | 40–60ms/item, ≤8 items | chapter resolve, menu (exists) |
| Pulse (single) | "look here now" | one 600ms opacity pulse | narrated aspects, receipt in ch 0 |
| Reveal | "you arrived" | existing `.reveal` (kept, IO-driven) | static pages |
| Orbit (ambient) | "the sky is live" | ≥60s period, pauses on hover/hidden | at most ONE per viewport; brand mark 14s hover-only (exists) |
| Glass hover | material response | existing orb nudge/border warm | buttons |

Durations only from `--dur-1/2/3`; easing only `--ease` (adopt-or-delete `--ease-soft` — currently dead [M]). Ambient-motion limit: one. All primitives ship with their reduced-motion form (table in §11.5). No parallax, no scroll-jacking, no particles, no bloom. Sound/haptics: not justified — none.

### 13.5 Tokens & modes

- Fix undefined-but-consumed `--hair`, `--text-md` (P8); delete or adopt the dead spacing scale (decide: **adopt** for new Explorer CSS, migrate opportunistically); add the shadow recipes as tokens (3 exist ad hoc).
- **Night Observatory (dark) remains the only mode.** Day Atlas is explicitly deferred (§22) — revisit only with reading-time analytics evidence.
- Museum-label component: formalize `.mono--label + value + source` as `<Receipt>` used by inspector, fact tables, and (future) citation lines — one voice for computed facts.
- Wing: values already void [M]; rename `--gold*` vars at next regeneration touch (hygiene, not urgent); align hairline alphas to consumer scale when the wing is next rebuilt.
- Data-density modes: `labels: minimal/standard/dense` in the Explorer is the pattern; `.rx-table` restack rule [M] remains the mobile table standard.

---

## 14. Technical architecture

**Principle: zero new runtime dependencies for the slice.** No Three.js, no GSAP, no R3F, no Lenis, no state library — the audit shows plain Preact state + a window CustomEvent bus already coordinate six islands [M islands §2], and the Explorer is single-island state. Native scrolling + IntersectionObserver (already in use) drive chapters.

### 14.1 Module boundaries

```
src/lib/engine/        (unchanged; math truth)
src/lib/scene/         NEW — types.ts, build.ts (buildSceneModel), emphasis.ts, chapters.ts
                       Pure, JSON-serializable (no Date — ISO strings at this layer), fixture-snapshotted.
src/lib/wheel/         Wheel.tsx gains optional interaction props; layout math moves INTO scene/build.ts
                       (collision nudge, ring radii as pure functions) so share-card + hit-testing share it.
src/islands/ChartCalculator.tsx   mounts Explorer; owns ExplorerState; existing lazy-engine pattern kept
src/islands/explorer/  NEW — Inspector.tsx, ChapterRail.tsx, Sheet.tsx, LayerChips.tsx
src/styles/explorer.css
src/components/GlassDefs.astro + .btn--glass in base.css
```

- **Island boundary:** Explorer lives inside the existing ChartCalculator island (`client:load` on `/birth-chart/` [M]) — no new island, no hydration change.
- **Lazy boundary:** engine stays behind dynamic import [M pattern]; the future dome chapter gets its own `import()` boundary with capability check, render-on-demand loop (rAF only while visible/animating), `visibilitychange` pause, context-loss → static-diagram fallback, `dispose()` on chapter exit. These renderer-contract requirements are written now so the chapter slots in without re-architecture.
- **Selection event model:** plain props/callbacks within the island; the `zodiacs:profile` window-event bus is *not* extended to selection (no cross-island selection exists or is planned).
- **Recalculation pipeline:** unchanged (`resolveLocalToUtc → computeChart`); Explorer subscribes to the new `Chart` and rebuilds the scene (pure, <1ms for 11 bodies).
- **Testing seams:** every scene/emphasis function is pure and fixture-tested; Wheel snapshot via serialization; e2e via playwright-core (already a devDependency [M]) against `astro preview`.

### 14.2 Performance budgets (CI-enforced — closes P7)

`budgets.json` at repo root; `report-bundles.mjs --fail` compares per-page transitive JS (reusing check-dist's HTML walker [M buildci §9]):

| Route | Budget (gz, transitive JS) |
|---|---|
| `/` | 42 KB (current 38.6 + headroom) |
| `/{sign}/` | 0 KB (stays zero) |
| `/birth-chart/` initial | current + 9 KB; engine chunk stays lazy |
| engine chunk | ≤ 25 KB gz |
| any single chunk | ≤ 60 KB gz (existing warn → fail) |
| future dome module | ≤ 60 KB gz lazy or it doesn't ship |

Plus: engine-isolation assertion (homepage chunk closure must not contain the astronomy-engine marker; grep gate that only `engine/full.ts` statically imports it), reverse-sitemap check, visual-regression screenshots (playwright-core; deterministic fonts make pixel-diffing stable here [M buildci §8]) on homepage/birth-chart-result/sign-guide at 2 widths + reduced-motion, and a Lighthouse CI budget (LCP ≤ 2.0s lab, CLS ≤ 0.05, TBT ≤ 150ms) on `/`, `/birth-chart/`, `/aries/`.

### 14.3 Explicitly rejected

Framework migration (Astro+Preact is ideal for this shape); React Three Fiber (wrong tree for a chapter-scoped module even if/when Three.js arrives); GSAP (CSS transitions + WAAPI cover every primitive in §13.4); Lenis/scroll libraries (native + IO, per non-negotiables and current code); nanostores/signals (single-island state); server-side chart APIs (privacy model is the moat); Web Workers for the engine (compute is <50ms client-side; revisit only if year-scan UI blocks).
---

## 15. SEO, authority, and LLM discoverability plan

Layered per the brief's separation. LLM visibility here is the *output* of citability + structure + access + authority — no tricks.

**1. Technical discoverability (Codex C1, week 1):** automate IndexNow in `daily-horoscopes.yml`/`transits-monthly.yml` (key already deployed, dormant [M]); 308 `www.` → apex and no-slash → slash redirects in `vercel.json` (canonicals currently carry the whole load [M]); `lastmod` for the 67 evergreen URLs via a shared `getLastmod()`; hub `<h1>`s; heading IDs on all learn articles; `/feeds/` index page; feed autodiscovery sitewide; `twitter:image:alt` + `max-image-preview:large`; square Organization logo; ES-stub canonicals → EN (noindex+self-canonical is contradictory signaling [M]); reverse-sitemap CI check.

**2. Editorial authority (human + Codex):** named editor + `Person` entity with `author`/`reviewedBy` on Articles; `datePublished` sitewide; sources system (§6.2); visible "Reviewed" lines; fix the 4 voice violations [M P15]; compatibility FAQ made visible (also fixes its 272-word thinness); pairs collection gains `faq` (78 PAA-target pages currently schema-less [M]).

**3. Unique information/data (the moat):** Dataset + Event markup on the four calendars; the Living Correspondence Chart; per-page CSV/JSON downloads for calendar tables (data files already exist in `src/data/` [M]); keep the daily computed-freshness pipeline exactly as is — it is the rarest signal in the niche [M content audit inference 3].

**4. Product usage & brand demand:** the Explorer + privacy story generate the branded searches and direct traffic that make everything else rank; "free birth chart without giving data" is an unclaimed positioning [M competitive gap 1 — no competitor even claims client-side privacy].

**5. Distribution & backlinks:** widgets/embeds (backlink-as-license, exists [M]) promoted on calendar pages; iCal feeds (RETENTION) put the domain in calendars; the correspondence chart + eclipse/station tables are the natural journalist link targets; press kit fixed to v2 cards [M P-archive]; the 25 unpublished Pinterest pins [M seo §1.6] shipped per LAUNCH.md.

**LLM-specific posture:** robots already allows GPTBot/OAI [M]; rebalance `llms-full.txt` to ~70% consumer surfaces, remove the self-gist "citations" [M]; every computed table keeps figures in HTML (never canvas-only — already policy); stable anchors everywhere; the methodology page is the citation-trust anchor — link it from every calculator footer (methodology is currently a cul-de-sac with zero internal links [M]).

**ES:** fix C5 quality defects → JSON-LD parity on the 12 ES tool pages → then grow real clusters in order horoscopes (12, template-driven) → pairs (78) → learn; hreflang only ever for true twins (current conservative design is correct [M]).

---

## 16. Accessibility and performance requirements

**Accessibility (product variants, not patches):**
- Every calculator: focus moves to results heading (`tabindex="-1"`) on compute + `aria-busy` during; error focus to alert. (C2 — fixes the sitewide zero-`focus()` finding.)
- Explorer: full keyboard model + SR announcements per §11.7; the placements table remains the canonical accessible structure; chapters are real headings; axe-clean in CI.
- TodayBySign: real tabs contract or demotion to buttons + `aria-pressed` (C2) [M].
- Moon-phase SSR: `aria-hidden` until hydrated (currently announces "0% illuminated" falsely [M]).
- `<noscript>` on all calculators; `.place__chip-value` visible focus; Wheel `aria-label` localized; `/sdk/` skip link.
- Reduced-motion and reduced-transparency variants specified for every new pattern (§11.5, §13.4); zoom to 200% must not clip the inspector (test in e2e).

**Performance:** budgets per §14.2, enforced by CI from FOUNDATION gate onward. Hero video: add `saveData`/ECT check + AV1 `<source>` tier (target ≤1.8 MB) — the single largest transfer on the site [M 3.37 MB]. Fix the Garamond-italic preload gap [M]. `client:idle` for WelcomeBack/TodayBySign/DailyForYou (below-fold `client:load` today [M]). No interaction may regress LCP/INP/CLS — visual-regression + Lighthouse assertions are the regression net the repo's own backdrop-filter incident proves it needs [M].

---

## 17. Fable-versus-Codex Sol ownership matrix

Boundary rule: **Fable owns anything whose acceptance criterion is judgment; Codex owns anything whose acceptance criterion is a test, a screenshot baseline, or a frozen interface.** No file is owned by both in the same phase.

| Workstream | Specific deliverable | Owner | Why this owner | Depends on | Review | Acceptance evidence |
|---|---|---|---|---|---|---|
| Product/interaction direction | This plan; chapter choreography; selection/emphasis visual spec | **Fable** | pure judgment | — | Human | plan + annotated storyboard |
| Scene contracts | `src/lib/scene/types.ts` interfaces (frozen) | **Fable** authors, freezes | contract quality determines everything downstream | — | Human | merged types + doc comments |
| Chart Explorer slice | interactive Wheel, inspector, sheet, chapter rail, explorer.css on `/birth-chart/` | **Fable** | highest visual/interaction ambiguity in the plan | contracts, C3 budgets | Human + Codex parity tests | working slice + screen recordings desktop/mobile/reduced-motion |
| Scene-model extraction | `buildSceneModel`/`emphasisFor` pure functions + snapshot & parity tests + share-card serialization regression | **Codex** | fully specifiable, invariant-testable | frozen contracts | **Fable** | green tests incl. byte-identical card SVG |
| Glass system | `.btn--glass` tiers + GlassDefs + hierarchy decision | **Fable** (design) → **Codex** (28-site rollout) | material design = taste; rollout = mechanical | — | Fable reviews rollout screenshots | component + before/after grid |
| Trust & discoverability batch | C1 (IndexNow, schema, redirects, anchors, lastmod, h1s, sources plumbing, voice edits) | **Codex** | deterministic, checkable | human copy decisions | Fable (copy), CI | validator output + check-dist green |
| A11y batch | C2 (focus mgmt, tabs, noscript, aria fixes, privacy-line canonicalization) | **Codex** | pattern-specified | — | Fable spot-check w/ SR | axe + keyboard e2e green |
| Perf/CI infrastructure | C3 (budgets.json, --fail, isolation gate, visual regression, Lighthouse CI, ASC/MC external vectors) | **Codex** | pure infrastructure | — | Fable (baseline shots) | failing-then-green demo PR |
| Wing integrity | C4 (archive quote, sameAs, press kit, stale links, discovery consolidation, llms-full rebalance) | **Codex** | mechanical once humans decide | §25 decisions | Human | diff + redirect map |
| ES quality | C5 (SSR leaks, grammar, JSON-LD parity, breadcrumbs) | **Codex** | enumerable defects | — | Human (native-speaker pass ideal) | before/after + validator |
| Island foundations | C6 (useEngine/useProfile/BirthFields/CopyLink extraction, dedupe saves, PlaceSearch empty state) | **Codex** | refactor-to-tests | slice interfaces frozen (avoid file collisions) | Fable | tests + zero-behavior-change e2e |
| Mobile signature adaptation | sheet detents, chapter bar feel, hit-target tuning | **Fable** | touch feel = taste | slice | Human | device recordings |
| Synastry/transit rollout | bi-wheel scene extension + Explorer patterns on 2 surfaces | **Codex** (per Fable's bi-wheel spec) | pattern replication | slice shipped | **Fable** | parity tests + recordings |
| Horizon dome chapter | 3D prototype + static-diagram fallback | **Fable** | spatial/cinematic judgment | SIGNATURE gate data | Human | prototype + perf trace ≤60KB |
| Reference layer | correspondence chart, glossary, search index, sources rendering | **Codex** | template + data work | C1, editorial policy | Fable (table/glossary design) | pages + Dataset validation |
| Retention loop | iCal export, personalized Today, synastry save/share, transit timeline | **Codex** | specified flows on existing engine | analytics live | Fable (UX) | e2e + event dashboards |
| Analytics | vendor integration + §11.10 events + dashboards | **Codex** | plumbing | §25 vendor decision | Human | events visible in dashboard |

---

## 18. Dependency-based roadmap

Relative effort: S < M < L < XL. No calendar promises.

### GATE 0 — TRUST (S, this week, Codex + human) — *precondition for everything public-facing*
Archive quote fix (P1), sameAs decision applied (P3), press-kit card fix, stale wing links. **User outcome:** nothing on the domain misattributes or misidentifies. **Stop condition:** none — this is unconditional hygiene. **Gate check:** wing audit re-run clean.

### GATE 1 — FOUNDATION (M, Codex C1+C2+C3 in parallel; Fable: glass system + contracts)
Deliverables: discoverability batch, a11y batch, perf CI (budgets fail, isolation gate, visual baseline, Lighthouse, ASC/MC vectors), analytics baseline + core events, `.btn--glass` + rollout, scene contracts frozen. **User outcome:** same product, now measurable, findable, accessible, and regression-proof. **Risk:** analytics vendor delay → mitigate by shipping event calls behind a no-op shim. **Gate check:** CI red on a deliberately-fat test PR; axe green; IndexNow 200s in cron logs; baseline dashboards live.

### GATE 2 — INTERACTION (M, Fable slice part 1; Codex C6 + parity tests in parallel on non-overlapping files)
Deliverables: selection/inspector/sync on `/birth-chart/` (free mode only), positions-only share, island foundations. **User outcome:** tap anything on your chart and understand it; share without exposing birth data. **This is the smallest release that tests the signature hypothesis** (§20 E1). **Stop/rollback:** feature-flagged island prop; if INP or error rates regress, flag off. **Gate check:** acceptance tests §11.11 #1–3,5; E1 metrics collecting.

### GATE 3 — SIGNATURE (L, Fable slice part 2; Codex rollout)
Deliverables: guided chapters + house-morph + mobile chapter system (Fable); Explorer on moon/rising modes and ES `/birth-chart/`; synastry bi-wheel + transit ring per Fable spec (Codex). Dome chapter enters prototyping **only if** E1/E2 show comprehension lift. **User outcome:** the guided tour of your own chart; one interaction language across tools. **Gate check:** tour completion >40% of result views on mobile; no CWV regression; acceptance #4,6,7.

### GATE 4 — RETENTION (M–L, Codex-heavy)
Deliverables: synastry save/share (P13), personalized Today upgrade (DailyForYou uses its dead `sign` prop or saved chart), transit timeline from `year-scan`, iCal exports, duplicate-save fix, digest tie-in. **User outcome:** reasons to return that live in *their* calendar and profile. **Gate check:** D7 return of savers; iCal subscriptions counted via UA.

### GATE 5 — REFERENCE (L, Codex-heavy + editorial)
Deliverables: correspondence chart, glossary, search, sources rendered sitewide, author/review system, ES cluster growth (horoscopes → pairs), discovery-cluster consolidation live. **User outcome/goal:** the citation monopoly (§6). **Gate check:** GSC impressions per cluster; citation spot-checks in AI answers; zero thin-page warnings in coverage.

### GATE 6 — PLATFORM (XL, joint)
Synastry observatory (relationship timelines), interactive learn explainers (mini-wheels via the scene model), historical chart museum (curated, sourced — not programmatic), horizon dome chapter GA, public data endpoints (versioned JSON of ingresses/stations under `/data/` with docs), embed gallery v2. Enter only with Gates 2–5 metrics green.

---

## 19. Prioritized backlog

| ID | Task | Route/component | Owner | Impact | Effort | Depends | Acceptance | Metric |
|---|---|---|---|---|---|---|---|---|
| T-01 | Fix archive misattribution | `scripts/archive-data.mjs` → `/archive/` | Codex(+human) | Trust-critical | S | human wording | grep of source article passes; drift gate green | — |
| T-02 | sameAs / entity separation | `index.astro:36-70` | Codex | High | S | §25-D2 | KG entity clean; JSON-LD valid | brand SERP |
| T-03 | IndexNow automation | workflows | Codex | High | S | — | 200 responses logged daily | crawl stats |
| T-04 | Redirects (www, no-slash) | `vercel.json` | Codex | High | S | — | curl matrix 308s | GSC canonicals |
| T-05 | Article schema upgrade + datePublished + publisher | 7 templates | Codex | High | S | — | Rich Results pass | rich results |
| T-06 | Dataset+Event on calendars | 4 calendar pages | Codex | High | M | — | validator + snippets | calendar SERP |
| T-07 | Compatibility FAQ visible + pairs faq schema | `/compatibility/*` | Codex | High | S | — | FAQ in HTML == JSON-LD | PAA |
| T-08 | Hub h1s + intros; learn anchors | hubs, learn | Codex | Med | S | — | outline audit | learn CTR |
| T-09 | Focus management + aria-busy sitewide | 6 islands | Codex | High (a11y) | S | — | SR e2e | completion rate |
| T-10 | Budgets + isolation gate + visual regression + Lighthouse | CI | Codex | High (foundation) | M | — | red-on-fat-PR demo | CWV guard |
| T-11 | ASC/MC/Placidus external vectors | `engine.test.ts` | Codex | High (trust) | S | — | ±0.1°/0.2° vs Horizons/astro.com | — |
| T-12 | Analytics + core events | Base + islands | Codex | High (foundation) | M | §25-D3 | events in dashboard | all |
| T-13 | `.btn--glass` system + defs | base.css, Base.astro | **Fable** | High (brand) | S | — | component + fallbacks | — |
| T-14 | Glass rollout (28 sites) | sitewide | Codex | Med | S | T-13 | screenshot grid | — |
| T-15 | Scene contracts + buildSceneModel + parity/serialization tests | `src/lib/scene/` | Fable(types)/Codex(impl+tests) | Critical path | M | — | §11.11 #1–2 | — |
| T-16 | Explorer free mode (selection/inspector/sync) | ChartCalculator, Wheel | **Fable** | Highest | L | T-15 | §11.11 #3,5 | E1 |
| T-17 | Positions-only share (`#p=`) + card toggle | share.ts, ChartCalculator | Codex | High | S | T-15 | codec tests; no birth data in token | share rate |
| T-18 | Guided chapters + house morph + mobile sheet | explorer/* | **Fable** | Highest | L | T-16 | §11.11 #4,6,7 | E2 |
| T-19 | Island foundations refactor | islands, lib | Codex | Med (velocity) | M | T-15 frozen | zero-behavior-change e2e | — |
| T-20 | ES quality batch | es/*, islands i18n | Codex | Med | M | — | leak greps clean; validator | ES engagement |
| T-21 | Correspondence chart page | `/learn/zodiac-dates/` | Codex | High | M | T-05 | Dataset valid; CSV | citations |
| T-22 | Sign→rising links; homepage cluster links; /feeds/ index | various | Codex | Med | S | — | check-dist | internal CTR |
| T-23 | Discovery consolidation + 301s | public/, vercel.json | Codex | Med | M | §25-D4 | redirect map; sitemap −7 | quality cohort |
| T-24 | Synastry save/share; transit timeline; iCal | islands | Codex | High (retention) | L | T-16, T-12 | e2e | D7 return |
| T-25 | Glossary + search | learn/ | Codex | Med | L | Gate 5 | DefinedTermSet; search e2e | search usage |
| T-26 | Hero video tiering (AV1 + saveData) | index.astro, assets | Codex | Med | S | — | ≤1.8MB path measured | LCP/transfer |
| T-27 | Horizon dome prototype | isolated branch | **Fable** | High (if E-gated) | L | Gate 3 data | ≤60KB gz; fallback diagram | E3 |
| T-28 | Bi-wheel scene + synastry/transit Explorer | scene/, islands | Codex | High | L | T-18 spec | parity + recordings | tool depth |

---

## 20. Metrics and experiments

**Baseline instrumentation first (T-12):** privacy-light, no birth data ever in events (event props limited to enums/counters — enforced in code review).

North-star: **weekly explored-chart saves** (a save following ≥1 Explorer interaction).

Funnel: result_rendered → explorer interaction rate → tour_start/complete → save → return(7d) → second chart → synastry → share (positions-only vs full vs card) → wing entry rate (watch-only).

**E1 (Gate 2, the proving experiment):** 50/50 flag on Explorer free mode. H1: selection-enabled results lift save rate ≥15% relative and increase dwell without INP regression. Kill/iterate below +5%.
**E2 (Gate 3):** guided tour on/off among Explorer users. H1: tour lifts save + 7-day return; chapters with highest drop-off get redesigned before rollout.
**E3 (dome go/no-go):** among chapter-2 viewers, measure "explain ASC" comprehension proxy (click-through to rising-sign content + a 1-question inline check). Dome ships only if the 2D horizon diagram underperforms.
**E4:** positions-only share adoption share of all shares; hypothesis ≥30% (validates the privacy positioning).
**Search program:** GSC clusters reviewed monthly (birthday cohort watched specifically for indexation decay); IndexNow delta on Bing/DDG referrals; quarterly LLM-citation spot-check protocol (20 canonical queries against major assistants, logged).

---

## 21. Risks, assumptions, and open evidence

- **R1 — YMYL contagion from the wing** (thesis = investment memo; swap deep-links two clicks from consumer pages [M]). Containment plan in §25-D2/D4/D5; residual risk real. *Assumption:* Google assesses quality domain-wide; consumer excellence + graph separation is the defense.
- **R2 — E1 fails** (interactivity doesn't lift saves). The slice still pays for itself (a11y, scene model, positions-share, budgets), and chapters would be re-scoped to learn explainers instead of the result page. This is why the dome is E-gated.
- **R3 — No analytics history** — early metrics have no baseline; run E1 as A/B (flag), not before/after.
- **R4 — Single-maintainer bus factor + hand-edited generated output risk** — mitigated by drift gates; extend to icons/og checksums (C3).
- **R5 — tzdb drift on old devices** [M engine audit §6] — inherent to on-device model; documented on methodology; acceptable.
- **R6 — ES quality debt compounds** if clusters grow before C5 lands — sequenced accordingly.
- **Open evidence:** real-device INP/scroll traces for the slice (audit was network-level; no device lab run yet); placement-corpus variance (n=1 sampled of 120 [M]); whether `window.chrome` lens gate misfires on iOS Chromium-shells [M design P6]; Vercel trailing-slash behavior after config change (verify live); actual GSC data (no access this run — connect Search Console to the metrics program).

---

## 22. What not to build

1. **A wholesale 3D chart replacement** (Concept A) — rejected with reasons in §10.
2. **Three.js in the base bundle, ever** — the dome is a lazy chapter module with a hard 60 KB gate or it dies.
3. **GSAP / Lenis / R3F / nanostores / Tailwind migration** — native APIs and existing patterns cover every need (§14.3).
4. **Day/light mode now** — dark is a three-layer brand assertion [M]; revisit only with reading-time evidence. (Wing "Day Atlas" idea: dropped.)
5. **Daily editorial horoscopes** — the computed daily block + monthly editorial is the honest, sustainable model; do not enter the content mill.
6. **An AI astrologer chatbot** — undifferentiated, costly, brand-risky; the Explorer *is* the explainability play.
7. **More programmatic clusters** (celebrity charts at scale, city pages, year-sign pages) — the birthday cluster already tests the thin-page ceiling; a *curated, sourced* chart museum is the Gate-6 version.
8. **More discovery/doorway pages** — consolidate the existing eight; never add another.
9. **Account walls, notification engines, app-store apps** — the anti-Co-Star position is the moat; iCal + feeds are the notification substitute.
10. **Sidereal/13th-sign/asteroids expansion now** — Chiron via precomputed table is the only near-term engine addition worth it (STRATEGY already scopes it); the rest is Gate-6+ if ever.
11. **Smooth-scroll/scroll-jacked storytelling** — chapters use native scroll + snap only.
12. **Homepage redesign** — it works [M]; only the video tiering and island-idle tweaks touch it.
13. **URL migrations of any consumer route** — equity is compounding on asserted-coverage URLs; don't.

---

## 23. First Fable execution task

**(= follow-up prompt A, ready to run)**

> **FABLE TASK 1 — Chart Explorer vertical slice, part 1 (contracts + glass + free mode)**
> Repo: ZodiacsOfficial/site, branch `fable/chart-explorer-slice`. Read `docs/MASTER-PLAN.md` §11, §13, §14 first; they are binding.
> 1. Land `src/lib/scene/types.ts` exactly per §11.2, with doc comments; freeze by PR-labeling `contract-frozen`.
> 2. Land the glass system: `.btn--glass` (G1/G2 tiers + reduced-transparency fallback) in `src/styles/base.css`, `GlassDefs.astro` included from `Base.astro` behind a `glass` layout prop, lens maps imported once. Apply to: calculator share button, save/copy buttons, inspector chrome. Do NOT change `.btn--primary` solid default (per §13.3 hierarchy decision; escalate if you disagree after seeing it in context).
> 3. Implement Explorer **free mode** on `/birth-chart/` full results: `buildSceneModel` + `emphasisFor` (pure, fixture-snapshotted on the Kahlo chart), interactive Wheel (optional props only; share-card serialization must stay byte-identical — write that test first), selection visuals per §11.6 (hue ring, 1.08 lift, 0.35/0.7/1.0 dimming, orb-weighted chords with dash-for-separating), inspector desktop panel + mobile bottom sheet (3 detents, native pointer events), table/reading two-way sync, `?sel=` deep links, keyboard + SR model per §11.7, reduced-motion per §11.5.
> 4. Fix in passing: wheel house-number midpoint placement (`Wheel.tsx:149` defect), Wheel aria-label localization.
> 5. Budget: `/birth-chart/` +≤9 KB gz transitive JS; zero new dependencies; `npm run build && npm run check && npm test && node scripts/check-dist.mjs` green.
> 6. Deliver: PR + screen recordings (desktop 1440, mobile 390, reduced-motion pass), and a `docs/EXPLORER-SPEC-DELTA.md` noting anything you changed from §11 and why.
> Out of scope: guided chapters (part 2), synastry/transits, any 3D, ES rollout.

---

## 24. First Codex Sol task packets

Priority order: **C1 → C2 → C3 → C4 → C5 → C6.** C1–C3 are parallel-safe with each other and with Fable Task 1 (disjoint files); C4 waits on the §25 human decisions; C6 waits until Fable freezes the scene contracts (avoids file collisions in islands).

Each packet: run in its own worktree; may change only the named interfaces/files; every packet ends with `npm run build && npm run check && npm test && node scripts/check-dist.mjs` green plus its own acceptance evidence.

### The single copy-paste prompt for Codex Sol

```
You are Codex Sol working on ZodiacsOfficial/site (zodiacs.org). Read docs/MASTER-PLAN.md
first — §5 (problems), §15 (SEO plan), §16 (a11y/perf), §24 (your packets) are binding.
House rules: obey CLAUDE.md (content-register boundary, voice rules, generated-vs-source);
never hand-edit generated output — edit the generator and regenerate; commit regenerated
output with the source change; zero new runtime dependencies without escalation; every
change keeps `npm run build && npm run check && npm test && node scripts/check-dist.mjs`
green. Work the packets IN THIS ORDER, one PR per packet, own worktree each:

PACKET C1 — TRUST & DISCOVERABILITY (do first)
Files: src/components/SEO.astro, src/layouts/Base.astro, src/pages/** (templates only),
src/content.config.ts, src/pages/sitemap.xml.ts, vercel.json, .github/workflows/
daily-horoscopes.yml + transits-monthly.yml, public/llms-full.txt, scripts/check-dist.mjs.
Deliver: (1) IndexNow POST step in both cron workflows using the deployed key file
(public/d21e17e6-*.txt), submitting /, /horoscopes/*, /transits/, /feeds/* on change;
(2) vercel.json redirects: www→apex and no-trailing-slash→slash (permanent), then verify
with a curl matrix; (3) Article JSON-LD upgrade in all 7 Article templates: datePublished
(add `published` frontmatter, backfill from git first-commit date), publisher {@id:#org},
mainEntityOfPage, inLanguage; (4) Dataset + per-event Event nodes (next 12 months) on
/eclipses/, /full-moon-calendar/, /retrogrades/, /mercury-retrograde/; (5) real <h1> on
/tools/ and /learn/ (demote current h2s correctly) + 150-word intros on /learn/aspects|
houses|planets/ hubs; (6) heading ids on every /learn/ article (slugified, stable);
(7) render the 3 compatibility FAQ Q&As as a visible details section AND add `faq` to the
pairs schema with content for all 78 pairs (element/modality-derived, in-voice);
(8) sitemap lastmod for the 67 evergreen URLs via one getLastmod() helper; reverse-
sitemap check added to check-dist.mjs; (9) /feeds/ index page; feed autodiscovery in
Base.astro sitewide; twitter:image:alt + max-image-preview:large in SEO.astro; square
512×512 org logo asset + reference; ES-stub canonicals point at the EN page; (10) voice
edits: retitle the four "…, dated." H1s to plain sentences, remove "no vague cosmic
weather" from the horoscope meta description, soften the methodology comparison-boast —
keep meaning, obey DESIGN.md voice; (11) add a `sources` frontmatter field (array of
{label, href?}) to guides/learn/calendar schemas + a compact Sources line component
rendered above the footer, and populate it for the 4 calendar pages (NASA eclipse
catalog, Astronomy Engine, IANA tzdb) — leave other pages' sources empty for editorial
fill. Acceptance: Rich Results/schema validator passes on 6 sampled templates; curl
redirect matrix in PR description; check-dist green; before/after HTML snippets.

PACKET C2 — ACCESSIBILITY & HONESTY
Files: src/islands/** (a11y-only edits), src/styles/calculator.css, i18n dictionaries.
Deliver: (1) after every successful compute in all 6 calculators, move focus to the
result heading (tabindex="-1") and set aria-busy on the form during compute; error focus
to the alert; (2) rebuild TodayBySign as buttons + aria-pressed with a polite live panel
(drop the fake tablist), keyboard-complete; (3) <noscript> explanation inside every
calculator island slot; (4) moon-phase SSR dial aria-hidden until hydrated (kill the
false "0% illuminated"); (5) visible focus for .place__chip-value; PlaceSearch "no
places found" empty row + stale-response guard token; (6) canonicalize the privacy line
to ONE sentence (methodology's framing) used by all 7 tool pages incl. moon-phase, and
replace the FAQ's "Supabase account" wording with "your account (stored with row-level
security)"; (7) unify toggle label to "I don't know it" and CTA person to "your" across
tools; (8) add skip link to public/sdk (edit its generator source if generated, else the
file + document). Acceptance: axe clean on /birth-chart/ result + homepage; a keyboard-
only screen recording of compute→result→save; grep proof of one privacy sentence.

PACKET C3 — PERFORMANCE, PARITY & REGRESSION CI
Files: scripts/report-bundles.mjs, scripts/check-dist.mjs, budgets.json (new),
.github/workflows/site-check.yml, src/lib/engine/engine.test.ts, tests/visual/ (new),
package.json scripts. Deliver: (1) budgets.json {"/" :42, "/birth-chart/": current+9,
"/aries/": 0, "chunk-max": 60, "engine-chunk": 25} KB gz; report-bundles --fail computes
per-page transitive JS by parsing each dist HTML's module/preload refs (reuse check-dist
walker) and fails CI over budget; (2) engine-isolation gates: grep-gate (only
src/lib/engine/full.ts may statically import astronomy-engine) + dist-gate (homepage
chunk closure must not contain the engine marker string); (3) ASC/MC/Placidus external
vectors: 5 fixtures (NYC 1990, Tokyo 1985, Sydney 1970, Helsinki 2000, Quito 2010) with
reference angles/cusps from JPL-derived or astro.com values embedded as constants,
tolerance ±0.1° angles / ±0.2° cusps — document the derivation in the test; (4) visual
regression: playwright-core screenshots vs committed baselines for /, /birth-chart/
(result state via the Kahlo demo fixture), /aries/ at 1440 and 390 + reduced-motion
variant, pixelmatch threshold 0.1%, wired into site-check; (5) Lighthouse CI (lighthouse
against the playwright chromium over `astro preview`) asserting LCP≤2.0s, CLS≤0.05,
TBT≤150ms on the 3 routes; (6) data-freshness assertions in check-dist (sky.json horizon
≥ build+90d; latest transits-YYYY-MM covers render month; daily.json ≤3 days old with a
CI-context escape hatch); (7) client:idle for WelcomeBack/TodayBySign/DailyForYou;
(8) hero video: add saveData/ECT guard and an AV1 <source> if you can transcode ≤1.8MB
at visually-equal quality — otherwise document the attempt and skip. Acceptance: a demo
PR that deliberately fattens a page goes red; all gates green on main; baseline
screenshots committed; budget table in PR.

PACKET C4 — WING INTEGRITY & ENTITY CONTAINMENT (needs §25 human decisions D1/D2/D4)
Files: scripts/archive-data.mjs + regenerated public/archive/*, scripts/sign-data.mjs,
public/sdk/index.html + discovery pages (via their sources), src/pages/index.astro,
public/llms-full.txt, vercel.json, src/lib/legacy/urls.ts. Deliver: (1) archive
"Horoscopes to HODL" entry rewritten to only claims/quotes verifiable in the live
article per the human-approved wording — regenerate archive + feeds; (2) apply D2:
default = remove astrofolio socials/site from consumer Organization.sameAs (keep
github), leave wing footers untouched, and add one plain-language relationship
disclosure line on /registry/ and /about/; (3) press kit → /assets/og/v2/sign/*.png;
fix sdk "Back to the registry"→/registry/ and astrofolio "The Twelve"→/registry/;
thesis og:image → v2 card per D-decision; (4) apply D4: consolidate the 8 discovery
pages into /sdk/ sections with 301s in vercel.json, remove from sitemap urls.ts,
delete the two self-gist "citations"; (5) rebalance llms-full.txt to ~70% consumer
(tool capabilities, data provenance, ES section) / 30% wing. Acceptance: redirect map
tested; drift gate green; wing re-grep shows no stale claims; sitemap count drops by
the consolidated pages.

PACKET C5 — SPANISH QUALITY PARITY
Files: src/lib/i18n/**, src/islands/** (i18n strings only), src/data/es-guides.ts,
src/pages/es/**. Deliver: (1) fix SSR leaks: planet names (Plutón/Neptuno), moon-phase
names, sign names in TodayBySign, date formatting — route every user-facing string
through the dictionary (kill inline locale ternaries in the 8 islands); (2) fix the
enumerated grammar defects in es-guides.ts (lowercase sentence start, the two run-ons
in aries — then audit all 12 with the same lens) and the "registro canónico en el
registro" band copy (suggest: "una de las Doce piezas del Registro"); (3) JSON-LD
parity: WebApplication+FAQPage on the 12 ES tool pages, BreadcrumbList on /es/{sign}/,
one WebSite node with @id; (4) localize the ES ghost-CTA horoscopes link and ES 404
reachability note documented. Acceptance: leak greps return zero; validator passes;
a native-speaker-review checklist file listing every changed string for human signoff.

PACKET C6 — ISLAND FOUNDATIONS (start only after scene contracts are frozen)
Files: src/lib/hooks/ (new), src/islands/** (mechanical refactor), src/lib/profile/store.ts.
Deliver: (1) extract useEngine(), useProfile(), <BirthFields>, <CopyLinkButton>,
resolveSavedChart() and adopt across the 5-6 duplicate sites — zero behavior change,
verified by before/after e2e on all 6 calculators; (2) dedupe saves on
(date,time,lat,lon,houseSystem) — same-input save updates name/timestamp instead of
minting a duplicate; (3) prune year-ahead cache entries for deleted charts; (4) missing
key props (SaturnReturn, Synastry options); remove DailyForYou dead `sign` prop or wire
it (wire it: scope the island to the page's sign — small UX win); (5) fix SkyTicker SSR
skew note by rendering nothing time-sensitive beyond what daily.json guarantees, or
hydrate-swap with a suppressed-hydration pattern — document choice. Acceptance: e2e
parity recordings; islands LoC reduction reported; no island imports engine statically
(C3 gate stays green).

After each packet: post the PR with the acceptance evidence listed, then continue to
the next packet. If a decision marked "§25" is still unresolved when you reach C4,
skip to C5/C6 and return.
```

---

## 25. Human decisions required

| # | Decision | Options (recommended first) | Blocks |
|---|---|---|---|
| D1 | Archive misquote remedy | **Rewrite entry to verifiable claims** (keep entry, fix sourcing note) / remove entry / contact Numinous Realm to confirm post-publication edits and archive the original | C4 |
| D2 | Consumer entity separation | **Remove Astrofolio socials + astrofolio.xyz from consumer sameAs; add plain relationship disclosure on /registry/ + /about/** / keep as-is (accept KG fusion) / full nofollow + de-footer of wing links (stronger, more SEO-invasive) | C4, T-02 |
| D3 | Analytics vendor | **Plausible (self-hostable, EU, no cookies)** / Fathom / Vercel Analytics — constraint: no birth-data-adjacent payloads, script ≤2 KB or server-side | T-12, all metrics |
| D4 | Discovery cluster consolidation | **Fold 8 pages into /sdk/ with 301s** / noindex them / leave (not recommended — doorway risk on a consumer domain) | C4, T-23 |
| D5 | Wing footer presence on consumer pages | **Keep Registry column but reduce to 2 links (Registry, SDK) + disclaimer** / keep 4 links / registry chip only | C4 (partial) |
| D6 | Glass on primary CTAs | **Solid ink stays the one primary per page; glass = secondary/contextual standard** / glass primaries everywhere (G2 + solid orb) — see it in context after T-13 before deciding | T-14 |
| D7 | Horoscope archives | **Keep replace-in-place (status quo)** / add /horoscopes/{sign}/{yyyy-mm}/ archives (long-tail + LLM corpus, but a growing thin-page surface) | Gate 5 |
| D8 | Editorial identity | Name a human editor/reviewer (even pseudonymous-but-consistent) for author/reviewedBy — **required for the authority ceiling**; who? | §6.4, Gate 5 |
| D9 | ES investment level | **Quality-first then horoscopes+pairs clusters** / EN-only freeze / full parity push | C5 scope, Gate 5 |
| D10 | Hero video budget | **Approve AV1 tier + saveData guard** / replace video with poster-only on mobile / leave | T-26 |

---

### Decision log — resolved by the owner, 2026-07-10

| # | Ruling |
|---|---|
| D1 | Rewrite the archive entry to claims verifiable in the live article |
| D2 | Consumer `sameAs` → GitHub only; relationship disclosure on `/registry/` + `/about/` |
| D3 | Plausible (shim until env vars supplied) |
| D4 | Consolidate all 8 discovery pages into `/sdk/` with 301s; self-gist citations removed |
| D5 | Consumer footer wing column trimmed to Registry + SDK + disclaimer |
| D6 | Solid ink stays the one primary CTA per page; glass is the secondary/contextual standard |
| D7 | Horoscopes stay replace-in-place; no archives |
| D8 | Pen-name editorial persona; owner approves the name before anything ships |
| D9 | **Amendment:** ES freezes after quality fixes — C5 is quality-only and Gate 5's ES cluster growth is cut until English proves out |
| D10 | Hero video: AV1 tier + data-saver guard approved |

Implementation state: D1/D2/D4/D5/D10 landed in Codex packets C1–C5 (PRs #47–#52); D3 shim landed in C1; D6 landed with the `.btn--glass` system (Fable Task 1); D8 persona pending owner's name choice. Explorer implementation deltas: `docs/EXPLORER-SPEC-DELTA.md`.

## Appendix C — Fable review prompt for Codex output

> **FABLE REVIEW — Codex packet {N}**
> Check out the packet branch. You are reviewing against `docs/MASTER-PLAN.md` §{5,11,13,15,16} and DESIGN.md.
> 1. Run the full check suite; confirm the packet's acceptance evidence reproduces.
> 2. Visual pass: `astro preview`, then screenshot-compare the packet's touched routes at 1440/390 against the committed baselines; flag ANY unintended visual delta (hairlines, spacing rhythm, focus rings, glass fallbacks) — the standard is "no change you can't name."
> 3. Interaction pass (packets C2/C6/T-14): keyboard-only walkthrough compute→result→save; screen-reader spot-check of the changed announcements; reduced-motion + reduced-transparency toggles.
> 4. Voice pass (C1/C4/C5): read every changed user-facing string aloud against DESIGN.md's banned-tells list; ES strings against the C5 checklist.
> 5. Boundary pass: grep the diff for content-register violations (crypto vocabulary in src/, hashed-asset refs in public/, hand-edits to generated output without generator changes).
> 6. File findings as: file:line, severity (blocker/should/nit), what to change, why — deterministic findings go back to Codex; anything requiring judgment (spacing, wording, motion feel) you fix yourself on a `fable/review-{N}` branch on top.
> Merge order: C1 → C2 → C3 independently once green; C4 only with D1/D2/D4 stamped; C5/C6 after.

## Appendix D — First ten actions, strict dependency order

1. Human: stamp D1–D4 (quote remedy, entity separation, analytics vendor, discovery consolidation). ≤1 hour of decisions; unblocks everything trust-critical.
2. Codex C1 (trust & discoverability) — includes T-01 prerequisites landing with D1 wording.
3. Codex C2 (a11y) — parallel with 2.
4. Codex C3 (perf/parity/regression CI) — parallel with 2–3; must merge before Fable's slice PR so the slice lands under budgets.
5. Fable T-13 (glass system) — then human eyeballs D6 in context.
6. Fable T-15 contracts (`scene/types.ts`) — freeze; hand parity-test implementation to Codex within C3's follow-up.
7. Fable T-16 (Explorer free mode) behind a flag; Codex T-17 (positions-only share) in parallel (disjoint files).
8. Codex C4 (wing integrity) with D-decisions applied; Codex T-12 analytics goes live; flip E1 flag to 50/50.
9. Codex C5 (ES quality) + C6 (island foundations, contracts now frozen); Codex glass rollout T-14 after D6.
10. Read E1. If ≥+5% save lift: Fable T-18 (chapters + mobile) → Gate 3. If not: iterate selection UX per E1 telemetry before chapters.

## Appendix E — Deliberately deferred or rejected

**Rejected:** wholesale 3D chart (Concept A); GSAP/Lenis/R3F/state libs/framework moves; light mode; daily editorial horoscopes; AI chatbot; new doorway pages; account walls; push notifications; native apps; scroll-jacking; consumer URL migrations; sidereal/13th-sign modes.
**Deferred (with re-entry condition):** Horizon Dome chapter (E3 evidence); horoscope archives (D7); Chiron table (post-Gate-3, engine bandwidth); celebrity chart museum (Gate 6, curated only); public JSON data endpoints + API docs (Gate 6); ES full parity (post-C5 cluster staging); Pagefind-style search dependency (only if the hand-rolled index fails); Web Workers for year-scan (only if INP data demands); wing React-from-unpkg self-hosting (next wing rebuild); light-mode "Day Atlas" (needs reading-time data); pinterest pin automation (manual per LAUNCH.md first).

---

*End of master plan. The recommended sequence is Appendix D; the single Codex prompt is in §24; the Fable slice prompt is §23. Nothing here requires direction before action items 1–4 — they are safe to start now.*
