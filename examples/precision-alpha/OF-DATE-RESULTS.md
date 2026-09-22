# validated-retarded-aberrated-of-date — what it does and what it cost

The record for `OF-DATE-PREREGISTRATION.md`. Rung 4 of the ladder: the
same light-time-and-aberration-corrected direction as rung 3, expressed in
the **mean ecliptic of date with its origin at the true equinox of date**
rather than in a fixed frame twenty-six years of precession away.

Still **not an apparent place**. Gravitational deflection, the Shapiro
delay and everything topocentric are absent, and `notApplied` on every
result says so. What this adds over rung 3 is the frame, and nothing else.

---

## 1 · The frame, and the cancellation that shapes it

    R(t) = R3(-(psib + dpsi)) . R1(phib) . R3(gamb)

the IAU 2006 Fukushima-Williams angles **with frame bias included**
(`eraPfw06`), plus IAU 2000B nutation in longitude adjusted to P03.

**The obliquity cancels exactly.** `eraEcm06` is `R1(obl06) . eraPmat06`,
and the `R1(epsa)` inside `eraFw2m` meets its inverse; what survives is the
three rotations above. So `epsa` and `deps` never enter the ecliptic
projection, and the of-date `f` and `g` carry no obliquity factor at all —
unlike rungs 1 to 3, which put `cos(e0)` and `sin(e0)` into the projection
by hand because their frame is fixed.

Verified rather than asserted: the released chain and the interval chain
agree to **2.2e-16** per matrix element, and the published ERFA `t_ecm06`
matrix is reproduced to **1e-14** in every one of its nine elements at
ERFA's own test epoch, each inside the interval enclosure.

**It is the mean ecliptic, true equinox.** Nutation is a motion of the
equator, not of the ecliptic. "True ecliptic of date" is not a frame this
construction produces and the phrase appears nowhere. Dropping `dpsi`
gives the **mean** equinox. The two rungs are separated by the nutation in
longitude, which over 1950–2100 runs from −18.96″ to +18.89″ **and passes
through zero** — so it is not a fixed 17 arcsec, and it is a different
rung rather than a tolerance. `frame-of-date.nodetest.mjs` asserts that at
the ERFA test epoch the gap lies between 1 and 20 arcsec (measured
16.09″), which is three orders from the 23 mas frame bias it must not be
confused with.

### The model pairing is this repository's, not ERFA's

ERFA and SOFA ship **no** 2000B-with-2006 chain: their IAU 2006 routines
are 2000A-based (`eraNut06a`, `eraPnm06a`) and there is no `eraNut06b` or
`eraPnm06b` anywhere in the library. The pairing is the released reducer's
own choice and is reproduced here so the experimental and released chains
are one model rather than two. A 2000A reference would differ by a model,
and that difference must never be read as a defect.

The 2000B-versus-2000A gap, measured on this repository's own corpus:
**0.0027 arcsec** of ecliptic longitude over 15 010 body-epochs, and
0.0035 arcsec in the nutation in longitude itself
(`docs/platform/evidence/precision-2026-09-20/numerics/RESULTS.md`). An
earlier draft of the contract said "about 0.001 arcsec", conflating that
with the **1 milliarcsecond POLE** accuracy `nut00b.c` quotes. Two
different quantities; the contract now carries the right one.

Pinned sources: **IAU SOFA Issue 2023-10-11** and its ERFA equivalent
**liberfa v2.0.1** (tagged 2023-10-13).

### What has a published matrix, and what does not

| rung | external check |
| --- | --- |
| mean ecliptic, **mean** equinox | IS `eraEcm06`'s frame. Published 3x3 `t_ecm06` reproduced to 1e-14, inside the enclosure |
| mean ecliptic, **true** equinox — **the one this mode uses** | **no published matrix exists.** `eraEcm06`, `eraEceq06` and `eraEqec06` are all mean-equinox; ERFA ships none |

The true-equinox rung is checked by construction, by its separation from
the mean rung (the nutation in longitude, up to about 19 arcsec and
periodically near zero), and against the released reducer. That is a
weaker external check than the mean rung has, and nothing below describes
the two as equally checked.

#### The construction now has an exact identity, not an order of magnitude

The separation test only said the two rungs differ by *between 1 and 20
arcsec*. A construction that leaked the obliquity, tilted the ecliptic
pole, or turned about the equatorial pole instead would still land in that
window. There is an exact relation available, and it is now asserted:

    Frame_true(t) = R3(-dpsi(t)) . Frame_mean(t)

