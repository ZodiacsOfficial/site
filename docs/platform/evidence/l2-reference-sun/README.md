# L2 — bounded unknown-time reference-Sun interpretation

Starting main: `0490c4f8a92f045417d7f81ed502f0789e8ecdc2`.
Branch: `codex/l2-reference-sun`. Draft/head, final required checks and exact-source
preview results will be recorded at closeout. No merge or deployment is authorized.

L1 was freshly confirmed merged at `307c832e662e1996ee904f11fb1678e402808a03`;
post-merge Site Check 34756055748 passed all 14 jobs. Current READY production
`dpl_DRnrXu34g9od11bzmgoYCb368QYr` serves main0490c4f8, a Registry snapshot descendant
with unchanged L1 runtime. The retained [production evidence](../l1-production/README.md)
is reused; no broad release audit or numerical rerun was needed before L2.

## Bounded behavior

Unknown-time charts retain their existing reference numerical positions and receipts.
Their Sun sign no longer automatically selects post-chart email preferences or saved-chart
Today/email baselines, nor personalizes Profile solar ingress copy. Replacing a known-time
chart clears its stale inferred sign selection. Manual Sun preferences remain available.
New automatic unknown-time chart names are neutral; existing stored/custom names remain.
Chart, Today, Profile and email interpretations explicitly state that the reference Sun
sign has not been verified across the entire birth date, including saved forecast text.
Known-time paths retain their prior behavior.

No engine, astronomy math, receipt serialization, storage schema, SDK pin, global
navigation/styles or canonical Registry source change is included. Complete-date intervals
remain inactive until provider completeness, runtime support and skipped/repeated-date
policy are established. [Retained counterexamples](../reference-confidence/independent-preparation/REVIEW.md)
refute endpoint whole-day completeness; they do not demonstrate a false Sun sign.

## Verification in progress

- Root focused suites: 56 tests passed, including the new 13-test reference-Sun suite; consumer suites: 46 tests passed.
- Required audit gates pass: production 0 advisories; all dependencies 0 high/critical.
  Fresh npm report contains two inherited moderate development-only findings in Vitest/
  mocker (GHSA-82fw-gwwq-j7x9). No lockfile change or major runner upgrade is bundled.
- Initial browser fixture attempt stopped before running because sandbox denied loopback
  listen (EPERM); authorized local browser execution followed. Final fixture: 23 groups passed.
- Corrected product build and typecheck pass (0 errors/warnings, 11 existing hints).
  Today browser acceptance passes; native chart confidence/parity passes 20 groups,
  with actual current-main overlay comparisons of native chart, envelope, download and
  positions token bytes. All six locales render with the new notice.
- Full local suite ran 5,145 tests: 5,137 passed and 8 failed only because the two new
  keys invalidated exact 420-key assertions. Those three test files now require 422
  keys while preserving key/interpolation parity and caption-retirement assertions;
  all 52 tests in the corrected files pass. Unchanged successful evidence is reused.
  Final build and 18/18 required captures pass; hosted full CI follows on the draft.
- Newly saved forecast text intentionally gains uncertainty wording. Calculation receipt
  bytes and contact receipt strings remain unchanged; whole forecast byte equality is
  not claimed. [Preserved sources](preserved-sources.json),
  [native parity](reference-browser-summary.json), [review and fixed failure](review.md).
- Hosted checks and protected exact-source preview not yet claimed.

SDK merge/npm hold, Astrofolio/Zodia exclusions and L3–L6 boundary remain intact.
