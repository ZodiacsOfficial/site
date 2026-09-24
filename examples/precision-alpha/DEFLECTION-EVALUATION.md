# validated-retarded-aberrated-deflected-of-date — declared before the holdout exists

Rung 5. This document fixes the test families, the references, the
**event-correspondence rule**, the tolerances and the resource limits
before any holdout case runs. It is written to be falsifiable: if the run
misses a root, or a case needs a tolerance this document does not already
give it, that is a result and not an occasion to edit this file.

`DEFLECTION-PROFILE.md` defines the quantity and the supported domain.
This is about measuring it.

## 0 · What has already been used, and what changed because of it

Disclosed rather than presented as untouched:

* The pointwise transformation is settled against the compiled, pinned
  `ld.c` — 1074 of 1074 components bit-identical — and the interval form
  against an independent reference. `DEFLECTION-PROFILE.md` sections 11
  and 12 record what that established and the two defects it found.
* **The three-call-site bug.** `retardedCell` is reached from three
  places and only one had the deflection arguments, so the roots were
  isolated on the undeflected function. Found and fixed before this
  document existed; section 12.5 of the profile records it.
* **The Sun as target.** The profile has always said the Sun does not
  deflect its own light. The search did not implement that: with the Sun
  as target, `q = R - S` is a difference of one enclosure with itself,
  which interval arithmetic gives as `[-w, +w]`, so `|q|` has a lower
  bound of exactly zero at every cell width and the subdivision never
  converges. Measured: 153,842 cells in 76 seconds returning nothing,
  against 75 ms for the of-date mode. Fixed by deciding it from the BODY
  rather than per cell. Declared as a required case in section 5 anyway,
  because a fix without a case that would have caught it is not covered.

None of the astronomical windows in section 8 has been run against this
rung.

## 1 · The quantity

The ecliptic longitude of date, true equinox of date as origin, of the
direction from the geocentre to a body, corrected for reception
light-time, **solar gravitational light deflection**, and stellar
aberration, in that order, reaching a requested value.

Not an apparent place. `DEFLECTED_CONTRACT.notApplied` lists what is
absent on every result.

## 2 · The control ladder

Every holdout case runs all five rungs on identical instants, observer and
target definitions, and source data:

1. `validated-geometric`
2. `validated-retarded-geometric`
3. `validated-retarded-aberrated`
4. `validated-retarded-aberrated-of-date`
5. `validated-retarded-aberrated-deflected-of-date`

Rung 5 minus rung 4 is the deflection's whole effect on this quantity.
**It is reported as a shift and never as an improvement.** Whether the
shift is toward the sky is a question this evaluation does not ask and
cannot answer.

Two further controls, through `searchDeflectedLongitudeWithControl` and
nowhere else:

* **Zero deflecting mass** (`srs: 0`). Must reproduce rung 4 exactly.
* **Distant source** (`distantSource: true`), which is `eraLdsun`'s
  approximation. Reported as the cost of not making it.

## 3 · References, and what each can settle

| reference | independent in | settles |
| --- | --- | --- |
| compiled pinned `ld.c` | language, arithmetic, implementation | the pointwise transformation. Already run |
| `test/tier-b/_deflected-reference.mjs` | code path, arithmetic, evaluation | where the roots are |
| the released `reduce.mjs` | written earlier, for production, by a different route | that the reference is not a private reading of the model |

The deflected reference is `_of-date-reference.mjs` with a deflection step
inserted between light-time and aberration, in plain doubles, with no
intervals, no enclosures, no subdivision and no domain guard. It is the
same MODEL as the solver — finite-distance `eraLd`, `e` and `em` at
reception, `q` at emission — because a reference differing by a model
would make every disagreement unattributable.

