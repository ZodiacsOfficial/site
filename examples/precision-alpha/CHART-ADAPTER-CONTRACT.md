# What a full-chart integration would need, and what it would have to say

**This is a contract, not an integration.** Nothing in the site's chart path
is changed by the deflection work, and nothing here proposes changing it.
The brief that commissioned the deflection profile asked for the adapter
contract that a full natal-chart integration *would* need, explicitly
without beginning that integration. This is that document.

It is also not a recommendation. `DEFLECTION-RESULTS.md` records that the
deflection layer **failed** its own preregistered usefulness rule — the
rule required at least half the holdout cases to establish completeness,
and six of twenty did — and that verdict stands. What follows is what an integration
would have to satisfy *if* someone decided to do it anyway, plus the three
findings below, which are the reason this document is longer than a type
signature.

Three things came out of writing it that were not obvious going in:

1. **The restricted domain is not an edge case for charts.** On 32.87 per
   cent of days between 1900 and 2100, at least one charted body is inside
   the five-degree floor (§3). A chart is not allowed to have holes, so an
   integration must decide a fallback policy before it writes a line of
   code.
2. **The package already contains two different policies for the same
   geometry**, and they disagree exactly where it matters (§2.5). The
   released pointwise reducer deflects inside the floor and reports a
   clamp; the new search declines. Neither is wrong; an integration that
   mixes them without noticing would be.
3. **The correction is smaller than two discrepancies already sitting
   beside it.** The largest deflection the supported domain admits is
   0.0948 arcsec. The planet-centre-versus-system-barycentre difference
   between the two ephemeris sources is of the same order for Jupiter,
   Saturn and Pluto (§4.2), and the topocentric parallax both stacks omit
   reaches about a degree for the Moon (§4.3). Adding the first while
   ignoring those would be precision theatre.

A fourth thing, found while checking the first three and recorded here
because an adapter would hit it immediately: production does **not** apply
light-time or aberration to the Moon (§1). It computes the Moon by a
different route from the nine planets, and a comparison that did not know
that would measure a missing correction and report it as an
implementation difference.

---

## 1. What the production chart path does today

Read from the code, not assumed. `src/lib/engine/full.ts` delegates to the
vendored `@zodiacs/engine`, whose body positions come from
`astronomy-engine`:

```js
const time = MakeTime(date);                       // a JS Date; UTC in
const equatorial = GeoVector(body, time, true);    // light-time + aberration
const ecliptic = RotateVector(Rotation_EQJ_ECT(time), equatorial);
```

So the production chart applies, **to the nine `PLANETS` only**:

| | |
| --- | --- |
| time in | a JS `Date` — a UTC instant, converted to TT inside `astronomy-engine` by its own ΔT model |
| light-time | yes, iterated to 1e-9 day, up to ten passes (`CorrectLightTravel`) |
| annual aberration | yes — the literal `true` third argument to `GeoVector` |
| frame | EQJ → **ecliptic of date, true equinox of date** (`Rotation_EQJ_ECT`) |
| solar deflection | **no** |
| observer | the geocentre; latitude and longitude reach only the angles and houses |

The frame is the **same frame** the of-date and deflected experimental
modes use. That is the one place the two stacks already agree, and it is
worth saying because it is the only one.

*Correction, 2026-09-23.* The same frame definition, not the same model.
`astronomy-engine`'s nutation keeps five of the 77 IAU 2000B terms
(`iau2000b` in `astronomy.js`), where the experimental modes use all 77,
adjusted to P03 (`src/core/frame-of-date.mjs`). A longitude comparison
between the two stacks therefore includes a nutation-model difference this
contract does not budget for (the engine audit's
`docs/platform/evidence/engine-audit-2026-09-22/LEDGER.md`,
alpha-search-partition-13).

### The other three bodies do not go through that path at all

`computeBodies` assembles twelve bodies from three different routes, and
only the first gets the corrections above:

* **The nine planets** (Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus,
  Neptune, Pluto) via `eclipticOfDate` → `GeoVector(body, time, true)`.
* **The Moon** via `EclipticGeoMoon`, which is `CalcMoon` rotated into the
  ecliptic of date through the mean obliquity and nutation. It never
  touches `GeoVector`, so it receives **neither the light-time backdating
  nor the aberration** the nine planets get.
