# Making a restricted-domain search practical — the rule, fixed before the tuning

This is written and committed **before** any knob is turned toward a
target. The baseline it rests on is
`docs/platform/evidence/precision-partition/baseline/cost-baseline.json`,
measured on the live runtime with the instrumentation sink installed, and
every threshold below is derived from that file rather than chosen after
seeing a result.

What this evaluates is **processing the declared domain practically**. It
does not evaluate the deflection model, which is unchanged, and it does
not revisit the original usefulness verdict, which stands.

## 0 · What is NOT being changed

`zodiacs-deflected-of-date/1` and its five-degree floor. Not lowered, not
widened, not made conditional. No correction is dropped on a difficult
cell, no earlier profile is substituted, no tolerance is loosened, and the
4,000,000-evaluation budget is neither raised nor reset per subinterval.
The Sun-as-target exception keeps its behaviour and its accurate
applied-correction metadata.

`DEFLECTION-RESULTS.md` records **FAIL**, six of twenty cases establishing
completeness over their full requested window. That number is a property
of the profile and the request, not of the algorithm, so it is preserved
exactly and reported beside anything new. An excluded interval is not an
empty interval and never becomes one here.

## 1 · The measured baseline, and the one number that motivates this

Five cases, the same requests `DEFLECTION-EVALUATION.md` section 8 builds,
on the same pack. Each was run bare, then bare again, then with the sink,
and the sink's run had to agree with the bare runs on events, evaluations
and cells exactly — it did, on all five.

| | ratio to of-date | evaluations | cells | wall (bare) |
| --- | ---: | ---: | ---: | ---: |
| F2 Moon | 14.8x | **4,000,001 (exhausted)** | 157,818 | 51.7 s |
| A2 Moon | 14.8x | **4,000,001 (exhausted)** | 157,818 | 56.5 s |
| F3 Mercury | 831x | 1,917,153 | 74,085 | 29.1 s |
| F7 Saturn | 60.9x | 63,960 | 3,978 | 0.88 s |
| F6 Jupiter (control, no conjunction) | 1.7x | 2,106 | 55 | 0.033 s |

Preprocessing — opening the pack, building the reference, choosing the
target longitudes — is 19.9 ms and is included in every total below.

**Where the work goes, by the reason each cell exists:**

| | domain-boundary | loose-enclosure | not-yet-monotone | seed |
| --- | ---: | ---: | ---: | ---: |
| F2 Moon | **98.9 %** (155,768 cells) | 1.1 % | — | 0.0 % |
| A2 Moon | **98.9 %** (155,768 cells) | 1.1 % | — | 0.0 % |
| F3 Mercury | **99.9 %** (74,026 cells) | 0.1 % | — | 0.0 % |
| F7 Saturn | **98.9 %** (3,966 cells) | — | — | 1.1 % |
| F6 Jupiter | 66.3 % (42 cells) | — | 22.9 % | 10.8 % |

A cell is `domain-boundary` when some ancestor's elongation enclosure
straddled the floor. It is not "a cell that failed the domain test" — such
a cell can land wholly inside the domain and then run the whole pipeline —
so the figure is the work **caused by** boundary bisection, which is the
work a partition can remove.

Two things in that table are worth stating because they were not assumed:

* The control has no conjunction and still spends **66 %** of its budget
  this way. The elongation *enclosure* over a record-wide seed straddles
  the floor even when the elongation itself is nowhere near it, so this is
  not only a conjunction problem.
* By wall clock the deflection arithmetic is **1–2 %** and the domain test
  it gates is **0 %**. The expense is entirely the machinery for finding
  out where the domain is: light-time 30–46 %, enclosures 35–55 %, frame
  10–28 %.

**Instrumentation overhead**, measured against a warm neighbouring run:
+1.5 % to +8.9 % of wall time, largest on the two longest cases; bare-run
spread on the same case is −0.5 % to +5.0 %. Evaluations and cells are
deterministic and were bit-identical with the sink on and off, so every
count in this document is exact and only the *times* carry that overhead
where a run was probed. The figures in the table are from unprobed runs.

## 2 · What is being built

A **domain partition**: for the exact requested interval, the subintervals
proved admissible under the existing profile, the subintervals proved
excluded by it, the boundary regions not classified either way, and any
remainder left unprocessed. Then the event search runs on that partition
instead of rediscovering it.