**Its independence is corroborated, not asserted.** The released
`reduce.mjs` implements the same model by a third route, and section 5
requires the reference and the released reducer to agree pointwise on
every holdout geometry to 1e-9 arcsec, with the comparison reported
whatever it shows. They differ in their limiter — `reduce.mjs` uses
`deflectionLimit: 1e-14`, the profile uses ERFA's `1e-6/max(em^2,1)` —
which is why the agreement is checked inside the supported domain, where
neither clamp fires.

The reference's own completeness is only as good as its scan step, which
is declared per body with every answer. A matching count corroborates; it
does not prove nothing was missed between two samples.

## 4 · Event correspondence, fixed before the holdout

This rung is the first with a **restricted domain**, so the rule the
earlier rungs used — pair by proximity, count the rest as missed — is not
available. It would score a region the profile declined to examine as a
failure to find roots in it.

The rule:

1. From the result, partition the requested window into **decided**,
   **excluded** and **unresolved** spans. These are disjoint and cover the
   window; `interval.decidedTdbSec` and `accounting.{excluded,unresolved}`
   give them directly.
2. Classify every reference root by the span it falls in.
3. **Only roots in decided spans are matched.** Matching pairs a reported
   event with a reference root within `MATCH_WINDOW_SEC`, by ascending
   distance over all candidate pairs — a global rule, not a greedy walk in
   list order, so the result does not depend on which list is iterated. A
   reported event matches at most one reference root and a reference root
   at most one reported event.
4. A reference root in a decided span with no match is **missed**. A
   reported event with no match is **extra**. Both count against the case.
5. A reference root in an excluded or unresolved span is **neither missed
   nor extra**. It is counted in `notExamined` and reported per case with
   its span. It does not count against, and it does not count for.
6. **Nothing is dropped silently.** `matched + missed + notExamined`
   equals the reference root count; `matched + extra` equals the reported
   event count. Both identities are asserted per case, and a case where
   either fails is a failure of the harness and is reported as one.
7. One-to-one pairing is **not** required where it is mathematically
   inappropriate. Near a tangency the reference's bisection may report one
   root where the solver brackets two, or the reverse. Where more than one
   candidate pair lies within the match window of the same item, the case
   is flagged `ambiguousPairing` and its pairing is reported in full
   rather than reduced to counts.

A root in an excluded span is the honest outcome of a restricted domain,
not a miss. **The consequence is that the event list is not exhaustive
over the requested window**, and any case with a non-empty excluded or
unresolved set is reported as a lower bound.

## 5 · Test families, declared before the cases are written

Required, each non-empty, each with its geometry established independently
of the solver's own output:

| | family | required |
| --- | --- | --- |
| T1 | zero deflecting mass reduces to rung 4 | events identical, not merely close |
| T2 | ordinary geometry, well outside the floor | completeness established |
| T3 | finite distance vs distant source | the gap reported, pointwise and at search level |
| T4 | both sides of the limiter threshold | already run pointwise; re-asserted |
| T5 | an interval containing the threshold | refused, not differentiated through |
| T6 | near-limb and obstructed geometry | excluded, with the reason naming the floor |
| T7 | the Sun as target | deflection not applied, said so on the result, and fast |
| T8 | non-empty searches, a fast body and a slow one | roots found in both |
| T9 | multiple crossings, and a stationary point | all crossings found or declared |
| T10 | a genuinely empty interval | zero events WITH completeness established |
| T11 | coverage boundaries, invalid inputs, cancellation, budget exhaustion | typed refusals, no exception escaping |
| T12 | the reference against the released reducer | agreement to 1e-9 arcsec inside the domain |

A family whose case cannot be constructed is reported as not covered. It
is not quietly dropped and it is not replaced by an easier one.

## 6 · Tolerances, budgets and limits — fixed now

Inherited from the of-date rung, unchanged, so the rungs stay comparable:

* `ROOT_TOLERANCE_SEC = 1e-3` — a reported root further than this from the
  reference is a failure.
* `MATCH_WINDOW_SEC = 1` — the pairing window of section 4.
* Reference scan step, seconds: Moon 300, Mercury 900, Venus 1800, Sun
  1800, Mars 1800, Jupiter 3600, Saturn 3600, Uranus 3600, Neptune 3600,
  Pluto 3600.
