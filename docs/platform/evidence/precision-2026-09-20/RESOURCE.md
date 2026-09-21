# What each system actually costs

Section 6 of the brief asks for the real data and executable requirements of
both systems under named configurations, with the phases kept apart and the
cross-language overhead identified rather than claimed as an algorithmic
result. This is that measurement, and it corrects a comparison in the previous
study along the way.

## Named configurations

| | Swiss | Zodiacs core | Zodiacs DE prototype |
| --- | --- | --- | --- |
| library | Swiss Ephemeris 2.10.03 via pyswisseph 2.10.3.2 | `@zodiacs/engine` 0.1.1-rc.6 | prototype over `de440s.bsp` |
| runtime | CPython 3.11.15 | Node v22.22.2 | Node v22.22.2 |
| data | `sepl_18.se1` + `semo_18.se1` | none | `de440s.bsp` |
| ephemeris verified | `SWIEPH` on every call, refused otherwise | — | — |

## Size, with transitive dependencies named

| item | bytes | note |
| --- | ---: | --- |
| `swisseph…so` (compiled binding) | 3,240,953 | the Swiss C library is inside it |
| `sepl_18.se1` + `semo_18.se1` | 1,788,832 | planets and Moon from 1800; the only two the corpus needs |
| **Swiss subtotal** | **5,029,785** | **4.80 MiB**, plus a CPython runtime |
| `@zodiacs/engine` installed | 122,552 | |
| `astronomy-engine` installed | 1,838,627 | the only runtime dependency |
| **Zodiacs core subtotal** | **1,961,179** | **1.87 MiB**, plus a Node runtime |
| published `@zodiacs/engine` tarball | 36,591 | what a download actually transfers, before its dependency |
| `de440s.bsp` | 32,726,016 | **31.21 MiB**, the prototype's whole disadvantage |

So the core is **2.6× smaller installed than Swiss** and needs no data files;
the prototype is **6.5× larger than Swiss** and that is the thing the compiler
work exists to attack. Reducing 31.21 MiB is not automatically a win over
Swiss's 1.79 MiB of data — it has to get past 1.79 MiB to be one, and the
targets in `PREREGISTRATION.md` do not claim it will.

Neither subtotal includes its language runtime: CPython 3.11's standard
library alone is ~51 MiB on this host, and Node's binary is comparable. Both
are usually already present, which is why they are named rather than added.

## Timing: 8 interleaved rounds, 300 repetitions each

Which system runs first alternates by round, so drift and background load fall
on both sides. Instants vary within every measurement — Swiss caches per
`(jd, body)`, so a repeated instant times a cache hit. Both sides are warmed
before timing: V8 compiles on the hot path, and an unwarmed Node measurement
reports the compiler. Data loading is timed as cold initialisation, never as
calculation.

Median across rounds, [min–max] over the eight:

| system | cold init ms | one body, µs | 10 bodies p50 ms | p95 ms | peak RSS MiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| Swiss | 0.17 | 9.89 | **0.0652** [0.058–0.099] | 0.095 | 12.3 |
| core, `positions()` | 35.20 | 11.21 | 0.4994 [0.466–0.518] | 0.703 | 70.0 |
| core, longitude only | 1.36 | 14.75 | **0.1609** [0.156–0.175] | 0.325 | 66.4 |
| DE prototype | 17.78 | 47.90 | 0.3132 [0.294–0.327] | 1.108 | 62.8 |

### What is comparable, and what is not

**One body, varying instant: Swiss 9.89 µs, core 11.21 µs — 1.13× apart.**
Two different languages, two different ephemeris models, essentially the same
per-call cost. That is the number to keep in mind before reading anything else
as a language effect: at this granularity there is barely a language effect to
find.

**Ten bodies is where they separate, and it is not the language.** Swiss does
ten bodies *with speed* in 0.0652 ms — 6.5 µs per body, cheaper than its own
single-body cost, because bodies sharing an instant share work. The core's
longitude-only path costs 0.1609 ms, 16 µs per body, and gets no cheaper with
more bodies. That is a scaling property of the two implementations, not of
Python versus JavaScript.

**The matched comparison is prototype vs core at the same workload.** Ten
apparent longitudes in the true ecliptic of date, no latitude, no speed:

```
  core, longitude only   0.1609 ms
  DE prototype           0.3132 ms     1.95x slower
```

