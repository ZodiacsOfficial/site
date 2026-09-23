# Zodiacs engine and platform — brief, version 2

Written 2026-09-23 for the agent that will carry out the work. This version
replaces the first brief (2026-09-22) as the set of instructions. The first
brief is kept, with only its paths fixed, in the audit record at
`docs/platform/evidence/engine-audit-2026-09-22/`, beside the audit, its
finding ledger, the verifiers' verdicts, the completeness critic, and the
prompts each agent was given. Read the audit record before acting. Finding
ids below point into it; `R1`–`R9` are the findings added by the review of
version 1 (§2).

An independent fact-check of this brief's draft found 26 problems, seven of
them marked false. All are corrected here. Its report and the disposition of
each item are in the audit record as `BRIEF-v2-FACTCHECK.md`.

---

## What changed from version 1

1. **Order.** Version 1 began with arcsecond work. Version 2 begins with the
   errors a person can see — degrees of Ascendant, a wrong flag, a dropped
   return pass — because users and developers notice those first, and most of
   them take days, not weeks.
2. **A bug version 1 missed.** Before a region adopted standard time, the
   site applies the local mean time of the time zone's reference city, not
   the birthplace's. With the site's own city coordinates, Buffalo in 1870 is
   19.5 minutes off, Brest in 1880 27.3 and Omaha in 1880 33.2. That is 4.9°
   to 8.3° of sidereal time and moves the Ascendant by up to about 15° (R1).
   It is now the first item of Phase 1.
3. **The platform is in scope.** Version 1 audited the engine as a scientific
   instrument. The goal is for zodiacs.org to be where apps, researchers and AI
   agents get astrology computation, and that is mostly distribution:
   published packages, a hosted API, remote MCP, documentation agents can
   read, and a conformance suite. Version 2 adds Phase 3 and three tracks that
   run through every phase: agents and LLMs, search, and GitHub.
4. **Breadth means traditions, not only settings.** Version 1 counted house
   systems and ayanamsas. Version 2 adds Vedic (nakshatras, dashas, divisional
   charts, panchang, KP), Hellenistic (lots, profections, releasing), Chinese
   solar terms and Four Pillars, and the everyday Western items developers
   look for first. It also moves the techniques that exist only in the site's
   code into packages, so developers get them too.
5. **The license and privacy are the thesis.** Swiss Ephemeris is licensed
   under the AGPL or a paid professional license, and many astrology libraries
   and APIs are built on it. This engine is MIT-licensed and computes charts
   on the user's device. That removes the AGPL obligation and reduces
   personal-data exposure; the Guide assistant, the calendar feed and the
   planned hosted API are disclosed exceptions. It now leads the positioning.
6. **Distribution order.** Compiling the DE440s pack took 24.5 seconds in
   Node on the audit machine; in a browser it has not been measured, and every
   browser would pay it before its first precise chart. A hosted API that
   computes from the pack on the server never hands the pack out, so it does
   not wait on the question to NAIF about derived coefficients. High precision
   ships on the API first; the on-device pack follows when NAIF answers.
7. **Precision is sold where it shows.** A 10″ difference changes nothing a
   natal-chart reader looks at. Timed charts magnify small errors: solar and
   lunar returns, ingress charts, primary directions (about 1° of arc per year
   of life), KP sub-lords and divisional charts (a few minutes of birth time),
   and BaZi month pillars at the solar terms.
8. **A frontier section.** §4 lists what we know of no current tool offering
   (September 2026), in tiers, with five bets marked.
9. **Governance by independence.** Version 1 capped the team at one
   integrator and two AI reviewers. Version 2 requires neither a headcount nor
   a human reviewer. It requires independence (§5), because the failure this
   audit actually suffered was a set of premises shared by every auditor, not
   a lack of capability.
10. **Claims.** "Not more accurate than Swiss Ephemeris" stays: on positions,
    parity is the ceiling. "Never call it a Swiss replacement" becomes an owner
    decision once breadth parity and precision parity pass (§10).
11. **The content boundary covers the platform.** No token, market, collection
    or ownership language or links in the engine, the API, SDKs, MCP tools,
    the CLI, developer docs, package metadata or repository metadata (§6).
12. **Preregistration is scoped.** It stays mandatory for every claim of
    superiority, completeness, accuracy or error bound. Ordinary bug fixes
    need ordinary tests with named cases.

---

## 0. Goal, thesis and claims

### Goal

zodiacs.org becomes the reference implementation and the default endpoint
for astrology computation. It is what an app developer installs, what a
researcher cites, and what an AI assistant calls when it needs a position, a
chart, an event date or a check on a statement about the sky. The engine is
the foundation, the platform is how it reaches people, and the site is its
most visible user.

### Thesis

> Swiss-grade astronomy, astrologer-grade breadth, MIT-licensed, on-device,
> with receipts.

This is where the work ends up, not today's copy. Each clause becomes public
wording only when the phase behind it passes its rule (claims policy below).

### Where each axis stands

| axis | today | where it can go | arbiter |
| --- | --- | --- | --- |
| Positions | ~30″ max over 1800–2200 on the shipped path (astronomy-engine's truncated series) | parity with Swiss. Swiss sits 0.1–0.4″ from Horizons QUANTITIES=31, and most of that is Horizons's IAU76/80 frame, not Swiss error. Parity is the ceiling: no available arbiter can show a position more accurate than Swiss's | Horizons VECTORS, the raw DE440 kernel, an independent pyerfa chain |
| Time | 2004 ΔT polynomial; host tzdb without backzone; the zone city's local mean time; no Julian calendar | ahead: observed ΔT with a band, leap seconds, UT1, backzone tzdb inside the engine, birthplace local mean time, calendars, an open atlas. Swiss has no timezone data at all | IERS, tzdb with backzone, primary legal sources |
| Completeness | "next root" everywhere, as in Swiss; proven only in the research runtime, for geometric crossings | ahead: every event search returns a proven-complete verdict or names the stretch it could not decide | exact-polynomial fixtures, Horizons scans |
| Error bounds | none on any result; Swiss has none either | ahead: every number carries a bound labelled proven, measured or estimated | the bound's derivation, checked against arbiters |
| Provenance | receipts exist; some overstate | ahead: signed receipts naming every model, dataset and version; byte-identical rebuilds | recomputation by anyone |
| License | MIT | ahead of AGPL/professional licensing for app developers | — |
| Privacy | charts computed on the device; the Guide assistant and the calendar feed are disclosed exceptions, and the share token reveals more than it says (R9) | ahead: nothing leaves the device unless the user chooses, and the hosted API keeps no inputs | network negative controls |
| Breadth | 2 house systems, 10 bodies plus the true node, tropical only in the package | parity on what apps use (Phase 2); not Swiss's whole catalogue | Swiss as an instrument, item by item |
| Developer and agent experience | engine not on npm; local stdio MCP; a static sky API | ahead: typed uniform API, hosted endpoints, remote MCP, SDKs in several languages, a conformance suite | adoption measures (§9) |

### What developers get elsewhere, and what we will offer

To our knowledge in September 2026; re-check every row before it appears in
public copy.

| need | typical today | ours |
| --- | --- | --- |
| precise positions | Swiss Ephemeris (C, AGPL or professional license) and wrappers built on it; permissive libraries such as Skyfield and astronomy-engine (both MIT); hosted APIs, many built on Swiss | MIT engine at Swiss parity (Phase 4), a bound on every number |
| historical birth times | the host's timezone data, or proprietary atlases in desktop software | backzone tzdb inside the engine, birthplace local mean time, calendars, an open cited atlas (B3) |
| event dates | "the next root" | proven-complete search with typed verdicts (Phase 4, B5) |
| privacy | hosted APIs receive birth data | computed on the device by default; a hosted API that keeps nothing |
| reproducibility | a version string | receipts naming every model and dataset; byte-identical builds |
| AI agents | over a hundred community astrology MCP servers, mostly on Swiss Ephemeris, some hosted, a few MIT-licensed and not built on Swiss; none with published conformance results that we know of | remote MCP, WebMCP, agent tool packages, an Agent Skill and sky-fact checking, each with receipts and conformance results (Track A, B4) |
| evidence of correctness | the vendor's statement | a public conformance suite with independent arbiters (B1) |

The agent row matters most. Existing is not a differentiator in a field with
a hundred servers. Receipts, conformance results, completeness verdicts and
privacy are.

### Claims policy

- **Allowed now:** "MIT-licensed"; "charts are computed on your device", with
  the exceptions named where they apply; "positions tested against NASA JPL
  Horizons", with the measured figure beside it; "we publish our errors".
- **Allowed when the named phase passes its rule:** "matches Swiss Ephemeris
  to within X″" (Phase 4); "proven-complete event search", per event class
  (Phase 4); "historical time for N places, with sources" (Phase 1, B3); the
  house systems, zodiacs and techniques actually shipped (Phase 2).
- **Allowed only with a date and a scope:** "we know of no other astrology
  engine that …". Never an unqualified "only" or "first".
- **Never:** "more accurate than Swiss Ephemeris"; any accuracy claim resting
  on a Swiss-oracle comparison, on a Moshier fallback, or on Horizons
  QUANTITIES=31 below 0.5″; any claim that astrology is scientifically
  validated. The engine computes the sky; interpretations are traditional and
  reflective.
- **Owner decision (§10):** "a drop-in alternative to Swiss Ephemeris for most
  applications", once Phase 2 and Phase 4 pass.

---

## 1. Source identity (refresh before acting)

- Repository `ZodiacsOfficial/site`, public. `main` at `25eaa205` when this
  was written. PR #556 (research: solar deflection FAIL, domain partition
  PARTIAL) is open on `claude/eager-ramanujan-razak3`; this audit, its
  evidence and both briefs are added to it as documents. Do not repeat its
  work or rewrite its verdicts.