* `maxEvaluations` and `maxCells` at the package defaults: 4,000,000 and
  400,000.
* Wall clock: **300 seconds per case across all five rungs**. A case
  exceeding it is reported as exceeding it, with what it had reached.

New here, and fixed now:

* `REDUCTION_EXACT` — T1 requires the zero-mass events to be **identical
  doubles** to rung 4's, not within a tolerance. The algebra gives `w = 0`
  and `D = d`; anything else is a defect.
* The reference-versus-reducer agreement of T12: **1e-9 arcsec**, inside
  the supported domain only.

## 7 · Splits

* **Development**: the synthetic geometries of `deflection.nodetest.mjs`
  and `deflected-search.nodetest.mjs`, the pointwise ERFA vectors, and the
  two single-case probes disclosed in section 0. Already used.
* **Holdout**: section 8, opened once, not tuned against.
* **Supplementary**: anything added after the holdout opens, labelled, and
  excluded from pass and fail whatever it shows.

## 8 · The holdout rule

The same windows as all three earlier holdouts, verbatim, so every case is
comparable across five rungs. The same target rule, **with the longitude
read from the DEFLECTED reference** — the deflected longitude of a body is
not its of-date longitude, and reusing the of-date targets would silently
change which instants each case is about.

For the i-th body of the contract's ten, zero-based:

```
from       = 1975-01-01T00:00:00Z + 900 i days
to         = from + 300 days
targetDeg  = lon_deflected(body, midpoint of [from, to]), to 6 decimals
             taken from the INDEPENDENT reference, never from the solver
```

Ten cases, each with at least one crossing by construction. Ten more on
the same windows, the antipode series `A(i): (targetDeg_i + 180) mod 360`,
which exercises the path where every root of `f` is found and then
rejected by `g > 0`.

Pack: the DE440s-derived pack whose `payloadSha256` is `0a218764…` and
whose container digest is `4cc6f85a…` — the same pack, byte for byte, that
the retarded, aberrated and of-date holdouts used. Verified by digest at
the start of the run.

Reported for every case whatever it shows: status, whether completeness
was established, the correspondence counts of section 4 in full, worst
root separation, whether every matched reference root lies inside its
reported bracket, excluded and unresolved spans, cells, evaluations, wall
time, the rung-5-minus-rung-4 shift with its sign, and the largest
deflection any cell of the case admitted.

## 9 · Pass and fail

Passes if, on the holdout and the declared families together:

* every family of section 5 is covered non-vacuously, or reported as not
  covered;
* T1 reduces **exactly**;
* every holdout case either establishes completeness, or refuses with a
  typed reason, or reports a non-empty excluded set with a lower-bound
  event count — the third being a result and not a failure;
* no matched root is further than `ROOT_TOLERANCE_SEC` from the reference;
* no case reports an exact total while leaving any span unresolved or
  excluded;
* the correspondence identities of section 4 item 6 hold on every case;
* the reference and the released reducer agree to 1e-9 arcsec inside the
  domain on every holdout geometry.

**Fewer than half the holdout cases establishing completeness means the
deflection layer is recorded as not practical at this cost**, rather than
described as a success. Cases whose windows are dominated by an excluded
region count as established only if they establish it; a lower bound is a
lower bound.

## 10 · What this cannot establish

That the deflected longitude is closer to the sky than the of-date one.
Nothing here compares either to an observation or to an independent
ephemeris. The reference shares the model with the solver by design, so
agreement measures implementation and not physics.

The first-order model's own omitted second-order term is measured in
`DEFLECTION-PROFILE.md` section 0 and is larger, near conjunction, than
every implementation difference this evaluation can see. Inside the
supported domain it is 4.23e-7 arcsec at the floor.

A shift is a shift. Rung 5 minus rung 4 is what the correction does, not
what it is worth.