* **The nodes**, from the cross product of `GeoMoonState`'s position and
  velocity — the **true** node, not the mean one. The South Node is not
  computed: it is the North Node plus exactly 180°, both carry a hardcoded
  latitude of 0, and both share one speed.

Two consequences an adapter cannot skip. A holdout that compares an
experimental light-time-and-aberration implementation against production
**must exclude the Moon**, or it measures the absence of a correction and
reports it as a difference between two implementations of one. And
deflection applies to the nodes not at all — there is no ray from a
derived point — so an adapter must refuse them rather than approximate.

### Two more properties that constrain any adapter

**The body array is positional.** `computeBodies` returns exactly twelve
entries in one order — Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn,
Uranus, Neptune, Pluto, North Node, South Node — built by pushing the nine
planets, splicing the Moon in at index 1, then pushing the two nodes. An
adapter that returns a different order, or adds or omits one body, silently
misaligns every index-based consumer downstream.

**`speed` is a finite difference, not a derivative.** `longitudeSpeed`
evaluates the longitude at ±0.25 days and divides by 0.5 days, and
`retrograde` is nothing but the sign of that. An adapter supplying an
analytic or interval derivative will not reproduce production's `speed`
near a station, where the ±6-hour window smooths the turn — so any
derivative-based comparison has to declare which of the two quantities it
is matching before it measures anything.

### And the instant itself is not a pure function of the input

`src/lib/time/localToUtc.ts` resolves local civil time through `Intl`,
which is the only correct way to handle historical offsets — and which
means the UTC instant depends on the host's ICU/tzdb version. It also makes
three policy choices the adapter inherits rather than decides: a DST fold
takes the earlier instant and flags `dst-fold`, a gap shifts forward and
flags `dst-gap`, and a non-integer-minute offset flags `lmt`. Separately,
an unknown birth time is **not** a special mode: `ChartCalculator`
substitutes local 12:00 and computes every position from it, suppressing
only the angles and houses. A chart with `timeKnown: false` still asks the
ephemeris a real question at a substituted instant.

## 2. The five mismatches

### 2.1 The question shape — and this is the big one

A natal chart asks *what is the longitude of each of twelve bodies at one
instant*. The experimental subpath answers *when, inside this window, does
one body's longitude reach this value*. Those are different operations, and
the search is the wrong one:

```js
// What the experimental subpath offers today:
x.searchRetardedAberratedDeflectedOfDate({ body, targetDeg, fromTdbSec, toTdbSec });
```

There is no deflected **pointwise** entry point. A chart integration cannot
be built on the search, and an adapter must therefore supply one — see §5.

### 2.2 Time scale

Production hands in a JS `Date` and lets `astronomy-engine` do UTC → TT.
The released runtime takes **TT days past J2000** (`apparent(body, ttDays)`);
the experimental searches take **TDB seconds past J2000** and do no
conversion at all, deliberately: folding an unbounded conversion into an
operation whose point is a bound would make the bound about something else.

An adapter owns three conversions, and must state the error of each rather
than hiding them in one number:

* **local civil time → UTC.** The site already does this in
  `src/lib/time/localToUtc.ts`, via `Intl`, and it is the only correct way
  to do it for historical offsets. Reuse it; do not hand-roll offsets.
* **UTC → TT.** Leap seconds before 1972, ΔT after. Not the package's
  problem today, and it must not silently become so.
* **TT → TDB.** The reducer's `tdbMinusTt` is the two-term Astronomical
  Almanac form, |error| < 30 µs. The of-date search already reports what
  *its* approximation costs, separately, under
  `uncertainty.timeScale.conversionApproximation.inducedLongitudeArcsec` —
  1.15e-10 arcsec on the cross-runtime fixture. Keep that reporting shape.

*Correction, 2026-09-23.* The second bullet has the split backwards: leap
seconds exist only from 1972. From 1972-01-01, UTC → TT is exact, TT = UTC +
(TAI − UTC) + 32.184 s, with TAI − UTC from the leap-second table. Before
1972, civil time is taken as UT and TT comes from ΔT. After 1972, ΔT is
needed only for UT1, which sidereal time and so the houses use: UT1 = UTC +
(UT1 − UTC) from the IERS, never more than 0.9 s either way (LEDGER.md,
time-8).

