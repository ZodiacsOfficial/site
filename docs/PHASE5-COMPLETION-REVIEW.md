# Phase 5 completion — fresh review pass

Status: review of the exact release candidate, performed 2026-07-27
Reviewer basis: Fable executed this candidate end-to-end under the
owner's 2026-07-27 instruction, and this is the required fresh review
pass against the exact candidate tree — a structured adversarial
self-review with every claim re-verified from the artifacts, not from
memory. It deliberately re-ran every gate rather than trusting earlier
output. The historical independent reviews of the 5B pilot
(`docs/PHASE5-PEOPLE-FABLE-REVIEW.md`) and the 5C boundary
(`docs/PHASE5-PEOPLE-OWNER-RISK-DECISION.md`) remain in force and
unmodified.

## Verdict

**PASS — no open P0 or P1.** Two P2 and three P3 items are recorded as
backlog only. The candidate satisfies the Phase 5 Definition of Done
checks that can be proven before merge; production verification and
IndexNow submission complete the record after the normal release path.

## What was re-verified against the exact tree

1. **Counts and identity.** `src/data/people.json` carries exactly 500
   records, 500 unique slugs and QIDs, 498 `eligible: true` (every
   deceased record), and exactly `rigoberta-menchu` and
   `serena-williams` protected — schema-parsed at build time, pinned by
   the production validator (11,583 checks), the prebuild integrity
   gate, the unit suite, and the browser drive independently.
2. **Living-person protections, all five layers.** Meta robots
   `noindex, nofollow` on both living profiles; `X-Robots-Tag` HTML
   rules; portrait and OG asset `noindex, noimageindex, noarchive`
   header rules retained byte-identical in `vercel.json`; absent from
   sitemap and search index (membership asserted equal to eligibility
   per record, both directions); absent from birthday cross-links and
   related-person rails (drive-asserted).
3. **Sources.** Every accepted fact traces to the cached
   Wikidata/Wikipedia/Commons records with revision ids; the six-rule
   screening excluded 78 candidates with machine-checkable reasons
   (conflicting live dates, Julian Option A, cusp-ambiguity inside the
   24-hour UTC window, month precision, missing coordinates, no
   entity). No astrology site or Astro-Databank was contacted. The
   evidence caps hold (no cached string above 400 characters).
4. **Unknown-time honesty at 500.** All records are unknown-time; the
   25-sample civil-day method is enforced by the validator (day bounds,
   settled-only aggregates, per-record sign-transition naming). 264 of
   500 records carry at least one sign-uncertain placement; every one
   is named in reader-visible copy and counted out of every aggregate.
   No houses, angles, rising, sect, or ten-body claims anywhere
   (validated per record).
5. **Editorial quality.** Original words 332–516 (floor 250);
   substantive statements 12–23 (floor 8); pairwise similarity across
   all 124,750 pairs max **0.3048** — the frozen released pilot pair —
   with every new page ≤ **0.295** after deterministic reseed repair;
   the 0.32 ceiling is unchanged. The sensitive-vocabulary, causal-claim,
   pronoun and score bans hold across all 500 (validator classes).
6. **Selection integrity.** Balance documented in
   `selection-report.json`: signs 39–46; women 216/500 (43.2%,
   pool-limited — recorded honestly, not claimed as 47%); regions at or
   near published minimums (africa 29, easia 34, latam 55, mena 13,
   sasia 39, seasia 7, oceania 8); eras 1593–1983; 37 editorial anchors
   included, 3 anchor skips each with a recorded astrological reason
   (Chopin's genuinely disputed birth date; Lincoln sharing Darwin's
   exact birth day; Davis six days from Monroe under the same-sign gap
   rule).
7. **Independent chart verification.** 20 stratified samples (every
   sign, pilot and expansion) recomputed through
   `src/lib/engine/server-ephemeris.ts` — a separate implementation
   path from the pilot tools — agree with committed positions within
   the two-decimal display bound (0.006°); report committed at
   `docs/phase5/people-pilot/chart-verification.json`.
8. **Portraits.** 450 licence-gated files with rendered credits,
   SHA-256-pinned with thumbnails; 50 recorded no-portrait states
   (licence outside the set, missing deed URL, missing creator,
   creator-is-subject, over-long credit). Deed URLs normalised to
   https; the drive asserts visible credits per route.
9. **Birthday pages.** All 366 remain released and useful; 267 now
   carry People links (max six people on May 12 and April 9), first
   three visible, remainder behind a native details disclosure;
   people-free dates render no empty section (drive-asserted with a
   data-derived empty date). No other birthday change.
10. **Gates, all green on this tree.** `astro check` 0/0; vitest
    1,431/1,431 (192 files); full build with every prebuild/postbuild
    gate (`people-pilot` drift-exact, integrity, portraits, 11,583-check
    validator, `check-dist` 4,271 files, `people-dist` 501 routes exact,
    schema 3,007 docs/0 errors, bundle budgets); browser drive
    **7,570/7,570** across all 501 routes at 360/390/781/1280 with
    no-JS, keyboard, reduced-motion and overflow checks; visual
    regression 15/15; i18n R0 + R2 unchanged; Lighthouse three runs per
    route — `/people/` **100/100/100** (LCP 1.36 s) at 500 entries,
    profiles 98/100/100 (LCP ≤2.34 s), living profile noindex confirmed
    on every run; `git diff --check` clean.

## Findings

**P0 — none.** **P1 — none.**

- **P2-1 (backlog):** the birthday template carries a pre-existing
  0.002 CLS measured on people-free dates too (it was never in the
  strict CLS-0 Lighthouse family); tracked for a separate fix, not
  introduced or worsened by this candidate.
- **P2-2 (backlog):** similarity headroom for future growth is
  governed by the reseed-repair loop; any Phase-5-later expansion must
  re-run `tune-similarity` and re-measure before adding person 501.
- **P3:** current-country anachronism in identity lines (inherited 5A
  design); `Intl`-localised month names in OG cards are English-locale
  pinned but date formats inside copy use en-US ordering (consistent,
  cosmetic); the 30-item accepted-not-selected pool review notes
  (369 remaining candidates) live only in the research files.

## Boundary confirmations

No Registry or Collection source changed. No Phase 1–4 behavior
changed (full suite + visual regression + i18n gates prove it; the
phase-1 screenshot refresh is the documented dependency-change
recapture, receipt-pinned). No localized People routes. Living-person
indexing is not enabled anywhere, and `index-policy.json` records the
owner's completion authorization with the living boundary restated.
The similarity ceiling was not raised. The one generated-asset ceiling
change (OG v2, 15 → 25 MB) is documented in PLAN.md and costs no
page-bundle bytes.
