# Evaluation results

Run 2026-09-20 against the plan in `EVALUATION-PLAN.md`, committed at
`9ae78ba7` **before this harness existed**. The plan file has one commit
and no diff since.

**This document was rewritten after an adversarial review of the first
version.** That review found that several of the plan's rules were not
implemented as written — including a declared regression case that had
been silently replaced with a different one — and that the first write-up
asserted the opposite. Every correction is below, named. Nothing in the
plan was changed; the harness was changed to match it.

Harness: `tools/measure/evaluate-search.mjs`. Raw output:
`docs/platform/evidence/precision-2026-09-20/raw/search-evaluation.json`.
Pack `c9ebc641…` (DE440s, 1849-12-25 … 2150-01-21), Node v22, one machine,
one run, one process, no warm-up, no repetition, and each mode's timing
preceded by its own quarter-million-evaluation reference scan.

## What the first version got wrong

| # | what | now |
| --- | --- | --- |
| 1 | **A2 was not the case the plan declared.** The plan named "the original alpha contract case on pack D" — `D-Uranus2020`, target **32.6940395°** over **2019-01-01 … 2020-12-31**. The harness ran Uranus **30°** over **2010 … 2020**, and this document said the original was preserved. | The declared case runs as **A2**. The substitute runs beside it as **A2b**, labelled. Both score 0/0. |
| 2 | **No accuracy figure was reported anywhere.** The tables had missed, extra, support, evaluations, latency and heap, and no column for how close the events landed. | A residual column, and the bracket widths, below. |
| 3 | **The `unresolved` rule was narrowed.** The plan ends "…or finished with `support: 'none'` while the reference found events". The harness added `&& events.length === 0`, removing the clause aimed at the empirical mode's own worst case. | The plan's rule, verbatim. |
| 4 | **The grid phase offset was not the declared one.** The plan says "offset by φ = 0.381966 of a step"; the code wrote `(i + φ − 0.5)`, an offset of −0.118. | The declared offset. The tail gap it leaves is measured and reported per case. |
| 5 | **The boundary-root rule was not implemented.** The plan: "roots within 1 second of an interval endpoint are recorded as boundary roots". The code tested `|f| < 1e-12` at two grid points, and reported 0 in every row it ever produced. | The declared 1-second proximity rule. |
| 6 | **C7's third clause was missing.** "…and the events it did find are real" was never checked. | Checked against the same dense reference. |
| 7 | **C10 accepted any error code.** `maxEvaluations: -1` refused as `unknown-body` would have passed. | Each case names the code it must get, and two more cases were added. |
| 8 | **The heap metric could not be non-zero for short runs.** Sampled only every 2000 signal polls, so a run of 18 evaluations took no sample and reported exactly 0.000 MiB. | Sampled at the end too. It is still a `heapUsed` delta at two instants, not a peak, and it moves with GC timing. |
| 9 | **20% of the structural comparisons were empty-vs-empty** and counted as passes without saying so. | Counted and reported as vacuous. |
| 10 | **`epsilonDeg = 1/3600` is the harness's own choice**, not the plan's, and it sets the empirical mode's bracket widths. | Stated here and in the JSON. |

## Summary

| | empirical-apparent | validated-geometric |
| --- | --- | --- |
| cases scored | 13 | 13 |
| missed events | **0** | **0** |
| extra events | **0** | **0** |
| unresolved cases | **0** | **0** |
| usefulness failure (>25% unresolved) | no | no |
| reference roots matched | 53 | 53 |
| **worst residual, event vs reference** | **0.0868 s** | **4.90e-5 s** |
| **worst reported bracket** | **5495 s** | **6.44e-4 s** |
| median latency | 13.5 ms | 1.3 ms |
| total evaluations | 34,163 | 5,694 |
| structural comparisons | 110 | 110 |
| — of which empty vs empty | **22 (20%)** | **22 (20%)** |

Both modes hit the declared accuracy target — zero missed, zero extra — on
every case, including the contract case that was previously skipped.

**The empirical mode's real agreement is 1.4e-2 to 8.7e-2 seconds**, not
the 1-second matching gate. At a 1 ms tolerance it would fail every case.
That number belongs next to "0 missed, 0 extra", and in the first version
it was absent.