The true equinox is the mean equinox displaced **along the mean ecliptic**
by the nutation in longitude — that is what the nutation in longitude
*is* — so the two frames share the ecliptic pole and one is the other
turned about it. The implementation does not do that: it folds `dpsi` into
the Fukushima-Williams `psi` angle and builds one matrix from three
rotations. Measured over nine epochs spanning 1850 to 2150:

| | |
| --- | --- |
| off-pole residual (is it a rotation about the ecliptic pole at all?) | **≤ 1.1e-16** |
| turn angle against −`dpsi` | **≤ 1.3e-12 arcsec**, which is 0.03 of an eps radian |
| at ERFA's `t_ecm06` epoch, against the **published** matrix turned by −`dpsi` | every element within **1e-14**, and inside the interval enclosure |

The last row is the only one that touches something external, and it is
why this is worth having: at that epoch the true-equinox matrix follows
from nine published literals plus one scalar and one elementary rotation,
assembled without any of the Fukushima-Williams chain's code — though
`dpsi` is still that chain's, which is the blind spot two paragraphs down.

What the first two rows pin, stated precisely, is that **`dpsi` enters
`psi` additively and enters nothing else**. Both sides of that identity
come from `frameMatrixInterval`, so it is an algebraic consequence of one
line of the implementation rather than a second implementation of the
frame. That line is where every structural way of getting this rung wrong
would show, which is why it is worth an assertion — but "identity" should
not be read as "independent route".

Four mutations were run to check the identity bites: flipping the sign of
`dpsi` in the `psi` angle (caught by the turn-angle and published-anchor
tests), prepending an `R1(deps)` to the matrix (the off-pole test), moving
`dpsi` onto `gamb` instead of `psi` (eight failures), and removing the P03
adjustment — caught by neither identity test, which is the next
paragraph.

**What it does not establish, and this is the part that matters.** `dpsi`
is this repository's 2000B-with-P03 value on **both sides** of the
identity, so a consistently wrong `dpsi` is invisible to it. That is not a
conjecture: removing the P03 adjustment from the implementation leaves the
identity passing, and is caught only by a separate test that reads the
adjusted and raw values apart. The mean rung has no such blind spot —
one published matrix pins its model and its assembly at once. Here they
are pinned by two different tests, `t_nut00b` for the raw series and the
identity for the assembly, and two tests covering two things is not the
same as one test covering both.

**The distinction therefore stands.** The true-equinox rung is better
checked than it was and is still not checked the way the mean rung is.

## 2 · Time scale, and the three error sources kept apart

TDB in and out, as the other three rungs. Unlike them, **the frame needs
TT**, and the conversion is a declared model.

    Q(t)  = R(t) P(t)
    Q'(t) = R'(t) P(t) (dt/dTDB) + R(t) P'(t)

`R'` is per TT century while the search's variable is TDB seconds, so
`dt/dTDB` belongs on the `R'` term and nowhere else. Rotating `P'` alone
would be the derivative of a different function; freezing `R` at the cell
midpoint would not be an of-date search at all. §6a S5b and S6 make both
into cases rather than leaving them as prose.

Three sources, reported on every result as `uncertainty.timeScale`, and
never summed:

| source | bounded | measured on the holdout |
| --- | --- | --- |
| implementation, numerical | yes, proven | frame enclosure **3.00 arcsec** on the widest accepted cell, which is **32 days** wide |
| conversion approximation | yes | **1.4e-10 arcsec**: the model's stated 3e-5 s carried into longitude through the frame's own rate |
| external time model | **no** | stated, never bounded here |

The middle row is the point of separating them. A reader given "3e-5 s"
alone cannot tell whether thirty microseconds of time error matters to a
longitude; carried through the frame's own rate it is a tenth of a
nanoarcsecond, and no amount of tightening the intervals would shrink it,
because it is a property of the model and not of this code.

The first row is the honest cost, and the cell it belongs to is part of
it. The widest accepted cell on this holdout is **32 days** (F10, Pluto,
2 764 800 s), and the result now reports that width beside the span,
because a span without its cell means nothing — the interval evaluation
grows with the cell, and an earlier draft of this paragraph said "three
arcseconds on a day-wide cell", wrong by a factor of thirty in the width.

Measured over F10's own window:

