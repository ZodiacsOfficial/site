# Phase 1 verdicts for steps 1.2, 1.3, 1.8 and 1.9, 2026-09-25

The measurements behind the verdicts `../engine-beyond-swiss/PREREGISTRATION.md`
records for steps 1.2, 1.3, 1.8 and 1.9 of the engine brief's Phase 1 (version
1's rules 1a, 1b, 1g and 1h). They were taken on the vendored
`@zodiacs/engine` 0.1.1-rc.7 (`vendor/zodiacs-engine-0.1.1-rc.7.tgz`, SHA-256
`49b2b03f50fea8a625d443d4fd0f6d03ffc22831e54009fd09c49d07c8698f90`) at site
commit `982caca2`, with the installed `dist/` checked file by file against the
tarball. Swiss Ephemeris 2.10.03, reading its `.se1` files, is the instrument
the rules name. The ERFA arbiter in `../engine-beyond-swiss/corpora/` checks
it for the angles, and the DE440s kernel read through ERFA checks it for the
Moon's speed.

Swiss's readings are named by SHA-256 and not committed. `results/` holds
statistics only: counts, quantiles, and a few named worst cases with the
engine-minus-reference difference there.

| Step | Rule | Verdict | Deciding figures |
| --- | --- | --- | --- |
| 1.2 Applying and separating | 1a | PASS | 0 of 236,932 aspects misclassified on the 2024 Swiss scan; 0 of 1,048,251 synthetic cases; 28 of 28 named cases |
| 1.3 True obliquity for angles and Placidus | 1b | PASS under A1; PARTIAL as first written | ASC against Swiss p95 2.219″, max 71.33″; against ERFA max 6.36″, 0.36″ within 45°; added vectors: 45 of 816 over 5″, 0 under A1 |
| 1.8 Speeds | 1g | PASS under A3; PARTIAL as first written | Moon up to 1.397″/day from Swiss, 8 of 417 samples over 1″/day, none over 1.5″; station flags 108 of 108 |
| 1.9 Placidus polar limit | 1h | PASS | status 336 of 336; cusps within 0.0085″ on Swiss's inputs |

## 1.2 Applying and separating (rule 1a)

**Rule.** 0 misclassifications over the 2024 30-min Swiss-position scan
(236,932 aspects) and the synthetic sweep; 0 false positives; wrap and
retrograde cases pass.

**How.** `tools/s12/swiss_scan_2024.py` rebuilds the scan with the audit's own
code: every 30 minutes of 2024 UTC, ten bodies, `calc_ut` with
`FLG_SWIEPH|FLG_SPEED`. It reads the flag of every call: 527,490 calls, all
SWIEPH and SPEED, no instant discarded. The file is the audit's byte for byte
(`0dc4b21f…3dc0`, the digest `corpora/README.md` gives), and `run-all.sh`
stops if it is not. rc.7's `findAspects`, the function `computeChart` calls,
classifies each aspect. Two truths judge it: the sign of the orb's rate from
Swiss's speeds (the rule's), and the orb's actual motion under Swiss over
±1 s, which needs no speed formula. The sweeps need no Swiss.

| Gate | Measured | |
| --- | --- | --- |
| Scan, against the orb's rate from Swiss's speeds | 0 of 236,932 | pass |
| Scan, against the orb's motion over ±1 s | 0 of 236,931 | pass |
| 0 false positives (scan and sweeps) | 0; rc.7 flags 118,635 aspects applying | pass |
| Synthetic sweeps | 0 of 1,048,251 | pass |
| Wrap and retrograde cases | 28 of 28 | pass |

The ±1 s truth sets one aspect aside, the Moon–Mars square of
2024-02-01T02:00Z, which is exact within the stencil; rc.7 calls it
separating. The two truths never disagree, and `aspectMotion` returns
`stationary` 0 times.

