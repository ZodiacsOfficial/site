# An offline data-pack compiler for DE440s

Track 1: representation, compiler and performance. Everything here was
produced by the files in this directory against
`/tmp/claude-0/swisslab/de440s.bsp` (32,726,016 bytes, sha256
`c1c7fee…0a49f2`). No Swiss Ephemeris code, data or output was consulted by
the compiler or by any measurement in this file. No LLM runs anywhere in the
compiler or the runtime.

Raw JSON for every number is in `raw/`. The command that produced each table
is named above it.

---

## 1. What was built

`compile.mjs` reads the DE440s SPK kernel and emits a self-describing binary
pack; `runtime.mjs` reads a pack and evaluates position and velocity, and
carries a copy of the prototype's apparent-place reduction so that longitudes
can be compared like for like. Everything is done in **position and state
vectors**, in the kernel's own J2000/ICRF equatorial frame, in km and km/s. No
angle is ever stored or fitted, so no wrapped-angle artifact can exist in the
representation; angles are formed only at the end of the reduction and are
tested explicitly across the 0/360 seam (§6).

### Three structural facts, exploited by every candidate and reported apart

These are **not compression**. They are properties of DE440s that a
straightforward reader does not notice, and they are separated out so that no
part of the headline ratio is smuggled in from them.

| fact | evidence | saving |
| --- | --- | --- |
| segment 399/3 (Earth rel. EMB) equals −(1/EMRAT)·segment 301/3 | worst residual over every coefficient of both segments: **9.09e-13 km** (1 ulp) | 8,987,232 B |
| segments 199/1 and 299/2 are identically zero | max abs coefficient **exactly 0** in both | 192 B |
| DAF headers, comment area and reserved records are not data | — | 64,640 B |

These were found independently by this track (from the coefficient arrays) and
by the integrator (`INTEGRATOR-NOTE.md`, from 400 sampled epochs); the two
agree, including on the 9.09e-13 km residual.

So the matched, structure-only baseline is **23,673,952 B = 22.5773 MiB**, a
factor 1.38 below the 31.2097 MiB file, before any lossy step. Both
denominators are carried through every ratio below.

### Declared error budgets

Written into `sources.mjs` **before the sweep was run**, half to the fit and
half to quantisation:

Moon 0.010 km · Sun/Mercury/Venus/EMB 0.30 km · Mars 0.50 km · Jupiter…Pluto
1.00 km.

The Moon's is set by T2, not T6: at its 3.56e5 km minimum geocentric distance,
0.010 km is 0.0058″. The outer planets' 1.00 km is half of T6's 2 km. EMB has
its own budget because its error moves every geocentric vector through the
observer.

---

## 2. The candidates

Preregistered, with A/B/C as given in the brief and D declared in `compile.mjs`
before it was measured.

- **A — keep the source segmentation.** Use DE440s's own intervals and record
  layout; drop the high-order Chebyshev coefficients whose summed envelope is
  inside the fit budget, and quantise what is left.
- **B — refit adaptive segments.** Sweep interval length (22 lengths that
  divide the 109,600-day span exactly) × degree (3…44) × frame (SSB and
  heliocentric) per body, 11,988 cells, and pick the cheapest that meets the
  budget. Coefficients stay float64.
- **C — a compact residual over astronomy-engine.** Store DE minus
  astronomy-engine's own `BaryState`/`GeoMoonState`, refit and quantised.
- **D — B's segmentation plus A's quantiser.** Declared before measurement on
  the reasoning that A and B attack *different* costs — bits per coefficient
  versus number of coefficients — and should compose.

The written-down prediction for C, recorded in `compile.mjs` and in
`FAILURES.md` before the pack existed: the residual shrinks amplitude but not
bandwidth, because astronomy-engine's series are truncations of the same
orbits, so the coefficient *count* will not fall; and a runtime that must
evaluate the model on every light-time iterate cannot win T4. Both held, and
the size did not improve either.