| cell | enclosure span | true variation over the same cell | ratio |
| --- | --- | --- | --- |
| 32 days | 3.007″ | 0.924″ | 3.3× |
| 1 day | 0.258″ | 0.049″ | 5.2× |

So the interval evaluation of the 77-term series overestimates by a factor
of three to five, not by orders. It costs nothing here: the cells that
decide roots are narrow, and every holdout case still closed.

**Supported range**: 1900-01-01 to 2100-01-01, IAU 2000B's own span,
intersected with the pack's coverage. The search does not refuse outside it
— refusing would make the two of-date rungs disagree about what a window
means — but every result carries `requestWithinModelRange` and a line
saying what lapses: the enclosures still hold **about the model as
implemented**; the claim that the model represents the sky does not.

## 3 · The holdout

Twenty cases by the rule in §9a, committed before the harness that
generated them existed. Opened once, not tuned against. Pack used locally
and not redistributed: payload `0a218764…`.

| | |
| --- | --- |
| cases establishing completeness | **20 / 20** |
| roots found / reference roots | **38 / 38** |
| missed / extra | **0 / 0** |
| worst root separation | 3.3e-4 s (tolerance 1e-3 s) |
| every reference root inside its bracket | yes, over 38 matched roots |
| unresolved intervals | none |
| worst frame-ladder residual | 6.2e-4 s (tolerance 2e-3 s) |
| cost | 561 100 evaluations, 20 986 cells, 6.9 s |

**The frame costs 2.2 % more search work.** Rung 3 on the same twenty cases
costs 548 866 evaluations; rung 4 costs 561 100 — for a date-dependent
rotation, its derivative, a time-scale conversion and its derivative, all in
interval arithmetic with validated trigonometry.

Two caveats, because this is the figure a reader would take furthest.
`evaluations` counts EPHEMERIS evaluations, and the frame chain runs per
cell rather than per evaluation, so this is the metric the frame least
affects — it is a statement about subdivision, not about compute. And wall
time is no substitute: the two rungs run in the same process and rung 3
measured *slower* (7 873 ms against 6 889 ms), which is an artefact, not a
result.

Twelve of twenty cases contain crossings. The eight antipode cases
reporting zero events did work rather than skipping it: `f` vanishes on the
whole line through a longitude, so each has roots at the same instants as
its partner, and the half-plane `g > 0` is the only thing separating them.
B1 costs the same 12 cells and 635 evaluations as F1, and so on down the
series — the work is done and then thrown away.

Across **all ten** antipode cases the independent reference finds **25**
`f`-roots that `g > 0` rejects as the wrong direction; **13** of those fall
in the eight zero-event cases, the other 12 in B2 (11) and B4 (1), which do
report events. The table below is the reference's own count, not the
solver's bookkeeping. The tier-B suite `deepEqual`s it per case and pins the
total, so it cannot rot into a vacuous pass.

| case | signChanges | kept | rejected |
| --- | --- | --- | --- |
| B1 Sun | 1 | 0 | 1 |
| B2 Moon | 22 | 11 | 11 |
| B3 Mercury | 1 | 0 | 1 |
| B4 Venus | 3 | 2 | 1 |
| B5 Mars | 1 | 0 | 1 |
| B6 Jupiter | 2 | 0 | 2 |
| B7 Saturn | 2 | 0 | 2 |
| B8 Uranus | 2 | 0 | 2 |
| B9 Neptune | 2 | 0 | 2 |
| B10 Pluto | 2 | 0 | 2 |

## 4 · What the frame moved, and what that is not

Rung 4 minus rung 3, over the whole holdout: **−470 640.6 s to +449 313.5
s**. Both signs, because rung 4 moves a crossing forward or back depending
on which way the body's longitude is running at it. One "characteristic"
figure would be a selection.

The size scales with two things: how slowly the body moves, and how far the
case's epoch is from J2000. The Moon's 22 shifts run 1 743–2 222 s at a
frame offset of 0.31°; Uranus's two are −470 641 s and +449 313 s at 0.10°.
**The frame offset is not one number** — it is the precession accumulated
between J2000 and each case's own window, which §9a spaces 900 days apart:
0.34° for the Sun's 1975 window down to 0.034° for Pluto's 1997 one, a
factor of ten across the holdout.

The range above is over the eighteen crossings that have a ladder entry; F9
and F10 have none, for the reason in the next section.

**This is a frame difference. It is not improved physical accuracy, and it
is not a defect in the fixed-frame modes**, which are correct about the
frame they name. Anyone quoting these numbers as an accuracy improvement
would be quoting the wrong thing.

