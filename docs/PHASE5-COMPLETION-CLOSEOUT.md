# Phase 5 completion — formal closeout

Status: **Phase 5 is complete.** This record contains the release
evidence for the full People-and-Birthdays Definition of Done.

## Release identity

- Candidate branch: `fable/phase5-completion`
- Pull request: `#169`
- Merge commit: `0650c89c0706b24de4eb5ffcfe96b5faf63ea472`
- Merged (UTC): `2026-07-27T01:44:48Z`
- Production deployment: `dpl_5VcndSejYmhhWLLLRWwKRzoFV8iH`
  (`https://zodiacs-ki8kh3qa4-zodiacsofficial.vercel.app`), created
  `2026-07-27T01:44:53Z`, status Ready, aliased to `zodiacs.org`
- Post-merge Site Check: run `30230522293`, **success**, all jobs green
- Owner authorization: instruction of 2026-07-27 (deceased profiles and
  qualifying directory pages may index once all gates pass; living
  profiles excluded), recorded in
  `docs/phase5/people-pilot/index-policy.json`

## Definition of Done, item by item

| DoD item | Evidence |
| --- | --- |
| 500 reviewed People profiles | `src/data/people.json` carries exactly 500 schema-validated records; 11,583-check validator green; drive swept all 501 routes |
| 366 Birthday pages | All released pages unchanged in substance; 267 dates carry capped People links with a native details disclosure past three; people-free dates render no section |
| Provenance and data-quality labels on every profile | Every page carries the sourced-date/unknown-time label, uncertain placements named, evidence disclosure with revision ids, correction route |
| Schema/sitemap/search complete for eligible pages | Live sitemap: 498 profile rows + the directory row, zero living; live search index: 498 profiles + directory, zero living; JSON-LD site-wide 3,007 documents, 0 errors |
| ≥20 verified chart samples | 20 stratified samples recomputed through `server-ephemeris.ts` within the 2-dp bound (`docs/phase5/people-pilot/chart-verification.json`) |
| No thin indexed pages | 332–516 original words, 12–23 substantive statements per page; max pairwise similarity 0.3048 over 124,750 pairs under the unchanged 0.32 ceiling (every new page ≤0.295) |
| No open P0/P1 | Fresh review pass `docs/PHASE5-COMPLETION-REVIEW.md`: none; two P2 and three P3 recorded as backlog |

## Production verification (2026-07-27, post-cutover)

- `/people/` → 200, robots `max-image-preview:large` (indexable), no
  X-Robots noindex header, renders “500 people. All birth times
  unknown.”
- `/people/marie-curie/` → 200, indexable robots, visible Wikimedia
  Commons credit, data-quality label present.
- `/people/rigoberta-menchu/` → 200 with meta
  `noindex, nofollow, max-image-preview:large` **and**
  `x-robots-tag: noindex, nofollow, noarchive`; portrait asset serves
  `x-robots-tag: noindex, noimageindex, noarchive`; deceased assets
  carry no such header. Serena Williams identical by rule.
- Live sitemap: 3,011 locs; 498 people profiles + `/people/`; no living
  slug. Live search index: 499 people entries; no living slug.
- `/birthday/may-12/` shows “People born on this date” with the
  “3 more born this day” disclosure.
- Phase 1–4 spot checks all 200: `/today/`, `/horoscopes/aries/`,
  `/compatibility/`, `/registry/`, `/birth-chart/`.

## Discovery submission

- IndexNow: HTTP 200 for 764 URLs — 498 profiles, 264 birthday pages
  with People links, `/people/`, and `/sitemap.xml` — using the
  repository’s published key, 2026-07-27.

## Gates on the exact release SHA (pre-merge)

`astro check` 0 errors/0 warnings · vitest 1,431/1,431 (192 files) ·
full build with `people-pilot` drift-exact, portrait manifest exact,
11,583-check validator, `check-dist` 4,271 files, `people-dist` 501
routes exact-membership, schema 3,007/0, bundle budgets ·
`test:phase5:people` 7,570/7,570 assertions (all 501 routes; no-JS,
keyboard, reduced-motion, 360/390/781/1280 overflow) · visual
regression 15/15 · i18n R0 + R2 · Lighthouse three runs per route:
`/people/` **100/100/100** (LCP 1.36 s) at 500 entries,
`/people/ada-lovelace/` and `/people/marie-curie/` 98/100/100, living
profile noindex confirmed in every run · `git diff --check` clean ·
Phase 1 scope guard: protected Registry scope untouched. PR CI: all
jobs green (the Phase 4 sharing drive passed on its documented rerun;
the same suite passes 43/43 locally on the release tree).

## Boundaries kept

Registry and Collection sources byte-identical (scope guard).
Phase 1–4 behavior unchanged (full suites). No localized People
routes. Living-person indexing remains excluded pending a separate
person-specific owner authorization. The production lockfile, daily
provenance manifest, and Phase 1 screenshot evidence are byte-identical
to the pre-release main. The 0.32 similarity ceiling is unchanged; the
only ceiling change is the documented OG v2 asset budget (15 → 25 MB).

## Post-release operations

- The correction route `people@zodiacs.org` remains monitored; the
  noindex/410 removal procedures in
  `docs/phase5/people-pilot/corrections/README.md` remain authoritative.
- Any expansion past 500 requires a new balanced-selection pass, a
  fresh similarity measurement, and the standing source rules. Nothing
  is scheduled.