| Sweep | Cases | rc.7 wrong | rc.6 wrong |
| --- | ---: | ---: | ---: |
| The engine's own seeded sweep (`aspects.test.ts`) | 400,000 | 0 | 769 |
| The Phase 1 planners' sweep | 400,000 | 0 | 44,541 |
| The audit verifier's time-to-exact sweep | 11 | 0 | 7 |
| 0.001 to 60 min either side of exact, every aspect, four pairs, across 0/360 and away | 48,240 | 0 | 21,000 |
| Within 15° of 0°, every mix of direct, retrograde and stationary | 200,000 | 0 | 709 |

In the last sweep the 22,168 pairs with zero relative speed all return
`stationary` with `applying` false. Inside the scan, rc.7 gets none wrong
among 99,286 aspects with a retrograde body (rc.6: 152), 14,288 with both
retrograde (0), 100,306 whose raw longitude difference wraps 0/360 (190),
25,091 oppositions (57) and 4,025 within 0.15° of exact (505).

**Control.** rc.6's `findAspects` (the 0.02-day step) on the same positions
misclassifies 506 of 236,932, the audit's figure: all false negatives, the
latest 14.36 minutes before exact, 83 without the Moon. By the ±1 s truth it
is 506 of 236,931. Its latest error in the time-to-exact sweep is 14.355
minutes before exact.

**On the engine's own positions** (no Swiss), through `computeChart` every 30
minutes of 2024: 236,910 aspects, 0 of 236,909 wrong against the chart's own
orb over ±1 s. The one set aside, the Moon–Uranus sextile of
2024-12-09T04:00Z, is exact 0.33 s earlier and read as separating. rc.6's step
on the same speeds gets 510 wrong. Every 10 minutes: 710,786 aspects, 0 wrong
by the closed form on the chart's speeds (rc.6's step: 1,626) and 0 of 710,783
by the ±1 s motion. `natalChart` returns the same bodies and aspects at all 182
instants checked.

## 1.3 True obliquity for angles and Placidus (rule 1b)

**Rule.** 3,128-case grid against Swiss `houses_ex`: ASC p95 ≤ 3″, max ≤ 75″;
against the ERFA arbiter: max ≤ 8″, and ≤ 0.5″ for |lat| ≤ 45. The step also
adds Swiss vectors at 63, 65 and 66° in both hemispheres with 5″ gates.
Amendment A1, adopted 2026-09-25, sets those to 5″ at 63° and 65° and 8″ at
66°, judged against Swiss from 1850-01-01 0h UT up to 2050-01-01 0h UT and
against ERFA outside that window.

**How.** Grid A of `corpora/angle-grid-inputs.json` (1800–2200 every 25 years,
every 3 hours, latitude 0 and ±10 to ±66) goes through the site's
`computeChart` (`src/lib/engine/full.ts`), Placidus, time known, under
vite-node (`tools/s13/engine_grids.mjs`). It matches the package's
`computeChart` called directly on every case. Swiss:
`houses_ex(jd_ut, lat, 0, 'P', FLG_SWIEPH)` with UT taken as UTC. Every row is
kept: the Sun and Moon calls return flag 258 and ECL_NUT returns 2.
`houses_armc` on Swiss's ARMC and ECL_NUT true obliquity reproduces `houses_ex`
to 9.2e-10″. The run rebuilds the committed ERFA arbiter from its tools and
`cmp` finds it identical. `tools/s13/compare13.py` takes quantiles the audit's
way, v[floor(p(n−1))], and the site test's way, v[floor(pn)].
`tools/s13/crosscheck_js.mjs` recounts the grid statistics and the vector
counts in JavaScript and gets the same numbers.