`node sweep.mjs && node choose.mjs` produces `raw/sweep.json` (11,988 cells)
and `raw/choice.json`.

---

## 3. The table

`node compile.mjs --candidate=X`, then `node measure.mjs packs/X.zeph`,
`node perfrun.mjs`. Latency rows are the median of three separate processes,
ten bodies per iteration, data acquisition excluded from every timed kernel.
Pack rows use the low-memory read mode except C (§7).

| | **A** | **B** | **C** | **D** | target |
| --- | --- | --- | --- | --- | --- |
| size | 4.7804 MiB | 4.7598 MiB | 1.7819 MiB | **1.6567 MiB** | ≤ 7.80 |
| × vs 31.2097 MiB kernel | 6.53 | 6.56 | 17.52 | **18.84** | ≥ 4 |
| × vs 22.5773 MiB structure-only | 4.73 | 4.74 | 12.67 | **13.63** | — |
| max longitude error vs uncompressed prototype (120,000 rows) | 0.00091″ | 0.00485″ | 0.19567″ ⚠ | 0.00488″ | ≤ 0.05″ |
| p95 longitude | 0.000167″ | 0.000156″ | 0.02771″ | 0.000182″ | — |
| sampled max position, outer planets, barycentric | 0.355 km | 0.483 km | 197.0 km ⚠ | 0.530 km | ≤ 2 |
| sampled max position, Moon, barycentric | 0.127 km | 0.242 km ⚠ | 63.98 km ⚠ | 0.165 km | ≤ 0.2 |
| sampled max position, Moon, geocentric | 0.00209 km | 0.00948 km | 0.00383 km | 0.00946 km | ≤ 0.2 |
| sampled max velocity, any body | 1.25e-5 | 2.21e-5 | 3.18e-3 ⚠ | 2.37e-5 | ≤ 1e-4 km/s |
| **proven** max position, outer planets | 0.613 km | 0.776 km | none possible | 1.286 km | ≤ 2 |
| **proven** max position, Moon, geocentric | 0.0062 km | 0.0174 km | none possible | 0.0224 km | ≤ 0.2 |
| **proven** max position, Moon, barycentric | 0.256 km ⚠ | 0.407 km ⚠ | none possible | 0.449 km ⚠ | ≤ 0.2 |
| **proven** max velocity, any body | 2.44e-5 | 4.56e-5 | none possible | 8.13e-5 | ≤ 1e-4 km/s |
| warm p50, 10 bodies | 0.0418 ms | 0.0530 ms | 1.1320 ms ⚠ | **0.0542 ms** | < 0.324 |
| warm p95 | 0.1249 ms | 0.1222 ms | 1.4474 ms ⚠ | **0.1295 ms** | < 1.071 |
| cold start, p50 | 0.491 ms | 0.953 ms | 5.076 ms ⚠ | **1.208 ms** | < 1.694 |
| peak RSS, one backend | 62.73 MiB | 63.25 MiB | 80.02 MiB ⚠ | **62.60 MiB** | < 63.57 |
| byte-identical on recompile | yes | yes | yes | yes | required |
| compile time | 0.5 s | 18 s | 134 s | 21 s | — |

C's accuracy rows use a reduced sampling denominator — 6,000 grid instants and
15,000 longitude rows against 60,000 and 120,000 for the others — because every
evaluation of a C pack costs an astronomy-engine call. That makes C's numbers
less finely resolved, not more forgiving: its errors are three to four orders of
magnitude above the others and are not near any sampling threshold.

Baselines measured on the same host, same harness: the uncompressed prototype
is **warm p50 0.3409 ms, p95 1.1148 ms, cold p50 1.805 ms, peak RSS
63.66 MiB, 31.21 MiB of data**; the shipped astronomy-engine core is
0.1615 / 0.3440 ms with no data. The frozen record from
`swiss-benchmark/RESULTS.md` (another host) is 0.324 / 1.071 / 1.694 /
63.57 MiB; this host reproduces it to within 5%, which is why the T4 targets
are quoted against the frozen figures and met against both.

