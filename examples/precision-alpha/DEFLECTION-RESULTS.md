# validated-retarded-aberrated-deflected-of-date — the holdout, run

The rule is `DEFLECTION-EVALUATION.md`, committed and pushed before any of
this ran. Its thresholds and tolerances are untouched. One thing below
does amend it — §4 had no clause for an unfinished run, and the harness
grew one — and that amendment is stated where it happens rather than
denied here; it lives in the harness, not in the preregistration, and it
moved reported counts. An earlier version of this line said "nothing below
amends it", which was the wrong sentence to open a results document with.

Two bounded AI reviews were run over the whole branch after it was
written, and they corrected several things in this document — including
how the Moon result is explained. What they found, what was done, and what
was declined is recorded at
`docs/platform/evidence/precision-deflection/review/REVIEW.md`. The verdict
below is unchanged by any of it.

## The verdict

**FAIL.** Six of twenty holdout cases establish completeness over their
requested window. Section 9 of the preregistration fires on that:

> Fewer than half the holdout cases establishing completeness means the
> deflection layer is recorded as **not practical at this cost**, rather
> than described as a success.

So that is the record. The rest of this document says what is and is not
working underneath it, because "fail" is a verdict and not an explanation.

## Two runs, and what changed between them

The holdout was invoked three times. The first threw on all twenty cases
before computing anything — rung 1 takes TT days where rungs 2 to 5 take
TDB seconds — and produced no case outcomes; it is preserved as
`holdout/attempt0-harness-fault.json`.

**Run 1** is the holdout as preregistered. It reported six problems.
**Run 2** is the same run with three defects in the APPARATUS fixed. It
reports one.

| | run 1 | run 2 |
| --- | --- | --- |
| cases established | 6 of 20 | 6 of 20 |
| problems | 6 | 1 |
| verdict | FAIL | FAIL |

The three fixes could not have changed the verdict and did not: `established`
is read from each result, not from the correspondence rule, and no fix
touched the solver. **Run 2 is not a preregistered success and is not
described as one.** It is the same failure with the measuring apparatus
working.

What was wrong with the apparatus:

1. **T12 compared two different quantities.** The released reducer's
   `apparent()` aberrates both of its outputs, so its
   deflection-on-minus-off separation is measured AFTER aberration. The
   reference's `deflectionArcsec` was measured BEFORE it. Aberration
   changes a small angle by order `|v|/c`. Measured: 9.1e-6 relative on
   Neptune, 1.0e-4 on the Moon — which is exactly the 8.15e-7 arcsec
   "disagreement" run 1 reported. Like for like the two agree to
   **2.85e-10 arcsec** over 349 geometries, inside the preregistered 1e-9.
   The tolerance was right; the instrument was wrong.
2. **The reduction control selected the wrong case.** It took the first
   case with events, which was the Moon — the one case where neither side
   establishes anything — and duly reported itself vacuous. It now selects
   a case that established.
3. **Section 4 had no clause for an unfinished run.** With the budget
   exhausted there are no decided spans at all, so nothing was matchable
   and every reported event fell through to `extra`. The Moon's five
   events were counted as spurious. They are not: matched without the span
   filter they pair with real reference roots to 3.03e-4 s. The amendment
   is stated in the harness — an unfinished run matches against all
   reference roots, is marked `runUnfinished`, and its counts are
   INDICATIVE and skipped by the pass rule.

## What is correct

Over the eighteen cases that finished:

| | |
| --- | --- |
| reference roots matched | 15 |
| **missed** | **0** |
| extra | 0 |
| in an excluded span, so not examined | 1 |
| worst root separation | **6.023e-5 s** against a 1e-3 tolerance |
| every matched root inside its reported bracket | yes |
| correspondence identities (section 4 item 6) | hold on every case |

Not one root that the profile undertook to find was missed, and not one
reported event was spurious. Where this mode answers, it answers correctly.

The two Moon cases exhausted their budget, so their counts are indicative:
5 matched, 17 unfound, 0 spurious. The roots it did find are real, to
3.03e-4 s. It ran out of budget; it did not go wrong.

## What is restricted

Twelve of the eighteen finished cases have an excluded span — a region
inside the five-degree floor that the profile declines to answer for.

| body | excluded | decided |
| --- | --- | --- |
| Mercury | 37.08 d of 300 | 0.8763 |
| Venus | 38.94 d | 0.8702 |
| Mars | 32.06 d | 0.8931 |
| Saturn | 11.09 d | 0.9630 |
| Uranus | 10.39 d | 0.9654 |
| Neptune | 10.14 d | 0.9662 |
| Sun, Jupiter, Pluto | none | 1.0000 |

So a 300-day window round a planet contains a solar conjunction most of the
time, and 3 to 13 per cent of it is then unanswerable by construction. That
is the profile working as specified, and it is also why fourteen cases
cannot claim completeness over their request.

**It costs less in events than in claims.** Of 38 reference roots across
the holdout, exactly **one** fell inside an excluded span (F4, Venus). The
other windows' excluded regions contained no crossing of the requested
longitude, because the targets are set at window midpoints rather than at
conjunctions. A reader should not read "14 cases could not establish
completeness" as "14 cases lost events".

## What is expensive

| | evaluations vs the of-date rung |
| --- | --- |
| windows with no conjunction (Sun, Jupiter, Pluto) | 1.0x to 4.0x |
| windows containing one (Saturn, Uranus, Neptune) | 47x to 61x |
| Venus, Mars | 318x, 418x |
| **Mercury** | **831x** |
| whole holdout | **24.6x** (13,807,404 against 560,968) |