| Gate | Measured | |
| --- | --- | --- |
| Against Swiss: ASC p95 ≤ 3″ | 2.2185″ (2.2189″ by the site test's quantile) | pass |
| Against Swiss: ASC max ≤ 75″ | 71.333″ (2050-03-21T18Z, lat −66) | pass |
| Against ERFA: ASC max ≤ 8″ | 6.3616″ (2025-03-21T18Z, lat −66) | pass |
| Against ERFA, \|lat\| ≤ 45: ASC max ≤ 0.5″ | 0.3587″ (2025-03-21T18Z, lat −45) | pass |
| Added vectors, 5″ against Swiss, as first written | 45 of 816 over | fail |
| Added vectors under A1 | 0 of 816 over | pass |

Against Swiss the ASC has p50 0.216″. The MC's largest difference is 2.161″,
and the intermediate Placidus cusps have p95 2.827″ and max 5.529″. Inside
Swiss's sidereal-time window the ASC has p95 0.262″ and max 6.353″; outside
it has p95 3.552″ and max 71.333″. Against ERFA the ASC has p50 0.0647″ and
p95 0.2404″, and the MC's largest difference is 0.2008″. The engine's GMST and
mean obliquity equal ERFA's to 0.0000″, so the residual is astronomy-engine's
five-term nutation: |ΔRAMC| ≤ 0.188″, |Δψ| ≤ 0.204″, |Δε| ≤ 0.0297″.

Where the 45 added vectors over 5″ fall (|differences|):

| Latitude | Swiss sidereal time | Over 5″ | Years | engine − Swiss | engine − ERFA, max | Swiss − ERFA |
| --- | --- | ---: | --- | --- | ---: | --- |
| ±63 | outside the window | 12 | 2050–2175 | 8.40–14.43″ | 1.08″ | 7.88–13.86″ |
| ±65 | outside | 16 | 1800, 2050–2200 | 5.22–30.10″ | 2.23″ | 4.84–28.89″ |
| ±66 | outside | 16 | 1800, 2050–2200 | 7.35–71.33″ | 4.86″ | 6.90–68.16″ |
| ±66 | inside | 1 | 2025 | 6.35″ | 6.36″ | 0.009″ |

The one inside the window, 2025-03-21T18Z at lat −66, is the engine's own
nutation. Its five-term Δψ is 0.2035″ from ERFA's, which moves the RAMC by
0.1868″. The ascendant's gain of 36.9 makes that 6.90″, and Δε of 0.0165″
times a gain of −32.5 takes off 0.54″. The other 44 come from Swiss's
long-term sidereal time. `swe.sidtime` minus ERFA's `gst06a` jumps −0.097″ at
1850-01-01 0h UT and −1.908″ at 2050-01-01 0h UT
(`tools/s13/sidt_window_probe.py`). Between those dates Swiss's RAMC is
within 0.0014″ of ERFA's. Outside them it is +0.353″ off in 1800, −1.908″ in
2050 and −0.68″ in 2200. Under A1 the
largest are 6.353″ at 66° (against Swiss; 4.862″ against ERFA outside the
window), 2.769″ at 65° and 1.343″ at 63°. With ERFA in place of Swiss at 66°
only, 28 vectors at 63° and 65° still fail. With ERFA everywhere at 5″, 1
fails (6.362″). The ledger's own vector years, 1800, 1950 and 2200 (144
vectors), have 8 over 5″ as first written (±65 and ±66, 1800 and 2200,
5.22–18.05″) and 0 under A1. At the 816 vectors the MC stays within 2.161″ of
Swiss. The intermediate cusps are over 5″ from Swiss 13 times, all outside the
window (max 5.529″), and never from the engine's own cusps on ERFA's inputs
(max 0.601″).

**Control.** rc.6 on the same Swiss readings gives ASC p50 2.409″, p95
22.406″ and max 512.529″ (2100-03-21T06Z, lat 66), with MC max 3.941″: the
preregistered baseline to the digit. The site test
`scripts/angles-grid.test.mjs` passes 5 of 5 on rc.7.

## 1.8 Speeds (rule 1g)

**Rule.** Moon speed against Swiss ≤ 1″/day at perigee and apogee;
station-flag agreement at ±1 h. Amendment A3, adopted 2026-09-25, sets the
Moon's gate to ≤ 1.5″/day and names "the derivative of the reported
longitude" in place of "state vectors".

