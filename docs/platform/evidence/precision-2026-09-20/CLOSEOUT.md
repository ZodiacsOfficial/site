# Precision preview — closeout

2026-09-20, last revised 2026-09-21. Branch
`claude/eager-ramanujan-razak3`, 51 commits against `main` at `d4828d80`,
526 files, +145,809 / −112. (This document's first revision counted 17
commits and 96 files from `542c0e72`; the base has moved and the branch
has grown, so the counts are restated against the base the pull request
actually merges into.)

One integrator and five bounded specialists: an adversarial review of the
result contract, one of the preview's isolation, one of the evaluation's
integrity, one of the completeness argument's floating-point soundness,
and one of the research write-up's claims. **All five were AI reviews.**
No human has reviewed this work, no third party has audited it, and
nothing here is certified by anyone.

Between them they found **twelve real defects** — including three false
exact totals, a regression case that had been silently substituted, and a
**false theorem at the centre of the completeness proof**. Every one is
fixed with a test, and the sections below say which. That is the most
useful thing in this document. One reviewer claim was itself wrong and was
corrected rather than acted on; §4 names it.

---

## 1 · What changed between the alpha and the preview

**The result contract was replaced.** The alpha returned `certified: true`
and `complete: true` on evidence that was a grid measurement multiplied by
a safety factor. Both booleans are gone. `zodiacs-precision-search/2`
reports separately: events found, whether the run **finished**, whether
every interval was **accounted for**, whether completeness was
**established** and on what support (`none` / `conditional` / `proven`),
every **unverified assumption** by name, and which stretches were **not
decided**. An exact total exists only where the support is proven, and
`buildResult` throws rather than emit a result whose fields contradict
each other. Migration: `examples/precision-alpha/MIGRATION.md`.

**A second search mode** that can prove completeness rather than assume it.

**Cancellation became a result**, not an exception, in both modes.
`cancelled` was a state the contract named and nothing could produce.

**Packaging**: `0.1.0-preview.1`, type declarations for both entry points
with runtime narrowing guards, three runnable examples, a vendored
compiler, and a documented kernel-to-pack route.

**An isolated developer preview** at `/developers/precision-preview/`.

**Two records corrected** without rewriting either: the compiler's licence
metadata, and the four-configuration benchmark's interpretation.

## 2 · The two search modes, and what each may claim

| | `empirical-apparent` | `validated-geometric` |
| --- | --- | --- |
| quantity | apparent geocentric ecliptic longitude **of date** | geometric ecliptic longitude in a **fixed ecliptic frame** — the ICRS equator rotated by ε₀, which is 23.1 mas from the J2000 mean equinox |
| corrections | light-time, aberration, solar deflection, frame bias, IAU 2006 precession, IAU 2000B nutation | **none** — that is what makes it a polynomial |
| strongest claim | `conditional`, on three named assumptions | `proven` |
| what the proof is | — | `Σ\|c_k\|` bounds a Chebyshev sum because every `\|T_k\| ≤ 1`; the same recurrence bounds the derivatives; those give an exclusion test and a monotonicity test that are statements about the stored polynomial |
| what it is about | — | **the pack**, not the sky |

They are **incomparable, not ordered**. A proof about a geometric
longitude in a fixed frame and a conditional statement about
apparent-of-date answer different questions,
and for the Sun the two crossings differ by about eight hours. An earlier
draft of the results called the proven mode "strictly stronger"; it is
not, and that is corrected.

## 3 · The counterexamples

An angle that makes a whole number of turns between every pair of samples
is invisible to any grid that aliases the same way, and to any finer grid
that aliases the same way.

| case | truth | the alpha said |
| --- | --- | --- |
| 96 turns across the 96 default sampling intervals, target 137° | 96 crossings | **`no-crossing`, certified, 0** |
| the same at 95 turns | 95 crossings | **`crossing`, certified, 1** |

Both were reproduced before anything changed. The root cause was
instrumented: the generic derivative enclosure sampled the slope at cell
endpoints straddling the ±180° antipode and returned −258,840 °/day where
the truth was +360 °/day, and the mean-value enclosure built on that
excluded a cell containing a root.

`test/tier-a/angle-counterexamples.nodetest.mjs` now carries ten cases —
integer turns, fast oscillation with agreeing endpoints, close pairs,
tangency, near miss, boundary roots, several segment boundaries, and an
interval with no roots. Every one asserts that completeness is **not**
established, that every returned event has a real root in its bracket, and
that any conditional total offered equals the truth.

