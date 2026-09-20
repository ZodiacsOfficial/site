# What has been measured about this engine, and what has not

One page for a question that was answered in five places. Each section below
says what was measured, against what, what came out, and — the part that
matters most — what the result does not establish.

Read it with one thing in mind: **every comparison here is against another
program, not against the sky.** Swiss Ephemeris, JPL Horizons and Astronomy
Engine all descend from JPL development ephemerides. Agreement between them is
consistency, and consistency is worth having, but nothing in this directory
was checked against an observation and nothing here says otherwise.

Software under test: `@zodiacs/engine` (the site runs the same package;
`src/lib/engine/package-integration.test.ts` pins the two to one version).
Its positional series come from [Astronomy
Engine](https://github.com/cosinekitty/astronomy) by Don Cross, MIT, built on
VSOP87 and NOVAS with the Nautical Almanac Office's *Improved Lunar
Ephemeris* for the Moon. Zodiacs did not write those models.

| dimension | measured against | worst observed | where |
| --- | --- | --- | --- |
| Positions | JPL Horizons vectors, in-suite | 14.77″ | `src/lib/engine/engine.test.ts` |
| Positions | Swiss 2.10.03 / DE441, 6 frozen cases | 6.07″ node longitude | [`swiss-node-polar/`](swiss-node-polar/) |
| Positions | Swiss 2.10.03 / DE441, 8 epoch and station cases | inside frozen gates | [`swiss-eight-cases/`](swiss-eight-cases/) |
| Positions | Swiss 2.10.03 / `.se1`, 180-measurement distribution | 18.64″ within 1801–2026 | [`../platform/evidence/swiss-benchmark/`](../platform/evidence/swiss-benchmark/) |
| Angles and houses | Swiss `houses_ex`, polar and ordinary | 1.57″ angles, cusps exact | [`swiss-node-polar/`](swiss-node-polar/) |
| Local time | host IANA/ICU, two Node majors and a browser | no disagreement in scope | [`../platform/evidence/site-engine-rc6/`](../platform/evidence/site-engine-rc6/) |
| Event search | Swiss hourly scans, independent roots | one contract **failed-incomplete** | [`transit-windows/`](transit-windows/), [`swiss-lunar-return/`](swiss-lunar-return/) |
| Runtime support | Node 22.23.2, Node 24.19.0, Chrome 152 | parity | [`../platform/evidence/site-engine-rc6/`](../platform/evidence/site-engine-rc6/) |

## 1. Positions

**In-suite JPL gate.** `src/lib/engine/engine.test.ts` compares apparent
geocentric true-of-date ecliptic longitudes against JPL Horizons vectors
(`QUANTITIES='31'`, `CENTER='500@399'`) at 2020-01-01 and 1907-07-06. Measured
residuals, not the gates:

```
2020-01-01  Neptune 14.77"  Jupiter 4.06"  Uranus 3.06"  Saturn 1.93"
            Mars 1.34"  Pluto 0.74"  Venus 0.52"  Moon 0.51"
            Sun 0.05"  Mercury 0.02"
1907-07-06  Moon 2.35"  Sun 0.67"
```

The gates themselves are looser than that on purpose: 0.05° for planets, 0.15°
for the Moon, 0.2° for the 1907 Moon. They are engineering acceptance limits
chosen to fail loudly on a real regression, not claims about typical error.

**Frozen Swiss packs.** Three directories here hold Swiss Ephemeris 2.10.03
oracles acquired through pinned, unmodified pyswisseph 2.10.3.2 against the
official DE441 files, with the acceptance policy written and reviewed *before*
the application was run, byte-hashed inputs, and extractors that perform no
calculation of their own. The node/polar pack's measured maxima were
0.001685457° (6.07″) in node longitude, 0.000350604°/day in node speed, and
0.000434825° (1.57″) in polar angles.

**The distribution.** [`swiss-benchmark/`](../platform/evidence/swiss-benchmark/)
answers a different question from the packs: not "did this case stay inside its
gate" but "how far apart are the two implementations, typically and at worst".
Over 180 measurements on a stratified corpus declared before any number was
taken — 160 of them between 1801 and 2026 — the median longitude disagreement
is 1.62″, the 95th percentile 12.08″, the worst 18.64″ (Pluto, 1801).

Two of the 180 exceed one arcminute, both the Moon far in the future: 64.8″ at
2100 and 159.4″ at 2190. That is a clock difference. The two programs
extrapolate ΔT past the observed record differently — 109.5 s apart at 2100 —
and the Moon moves about 0.549″ per second of time, which accounts for
essentially the whole residual. Pinning ΔT to the reference collapses the 2100
case from 63.887″ to −0.026″. Reporting that 159″ as an ephemeris error would
be wrong about its cause.

**Neptune is consistently the worst modern body,** at 14.77″ against Horizons
and a p50 of 11.5″ against Swiss. The two comparisons are independent of each
other and point at the same place, which is what a truncated outer-planet
series looks like rather than a convention mismatch.

Not established: that any of this is observational accuracy; that the
residuals hold outside the epochs measured; that the accepted input range of
1800–2199 is an accuracy range. It is not. The measured span is 1801–2026 for
the distribution and three representative epochs (1800, 2000, 2199) for the
eight-case pack.

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
a fall-back fold selects the earlier instant; both are flagged. Offsets with
seconds survive (Mexico City's −6:36:36 before 1922 is a live case).

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
  worst case against this engine's 64.8″ on the same rows, at 2.1× the runtime
  cost and 31 MiB of data. That prototype has not been adopted and does not
  run in production; its gates are in
  [`swiss-benchmark/NEXT.md`](../platform/evidence/swiss-benchmark/NEXT.md).

## Reproducing any of it

Each subdirectory's README carries its own pinned provider version, file
hashes, acquisition receipts and exact commands. The benchmark directory
carries its corpus, its per-call record of which Swiss backend answered, and
its raw rows. Nothing here asks to be taken on trust.