**How.** The Moon is sampled twice. A3's own set uses astronomy-engine's
`SearchLunarApsis` from 2024-01-01 to 2027-01-01: 80 apsides, each at 0, ±6
and ±12 h, plus the perigee of 2024-10-17 every 6 h from 10-15 to 10-19, 417
samples in all. The independent set uses the 80 apsides where Swiss's
geocentric distance rate changes sign (40 perigees, 40 apogees), each at 0, ±6
and ±12 h TT, 400 samples. The chart speed comes from `computeChart`
(`@zodiacs/engine/internal`, which `full.ts` wraps). It is compared with
Swiss's `FLG_SPEED` at the engine's own TT, which pins the clock because the
rule is about speed, not ΔT, and again at the same UT. Every Swiss call is
flag-checked: 9,265 for the apsides and 3,268 for the speeds, none discarded.
The stations are Swiss's 54 sign changes of speed for Mercury to Pluto in
2024–2026, on a 1-day grid with 60 bisections, in TT and in UT (25,328 calls,
all SWIEPH and SPEED). At each, the chart's retrograde flag an hour before and
an hour after is compared with the sign of Swiss's speed there.

| Gate | Measured | |
| --- | --- | --- |
| Moon ≤ 1″/day, as first written | max 1.3971″/day; 8 of 417 over (A3's set), 8 of 400 (Swiss's apsides) | fail |
| Moon ≤ 1.5″/day, A3 | max 1.4059″/day on either set and either clock; none over | pass |
| Station flags at ±1 h | 108 of 108 at Swiss's TT, 108 of 108 at the same UT | pass |

| Samples (″/day) | n | p50 | p95 | max | over 1″ | over 1.5″ | max at the same UT |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| A3's | 417 | 0.267 | 0.780 | 1.397, perigee of 2025-12-04 +6 h (17:07:51Z) | 8 | 0 | 1.406 |
| Swiss's apsides | 400 | 0.273 | 0.786 | 1.396, perigee of 2025-12-04 +6 h | 8 | 0 | 1.405 |
| A3's, at the apsis itself | 80 | 0.292 | 0.780 | 1.382 | 2 | 0 | 1.378 |

The samples over 1″/day are the perigees of 2025-12-04 (−6 to +12 h) and
2026-06-14 (−12 to 0 h), and +12 h after the perigee of 2026-11-25. By group,
A3's perigees reach 1.397″/day, its apogees 0.854″ and the 2024-10-17 window
0.557″.

The derivative is not the cause. Chart speed minus a ±1e-4-day difference of
the chart's own longitude is at most 0.0015″/day, while the rate of the
engine-minus-Swiss longitude reaches 1.404″/day, so the residual is the
analytic Moon series. The state-vector route (`GeoMoonState` with the frame's
own rate) leaves the same excess: 1.397″/day on A3's set and 1.400″ on Swiss's,
8 over 1″. Without the frame rate it reaches 1.67″, 4 samples over 1.5″. The
DE440s kernel through ERFA agrees. The chart is at most 1.391″/day from the
kernel on A3's set (1.392″ on Swiss's), 9 over 1″ and none over 1.5″. Swiss's
`FLG_TRUEPOS` speed is within 0.0113″/day of the kernel, and its apparent speed
within 0.069″/day (Swiss's apsides) or 0.190″/day (A3's set) of the kernel
with light-time. That is the instrument's floor. At the sample where Swiss's
own ±0.001-day longitude difference departs most from its analytic speed,
0.36″/day at the perigee of 2024-10-17 −6 h, its apparent longitude steps by
0.70 mas on a 10 s grid. With `FLG_TRUEPOS` the departure falls to
0.008″/day. For every body, every 6 h of 2024–2026, the chart speed is the
±1e-4-day derivative of the reported longitude to 0.00288″/day (Mercury; Moon
0.00125″), and `retrograde === (speed < 0)` holds in all 43,840
body-instants.