The partition uses the profile's own elongation — `cos(elongation) =
-(e_hat . d)/|d|`, `e` at reception, `d` light-time corrected — through
the *same function* `deflectInterval` calls, not a second expression of
the same definition.

It never receives a target longitude, which is how its independence from
one is established rather than asserted.

## 3 · Resource limits, fixed here

| | |
| --- | --- |
| whole-request evaluation budget | **4,000,000**, unchanged, covering partitioning + every event subsearch + verification. Not reset per subinterval. |
| whole-request cell budget | 400,000, unchanged, same scope |
| wall-clock budget per request | 300,000 ms, as `DEFLECTION-EVALUATION.md` section 6 |
| root tolerance | 1e-3 s, unchanged |
| match window | 1 s, unchanged |
| reference-vs-reducer | 1e-9 arcsec, unchanged |

## 4 · The knobs, and the one amendment that is allowed

Two knobs exist and are frozen at the values they were given during
profiling, before any target was written:

| | value | what it means |
| --- | ---: | --- |
| `boundaryToleranceSec` | **60** | a straddling span narrower than this is reported as boundary rather than bisected further |
| `relightWidthRatio` | **8** | a span narrower than 1/8 of the span its light-time interval came from re-derives that interval |

Neither is an accuracy claim. The boundary tolerance is a stopping rule,
and the residual uncertainty it leaves is reported as a span, not folded
into a neighbour.

**If the evaluation in section 6 fails, these may be changed once.** That
change is an amendment: it will be recorded as one, with the before and
after, and the result described as an amended run rather than as an
unchanged preregistered success.

## 5 · How the numbers are taken

* **Cold** means a fresh partition for the request, with no cached work:
  partition cost is included in the total.
* **Repeated** means the same partition answering several longitudes. The
  partition cost is charged once, the subsearches once each, and the
  **break-even** — the number of longitude queries at which the partitioned
  path first costs less than the same number of baseline searches — is
  computed and reported, not estimated.
* The workload is the same one. Same bodies, same 300-day windows, same
  target longitudes from the same reference at the same midpoints. No
  case is shortened, dropped, or re-aimed at an easier angle.
* Evaluations are the primary currency because they are deterministic.
  Wall time is reported beside them and is secondary.

## 6 · The targets

Every threshold is stated with the baseline number it came from.

**P-1 · The Moon finishes.** Both F2 and A2 reach `finished` — not
`budget-exhausted` — within the unchanged 4,000,000-evaluation
whole-request budget. *Baseline: both spent 4,000,001 and stopped.*

**P-2 · No unresolved interior.** No boundary or unresolved span may lie
wholly in the interior of the supported domain. Operationally: for every
reported boundary span, an independent sampling of the elongation over
that span must come within **0.5 degrees** of the five-degree floor. A
boundary span that never approaches the floor is a failure of the
partition, not a property of the geometry.

**P-3 · Bounded transition regions.** Total boundary width over a request
is at most **1.0 % of the requested window**. *Baseline for the same
quantity: the current search leaves 0.0004-day unresolved slivers but
only because it bisects to its 1-second enclosure floor, paying the full
pipeline per probe; the partition at 60 s measured 0.02 % on Saturn and
0.50 % on Mercury during profiling, so 1.0 % is twice the worst figure
seen.*

**P-4 · Substantial reduction.** On every conjunction-heavy case (F2, A2,
F3, F7), end-to-end cold evaluations — preprocessing, partitioning, all
subsearches, verification — are at most **one quarter** of the baseline.
*"Substantial" is defined as ≥ 4x. The domain-boundary share is 98.9-99.9 %,
so removing it entirely would be two orders; 4x is a conservative bar that
an implementation carrying real overheads should clear, and it is below
the ~5x the profiling arithmetic suggests, which is deliberate: a target
I am confident of is not a target.*

**P-5 · No material regression.** On every case with no conjunction (F6
Jupiter, F1 Sun, F10 Pluto), end-to-end cold evaluations are at most
**twice** the baseline. *"Material" is defined as > 2x. F6's baseline is
2,106 evaluations and 33 ms; doubling a cost that small is tolerable where
a tenfold rise would not be, and the partition alone measured 393
evaluations on it during profiling.*

**P-6 · No lost events, no stronger claims.** Every event the baseline
established inside a region the partition proves admissible is found
again, with the reference root inside the reported bracket and within the
unchanged 1e-3 s root tolerance. No result claims completeness over a
request containing an excluded span. No result claims exhaustiveness over
proved-admissible spans while a boundary span remains that could hold a
supported event.

**P-7 · The original score survives.** The full-window completeness score
is recomputed by the ORIGINAL rule, over the SAME twenty cases, and
reported beside the new metric. If it is not still 6 of 20, that is a
regression and is reported as one. The new metric — exhaustive over
proved-admissible subintervals — is an addition with its own denominator,
never a replacement, and the two appear together or not at all.

**Failing P-1 or P-6 fails the whole thing.** P-2 through P-5 failing is
recorded as a partial result with the measured numbers, not as a success
with a different denominator.

## 7 · The holdout, and how it is generated

The original twenty cases are now **regression and development data**.
They were opened, measured and reported; they are not an untouched holdout
for this work and are not described as one.

A fresh holdout is generated by the same section 8 construction with one
declared change — the start epoch moves from 1975-01-01 to **2007-03-15**,
and the per-body stride stays 900 days — so the windows are disjoint from
the originals in time while the construction, the bodies, the window
length and the target-longitude rule are identical. The generation
procedure is fixed here and the holdout is produced and opened **once**,
after the implementation is complete and the regression corpus is passing.

Cases where the reference refuses the midpoint geometry are skipped, as in
the original, and counted as skipped rather than folded into a
denominator.

## 8 · What this cannot establish

That the partition is correct because its tests pass. The classification
is a claim about every instant of a span, and a test is a claim about the
instants it sampled. What the tests can establish is that the two
implementations of the domain question agree where both are defined, that
the conservative bounds point the way they are supposed to, and that no
mutation of the classification survives. The soundness argument is in
`src/core/domain-partition.mjs` and rests on the same Banach contraction
and mean-value enclosures the search already uses; it is an argument, and
the tests are corroboration of it rather than a substitute for it.

That a faster search is a better one. Nothing here measures accuracy, and
the deflection layer's own verdict is unchanged: it fails its preregistered
usefulness rule at six of twenty, at a cost this work reduces but does not
justify.
