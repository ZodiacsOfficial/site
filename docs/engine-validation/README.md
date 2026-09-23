# What has been measured about this engine, and what has not

One page for a question that was answered in five places. Each section below
says what was measured, against what, what came out, and — the part that
matters most — what the result does not establish.

Read it with one thing in mind: **every comparison here is against another
program, not against the sky.** Nothing in this directory was checked against
an observation, and nothing here says otherwise.

The shared lineage is real but not uniform, and the difference matters for the
two bodies that produce the extremes below. Swiss Ephemeris and JPL Horizons
read JPL development ephemerides directly. Astronomy Engine's planets come
from VSOP87, whose lineage runs back to DE200 — so for those, agreement is
largely consistency rather than corroboration. Its Moon does not: that is the
Nautical Almanac Office's *Improved Lunar Ephemeris*, from E. W. Brown's
analytic theory, which predates the DE series. Its Pluto is a custom
integrator, because VSOP87 has no Pluto model. Moon and Pluto are therefore
less derivative of the reference than the rest, which makes their residuals
more informative rather than less — but it is still one implementation against
another, and none of it is an observation.

Software under test: `@zodiacs/engine` (the site runs the same package;
`src/lib/engine/package-integration.test.ts` pins the two to one version).
Its positional series come from [Astronomy
Engine](https://github.com/cosinekitty/astronomy) by Don Cross, MIT, built on
VSOP87 and NOVAS with the Nautical Almanac Office's *Improved Lunar
Ephemeris* for the Moon. Zodiacs did not write those models.

| dimension | measured against | result | where |
| --- | --- | --- | --- |
| Positions | JPL Horizons vectors, in-suite (provider version unrecorded) | 14.77″ worst | `src/lib/engine/engine.test.ts` |
| Positions | Swiss 2.10.03 / DE441, 6 frozen cases | 6.07″ node longitude | [`swiss-node-polar/`](swiss-node-polar/) |
| Positions | Swiss 2.10.03 / DE441, 8 epoch and station cases | inside frozen gates (a pass, not a residual) | [`swiss-eight-cases/`](swiss-eight-cases/) |
| Positions | Swiss 2.10.03 / `.se1`, 180-measurement distribution | 18.64″ within 1801–2026 | [`../platform/evidence/swiss-benchmark/`](../platform/evidence/swiss-benchmark/) |
| Angles and houses | Swiss `houses_ex`, polar and ordinary | 1.57″ worst angle, cusps exact | [`swiss-node-polar/`](swiss-node-polar/) |
| Local time | host IANA/ICU, two Node majors and a browser | no disagreement in the cases run (a pass, not a residual) | [`../platform/evidence/site-engine-rc6/`](../platform/evidence/site-engine-rc6/) |
| Event search | Swiss hourly scans, independent roots | one contract **failed-incomplete** | [`transit-windows/`](transit-windows/), [`swiss-lunar-return/`](swiss-lunar-return/) |
| Runtime support | Node 22.23.2, Node 24.19.0, Chrome 152 | parity in the cases run (a pass, not a residual) | [`../platform/evidence/site-engine-rc6/`](../platform/evidence/site-engine-rc6/) |

## 1. Positions

**In-suite JPL gate.** `src/lib/engine/engine.test.ts` compares apparent
geocentric true-of-date ecliptic longitudes against JPL Horizons vectors
(`QUANTITIES='31'`, `CENTER='500@399'`) at 2020-01-01 and 1907-07-06. Measured
residuals, not the gates:

```
2020-01-01  Neptune 14.77"  Jupiter 4.06"  Uranus 3.06"  Saturn 1.93"
            Mars 1.34"  Pluto 0.74"  Venus 0.52"  Moon 0.51"
            Sun 0.05"  Mercury 0.02"
1907-07-06  Mars 6.25"  Moon 2.35"  Sun 0.67"
```

The gates themselves are looser than that on purpose: 0.05° for planets, 0.15°
for the Moon, 0.2° for the 1907 Moon. They are engineering acceptance limits
chosen to fail loudly on a real regression, not claims about typical error.

**Frozen Swiss packs.** All four directories here hold Swiss Ephemeris 2.10.03
oracles acquired through pinned, unmodified pyswisseph 2.10.3.2 against the
official DE441 files, with the acceptance policy written and reviewed *before*
the application was run, byte-hashed inputs, and extractors that perform no
calculation of their own. The node/polar pack's measured maxima were
0.001685457° (6.07″) in node longitude, 0.000350604°/day in node speed, and
0.000434825° (1.57″) in polar angles — recorded against `@zodiacs/engine`
0.1.0, not the rc.6 named at the top of this page. The fixtures are frozen and
the current suite still passes them, but those maxima are that run's.

**The distribution.** [`swiss-benchmark/`](../platform/evidence/swiss-benchmark/)
answers a different question from the packs: not "did this case stay inside its
gate" but "how far apart are the two implementations, typically and at worst".
The corpus is 180 measurements, declared before any number was taken. Over the
160 between 1801 and 2026 the median longitude disagreement is 1.62″, the 95th
percentile 12.08″ and the worst 18.64″ (Pluto, 1801). Over all 180, which
brings in the two far-future cases below, it is 1.88″, 14.90″ and 159.38″.
Each set is quoted with its own denominator, because mixing them is how a
distribution gets flattered.

Two of the 180 exceed one arcminute, both the Moon far in the future: 64.8″ at
2100 and 159.4″ at 2190. That is a clock difference. The two programs
extrapolate ΔT past the observed record differently — 109.5 s apart at 2100 —
and the Moon moves about 0.549″ per second of time, which accounts for 60.1″
of the 64.8″ — about 93%, not all of it. Pinning ΔT to the reference collapses
**the DE440s prototype's** 2100 case from 63.887″ to −0.025″; the shipped
engine was never re-run that way, and the same correction against its own
64.768″ would land near 0.9″ rather than near zero. The 2150 and 2190 cases
were never decomposed at all — they fall outside DE440s coverage, so the same
mechanism plainly dominates but that is an expectation, not a measurement.
Reporting any of these residuals as an ephemeris error would still be wrong
about the cause.

*Correction, 2026-09-23.* "A clock difference" is right about the far future
and silent about the present, where ΔT is measured. The formula the engine uses
(astronomy-engine's `DeltaT_EspenakMeeus`) reads 75.497 s on 2026-09-22 where
the IERS value is 69.196 s, 6.3 s ahead and growing about 1.2 s a year; at the
Moon's mean rate that is 3.46″ today. The values, for 2017, 2020, 2024 and
2026, and the script that derives them from the IERS finals file are in
[`../platform/evidence/deltat-2026-09-23/`](../platform/evidence/deltat-2026-09-23/).
Step 1.4 of the engine brief replaces the formula with observed ΔT.

**Neptune is the worst modern body in both comparisons** — a single-epoch
14.77″ against Horizons, a median of 11.5″ against Swiss. Those are different
statistics and should not be read as one number seen twice, and the two
references are not independent of each other, so this is not two witnesses
agreeing. What it suggests, weakly, is a truncated outer-planet series rather
than a convention mismatch, since a convention error would not single out one
planet. Neptune is not the worst body overall: Pluto reaches 25.01″ and the
Moon 159.38″.

Not established: that any of this is observational accuracy, or that the
residuals hold between the epochs measured. The measured span is 1801–2026
densely for the distribution plus three point epochs (1800, 2000, 2199) in the
eight-case pack — the range zodiacs.org accepts is touched at its edges and
sampled sparsely in between, which is not the same as measured across it.

And the package bounds nothing. `1800–2199` is this site's own form validation
(`src/lib/share.ts`, `src/lib/engine/transit-window-core.ts`); `natalChart`
will compute year 900 or year 3500 and return a chart with no error and no
flag. Nothing here says anything about those.

## 2. Angles and houses

Swiss `swe.houses_ex(jdUT1, lat, lon, b'W', 0)` at Tromsø, Longyearbyen and
Longyearbyen's southern mirror, plus ordinary latitudes. Measured angle
residual 0.000434825° (1.57″); every whole-sign cusp matched exactly. Gates
are 0.1° for ASC/MC and 0.2° for cusps.

Placidus is where the two programs deliberately differ. Above 66° absolute
latitude Swiss returns C status −1 and its conventional Porphyry fallback
array; this engine falls back to **whole sign** and sets `polar-fallback`.
Both behaviours are compared against the same Swiss `W` tuples, so the
fallback is checked rather than excused.

Not established: exact geographic poles and degenerate horizon intersections
remain outside verified scope; Swiss's house model is itself a convention, so
cusp agreement is convention agreement.

## 3. Local time

`@zodiacs/engine/geo` and the site's `src/lib/time/localToUtc.ts` resolve a
local wall time and IANA zone through the host's `Intl`/ICU data — never a
hand-rolled offset table. 326 tests cover that path. The rc.6 evidence ledger
records 16 historical receipts that became valid under the seconds-and-
milliseconds comparison correction, nine civil controls that stayed valid, and
96 rc.5/rc.6 chart comparisons preserving every value but the version field,
executed on two Node majors and again in Chrome 152 offline.

Conventions, stated rather than implied: a spring-forward gap shifts forward;
a fall-back fold selects the earlier instant; both are flagged. The engine
audit's all-zone round-trip scan is a test
(`src/lib/time/localToUtc-roundtrip.test.ts`): every offset change the host
knows in every zone from 1850 to 2100, with the wall minutes around each
compared against a brute-force reading of every nearby offset. By default it
steps two weeks to find changes and tests each edge; `TZ_SCAN=full` repeats
the audit's daily step and sampling, which on Node 22.22 (ICU 78.2, tzdata
2025c) is 42,861 changes and 1,675,757 wall minutes in 418 zones, with no
disagreement. Offsets with
seconds survive (Mexico City's −6:36:36 before 1922 is a live case).

Since 2026-09-23 the site, though not `@zodiacs/engine/geo`, reads a birth
from before its place adopted a legal time on the birthplace's own local mean
time: 240 seconds of time per degree of longitude, rounded to the second. The
time zone data records mean time only for each zone's reference city, so a
Buffalo birth in 1870 had been read on New York's clock, 19 min 29 s early. The
only table involved says when each zone's local mean time ended; it is
generated from a pinned tzdb release, 2025c, with backzone
(`src/data/tz-lmt.json`, by `scripts/build-tz-lmt.mjs`), and legal offsets still
come from the host. Tested: the table against that release; every wall minute
within 26 hours of fourteen era ends, east and west of the reference meridian,
against a separate model of the birthplace clock, with receipts validated;
the date-line days of Alaska, Manila and Apia inside eras; a bound that ignores
a longitude more than three hours from the zone's mean time. Not established:
agreement with other programs' era ends. And after the era the legal history
is still the host's, which lacks backzone: on Node 22.22 (ICU 78.2), 90 of the
355 zones with an era in the birthplace index take their first offsets from
another city, and for 85 of them the legal offset before 1970 differs from
backzone's by 5 to 180 minutes (Amsterdam 1900 resolves on Brussels's +0:00,
not Amsterdam Mean Time's +0:19:32). Step 1.12 of the engine brief moves that
history into the engine.

Not established: which IANA version any given visitor's runtime carries. The
history is the host's, so two machines can legitimately disagree on a
pre-standardisation birth. Signed fixed-offset receipt syntax and exact-pole
coverage are declared limitations, and the separate local-date endpoint
interval and policy defects are recorded as unresolved, not fixed.

## 4. Event search

This is the weakest dimension and the honest place to say so.

[`transit-windows/`](transit-windows/) compares nine A–I cases and 30 aspect
branches against Swiss hourly unwrapped scans with independently refined
roots. It carries a **failure that has not been cleared**: the original v2/v3
Uranus D exact-topology contract remains `failed-incomplete`, its 0.044188°
turning-point margin sits under the original 0.05° model budget, and the
second period's exact-pass count cannot be certified. The v6 re-acquisition
qualified period membership and the alignment region without retiring that.
The second period must be described as having uncertain exact topology.

[`swiss-lunar-return/`](swiss-lunar-return/) checks six lunar-return cases end
to end — complete chronology, selected first event, chart components — against
frozen ±0.15°/±0.30° branches. It also records a real model difference rather
than papering over it: the reviewed `EclipticGeoMoon` path applies no explicit
light-time, aberration or deflection pass, so the two correction paths are
**not** claimed to be identical, only to agree inside the stated budget.

Each longitude-crossing search caps ephemeris evaluations at 10,000. Sampling
can miss an event between steps; interior tangencies are omitted, and
direction at a window endpoint rests on one-sided evidence.

Not established: complete event discovery. Nothing here is a guarantee that
every event in a window is found, and the cap is a sampling bound rather than
a time limit.

## 5. Runtime support

ESM only, TypeScript declarations included, no CommonJS export. The manifest
declares Node ≥18. What was actually executed is narrower: Node 22.23.2 and
24.19.0 for the parity matrix and the public-download consumer check, and
Chrome 152 for the browser run, with thirteen network, storage and cookie
observer negative controls showing zero calls during calculation.

Not established: every Node version the manifest allows, or every browser. A
finite matrix is a finite matrix.

## What none of this is

- Not independent astronomical validation. Every oracle here is another
  implementation of the same JPL family.
- Not human practitioner certification, and not a review by anyone outside
  this project.
- Not evidence that astrological interpretation is scientifically valid. The
  engine returns geometry; meaning is a separate tradition and is labelled as
  one everywhere it appears.
- Not a claim that the engine is the most accurate available. On the
  measurements here a DE440s-backed prototype agrees with Swiss to 0.16″
  worst case against this engine's 64.8″ on the same rows, at 2.06× the warm
  p50 runtime cost — 3.39× at the warm p95 — and 31 MiB of data. That prototype has not been adopted and does not
  run in production; its gates are in
  [`swiss-benchmark/NEXT.md`](../platform/evidence/swiss-benchmark/NEXT.md).

## Reproducing any of it

Each subdirectory's README carries its own pinned provider version, file
hashes, acquisition receipts and exact commands. The benchmark directory
carries its corpus, its per-call record of which Swiss backend answered, and
its raw rows.

Three things here are not reproducible from the repository, and naming them is
the point of the rest of it. The JPL Horizons vectors in `engine.test.ts` are
bare literals — the query is in the file header, the provider version is not,
and `swiss-eight-cases/README.md` says it "remains unknown". The Swiss ΔT of
93.18 s at 2100 was transcribed from a run rather than committed as a receipt
(astronomy-engine's 202.65 s is reproducible offline). And the benchmark's
`prototype, engine ΔT` row and its performance table have no committed JSON
beside the four that do. Everything else can be re-derived.
