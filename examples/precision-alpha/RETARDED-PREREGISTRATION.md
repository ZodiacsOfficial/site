# validated-retarded-geometric — preregistration

Written 2026-09-21, **before any case below has been run**. The
implementation (`src/core/retarded.mjs`, `src/core/retarded-search.mjs`,
`src/core/interval.mjs`) exists and compiles; it has not been executed on
a single case in this document, and no tolerance here was chosen after
seeing a number.

The previous milestone's evaluation was pre-registered and then not
implemented as written — a declared regression case was silently swapped
for an easier one. So this document states, for every rule, the exact
thing the harness must do, and the harness is checked against it line by
line at the end.

## 1 · The quantity, exactly

For a **reception** time `t` in TDB seconds past J2000:

```
tau  = | r_T(t - tau) - r_O(t) | / c          c = 299792.458 km/s
d(t) = r_T(t - tau(t)) - r_O(t)
```

The target is at emission time, **the observer at reception time**. An
event is a crossing of a fixed longitude `L` in the **fixed J2000 mean
ecliptic** frame, expressed without any angle:

```
f(t) = sin(L)·d_x - cos(L)·(cos(e)·d_y + sin(e)·d_z) = 0
g(t) = cos(L)·d_x + sin(L)·(cos(e)·d_y + sin(e)·d_z) > 0
```

with `e` = IAU 2006 mean obliquity at J2000, 84381.406″.

**Applied:** Newtonian reception light-time, one way, target retarded.

**Not applied, and stated on every result:** stellar aberration;
gravitational deflection; Shapiro delay; precession and nutation into the
frame of date; topocentric parallax; refraction.

**Domain:** the ten contract bodies, geocentric, over any window inside
the stored records of every contributing series. Time in and out is TDB
seconds. No TT or UTC conversion happens inside the operation.

This is **not** a more accurate `empirical-apparent`. It is a different
quantity with a stronger claim, and the report must say so wherever the
two appear together.

## 2 · What must be established for a result to say `proven`

1. `k = max|v_T| / c < 1` over the emission window, with `max|v_T|` taken
   from `Σ|c_k|` of the differentiated stored series — **not** from an
   assumed solar-system speed ceiling, and **not** sampled.
2. `Φ(T) ⊆ T` **checked** on the candidate light-time interval `T`, for
   every reception time in the cell.
3. Every target and observer evaluation inside the stored records. A
   window reaching outside is refused, never clamped or extrapolated.
4. The emission window's record crossings handled by walking every record
   it touches and taking the union. No clamping into one record.
5. `|d| > 0` established over the cell.
6. Every cell closed by exclusion or by monotonicity, with the endpoint
   signs established outside the enclosure's own width.
7. `g > 0` established over the event's bracket.

If any of these fails, the result is `unresolved` or refused with a typed
code. **No fallback to an empirical evaluation under a proven label.**

## 3 · Reference configuration

Independent implementation: **pyswisseph 2.10.03** against the Swiss
`sepl_18.se1` / `semo_18.se1` files in `/tmp/claude-0/swisslab/ephe`,
called with

```
FLG_SWIEPH | FLG_J2000 | FLG_NOABERR | FLG_NOGDEFL
```

which is light-time only, in J2000, with no stellar-aberration term. Swiss
iterates its light-time to convergence, so this is nearer SPICE's **CN**
than its **LT**. The four corrections will be measured against each other
(`NONE` ≈ `FLG_TRUEPOS`, `LT/CN`, `CN+S` ≈ dropping `NOABERR`) and the
gaps reported, so that no comparison silently puts a light-time-only
result beside an aberration-corrected one.

Pack under test: **`c9ebc641…`** (DE440s-derived, 1849-12-25 … 2150-01-21)
— the same pack the four-configuration measurement and the previous
evaluation used, so the numbers stay comparable.

Swiss is a **measuring instrument**. No Swiss output is redistributed;
bulk per-instant values stay gitignored, as they already are.

## 4 · Tolerances, fixed now

| quantity | tolerance |
| --- | --- |
| analytic light-time, synthetic cases | `\|tau_computed - tau_exact\| ≤ 1e-9 s` |
| analytic root instant, synthetic cases | `\|t_found - t_exact\| ≤ 1e-3 s`, and the exact root must lie inside the reported bracket |
| root instant vs an independently bisected reference of the same quantity | `≤ 1e-3 s` |
| event matching, real data | an event matches a reference root when `\|Δt\| ≤ 1 s` **and** the root lies in the reported bracket widened by one bracket width |
| the pack-vs-Swiss event-time gap | **reported, not bounded.** It is a property of the compressed pack and of two different source ephemerides, not of this solver, and it is measured separately from everything above |

## 5 · Resource limits, fixed now

`maxEvaluations` 4,000,000 and `maxCells` 400,000 as shipped. A case that
exceeds either is a `budget-exhausted` result and is counted as
unresolved, not as a crash and not as a skip.

Cancellation must produce `execution.status: 'cancelled'`, and must do so
when the abort lands during enclosure construction or during the
light-time iteration, not only between root evaluations.