The station flags agree at ±45 min as well (108 of 108). The first
disagreements come at ±30 min (107), then ±20 (104), ±10 (97) and ±5 (85), the
same on both clocks. The chart's own stations fall a median 3.46 minutes and
at most 37.7 minutes from Swiss's; the largest is Pluto's direct station of
2024-10-12. By body the largest are Mercury 6.16, Venus 6.55, Mars 1.05,
Jupiter 3.73, Saturn 7.63, Uranus 15.7, Neptune 26.45 and Pluto 37.7 minutes.
The audit's three named stations are now −1.32 minutes (Mercury, 2024-04-01),
+1.05 (Mars, 2024-12-06) and −3.46 (Venus, 2025-03-02). Every hour of
2024–2026 for the eight bodies, 210,324 of 210,324 flags agree more than an
hour from a station, and 104 of 108 within an hour. On that grid the chart's
flag changes 54 times, with the same per-body counts as Swiss's stations.
`saturnReturn(...).natalRetrograde`, the chart's flag and Swiss agree an hour
either side of all six Saturn stations, 12 of 12.

**Control.** rc.6's ±0.25-day difference at the same samples reaches
8.945″/day, with 398 of 417 over 1″ on A3's set. On Swiss's apsides it reaches
8.944″, with 381 of 400 over 1″.

## 1.9 Placidus polar limit (rule 1h)

**Rule.** On the 336-case 66.05–66.55 ladder, status agrees with Swiss 336 of
336, and the cusps are within 0.02″ of Swiss's given Swiss's inputs.

**How.** Grid L runs at ±66.05, ±66.1, ±66.2, ±66.3, ±66.4, ±66.5 and ±66.55°
on 1800-06-21, 2000-06-21 and 2200-06-21, every 3 hours, at longitude 0. When
Swiss's `houses_ex(..., 'P')` refuses, pyswisseph raises
`swisseph.houses_ex: error`. Underneath, the C library (`swe_houses_ex2`,
called through ctypes on the same shared object) returns −1 with "within polar
circle, switched to Porphyry" and fills Porphyry cusps equal to
`houses_ex(..., 'O')`; the two status readings agree on all 336 cases. The
engine is compared end to end, through the site's `computeChart` and its
`polar-fallback` flag, and through `placidusCusps`
(`@zodiacs/engine/internal/math`) on Swiss's ARMC and ECL_NUT true obliquity
(`tools/s19/compare19.mjs`).

| Gate | Measured | |
| --- | --- | --- |
| Status agrees with Swiss, end to end | 336 of 336 | pass |
| Status agrees with Swiss, on Swiss's inputs | 336 of 336 | pass |
| Cusps ≤ 0.02″ given Swiss's inputs | 0.0085″ (1800-06-21T00Z, 66.5°) | pass |

Swiss computes 320 cases and refuses 16: every 3 hours at ±66.55° on
1800-06-21, exactly where |lat| ≥ 90° − ε by its own obliquity. The engine
gives 320 Placidus charts and 16 whole-sign charts with `polar-fallback`, and
the committed ERFA limit agrees on all 336. No case is within 0.012° of its
limit for any of the three. The following figures are for information and are
not part of the rule. End to end, the cusps differ from Swiss's by up to
44.552″ (the ascendant at 2200-06-21T12Z, −66.4°) and the intermediate cusps by
up to 2.102″. Against the engine's own cusps on ERFA's inputs, Swiss's
ascendant is up to 18.18″ off in 1800 and 44.34″ in 2200, while the engine is
within 3.23″ and 1.03″. The ascendant's gain reaches 1,638 arcseconds per
arcsecond of RAMC at 66.55°. On the 16 refused cases the engine's Porphyry on
Swiss's inputs is within 1.6e-9″ of Swiss's substitute. Its whole-sign
fallback differs from that substitute by up to 77.28°.

**Control.** rc.6 refuses all 336 ladder cases (the baseline). The rule 1h
block of `scripts/angles-grid.test.mjs` passes.

## Versions and digests