**Its brackets are wide**, and the bracket is the declared uncertainty:
48 s on the Sun, 85 s on Mercury, 223 s on Jupiter, 641 s on Saturn,
**1587 s on Uranus**, and **5495 s — an hour and a half — on the A2
contract case**, whose passes sit near a station where longitude barely
moves. The bracket follows from `epsilonDeg = 1/3600`, which the harness
chose. A reader should not see "0 missed" beside a 90-minute bracket
without being told.

## Is the reference good enough to check the brackets? Not as declared.

15 of the validated mode's 53 matched roots fell **outside** its reported
bracket and matched only through the plan's "widened by one bracket width"
clause. That looked like false precision in the mode. It is not:

- the declared reference bisects to **1e-9 day = 8.64e-5 s**;
- the validated mode's brackets are about **8e-5 s**.

**The truth source is no more precise than the thing it checks.**

So, added after seeing that and labelled as added, a supplementary pass
re-bisects each matched root to **1e-14 day** and asks again:

| mode | roots inside the reported bracket | outside | worst residual |
| --- | --- | --- | --- |
| empirical-apparent | **53** | 0 | 8.68e-2 s |
| validated-geometric | **53** | 0 | 3.96e-5 s |

Every root is inside. The widening clause was carrying the reference's
imprecision, not the mode's. The declared scoring above is untouched.

## A · Regressions

### empirical-apparent

| # | body | target | ref | found | missed | extra | support | est. | worst residual | evals | ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | Moon | 100° | 13 | 13 | 0 | 0 | conditional | no | 6.65e-02 s | 8643 | 92.9 |
| A2 | Uranus | 32.6940395° | 3 | 3 | 0 | 0 | conditional | no | 8.28e-02 s | 1212 | 12.1 |
| A2b | Uranus | 30° | 3 | 3 | 0 | 0 | conditional | no | 7.33e-02 s | 1464 | 13.5 |

### validated-geometric

| # | body | target | ref | found | missed | extra | support | est. | worst residual | evals | ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | Moon | 100° | 13 | 13 | 0 | 0 | **proven** | yes | 4.90e-05 s | 1511 | 6.2 |
| A2 | Uranus | 32.6940395° | 3 | 3 | 0 | 0 | **proven** | yes | 3.17e-05 s | 185 | 2.5 |
| A2b | Uranus | 30° | 3 | 3 | 0 | 0 | **proven** | yes | 3.17e-05 s | 277 | 3.7 |

A1 is the case the recorded harness once answered **2** for. Both modes now
find 13, the dense scan finds 13, and the validated mode proves 13 is all
of them.

A2 is the pinned contract case, and it is the hard one: its content is a
pass essentially on the 2020-01-01 crop boundary and two passes near a
station. It is also where the empirical mode's 5495-second bracket comes
from. A2b — the window this harness ran instead, ending exactly at that
crop boundary — excludes those two passes. The substitution was not needed
to pass; it removed the only difficult geometry in the regression set.

A3 and A4, the 96-turn and 95-turn aliasing counterexamples, live in
`test/tier-a/angle-counterexamples.nodetest.mjs` and are run by the tier-A
suite, not this harness. They are synthetic angles, not pack bodies.

## B · Holdout

Ten cases generated by the plan's rule and not touched since.

### empirical-apparent

| # | body | target | ref | found | missed | extra | worst residual | worst bracket | evals | ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| H1 | Sun | 13° | 2 | 2 | 0 | 0 | 6.98e-02 s | 48.7 s | 1534 | 16.9 |
| H2 | Moon | 50° | 18 | 18 | 0 | 0 | 6.65e-02 s | 3.5 s | 10926 | 87.8 |
| H3 | Mercury | 87° | 4 | 4 | 0 | 0 | 1.38e-02 s | 84.8 s | 2048 | 24.2 |
| H4 | Venus | 124° | 2 | 2 | 0 | 0 | 8.68e-02 s | 45.5 s | 1575 | 15.3 |
| H5 | Mars | 161° | 1 | 1 | 0 | 0 | 1.66e-03 s | 77.7 s | 1449 | 13.7 |
| H6 | Jupiter | 198° | 1 | 1 | 0 | 0 | 3.77e-02 s | 223 s | 987 | 12.8 |
| H7 | Saturn | 235° | 3 | 3 | 0 | 0 | 4.06e-02 s | 641 s | 1136 | 10.0 |
| H8 | Uranus | 272° | 3 | 3 | 0 | 0 | 7.13e-02 s | 1587 s | 1398 | 12.3 |
| H9 | Neptune | 309° | 0 | 0 | 0 | 0 | — | — | 909 | 7.9 |
| H10 | Pluto | 346° | 0 | 0 | 0 | 0 | — | — | 882 | 5.9 |

