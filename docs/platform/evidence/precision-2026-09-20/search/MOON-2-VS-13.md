# The Moon "two versus thirteen crossings" concern: reproduced

Generated alongside `search/raw/moon-2-vs-13.json` by
`search/verify/moon-2-vs-13.mjs`. Every figure is read out of that file.

The record in [`README.md`](README.md) said this concern was **not
reproduced**: a verifier reported the bounded search returning
`certified, complete, rootCount 2` on a Moon case whose truth is 13
crossings; the integrator ran the same call, got
`unresolved-interval / refused`, and declined to record a defect because
the parameterisation had not been identified.

**It reproduces, at the harness's own default parameters, at every allowance
tried.** This document replaces the "not reproduced" line with the exact
comparison the instruction asked for.

## The case

| | |
| --- | --- |
| body | Moon |
| target | 100° |
| window | 2019-01-01T00:00:00Z .. 2020-01-01T00:00:00Z |
| longitudes from | @zodiacs/engine/internal bodyLongitude, engine-native Delta-T |
| named in | docs/platform/evidence/precision-2026-09-20/README.md line 78, and search/verify/moon-mechanism.mjs |

## The truth

13 crossings. Established by dense scan at two step sizes —
one hour gives 13, ten minutes gives 13, and they agree —
then bisected. A sign change with both ends beyond a quarter turn is the
±180° wrap and is not counted as a root.

## What the recorded harness returns

`buildLevelProblem` with its own defaults ({"hMs":600000,"safetyFactor":10,"samples":400,"slopeGridSpacingMs":86400000,"slopeGridMaxSamples":5,"curvatureGridSpacingMs":86400000,"curvatureGridMaxSamples":64}):

| ε | verdict | outcome | certified | count | truth | open regions |
| --- | --- | --- | --- | --- | --- | --- |
| 1e-9 | multiple-crossings | certified | true | **2** | 13 | 0 |
| 1e-7 | multiple-crossings | certified | true | **2** | 13 | 0 |
| 0.000001 | multiple-crossings | certified | true | **2** | 13 | 0 |
| 0.00001 | multiple-crossings | certified | true | **2** | 13 | 0 |
| 0.0001 | multiple-crossings | certified | true | **2** | 13 | 0 |
| 0.001 | multiple-crossings | certified | true | **2** | 13 | 0 |
| 0.01 | multiple-crossings | certified | true | **2** | 13 | 0 |
| 0.05 | multiple-crossings | certified | true | **2** | 13 | 0 |
| 0.5 | multiple-crossings | certified | true | **2** | 13 | 0 |

A certified, complete count of 2 where there are 13, at every allowance from
1e-9 to 0.5. It is not sensitive to ε, which is why the earlier
attempt to find "the parameterisation that produces it" by varying the
allowance would not have found it.

## Why it happens

The value enclosure is a MEAN-VALUE enclosure: it assumes f is differentiable across the cell with a derivative inside the declared range. The wrapped circular difference is not -- it jumps by 360 degrees at the antipode, thirteen times in this window. The derivative enclosure is sampled with a 600 s central difference at up to five points in a cell, so it almost never lands on a jump and reports a plausible finite range; the mean-value enclosure built from that range then proves the level is missed over a three-week window that contains a crossing.

The library's own cell decomposition, repeated here with the same tests and
the same enclosures, produces **18 cells**: {"excluded":16,"monotone":2}.

- **11 of the 13 crossings sit inside cells the EXCLUSION test closed.**
- 0 sit inside monotone cells whose end values agree.

One of them, verbatim:

| | |
| --- | --- |
| closed as | excluded |
| window | 2019-01-01T00:00:00.000Z .. 2019-01-23T19:30:00.000Z (22.81 days) |
| value enclosure | [66.892, 115.561] — entirely clear of the level, so "no root, whatever happens inside" |
| derivative enclosure | [-2.432, 29.287] °/day |
| end values | 122.370, 60.083 |
| ±180° wraps inside | 1 |
| true crossings inside | 2019-01-19T19:59:17.068Z |

The mean-value enclosure is only an enclosure of a function that is
differentiable across the cell. This one is not: it jumps by a full turn
inside that three-week window, and the 600-second central difference sampled
at up to five points never lands on the jump.

## Whose defect

Not classifyInterval. Its header states plainly that an empirical enclosure "holds only if the declared bounds hold"; given a real enclosure it is correct, which the sin() row above shows by getting 27. The defect is in the harness: buildLevelProblem hands it a discontinuous function together with a derivative bound measured as if the function were smooth, and nothing in between checks that.

The continuous formulation confirms it. `sin(lon − target)` has the same
target crossings plus the antipode ones, and through the same library it
returns **`multiple-crossings` / `certified`, count 27** —
13 target crossings plus 14 antipode crossings, which is right.

## What the alpha does on the same question

`examples/precision-alpha` splits the interval at every antipode crossing
and shows each split gap to be root-free before passing over it, then merges
the per-branch verdicts, certifying the whole only if every part is certified
and every gap was shown root-free. On this case it returns
**`multiple-crossings` / `certified`, count 13**, matching the truth: true.
It split at 14 antipode gaps, all shown root-free, with 0 unresolved
intervals, in 8675 evaluations.

The backend and clock differ from the recorded harness — the alpha reads the
compact pack and takes TT directly — so the instants are not expected to
agree to the millisecond. The COUNT is the comparison, and empirical is the
support it claims for it.

## Standing

- The original Uranus D contract is **unchanged**. No tracked file in
  `search/` was modified; `node search/reproduce.mjs` still concludes
  "Nothing here changes the original contract. It remains failed-incomplete."
- This finding is promoted from "not reproduced" to an established defect of
  the harness, on the exact comparison above and not on a different case.
