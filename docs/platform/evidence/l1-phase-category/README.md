# L1 / C-017 — full-result phase-name consistency

Bounded owner authorization: complete L1 only; no L2–L6, SDK publication-status
change, merge or production deployment. Starting main is the released site
f592d5143f52851b8f47be17e43fbf9fd5be8b8f (approved #471 tree unchanged).
The automatic post-merge Site Check run 34744052278 was inspected first: all
13 parallel jobs passed; Build & Check was still running without a failure.
It subsequently completed successfully: all 14 jobs pass, including visual,
Lighthouse and widget gates. No release regression was reported.

Retained C-017 preparation directories were inspected under
/private/tmp/zodiacs-platform-phase-category*. Their named source/delivery
folders are empty; no preserved patch or independent-review result is claimed.
The durable L1 mandate in REMAINING.md preserves the intended category and
floating-point constraint. This implementation reconstructs that bounded slice.

## Change and correctness boundary

Extract the existing eight 45-degree UI categories without changing thresholds.
moonPhaseName(Date) still uses the identical lite angle and those same comparisons.
The new moonPhaseNameFromAngle takes an already normalized retained angle and
performs no normalization, rounding, ephemeris call or mutation.

MoonPhaseTool names the existing full lookup angle, retaining its exact angle,
longitude, illumination and caption. ChartCalculator Moon mode names the retained
Sun/Moon positions, normalizing their difference once. Missing bodies produce no
label. Chart calculation, persistence, receipts, engine artifact/pins, translations,
lite/live callers and numerical formulas are unchanged.

A second normalization is observably unsafe: the representable double immediately
below 22.5 becomes 22.5 after ((angle % 360) + 360) % 360. Tests exercise adjacent
doubles on both sides of all eight boundaries, exact thresholds and wraparound.
A real witness at 2024-01-16T10:18:00Z retains full angle 67.50700818137483 and
Moon longitude 3.2722751872874483. Full label becomes First Quarter while lite's
Waxing Crescent remains unchanged. Category boundaries are the existing UI policy,
not a claim that a category name identifies an exact astronomical quarter instant.

## Verification plan and captured local results

- Focused final tests: 66 pass, including caller execution, boundary behavior,
  reference handling, chart/receipt byte preservation and retained-chart naming.
- Lite preservation: 512 deterministic instants; every existing exported lite
  function agrees with main under Object.is. This finite parity check complements
  the unchanged arithmetic and recorded lite/live witnesses.
- Full npm test, required build/typecheck, dist/bundle gates, hosted Site Check and
  exact-source preview are required before delivery; their final results are
  recorded in the draft description and integrator's durable closeout evidence.
- Reuse valid R3/release evidence for unchanged engine artifacts, SDK hold,
  immutable receipts and unrelated behavior. No new broad audit or budget waiver.

Implemented and under verification; not merged or deployed. Preview is not
production. SDK merge/npm publication remains held; Astrofolio and Zodia excluded.

## Required evidence refresh

The changed render inputs correctly invalidate the prior Phase 1 receipt. The
unchanged repository acceptance driver regenerated all 18 captures at exact
360/1280 widths; all pass, with template source SHA-256
91ee09cc0087cd6f7617863509f20d80d7af7386edcdbc4460bedb2099c6f62c. Five images
remain byte-identical. This updates acceptance evidence, not visual-regression
baselines or budgets. Representative mobile Today and desktop monthly captures
were inspected; existing layout and typography are retained.

The first complete local retry passed 419 suites but exposed the correctly stale
receipt and two astronomy imports resolving through a reused external node_modules
symlink. A clean installation from the unchanged lockfile replaces that symlink.
The final complete run follows the finished build and receipt refresh, with two
workers and unchanged assertions/timeouts. Hosted result remains pending.
