# validated-retarded-aberrated-of-date — declared before the holdout exists

Written 2026-09-21. Third in the series, after `RETARDED-PREREGISTRATION.md`
and `ABERRATED-PREREGISTRATION.md`, and it adds one layer to theirs: the
date-dependent frame.

**What already existed when this was written, stated plainly so the reader
can discount it.** The pointwise frame (`src/core/frame-of-date.mjs`), its
interval chain, its derivative, and the `ofDate` branch of
`retardedCell` all existed and had been exercised on development cases
(commits `123d225f`, `6ac1d57d`). The published ERFA vectors were already
pinned in `test/tier-a/frame-of-date.nodetest.mjs` and passing. So this
document is **not** written before the search exists, and it does not
pretend to be.

What it is written before: the holdout being generated or run, the
twelve synthetic frame cases of §6 being written, and any tolerance,
budget or subdivision parameter being changed from the value the existing
modes already use. Every number in §7 is inherited from the two earlier
documents rather than read off an of-date run. That is the property that
matters — nothing below is chosen from this operation's own answers.

---

## 1 · The quantity

For a target body and an ecliptic longitude `L` **measured from the true
equinox of date**, the instants at which

    d(t)   = r_target(t - tau) - r_observer(t)
    tau    = |d(t)| / c                                  (reception light-time)
    P(t)   = bm1 d + S v,  S = |d| + (d.v)/(1 + bm1)     (aberration, unnormalised)
    Q(t)   = R(t) P(t)                                   (the frame of date)
    f(t)   = sin(L) Q_x - cos(L) Q_y = 0
    g(t)   = cos(L) Q_x + sin(L) Q_y > 0

where `R(t)` is the rotation from the ICRS/GCRS equatorial axes to the
**mean ecliptic of date with its origin at the true equinox of date**:

    R(t) = R3(-(psib + dpsi)) R1(phib) R3(gamb)

the IAU 2006 Fukushima-Williams angles **with frame bias included**
(`eraPfw06`), plus the IAU 2000B nutation in longitude adjusted to P03.

Two things about that chain are load-bearing and are asserted, not assumed:

* **The obliquity cancels.** `eraEcm06` is `R1(obl06) . eraPmat06`, and the
  `R1(epsa)` of `eraFw2m` meets its inverse; what survives is the three
  rotations above. So `epsa` and `deps` do **not** enter the ecliptic
  projection at all, and `f`/`g` carry no obliquity factor — unlike the two
  earlier modes, whose fixed frame put `cos(e0)`/`sin(e0)` into the
  projection by hand.
* **It is the mean ecliptic, true equinox.** Nutation is a motion of the
  equator, not of the ecliptic. "True ecliptic of date" is not a frame this
  construction produces and the phrase is not used. Dropping `dpsi` gives
  the **mean** equinox of date, about 17 arcsec away; that is a different
  rung, not a tolerance.

## 2 · Name

`validated-retarded-aberrated-of-date`.

Still **not** `validated-apparent-of-date`. An apparent place requires
gravitational deflection, which is absent; naming it for what it computes is
the point, and §3 lists what is missing.

## 3 · Applied, omitted, and the models

Applied, beyond the aberrated mode:

* IAU 2006 frame bias and precession (Fukushima-Williams, `eraPfw06`);
* IAU 2000B nutation **in longitude**, adjusted to P03;
* the projection into the ecliptic of date with the true equinox as origin.

Omitted, and listed by name on every result:

* gravitational light deflection, by the Sun and by the planets;
* the Klioner solar-potential term inside the aberration (4.046e-7 arcsec);
* Shapiro delay;
* topocentric parallax, diurnal aberration, refraction;
* the 2000B-versus-2000A model difference (§5);
* houses, traditions, asteroids, whole-chart construction.

**The 2000B-with-2006 pairing is this repository's own, not ERFA's.** ERFA
and SOFA ship no such pairing: their IAU 2006 chain is 2000A-based
(`eraNut06a`, `eraPnm06a`) and there is no `eraNut06b` or `eraPnm06b`. The
pairing is kept because the released reducer uses it, and the experimental
chain and the released one must be the same model rather than two. Any
reference used to check this must use **the same pair**; a 2000A reference
differs by a model, and that difference must never be reported as a defect.

Pinned sources: **IAU SOFA Issue 2023-10-11**, and its ERFA equivalent
**liberfa v2.0.1** (tagged 2023-10-13). The 2000B series is from
`src/nut00b.c`, the aberration expression from `src/ab.c`, and the test
vectors from `src/t_erfa_c.c` at that tag.

## 4 · Time scale, and what it may not do

TDB seconds past J2000 in and out, as the two earlier modes. Unlike them,
**the frame needs TT**, and the conversion is a declared model, not a
convenience:

* TDB - TT from the two-term Astronomical Almanac series already in
  `reduce.mjs`, stated model error **3e-5 s**;
* evaluated at TDB rather than TT, costing a further 6e-13 s;
* carried through the search as an interval, with its derivative, so the
  chain rule below is exact rather than assumed.

