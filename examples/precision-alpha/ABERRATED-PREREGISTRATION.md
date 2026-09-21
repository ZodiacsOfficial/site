# validated-retarded-aberrated — declared before the search exists

Written 2026-09-21, after the pointwise transformation was implemented and
validated (commit `f3fcde9b`) and before any enclosure, subdivision or root
isolation for it exists. Nothing below is chosen from this operation's own
answers.

Companion to `RETARDED-PREREGISTRATION.md`, which declared the light-time
operation. That document and its results stay as they are; this one only
adds the observer-motion layer.

---

## 1 · The quantity

For a target body and a fixed ecliptic longitude `L`, the instants at which

    d(t)   = r_target(t - tau) - r_observer(t)
    tau    = |d(t)| / c                                  (reception light-time)
    u(t)   = aberrate( d(t), v_observer(t)/c )           (stellar aberration)
    f(t)   = sin(L) u_x - cos(L) (cos(e0) u_y + sin(e0) u_z) = 0
    g(t)   = cos(L) u_x + sin(L) (cos(e0) u_y + sin(e0) u_z) > 0

with

* **target at emission time** `t - tau`;
* **observer position AND velocity at reception time** `t`;
* `aberrate` exactly as in `src/core/aberration.mjs`, i.e. Expr. (7.40) of
  the Explanatory Supplement with rigorous normalization, `withPotential`
  **false**;
* `e0` = 84381.406 arcsec, the IAU 2006 mean obliquity at J2000.

The observer is **not** retarded. Evaluating the observer at `t - tau` is a
different and wrong operation; `RETARDED-RESULTS.md` §4c measures how wrong,
and L3/L4 of the light-time suite exist to catch it.

`f` and `g` are linear in `u`, so `f = 0` is invariant to any positive
rescaling of `u`. That is what makes the normalization inside `aberrate`
irrelevant to the root locations, and it is the reason the continuous vector
formulation is used instead of a wrapped angle.

## 2 · Name

`validated-retarded-aberrated`.

Not `validated-apparent-of-date`. It is not an apparent place of date: it
omits deflection, the Shapiro delay, precession and nutation, and everything
topocentric. Naming it for what it computes is the point.

## 3 · Applied and omitted

Applied:

* reception light-time, Newtonian, target retarded and observer not;
* stellar aberration, special-relativistic, observer velocity at reception.

Omitted, and to be listed by name on every result:

* gravitational light deflection by the Sun;
* the Klioner solar-potential term inside the aberration itself
  (`withPotential: false`; measured at 4.046e-7 arcsec for an Earth-like
  observer at 1 au);
* Shapiro delay;
* precession and nutation into the frame of date;
* the IAU 2006 ICRS frame bias, 23.1 mas;
* topocentric parallax, diurnal aberration, refraction;
* houses, traditions, asteroids, whole-chart construction.

Frame: the ecliptic of the ICRS equator, `ecliptic-of-the-icrs-equator`, the
same frame the two existing validated modes name. Time scale: TDB seconds
past J2000 in and out, no TT or UTC conversion inside the operation. Bodies:
the ten the retarded contract admits. Data identity: the pack's own
`payloadSha256`, reported with every result, because a digest covers the
sealed header too and the same coefficients exist under several.

## 4 · The control ladder

Every comparison runs three rungs on identical instants, observer and target
definitions, frame and source data:

1. `validated-geometric` — no light-time, no aberration;
2. `validated-retarded-geometric` — light-time only;
3. `validated-retarded-aberrated` — light-time plus aberration.

Differences are attributed between rungs, never to "error". Rung 3 minus
rung 2 must equal the aberration term and nothing else.

## 5 · References, and what each can settle

* **ERFA `eraAb`** (pyerfa 2.0.1.5, ab.c revision 2021-02-24): settles the
  pointwise transformation. Already run: 2.6e-11 arcsec with the potential
  term included, and the difference without it predicted to 0.3 %.
* **Closed forms**: settle the special cases exactly — zero velocity,
  parallel and antiparallel velocity (angle exactly zero), transverse
  velocity (angle exactly `atan(gamma beta)`).
* **Swiss Ephemeris**: a different correction set, useful for scale, not for
  agreement. **New comparisons must convert TDB to TT explicitly.**
  `RETARDED-RESULTS.md` §4 records measurements taken with TDB passed where
  Swiss expects TT; those stay as they are, dated, and are not reused here.
* **SPICE CN+S**: documented model, not assumed identical to a
  special-relativistic implementation.

Bitwise agreement is not expected from any of them and will not be sought by
tuning.

## 6 · Test families, with required non-empty coverage

Declared before any case is run. A family with no successful roots does not
count as covered; the earlier light-time holdout had seven of twelve
astronomical cases contain no crossings at all, and that is not repeated.