**D is the recommended pack.** A and B are kept because they answer the
question the brief asked — which mechanism does the work.

### What the table says about mechanism

- **Quantisation does most of it.** A (source segmentation, quantised)
  is 6.53×; B (refit, float64) is 6.56×. They are within 0.5% of each other,
  by two completely different routes. Combining them gives 18.84×, i.e.
  2.9× more than either — the two mechanisms are close to independent, which
  is what D was declared on.
- **B alone is a disappointment.** Refitting cuts the Moon from 3.25
  coefficients/day to 0.97 and Neptune from 0.188 to 0.0040, yet float64 storage
  of those coefficients costs almost exactly what truncated-and-quantised
  storage of the originals costs. The coefficient count and the bits per
  coefficient were roughly equally wasteful in the source.
- **The Moon is 52% of pack D** (884 KiB of 1.66 MiB) and Mercury another 25%
  (429 KiB). Everything from Jupiter outward together is 1.6% (26 KiB).

---

## 4. Per-body layout of pack D

`raw/measure-D.json` → `perPackBody`. `nrec` × `ncoef` is the whole
representation; the frame column is the sweep's own choice.

| body | frame | interval | coeffs | records | budget | **proven** | sampled max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mercury bary | heliocentric | 80 d | 41 | 1370 | 0.30 km | 0.3595 km | 0.1271 km |
| Venus bary | SSB | 400 d | 43 | 274 | 0.30 | 0.4063 | 0.1393 |
| EMB | SSB | 274 d | 31 | 400 | 0.30 | 0.4265 | 0.1534 |
| Mars bary | SSB | 685 d | 39 | 160 | 0.50 | 1.0104 | 0.4118 |
| Jupiter bary | SSB | 2740 d | 43 | 40 | 1.00 | 1.2860 | 0.4283 |
| Saturn bary | SSB | 2740 d | 22 | 40 | 1.00 | 1.2649 | 0.3899 |
| Uranus bary | SSB | 2740 d | 14 | 40 | 1.00 | 1.1781 | 0.3590 |
| Neptune bary | SSB | 2740 d | 11 | 40 | 1.00 | 1.2428 | 0.4401 |
| Pluto bary | SSB | 2740 d | 10 | 40 | 1.00 | 1.2758 | 0.4848 |
| Sun | SSB | 400 d | 44 | 274 | 0.30 | 0.3792 | 0.1252 |
| **Moon** (rel. EMB) | native | 32 d | 31 | 3425 | 0.010 | 0.0221 | 0.0085 |
| Earth (rel. EMB) | — | derived from the Moon by −1/EMRAT, 0 bytes | | | | | |
| Mercury 199, Venus 299 | — | identically zero, 0 bytes | | | | | |

Sampling denominators: 12 points per record per body (41,100 for the Moon,
16,440 for Mercury, 480 for each outer planet), with two of the twelve at
τ = ±0.999999999 so the record boundaries — where a refit is worst — are
actually hit.

---

## 5. The analytic bounds, proven separately from the sampled error

Three bounds are **proven**: they are statements about the function, not about
the points that were looked at. They are computed at compile time and written
into the pack header (`bodies[].provenParts`). The only caveat, stated rather
than hidden: the bound is itself evaluated in float64 and so carries round-off
of order 1e-12 km.

**(i) Quantisation, position.** Round-to-nearest with step *q* gives
|δ_k| ≤ q/2 for every stored coefficient, and |T_k(τ)| ≤ 1 on [−1,1], so per
component |Δp| ≤ n·q/2, and the three components combine as a vector with √3.
Setting q = 2ε/(√3·n) makes the vector bound exactly ε.

**(ii) Quantisation, velocity.** dT_k/dτ = k·U_{k−1} and |U_{k−1}| ≤ k, so
|dT_k/dτ| ≤ k², giving |Δv| ≤ (√3·q/2R)·Σ_{k<n} k² = (√3·q/2R)·(n−1)n(2n−1)/6
with R the record half-length in seconds. This one is *tight*: at τ = 1 every
U_{k−1} attains k simultaneously.