The rate ceiling is now declared by the caller, checked against the
sampling step and against the observed rate, and reported on the result as
unverified — because no amount of sampling can verify it.

## 4 · The improvement, measured against rules fixed beforehand

`EVALUATION-PLAN.md` was committed at `9ae78ba7`, before the harness
existed. Results: `EVALUATION-RESULTS.md`.

On two regressions and ten rule-generated holdout cases, both modes:
**0 missed, 0 extra, 0 unresolved**. The validated mode proves
completeness on all thirteen. 110 structural comparisons per mode pass —
partitioning into 2, 3 and 7, targets a turn and two turns away, a 37-day
window shift, three sampling settings each, budget exhaustion,
cancellation, recovery, five kinds of bad input.

The single clearest improvement: **the Moon reaching 100° in 2019**. The
recorded alpha harness answered **2**. Both modes now answer **13**, the
dense scan finds 13, and the validated mode proves 13 is all of them.

What the numbers do not say, and now do:

- The empirical mode's real agreement with the reference is **1.4e-2 to
  8.7e-2 seconds**, not the 1-second matching gate. Its declared brackets
  run to **1587 s** on Uranus and **5495 s** on the contract case.
- The validated mode agrees to **4.9e-5 s**.
- "18× cheaper" was mostly the cost of the quantity: `apparent()` costs
  **7.92 µs** per evaluation against **0.93 µs** for a geometric state
  pair. The honest inversion is that **the proof is available because the
  quantity was made cheap enough to be a polynomial**.
- 22 of 110 structural comparisons per mode are **empty vs empty** —
  Neptune and Pluto never reach their targets.
- The holdout, being the contract's ten bodies by rule, **can never
  violate the empirical mode's 20 °/day ceiling** and contains no
  tangency, close pair or boundary root. Those live only in the synthetic
  suite.

### What the five reviews found

| # | found | fixed by |
| --- | --- | --- |
| 1 | **A single root reported twice with `isExactTotal: true`** — cells are closed intervals, and target 0° (an Aries ingress) is the one angle whose sine is exactly zero | cells own `[lo, hi)`; four tests |
| 2 | **A proven-complete zero over time the pack has no records for** — a declared coverage overhanging its records by ≤1 s, a clamped record index, and a bound false by 4770× | the search refuses outside the records; `seriesAt` refuses to extrapolate |
| 3 | **A cancel in the robustness probe threw**, against two documents saying it does not | it returns a result |
| 4 | **A spent budget reported `finished`** with an evaluation count above the cap | it reports `budget-exhausted` |
| 5 | **The Clenshaw allowance understated the worst case** for n > 4 (160 u·Σ\|c\| declared against 760 needed at n=20) | `4n²·u·Σ\|c\|` |
| 6 | **The monotone test compared a slope against a position allowance** — inverted by ~2000× for short records | the slope's own allowance |
| 7 | **A regression case was silently substituted** and the write-up said the original was preserved | the declared case runs; the substitute runs beside it, labelled |
| 8 | **The preview's page was written to Cache Storage** on any ordinary visit | excluded in `sw.js`; two tests |
| 9 | **The cancel button's test passed with the worker never stopped** — every value it read was written by the click handler | it watches the worker |

| 10 | **A false theorem at the centre of the completeness proof** — the exclusion test used `(hi − lo) / 2` as its Lipschitz lever arm about the computed midpoint. `hi − lo` is exact by Sterbenz but `lo + hi` rounds, so the midpoint sits off-centre and the true `max\|x − m\|` over the cell exceeds that half-width, by a third of it on a three-ulp cell. The test was reasoning over a shorter interval than the cell it was about | `max(hi − m, m − lo)`, which is exact, free, and identical whenever the midpoint is centred; a test that asserts the property the proof needs |
| 11 | **The declared frame was 23.1 mas from the frame it named** — both contracts said `j2000-mean-ecliptic`; what is computed is the ICRS equator rotated by ε₀, with no IAU 2006 frame bias | `frame: 'ecliptic-of-the-icrs-equator'` and a `frameNote` carrying the measurement |
| 12 | **Nine overstatements in the research write-up**, among them a per-cell τ width quoted beside event results (overstating the error by eight orders of magnitude), a cancellation "latency" that was total runtime, and a cost attributed to iteration count that measurement put on cell count | each number remeasured and the claim rewritten to what the measurement supports |

Plus nine rules of the evaluation plan that were implemented loosely, and
four checks in the browser driver that could not fail. All corrected.