| family | required |
| --- | --- |
| genuine crossings | at least 8 cases, each with >= 1 root found |
| no-crossing intervals | at least 4, each proven empty |
| multiple crossings | at least 3, each with >= 3 roots |
| boundary roots | at least 2, tested by adjacent half-open tiling |
| close pairs | at least 2, separation < 0.1 of the window, established analytically first |
| stationary / near-stationary | at least 2 |
| unresolved / invalid domain | at least 4, each refusing with a typed code |

Astronomical cases are selected using an **independent reference**, never by
asking this solver what it finds.

Pointwise synthetic coverage, all required:

* zero observer velocity reduces exactly to the light-time-only case;
* velocity parallel and antiparallel to the incoming direction;
* transverse velocity against an independently derived angular change;
* a changing observer velocity across the interval;
* velocity near and outside the admitted domain;
* cancellation in enclosure construction and in the correction itself;
* coefficient-record boundaries;
* degenerate projected direction;
* the midpoint and hidden-turn counterexamples from the light-time suite.

## 7 · Tolerances and budgets

* Root agreement with the independent reference: **1e-3 s**, the light-time
  operation's figure, so the two are comparable.
* Pointwise direction against ERFA with the potential term: **1e-9 arcsec**.
* Pointwise direction against closed forms: **4 eps** on components.
* `maxEvaluations` 4,000,000 and `maxCells` 400,000, as the retarded mode.
  An exhausted budget must report `budget-exhausted` and must **not** report
  an exact total.

## 8 · Splits

* **Development**: synthetic geometries and at most two astronomical cases,
  used freely while building.
* **Supplementary**: anything added after the holdout opens, labelled, and
  excluded from pass/fail whatever it shows.
* **Holdout**: generated by a fixed rule from an independent reference,
  opened once, and not tuned against.

## 8a · The holdout rule, fixed before the holdout ran

Added 2026-09-21, after the enclosures, the search and the forty-two
synthetic cases of section 6 existed and passed, and **before** the
astronomical holdout was generated or run. Section 8 said the holdout
would come from a fixed rule; this is that rule, written down so the
commit that contains it precedes the commit that contains any result.

Nothing here is new. Both halves are already in the repository, from the
light-time work, and neither was invented for this run:

* the **windows** are `RETARDED-PREREGISTRATION.md`'s holdout windows,
  verbatim, so the two operations can be compared case for case;
* the **targets** are the light-time M-series rule — read the body's own
  longitude off the reference at the window midpoint — which exists
  because the light-time K-series rule picked longitudes seven of ten
  bodies never reach, leaving the root path untested on most of the
  contract. Section 6 of this document forbids repeating that.

For the i-th body of the contract's ten, zero-based:

```
from       = 1975-01-01T00:00:00Z + 900 i days
to         = from + 300 days
targetDeg  = lon_aberrated(body, midpoint of [from, to]), to 6 decimals
             taken from the INDEPENDENT reference, never from the solver
```

That gives ten cases, **each with at least one crossing by construction**,
which is what section 6 requires and what the light-time K-series could
not give.

Ten more, the antipode series, on the same windows:

```
A(i):  targetDeg = (targetDeg_i + 180) mod 360
```

`f` vanishes on the whole LINE through the requested longitude, so the
antipode case's `f` has roots at exactly the same instants as its
partner's. The half-plane `g > 0` is the only thing that separates them.
A(i) therefore exercises a path the main series cannot: find the roots,
then reject every one of them as the wrong direction. For a body that
sweeps far enough in 300 days the antipode is also genuinely reached, and
then the case has real events too; the reference decides which, and the
rule does not change either way.

Every case runs all three rungs of section 4 on identical instants.

Pack: the DE440s-derived pack whose `payloadSha256` is `0a218764…`, the
coefficients `RETARDED-RESULTS.md` section 2 pins. The file digest is
reported with the result. The pack is used locally and is not
redistributed; its licensing is unresolved, which is why every example and
every tier-A case in this package runs on a synthetic fixture instead.

Reference: `test/tier-b/_aberrated-reference.mjs`, the light-time
reference of `_retarded-reference.mjs` with `aberrate` applied to its
vector and the observer velocity read from the same public
`Ephemeris.state`. No interval arithmetic, no enclosures, no Chebyshev
bounds, no subdivision. Its completeness is bounded by its scan step and
the step is declared per body, not chosen by the run.

Reported for every case, whatever it shows: status, whether completeness
was established, events found against reference roots, missed, extra,
worst root separation, whether every reference root lies inside its
reported bracket, unresolved intervals, cells, evaluations and wall time.

## 9 · Pass and fail

The operation passes if, on the holdout: every case either establishes
completeness or refuses with a typed reason; no reported root is further
than 1e-3 s from the independent reference; no case reports an exact total
while leaving a region unresolved; and the non-empty coverage in §6 is met.

Fewer than half the cases establishing completeness means the extension is
recorded as not practical at this cost, rather than described as a success.

## 10 · What this cannot establish

Completeness here is completeness **about the stored polynomial model with
these two corrections applied**. It is not a statement about the sky, not an
apparent place, and not a chart. Agreement with any external ephemeris lies
outside every bound this document sets.