**(iii) The equal step is optimal, not merely convenient.** Minimising
Σ_k log₂(2M_k/q_k) subject to Σ_k q_k = 2ε has stationarity condition
1/(q_k ln2) = λ, i.e. q_k constant. A uniform absolute step across coefficient
indices *is* the bit allocation that minimises total bits for this error model.
That is why the high-order coefficients cost 1 byte and c₀ costs 5 or 6.

**(iv) Refit error, proven without sampling.** Cut the span at the union of
every refit-record boundary and every source-record boundary of every segment
the frame is built from. On each elementary interval both sides are single
polynomials, so their difference *g* is a polynomial of degree
D = max(degrees); interpolating at D+1 Chebyshev nodes recovers its
coefficients exactly. Then, writing g(cos θ) = Σ g_k cos kθ,

&nbsp;&nbsp;&nbsp;&nbsp;|dg/dθ| ≤ Σ_k k|g_k| ⟹ max|g| ≤ (max over a θ-grid of M points) + (π/2M)·Σ_k k|g_k|,

which bounds *g* over the whole interval, not over the grid. M = 256 here. The
derivative uses the exact Chebyshev coefficients of dg/dτ and the same
argument. This is why the refit rows in §3 and §4 carry a proven column at all:
the DE kernel being piecewise polynomial is what makes it possible, and it is
also why **candidate C can never have one** — astronomy-engine's model is not a
polynomial, so no re-expansion argument exists and C is sampled-only.

The proven bounds run about **2.6× the sampled maxima**. That ratio is a
property of the 256-point grid, not of the pack; a finer grid tightens it at
linear cost.

---

## 6. Angles across 0/360, and derivatives

**Nothing angular is stored.** The pack is vectors; the seam can only appear in
the reduction. It is tested three ways:

1. every one of the 120,000 longitude rows is differenced **around the circle**
   (`(a−b) mod 360`, folded into (−180, 180]), the same convention as
   `swiss-benchmark/tools/compare.mjs`;
2. a **wrap cohort** is reported separately — the 615 rows whose reference
   longitude is within 1° of 0/360. Pack D's worst there is **0.00297″**,
   against 0.00488″ overall, so the seam is not where the error lives;
3. `pack.nodetest.mjs` bisects the Sun's actual passage through 0° in six years
   spread over the coverage and samples ±4000 s, ±400 s, ±40 s, ±4 s, ±0.4 s
   and 0 around each crossing, and walks the Moon at six-hour steps for 400
   days (1600 instants, 27 of them inside 3° of the seam). Every longitude is
   asserted to be in [0, 360) and to agree within 0.05″.

**Velocity is measured separately from position throughout**, because a small
position error does not bound a velocity error. The runtime returns the
analytic derivative of the same polynomial in the same Clenshaw pass, never a
finite difference, and the test asserts that this derivative matches a
fourth-order difference *of the pack's own positions* to 1e-7 km/s — i.e. that
the derivative is consistent with the representation, not merely close to the
truth. Against the raw kernel, pack D's worst velocity error over 60,000
instants × 11 bodies is **2.37e-5 km/s**, proven ≤ 8.13e-5 km/s.

The reference itself was checked against the committed prototype: over 4000
rows the in-memory reference reproduces
`swiss-benchmark/prototype/apparent.mjs` **exactly, 0.0″**, and the single
deliberate reduction difference (observer velocity taken analytically rather
than from a 60-second central difference) is **8.19e-10″**. `raw/equivalence.json`.

---

## 7. Latency, cold start and memory

`node perfrun.mjs` → `raw/perf-summary.json`.

