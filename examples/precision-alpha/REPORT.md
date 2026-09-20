# Precision alpha — final report

2026-09-20. Branch `claude/eager-ramanujan-razak3`.

One usable experimental implementation that combines the compact ephemeris
pack, the improved reduction, explicit numerical-quality and coverage
information, bounded event searching, and real browser and Node execution.
It is an alpha: it does not replace the production engine, is not wired into
the site, and no pack is distributed with it.

Ten points, in the order asked.

---

## 1 · What was built, and where

`examples/precision-alpha/` — about 1,900 lines of source plus 133 tests.

```
src/core/     environment-neutral: no node:*, no Buffer, no require, no clock
  errors.mjs          17 typed codes, one error class
  source.mjs          the byte-source contract both loaders implement
  container.mjs       parse, validate, and the integrity POLICY
  ephemeris.mjs       Chebyshev, analytic derivative in the same pass
  nutation*.mjs       IAU 2000B from the published 77-term series
  frames.mjs          bias, IAU 2006 precession, nutation as explicit matrices
  reduce.mjs          the apparent-place reduction — one copy
  interval-search.mjs the bounded typed-verdict search, copied unchanged
  search.mjs          longitude events over the reduction
src/index.mjs   open, calculate, search, dispose
src/browser.mjs fetch / Response / Blob
src/node.mjs    whole-file load, or file-backed low-memory load
tools/          the pack sealer, the SPK measurement backend, the harness
test/tier-a/    125 tests, no data of any kind
test/tier-b/    8 tests, real data by explicit path, loud failure without it
```

The measurement lives with the research it extends:
`docs/platform/evidence/precision-2026-09-20/FOUR-CONFIGURATIONS.md`,
`search/MOON-2-VS-13.md`, and the wired demonstration in `demo/`.

`ACCEPTANCE.md` is the twenty-item checklist, frozen before implementation
and now carrying a verdict per item.

## 2 · The runtime: one core, two environments

The inspected prototype used the earlier reduction conventions, imported
`node:fs` and `node:crypto` at module scope, and relied on `Buffer` even on
its ArrayBuffer path. That is gone. What replaces it:

- **A. An environment-neutral numerical core.** Every module under
  `src/core/` is checked by test for `node:` imports, `require`, `Buffer`,
  `process.`, `import.meta`, a wall clock, randomness and `fetch`. The
  browser bundle build fails if any of those survive into the output.
- **B. Browser loading and verification.** `src/browser.mjs` takes a URL, a
  `Response` or a `Blob`. No filesystem shim, no `Buffer` polyfill, no
  fallback. `crypto.subtle` is exposed only on a secure context, and when it
  is missing the failure says exactly that instead of degrading.
- **C. Optional Node file-backed loading.** `openPackFileStream` holds one
  descriptor and reads one record at a time. For a ten-body chart it is
  indistinguishable from the resident path at the median (0.0834 against
  0.0832 ms per chart, p50 of 400 interleaved pairs on this machine) with a
  longer tail (p95 0.136 against 0.116). Walking one body through time, where
  almost every call misses the record cache, it costs noticeably more.
- **D. Shared reduction and search.** There is no second copy of the physics.
  `reduce.mjs` runs over both backends; the four-configuration measurement
  uses the same file for all four cells.

The reduction was ported from the research track and checked **bit-identical**
to it over 400 epochs × 10 bodies. IAU 2000A is not carried: measured, it
moves apparent longitude by at most 0.0025″ for seventeen times the table.

**Contract.** Ten bodies; apparent geocentric ecliptic longitude and latitude
of date plus geometric distance in km; the backend's analytic state derivative
in km/s and no apparent angular rate; TDB−TT, light-time iteration, solar
deflection, relativistic aberration, IAU 2000 frame bias, IAU 2006 precession,
IAU 2000B nutation. Not modelled: ΔT, anything topocentric, refraction,
deflection by anything but the Sun, and **barycentric position** (see §4).
For Mars outward the kernel has no body centre, so what is returned is the
planetary-system barycentre and every result says so.