- Engine source: `ZodiacsOfficial/sdk`, public, `packages/engine` at
  `fb57af7a`, which builds `@zodiacs/engine` 0.1.1-rc.6. The site vendors it
  at `vendor/zodiacs-engine-0.1.1-rc.6.tgz` (sha256 `09c3e634…`), and the
  audit rebuilt it byte for byte.
- npm: `@zodiacs/engine` is not published (404). The `@zodiacs` scope exists:
  the npm account `zodiacs` (admin@zodiacs.org) publishes the token SDK
  `@zodiacs/sdk` 1.0.1, whose description and keywords are token language
  (Solana, SPL, Wormhole, bridged assets), and the site installs it as a
  development dependency. Platform packages published in this scope would sit
  beside it (R6, §6, §10). The names `zodiacs` on PyPI and `@zodiacs` on JSR
  are unclaimed.
- Research runtime: `examples/precision-alpha` 0.1.0-preview.1, private, no
  pack distributed.
- Developer surfaces that exist today:
  - `/developers/` pages: engine, compare, examples, mcp, precision-preview,
    support.
  - A local stdio MCP adapter with three tools (`get_capabilities`,
    `calculate_natal_chart`, `compare_calculation_records`), already marked
    read-only and closed-world, shipped as sha256-pinned tarballs in
    `public/examples/`, beside the platform starter tarballs.
  - The engine's TypeDoc reference at `/sdk/engine/`, still for 0.1.1-rc.1,
    under the token SDK's `/sdk/` page and linking to `/registry/`.
  - WebMCP: one tool, `zodiacs.search`, registered on English pages when the
    browser or an extension already provides `modelContext`. The site ships no
    polyfill.
  - The static sky API at `/api/v1`: index, OpenAPI, JSON Schemas,
    `llms.txt`, signs, today's sky and upcoming events (these two with
    Markdown twins), per-planet summaries, and yearly retrogrades, moon
    phases, stations, ingresses, aspects and eclipses. It reshapes committed
    data and computes nothing.
  - Serverless `/api/calendar` (a transit calendar from the share token),
    `llms.txt`, `llms-full.txt`, a sitemap, IndexNow in the daily workflow, and
    a `robots.txt` that allows every crawler.
- Techniques that exist only in the site's code, not in the package:
  secondary progressions; solar and lunar returns (the package has only Saturn
  returns and a longitude-crossing search); void-of-course Moon; declination
  parallels; aspect patterns; composite charts; dignities; sect; and Moon-sign
  candidates for an unknown birth time (`src/lib/`, `src/lib/engine/`).
- Refresh local and remote state first, preserve newer work, and do not start
  duplicate work.

---

## 2. Findings

Version 1's twenty-row table stands with the verifiers' corrections; do not
re-rank it. The review of version 1 and the fact-check of this brief add
nine findings.

| id | finding | severity | evidence | effort |
| --- | --- | --- | --- | --- |
| R1 | **Birthplace local mean time.** Before standard time, the site's resolver (`src/lib/time/localToUtc.ts`) applies tzdb's local mean time for the zone's reference city and takes no longitude. The SDK's `resolveBirth` receives the birthplace longitude but uses it only for angles and houses; it converts the time with the zone alone. Offsets in minutes east of UTC, applied vs the town's own, with the site's GeoNames longitudes: Buffalo 1870 −296.03 vs −315.52 (19.5 min, 4.9° of sidereal time; the Ascendant moves 3.7°–8.9°); Brest 1880 +9.35 vs −17.97 (27.3 min, 6.8°; Ascendant 5.0°–14.5°); Omaha 1880 −350.60 vs −383.77 (33.2 min, 8.3°; Ascendant 6.5°–14.6°). New York and Chicago agree with tzdb to the second; Paris differs by 3 s because tzdb uses the Observatory meridian. The rising sign changes in about one chart in six (Buffalo) to one in 3.6 (Omaha). The project already knew: `docs/phase5/people-pilot/tools/build-manifest.mjs:190` computes `meridianResidualMinutes` for this gap. | major, degrees | probe and tests, 2026-09-23; `build-manifest.mjs:190` | 1 d site (done, pending review), 1 d SDK |
| R2 | **Public copy misdescribes pre-standard time.** The methodology page (`src/pages/methodology/index.astro:185`, and its five translations) calls the zone-city convention "the same convention professional software applies" and puts the difference at "a few clock minutes"; professional atlases use the birthplace longitude, and R1 measures 19–33 minutes. The chart notice (`lmtNotice`, six locales) says "the same convention professional software uses". `llms.txt`, `llms-full.txt` and the homepage and birth-chart FAQs imply birthplace local mean time. R1's fix makes the notice true; the methodology page and the `llms` files need rewriting. | major, claims | files cited | with R1 |
| R3 | **No platform.** The engine cannot be installed from any registry, no endpoint computes a chart, MCP is local only, there is no SDK outside TypeScript, and there is no playground or CLI. None of it was audited. | major, goal | §1 | Phase 3 |
| R4 | **Breadth gaps are whole traditions.** No nakshatras, dashas, divisional charts, panchang or KP; no lots, profections, planetary hours or solar arc; no solar terms or Four Pillars; no rise and set. The techniques the site does have (§1) live outside the package, so a developer gets none of them. | major, adoption | package `.d.ts`; `src/lib/` | Phase 2 |
| R5 | Topocentric position is a degree-level matter for the Moon (horizontal parallax about 54′–61′), not an arcsecond refinement, and some practices use it. Version 1 filed it with the arcsecond work. | minor | — | 1 d, pointwise |
| R6 | **The engine is presented through token ownership.** The SDK repository's description reads "Official read-only TypeScript SDK for building astrology apps with verified Zodiac ownership", with topics including `astrofolio` and `verified-ownership`, and nothing in it says engine, ephemeris or birth chart. The same framing reaches the engine itself: its npm homepage is under the token SDK's `/sdk/` page; the TypeDoc reference there (still 0.1.1-rc.1) links to `/registry/`; and `@zodiacs/sdk`, in the same npm scope, carries Solana and Wormhole keywords. | major, distribution and boundary | GitHub and npm metadata, 2026-09-23 | owner decisions |
| R7 | **The site repository's public face is stale.** Its description is "Landing page for zodiacs.org" and it has no topics. The README's first sentence presents the token registry as the site's collector's wing, and it still describes that wing as "Warm Gilt museum aesthetic, unchanged". There is no LICENSE, `CITATION.cff`, `SECURITY.md` or `CONTRIBUTING.md`. | minor | repository | 0.5 d + owner decisions |
| R8 | **Shared premises.** Every author, auditor and reviewer so far has been an AI working from prompts written by one orchestrator. The context block given to all nine auditors stated two false premises — that Swiss reads the DE440s `.bsp` through `FLG_JPLEPH`, and that Swiss's `.se1` files are DE431-derived — and offered Horizons QUANTITIES=31 as an arbiter without its IAU76/80 frame limit of about 0.05″. Auditors who ran code and read the returned flags and file headers caught all three (alpha-reduction-math-10, production-positions-11, swiss-parity-3); a verifier confirmed one. | process | `tools/engine-audit-phase1.js:28` in the audit record | §5 |
| R9 | **The share token reveals the birth.** The positions-only share token (`src/lib/share-positions.ts`) has no date, time or place fields, but stores every longitude, the Moon and the angles included, to 0.001°. The Moon alone then fixes the birth instant to a few seconds, and the angles give the birthplace approximately. The token travels in URLs, and `api/calendar/transits.ts` takes it as a GET parameter and describes the feed as "zero-PII". | major, privacy claim | files cited; found by the fact-check | 1–2 d + owner decision |

