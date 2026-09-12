# R1/R2 bounded maintenance

2026-09-12. R1/R2 complete for draft review; not merged, published or production-deployed. Base C-016
`9912e37bee3f20de691b6bed8165ff36189d1eca`; prior closeout records `062da26`.

## Scope and decisions

- Reuse the exact preserved minimum lockfile: Astro 7.2.8, Sharp 0.35.4,
  js-yaml 4.3.2, smol-toml 1.7.1 and SVGO 4.1.0, with their required transitive
  dependencies. Package declarations and engine pin remain unchanged; no overrides.
- Use approved generators for September 12 Daily Sky/horoscopes and paired
  Registry outlook/research/sign HTML. The public provider returned 12/12 indexed
  pools at 10:27:07.897 UTC. All 31 prior market snapshots remain byte-equivalent
  as parsed records. Canonical Registry and approval sources are unchanged.
- Make research behavioral fixtures independent of live provider availability
  and the production pilot end date. Preserve the real committed-input test.
  Assert empty pilot publication as well as feed, changed market prose with
  unchanged sky evidence, stale approval rejection, immutable replay despite a
  provably changed candidate, and first qualifying observation despite a later
  conflicting snapshot. No production research logic changes.
- The current edition also exposed the horoscope same-sign test's reliance on
  today's Venus. Explicitly set that condition in a cloned fixture; retain copy
  distinctness verification and consistent sign/longitude.
- Thirteen exact protected paths: twelve generated Registry sign pages plus the
  research test. One-time scope allowance is pinned to C-016. Guard unchanged.

## Verification and evidence reuse

Both unchanged audit gates pass: zero production findings; zero full-tree high
or critical findings (two existing development-only moderate Vitest findings).
The first corrected build and typecheck pass (1,047 files, zero errors/warnings,
11 hints). All 33 frozen caption source/test files match prior accepted hashes.
The numerical, ownership and receipt evidence remains bounded and reusable.
Compiler/image dependencies and changed edition invalidate build/render evidence,
so captures, required CI and an exact-head preview must be completed anew.

The first full-suite run overlapped the build and is not acceptance evidence:
three failures read unfinished output, one correctly rejected the stale capture
receipt, and one exposed the horoscope fixture. Original logs are retained. The
first capture attempt correctly refused a build receipt invalidated by that test
edit; it never launched a browser. A final build and fresh captures are required.

Historical C-016 performance/advisory failures remain in
[the original records](../reference-captions/release-blockers/REVIEW.md). No budget,
freshness, audit, immutable-item or approval gate is relaxed. Hosted outcomes
will be recorded here against the delivered source. SDK #5 remains explicitly
do-not-merge/do-not-publish at cced0116 on the fresh September 12 read.

## Final local acceptance

Final build passes unchanged integrity/schema/bundle budgets. All 5,091 tests
in 420 files pass against completed output. Eighteen fresh 360/1280px captures
pass on Chrome 152.0.7977.84; current render receipt is
`f59fed583e24c81abde15f9fc040d3dd69599f2eda1a1e880c4dbbfca273a717`.
Root inspected the Today mobile and Love desktop captures. Their complete
files and manifest are in `docs/acceptance/phase1/screenshots/`.
The 51 affected tests pass, and exact-base scope verification covers precisely
the thirteen authorized protected paths. No test or policy assertion was removed.
Raw local successes and initial invalidated failures are archived with member
hashes in `local-verification.tar.gz` / `local-members.json`.

## Hosted closeout

Draft [#469](https://github.com/ZodiacsOfficial/site/pull/469) is frozen at
`35301d24907b6eb7117a1f4b0ae690ca42c57de6`, with all 110 actual PR files
matching local Git blobs (40 non-documentation files). All 14 required hosted
jobs pass in [run 34688849189](https://github.com/ZodiacsOfficial/site/actions/runs/34688849189),
including unchanged visual, 30-route worst-of-three Lighthouse, foreign-origin
widget and three widget Lighthouse gates. [Hosted CI records](hosted-ci/README.md).

The exact READY [preview](https://zodiacs-dafnwih1r-zodiacsofficial.vercel.app)
passes 22 view groups, 36 screenshots and five committed/served Registry
artifact comparisons. All 73 source identities remain equal.
[Preview records and qualifications](hosted-preview/README.md).

R1 and R2 have no remaining maintenance blocker. R3 and L1–L6 were not started.
Owner/human/SDK publication gates remain; no merge, npm publication, production
deployment, outreach, spending or adoption is claimed. Final closeout documents
are retained locally and mirrored to the shared workspace, separately from the
frozen green draft, to reuse valid source evidence without a documentation-only
CI replay. The remote PR description records the completed hosted outcome.