**Licences.** `NOTICE.md`. The 77 nutation coefficients come from ERFA,
BSD-3-Clause, derived with permission from IAU SOFA; `LICENSE-erfa` is the
required notice and `SERIES_PROVENANCE` carries it at runtime. No JPL kernel,
no pack and nothing from Swiss Ephemeris is committed.

## 3 · The pack, treated as untrusted input

**Three things, never conflated.** Structural validity (`parseContainer`,
synchronous, allocating nothing from an unchecked number); integrity (a
digest); and authenticity — which this package **does not establish** and says
so in those words on every result. A digest stored inside the artifact proves
only self-consistency. `expectDigest`, obtained out of band, is the only input
that gets closer.

`ZODEPH01` hashed the payload only, leaving `intervalSec`, coverage, EMRAT and
every scale factor covered by nothing — an `intervalSec` edit moved the Moon by
5.7·10⁵ km and verified clean. **`ZODEPH02`** appends a SHA-256 over
everything before it. v1 packs are refused by name; `tools/seal.mjs` converts
one without touching a coefficient.

Checked, each with a hostile fixture of a few kilobytes: magic; version; file
and header size caps; finite, non-negative, safe-integer counts and offsets;
overflow-guarded extents; supported encodings and field widths; unique body
names and valid dependencies; monotonic coverage; record extents, overlaps,
truncation and trailing data; finite constants and plausible EMRAT. A header
claiming twenty million records is refused **on the claim** — heap growth
during the refusal is asserted under 64 MB and no fixture exceeds 8 kB.

There is **no skip-verification path**, and a test greps the package for one.
Verified in-memory bytes are copied, so a caller rewriting its buffer cannot
reach the runtime; the file-backed source re-checks a stat fingerprint on
every read and fails `mutated` when the artifact changes underneath it. Every
failure is a typed `PrecisionError`, names no absolute path, and leaks no
descriptor — twenty failed opens are asserted to leak none.

## 4 · The integrated measurement

Four configurations on identical instants, bodies, clock and conventions,
through one reduction module: **A** kernel + prototype reduction, **B**
kernel + corrected, **C** pack + prototype, **D** pack + corrected. Swiss
Ephemeris is the instrument, its own ΔT drives both sides, and every call's
return flag is checked so a Moshier fallback cannot pass as Swiss.

Full write-up: `FOUR-CONFIGURATIONS.md`, generated from the measurement's own
JSON rather than transcribed.

**The harness reproduces the recorded figures exactly.** On the pinned
16-case corpus, all ten bodies: A = 0.134444″ max, B = 0.010730″ max, against
recorded 0.134444″ and 0.010730″.

**They compose.** |(D−A) − ((C−A) + (B−A))| is at most **2.7·10⁻⁸″** on the
corpus and **7.6·10⁻⁶″** over the full sweep, against effects of 0.134″ and
0.0012″. Signed differences inside, so cancellation could not pass as
agreement. The separate headlines may be added — now measured, not assumed.

| | corpus (160 body-epochs) | full sweep (29,460) |
| --- | --- | --- |
| compression alone (A↔C), max | 0.001164″ | 0.004946″ |
| reduction alone (A↔B), max | 0.134420″ | 3.229904″ |
| D vs Swiss, four true centres, max | 0.010666″ | 0.167757″ |
| D vs Swiss, four true centres, p50 | 0.000483″ | 0.000630″ |

- **0.05″ incremental-compression target: met**, separately, against the
  uncompressed prototype on the same reduction.
- **0.5″ matched-convention target: met** by the integrated build.
- **The 0.0107″ figure does not survive the broader test.** It is a property
  of sixteen epochs. Over the whole effective coverage it is **0.168″**, about
  16× larger. The broader number is the one to quote.
- Coverage is stated exactly: −4,734,043,200 to 4,735,339,200 s TDB, inset by
  28,800 s for light-time lookback and the derivative step.
- Position and derivative are separate tables. The six system barycentres are
  never folded into a headline against Swiss, because that offset is a
  definition difference and not an error of this reduction.