The previous study reported 2.07× for this, and that figure survives — but the
comparison it came from did not. `prototype/perf.mjs` timed the prototype
against `Ecliptic(GeoVector(...))`, which is the **J2000** ecliptic rather than
the ecliptic of date, computes **no speed**, and ran at a single repeated
instant where astronomy-engine's per-time caches are warm. It was labelled "the
production core doing the same ten bodies" and was none of those things. The
ratio came out close to right for the wrong reasons; `core-lonly` in
`tools/resource/bench-zodiacs.mjs` is the mode that actually matches.

**`positions()` — the core's real public API — costs 3.1× its longitude-only
path**, and the reason is a finding in its own right. See below.

### Memory

| system | RSS before load | after load | peak | attributable |
| --- | ---: | ---: | ---: | ---: |
| Swiss | 12.1 | 12.1 | 12.3 | **0.2 MiB** |
| core `positions()` | 46.4 | 59.2 | 69.5 | 23.1 MiB |
| core longitude only | 46.3 | 47.5 | 67.2 | 20.9 MiB |
| DE prototype | 46.4 | 57.3 | 63.0 | 16.6 MiB |

Swiss's data does not enter its resident set at all — it reads the `.se1`
files lazily and the process stays at 12 MiB. A bare Node process on this host
starts at ~46 MiB, so the honest comparison is the attributable column, not the
peak. The prototype's 16.6 MiB attributable against a 31.21 MiB file confirms
the reader is paging rather than loading, which also explains its 17.78 ms cold
initialisation: it indexes the segment table, not the coefficients.

## The core computes velocity by finite difference, at 3× cost and with error

`longitudeSpeed` in the shipped engine takes a central difference with a
**0.25-day** step:

```js
const stepDays = 0.25;
const before = longitudeAt(body, new Date(date.getTime() - stepDays * 864e5));
const after  = longitudeAt(body, new Date(date.getTime() + stepDays * 864e5));
```

Two consequences, both measured.

**Cost.** Each body costs three position evaluations instead of one. That is
most of the gap between the longitude-only path (0.1609 ms) and `positions()`
(0.4994 ms). Swiss gets velocity from the analytic derivative of the same
Chebyshev polynomial it already evaluated, for almost nothing — which is why it
does ten bodies *with* speed faster than the core does ten without.

**Accuracy.** A central difference has truncation error ≈ (h²/6)·f‴, and with
h = 0.25 day that is not negligible for a fast, curved body. Measured against
Swiss on the 18-case corpus, in arcseconds per day:

| body | max | median |
| --- | ---: | ---: |
| Moon | **4.236** | 1.631 |
| Mercury | **1.802** | 0.469 |
| Venus | 0.332 | 0.051 |
| Saturn | 0.163 | 0.017 |
| Sun | 0.138 | 0.062 |
| Mars | 0.112 | 0.033 |
| Jupiter | 0.060 | 0.023 |
| Uranus | 0.047 | 0.018 |
| Pluto | 0.046 | 0.015 |
| Neptune | 0.042 | 0.015 |

The Moon's equation of centre alone predicts ≈2.8″/day of truncation error at
this step size; the measured 4.24″/day is the same order with the rest of the
lunar theory included, so the mechanism is identified rather than guessed.

This matters beyond speed fields. Station times and longitude-crossing
searches are found from the velocity, so a velocity error displaces the event,
which is the territory of the Uranus D contract. And it is why
`PREREGISTRATION.md` carries a **separate** velocity budget (T7): a compact
representation with analytic derivatives could improve both the cost and the
error here, and a position-only measurement would not show it.

The DE prototype has the same shape of problem in a different place — it takes
the observer's velocity by central difference over 60 s for aberration — and
its 47.90 µs per single body reflects that plus up to five light-time
iterations per body.

## What this does not establish

- **Nothing here is an algorithmic claim about Python versus JavaScript.** The
  single-body figures are 1.13× apart across the two runtimes; every larger gap
  reported above is traced to a specific difference in what the code does.
- Swiss is faster at this workload, on this host, in this configuration. That
  is a measurement of three programs, not a statement about ephemeris quality,
  and it says nothing about which is closer to the sky.
- These are single-host figures. The variability columns show the spread
  across rounds on one machine; they are not a claim about other hardware.

Raw: `raw/resource-rounds.jsonl` (32 rounds of JSON, one object per
system per round), `raw/resource-summary.json`. Reproduce with
`sh tools/resource/drive.sh <out.jsonl> 300 8`.