| | Version | SHA-256 |
| --- | --- | --- |
| `@zodiacs/engine`, `vendor/zodiacs-engine-0.1.1-rc.7.tgz` | 0.1.1-rc.7 | `49b2b03f50fea8a625d443d4fd0f6d03ffc22831e54009fd09c49d07c8698f90` |
| Control, `vendor/zodiacs-engine-0.1.1-rc.6.tgz` | 0.1.1-rc.6 | `09c3e63432f8ba2e9df05af137c42f65ab039740a207a89418d9e6470ea3db3e` |
| astronomy-engine, `esm/astronomy.js` | 2.1.19 | `068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7` |
| Node (vite 6.4.3, vite-node 3.2.4, vitest 3.2.7) | v22.22.2 | |
| Python | 3.11.15 | |
| pyswisseph, its shared object | 2.10.3.2 (Swiss Ephemeris 2.10.03) | `3911614ca013be4520e355306620a3fcd27a39374a960a2063b056cfbd093338` |
| `sepl_18.se1` | DE441 | `ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66` |
| `semo_18.se1` | DE441 | `1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7` |
| pyerfa (ERFA 2.0.1), numpy | 2.0.1.5, 2.4.6 | |
| jplephem, `de440s.bsp` | 2.24 | `c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2` |

Swiss reports its models as Vondrák 2011 precession, IAU 2000B nutation and
"IERS Convention 2010 + long-term extension by Astrodienst" sidereal time.
`results/provenance.json` has the rest: every file of the engine's `dist/`,
the site files and corpora read, and the receipt conventions
(`angles: gast-and-true-obliquity`, `speed: …plus-minus-0.001-day…`,
`aspects: …applying-instantaneous-orb-rate`).

The Swiss readings, written only under WORK:

| Reading | Tool | SHA-256 |
| --- | --- | --- |
| The 2024 scan, `s12/swiss-2024.json` | `s12/swiss_scan_2024.py` | `0dc4b21fc5cbc9b45ad3b31cbbbc5330a2b23bd017bd13d60cdba3e682af3dc0` |
| Its ±1 s longitudes, `s12/swiss-2024-pm1s.json` | same | `9be5c526b82caaf6c966931899517c73213aac5e82832b184e26c44ee83dc633` |
| Grids A and L, `s13/swiss-grids.json` | `s13/swiss_grids.py` | `468e84a8cc2d978354630743a775a330bc7c59b7713224dc6ca7e37c1cda6d66` |
| Moon apsides, `s18/apsides-swiss.json` | `s18/swiss_apsides.py` | `5ba162521d2ea9194c0edf89a0194313aab10a21fc7c1d01c8e566b12576264c` |
| Moon speeds, `s18/moon-swiss.json` | `s18/moon_swiss.py` | `9e4ff6a736684817e6b2e237686df848ffe85d8e6a2c24a7db8a016ebc74c8f4` |
| Stations, `s18/stations-swiss.json` | `s18/swiss_stations.py` | `230f13d0ebca86f9e1f1127567411d311e7031eaac06d9b7ea9b978936dfde71` |

`swiss-grids.json` records the corpus's absolute path, so its digest depends
on where the repository is checked out. `468e84a8…` is the reading behind the
1.3 and 1.9 verdicts. `summarize.mjs` also gives a portable digest with the
path written repo-relative, `0817e4ed3bd3dc9896f796f283465cfa4770707df1d1917056b23ec6a6f7bd7d`,
which any checkout reproduces. `provenance.json` names the remaining readings
(the scan's summary, the arbiter's rates, the hourly flags, both probes).

## How to re-run

```sh
export SWISS_EPHE=/path/to/ephe          # sepl_18.se1 and semo_18.se1
export JPL_KERNEL=/path/to/de440s.bsp    # step 1.8's arbiter
export PYTHON=python3                    # with pyswisseph 2.10.03, pyerfa 2.0.1.5, numpy, jplephem 2.24
bash docs/platform/evidence/phase1-verdicts-2026-09-25/tools/run-all.sh
git diff --stat docs/platform/evidence/phase1-verdicts-2026-09-25/results
```

| Variable | Default | |
| --- | --- | --- |
| `SITE_ROOT` | the repository this folder is in | read only |
| `WORK` | `${TMPDIR:-/tmp}/phase1-verdicts-2026-09-25` | every output, Swiss's included; the tools refuse a WORK inside the repository |
| `SWISS_EPHE` | `$WORK/ephe` | the `.se1` files |
| `JPL_KERNEL` | `$WORK/de440s.bsp` | |
| `PYTHON` | `python3` | set `PYTHONPATH` if its packages live apart |
| `ENGINE_REPO` | unset | a checkout of zodiacs-org/engine, to compare its `artifacts/` tarball |
| `RESULTS` | `results/` | where `summarize.mjs` writes |