### Two cases where the frame moved a crossing out of the window

F9 (Neptune) and F10 (Pluto) are the only cases where rungs 3 and 4
disagree about **how many** crossings exist:

| | of-date longitude range | fixed-frame range | target | of-date roots | fixed roots |
| --- | --- | --- | --- | --- | --- |
| F9 Neptune | 290.573764 .. 295.550339 | 290.643682 .. 295.613219 | 294.224645 | 2 | 1 |
| F10 Pluto | 242.827877 .. 246.729642 | 242.861687 .. 246.758848 | 242.857689 | 2 | 0 |

Pluto is the clearest. Over its 300-day window the of-date longitude dips
to 242.827877 — just below the target — so it crosses twice. In the fixed
frame, uniformly about 0.034 degrees higher, the dip only reaches
242.861687, **above** the target, which is therefore never reached at all.
The whole difference is the frame offset, and it turns two crossings into
none.

The two rungs look for the **same numeric longitude measured from
different origins**. A crossing sitting inside one window and outside the
other is what that means in practice, not a solver losing one.

### The pass rule changed after the run, and it was RELAXED

Calling it anything else would be wrong, and an earlier draft of this
section called it a strengthening.

The aberrated tool's clause was "crossings but no ladder is a failure",
which is right for rungs 1 to 3 because they share a frame. Rung 4 does
not, and under that clause F9 and F10 failed for exactly the reason above.
Replaying the old predicate over the recorded rows reports those two and
nothing else.

The clause was therefore narrowed. The new predicate is the old one
conjoined with further conditions, so it fails a **strict subset** of what
the old one failed: two failures became passes and nothing new fails. That
is a relaxation, whatever was put in its place.

What *was* put in its place is genuinely new — no earlier rule compared the
fixed-frame reference's count against the aberrated solver's — and a frame
separation now has to clear two conditions, not one:

1. **the two independent references show the same count difference their
   solvers do**, so the difference is the frame and not a solver losing a
   root. Both cases clear it: of-date reference 2 and 2, fixed-frame
   reference 1 and 0, matching their solvers exactly;
2. **rungs 1 to 3 still agree with each other.** They share a frame, so a
   disagreement among them is a defect, not a separation. This condition
   was added after review pointed out what the narrowing cost: the branch
   is entered on the of-date count alone, so without it a light-time or
   geometric defect in the same case would have gone unreported. Nothing
   was masked in this run — F9 reads 1/1/1/2 across the four rungs and F10
   reads 0/0/0/2 — but the rule was not looking.

The harness pins the set `{F9, F10}`, so if it ever grows this section is
about a different set of cases and should be re-read rather than assumed.

The failing run itself is not in the repository. `holdout-run.json` was
committed alongside the rule change, so the only committed record was
produced under the new rule, and "opened once, not tuned against" in §3
should be read against this section rather than apart from it.

What *is* in the repository now is the replay. An earlier version of this
paragraph said the old rule's failure was verifiable by replaying its
predicate over the recorded rows "but it is not an artifact here". It is
one now: `tools/measure/replay-of-date-pass-rule.mjs` applies **both**
predicates to the committed rows — every field either one reads is in
them — and asserts four things rather than announcing one verdict:

| | replayed result |
| --- | --- |
| the new rule fails a subset of what the old one failed | holds: nothing new fails |
| which cases turned from failures into passes | exactly **F9 and F10** |
| the old rule did not pass this run, so the amendment was not cosmetic | holds: 2 failures |
| the new rule reports nothing on this run through this clause | holds: 0 failures |

The committed record carries no other problem, so those two are the whole
difference. Run it with `--check`; the output is at
`docs/platform/evidence/precision-of-date/pass-rule-replay/replay.json`.

What the replay still cannot establish: that the recorded rows are what
the solver would produce today, or that the quoted old clause is what was
in the file before the change. For the second, `git log` on
`tools/measure/of-date-holdout.mjs` is the record, and the old clause is
quoted verbatim in the replay tool so the two can be read side by side. A
replay is a replay.

## 5 · The twelve synthetic frame cases

§6a, through `searchOfDateLongitudeWithFrame`, which takes the same code
path as the real mode with the frame injected. They exist because the real
IAU frame's truth is exactly as hard to establish as the thing under test.

Two of them earn the file.