| | data | warm p50 | warm p95 | warm p99 | cold p50 | peak RSS |
| --- | --- | --- | --- | --- | --- | --- |
| shipped core | 0 | 0.1615 | 0.3440 | 0.4231 | 0.621 | 70.88 |
| uncompressed prototype | 31.21 MiB | 0.3409 | 1.1148 | 1.3031 | 1.805 | 63.66 |
| **D, low-memory** | 1.66 MiB | **0.0542** | **0.1295** | 0.3091 | **1.208** | **62.60** |
| D, resident | 1.66 MiB | 0.0565 | 0.1403 | 0.2847 | 2.330 | 64.84 |
| A, low-memory | 4.78 MiB | 0.0418 | 0.1249 | 0.2563 | 0.491 | 62.73 |
| C, resident | 1.78 MiB | 1.1320 | 1.4474 | 1.5845 | 5.076 | 80.02 |

Two read modes exist, and the reason is honest rather than rhetorical: the
prototype's resident set **excludes** its 31 MiB kernel — it `pread`s on every
evaluation and holds nothing — so any in-memory pack is an RSS regression
against it by its own size. `resident: false` keeps the pack on disk and
preads one record per body per chart, which the one-slot record memo makes
sufficient. That is far fewer syscalls than the prototype's two per *position*
evaluation, which is where most of its 0.34 ms goes. Both modes return
bit-identical numbers (asserted in `pack.nodetest.mjs`).

D low-memory beats the prototype on warm p50 (6.3×), warm p95 (8.6×), cold
start and peak RSS simultaneously, on 1/19th of the data. **D resident is
faster warm but regresses cold start** (2.330 ms against 1.805 ms) because it
reads the whole pack; if cold start does not matter to a caller, resident is
the better mode.

---

## 8. Determinism

`node determinism.mjs` → `raw/determinism.json`. Each candidate compiled twice
to different paths and hashed:

| candidate | sha256 | identical |
| --- | --- | --- |
| A | `1569cf12…` | yes |
| B | `b41932b8…` | yes |
| C | `a2470e13…` | yes |
| D | `b52dd02c…` | yes |

Scope, stated: this proves determinism of this compiler on this platform and
Node build. The fits call `Math.cos`, whose last bit ECMA-262 does not specify,
so a different engine could in principle differ. The header records the sha256
of every compiler source file, so two packs can be checked for whether they
were even meant to be identical.

Every pack header carries: compiler name and version, the sha256 of each
compiler source file, the input kernel's name, byte count and sha256, the full
settings block (budgets, split, quantiser rule, choice source), coverage in TDB
seconds and ISO, the coordinate conventions (frame, units, origin per body, the
Chebyshev convention, the velocity convention, and an explicit statement that
no angles are stored), the three derived/structural facts with their evidence,
the dependency list with runtime-needed flags, per-body proven bounds, and the
sha256 of the payload region.

---

## 9. Experiment (ii): smaller coverage and body subsets — NOT a compression result

Reported apart from §3 and never folded into any ratio there. These are
**smaller products**, not a better compressor.

| pack D variant | size | vs full D |
| --- | --- | --- |
| full: 1849-12-26 … 2150-01-22, all bodies | 1.6567 MiB | — |
| 1900–2100 | 1.1130 MiB | −33% |
| 1950–2050 | 0.5668 MiB | −66% |
| inner bodies only (Sun, Moon, EMB, Mercury, Venus, Mars), full span | 1.6225 MiB | **−2%** |
| inner bodies, 1950–2050 | 0.5506 MiB | −67% |

Cropping *time* works, roughly linearly. **Cropping the body set does not**:
dropping all five outer planets saves 35 KiB, because the Moon is 53% of the
pack and Mercury 26% and neither can be dropped. A cropped pack refuses
instants outside its own coverage with a `RangeError` rather than clamping,
and `pack.nodetest.mjs` asserts that.

---

## 10. Targets