A run takes about 3 minutes. It stops if the installed engine differs from the
vendored tarball, if the scan is not `0dc4b21f…`, if the rebuilt ERFA arbiter
differs from the committed one, or if git status changes during the
measurements. It then rewrites `results/`. The four step files should not
change. `provenance.json` changes with the environment, for example in the
two digests that depend on the checkout's location.

This folder was checked that way on 2026-09-25. The tools ran against the site
at `982caca2`, with Swiss read through the system `python3`. Every Swiss
reading and every other output matched the measured run byte for byte, apart
from timing fields (`elapsedSeconds`, vitest durations). `summarize.mjs` run
on the measured run's own outputs gives the same four step files, byte for
byte. The tools also ran from a clean checkout at another path with the
defaults, and the four step files came out identical again.

## Files

- `results/step-1.2.json`, `step-1.3.json`, `step-1.8.json`, `step-1.9.json`:
  each step's gates, verdict and figures.
- `results/provenance.json`: versions and digests.
- `tools/`: the scripts that produced the verdict figures. Their computations
  are unchanged; only their paths, now read from the environment through
  `lib/paths.mjs` and `lib/paths.py`, and their header comments differ. The two
  runs' provenance scripts are merged into `env/`. `s18/swiss_self_probe.py`
  chooses its sample by rule, the largest Swiss self-difference, instead of by
  a written-in instant; the rule picks the same sample.

| Step | Tools | |
| --- | --- | --- |
| all | `run-all.sh`, `summarize.mjs` | every command in order; `results/` from WORK |
| all | `env/provenance.mjs`, `env/provenance.py`, `vite.config.mjs` | engine bytes, runtimes, instruments; vite-node's root |
| 1.2 | `s12/swiss_scan_2024.py` | the 2024 scan (Swiss) |
| 1.2 | `s12/classify.mjs`, `s12/set-aside.mjs` | rc.7 and rc.6 on the scan against both truths |
| 1.2 | `s12/synthetic.mjs`, `s12/verifier_sweep.mjs` | the sweeps and named cases; the 10-minute own-position scan |
| 1.2 | `s12/engine_own.mjs`, `s12/engine-own-set-aside.mjs` | the 30-minute own-position scan |
| 1.8 | `s18/swiss_apsides.py`, `s18/moon_swiss.py` | Swiss's apsides and speeds (Swiss) |
| 1.8 | `s18/moon_engine.mjs`, `s18/moon_compare.mjs` | chart speeds and the residuals |
| 1.8 | `s18/rc6_baseline.mjs`, `s18/state_route.mjs`, `s18/self_derivative.mjs` | rc.6's step, the state-vector route, the derivative check |
| 1.8 | `s18/arbiter_moon.py`, `s18/arbiter_compare.mjs`, `s18/swiss_self_probe.py` | DE440s through ERFA; Swiss's own floor |
| 1.8 | `s18/swiss_stations.py`, `s18/engine_stations.mjs` | stations and the flags at ±1 h |
| 1.8 | `s18/flags_hourly_engine.mjs`, `s18/flags_hourly_swiss.py` | every hour of 2024–2026 |
| 1.3 | `s13/engine_grids.mjs`, `s13/swiss_grids.py` | the site's chart and Swiss's `houses_ex` on grids A and L |
| 1.3 | `s13/compare13.py`, `s13/crosscheck_js.mjs`, `s13/sidt_window_probe.py` | rule 1b, A1, a recount, Swiss's switch dates |
| 1.3 | `s13/rc6_control.mjs`, `s13/extra_vectors_cusps.mjs` | the rc.6 control; MC and cusps at the vectors |
| 1.9 | `s19/compare19.mjs` | rule 1h's status and cusps |
| 1.9 | `s19/erfa_inputs.py`, `s19/endtoend.mjs`, `s19/ladder_gains.py` | ERFA's inputs, cusps by epoch, the ascendant's gains |
