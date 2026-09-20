# precision-alpha

An experimental runtime that reads a compact ephemeris pack, computes apparent
geocentric places with a corrected reduction, and runs a bounded
longitude-event search — in a browser and in Node, from one copy of the
numerical rules.

It is an alpha. It does not replace the production engine, it is not wired
into the site, and no pack is distributed with it.

## What it supports, exactly

**Bodies.** Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune,
Pluto. For **Mars, Jupiter, Saturn, Uranus, Neptune and Pluto** the DE440s
kernel carries only the planetary-*system* barycentre, so that is what this
returns; every result for them carries `isSystemBarycentre: true` and the
field is not cosmetic. Mercury, Venus, the Moon and the Earth have body-centre
segments and are the real thing.

**Coordinates.** Apparent geocentric ecliptic longitude and latitude of date,
in degrees, referred to the true equinox and equator of date, plus the
geometric geocentric distance in km. The observer is the geocentre: there is
no topocentric parallax, no diurnal aberration and no refraction.

**Velocities.** The backend returns the barycentric ICRF state derivative in
km/s, taken as the analytic derivative of the same Chebyshev polynomial as the
position rather than a finite difference of it. No apparent angular rate is
reported, because a rate consistent with light-time and aberration is not the
state derivative rotated, and the search differentiates the reduction as a
whole instead.

**Corrections applied.** TDB−TT (two-term Astronomical Almanac form, error
under 30 µs); light-time iteration to a caller-set tolerance; gravitational
light deflection by the Sun (the `eraLd` form, with the near-limb clamp set
far below the solar limb and reported when it binds); annual aberration
(special-relativistic, with a first-order switch); IAU 2000 frame bias; IAU
2006 precession; IAU 2000B nutation, all 77 published luni-solar terms,
adjusted to P03.

**Not modelled.** ΔT — the caller supplies TT, not UTC. Deflection by anything
but the Sun. Anything topocentric. IAU 2000A nutation: on this corpus it moves
apparent longitude by at most 0.0025″ for seventeen times the table, so it is
not carried; the research track keeps it for that comparison.

**Barycentric position is not offered**, and that is a decision rather than an
omission. The compression work declared a 0.2 km target on the barycentric
Moon and missed it: 0.165 km sampled, but **0.449 km on the proven bound**, and
the target is on the bound. Geocentric output — which is what this package
does expose — is a different quantity and is inside the target (0.00946 km
sampled, 0.0224 km proven), because the EMB term cancels against the observer.
Earth and Moon are derived from the same two stored bodies through the pack's
EMRAT, so their errors are correlated, and no geocentric bound here is built by
adding them as though they were independent. `CONTRACT.barycentricPositionExcluded`
carries this.

`CONTRACT` in `src/core/reduce.mjs` is this list in machine-readable form, and
`SEARCH_CONTRACT` in `src/core/search.mjs` is the equivalent for events.

## Structure

```
src/core/     environment-neutral: no node:*, no Buffer, no require, no clock
  errors.mjs            typed errors with codes
  source.mjs            the byte-source contract both loaders implement
  container.mjs         parse, validate, and the integrity POLICY
  ephemeris.mjs         Chebyshev evaluation, analytic derivative
  nutation*.mjs         IAU 2000B, from the published series
  frames.mjs            bias, precession, nutation as explicit matrices
  reduce.mjs            the apparent-place reduction — one copy, every caller
  interval-search.mjs   the bounded typed-verdict search
  search.mjs            longitude events over the reduction
src/index.mjs   open, run, dispose — everything except how bytes arrive
src/browser.mjs fetch / Response / Blob. No shims, no polyfills.
src/node.mjs    whole-file load, or a file-backed low-memory load.
```

The browser and Node entry points differ only in which byte source they
build. There is no second copy of the reduction, the validation or the
integrity policy for either to drift from.

## Three different things, never conflated

1. **Structural validity** — the artifact is self-consistent and safe to read.
   `parseContainer` decides this, synchronously, and allocates nothing from a
   header number it has not already bounds-checked.
2. **Integrity** — the bytes match a digest. The pack format used here
   (`ZODEPH02`) carries a SHA-256 over *everything before it*, header
   included; the earlier `ZODEPH01` hashed only the payload, which left
   `intervalSec`, coverage, EMRAT and every scale factor covered by nothing.
   Editing `intervalSec` in a v1 pack moved the Moon by 5.7·10⁵ km and verified
   clean. v1 packs are refused; `tools/seal.mjs` converts one without touching
   a coefficient.
3. **Authenticity** — that the pack came from a particular party. **This
   package does not establish that**, and says so on every result:
   `integrity.authenticity` is the sentence "not established: a digest stored
   in the artifact cannot attest to its source". Passing `expectDigest`, a
   digest you obtained *out of band*, is the only input here that gets closer.

There is no option to skip verification. A pack that does not verify does not
open — in the demo, in the tests, anywhere.

## Using it

```js
import { openPackFile, CORRECTED } from '@zodiacs/precision-alpha/node';

const rt = await openPackFile('/path/to/pack.zeph');
rt.apparent('Moon', 8765.5, CORRECTED);
// { body: 'Moon', lon: 155.982712…, lat: 3.568141…, distKm: 404633.75…,
//   isSystemBarycentre: false, lightTimeSec: …, dpsiArcsec: …, … }

rt.search({
  kind: 'aspect', body: 'Moon', other: 'Sun', targetDeg: 0,
  fromTtDays: 8766, toTtDays: 9131,
  epsilonDeg: 1 / 3600,          // required: declare the allowance up front
});
rt.dispose();
```

`ttDays` is TT days past J2000. `epsilonDeg` has no default on purpose:
choosing the angular allowance after seeing the margin is the move the
original Uranus D contract forbids, so the search will not choose it for you.

In a browser, `openPackFromUrl`, `openPackFromResponse` or `openPackFromBlob`
from `@zodiacs/precision-alpha/browser`. `crypto.subtle` is exposed only on a
secure context, so a page served over plain http on a non-localhost origin
cannot verify a pack; the failure says exactly that rather than degrading.

## What a search result means

It reports six things separately, because they answer different questions:

- `candidates` — what was found, each with a bracket, not a bare instant.
- `interval` — what was actually processed, with the subdivision floor.
- `isolation` — the verdict, and `meaning`, which states what the verdict is
  relative to. `support` is `'empirical'` for anything ephemeris-backed:
  ordinary floating-point evaluation of a Chebyshev sum is not interval
  arithmetic, so the completeness claim holds *given* the declared derivative
  bounds, which were sampled and inflated, not proven. Those bounds and the
  inflation factor are on the result.
- `robustness` — how far each crossing moves under a one-epsilon displacement.
  A local estimate, and labelled as one.
- `unresolved` — intervals that stayed open. A certified count with a
  non-empty `unresolved` is a contradiction and cannot be produced.
- `externalUncertainty` — how far this reduction sits from the sky, from
  another ephemeris, or from the true dynamics. **Not bounded here**, not
  folded into epsilon, and it says so.

`exactArithmetic` is never set, which permanently closes tangency
certification to ephemeris-backed functions.

## Licences

See `NOTICE.md`. The nutation coefficients come from ERFA (BSD-3-Clause,
derived with permission from IAU SOFA); `LICENSE-erfa` is the required notice.
No kernel, no pack and nothing from Swiss Ephemeris is committed here.

## Acceptance

`ACCEPTANCE.md` is the checklist this work is measured against, frozen before
implementation. Items are marked from evidence, and never because a different
item passed.