- **Barycentric Moon: the 0.2 km target is still missed.** Recorded: 0.165 km
  sampled, **0.449 km proven**, and the target is on the bound. This run
  re-measures the sample at 0.164 km, which corroborates the sample and
  establishes nothing about the bound. Barycentric position is therefore
  **excluded from the alpha's contract**, with the failed target preserved.
  Earth and Moon come from the same two stored bodies through EMRAT, so their
  errors are correlated and no geocentric bound is built by adding them as if
  they were not.

Swiss and DE440s both descend from JPL development ephemerides. Agreement
between them is **consistency, not accuracy**, and nothing here is evidence of
superior physical astronomy.

## 5 · Search semantics

A result reports six things and never merges them: `candidates` (with
brackets, not bare instants), `interval` processed, `isolation`,
`robustness`, `unresolved`, and `externalUncertainty` — which is explicitly
**not bounded** and not folded into epsilon.

`support` is `'empirical'` for anything ephemeris-backed: ordinary
floating-point evaluation of a Chebyshev sum is not interval arithmetic, so
completeness holds *given* declared derivative bounds that were sampled and
inflated, and the sampled maxima, the grid and the inflation factor ride on
the result. `exactArithmetic` is never set, which permanently closes tangency
certification to ephemeris-backed functions. A certified verdict with a
non-empty `unresolved` cannot be produced.

`epsilonDeg` has **no default**. Choosing the allowance after seeing the
margin is the move the Uranus D contract forbids, so the search will not
choose it for the caller.

The bounded search itself is the research track's, copied unchanged and
re-run here against its thirteen closed-form cases.

**The original Uranus D contract is unchanged.** No tracked file under
`search/` was modified and `reproduce.mjs` still concludes it remains
failed-incomplete.

**The Moon "two versus thirteen" concern reproduces.** The record said it did
not and declined to call it a defect. With the exact case — Moon, 100°, 2019,
longitudes from the shipped engine — and `buildLevelProblem`'s own defaults,
the search returns `certified, complete, rootCount 2` where the truth is 13,
at **every** allowance from 1e-9 to 0.5, which is why varying ε alone would
not have found it. The mechanism is reproduced at cell level: 16 of 18 cells
are closed by the exclusion test and 11 of the 13 crossings are inside them,
because the mean-value value-enclosure is applied to a wrapped angle that
jumps a full turn thirteen times in the window. The defect is in the harness,
not in `classifyInterval`, which returns the right 27 on the continuous
`sin` form. This package returns **13**: it splits at every antipode crossing
and shows each gap root-free before passing over it. `search/MOON-2-VS-13.md`,
and the record is corrected.

## 6 · The browser demonstration

`demo/precision-runtime.mjs` was a seam that threw. It is now an esbuild
bundle (85,682 bytes) of the real core, and the build fails if a `node:`
import, a `require`, a `Buffer` or a `process.` reference survives.

`drive-alpha.mjs` requires `--pack` and will not guess a path from an earlier
session. A valid pack is loaded and shown to produce a real answer **before**
any date or coverage failure is tried.

| | Chromium 141.0.7390.37 | Firefox 151.0 | WebKit |
| --- | --- | --- | --- |
| verdict | pass | pass | attempted, not run |
| rows bit-identical to Node | 70/70 | 70/70 | — |
| search verdict matches Node | yes | yes | — |
| click accepted mid-run | 37 ms | 66 ms | — |
| off-origin requests | 0 | 0 | — |
| anything persisted | no | no | — |

WebKit: `playwright-core` is installed but no WebKit build is in this
environment. That is the one acceptance item this environment cannot decide,
and it is recorded rather than dropped.

Seven request failures each with their own code, and five broken packs each
refused for its own reason with none leaving the previous pack quietly in
use; recovery after a bad pack and after a reload; a superseded reply dropped
rather than painted, measured by counting DOM writes with both clicks issued
in one synchronous task — driving them as two Playwright actions never races,
because the round trip is longer than a comparison takes.

