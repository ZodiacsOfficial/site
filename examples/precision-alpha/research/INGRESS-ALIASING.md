# Does the site's own ingress generator have the aliasing hole?

The counterexample that motivated `validated-geometric` was synthetic: an
angle making 96 turns across the 96 default sampling intervals, answered
`no-crossing, certified, 0`. The obvious question is whether anything
zodiacs.org actually publishes rests on the same kind of reasoning.

`scripts/build-ingresses.mjs` does. It scans on a **1-day step**, reads
`Math.floor(lon / 30)` at each sample, and bisects wherever that index
changes — and its docstring justifies the step like this:

> Horizons (1-day scan throughout; Mercury tops out near 2.2°/day against
> 30° signs, so nothing hides)

**That is the wrong argument for the failure mode that matters.** A speed
bound of 2.2°/day against 30° signs rules out *skipping a whole sign*
between samples. It says nothing about a **retrograde double-crossing**:
the planet crosses a boundary, turns, and crosses back, so the sign index
is equal at both samples and both crossings are invisible. Bisection is
also wrong in that bracket — with three roots in it, `refine()` converges
to an arbitrary one.

It is the same shape of mistake as using a sampled velocity maximum as a
proven bound, which is the thing this whole package exists to avoid.

## The measurement

A hidden double-crossing needs a **station** — the planet must turn — and
the station must sit within the excursion the planet makes in half a scan
step of the boundary. Both are measurable. `station-margin.mjs` finds
every station in each scanned window and reports the distance from the
station's longitude to the nearest 30° boundary, beside the largest
excursion within ±12 h of it (half of the 1-day step; by symmetry about
the station, that is the right comparison).

| planet | stations | closest station to a boundary | max excursion ±12 h | margin |
| --- | --- | --- | --- | --- |
| Mercury | 22 | 2.5306° (2027-07-04) | 0.0239° | 106× |
| Venus | 4 | 3.1806° (2028-06-22) | 0.0050° | 636× |
| Mars | 4 | 5.0706° (2029-05-05) | 0.0016° | 3169× |
| Jupiter | 59 | 0.2162° (2037-11-16) | 0.0004° | 540× |
| Saturn | 194 | 0.1077° (2076-04-07) | 0.0002° | 539× |
| Uranus | 396 | **0.0019° (2086-06-03)** | 0.0001° | **19×** |
| Neptune | 398 | 0.0401° (1997-05-01) | 0.0001° | 401× |
| Pluto | 398 | 0.0260° (2066-06-29) | 0.0001° | 260× |

1 475 stations, and the tightest margin anywhere is Uranus at 19×.

`ingress-density.mjs` is the cruder cross-check: re-run the same scan at a
6-hour step and compare crossing counts. All nine bodies agree with the
1-day scan. That is corroboration, not an argument — quadrupling the
density is still sampling.

## What this does and does not establish

**The published `ingresses.json` is not affected.** No planet comes close
enough to a boundary at a station for a double-crossing to fit inside one
scan step, by a factor of at least 19.

**The generator's stated reason is still the wrong reason**, and a reason
that does not address the failure mode will not notice when it stops
holding. The margin is a property of where stations happen to fall in
1900–2100; it is not structural, and the windows are refreshed yearly.

**This is not a proof.** Stations are located by a 1-day scan of the rate,
so a station pair closer together than a day would be missed — not a real
risk for these bodies, whose station pairs are weeks apart, but it is
sampling, not enclosure. The excursions are four evaluations each.

Suggested fix, in the generator rather than here: replace the speed
sentence with the station-margin argument, and add the margin to the
self-validation the script already runs (it refuses to write on
contiguity, missing-sign and sub-12h-sliver failures). That turns a
comment into a gate.

**Not checked:** `build-eclipses.mjs`, `build-transits.mjs`,
`build-sky.mjs`. Same question, not yet asked.