---

## 3. The programme

Four phases and three tracks that run throughout. Effort figures are the
verifiers' estimates and this review's; treat them as orders of magnitude.
Version 1's milestone numbers are given in brackets so that the audit ids and
version 1's rules still trace. Every phase ends with the report in §11.

### Phase 0 — Record (1–2 days) [v1 M0]

Version 1's M0 items 1–5, unchanged: the preregistration file with the
baselines and corpora; the appended corrections; the premises and the frame
decomposition (now three premises, R8); the multi-year distribution fixture;
the `lite.ts` header and its fixture test. The corpora version 1 and §4 rely
on — the Horizons-anchored corpus, the angle grid, the tzdb divergence list,
the 2024 aspect scan — exist today only in the audit's scratch
(`ARTIFACTS.sha256.tsv` records them); committing them is part of item 1.
Plus:

6. Commit the audit, its evidence and both briefs. Done in PR #556.
7. Record the baselines for §9's measures (downloads, calls, citations,
   search impressions, the assistant panel) before any platform work, so later
   changes can be measured against them.

### Phase 1 — Errors a person can see (about 2 weeks) [v1 M1 + time items from M3]

Land these as separate, reviewable commits, in this order. The last column is
the acceptance test.

| step | change | acceptance |
| --- | --- | --- |
| 1.1 | **Birthplace local mean time (R1, R2).** The resolver takes an optional longitude. Before the zone's local mean time era ended, it uses the birthplace's mean time (four minutes of time per degree, to the whole second, as IANA offsets are); every later instant stays Intl's. Where each era ended comes from a table generated from a pinned tzdb release including backzone (`src/data/tz-lmt.json`, loaded on demand for dates before 1953, so no page's initial JavaScript grows). Intl alone cannot find the end: France, Ireland, Portugal, Italy, Russia and others made the capital's mean time the legal national time at the same offset, so Paris Mean Time (1891–1911) and Dublin Mean Time (1880–1916) look exactly like local mean time to it. Those eras stay untouched; Amsterdam's appears only with step 1.12. An era continues across a move of the date line (Manila 1844, Alaska 1867). The change out of the era is a gap or a fold, handled by the existing policy. The `lmt` flag keeps its current rule (any sub-minute offset, which also fires for national mean times and for Monrovia's −0:44:30 until 1972); the result gains a `localMeanTime` field when the birthplace's mean time decided it, and a basis field in portable receipts waits for the SDK's receipt schema. Every calculator passes the place's longitude; the SDK's `resolveBirth` gets the same change. Rewrite the methodology page and the `llms` files (R2). A site-side implementation of this design is written and tested, and lands as its own PR. | With the site's GeoNames longitudes: Buffalo 1870 −5:15:31, Brest 1880 −0:17:58, Omaha 1880 −6:23:46; New York 1870 and Chicago 1880 equal to tzdb; Paris 1880 +0:09:24, a 3 s change; Galway 1885, Brest 1900 and Porto 1890 unchanged (national mean times); Bergen 1894 on its own mean time though Intl says Berlin's CET; switch-day gap (Buffalo 1883-11-18 11:50) and fold (Hartford 12:05) resolved by the policy; portable receipts still validate; the audit's all-zone round-trip scan, committed as a test in this step, passes |
| 1.2 | `applying` as a sign test on the signed relative rate, plus a `stationary` state [v1 1a] | v1 1a's rule |
| 1.3 | Angles and Placidus on the true obliquity of date [v1 1b] | v1 1b's rule |
| 1.4 | Observed ΔT with a 1-σ band, in results and receipts [v1 1c] | v1 1c's rule |
| 1.5 | Lunation times in `sky.json` by apparent-longitude bisection [v1 1d] | v1 1d's rule |
| 1.6 | Grazing return passes no longer dropped [v1 1f] | v1 1f's rule |
| 1.7 | `outside-reference-span` and `range-clipped` flags [v1 1e] | v1 1e's rule |
| 1.8 | Moon and planet speeds from state vectors [v1 1g] | v1 1g's rule |
| 1.9 | Placidus polar limit at 90° − ε, a named fallback, Porphyry offered [v1 1h] | v1 1h's rule |
| 1.10 | One crossing solver, typed refusals [v1 1i] | v1 1i's rule |
| 1.11 | Receipts that describe what was computed, with ephemeris identity required [v1 1j] | v1 1j's rule |
| 1.12 | **Backzone-complete tzdb inside the engine**, as versioned per-zone data shards, with Intl as a cross-check [v1 M3, brought forward] | v1 M3's rule for the 98 divergent zones; Stockholm 1947-07-01 12:00 → +60 |
| 1.13 | **Julian calendar input**, with adoption-date warnings per country [v1 M3, brought forward] | v1 M3's rule; Petrograd 1917-10-25 O.S. gives the 1917-11-07 chart |
| 1.14 | **A claims ledger.** Every public sentence about accuracy, time handling or privacy — on the site, in `llms.txt`, in receipts and in developer docs — is listed with its evidence path, and `scripts/trust-surface-consistency.test.mjs` (or a sibling) enforces the list. Fix every overstatement the audit and the fact-check found (R2, R9). | every such sentence has an evidence path; any sentence without one is removed |
| 1.15 | **The share token (R9).** Owner decision: coarsen what the token carries (for example the Moon and the angles to 0.1°, which transit contacts within orb do not need), or move it out of URLs. Either way, describe it truthfully: no name, date or place fields, but positions from which the birth moment and approximate place can be recovered. | a decoder test shows the chosen precision cannot recover the birth instant to better than the stated window; the claims ledger carries the new wording |

### Phase 2 — The breadth developers check first (about 8 weeks) [v1 M5, widened]

Version 1 put its narrower M5 alone at about 20 days; the traditions added
here roughly double it. In the order developers look for things. The rules
follow version 1's M5 pattern: each item against Swiss as an instrument where
Swiss computes it, against a first-principles computation where it does not,
and every formula or definition cited.

**A. Western essentials**

- *Houses:* Equal (from the Ascendant and from the MC), Porphyry, Koch,
  Regiomontanus, Campanus, Alcabitius, Morinus, Meridian, Topocentric, Vehlow,
  plus the existing whole-sign and Placidus. A polar policy per system with a
  named fallback; house position with latitude; Vertex and East Point; cusp
  speeds. Rule: v1 M5's.
- *Points:* mean node; mean and osculating Black Moon Lilith; the Lots of
  Fortune and Spirit with their day and night formulas, and the other
  Hellenistic lots (Eros, Necessity, Courage, Victory, Nemesis); antiscia;
  midpoints. Rule: ≤ 1″ from Swiss where Swiss computes it; one citation per
  lot formula.
- *Aspects:* configurable sets and orbs (per body, per aspect, separate
  applying and separating orbs); minor aspects; the existing declination
  parallels moved into the package; an out-of-bounds flag. Rule: declinations
  ≤ 0.01″ from Swiss `FLG_EQUATORIAL`; fixtures for every pattern definition.
- *Timing techniques:* move the site's secondary progressions and solar and
  lunar returns into the package; add solar arc directions, primary
  directions (Ptolemy and Naibod keys; semi-arc and Regiomontanus methods),
  annual and monthly profections, firdaria, zodiacal releasing, planetary
  returns and planetary hours. Rule: fixtures from worked examples in cited
  sources; primary directions against Swiss-derived arcs.
- *Rise, set and transit,* with standard refraction and semi-diameter, and
  flags for polar day and night. Rule: ≤ 5 s from Swiss `rise_trans` and from a
  first-principles computation on a grid of sites; USNO's published times,
  which are given to the minute, as a ±30 s check.
- *Composite and Davison charts*; the existing synastry.
- *Eclipses:* contacts, magnitudes, Saros series and local circumstances
  [v1 M5].
- *Chiron, Ceres, Pallas, Juno and Vesta* from Horizons-generated SPK
  segments, on the hosted path first [v1 M2a b].
- *Fixed stars:* a curated, cited list of the traditional stars (the royal
  and Behenian stars and the others in common use). Positions come from
  Hipparcos (van Leeuwen 2007) for the brightest stars, which Gaia measures
  poorly or not at all, and from Gaia DR3 where it measures them well. They
  are propagated with proper motion, parallax and radial velocity by an
  ERFA-grade routine. Rule: ≤ 1″ from Swiss `fixstar` for stars both cover; a
  citation and an uncertainty per star. (This replaces version 1's ban on
  fixed stars; see §7.)
- *Topocentric Moon, pointwise* (R5). Rule: ≤ 0.05″ from Swiss `FLG_TOPOCTR`
  and from pyerfa.

**B. Sidereal and Vedic**

- *Ayanamsas:* Lahiri (Indian Ephemeris definition), Lahiri ICRC,
  Fagan–Bradley, Krishnamurti, Raman, Yukteswar, True Citra, True Revati, True
  Pushya, Galactic Centre variants, and user-defined. Each definition cited.
  Rule: ≤ 0.01″ from `get_ayanamsa_ex_ut` [v1 M2a c].
- *Nakshatras and padas.*
- *Vimshottari dasha* to five levels with exact boundary instants. Programs
  differ on the year length (365.25-day Julian, 365.2422-day tropical,
  365.2564-day sidereal, 360-day savana, or the Sun's actual return): expose
  the choice and name it in the receipt. Yogini and Ashtottari as options.
- *Divisional charts:* the sixteen of the Shodashavarga (D1 D2 D3 D4 D7 D9 D10
  D12 D16 D20 D24 D27 D30 D40 D45 D60), with variant definitions named, and a
  sensitivity output: how many minutes of birth time before each varga sign
  changes. D60 changes every half degree of Ascendant, about two minutes of
  birth time on average, so this output is what makes the charts honest (see
  B2).
- *Panchang:* tithi, nakshatra, yoga, karana and vara, with the day running
  from sunrise at the given place, and every transition instant computed by
  the same search as the other events.
- *KP:* sub-lords and sub-sub-lords for Placidus cusps and planets; ruling
  planets.
- Rule for B: dasha and panchang boundaries within 5 s of an independent
  first-principles computation; one season spot-checked against a published
  panchang; varga assignments exact on boundary fixtures.

**C. Chinese**

- The 24 solar terms as exact instants (apparent solar longitude at multiples
  of 15°).
- Four Pillars: the year changes at Lichun (315°) and the months at the twelve
  jie terms; the hour pillar and the day boundary under named conventions
  (clock, local mean or true solar time; the day changing at 23:00 or at
  midnight).
- The full lunisolar calendar is deferred to the frontier (X-4). It needs a
  documented rule set for its historical reforms.

**D. Frames and outputs**

Equatorial (RA/Dec), J2000/ICRS, heliocentric, distances, and speeds in every
coordinate, all through the uniform API (3.2).

**E. Techniques into packages**

Move the site-only techniques listed in §1 into the engine package, or into a
companion package, with the site importing them from there. The site stays
the first user of everything developers get.

Not in Phase 2: other numbered asteroids (the hosted API may offer them on
demand later), heliacal phenomena, occultations, Gauquelin sectors, and dates
outside the ephemeris range.

### Phase 3 — The platform (about 4 weeks, overlapping Phase 2)

| step | what | acceptance |
| --- | --- | --- |
| 3.1 | **Publish with provenance.** `@zodiacs/engine` from the verified archive; then `@zodiacs/mcp-server`, `@zodiacs/cli`, `@zodiacs/ai-tools` and `@zodiacs/wheel`, in whichever scope the owner chooses (§10). Use npm trusted publishing from GitHub Actions (OIDC; no long-lived token anywhere) with provenance statements. npm lets a trusted publisher be configured only for a package that already exists, and has no pending publishers, so the first publish of each new name is a manual, two-factor publish from the owner's npm account. A JSR mirror for Deno. A CycloneDX SBOM per release. The byte-identical rebuild check runs in CI [v1 M6]. | `npm view` shows each package with provenance; the rebuild check is green |
| 3.2 | **A uniform calculation API.** `calc({ body, time, frame, center, zodiac, flags })` returns `{ lon, lat, dist, speeds, bounds, receipt }`; plus `houses()`, `events()` and `chart()`. Typed, semver, one conventions vocabulary (§4.4), errors as typed refusals. | the `.d.ts` covers every option Swiss's `calc_ut` offers that Phase 2 ships; round-trip fixtures |
| 3.3 | **Hosted compute endpoints** — chart, positions, events, houses, sky-fact checking and time resolution — in the existing `/api/v1` namespace or on an API host, described by one OpenAPI document with the static sky data. Stateless. Birth data, or anything from which it can be recovered (R9), only ever in POST bodies, never in URLs, because CDNs and analytics log URLs. No logs contain inputs. Receipts in every response. Open CORS; rate limits mapped onto the research runtime's whole-request budgets, so a request that runs out returns a typed `budget-exhausted` rather than a timeout; a generous free tier. The DE440 pack on the server, not redistributed, as the precise backend, named in the receipt; astronomy-engine as the named fallback. | a negative-control test shows no input in any log line; receipts name the backend; latency and cost recorded |
| 3.4 | **OpenAPI 3.1** with JSON Schemas and an example for every request and response. Generated clients for TypeScript and Python first; Go, Rust, Swift and Kotlin when demand appears. A Markdown twin for every developer page. | the schema validates every example; a clean-consumer test per client |
| 3.5 | **Python SDK** (`pip install zodiacs`): a typed client for the hosted API, plus an offline engine through WebAssembly built from the same source as the JavaScript engine. Results are identical wherever the engine uses its own deterministic trigonometry (as the research runtime's `trig.mjs` does), and within a stated tolerance elsewhere. Vectorised positions that work with NumPy; chart wheels that render in Jupyter. | conformance vectors pass in both languages; identity or the stated tolerance holds |
| 3.6 | **Remote MCP server** (Streamable HTTP) at a zodiacs.org path. Read-only tools with output schemas and annotations; no authentication for public tools. Published in the official MCP Registry (in preview) under the domain-verified `org.zodiacs` namespace, by a DNS TXT record or an HTTP challenge, and listed wherever MCP clients discover servers. The stdio adapter stays, published on npm, for offline use. Tools in Track A. | the MCP project's current conformance tests and its Inspector CLI pass against every tool; the registry entry resolves |
| 3.7 | **CLI:** `npx @zodiacs/cli` with `chart`, `positions`, `events`, `verify` and `conformance` commands, text, JSON and SVG output, and receipts; offline by default. | clean-consumer install on Linux, macOS and Windows |
| 3.8 | **Playground** at `/developers/playground/`: live requests against the hosted API beside the in-browser engine, a receipt viewer, code in five languages, and shareable links that carry birth data only if the user chooses. | agents and people can reproduce any documented example from it |
| 3.9 | **Conformance suite v0**, the first slice of B1, run against this engine in CI. | see B1 |
| 3.10 | **Documentation:** quickstarts for the browser, Node, Deno, Bun, edge runtimes, React Native and Python; recipes (natal chart, transits, returns, synastry, panchang, election search); a conventions reference; an error catalogue; a changelog; a deprecation policy (twelve months' notice); a status page; and "where this number comes from" pages with receipts. | every page has a Markdown twin and is listed in `llms.txt` |
| 3.11 | **Repository basics** (Track G): LICENSE, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CITATION.cff`, `AGENTS.md`, and a "wrong chart" issue template that asks for the receipt. | present in every public repository |

### Phase 4 — Precision and proofs (about 6–7 weeks) [v1 M2, M4]

Version 1 put M2 at 15–20 days and M4 at 15 days.

- The DE440 reduction becomes the hosted API's backend first; version 1's
  M2.6 rules (i)–(viii) apply on that path. It becomes the on-device backend
  when NAIF answers the derived-coefficient question [v1 M2.2]. Power users of
  the CLI can use it now by the permitted route: their own copy of the kernel,
  compiled locally.
- Compiler fixes [v1 M2.1]: derive the span from the kernel, and refuse
  over-budget packs.
- Error bounds on every result [v1 M2.4], in the API and the interface.
- Proven completeness for ingresses, stations, returns, transits, aspects and
  latitude crossings [v1 M4.4–4.5]. Verdicts appear in the interface and the
  API: "all events found, proven", or "this stretch unresolved".
- The Moon enclosure fix as a new preregistered version [v1 M4.1–4.3]. The
  original PARTIAL stays in the record.
- Rules: version 1's M2.6 and M4 rules, unchanged.

### Deferred, with reasons

Planet centres from satellite kernels (at most 0.09″, far below anything a
chart shows). The full IAU 2000A nutation in the angle path (sub-arcsecond).
The Klioner term. Interval-proven topocentric search (the pointwise version is
in Phase 2). Pack signing, until a pack is distributed. The solar-deflection
search: its FAIL stands; revisit it after the Moon enclosure fix.

### Track A — Agents and LLMs (all phases)

Goal: when an AI assistant needs an astrology computation, it calls
zodiacs.org or runs the engine locally instead of guessing, and it cites the
result.

- **A1. Remote MCP tools (3.6).** Keep the three existing tools and their
  names (`get_capabilities`, `calculate_natal_chart`,
  `compare_calculation_records`) and add:
  - `get_positions`: bodies at an instant, with frame and zodiac options.
  - `find_events`: ingresses, stations, aspects, lunations, eclipses and
    void-of-course periods in a window, with a completeness verdict.
  - `check_sky_fact`: a computable statement about the sky — a position, a
    date, an aspect, a retrograde — in; true, false or "depends" out, with the
    computed facts and a receipt. Never an interpretive or predictive claim.
  - `resolve_birth_time`: local time and place to UTC, with flags (DST gap or
    fold, the local mean time basis, uncertain zone history, the calendar).
  - `search_places`: GeoNames candidates with coordinates and zone.
  - `explain_factor`: the site's own interpretation text for a chart factor,
    with its tradition and source. Never generated text.
  - `get_sky_today`.
  - Methodology and the conventions vocabulary as MCP resources.
  - Every tool: `readOnlyHint` true, `openWorldHint` false, an output schema.
- **A2. WebMCP on every calculator.** Each tool page registers its own tool
  the way search does today (when the browser or an extension provides
  `modelContext`), and in every released locale, so agents in the browser
  operate the page through typed tools instead of scraping it.
- **A3. `@zodiacs/ai-tools`:** tool definitions and local executors for the
  main agent frameworks (the Vercel AI SDK, the OpenAI and Anthropic tool
  formats, LangChain, LlamaIndex, Mastra), so an agent gets correct astrology
  without a network call.
- **A4. An Agent Skill.** A `SKILL.md` bundle in a public repository: which
  tool answers which question, how to ask for birth-time uncertainty, how to
  cite receipts, and what never to claim.
- **A5. Documentation agents can read.** Keep `llms.txt` current and add a
  developer-platform section; `llms-full.txt`; Markdown twins; the OpenAPI
  document linked from `llms.txt`; `AGENTS.md` in each public repository;
  stable anchors. Submit the engine repository to Context7 and confirm DeepWiki
  indexes it.
- **A6. Citations in every response.** API and MCP results carry
  `cite: { url, receipt, engine, version }`, so an assistant can quote its
  source. Methodology URLs never change.
- **A7. The assistant benchmark** (part of B4).
- **A8. Measure it.** A fixed monthly panel of prompts across the major
  assistants ("which sign was the Moon in on …", "is Mercury retrograde on …",
  "what is a free birth chart API?"), recording whether each answer is correct
  and whether it cites or calls zodiacs.org.

### Track S — Search (all phases)

- **S1. Technical.** Keep the sitemap, hreflang, canonicals, the Core Web
  Vitals and the bundle budgets. Add `SoftwareApplication` markup for the
  engine, CLI and MCP server; `SoftwareSourceCode` for the repositories
  (repository URL, license, language); schema.org's `WebAPI` type (in the core
  vocabulary since release 30.1, 16 September 2026) for the API, with
  `documentation` pointing at the OpenAPI document; and `Dataset` with
  `DataDownload` for every data release (license, temporal coverage,
  creator), which Google Dataset Search reads.
- **S2. Do not chase retired rich results.** Google restricted FAQ rich
  results to well-known government and health sites in August 2023, stopped
  showing HowTo rich results in September 2023, and stopped showing FAQ rich
  results for every site on 7 May 2026. Keep FAQPage markup only where the page
  really is an FAQ, and expect no search feature from it.
- **S3. Generated pages behind a demand gate.** The people pilot already
  withholds every page that fails its demand ranking, content checks or
  living-person protection (`index-demand.json`, `people.json`). Apply the same
  policy to every generated family — retrograde periods by year, lunations by
  month, eclipses, ingresses, returns by birth year, panchang by city and day:
  index only what has demand evidence and unique computed content, `noindex`
  the rest, and prune from Search Console data. Google's scaled-content-abuse
  policy targets mass-produced pages without value; the gate is the defence.
- **S4. Developer queries.** Pages that answer what developers type —
  "astrology API", "birth chart API", "Swiss Ephemeris alternative for
  JavaScript", "ephemeris npm", "Vedic astrology API", "Python astrology
  library", "astrology MCP server" — each with a snippet that runs, an honest
  comparison, and receipts. Update `/developers/compare/` at every phase.
- **S5. Earn links; never buy them.** The conformance suite, the time atlas,
  datasets with DOIs, the assistant benchmark, papers, and a yearly report on
  the computational accuracy of astrology software (positions, times, events)
  attract citations. No paid links and no link schemes.
- **S6. Trust signals.** Methodology, corrections, the editorial constitution
  and published errors. CI already blocks the retired "Rowan Vale" persona,
  the old editor anchor and any schema.org `Person` markup in `src/`; keep that
  and extend it to developer docs.
- **S7. One entity.** One name form, "Zodiacs.org". Organization markup with
  `sameAs` links to GitHub, npm, PyPI and the MCP Registry entry once they
  exist. A Wikidata item only when independent references exist, and never a
  self-promotional Wikipedia edit.
- **S8. Fast indexing.** IndexNow already runs for daily pages; extend it to
  every new or changed URL, developer docs and datasets included. Verify and
  monitor Bing Webmaster Tools and Google Search Console. Several AI
  assistants search through Bing's index.
- **S9. AI crawlers.** `robots.txt` allows every crawler. Keep it that way.

### Track G — GitHub and working in public (all phases)

- **G1. Owner decision (R6):** give the engine its own public repository (for
  example `ZodiacsOfficial/engine`) and its own documentation home outside
  `/sdk/`, or re-describe the SDK repository, so that searches for an
  astrology engine, an ephemeris or a birth chart find it and it carries no
  ownership or token framing. A suggested description: "MIT-licensed
  astrology engine for JavaScript and TypeScript: charts, houses, aspects,
  transits and events, computed on-device, with receipts." Suggested topics:
  astrology, astronomy, ephemeris, birth-chart, horoscope, typescript,
  javascript, mcp, vedic-astrology. (No Swiss-alternative topic until §10.1 is
  decided.)
- **G2. The site repository (R7):** an accurate description and topics; a
  README rewritten for the site as it is (the retired look removed, the
  developer platform linked); a decision on its license. Content can stay
  all-rights-reserved while code is MIT; that is the owner's call.
- **G3. Every public repository:** LICENSE; a README with a thirty-second
  quickstart and badges (npm version, provenance, CI, conformance level);
  `CITATION.cff`; `SECURITY.md`; `CONTRIBUTING.md`; `CODE_OF_CONDUCT.md`;
  `AGENTS.md`; issue templates; Discussions; releases with notes and signed
  artifacts; OpenSSF Scorecard; Dependabot; CodeQL.
- **G4. Commits and releases in the open:** descriptive commit messages,
  tagged releases with changelogs, and a Zenodo DOI per release through the
  GitHub integration, so papers can cite an exact version.
- **G5. Curated lists and registries:** once packages are published, submit
  to the curated lists that accept projects (astronomy, astrology, MCP
  servers).

---

## 4. The frontier — what we know of no current tool offering (September 2026)

Each item says what it is, why it matters, what already exists to build on,
a first slice of two weeks or less, the acceptance rule, and the main risk.
The five bets are the ones to fund first. They compound: each makes the next
more valuable.

### 4.1 The five bets

**B1. An open conformance suite: become the referee.** *(Bet 1; start first.)*

- *What:* versioned, CC0-licensed test vectors for astrology computation,
  each with an independent arbiter: Horizons vectors, ERFA/SOFA reductions,
  IERS ΔT and UT1, published eclipse canons, tzdb with backzone, primary legal
  sources for historical time, and published definitions for ayanamsas and
  house systems. Organised in levels: L1 positions, L2 houses and angles, L3
  time and calendars, L4 events and completeness, L5 sidereal and Vedic, L6
  Hellenistic and timing techniques. A harness that any engine can plug into
  through a thin adapter (CLI, JSON over stdio), and a public results table.
- *Why:* whoever defines "correct" is central even to people who never call
  our API, and every engine that runs the suite links back to it. It also
  gives the independence regime in §5 a public, external form.
- *Already have, in the audit's scratch until Phase 0 commits it:* the Swiss
  benchmark corpus (committed), the 240-row Horizons-anchored corpus, the
  3,128-case angle grid, the tzdb divergence list, the 2024 aspect scan, the
  canon events; receipts.
- *First slice:* L1–L3 v0 with 500 vectors; the harness; adapters for this
  engine and for pyswisseph (as an instrument, with its returned flags
  published); a results page.
- *Rule:* every vector names its arbiter and tolerance; no vector may use
  Swiss as its arbiter; errors in the suite itself go through a public
  discrepancy process.
- *Risk:* other engines ignore it. Answer: publish results for the open
  engines ourselves (running software to measure it and publishing what was
  measured is fine) and keep the adapter trivial.

**B2. Charts that know how uncertain they are.** *(Bet 2.)*

- *What:* the user gives a birth-time window — "14:30 ± 10 min", "morning",
  or "a hospital record rounded to five minutes" — and gets the exact
  partition of that window into cells where every discrete feature of the
  chart is constant: signs, houses, aspects, varga signs, KP sub-lords, the
  running dasha. The switch instants are proven by the interval machinery:
  "Moon certainly in Taurus; Ascendant Leo until 14:37:12, then Virgo; the D9
  Ascendant changes four times." Each cell's share of the window under a
  stated prior (uniform, or a rounding model). On a map, astrocartography
  lines become bands.
- *Why:* most tools show one chart for one time without saying which parts
  depend on the exact minute. Divisional charts and KP sub-lords change within
  minutes, and this is what makes them honest.
- *Already have:* interval arithmetic, validated search and root isolation in
  the research runtime; the site's Moon-sign candidates for an unknown birth
  time (`moon-certainty.ts`, `chart-date-certainty.ts`), which already show
  one kind of uncertainty.
- *First slice:* Sun, Moon, Ascendant, houses and aspects over a window, with
  switch instants, in the birth chart tool and the API. Before Phase 4 it is
  labelled "sampled at one-second resolution"; after it, "proven".
- *Rule:* switch instants agree with dense sampling at 1 s on 1,000 random
  windows, with zero missed switches; "proven" only where the research runtime
  proves it.
- *Risk:* a complicated interface. Show one line ("Your rising sign depends on
  the exact time: Leo or Virgo"), with the detail on request.

**B3. An open historical time atlas.** *(Bet 3.)*

- *What:* a dataset of what clocks said, where and when. tzdb with backzone as
  the base, plus town-level local mean time, local railway and city time,
  wartime and double summer time, and border changes (a town in Alsace follows
  France, then Germany from 1871 to 1918, then France again). Every rule cites
  a primary source (laws, official gazettes, newspapers, railway timetables),
  carries a version and an uncertainty flag, and is published under CC BY or
  ODbL, with a reviewed correction process.
- *Why:* historical time is the largest source of wrong birth charts, and the
  atlases professionals use are proprietary. We know of no open, cited
  equivalent.
- *Already have:* the GeoNames city shards (CC BY), the people-pilot manifest
  work, the tzdb divergence list, and R1's era table and resolver.
- *First slice:* the United States and France before 1920 (local mean time,
  then railway time, then standard time), with sources, feeding
  `resolve_birth_time`; the published dataset and a diff viewer.
- *Rule:* every rule has a primary citation; round-trip consistency tests;
  wherever the atlas overlaps tzdb, every difference is explained.
- *Risk:* it is research-heavy. Never copy a proprietary atlas, and accept
  outside submissions only with citations.

**B4. Ground truth for AI assistants.** *(Bet 4.)*

- *What:* remote MCP, `check_sky_fact`, `@zodiacs/ai-tools`, the Agent Skill,
  and a public benchmark of assistants answering astrology-computation
  questions with and without the tools (working name "sky benchmark"; check
  the name for collisions before publishing).
- *Why:* language models often get signs, retrogrades and dates wrong, and
  benchmark v0 will measure how often. Being the tool an assistant calls is the
  new form of ranking. Over a hundred astrology MCP servers already exist, so
  the case has to be made on receipts, conformance results and privacy, and
  the benchmark is where it is made.
- *Already have:* the stdio MCP adapter, WebMCP search, `llms.txt`, receipts.
- *First slice:* remote MCP with the existing three tools plus
  `check_sky_fact` and `find_events`, and a registry listing; benchmark v0 with
  300 questions, ground truth from the engine, scored for five assistants with
  and without the tools.
- *Rule:* `check_sky_fact` agrees with the engine on every benchmark item;
  every response carries a receipt; no birth data is retained (a negative
  control proves it).
- *Risk:* the benchmark looks self-serving. Publish the items, the scorer and
  the raw answers.

**B5. Certified event feeds and election search.** *(Bet 5.)*

- *What:* (a) feeds — ICS, RSS, JSON and webhooks — of ingresses, stations,
  lunations, eclipses, void-of-course periods and exact aspects, each window
  carrying a proof that nothing is missing or duplicated; (b) a small query
  language for sky conditions ("Moon waxing, not void, in Taurus, Venus
  angular in London, between 1 and 30 November") that compiles to the proven
  interval search and returns every window that qualifies, or names the
  stretches it could not decide.
- *Why:* apps that send notifications need every event exactly once, and
  electional astrology is a search over constraints; we know of no tool
  (September 2026) that proves such a search missed nothing.
- *Already have:* validated search with typed verdicts, the site's calendar
  API, the transit scan core.
- *First slice:* a certified feed of ingresses, stations and lunations for
  2026–2030 with proof certificates; a grammar with five predicates.
- *Rule:* feeds against Horizons-derived scans over 2020–2030: zero missed,
  zero extra; query results against brute force at 10 s on 100 random
  queries.
- *Risk:* the grammar grows without limit. Start small and typed.

### 4.2 Differentiators (alongside or after the bets)

- **D1. Permanent chart records.** A content-addressed, signed record of the
  inputs, conventions, data versions and outputs that anyone can recompute and
  verify. Privacy guard: never publish a bare hash of birth data, or of
  anything that implies it (R9) — the space of dates, times and places is
  small enough to search exhaustively — so record identifiers are random or
  keyed.
- **D2. Proof certificates with an independent checker.** Event-search
  results ship with a certificate (the partition and its bounds) that a small
  checker in a second language, Python or Rust, validates: two implementations
  agreeing instead of one trusting itself.
- **D3. A bound on every number** (Phase 4), shown as ± in the interface and as
  structured bounds in the API, each labelled proven, measured or estimated.
- **D4. The same results everywhere.** The engine core compiled to
  WebAssembly for Python, Go, Rust, Swift and Kotlin: bit-identical wherever it
  uses its own deterministic trigonometry, within a stated tolerance
  elsewhere, which also makes caching by content safe.
- **D5. Convention-robust charts.** One view showing which chart factors
  survive a change of house system, zodiac, ayanamsa or node type, and which
  depend on the choice.
- **D6. The historical sky with honest error bars.** Positions and events from
  −3000 to +3000 with ΔT uncertainty carried through (ancient charts carry
  minutes of ΔT uncertainty; show it), and the Julian calendar built in.
- **D7. Accessible charts.** Every wheel has a structured text description and
  keyboard navigation, so a screen-reader user gets the chart, not a picture
  of it. `@zodiacs/wheel` ships with this.
- **D8. A cited interpretation corpus.** The site's interpretation text as a
  versioned corpus with a stable id per factor, tradition tags and classical
  sources (Ptolemy, Valens, Lilly …), in five languages, so assistants quote
  text rather than invent it.
- **D9. An astrology vocabulary with stable URIs.** Signs, bodies, points,
  houses, aspects, dignities, lots, nakshatras, ayanamsas and techniques as
  JSON-LD defined terms, aligned to Wikidata where items exist — the
  vocabulary other sites and models link to.
- **D10. Fixed stars with provenance** (Phase 2), extended to any catalogue
  star on request.
- **D11. Astrocartography as data.** Planet lines, parans and local space as
  GeoJSON, with exact paran latitudes and uncertainty bands (B2).
- **D12. An honest laboratory.** Tools for testing astrological claims:
  preregistration templates, control charts made by shuffling times, open
  birth datasets sourced and cited by us, power calculations. It is framed as
  tools for testing, never as claims. Never scrape Astro-Databank or any other
  proprietary collection.
- **D13. A self-hostable API.** A container image of the hosted API (MIT) for
  companies and privacy-sensitive apps, using the operator's own copy of the
  JPL kernel, compiled locally (the permitted route).
- **D14. Edge and mobile.** The engine tested in CI on edge runtimes, Deno,
  Bun, React Native and Expo, and offline inside a service worker.
- **D15. "Where does this number come from?"** Every number in the interface
  and the API links to its formula, inputs, conventions, bound and arbiter
  comparison.
- **D16. A public log of the published sky.** A daily signed snapshot of the
  positions and events the site published, appended to a public log such as a
  Git repository, so any past statement can be checked later.

### 4.3 Reach (long shots worth a short spike)

- **X-1. Machine-checked numerics:** proofs, in Lean or a similar assistant,
  of the interval primitives' outward-rounding bounds and of the
  root-isolation lemma the search depends on.
- **X-2. Lunar occultations** of planets and bright stars, with timings to the
  standard of IOTA's observers and local circumstances.
- **X-3. Heliacal risings and settings,** with published visibility models and
  their assumptions stated.
- **X-4. Lunisolar calendars:** the Chinese calendar with its historical rule
  changes, and the Hindu calendar variants (amanta and purnimanta), each with
  cited rules.
- **X-5. Islamic crescent visibility,** under named criteria.
- **X-6. Papers:** the astronomical and numerical methods (the interval-proven
  event search, the time atlas) submitted to a refereed journal such as
  Astronomy and Computing, with an arXiv preprint (astro-ph.IM or cs.MS); and
  the engine to the Journal of Open Source Software once it has documented
  research use. JOSS reviews the software, not the methods, and arXiv is not
  refereed; the journal is where the methods get peer review. All three give
  DOIs.
- **X-7. Open datasets with DOIs** on Zenodo, Hugging Face and Kaggle: event
  catalogues for 1800–2200, ΔT with bands, the time atlas, the conformance
  vectors — where researchers and model builders look.

### 4.4 Setting the standard: a conventions registry and a computation spec

- **A conventions registry:** a canonical id and definition for every
  convention — `zodiac:tropical`, `ayanamsa:lahiri-indian-ephemeris`,
  `house:placidus`, `node:true-osculating`, `lilith:mean`, the ΔT model, the
  calendar — each citing its source, in the way IANA keeps registries. Every
  receipt, API field and conformance vector uses these ids, and the URIs live
  on zodiacs.org.
- **An open spec for astrology computation:** what was asked, under which
  conventions, what came back, and with what bounds — published as JSON Schema
  and OpenAPI components under an open license, with the conformance suite as
  its test. Other providers can implement it; zodiacs.org hosts the spec, the
  registry and the suite.
- **Why:** a standard makes its host central. This is how "central to
  astrology APIs" becomes a structural fact instead of a marketing position.
- **Start:** the registry begins as the vocabulary of receipts in step 1.11
  and grows with B1.

### 4.5 Order

In the first six weeks, alongside Phases 1–3: B1 v0 (L1–L3) and B4 v0 (remote
MCP, `check_sky_fact`, benchmark v0), which reuse corpora and platform work
already planned. Then B2 and B5: their sampled versions can ship earlier,
labelled as sampled, and their proven versions need Phase 4. Start B3's
US-and-France slice early, because archival research takes calendar time
whatever the effort.

### 4.6 What the site gets

- The birth chart tool shows uncertainty honestly (B2) and handles historical
  births correctly (R1, 1.12, 1.13, B3). The people pages become more
  accurate.
- New consumer tools from Phase 2 — a nakshatra calculator, a daily panchang
  by city, a dasha calculator, solar terms and Four Pillars — open search
  markets the site does not serve today (size them with demand data first),
  behind the demand gate (S3). Whether to add a Hindi or Chinese locale is an
  owner decision.
- Event calendars (retrogrades, eclipses, lunations) say "all events found,
  proven" and link to their proofs.
- Accessible charts, and "where does this number come from" on every figure.

---

## 5. Governance: independence, not intelligence

The owner's point stands: capability is not the question. What went wrong in
this audit was correlation. One context block, written by one orchestrator
and given to all nine auditors, carried three bad premises (R8). They were
caught only because auditors ran code against the instruments and read the
flags and file headers, instead of trusting what they had been told. More
reviewers of the same kind, human or AI, reading the same framing, reduce
errors less than one reviewer who does not share it. The fact-check of this
brief made the same point again: it found seven statements it marked false,
which their author had not questioned. So version 2 drops version 1's headcount rule and
requires independence instead:

1. **Execution over reading.** Every finding and every claim is reproduced by
   running code against an arbiter outside the stack.
2. **No shared premises.** A reviewer's prompt contains the artifact and the
   claim, not the author's reasoning. The reviewer's first task is to list the
   premises and attack them.
3. **A different instrument.** At least one check per claim uses a different
   toolchain: Python with ERFA and jplephem against JavaScript; IERS files
   against code.
4. **A different reviewer.** For milestones that carry a public claim, at
   least one reviewer from a different model family or configuration where one
   is available; otherwise a different prompt author and a fresh context.
5. **Public reproducibility.** The conformance suite, receipts and committed
   evidence let anyone re-check, human or AI. A public discrepancy process
   ("report a wrong chart", with the receipt attached) publishes its
   dispositions.
6. **Humans: optional, and useful for a different reason.** An established
   astronomer or author of astrology software who reviews the astronomical and
   numerical methods adds credibility with the people who choose tools. That is
   a distribution benefit, not a correctness gate. A refereed journal (X-6) is
   the formal route.

---

## 6. Boundaries

- **Content.** Extend the consumer boundary in `CLAUDE.md` to the platform: no
  token, market, collection or ownership language or links in the engine, the
  API, SDKs, the CLI, MCP tools and their descriptions, developer docs,
  package metadata, repository descriptions and topics, or API responses.
  Astrofolio benefits only through the brand's reputation, and that
  separation is what lets it benefit at all: an accurate engine says nothing
  about a token, and developers discount tools that look crypto-adjacent. The
  shared npm scope and the `/sdk/` documentation home are where the two sit
  closest today (R6). Take counsel before any message that ties the token to
  the team's development work.
- **Privacy.** Charts are computed on the device by default. The hosted API
  keeps no inputs: no request bodies in logs, and a negative-control test to
  prove it. No analytics carrying inputs. No identifier derived from birth
  data or from anything that implies it. Nothing in a URL from which a birth
  can be recovered (R9). A stateless MCP server.
- **Licensing.** MIT for engine and platform code. A license per dataset: CC0
  for the conformance vectors, CC BY or ODbL for the atlas, GeoNames' CC BY
  attribution kept. NAIF's attribution for any kernel redistributed. No Swiss
  code, data or output in `src/` or any pack [v1 §4.3]. Ask NAIF before
  distributing a derived pack.

---

## 7. Non-negotiables (version 1's §4, revised)

Version 1's twelve stand, with these changes:

- **1 (preregister before optimising)** applies to every claim of superiority,
  completeness, accuracy or bound. Ordinary bug fixes need ordinary tests with
  named cases.
- **5 (the shipped path is the product)** covers the hosted API too: the same
  engine and the same receipts, never a separate code path with different
  numbers.
- **6 (data distribution)**: the hosted API may compute from the DE440 pack on
  the server. The pack itself is not distributed until NAIF answers.
- **10 (team)** is replaced by §5.
- **12**: fixed stars are allowed as a curated, cited list (Phase 2). Chiron,
  Ceres, Pallas, Juno and Vesta come through Horizons-derived SPK on the hosted
  path; other numbered asteroids on demand later. Still no new compression
  scheme, no silenced test, no disabled gate.
- **New 13:** every public sentence about accuracy, time handling or privacy
  has an evidence path in the claims ledger (1.14), or it is removed.
- **New 14:** platform outputs carry no token language (§6).

## 8. Evaluation discipline

Version 1's §5, unchanged: corpora and fresh holdouts, denominators, the
PASS / FAIL / PARTIAL vocabulary, and receipts for every oracle.

## 9. Measures of success

Record the baselines in Phase 0 and preregister a target for each phase, like
any other claim.

- **Adoption:** npm weekly downloads per package, including the stdio MCP
  server; PyPI downloads; remote MCP sessions per day (the MCP Registry is a
  metadata registry and publishes no install counts); hosted API requests per
  day and distinct callers; GitHub stars, forks and dependent repositories;
  engines that report conformance results; citing domains and papers.
- **Quality:** the conformance level passed; benchmark scores with the tools;
  open discrepancy reports and the median time to a disposition; claims-ledger
  coverage (target 100 %).
- **Search and assistants:** impressions and clicks for the developer query
  set (S4); the monthly assistant panel (A8), as the share of answers that are
  correct and the share that cite or call zodiacs.org.

## 10. Owner decisions

1. **Wording:** allow "a drop-in alternative to Swiss Ephemeris for most
   applications" once Phases 2 and 4 pass? Recommended: yes, with its limits
   stated beside it.
2. **The engine's home (R6):** a new `ZodiacsOfficial/engine` repository and a
   documentation home outside `/sdk/`, or a re-described SDK repository?
3. **npm:** confirm control of the `zodiacs` npm account that owns
   `@zodiacs`; decide whether the engine and platform packages share that
   scope with the token SDK `@zodiacs/sdk` or take a scope of their own;
   decide who holds publish rights; do the first manual publish of each new
   name. Reserve `zodiacs` on PyPI and `@zodiacs` on JSR either way.
4. **The share token (R9):** coarsen it or move it out of URLs, and approve the
   corrected privacy wording.
5. **The hosted API:** the free-tier level, whether a paid tier exists (volume
   and service levels only), and the hosting budget.
6. **The site repository (R7):** its license and the README rewrite.
7. **Outside review (optional):** send the external-builder packet that has
   been ready since the MCP release, and approach an astronomer and an
   author of astrology software.
8. **NAIF:** send the derived-coefficient question drafted for version 1's
   M2.2.
9. **Counsel** on the token boundary before any cross-promotion.
10. **Data licenses** for the atlas and the conformance suite.
11. **New locales** for the Vedic and Chinese tools (Hindi, Chinese).

## 11. Report

Version 1's §6 ten parts, plus:

11. Platform and adoption measures against their preregistered baselines.
12. The frontier slices shipped, with their rules and verdicts.
13. Changes to the claims ledger: sentences added, corrected or removed, each
    with its evidence.

Do not call a failed milestone successful by changing its denominator. Do not
declare a universal engine.