**S5b — dropping `R'` from `Q'` gives a confidently wrong answer, not a
weaker one.** `M1`, the Lipschitz constant the **exclusion** test uses
(`I.mig(f(m)) > M1 * w`), comes from the same derivative enclosure. Zeroing
`R'` makes `M1` far too small, so cells that do contain roots are excluded
as proven empty. Measured on a frame turning 10 degrees a day: the correct
provider finds a root at 31 968 s; the broken one reports **zero events
with `established: true`**.

**S6 — freezing `R` at the window midpoint** lands in the same place for a
different reason: `f` itself is wrong, and the search proves an empty
window that is not empty.

The rest: S1a reduces the mode to the aberrated one by handing it
`R1(e0)`, and S1b shows why that is the reduction rather than a literal
identity — the earlier modes carry the obliquity in their projection
weights and this one does not, so an identity matrix would compute an
**equatorial** longitude, which S1b asserts disagrees. S2 pins a constant
rotation to an exact target shift. S3 shows a uniformly rotating frame is
not a shift of a constant one. S4 checks direction labels against the
reference longitude either side, with the frame turning each way. S5c
declares the same physical frame two ways — `R'` per second with
`dtdTdb = 1`, and `R'` per 1/7.5 second with `dtdTdb = 7.5` — and requires
identical answers, which it gets only if the factor sits on the `R'` term
and nowhere else. S7 near-tangency, S8 a root on a shared boundary, S9
cancellation, S10 budget exhaustion, S11 typed refusals, S12 a cell
spanning an interior extremum of sine.

**Round trips and orthogonality are not in that list and count for
nothing.** A consistently wrong rotation passes both. They run as cheap
guards and are recorded as such.

## 6 · Evaluation: no `Math.sin` anywhere in the frame

The frame chain uses `src/core/trig.mjs` — Cody-Waite argument reduction
and a Taylor polynomial in `+`, `-` and `*` only, with a declared absolute
error bound of **4e-15**.

That bound is an **analysis**, derived term by term in the module's header,
not a machine-checked proof. `test/tier-a/trig.nodetest.mjs` measures the
realised error against a 70-digit BigInt reference — exact decomposition of
the double under test, π to 80 digits, Taylor to exhaustion, sharing
nothing with the implementation — over **40 656 arguments**, including
every quadrant boundary of the reduction and the two doubles either side of
each: **worst 1.484e-16 on sin, 1.330e-16 on cos**.

That harness did not exist when the figure was first published here. The
number was right; the artifact was missing, which made it a claim about a
probe nobody could re-run — and it was being shipped inside
`OF_DATE_CONTRACT.evaluation`, where a consumer reads it.

Two reasons, and the first is the binding one. ECMAScript does not bound
`Math.sin`'s error, so an enclosure built on it would not be a bound —
calling it one would be the "proven label after silently switching to an
empirical bound" that the preregistration forbids. The second is that
`Math.sin` does not promise the same bits in two engines, so a chain built
on it could not be reproducible across runtimes.

The interval sine detects an interior extremum the endpoints miss, rather
than assuming monotonicity over a cell: a cell spanning a quarter turn gets
±1, not the hull of its endpoints. S12 checks that on 400 sample points of
an 8-day cell — zero escapes.

## 6a · What the soundness review broke, and what it did not

A bounded adversarial review ran against this chain with one question:
can the mode report `established: true` with `isExactTotal: true` while
missing or inventing a crossing? It could not, over 445 proven searches
against an independent reference across three geometries and three epochs,
near-tangency sweeps walking a double root through its merge from both
sides, and direct containment checks of every layer — 2.4 M pointwise trig
arguments, 64 k interval enclosures, an exact BigInt predicate for the
extremum test, 38 k reduction intervals built to cancel, and the frame
matrix and its derivative against a 60-digit reference at zero escapes.

**That is strong evidence, not a proof**, and the review said so in those
words. The enclosures are not machine-verified and `ABS_ERR = 4e-15`
remains a hand analysis corroborated by sampling.

What it did break was the failure mode.

### A raw `TypeError` escaped the entire search on any cell wider than 182.6 days

`reducedRadians` returns `null` for an interval spanning half a turn or
more, meaning "the whole range". `nut00bInterval` reads it that way. The
three calls in `tdbMinusTtInterval` did not, and passed the `null` into
`sinCosInterval`, which dereferenced it.