| | verdict |
| --- | --- |
| **T1** ≤ 7.80 MiB, matched coverage and body set | **pass** — 1.6567 MiB, 18.84× smaller than the 31.2097 MiB kernel and 13.63× smaller than the 22.5773 MiB structure-only baseline. Same 1849-12-26…2150-01-22 coverage, same fourteen segments' worth of information. |
| **T2** ≤ 0.05″ extra max longitude error | **pass** — 0.00488″ max over 120,000 rows (12,000 instants × 10 bodies), p95 0.000182″, worst case the Moon. Wrap cohort 0.00297″ over 615 rows. |
| **T6** ≤ 2 km outer planets | **pass, sampled and proven** — sampled 0.530 km, proven 1.286 km. |
| **T6** ≤ 0.2 km Moon | **pass geocentric, both ways** (sampled 0.00946 km, proven 0.0224 km). **Pass barycentric on sampled error** (0.165 km) but **the proven barycentric bound is 0.449 km, which exceeds 0.2 km.** See below. |
| **T7** ≤ 1e-4 km/s every body | **pass, sampled and proven** — sampled 2.37e-5, proven 8.13e-5. |
| **T4** warm p50 better than 0.324 ms, no regression in warm p95 / cold start / peak RSS | **pass in low-memory mode** — 0.0542 vs 0.324, p95 0.1295 vs 1.071, cold 1.208 vs 1.694, RSS 62.60 vs 63.57. **Resident mode fails the cold-start clause** (2.330 ms). |

The one honest miss: **the proven barycentric Moon bound**. The barycentric
Moon is EMB + (Moon rel. EMB), so it inherits the EMB budget of 0.30 km, whose
proven bound is 0.4265 km. Geocentrically the EMB term cancels exactly against
the observer and the bound drops to 0.0224 km. Nothing was retuned after seeing
this: the budgets in `sources.mjs` are as declared. From `raw/sweep.json`,
tightening EMB from 0.30 km to 0.10 km costs **+44 KiB on a 1.66 MiB pack
(2.6%)** and tightening to 0.03 km costs +57 KiB, either of which brings the
proven barycentric Moon inside 0.2 km.

---

## 11. What this does not establish

- **Nothing about physical accuracy.** Every number here is agreement with
  DE440s or with the prototype that reads it. Both descend from JPL; no
  observation was consulted.
- **Nothing about the residual against Swiss.** The brief's own finding is that
  the prototype's remaining 0.134″ is astronomy-engine's truncated nutation
  series, not the positions. A pack is a *representation* of the positions; it
  cannot move that ceiling, and 0.00488″ of representation error sits three
  orders of magnitude below it.
- **Nothing outside 1849-12-26 … 2150-01-22.** The pack refuses outside its
  declared coverage and the refusal is tested.
- **Nothing about gravitational deflection**, which the reduction still does
  not apply — inherited from the prototype, deliberately, so the comparison
  isolates the representation.
- **Nothing about licensing.** JPL ephemerides are public-domain US Government
  work, but `swiss-benchmark/NEXT.md` gate 1 is unanswered and this track did
  not answer it. No coefficient data should ship until it is.
  *Correction, 2026-09-23:* the first clause is wrong. NAIF grants a
  permission with conditions and does not use the words "public domain";
  `../RIGHTS.md` has the primary text (the engine audit,
  data-toolchain-packaging-13).

## 12. The single highest-value next change

**Fold the light-time iteration into the pack's own evaluator and cache the
observer.** The runtime currently spends its warm time re-entering
`state()` five times per body for light-time, recomputing the observer's
barycentric state for every one of the ten bodies, and calling
`Rotation_EQJ_ECT` ten times per chart. The pack makes each of those calls
cheap, which is exactly why they now dominate: at 0.054 ms for ten bodies the
polynomial evaluation is no longer the cost. Computing the observer once per
instant, the rotation once per instant, and iterating light-time against a
cached body record should take a ten-body chart well under 0.02 ms without
touching accuracy, size or the pack format.

It is ranked above the EMB budget fix (§10, +44 KiB for a proven-bound
improvement nobody's chart will feel) and above entropy coding (§FAILURES 8,
maybe 20% of a target already met by 4.7×) because latency is the axis where
the remaining headroom is largest and where the cost is pure engineering with
no accuracy trade.