### validated-geometric — every case proven

| # | body | target | ref | found | missed | extra | worst residual | evals | ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| H1 | Sun | 13° | 2 | 2 | 0 | 0 | 4.90e-05 s | 152 | 1.4 |
| H2 | Moon | 50° | 18 | 18 | 0 | 0 | 4.90e-05 s | 2183 | 1.3 |
| H3 | Mercury | 87° | 4 | 4 | 0 | 0 | 3.14e-05 s | 527 | 1.4 |
| H4 | Venus | 124° | 2 | 2 | 0 | 0 | 3.14e-05 s | 317 | 0.9 |
| H5 | Mars | 161° | 1 | 1 | 0 | 0 | 4.90e-05 s | 108 | 0.6 |
| H6 | Jupiter | 198° | 1 | 1 | 0 | 0 | 3.15e-05 s | 65 | 0.6 |
| H7 | Saturn | 235° | 3 | 3 | 0 | 0 | 3.16e-05 s | 171 | 0.9 |
| H8 | Uranus | 272° | 3 | 3 | 0 | 0 | 3.70e-05 s | 161 | 1.3 |
| H9 | Neptune | 309° | 0 | 0 | 0 | 0 | — | 18 | 0.5 |
| H10 | Pluto | 346° | 0 | 0 | 0 | 0 | — | 19 | 0.6 |

### What this holdout cannot do

It was generated by rule so it could not be chosen to flatter the result.
The same property means it cannot stress it:

- **It can never violate the empirical mode's rate ceiling.** That ceiling
  is 20°/day and it is what the mode's whole conditional claim rests on.
  The fastest of the contract's ten bodies is the Moon at ~13.2°/day, and
  the holdout is the contract's ten bodies by construction.
- **It contains no tangency, no close pair, and no root at a window
  boundary.** Those are the geometries the milestone exists for, and they
  are covered only by the synthetic tier-A suite.
- **Two of the ten are decades from their target**: Neptune never gets
  within 15.96° of 309°, Pluto never within 97.94° of 346°. Their proven
  zeros are true and useful, and they are not near misses. They also
  supply the 22 empty-vs-empty structural comparisons.

## C · Structural invariants

110 comparisons per mode, all passing, **22 of them (20%) empty vs empty**
— the four Neptune and Pluto case-modes, where every set comparison is
between two empty arrays.

| check | what it fixes | notes |
| --- | --- | --- |
| C1/2, C1/3, C1/7 | the same window split in 2, 3 and 7 parts, under the `[from, to)` convention | the strongest check here: it forces new piece boundaries in the validated mode and a fresh branch scan in the empirical one |
| C2 | the boundary convention itself | **never triggered.** The closest any event came to an internal cut was 37 hours; the deduplication branch fires at ≤ 1 s. Reported here rather than folded into C1's pass count |
| C3, C4 | target ± one and ± two whole turns | tests one line: `((t % 360) + 360) % 360`. Bit-identical results, identical cell and evaluation counts. Not nothing, but not 60 independent checks |
| C5 | window shifted 37 days, events inside the overlap | substantive: 37 days is not a multiple of the record interval |
| C6 | `probeSamples` 97/193/385 (empirical), `minWidthSec` 1e-3/1e-4/1e-5 (validated) | substantive for the empirical mode (evaluations move 1534 → 2877 → 5564 on H1). For the validated mode the parameter's whole effect is bounded by 1e-3 s against a 1 s tolerance, so that half cannot fail |
| C7 / C7b | budget exhaustion, at the plan's 500 and at half the case's own cost | now also checks that the events a cut-short run returned are real |
| C8 / C8b | cancellation, at the plan's poll 300 and at half the case's own polls | |
| C9 | a normal search straight after a cancelled one | compares instants only; a corrupted `established` would pass |
| C10 | five bad inputs, each with the code it must be refused with | |