The consequence was not a wide enclosure or an unresolved cell. It was an
untyped `TypeError` out of the whole search — `retarded-search.mjs`
rethrows anything that is not a `PrecisionError`, and the subdivision loop
catches only `budget-exhausted` and `cancelled` — so **every cell already
decided was lost**, on inputs where `searchAberratedLongitude` returns an
established result. The threshold is a cell half-width of 91.3 days, where
the `2g` term first spans half a turn.

It fails closed: it cannot manufacture a wrong "proven". And it is
unreachable with a DE-derived pack, whose granules are at most 32 days, so
the seed tiling never makes a cell that wide. It is reachable through the
documented public API with any pack whose record interval is longer, which
the format admits and this package's own fixtures use.

Fixed, and **S11c** covers it. §6a S11 declared "typed refusal, no throw
escaping the search"; the case it tested was a different way in, so this
was a gap in S11 rather than a failure of it. The regression test spies on
the provider and asserts it saw a cell past the threshold — the first
draft of it built its pack with `interval` where the helper wants
`intervalSec`, so the window fell outside coverage, the provider was never
called, and the case passed while testing nothing. It fails with the fix
reverted and passes with it.

### `Math.sin` defined the of-date projection weights

`OF_DATE_CONTRACT.evaluation` said "Math.sin is not used". The frame chain
does not use it — that was verified — but `dF` and `dG`, the two weights
that define `f` and `g`, were `Math.sin(L)` and `Math.cos(L)`.

Not a containment defect: the two doubles are exact inputs, so the
enclosure correctly encloses the function those doubles define. The
consequence is narrower and still real — on a host whose `Math.sin(L)`
differs by an ulp, the "exact total" is exact about a function differing
in the last ulp of its defining constants, so the bit-identity claim would
have covered the frame chain rather than `f`.

**The fix is the code, not the sentence.** The of-date weights now come
from `sinCos`. The two earlier modes keep `Math.sin`: they are released,
and a last-ulp change to a shipped mode's roots is not worth making.

### Three smaller ones

- **The reduction's stated justification was wrong where it matters.** The
  comment said `PAD` covers the rounding in `cr ± hr`. It does not:
  `I.iv`'s widening is relative, so when `cr ≈ hr` the lower endpoint sits
  near zero and is widened by almost nothing. What covers it is
  `sinCosInterval`'s own ±`ABS_ERR` on the value, with |sin′| ≤ 1. The
  enclosure held — 38 000 intervals built so that `cr ≈ hr`, zero
  violations, minimum slack 3.78e-15, essentially the whole `ABS_ERR` pad
  and none of `PAD`, which is the point. The comment now says the true
  reason.
- **A frame angle too large to reduce was retried instead of refused.**
  Too *wide* shrinks when the cell does; too *large in magnitude* is set
  by the epoch and does not, so bisecting to the floor spent the budget to
  reach a verdict available on the first cell. The two now carry different
  codes and different dispositions, the same way the superluminal observer
  does. Cost, not soundness.
- **`frameRateArcsecPerSec` was an interval bound wearing a rate's name.**
  On a wide cell it is the sum of 77 term-derivative bounds — about
  137 arcsec/yr against an actual order of 1. It errs conservative, so the
  induced figure stays an upper bound; it is now
  `frameRateBoundArcsecPerSec` and carries a note saying which it is.

One finding was reported and not acted on: the exclusion lever arm
`w = max(hi − m, m − lo)` is not rounded up, and a cell straddling zero
could round it down by ≤ ½ ulp. `PAD`'s eight units widen `f` by eight
times that, and the reviewer could not construct a counterexample. Recorded
here rather than patched on a suspicion.

## 7 · What this does not establish

Completeness here is completeness **about the stored polynomial model,
with light-time, aberration and this frame applied**. Not the sky, not an
apparent place, not a chart, and not a replacement for the site's
production engine, which is untouched.

The reference's own completeness is bounded by its scan step, declared per
body. **A matching count corroborates; it does not prove that nothing was
missed between two samples**, and no sentence here says otherwise.

Near a stationary point a position error divided by a near-zero rate is not
an uncertainty bound and is not reported as one. Where the rate enclosure
straddles zero the bracket is the answer, and it is given as a bracket.

**No holdout case reaches that regime.** The widest bracket here is 1.0e-2
s, on the Moon — the fastest body in the set, whose rate never approaches
zero. It is width from subdivision, not from a vanishing rate, and the two
should not be read as the same thing.

The new mode is **not exposed in the public preview**. Its source is in the
package behind the experimental import; the preview's two public modes are
unchanged.