### 2.3 Bodies

The chart's twelve are not the package's ten:

| chart body | package | note |
| --- | --- | --- |
| Sun, Moon, Mercury … Pluto | yes | same names |
| **North Node**, **South Node** | **no** | derived points, not ephemeris bodies |

Covered in §1: the nodes are a construction from the Moon's state vector,
so a deflection step applied to them would be a light-bending correction to
something that emits no light. Refuse, do not approximate. The Moon is the
opposite problem — it is in both, and production computes it without the
two corrections it applies to everything else.

*Correction, 2026-09-23.* Refusing the deflection step for the nodes is
right, but a chart cannot leave out two of its twelve bodies. The pack's
Moon state gives the true node by the construction production already uses
(§1: from the cross product of the geocentric Moon's position and velocity),
so an adapter should compute them from it and say so in a provenance field
of their own (alpha-search-partition-13).

### 2.4 What point each source means by "Jupiter"

The pack (DE440s) carries a planetary-*system* barycentre for Mars outward;
every result says so with `isSystemBarycentre: true`. `astronomy-engine`
returns planet centres. These are different points, and §4.2 shows the
difference is not negligible at the precision the deflection correction
operates at.

### 2.5 Two policies for one geometry, and they disagree where it matters

**This is the finding an integration is most likely to trip over.** The
package contains two implementations of the same eraLd model, with the same
finite-distance geometry, and *different behaviour inside the floor*:

| | released reducer (`src/core/reduce.mjs`, `CORRECTED`) | deflected search (`src/core/deflection.mjs`) |
| --- | --- | --- |
| deflection on | yes, `deflection: 'sun'` | yes |
| `q` geometry | real Sun→source at emission | the same |
| limiter `dlim` | **`1e-14`, a constant** | **`1e-6 / max(em², 1)`, ERFA's own** |
| where the limiter bites | below ≈0.03 arcsec of elongation | below ≈292 arcsec |
| elongation floor | **none** | **5 degrees** |
| inside the floor | returns a deflected place, with `deflectionLimiterBound` | **declines**: `accounting.excluded` |

So for a chart with Mercury at one degree of elongation, the released
pointwise path returns a direction moved by **0.110 to 0.148 arcsec**
(heliocentric 0.3075 to 0.4667 au, superior conjunction, observer at 1 au)
and does not flag it: `deflectionLimiterBound` is false, because at
`q·(q+e) = 1.5e-3 … 2.8e-3` the clamp is **eleven orders of magnitude** from
firing. The new search declines that span entirely.

How much of that lands in *longitude* depends on where the body sits
relative to the ecliptic — the deflection is radially away from the Sun,
and projecting it is the adapter's job. Both are
defensible; they are answers to different questions, and the difference is
a deliberate consequence of where each sets its limiter. What is *not*
defensible is an integration that takes one path's numbers and the other
path's claims.

Note also that `dlim` is **not an error cap**. It is φ²/2, the separation at
which limiting *begins*; the deflection at the ERFA threshold is 5.7586
arcsec, not a tenth of an arcsecond. Any adapter documentation that
describes the clamp as bounding the angular error would be repeating a
mistake this profile exists to avoid.

## 3. The restricted domain, in chart terms

Daily samples, 1900-01-01 to 2100-01-01 (73 050 days), elongation taken
from `GeoVector(body, time, true)` — the same call the production engine
makes — so this is the elongation a chart would actually present the
profile with. Reproduce with
`docs/platform/evidence/precision-deflection/chart-adapter/elongation-census.mjs`.

| body | days inside the 5° floor | per cent | closest approach |
| --- | ---: | ---: | ---: |
| Mercury | 9 449 | **12.94 %** | 0.0487° |
| Venus | 4 959 | 6.79 % | 0.0245° |
| Mars | 3 339 | 4.57 % | 0.0598° |
| Jupiter | 2 386 | 3.27 % | 0.1162° |
| Saturn | 2 119 | 2.90 % | 0.0307° |
| Uranus | 2 107 | 2.88 % | 0.0520° |
| Neptune | 2 053 | 2.81 % | 0.0186° |
| Moon | 1 262 | 1.73 % | 0.2300° |
| Pluto | 377 | 0.52 % | 0.2422° |

**At least one body is inside the floor on 24 014 of 73 050 days — 32.87
per cent.** Two or more on 4.98 per cent; five on six separate days.

Two honest caveats. Daily sampling reports a *proportion of sampled days*,
not a proof about every instant: Mercury's elongation moves about 1.5
degrees a day near conjunction, so a sub-day excursion below the floor can
fall between samples. And the Sun itself is at zero elongation by
definition; it is not in the table because the profile answers it
explicitly and undeflected (a body does not deflect its own light), which
is the right answer rather than a gap.

The consequence for an adapter is structural, not numerical. **A chart is
not allowed to have holes.** "Mercury: declined" is not a chart. So an
integration must pick a fallback policy *before* it starts, and the policy
must be visible in the output — which is §5.2.

## 4. The magnitude, in chart terms

### 4.1 Against what a chart shows

Distant-source closed form, observer at 1 au, `atan((SRS/em)·cot(φ/2))`.
These are the **limit** as the source recedes, so they are upper bounds for
a planet: at a finite 67 au the same construction gives 0.4596 arcsec at
one degree against the 0.4666 below, because the angle subtended at the Sun
is smaller by the source's own parallax.

| solar elongation | deflection | as degrees |
| ---: | ---: | ---: |
| 0.05° | 9.332″ | 2.59e-3 |
| 0.1° | 4.666″ | 1.30e-3 |
| 0.3° | 1.555″ | 4.32e-4 |
| 1° | 0.4666″ | 1.30e-4 |
| 3° | 0.1555″ | 4.32e-5 |
| **5° (the floor)** | **0.0933″** | 2.59e-5 |
| 10° | 0.0465″ | 1.29e-5 |
| 30° | 0.0152″ | 4.22e-6 |
| 90° | 0.0041″ | 1.13e-6 |

With the observer at perihelion (em = 0.98329 au) the five-degree value
rises to **0.094847 arcsec**, which is the largest deflection the supported
domain admits.

How far above a real planet those numbers sit is worth seeing once. Mercury
at the floor, at superior conjunction, gets **0.021 to 0.029 arcsec** — a
third of the table's 0.093 — because a body inside the Earth's orbit
subtends a much smaller angle at the Sun than a distant one does. The table
is an upper bound on the correction, not an estimate of it.

Charts display longitudes to about an arcminute. **0.0948 arcsec is 1/633
of that.** Inside the supported domain this correction cannot move anything
a reader sees — not a sign, not a house, not an aspect orb at any
conventional tolerance. That is not an argument against computing it; it is
an argument against describing it to a reader as an improvement they can
observe. A correction-induced shift in a computed quantity is not by itself
an accuracy improvement.

### 4.2 Against the convention difference sitting next to it

Mass-weighted satellite displacement of each system barycentre from its
planet's centre, from published masses and mean semi-major axes; `max` is
every satellite aligned, `rms` is what independent phases give. Reproduce
with `.../chart-adapter/barycentre-offset.mjs`.

| system | max | rms | at min geocentric distance | max | rms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Jupiter | 227 km | 138 km | 4.2 au | 0.0745″ | 0.0453″ |
| Saturn | 303 km | 289 km | 8.0 au | 0.0522″ | 0.0499″ |
| Pluto | 2 126 km | 2 126 km | 28.7 au | **0.1022″** | 0.1022″ |
| Uranus | 44 km | 27 km | 17.3 au | 0.0035″ | 0.0022″ |
| Neptune | 74 km | 74 km | 28.8 au | 0.0035″ | 0.0035″ |
| Mars | 0.0 km | 0.0 km | 0.52 au | 0.0000″ | 0.0000″ |

These are order-of-magnitude estimates from published constants, not
measurements on a date. They are enough to make the point: **for Pluto the
centre/barycentre convention difference exceeds the entire supported-domain
deflection maximum, and for Jupiter and Saturn it is the same order.** An
adapter that added solar deflection while leaving the body-point convention
unreconciled would be adding a correction smaller than an unresolved
discrepancy beside it.

### 4.3 Against the correction production already omits

Both stacks put the observer at the geocentre, so neither applies
topocentric parallax. For the Moon that omission is not small:

| | |
| --- | --- |
| lunar horizontal parallax, perigee | 61.5′ |
| mean | 57.0′ |
| apogee | 53.9′ |
| **largest supported-domain deflection** | **0.0948″** |

A topocentric observer sees the Moon up to about **a degree** from where
the geocentre does — some forty thousand times the correction under
discussion, and unlike the deflection it is plainly visible at chart
display precision. Production is geocentric by design and says so, and the
package's contract says so too; the point is not that either is wrong. It
is that "make the chart more accurate" and "add solar deflection" are not
the same project, and a contract that did not say which one it was serving
would be inviting the wrong one.

## 5. The contract

### 5.1 What the package must supply, and does not yet

A chart needs a **pointwise deflected apparent direction with an explicit
domain verdict**. The released `Reducer.apparent()` is pointwise and
deflects, but has no domain verdict; the new search has the domain verdict
but is not pointwise. The missing piece is the intersection:

```ts
interface DeflectedPlaceRequest {
  body: Body;              // the package's ten; NOT the nodes
  ttDays: number;          // TT days past J2000; conversion is the caller's
  profile?: 'zodiacs-deflected-of-date/1';
}

type DeflectedPlace =
  | {
      supported: true;
      body: Body;
      isSystemBarycentre: boolean;
      lon: number; lat: number;          // degrees, ecliptic of date, true equinox
      distKm: number;
      deflectionArcsec: number;          // what this step moved, pointwise
      elongationDeg: number;             // the domain quantity, reported
      limiterActive: boolean;            // reported ALWAYS, not only when true
      profile: 'zodiacs-deflected-of-date/1';
    }
  | {
      supported: false;
      body: Body;
      reason: 'elongation-below-floor' | 'degenerate' | 'is-the-deflector';
      elongationDeg: number;
      floorDeg: 5;
      // No lon/lat. A refusal that carried a number would be used as one.
    };
```

Four obligations on that shape, each the consequence of something already
established rather than a preference:

1. **A refusal carries no longitude.** `deflectionDomain()` already returns
   `supported: false` with a reason; the transport must not add a
   "best-effort" value beside it, because a caller under deadline will read
   it. This mirrors the search, where a declined span appears in
   `accounting.excluded` and *not* as a zero-width event.
2. **`limiterActive` is reported unconditionally**, not only when it fired.
   The reducer already does this (`deflectionLimiterBound`). A field that
   appears only on the bad path is a field nobody checks.
3. **`is-the-deflector` is a separate reason from `elongation-below-floor`.**
   The Sun is answered — undeflected, and completely — and collapsing the
   two reasons would turn a correct answer into a refusal.
4. **The profile id travels with the number.** Two profiles differing only
   in their limiter produce different longitudes inside the floor (§2.5).
   A longitude without its profile cannot be compared with another one.

### 5.2 What the chart must do with it

The chart's own contract, which the package cannot enforce:

1. **Use the fallback the profile already prescribes.** This is not an
   open design question: `DEFLECTION-PROFILE.md` §7 says that inside the
   excluded region the caller should use **rung 4**, the undeflected
   of-date place, "which has no solar term and no near-Sun degeneracy, and
   whose answer there is exactly as good as it is anywhere else", and calls
   that "a documented downgrade the caller chooses, not a substitution this
   profile makes". The released reducer's clamped deflection (§2.5) is the
   other thing a chart could reach for, and the same section rejects it in
   as many words: "**Not** a silently limited number". So the adapter's
   shape follows — a per-body, per-instant rung selector, with a
   **provenance field on each body recording which rung answered it**.
   Swapping rungs silently behind one API would reintroduce exactly the
   conflation the profile refuses to make.
2. **Carry the fallback into the output**, per body, not as a chart-level
   footnote — on 27.9 per cent of days exactly one body is inside the floor
   and on 4.98 per cent two or more are, so a chart-level flag would be
   describing the wrong scope. The site's `ChartFlag` union is the existing
   place for this and would need a new member.
3. **Do not describe the result as an accuracy improvement** (§4.1), and do
   not describe the clamp as an error cap (§2.5).
4. **Reconcile the body-point convention first** (§4.2), or state that it
   has not been.
5. **Decide the Moon explicitly.** Production computes it without
   light-time or aberration (§1); the experimental modes apply both. An
   adapter that routes the Moon through the new path changes it by more
   than the deflection it was added for, and an adapter that does not
   leaves one body on a different correction stack from the other nine.
   Either is defensible; neither is defensible by accident.
6. **Preserve the twelve-body order** (§1). The array is positional at the
   engine boundary, so a reordering is a silent data corruption rather
   than a type error.

*Correction, 2026-09-23.* This list names no policy for instants outside
the pack's coverage (1849-12-25 to 2150-01-21 for `c9ebc641…`), and
production computes any date. An adapter needs one, stated per body like
the rung selector: refuse, or answer from the production path and record
that it did (alpha-search-partition-13).

### 5.3 What stays out, and stays out on purpose

Carried forward unchanged from the experimental subpath's terms, and
stated here as the conditions an adapter would have to keep rather than as
good intentions:

* **No automatic pack download.** The runtime needs a coefficient pack; the
  production engine needs none. This is currently enforced, not merely
  intended: `scripts/build-precision-preview.mjs` scans both built bundles
  raw for `fetch(`, `XMLHttpRequest`, `sendBeacon`, `localStorage` and
  `indexedDB`, and fails the build on any of them. The package does contain
  a network loader, and `src/browser.mjs` re-exports everything from
  `index.mjs`, so the property survives on that scan rather than on an
  import list staying tidy. **Code distribution and coefficient-pack rights
  remain separate questions** that a chart integration does not get to
  merge.
* **No birth-data upload, no persistence, no analytics carrying inputs, no
  connector reconfiguration.** A chart's input is birth data. Everything
  stays in the page — which on the preview is structural: the only sink for
  what a visitor types is `postMessage` into the worker, and the service
  worker excludes the route from Cache Storage outright, because stopping
  registration is not enough against an already-active worker at scope `/`.
* **The public preview's worker-termination behaviour is retained as it
  is.** That behaviour has a precise shape, and "retained" means these
  things and not a general intention. The only cancel is
  `Worker.terminate()` — a polled signal was removed because the worker
  cannot read a message while inside a synchronous search — and
  `hardStop()` settles every outstanding promise with a refusal, zeroes
  `inFlight`, bumps **both** generation counters and reassigns the
  module-level `worker` binding. A mode that opened its own request
  channel, promise map or generation counter would not be reset by it: its
  promises would hang forever and a late reply could paint after a cancel.
  Any new mode must route through `ask()`/`pending` and add its generation
  to `gen`.
* **The deflected mode is not on the preview, and there is a reason beyond
  "it is experimental".** One worker serves both panels there, so a cancel
  from the search panel drops the pack the places panel is using, and a
  long search blocks places entirely. At 47 to 831 times the of-date cost
  on a window containing a conjunction, this mode would make one request
  able to freeze the page with terminate-and-reload as the only exit.
  Confirmed for this change, and stated precisely because the obvious
  phrasing is wrong: `node scripts/build-precision-preview.mjs --check`
  reports no DRIFT between the committed bundles and what the generator
  produces — which is not the same as "this work did not change them". It
  did: `git diff bc84c102..HEAD -- public/precision-preview/worker.mjs`
  is +3 lines, the `excluded`-span guard bundled in from
  `src/core/result.mjs`. What is unchanged is the surface: the only mode
  string in the built worker is still `validated-geometric`.
* Nothing here assumes the preview's headers support `SharedArrayBuffer`,
  and nothing here proposes changing global security headers.
* **The production engine is not replaced**, and nothing here claims Swiss
  Ephemeris has been surpassed.

## 6. Before any of this would be worth building

The preregistered evaluation said no, and the reason was cost, not
correctness: the deflection layer establishes completeness on six of twenty
bounded-search cases where the rule required at least ten, and costs 47 to
831 times the of-date mode on a window containing a conjunction. A pointwise adapter does not inherit that
cost — the expensive part is isolating the domain boundary, which a
pointwise call never does — so a chart integration is a *different* cost
question from the one the evaluation answered, and would need its own
preregistered rule before anyone measured it.

What that rule would have to fix, before any measurement:

* the fallback policy of §5.2, chosen and written down;
* what counts as a correspondence between a chart computed two ways, given
  that the correction is 1/633 of display precision (§4.1) — a rule that
  measures longitude differences will measure rounding, not deflection;
* whether the body-point convention (§4.2) is reconciled first or declared
  unreconciled, since it dominates the quantity being added.

Until those exist, this document is the deliverable and the integration is
not started.