The deflection arithmetic is nearly free. **Isolating the domain boundary
is not.** Mercury has five conjunctions in 300 days and therefore ten
boundaries to bisect. It is the most expensive case that finished, by
**3.7x** over the next in evaluations (1,917,153 against Venus's 515,262)
and **2.0x** over the next as a multiple of the of-date rung (831x against
418x). Only the Moon cost more, and the Moon did not finish.

### The Moon: ten conjunctions, and a number this document misread

The two Moon cases each spent the whole 4,000,001-evaluation budget over
157,818 cells — 74.4 s for F2 and 76.5 s for A2 — and returned **2 and 3**
of their eleven reference roots. Five matched and seventeen went unfound
across the pair. Both ended `budget-exhausted`, so both are marked
`runUnfinished` and their correspondence counts as indicative.

**An earlier version of this section explained that wrongly, and the
correction is worth more than the original was.** It read
`closestElongationDeg: 5.000010` off the row and concluded that the
geometry "skims the floor without crossing it". It does not. That field is
the largest `cosElongation.hi` over the cells the search **accepted** — a
rigorous lower bound on the closest elongation over the decided region,
and not a property of the geometry. This repository says so in three other
places, including on the result itself
(`closestElongationIsAReport: true`), and the section read it as a
measurement anyway.

The geometry, measured independently — `astronomy-engine`, 10-minute steps
over F2's window, `holdout/moon-window-elongation.mjs`:

| | |
| --- | --- |
| passages below 5 degrees | **10** |
| total time below the floor | 118.7 hours, 4.94 days |
| closest approach | **0.381 degrees**, 1977-10-12T20:30Z |

The run's own row agrees that the floor is crossed: `excludedRuns: 1`,
`excludedCells: 1536`. A cell is excluded only when the whole of it is
*proved* inside the floor, so those 1,536 cells are a demonstration that
the geometry goes there.

The right reading is the opposite of the old one, and it is Mercury's
mechanism rather than a new one. **The Moon is the most expensive geometry
in the holdout because it has ten conjunctions in 300 days, not five, on
the fastest-moving body in the contract.** It ran out of budget with one
span excluded (0.0117 d) and two unresolved runs over 30,380 cells — it
never reached the other nine passages. Mercury's five conjunctions cost
831x and finished; the Moon's ten did not.

That is still a statement about a hard floor rather than about this
floor's value: twenty boundaries to isolate is twenty wherever the floor
sits. What it is *not* is a pathology peculiar to grazing, and this
document should not have said it was.

## The controls

* **T1, zero deflecting mass.** On Jupiter: the events are **identical
  doubles** to the of-date rung's, completeness established on both sides,
  and the real mass does move the events — so the reduction is exact and
  the control is not vacuous.
* **T3, distant source.** `eraLdsun`'s approximation moves an event time by
  **0.181 s** on the same case. That is the cost of the approximation this
  profile declines to make, at search level rather than pointwise.
* **T12, the reference against the released reducer.** 2.85e-10 arcsec
  worst over 349 geometries, every body between 4.5e-11 and 2.8e-10. The
  reference is not a private reading of the model.
* **Rung 5 minus rung 4.** Worst event-time shift across the holdout:
  **0.791 s**. A shift is a shift. Nothing here says it is toward the sky.

## The families of section 5

| | family | outcome |
| --- | --- | --- |
| T1 | zero mass reduces | exact, Jupiter and tier A |
| T2 | ordinary geometry | six holdout cases plus tier A |
| T3 | finite vs distant source | 0.181 s at search level; 1.5554 arcsec pointwise |
| T4 | both sides of the limiter | pointwise, `deflection.nodetest.mjs` |
| T5 | interval containing the threshold | refused, not differentiated |
| T6 | near-limb and obstructed | excluded, reason names the floor |
| T7 | the Sun as target | not deflected, said so, 24 ms |
| T8 | fast and slow bodies | Mercury through Pluto, all ten |
| T9 | multiple crossings | tier A, cone geometry |
| T9 | **stationary point** | **declared in section 5 and not implemented until after run 1.** Now in `test/tier-b/deflection-families.nodetest.mjs`, on a real Mars station, and it passes. Recorded here rather than presented as having been there |
| T10 | genuinely empty interval | zero events WITH completeness |
| T11 | refusals, cancellation, budget | typed, none escaping |
| T12 | reference vs released reducer | 2.85e-10 arcsec |

## One field that can be misread

`diagnostics.deflection.widestDeflectionArcsec` reaches **0.161 arcsec** on
the Neptune cases. The largest deflection the supported domain admits is
**0.094847 arcsec**, from the closed form. The reported figure is not
wrong: it is the ENCLOSURE's upper bound, and the enclosure is loosest
exactly at the floor, where `e x q` is closest to cancelling. It is an
upper bound on a cell, not a value at an instant, and a reader could take
it for the latter. The `uncertainty.deflection` block says so; the
diagnostics field does not, and should.

## What this does not establish

That the deflected longitude is closer to the sky than the of-date one.
The reference shares the model with the solver by design, so agreement
measures implementation and not physics. Nothing here compares either to an
observation or to an independent ephemeris.

The first-order model's own omitted second-order term is 4.23e-7 arcsec at
the domain floor and 2.08e-3 arcsec at 0.3 degrees — larger, near
conjunction, than every implementation difference this evaluation can see.

And the verdict is about a 300-day window. A consumer asking a narrower
question — "when in March does Mars reach this longitude" — may never meet
a conjunction, and for such a window the mode establishes completeness at
one to four times the rung below. The preregistered criterion was fixed on
300-day windows and is not restated here to suit the answer; it is simply
worth knowing which question the criterion was about.