**One thing the browsers disagreed about.** The first Firefox run failed: 27
of 70 rows differed in apparent **latitude** by up to three ulps, while
longitude and distance matched exactly. `Math.hypot` was the cause — IEEE-754
requires `sqrt` to be correctly rounded and ECMAScript inherits that, but
neither requires it of `hypot`, and V8 and SpiderMonkey differ. The core now
uses `sqrt(x*x + y*y)`, safe at kilometre magnitudes, and a test keeps
`Math.hypot` out. `atan2`, `sin` and `cos` remain implementation-defined;
they agreed on everything measured and nothing claims more than that.

## 7 · The two test tiers

**Tier A — 125 tests, no data at all.** No kernel, no committed pack, no
network. Every evaluator fact is checked against a polynomial the fixtures
write down; every refusal against a hostile header of a few kilobytes. It
includes the thirteen closed-form search cases, re-run against this package's
copy so the copy cannot drift from the original.

**Tier B — 8 tests, real data by explicit path.** `PRECISION_PACK` and
`PRECISION_KERNEL`. No default, no search of likely locations, **no skip**:
with nothing set it exits 1 and says nothing below was tested; with a pack but
no kernel it still exits 1, because the kernel comparison is part of the tier.
With both set it passes 8 of 8, including the resident and file-backed loaders
agreeing bit for bit, the March 2024 equinox, and all thirteen 2024 new moons.

Timing and environment-bearing reports do **not** regenerate byte-identically
just because the coefficient compiler does, and nothing here promises that.

## 8 · Packaging, and what was not changed

`@zodiacs/precision-alpha` 0.0.0-alpha.1, `private: true`, MIT, ESM, Node ≥ 22,
zero dependencies. Its result objects are its own; no receipt schema is
reused for outputs with different backend or convention semantics.

Not changed, and not authorized by this task: the production calculation
model, saved-record flags, connectors, public API behaviour, Registry facts,
token features, existing chart results, the separate shared-sky connector, or
any site surface. No pack was published and no external legal enquiry was
sent. The site's own gates are green: build, `check`, `npm test` 5605/5605,
`check-dist`.

Two things deliberately left for the owner:

- The 2026-09-20 compiler stamps `licence: "US Government work, public
  domain (JPL/Caltech-NASA)"` into every pack header. `RIGHTS.md` corrects
  that claim against NAIF's own rules. The generator was not re-run, because
  that would move every recorded pack digest in the frozen evidence; the
  correction is recorded in `NOTICE.md` instead.
- `RIGHTS.md` says Swiss output is used as a measurement and is "never
  redistributed", but `numerics/raw/t1-swiss.json`, `numerics/verify/t1-swiss.json`
  and `numerics/verify/v1-swiss.json` are tracked in git. This work did not
  add to that: the new measurement commits statistics only, with the bulk
  per-instant Swiss values ignored. Whether the existing files should stay is
  an owner decision, not one to make silently in either direction.

## 9 · AI review, and what is not claimed

Every review, verification and adversarial check in this work was performed
by an AI agent — me — or by the automated harnesses described above. **No
human reviewer read this, no independent party certified it, and no external
party has adopted or tested it.** Where this report says a figure reproduces
a recorded one, that means two AI-run harnesses agree, which is a check on
the harness and not on the astronomy.

No claim of superior physical astronomy is made anywhere. The comparisons are
consistency between implementations that share JPL lineage.

## 10 · The recording

`docs/platform/evidence/precision-2026-09-20/raw/demo-recording/vertical-path.webm`
— 32.4 s, 1280×900, 2,635,062 bytes, SHA-256
`3e94ea98a66081c9be13db0b40ef06854a10be6c618a887276a97fd572ec7bde`.

Playwright's own capture of a real Chromium session, not a reconstruction.
It runs the complete vertical path in order: a clean page refusing precision
output with no pack; a pack loaded from disk and verified; the same instant
through both backends with per-body arcsecond differences; a bounded search
returning `crossing, certified, count 1, support "empirical"` at
2024-03-20T03:07:33.394Z; each refusal for its own reason; a cancellation
mid-run; a corrupted pack refused without leaving the old one in use; a good
pack afterwards working again; and dispose, after which the runtime refuses.

The script is `demo/record.mjs`. It exits non-zero and says so if capture is
unavailable, rather than writing a file that is not a recording.