### The additions made after seeing results

**C7b and C8b.** The plan fixed literal constants — a 500-evaluation budget
and an abort at poll 300. The validated mode answers some 500-day cases in
**18 to 319 evaluations** (the first version of this document said "18 to
173", which understated the range), so the budget is never spent and the
abort never fires. Those runs are neither passes nor failures: the case
cannot exercise the invariant, and the harness reports **not exercised**
with the cost that made it so. C7b and C8b scale the limit to each case's
own measured cost so all twenty runs exercise it. The declared C7 and C8
are unchanged and reported beside them.

**The supplementary fine reference**, above.

Both are changes to the *measurement*. No target, tolerance or scoring rule
was altered.

## What "cheaper" means, precisely

The validated mode's median is 1.3 ms against the empirical mode's 13.5 ms.
That ratio is **mostly the cost of the quantity**, not of the method:

| | per evaluation |
| --- | --- |
| `apparent()` — light-time, aberration, deflection, precession, nutation | **7.92 µs** |
| geocentric geometric state pair | **0.93 µs** |

8.5× of the difference is there. The first version of this document said
"the stronger claim is not being bought with compute" — which only holds
if the two quantities are comparable, and the same paragraph said they are
not. The honest statement is the inversion: **the proof is available
because the quantity was made cheap enough to be a polynomial.**
Light-time, aberration, deflection, precession and nutation were removed;
that is what makes it provable, and it is the same thing that makes it
fast.

Nor is the claim "strictly stronger". A proof about geometric J2000 and a
conditional statement about apparent-of-date are **incomparable**, not
ordered. The two differ by minutes of time — for the Sun, about eight
hours between the crossings.

## Independence of the reference, precisely

The plan calls it "a dense independent scan of the same function". The
first version of this document called it "corroboration between two
independent methods", which claims more. Traced:

- **Empirical mode.** The reference calls `rt.apparent(body, tt,
  CORRECTED)` — the *same function with the same options* the search
  calls. Light-time, aberration, deflection, frame bias, precession,
  nutation, TDB−TT and the record decode are all shared. The reference
  tests the bracketing and bisection layer and nothing else.
- **Validated mode.** The reference builds the geocentric vector from
  `ephemeris.state()` and takes an `atan2`; the search evaluates
  `f = sinλ·X − cosλ·(cosε·Y + sinε·Z)` from the coefficients. Not shared:
  the algebraic form and the root-finding. Shared: the pack bytes, the
  decode, the record-index selection, EMRAT, and the obliquity constant.

So a wrong EMRAT, a wrong record index, a wrong nutation term or a
mis-decoded field is **invisible to this evaluation by construction**.
Agreement with the kernel and with Swiss is measured elsewhere
(`FOUR-CONFIGURATIONS.md`, `DEFLECTION-AUDIT.md`); this exercise is about
the search layer.

## What changed in the implementation because of this evaluation

**Cancellation is now a result, not an exception**, in both modes.
`cancelled` is one of the four execution states the contract names and
nothing could produce it. A cancelled result has `finished: false`,
`established: false` and `support: 'none'`; the validated mode carries out
the events it had already isolated.

One limitation stays, stated rather than fixed: on the **empirical** mode a
cancelled or budget-exhausted run reports through the empty-result shape
and returns **zero** events even when segments had been decided.

Separately, an adversarial review of the contract found two false exact
totals and two false execution states, all fixed with tests; see the commit
"Fix two false exact totals and two false execution states". The
`established: true` figures above were re-measured after those fixes.

## What is still not measured here

Agreement with the sky, with Swiss Ephemeris, with any other ephemeris, or
with `/birth-chart/`. Latency on any machine but this one, or on any run
but this one. Behaviour on a pack other than `c9ebc641…`. Any body outside
the contract's ten. Anything about WebKit.