**One reviewer claim was wrong, and was corrected instead of acted on.**
Review 5 held that evaluating the observer at the retarded time reproduces
stellar aberration. It does for the Sun — 5.4 mas — and nowhere else:
across all events the median disagreement with the aberration term is
10.6″. The write-up says so rather than repeating it.

**Two defects were found by the integrator, not by a review**, while
verifying #10 and #11, and are recorded here so the review count is not
read as the defect count. Both are record-addressing faults in the same
family as #10, both exhibited on a real pack: `seriesAt` could return a
record not containing the requested instant and evaluate at
\|τ\| = 1.0000000000000202, exactly where `Σ\|c_k\|` stops bounding the
series; and the enclosure walk discarded the record index it already held,
re-deriving it from a midpoint that rounds onto a boundary, so the
enclosure excluded the value it was built to contain (22.5 m, then
0.07 km). A third: after #11 renamed `frame`, the same object's
`operation` string and `notApplied` array still carried the old claim, so
the contract contradicted itself; fixed in `07a40b73`.

## 5 · Installing from a clean directory

```bash
cd examples/precision-alpha
npm pack                       # zodiacs-precision-alpha-0.1.0-preview.1.tgz

mkdir /tmp/consumer && cd /tmp/consumer
npm init -y && npm pkg set type=module
npm install --offline /path/to/zodiacs-precision-alpha-0.1.0-preview.1.tgz

node node_modules/@zodiacs/precision-alpha/examples/01-open-and-calculate.mjs  ./pack.zeph
node node_modules/@zodiacs/precision-alpha/examples/02-search-both-modes.mjs   ./pack.zeph
node node_modules/@zodiacs/precision-alpha/examples/03-cancel-and-recover.mjs  ./pack.zeph
cd node_modules/@zodiacs/precision-alpha && npm test     # 186 of 186
```

Re-run against the archive built from this head: the install resolves all
three entry points (`.`, `/node`, `/browser`) with `dependencies: {}`, the
186 tier-A tests pass from inside the clean install, both modes run on a
real pack — `validated-geometric` returning `proven` with an exact total,
`empirical-apparent` returning `conditional` with three named assumptions
and `isProven()` false — and `dispose()` makes a later search fail with
code `disposed` rather than quietly answering.

**This is `npm pack` and a local install. It is not npm publication**, and
nothing here should be read as saying the package is on a registry.

No dependencies, so the install is offline. No repository checkout, no
`/tmp` path, no network, no credential. To make a pack, follow
`examples/00-prepare-a-pack.md`, which uses the vendored compiler against
a kernel you fetch yourself.

Testing the **archive** rather than the checkout is what found two files
missing from the `files` list — the compiler died on ENOENT in a clean
install — and compiling a real consumer against the shipped `.d.ts` is
what found that `if (r.completeness.established)` narrowed nothing.
`scripts/precision-alpha-types.test.mjs` does that on every run.

## 6 · The preview, and the gate that is now closed

Route: **`/developers/precision-preview/`**. `noindex`, absent from the
sitemap, no inbound link, no Astro JS chunk, one static module and a
worker. Verified against the build rather than asserted: the `robots`
meta is `noindex, follow`, `sitemap.xml` contains zero occurrences of the
path, and no HTML file anywhere in `dist/` links to it.