Forbidden, and each is a declared test in §6:

* passing TDB where TT is wanted, silently using UTC, or adding a fixed
  offset that does not match the model above;
* rotating `P'` alone and calling it `Q'`. The derivative is

      Q'(t) = R'(t) P(t) (dt/dTDB) + R(t) P'(t)

  with `dt/dTDB` the TT-centuries-per-TDB-second factor of the model above,
  **not** the nominal 1/(36525*86400);
* freezing `R` at the window midpoint while calling the result an of-date
  search.

## 5 · Three error sources, reported separately and never summed into one

1. **Numerical error of this implementation.** The interval widths, which
   are proven: directed-rounding-free arithmetic with an explicit relative
   widening of 8 units in the last place, and trigonometry from
   `src/core/trig.mjs` with a proven absolute bound of 4e-15. `Math.sin` is
   not used anywhere in the frame chain: ECMAScript does not bound its
   error, so an enclosure built on it would not be a bound.
2. **Conversion approximation.** The 3e-5 s of the TDB-TT series, converted
   to longitude through the frame's own rate, reported as a separate figure.
   It is a property of the model, not of this code, and shrinking the
   intervals cannot shrink it.
3. **External time-model uncertainty.** That the pack's time argument is
   whatever the pack's producer meant by it, and that the TDB-TT series is
   itself an approximation to a relation defined by a solar-system model.
   Outside this implementation entirely; stated, never bounded here.

A single combined number would hide which of the three a reader can change.

## 6 · Test families, declared before the cases are written

### 6a · Synthetic frame cases — twelve, all required

These use `searchOfDateLongitudeWithFrame`, which injects the frame and
takes the same code path as the real mode. They exist because the real IAU
frame's truth is exactly as hard to establish as the thing under test,
whereas a frame given in closed form has an answer that can be derived
independently.

| # | frame | what it must establish |
| --- | --- | --- |
| S1 | identity, `R' = 0` | results **identical** to `searchAberratedLongitude`: same roots, same brackets, same directions, same counts |
| S2 | constant rotation by `theta` about the ecliptic pole, `R' = 0` | roots at target `L` equal the aberrated roots at target `L - theta`, to the root tolerance, exactly |
| S3 | uniform rotation `R3(-omega t)`, `R'` material and constant | roots agree with an independently derived scalar solve; **not** a shift of S2 |
| S4 | uniform rotation, `omega < 0` | direction labels flip on a crossing whose frame rate dominates the body's own rate; the labels are checked against the reference longitude either side, never against `f` |
| S5 | `omega` large enough that `R'` dominates | the search establishes completeness; a variant that drops `R'` from `Q'` reports a **wrong** count or fails to establish. If it does not, the case is too weak, and that is reported as a finding rather than counted as a pass |
| S6 | any frame with material `R'` | a variant that freezes `R` at the window midpoint is detectably wrong, under the same reporting rule as S5 |
| S7 | rotating, close pair / near-tangency | containment holds; the bracket may be wide and the midpoint may miss the 1e-3 s figure, and that is reported, not tuned away |
| S8 | rotating, roots at cell boundaries | adjacent half-open tiling finds each root exactly once |
| S9 | rotating, projected components cancelling | the enclosure still contains the truth through a cancellation of at least eight digits |
| S10 | real IAU frame, budget below need | reports `budget-exhausted`, `established: false`, and **no exact total** |
| S11 | real IAU frame, invalid or out-of-coverage time | typed refusal, no throw escaping the search |
| S12 | rotating, cell wide enough for an interior extremum of sin/cos | containment holds where the endpoints alone would not enclose it |

**Round trips and orthogonality do not count toward any of this.** A
consistently wrong rotation passes both. They are run as cheap guards and
recorded as such.

**The frame-induced difference is a frame difference.** Rung 4 minus rung 3
is precession plus nutation plus frame bias and nothing else. It is not
improved physical accuracy, and it is not a defect in the fixed-frame modes,
which are correct about the frame they name.

### 6b · Astronomical coverage — same requirements as the aberrated mode

| family | required |
| --- | --- |
| genuine crossings | at least 8 cases, each with >= 1 root found |
| no-crossing intervals | at least 4, each proven empty |
| multiple crossings | at least 3, each with >= 3 roots |
| boundary roots | at least 2, by adjacent half-open tiling |
| close pairs | at least 2 |
| stationary / near-stationary | at least 2 |
| unresolved / invalid domain | at least 4, each refusing with a typed code |

**Near a stationary point, a position error divided by a near-zero rate is
not an uncertainty bound** and will not be reported as one. Where the rate
enclosure straddles zero the bracket is the answer, and it is given as a
bracket.

**A reference scan corroborates a count; it does not prove one.** The
reference's completeness is bounded by its scan step, declared per body. It
cannot establish that no event was missed between two of its samples, and no
sentence in the results will say that it can.

## 7 · Tolerances and budgets — inherited, not chosen here

