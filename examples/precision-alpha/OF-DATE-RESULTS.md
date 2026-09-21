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
matrix is reproduced to **1e-14** and lies inside the interval enclosure
everywhere.

**It is the mean ecliptic, true equinox.** Nutation is a motion of the
equator, not of the ecliptic. "True ecliptic of date" is not a frame this
construction produces and the phrase appears nowhere. Dropping `dpsi`
gives the **mean** equinox, about 17 arcsec away — a different rung, not a
tolerance, and `frame-of-date.nodetest.mjs` asserts the size of that gap so
the two cannot be quietly confused.

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

The true-equinox rung is checked by construction, by its 17-arcsec
separation from the mean rung, and against the released reducer. That is a
weaker external check than the mean rung has, and nothing below describes
the two as equally checked.

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
| implementation, numerical | yes, proven | frame enclosure up to **3.00 arcsec** on the widest accepted cell |
| conversion approximation | yes | **1.4e-10 arcsec**: the model's stated 3e-5 s carried into longitude through the frame's own rate |
| external time model | **no** | stated, never bounded here |

The middle row is the point of separating them. A reader given "3e-5 s"
alone cannot tell whether thirty microseconds of time error matters to a
longitude; carried through the frame's own rate it is a tenth of a
nanoarcsecond, and no amount of tightening the intervals would shrink it,
because it is a property of the model and not of this code.

The first row is the honest cost. On a day-wide cell the interval
evaluation of a 77-term nutation series overestimates badly — three
arcseconds against a true daily variation of hundredths — because each
term's argument sweeps far enough for its interval sine to span most of
its amplitude. It does not matter here: the cells that decide roots are
narrow, and every holdout case still closed. It would matter to anyone
trying to use a day-wide cell's frame enclosure for something else.

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

**The frame is nearly free.** Rung 3 on the same twenty cases costs 548 866
evaluations; rung 4 costs 561 100. **2.2 % more** for a date-dependent
rotation, its derivative, a time-scale conversion and its derivative, all
in interval arithmetic with validated trigonometry.

Twelve of twenty cases contain crossings. The eight antipode cases
reporting zero events did work rather than skipping it: `f` vanishes on the
whole line through a longitude, so each has roots at the same instants as
its partner and the half-plane `g > 0` is the only thing separating them.
**25 f-roots found and rejected** as the wrong direction, with completeness
still established. The tier-B suite `deepEqual`s the per-case counts, so
that cannot rot into a vacuous pass.

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

The size scales with how slowly the body moves. The Moon's shifts are about
1 800–2 200 s; Uranus's are ±450 000 s. Same frame rotation of roughly a
quarter of a degree, divided by wildly different rates.

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

**The pass rule was changed after seeing this, and the change is a
strengthening.** The aberrated tool's clause was "crossings but no ladder
is a failure", which is right for rungs 1 to 3 because they share a frame.
Rung 4 does not. The clause is now: when the rungs disagree about a count,
the **two independent references must show the same difference their
solvers do**, or the case fails. Both cases are corroborated — the of-date
reference finds 2 and 2, the fixed-frame reference finds 1 and 0, matching
their solvers exactly. The harness pins the set `{F9, F10}`, so if it ever
grows this section is about a different set of cases and should be re-read
rather than assumed.

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
and a Taylor polynomial in `+`, `-` and `*` only, with a **proven absolute
error bound of 4e-15**, measured at 1.5e-16 against a 60-digit reference.

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
straddles zero the bracket is the answer, and it is given as a bracket —
the widest on this holdout is 1.0e-2 s, on the Moon.

The new mode is **not exposed in the public preview**. Its source is in the
package behind the experimental import; the preview's two public modes are
unchanged.