**The gate that was open is closed.** Editing `src/layouts` or
`src/components` — which `noServiceWorker` and `noAssistant` required —
moved `templateSourceSha256` from `a495772c…` to `8ab4c843…`, and
`scripts/phase1-acceptance-evidence.test.mjs` failed on every head until
the captures were re-driven. They were, by `Browser Evidence` run
[35573682441](https://github.com/ZodiacsOfficial/site/actions/runs/35573682441)
on the pinned Chromium 149.0.7827.55, and committed from that workflow's
own artifact. The 390/1440 visual comparison came back with no pixel
regression, which is the evidence that the two chrome props move nothing;
`monthly` and `yearly` are pixel-identical across the Chromium major, and
every other capture differs only because the daily edition rolled a day.
`PHASE1-RECEIPT-GATE.md` has the per-capture numbers and corrects a claim
the earlier version of it got wrong.

One step of that job is still red and is **not** this change's:
`Navigation and chart explorer browser drive` asserts that an
unknown-birth-time chart names two candidate Moon signs, which `main`
deliberately stopped doing in `9d180c9f`. The files involved are
byte-identical between this branch and `main`. Diagnosis and a proposed
patch are on the pull request; it is left for a separate change rather
than widening this one.

Everything else is green: `npm run build`, `npm run check` (0 errors, 0
warnings), `npm test`, `check-dist`, `footer:check`, and the alpha's own
186 — now run by CI, which it was not.

## 7 · Redistribution, and the corrected metadata

**No pack is distributed and none is committed.** The terms for
coefficients derived from the kernel are unresolved, so the package ships
a compiler and you compile your own.

The compiler stamped `licence: 'US Government work, public domain
(JPL/Caltech-NASA)'` into every pack header. `RIGHTS.md` had already
established that this is wrong — SPICE kernels are Caltech JPL's under
contract to NASA, a contractor's output is not automatically a government
work, and NAIF grants a permission with conditions, never a dedication.
Corrected forward under compiler **1.1.0**, with the old artifacts
untouched and the coefficient payload demonstrated byte-identical
(`0a218764…`). Detail: `METADATA-CORRECTION.md`.

Rights by artifact, read from each one's own terms: this runtime MIT; the
ERFA-derived nutation coefficients BSD-3-Clause with the notice shipped;
the DE440s kernel a NAIF permission with conditions; **a compiled pack
unsettled**; Swiss Ephemeris code and data neither used nor committed.

One inconsistency found and not created: three files of bulk Swiss output
predating this milestone are tracked in git while `RIGHTS.md` says Swiss
output is never redistributed. **The owner's decision, not ours**, and it
is stated as two concrete options.

## 8 · Browsers, and what is not covered

| engine | result |
| --- | --- |
| Chromium 141.0.7390.37 | **pass** |
| Firefox 151.0 | **pass** |
| WebKit | **not run** — no build exists here; the launch attempt and its error are recorded |

Both passes cover: refusal before any data; the synthetic fixture; places;
both search modes and what each claims; five refusals; four kinds of
broken pack and recovery from them; superseded replies; cancellation, with
the worker observed to have stopped; recovery; disposal; keyboard reach;
no horizontal scroll at 390 px; an allowlisted request log; the site
search opened deliberately; and persistence including **Cache Storage**,
in a context that visited another page first so the offline worker was
active.

**There is no Safari or iOS coverage.** Not from Chromium, not from
Firefox, and not from Playwright's WebKit either, which is a build of the
engine and not Apple's browser. `WEBKIT-HANDOFF.md` specifies three runs
for whoever has a Mac — Playwright WebKit, real Safari, and a real iPhone
— with the thirteen rows each must report and an explicit statement of
what may not be written down afterwards.

## 9 · The announcement, and the recording

`ANNOUNCEMENT-DRAFT.md`. **Not posted, not sent, not scheduled, not
submitted anywhere.** It leads with the 96-turn defect rather than the
proof, and states in the announcement itself what is not claimed: no
comparison with another ephemeris, no independent certification (the
reviews were AI reviews and it says so), no external adoption, no Safari
or iOS coverage, no distributed data.

`recording/` holds an unedited Chromium session — `session.webm` plus nine
stills — driven by `scripts/record-precision-preview.mjs` against the
built site. Nothing staged, nothing re-shot.

## 10 · The next research question

**Can the completeness proof be extended from the geometric quantity to
the apparent one, and at what cost?**

Everything proven here rests on the searched quantity being a polynomial
in time. Light-time makes it an implicit function, aberration and
deflection make it rational in the state, and precession and nutation
bring in series of a different kind. Each destroys the polynomial and with
it the `Σ|c_k|` bound — which is why the proven mode omits all of them,
and why it is 8.5× cheaper per evaluation.

The tractable-looking part is light-time: the retarded instant solves
`τ = |r(t − τ)|/c`, and on one Chebyshev piece that is a fixed-point
equation whose iteration is a contraction with a computable modulus. If
the composed function's derivative could be bounded from the pack's own
coefficients plus a bound on the contraction, the same exclusion and
monotone tests would apply to the light-time-corrected longitude. The
question is whether the resulting bound is tight enough to close cells at
a usable rate, or so loose that every cell subdivides to the floor — which
would make the proof true and useless.

That is one narrowly defined operation, testable against the same
counterexample suite, and it is the difference between proving something
about a pack and proving something an astrologer asked.

---

### What this closeout does not claim

Not the best anything. No superior physical astronomy — agreement with
Swiss Ephemeris is consistency between two descendants of the same JPL
development ephemerides, and the one place they disagree by an arcsecond
turns out to be two implementations of solar deflection for a body behind
the Sun, where nothing is observable. No independent certification: five
AI reviews, named as such, and a proof that had a false theorem in it
until the fourth of them. No external adoption: nobody is using this. The
interfaces will change.