* Root agreement with the independent reference: **1e-3 s**, the figure of
  both earlier operations, so all four rungs are comparable.
* Pointwise frame matrix against the published `t_ecm06`: **ERFA's own
  declared tolerance**, 1e-14 absolute per element, and the published matrix
  must additionally lie **inside** the interval enclosure.
* Pointwise frame against the released reducer's chain: **1e-15** per
  element, and the released value inside the enclosure.
* `maxEvaluations` **4,000,000**, `maxCells` **400,000**, `minWidthSec`
  **1e-4**, `enclosureFloorSec` **1** — the existing `RETARDED_DEFAULTS`,
  unchanged. If the frame makes the mode cost more than this, that is a
  **result about the cost of the frame**, reported as such. It is not a
  knob to turn until the holdout passes.

## 8 · Supported time range

Declared as **1900-01-01 to 2100-01-01**, intersected with the pack's own
coverage, and reported on every result so the claim cannot be read wider:

* IAU 2000B's own note bounds the pole at 1 milliarcsecond over exactly that
  span;
* the FW06/P03 precession is valid over a longer interval but degrades
  outside a few centuries;
* the TDB-TT series is periodic and does not degrade, but nothing is claimed
  beyond the data;
* the binding limit in practice is the pack.

Outside that range the search still runs and still returns proven
enclosures **about the model as implemented** — what lapses is the claim
that the model represents the sky. The result says which.

## 9 · Splits

* **Development**: the synthetic frames of §6a, the pointwise vectors, and
  at most two astronomical cases. Already used; that is what the preamble discloses.
* **Supplementary**: anything added after the holdout opens, labelled, and
  excluded from pass/fail whatever it shows.
* **Holdout**: the rule below, fixed here, opened once, not tuned against.

### 9a · The holdout rule

Same windows as both earlier holdouts, verbatim, so every case can be
compared across all four rungs. Same target rule as the aberrated M-series,
**with the longitude read from an of-date reference** — because the of-date
longitude of a body is not its fixed-frame longitude, and reusing the
aberrated targets would silently change which instants the case is about.

For the i-th body of the contract's ten, zero-based:

```
from       = 1975-01-01T00:00:00Z + 900 i days
to         = from + 300 days
targetDeg  = lon_of_date(body, midpoint of [from, to]), to 6 decimals
             taken from the INDEPENDENT reference, never from the solver
```

Ten cases, each with at least one crossing by construction. Ten more on the
same windows, the antipode series `A(i): (targetDeg_i + 180) mod 360`, which
exercises the path where every root of `f` is found and then rejected by
`g > 0`.

Every case runs **all four rungs** on identical instants, observer and
target definitions, and source data:

1. `validated-geometric`;
2. `validated-retarded-geometric`;
3. `validated-retarded-aberrated`;
4. `validated-retarded-aberrated-of-date`.

Pack: the DE440s-derived pack whose `payloadSha256` is `0a218764…`, used
locally and not redistributed.

Reference: `test/tier-b/_of-date-reference.mjs`, the aberrated reference
with the **released** reducer's frame applied — `frames.mjs` `pfw06` and
`nutation.mjs` `nut00b` + `adjustToP03`, evaluated with the host's
`Math.sin`/`Math.cos`. That is independent of the thing under test in code
path, in arithmetic and in evaluation method, while being the **same model**,
which §3 requires. No interval arithmetic, no enclosures, no subdivision.
Its scan step is declared per body.

Reported for every case whatever it shows: status, whether completeness was
established, events found against reference roots, missed, extra, worst root
separation, whether every reference root lies inside its reported bracket,
unresolved intervals, cells, evaluations, wall time, and the rung-4-minus-
rung-3 frame shift with its sign.

## 10 · Pass and fail

Passes if, on the holdout and the synthetic cases together:

* all twelve cases of §6a pass, with S1 exact and S5/S6 either detecting the
  broken variant or reporting that they could not;
* every holdout case either establishes completeness or refuses with a typed
  reason;
* no reported root is further than 1e-3 s from the independent reference;
* no case reports an exact total while leaving a region unresolved;
* the coverage of §6b is met, non-vacuously;
* the same pack bytes, verified by digest in each runtime, give the same
  published roots in Node, Chromium and Firefox — with any variation in
  **evaluation counts** reported rather than hidden.

Fewer than half the holdout cases establishing completeness means the frame
layer is recorded as **not practical at this cost**, rather than described as
a success.

## 11 · What this cannot establish

Completeness here is completeness **about the stored polynomial model, with
light-time, aberration and this frame applied**. Not the sky, not an apparent
place, not a chart, and not a replacement for the site's production engine,
which is untouched and stays untouched.

The frame is validated pointwise against a published matrix for its **mean**
rung. Its **true-equinox** rung — the one this mode actually uses — has no
published matrix anywhere in ERFA or SOFA to check against, because neither
ships one. It is checked by construction, by its 17-arcsec separation from
the mean rung, and against the released reducer. That is a weaker external
check than the mean rung has, and no result will describe it as an equal one.