## 6 · Pass and fail, fixed now

**Analytic cases (§7) — every one must pass.** A single analytic failure
fails the whole exercise; these have closed-form answers and there is
nothing to negotiate.

**Astronomical cases.** Per mode-case: `missed = 0` and `extra = 0`
against the reference. Additionally:

- **Usefulness.** If the operation `proven`-closes **fewer than half** of
  the preregistered astronomical cases, it is reported as *not practical
  yet*, whatever its accuracy. A solver that refuses everything has not
  succeeded.
- **No silent degradation.** `validated-geometric` and
  `empirical-apparent` must return exactly what they returned in
  `EVALUATION-RESULTS.md` on the A and H cases. Any change is a
  regression in this work, not a new measurement.

**Performance is not promised.** The new operation adds a correction the
geometric mode omits, so it must cost more; the question measured is *how
much*, and whether the guarantee survives at a usable cell count. No
speed claim is made in advance and none will be made against a mode
computing a different quantity.

## 7 · Analytic cases — declared now, none yet run

Each has a closed-form or independently derived answer. None calls this
solver to produce its own expected value.

| # | case | what it decides |
| --- | --- | --- |
| L1 | target stationary at a fixed point | `tau = D/c` exactly; the root instant is the geometric one |
| L2 | target on a radial constant-velocity line | `tau` solves a linear equation in closed form |
| L3 | observer moving, target stationary | the observer must **not** be retarded; a solver that retards it gets a different, computable answer |
| L4 | observer and target both moving, chosen so that observer-at-reception and observer-at-emission differ by more than the tolerance | the two conventions are distinguished, not conflated |
| L5 | the emission time crosses a record boundary while the reception time does not | the union-of-records path, not clamping |
| L6 | near-zero separation | refusal, not a direction |
| L7 | a target fast enough that `k ≥ 1` over the window | the contraction is **not** established and the result says so |
| L8 | a root exactly at the interval's start, and one exactly at its end | boundary ownership, no duplicate and no loss |
| L9 | no roots in the window | a proven zero |
| L10 | two roots closer than a tenth of the window | both found, or an honest refusal — never one |
| L11 | a tangency (double root) | **not** closed either way |
| L12 | cancellation during enclosure construction, and a spent budget | the two execution states, with what was found so far |

## 8 · Astronomical cases — declared now, none yet run

**Development (may be inspected and iterated on):**

| # | body | target | window (TDB seconds past J2000) |
| --- | --- | --- | --- |
| R1 | Mars | 100° | 2019-01-01 .. 2020-01-01 |
| R2 | Moon | 100° | 2019-01-01 .. 2019-02-01 |

**Holdout — generated by rule, reported separately, and not looked at
until the development pair passes.** For the i-th body of the contract's
ten, zero-based:

```
targetDeg = (53·i + 29) mod 360
from      = 1975-01-01T00:00:00Z + 900·i days
to        = from + 300 days
```

| # | body | target | from | to |
| --- | --- | --- | --- | --- |
| K1 | Sun | 29° | 1975-01-01 | 1975-10-29 |
| K2 | Moon | 82° | 1977-06-19 | 1978-04-15 |
| K3 | Mercury | 135° | 1979-12-05 | 1980-09-30 |
| K4 | Venus | 188° | 1982-05-23 | 1983-03-19 |
| K5 | Mars | 241° | 1984-11-07 | 1985-09-04 |
| K6 | Jupiter | 294° | 1987-04-26 | 1988-02-21 |
| K7 | Saturn | 347° | 1989-10-12 | 1990-08-09 |
| K8 | Uranus | 40° | 1992-03-30 | 1993-01-25 |
| K9 | Neptune | 93° | 1994-09-16 | 1995-07-14 |
| K10 | Pluto | 146° | 1997-03-04 | 1997-12-30 |

Plus two shape cases, chosen for geometry rather than by the rule and
labelled as such: **S1** a near-station Mars window, **S2** a Mercury
window containing a superior conjunction (the longest light-time
excursion available).

Instants are converted to TDB seconds by `(UTC - J2000) + 69.184 s`,
the same stated constant the rest of this package uses, and **that
conversion happens in the harness, not inside the operation**.

## 9 · What is measured, separately

Initialization; light-time iterations; cell subdivisions;
coefficient and derivative evaluations (the `spend` counter, which counts
enclosure construction and light-time iteration, not only root
evaluations); latency for successful and for unresolved searches; peak
heap; and cancellation responsiveness in evaluations and in milliseconds.

Reported apart from each other, never combined into a score, and never
compared against a mode computing a different quantity as though it were
the same one.

## 10 · What this preregistration does not promise

That the guarantee is practical. That the bounds are tight enough to
close cells on real data at all. That any astronomical case will come
back `proven`. If the enclosures are too loose, the deliverable is the
solver, the counterexamples, the exact blocker and a runnable next
experiment — and the report says so in those words rather than relabelling
an empirical fallback.
