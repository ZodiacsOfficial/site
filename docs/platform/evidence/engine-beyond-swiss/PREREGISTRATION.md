# Engine beyond Swiss Ephemeris: rules, baselines and verdicts

Phase 0 item 1 of the engine brief (version 2, §3; version 1, M0 item 1).
This file holds the acceptance rules the programme is judged by, the
baselines each rule starts from, and a verdict for every rule that has been
run. `corpora/` holds the inputs the rules run on.

## When the rules were fixed

The rules are the ones the two briefs wrote before any code:

| file | sha256 | committed |
| --- | --- | --- |
| `../engine-audit-2026-09-22/BRIEF-v1.md` (§3: M1 to M6; §5: evaluation discipline) | `c394c6da635803c4aba829c506a9cb7d666eac2d78ebcb26ff28dc52d01ffcb8` | `88621826`, 2026-09-23 05:51 UTC |
| `../../ENGINE-AND-PLATFORM-BRIEF.md` (§3: Phase 1 table) | `61bdee225438339f558fbf794130645416f59471728b08f9a9fb6a153bb5f3ad` | `88621826`; last changed `8e8e1461`, 06:08 UTC |

The first Phase 1 code commit is `fdcf6e37`, 06:21 UTC. This file was written
later, after seven steps had landed on the site, so it collects the rules and
records verdicts; it does not set them. The digests above are the rules'
text. A rule is changed only by an amendment appended at the end, dated, with
the original verdict kept beside it.

Verdicts use version 1's vocabulary (§5): PASS, FAIL or PARTIAL, with the
measured number beside each. NOT RUN means the step has not landed here.

## Phase 1, step by step

Each step names its rule's source. Baselines are the shipped engine,
`@zodiacs/engine` 0.1.1-rc.6, as the audit measured it; ledger ids refer to
`../engine-audit-2026-09-22/LEDGER.md`.

### 1.1 Birthplace local mean time (version 2)

- **Rule.** With the site's GeoNames longitudes: Buffalo 1870 −5:15:31, Brest
  1880 −0:17:58, Omaha 1880 −6:23:46; New York 1870 and Chicago 1880 equal to
  tzdb; Paris 1880 +0:09:24, a 3 s change; Galway 1885, Brest 1900 and Porto
  1890 unchanged (national mean times); Bergen 1894 on its own mean time
  though Intl says Berlin's CET; switch-day gap (Buffalo 1883-11-18 11:50) and
  fold (Hartford 12:05) resolved by the policy; portable receipts still
  validate; the audit's all-zone round-trip scan, committed as a test in this
  step, passes.
- **Baseline.** Buffalo 1870 read at −296.03 min where the town's mean time
  is −315.52; Brest 1880 +9.35 against −17.97; Omaha 1880 −350.60 against
  −383.77 (brief v2, R1).
- **Verdict: PASS.** Every listed case is a test in
  `src/lib/time/localToUtc-birthplace.test.ts`. The round-trip scan
  (`src/lib/time/localToUtc-roundtrip.test.ts`) passes by default (26,403
  offset changes, 184,817 wall minutes) and in the audit's full scope with
  `TZ_SCAN=full` (42,861 changes, 1,675,757 wall minutes, on this commit's
  parent).

### 1.2 Applying and separating (version 1, rule 1a)

- **Rule.** 0 misclassifications over the 2024 30-min Swiss-position scan
  (236,932 aspects) and the synthetic sweep; 0 false positives; wrap and
  retrograde cases pass.
- **Baseline.** On its own positions the shipped engine finds 236,910 aspects
  in the scan and misclassifies 486 (0.205 %): every applying aspect whose orb
  is under 0.01 × the relative speed (ledger angles-houses-aspects-2).
- **Verdict: PASS** (2026-09-25), on the vendored rc.7
  (`vendor/zodiacs-engine-0.1.1-rc.7.tgz`, sha256 `49b2b03f…`); the change
  is [zodiacs-org/engine#1](https://github.com/zodiacs-org/engine/pull/1).
  The scan was rebuilt with pyswisseph 2.10.03 from the audit's own script,
  reading the flag of every call (527,490 calls, all SWIEPH), and is the
  audit's file byte for byte (sha256 `0dc4b21f…`). rc.7's `findAspects`,
  which `computeChart` calls, finds the same 236,932 aspects and
  misclassifies none against the orb's rate from Swiss's speeds, with no
  false positives. Judged instead by the orb's motion under Swiss over ±1 s,
  none of 236,931 is wrong; the one set aside was exact 0.33 s before the
  instant, and rc.7 calls it separating. rc.6's rule on the same positions
  misclassifies 506, as the audit found, so the scan sees the fault. The
  synthetic sweeps find no error: the engine's own 400,000 pairs (the old
  step misjudges 769), the Phase 1 planners' 400,000 (rc.6: 44,541), 48,240
  cases from 0.001 to 60 minutes either side of exact (rc.6: 21,000, all in
  the last 14.4 minutes before exact) and 200,000 pairs within 15° of 0°
  with every mix of direct, retrograde and stationary bodies. The 28 named
  wrap and retrograde cases pass. On its own positions, through
  `computeChart` every 30 minutes of 2024, rc.7 misclassifies none of
  236,909 against its own orb's motion. Swiss's positions are named by
  digest and not committed; `../phase1-verdicts-2026-09-25/` has the tools
  that rebuild them and every count.

### 1.3 True obliquity for angles and Placidus (version 1, rule 1b)

- **Rule.** 3,128-case grid vs Swiss `houses_ex`: ASC p95 ≤ 3″, max ≤ 75″
  (Swiss's own long-term sidereal model); vs the ERFA arbiter: max ≤ 8″, and
  ≤ 0.5″ for |lat| ≤ 45. The step also adds Swiss vectors at 63, 65 and 66° in
  both hemispheres with 5″ gates.
- **Baseline.** Grid A through the shipped `computeChart`: ASC p50 2.409″,
  p95 22.406″, max 512.529″ (2100-03-21T06Z, lat 66); |lat| ≤ 45 max 16.22″;
  MC max 3.94″ (ledger angles-houses-aspects-1, verifier).
- **Baseline against the ERFA arbiter** (`corpora/angle-grid-erfa.json`:
  pyerfa 2.0.1.5, `gst06a` with UT1 taken as UTC, `obl06` plus `nut06a`'s
  Δε, on the engine's own clock): ASC p50 2.12″, p95 23.16″, max 506.81″
  (1950-03-21T18Z, lat −66); |lat| ≤ 45 max 14.63″; MC max 2.25″. The
  engine's own sidereal time with astronomy-engine's true obliquity in place
  of the mean one gives p50 0.065″, p95 0.240″, max 6.36″ and 0.36″ for
  |lat| ≤ 45, inside the rule's ERFA gates. `scripts/angles-grid.test.mjs`
  pins both, and is written to fail when rc.7 lands.
- **Verdict: PASS under amendment A1** (adopted 2026-09-25); **PARTIAL as
  first written.** Measured on the vendored rc.7 through the site's
  `computeChart`; the change is
  [zodiacs-org/engine#1](https://github.com/zodiacs-org/engine/pull/1).
  Against Swiss 2.10.03 `houses_ex` on the 3,128-case grid, the ascendant
  gives p50 0.216″, p95 2.219″ and a largest of 71.33″ (2050-03-21T18Z,
  lat −66), inside 3″ and 75″; the midheaven's largest is 2.16″. Against the
  ERFA arbiter the ascendant's largest is 6.36″ (2025-03-21T18Z, lat −66),
  p95 0.240″, and 0.36″ within 45° of the equator, inside 8″ and 0.5″. The
  added vectors are grid A's 816 cases at ±63, ±65 and ±66°. With 5″ gates
  against Swiss, 45 fail, which is the PARTIAL. One is the engine's own
  nutation: at 2025-03-21T18Z, lat −66, its five-term Δψ is 0.20″ from
  ERFA's, and the ascendant's gain of 37 makes that 6.36″ from ERFA and
  6.35″ from Swiss. The other 44 fall before 1850-01-01 or from 2050-01-01
  0h UT, where Swiss's default sidereal time is its long-term extension:
  0.35″ from IAU 2006 in 1800, 1.91″ from 2050-01-01 and 0.68″ in 2200, up
  to 68.2″ of ascendant, while the engine stays within 4.9″ of ERFA. Under
  A1 none of the 816 fail; the largest are 6.35″ at 66°, 2.77″ at 65° and
  1.34″ at 63°. On the same Swiss readings rc.6 reproduces the baseline to
  the digit. Swiss's readings are named by digest and not committed;
  `../phase1-verdicts-2026-09-25/` has the tools and the digests.
  `scripts/angles-grid.test.mjs` holds the ERFA half.

### 1.4 Observed ΔT with a band (version 1, rule 1c)

- **Rule.** |ΔT − IERS| ≤ 0.2 s on 12 dated values 1962–present; the receipt
  carries model, value and band; production-path Moon p50 vs Swiss within
  0.3″ of the TT-pinned p50.
- **Baseline.** On 2026-09-22 the engine's ΔT is 75.497 s where the IERS
  value is 69.196 s, which moves the Moon 3.46″
  (`../deltat-2026-09-23/values.json`).
- **Verdict: PASS under amendment A2** (2026-09-26), on the vendored rc.8
  (`vendor/zodiacs-engine-0.1.1-rc.8.tgz`, sha256 `3b934376…`); not run
  before it. The shipped `dist/deltat.js` is the preregistered model, within
  1.5e-11 s and the same segment at 18,384 points of the reference
  implementation.
  - Gate 1. At most 0.0306 s from IERS on the twelve dates (2024-04-08; rc.7
    6.302 s). Every IERS day from 1962-01-01 to 2026-09-24 is within 0.0834 s,
    RMS 0.0223 s. σ is at least 15 times IERS's formal error on observed rows
    and 4.8 times on predicted rows.
  - Gate 2. The receipt carries the model, value, band, table and digest, and
    it round-trips. The site's 5,954 tests pass, and so do the engine's 608.
  - Gate 3, against Swiss 2.10.03, gives the figures said before the result:
    (a) +0.022″ (rc.7 +0.314″); (b) −0.070, −0.022, −0.009, +0.006 and
    −0.009″; (c) 0.103, 0.044, 0.119, 0.118 and 0.100″.
  - The holdout `zodiacs-holdout/1.4` was drawn once, at `ee37a83c`. Its
    paired p95 per era runs from 0.041″ to 0.118″. Gate 1 at its 31 instants
    from 1962 is at most 0.0554 s.

  `../phase1-verdicts-2026-09-26/` has the tools, the holdout's events part
  and the statistics.

### 1.5 Lunations in `sky.json` (version 1, rule 1d)

- **Rule.** All 124 committed lunations within 2 s of Swiss; sky vs transits
  ≤ 2 s.
- **Baseline.** Every lunation 33.7 to 46.3 s from the transits files and
  about 40 s late against Horizons (ledger production-event-search-1).
- **Verdict: FAIL** on the first part: 1 of 124 within 2 s of Swiss, 25
  within 5 s, largest 11.8 s (`../events-vs-swiss-2026-09-23/`). Mostly the
  engine's ΔT, which step 1.4 replaces. **PASS** on the second: sky and
  transits agree within 2 s (`scripts/sky-lunations.test.mjs`). Not part of
  the rule: the new moon of 2027-01-07 is within 5 s of Horizons (3.6 s).
  The record is `../lunations-2026-09-23/README.md`. See amendment A4.
- **A4's re-run: FAIL** (2026-09-26, on the vendored rc.8), as A4 said it
  would be. 80 of 124 are within 2 s, and the largest gap is 5.153 s (the
  new moon of 2030-05-02); rc.7 gave 1 of 124 and 11.8 s. The Swiss-free
  projection agrees with every lunation to 1 ms
  (`../events-vs-swiss-2026-09-25/`). What remains is the analytic Moon,
  which is M2's work.

### 1.6 Grazing return passes (version 1, rule 1f)

- **Rule.** Saturn 0.002° graze case returns 3 passes; Jupiter yearScan dips
  ≤ 0.005° return both; synthetic mid-cell pair found.
- **Baseline.** At the 5-day step, Saturn blind within 0.0103° of a station
  and Jupiter within 0.0205° (ledger production-event-search-4).
- **Verdict: PASS.** All three are tests in
  `src/lib/engine/grazing-crossings.test.ts`. Beyond the rule: 4,941 of 4,941
  station-graze cases 2020–2030 against a fine-step reference, where the old
  solver managed 3,627 (`../phase1-events/`).

### 1.7 Span flags (version 1, rule 1e)

- **Rule.** Flag present for 2300 and 900; scans never exceed the span.
- **Verdict: PASS** (2026-09-26), on the vendored rc.8. `natalChart` flags
  `outside-reference-span` at 2300 and at 900, and exactly outside
  [1800, 2200). The receipt validator expects the flag there
  (`../phase1-verdicts-2026-09-26/`). The scans stay inside the span as
  before.
- **Earlier: PARTIAL.** Scans: PASS on the site. Returns, year scans and the
  solar return stay inside 1800–2199 and say when they were clipped
  (`src/lib/engine/reference-span.test.ts`). The `outside-reference-span` flag
  belongs to the package and waits for rc.7; the site refuses a birth date
  outside the span instead. (2026-09-25: rc.7 did not carry the flag; it is
  planned for rc.8.)

### 1.8 Speeds (version 1, rule 1g)

- **Rule.** Moon speed vs Swiss ≤ 1″/day at perigee and apogee; station-flag
  agreement at ±1 h.
- **Baseline.** The ±6 h central difference is off by up to 7.5″/day for the
  Moon (ledger production-positions-9); against Swiss's analytic speed, up to
  3.4″/day (swiss-parity-7); station instants 1–4 min from Swiss's
  (angles-houses-aspects-10).
- **Verdict: PASS under amendment A3** (adopted 2026-09-25); **PARTIAL as
  first written**: FAIL on the Moon's 1″/day, PASS on the station flags.
  Measured on the vendored rc.7; the speeds changed in
  [zodiacs-org/engine#1](https://github.com/zodiacs-org/engine/pull/1), and
  natal Saturn's direction comes from the chart's own speed (1.8c). The
  samples are the 80 perigees and apogees of 2024–2026, each at 0, ±6 and
  ±12 h, with A3's window around the perigee of 2024-10-17. The chart's
  speed differs from Swiss's at the same TT by up to 1.397″ a day (perigee
  of 2025-12-04, 6 h after); 8 of 417 samples exceed 1″ a day, 2 of them at
  the apsis itself; read at the same UT the largest is 1.406″. rc.6 reached
  8.945″ at the same samples, 398 of 417 above 1″. The derivative is not the
  cause: rc.7's speed is the derivative of the longitude it reports, to
  0.0015″ a day. The rest is the analytic Moon's own error, which the DE440s
  kernel read through ERFA confirms (chart up to 1.39″ a day from the
  kernel, Swiss 0.011″). Swiss's speed gives 54 stations of Mercury to Pluto
  in 2024–2026; an hour before and an hour after each, the chart's
  retrograde flag agrees with the sign of Swiss's speed, 108 of 108, read at
  Swiss's TT or at the same UT. The chart's own stations fall within 37.7
  minutes of Swiss's (Pluto, 2024-10-12; median 3.5 minutes), and at every
  hour of 2024–2026 more than an hour from a station the flags agree,
  210,324 of 210,324. Swiss's figures are not committed;
  `../phase1-verdicts-2026-09-25/` has the tools. A3's 1.5″ was set after
  the 1.40″ was seen, so the 1″ FAIL stays beside this verdict, and the gate
  goes back to 1″ or tighter when the DE backend replaces the analytic Moon.

### 1.9 Placidus polar limit (version 1, rule 1h)

- **Rule.** 336-case 66.05–66.55 ladder: status agrees with Swiss 336/336;
  cusps ≤ 0.02″ given Swiss inputs.
- **Baseline.** The shipped engine refuses all 320 ladder cases Swiss
  computes (grid L); its whole-sign fallback differs from Swiss's Placidus by
  up to 147.5°. With the limit at 90° − ε and Swiss's inputs, the same
  iteration agrees 336/336 and matches to 0.0085″ (ledger
  angles-houses-aspects-3, verifier).
- **Baseline against the ERFA arbiter.** 90° − ε, with ε the true
  obliquity of date, runs from 66.533° to 66.589° over the ladder's dates;
  it allows Placidus on 320 of the 336 cases, the count Swiss computes, and
  the shipped engine refuses all 336 (`scripts/angles-grid.test.mjs`).
- **Verdict: PASS** (2026-09-25), on the vendored rc.7; the limit is in
  [zodiacs-org/engine#1](https://github.com/zodiacs-org/engine/pull/1).
  Swiss 2.10.03 computes Placidus on 320 of the 336 ladder cases and refuses
  the 16 at ±66.55° on 1800-06-21, each where |latitude| ≥ 90° − ε by its own
  obliquity (pyswisseph raises `houses_ex: error`; the library underneath
  returns Porphyry cusps with 'within polar circle, switched to Porphyry').
  The engine agrees on all 336, end to end through the site's `computeChart`
  and on Swiss's own ARMC and true obliquity: 320 Placidus charts and 16
  whole-sign charts with `polar-fallback`. No case is within 0.012° of its
  limit. On Swiss's inputs the engine's Placidus cusps are within 0.0085″ of
  Swiss's (1800-06-21T00Z, 66.5°), inside 0.02″. End to end, which is not
  part of the rule, the cusps differ by up to 44.6″ (the ascendant at
  2200-06-21T12Z, −66.4°, where Swiss's long-term sidereal time is 0.67″ from
  IAU 2006 and the ascendant's gain is 66) and the intermediate cusps by up
  to 2.1″. The owner delegated the fallback decision on 2026-09-23: whole
  sign stays the Placidus fallback, named `PLACIDUS_POLAR_FALLBACK`, and
  Porphyry can be asked for at any latitude. On the 16 refused cases the
  engine's Porphyry is within 1.6e-9″ of Swiss's substitute, and across
  1,632 cases from 55° to 85° in both hemispheres within 6.1e-9″ of
  `houses_armc(..., 'O')`. The site still offers whole sign and Placidus
  only. Swiss's readings are named by digest and not committed;
  `../phase1-verdicts-2026-09-25/` has the tools and the digests.

### 1.10 One crossing solver (version 1, rule 1i)

- **Rule.** Parity test on the audit's s2 cases; no throw on the site's Moon
  scans.
- **Baseline.** Two solvers ship with different semantics: the package's
  includes an exact lower endpoint and throws past 10,000 samples, the site's
  copy does neither (ledger production-event-search-5).
- **Verdict: PASS** (2026-09-26), on the vendored rc.8; not run before it.
  The site's own solver is gone, and every scan calls
  `@zodiacs/engine/crossings`. `scripts/crossings-s2.test.mjs` runs the
  audit's s2 cases through the site's scan and through the package's root,
  and both agree to the millisecond:
  - no root at an exact `from`;
  - 95 crossings for the Moon over 2,600 days at 0.25 days;
  - 13 for Saturn from 1900 to 2100;
  - no case throws, and a search bounded at 10,000 samples is refused whole.

### 1.11 Receipts (version 1, rule 1j)

- **Rule.** The receipt validator rejects a receipt without ephemeris
  identity.
- **Baseline.** Receipts do not identify the ephemeris by default (ledger
  data-toolchain-packaging-8) and never carry a tzdb version (time-7).
- **Verdict: PASS** (2026-09-26), on the vendored rc.8; not run before it.
  - The validator refuses a receipt under rc.8's conventions that lacks
    `engine.ephemeris` (`invalid_shape`).
  - It also refuses one that lacks `result.deltaT`, and one that names rc.7
    under rc.8's conventions.
  - Receipts made by rc.3 to rc.7, which predate the field, still parse by
    design (A2, *Receipts*).

  The rule covers the ephemeris only. Whether a receipt carries a tzdb
  version (ledger time-7) is not part of it and is not judged here.

### 1.12 Zone history from a pinned tzdb with backzone (version 1, M3; version 2)

- **Rule.** The 98-zone divergence list resolves to backzone truth
  (Stockholm 1947-07-01 12:00 → +60).
- **Baseline.** The host's default build gives 98 zones another city's
  offsets before 1970, off by 20 to 180 min (`corpora/tzdb-divergence-98.json`).
- **Verdict: PASS**, with the reference stated. Stockholm 1947-07-01 12:00
  resolves to +60 (`src/lib/time/localToUtc-history.test.ts`). The site pins
  tzdb 2025c with backzone in full, and its resolver reads that history
  exactly: an AI reviewer's separate brute-force model agreed on 12.17
  million wall times with 0 failures (a review probe, not committed). The audit's list was built against a different
  reference, Debian's tzdata 2025b, so it is checked as well
  (`corpora/tzdb-divergence-98-check.json`). Eight of its 193 segments are
  spans tzdb marks "-00", no local time yet (Kerguelen, Syowa, McMurdo,
  Dumont d'Urville), which that reference reads as UTC; since the review of
  step 1.12 the site reads the browser's offset there instead. Of the other
  185, 179 reproduce to the minute (the first run of this check, before that
  change, reproduced 187 of 193). The remaining six are differences in the
  reference, not the resolver:
  - America/Tijuana, three segments (1953, 1961, 1962). Release 2025c
    changed this history: "Baja California agreed with California's DST
    rules in 1953 and in 1961 through 1975" (tzdb NEWS). The host and the
    pinned release are both 2025c and agree.
  - America/Coral_Harbour, three segments (1895–1940). Debian builds
    backzone with `PACKRATLIST=zone.tab`, which makes Coral_Harbour a link to
    Atikokan; backzone in full has Coral_Harbour's own zone (LMT −5:32:40 to
    1884, then Eastern time). The site takes the latter, as it does for every
    name (`scripts/build-tz-lmt.mjs`, `zoneNames`).

  Scored against the list as built rather than the pinned reference, the
  verdict would be PARTIAL, 179 of 193.

### 1.13 Julian calendar input (version 1, M3; version 2)

- **Rule.** Julian↔Gregorian agrees with `swe_julday`/`swe_revjul` exactly;
  Petrograd 1917-10-25 O.S. yields the 1917-11-07 chart.
- **Verdict: PASS, for the library (1.13a) and the forms (1.13b).** 0 of
  255,675 Julian dates from 1500 to 2199 differ from Swiss 2.10.03
  (`julian-vs-swiss.json`). The Petrograd chart is a test of the library
  (`src/lib/time/calendar.test.ts`) and of the birth chart form's own path,
  from the Old Style date as typed to the calculator's calculation block
  (`src/islands/ChartCalculator.calendar.test.ts`): the same instant, receipt
  and positions as typing 1917-11-07. The birth forms offer the Julian
  calendar for a date written before 1924 and note when the birthplace's
  country changed calendars, one cited date per country
  (`src/data/gregorian-adoption.ts`, 42 countries).

### 1.14 Claims ledger (version 2)

- **Rule.** Every public sentence about accuracy, time handling or privacy
  has an evidence path; any sentence without one is removed.
- **Verdict: PASS for sentences** (2026-09-23). `docs/claims/ledger.json`
  listed, when it landed (`3a8f22e3`), the 1,075 public sentences its trigger
  lists select in 1,390 files, each with the claim it makes (74 claims) or the
  listed reason it makes none (277), and `scripts/claims-ledger.test.mjs`
  holds the copy to it. After the owner delegated the pending decisions, the
  sentences that were not supported were corrected: the rising-sign guides,
  the English catalog and the es/fr/it/pt time and privacy copy under a
  one-time scope allowance, the positions-only code by step 1.15, and the
  privacy pages after an independent check. The ledger now lists 1,139
  sentences, 279 of them exempt, and 73 claims. Every claim a sentence makes is
  supported. One claim is still open: the receipt's "apparent" label, a
  receipt value rather than a sentence, which step 1.11 closes. A sentence
  that uses none of the trigger words is outside the ledger.

### 1.15 The share token (version 2)

- **Rule.** A decoder test shows the chosen precision cannot recover the birth
  instant to better than the stated window; the claims ledger carries the new
  wording.
- **Decision** (owner-delegated, 2026-09-23). Measurement changed the
  premise. On 300 births, no rounding hides the birth date: a search over
  1900–2030 finds one matching window even with every body at 1°. Hiding the
  time needs every body at 0.1° or coarser, which moves most calendar
  events by 30 minutes or more. The birthplace is carried only by the
  ascendant and midheaven, since the planets, the Moon and the nodes are
  geocentric. So the angles in every shared code go to the middle of their
  whole degree, which keeps the sign. That covers the link, the calendar
  feed (the server rounds older codes too), the two-chart link and
  invitations. The planets stay at 0.001°. The preview link keeps the code
  in its fragment.
- **Verdict: PASS, against the rule as the decision restates it.**
  `src/lib/share-positions.test.ts` decodes the rounded code for the same 300
  births with the instant known. For every birth, the region contains the
  birthplace and is at least 0.9° wide east–west. Across the sample, the
  long side is at least 70 km, has a median between 500 and 550 km, and is at
  least 240 km within 45° of the equator. The birth instant stays
  recoverable to a 6.3 s window at the median. The copy states that, rather
  than a window the code does not give, and the ledger's
  `priv.positions-token` carries the wording.

### Version 1's other M3 rules

- The round-trip scan: PASS (see 1.1).
- `time-5`'s six flag probes classify correctly: NOT RUN.
- ΔT within 0.2 s of IERS 1962–present with the band ≥ the IERS formal
  error: PASS (2026-09-26, step 1.4, on the vendored rc.8). Every IERS day
  from 1962-01-01 to 2026-09-24 is within 0.0834 s. σ is at least 15 times
  IERS's formal error on observed rows and 4.8 times on predicted rows.
  Earlier: NOT RUN.

## Phase 0 items

| item | status |
| --- | --- |
| 1. This file and the corpora | Done. |
| 2. Appended corrections | Done. Every file version 1 lists carries a dated correction beside the passage, with the original kept. The ΔT correction is appended to `docs/engine-validation/README.md` and `swiss-benchmark/RESULTS.md`; on the methodology page it and the mean obliquity are rewritten in place, since a reader's page cannot carry both wordings. In the validation report, the "1.57″ worst angle" row and Swiss's polar limit (90° − ε, about 66.56°), with four other passages the claims ledger found, are corrected in place because step 1.14 holds the report's sentences to their evidence, and their earlier wording is appended under the report's *Corrections*. Appended on 2026-09-23: `numerics/RESULTS.md` (the `.se1` files are DE441-based; the Moon's 0.0107″ is the DE440-versus-DE441 lunar difference); `PARTITION-RESULTS.md` (the widest floor cell, not span; 11 of the 42 test families record their mutation, and one of those does not hold); `CHART-ADAPTER-CONTRACT.md` (UTC → TT, the nutation model, the nodes, a coverage policy); `examples/00-prepare-a-pack.md` (423 tests); `METADATA-CORRECTION.md` and `LICENSING.md` (every tracked file of Swiss output, listed). `compiler/RESULTS.md` §11 also carries the public-domain correction `RIGHTS.md` made. |
| 3. Premises and the frame decomposition | Done. The three false premises are recorded (brief v2, R8). `horizons-frame/`: ERFA reproduces the frame of Horizons QUANTITIES=31 to within 5.5 mas of Swiss in longitude (median 1.4 mas) and 1.9 mas in latitude, for ten bodies at 24 instants from 1851 to 2148. It does so only with Horizons's nutation offsets from its EOP file, held constant outside 1962-01-20 to 2026-12-18, and with no frame bias. Version 1's bare `prec76+nut80+obl80` leaves up to 0.125″. The frame term is about −0.048″ from 1962 to 2026, −0.373″ at 1851 and +0.345″ at 2148, so R8's "about 0.05″" holds only inside that span. The VECTORS check involves no frame. It puts the DE440s Moon 10.2 mas from DE441 at 1851 and 8.6 mas at 2148, and Mars within 0.001 mas, which settles the lunar attribution in `numerics/RESULTS.md`. Every comparison with Swiss here uses barycentres for the outer planets. `src/lib/engine/fixtures/horizons-reference.json` still holds body centres (599–999), up to 0.073″ from the barycentres and far inside its 0.05° tolerance. It moves to barycentres at the rc.7 re-vendoring, which recaptures the Phase 1 receipt that hashes `src/lib`. (2026-09-25: the rc.7 re-vendoring did not move it; it moves with rc.8's.) |
| 4. Multi-year distribution fixture | Done. `../swiss-benchmark/multiyear-1800-2199.json`: every tenth day from 1800 to 2199, the ten bodies and the true node, statistics only, at the same UT and at the same TT. It reproduces the critic's maxima (Venus 22.9″, Pluto 29.1″ at the same TT). The methodology and developer engine pages and the validation report quote it beside the 160-measurement sample, whose 18.6″ was not the worst up to 2026 (Venus reaches 23.0″ in 1878), and `scripts/methodology-accuracy-claim.test.mjs` binds them to it. |
| 5. `lite.ts` header and fixture test | Done, with one deviation: the test measures `lite.ts` against the full engine at 50 instants, not against a Swiss fixture, so no Swiss output is committed under `src/`. |
| 6. Commit the audit, its evidence and both briefs | Done (`88621826`). |
| 7. Baselines for §9's measures | Not done; needs the owner's analytics. |

## Fresh holdouts

Version 1 asks for one fresh holdout per milestone, by a rule fixed before it
exists, opened once. The rule:

- The draw uses mulberry32 seeded with the first 32 bits of
  SHA-256(`zodiacs-holdout/<step>`), where `<step>` is the step's id in this
  file (for example `1.3`).
- Positions and angles: 200 instants uniform in UTC over 1800-01-01 to
  2199-12-31; all ten bodies; latitude uniform in [−66.5, 66.5], longitude
  uniform in [−180, 180).
- Events: 50 events drawn uniformly from the site's catalog for 2026–2035.
- Time: 500 pairs of a city-index zone (uniform) and a local wall minute
  (uniform over 1850–2037).
- The holdout is generated only after the step's code is committed. Its
  result records the step's commit, the generator and its output digest. It
  is opened once; a second look is a new holdout with a new id.

## Amendments

Proposed, not adopted. Each needs the owner's decision; until then the
original rule stands and its verdict is the one above.

- **A1 (rule 1b, 2026-09-23).** The 5″ gates at 66° cannot hold. At
  2025-03-21T18Z, lat −66, the residual is 6.35″, and it is the engine's own
  five-term nutation (ERFA gives 6.36″). At 1800 and 2200 Swiss's long-term
  sidereal time is off (Swiss − ERFA is 19.97″ at lat −66 in 2200). Proposed:
  8″ at 66°, judged against ERFA outside 1850–2050. From the Phase 1
  planners' probes, not yet committed as a tool.
- **A2 (rule 1c, 2026-09-23).** Rule 1c says the ΔT table is refreshed
  "weekly via the existing cron". No workflow refreshes IERS data; the weekly
  jobs refresh pulse, distribution and digest data. Proposed: 1.4 adds that
  job, and its model is written here before its code: the source before
  1955, the extrapolation after the last prediction, and how σ grows.
- **A3 (rule 1g, 2026-09-23).** The 1″/day gate came from one perigee
  (2024-10-17, ledger verification-honesty-8). Measured with the fix over all
  80 apsides of 2024–2026 at 0, ±6 and ±12 h, 8 of 417 samples exceed
  1″/day, the largest 1.40″/day (perigee of 2025-12-04), and the
  state-vector route leaves the same excess. Proposed: ≤ 1.5″/day at perigee
  and apogee, and "the derivative of the reported longitude" in place of
  "state vectors". From the planners' probes, not yet committed.
- **A4 (rule 1d, 2026-09-23).** The FAIL above stands. Proposed: run the same
  2 s gate again once step 1.4 lands, as a new verdict beside this one.

### Adopted 2026-09-25

On 2026-09-25 the owner delegated every pending programme decision ("stop
asking me for permissions, just get it done"). Under that delegation the
proposals above are adopted as follows. Each original verdict stays beside
the new one, because A1's and A3's gates were set after their residuals were
seen.

- **A1, adopted.** The added vectors of rule 1b are grid A's cases at ±63,
  ±65 and ±66°. Their gates are 5″ at 63° and 65° and 8″ at 66°. They are
  judged against Swiss from 1850-01-01 0h UT up to 2050-01-01 0h UT, and
  against the ERFA arbiter outside that window, at all three latitudes. The
  window is Swiss's own: `swe.sidtime` minus `gst06a` jumps −0.097″ at
  1850-01-01 0h UT and −1.908″ at 2050-01-01 0h UT, and between the two
  Swiss is within 0.0014″ of ERFA in RAMC. Read as whole calendar years,
  "1850–2050" would put 2050-03-21 inside the window and fail by up to
  71.33″ there. Replacing Swiss by ERFA at 66° alone leaves 28 failures at
  63° and 65°, between 2050 and 2200 and in 1800. Measured on rc.7: 0 of
  816 exceed; the largest are 6.353″ at 66° (against Swiss; 4.862″ outside
  the window against ERFA), 2.769″ at 65° and 1.343″ at 63°. The 8″ at 66°
  is the engine's five-term Δψ (+0.2035″ at 2025-03-21T18Z) times the
  ascendant's gain of 36.9; it goes with the nutation model, which M2
  replaces.
- **A2, adopted (rule 1c, 2026-09-25).** On 2026-09-25 the owner delegated
  the pending decisions: "stop asking me for permissions, just get it done".
  On that basis A2 is adopted as below. The proposal of 2026-09-23 above
  stays as written. The model is fixed here and in
  `../deltat-2026-09-25/README.md` before any engine code; the reference
  implementation is `../deltat-2026-09-25/tools/deltat-reference.ts` (sha256
  `3dea107e…`), and the engine's `src/deltat.ts` is that file.
  - *Model "zodiacs-deltat/1".* ΔT = TT − UT1 in seconds, the instant read as
    UT1. Before −720, the integral of Stephenson, Morrison & Hohenkerk 2016
    (SMH) eq. (5.1), lod = 1.78t − 4.0 sin(2πt/15) ms. From −720 to 1941,
    SMH's Table S15 as its C2 spline through 32 knots. From 1941, whole-year
    knots: USNO `historic_deltat.data` to 1961, IERS 20 C04 to 1972, IERS
    finals2000A rows flagged I after, then a knot at the last observed day
    and four knots from Bulletin A's predictions to the last predicted day.
    After that, the prediction window's slope damped with τ = 15 years plus
    the curvature of the eq. (5.1) curve. This release's table: IERS files of
    2026-09-24, digest `6371988c510a1c6c`, last predicted day 2027-10-02.
  - *Band.* After the last observed day σ depends only on h, the years since
    then: 0.03 + 0.09·h^0.75 s to one year, 0.12·h^1.5 s to ten, then 0.61 s
    a year more (0.61·h − 2.3052668 s); continuous and never decreasing.
    0.61 s a year is the smallest slope, in steps of 0.01, for which σ is at
    least the p68 error of the extrapolation rule's hindcast (README,
    section 4) at every whole-year horizon from 20 to 100 years; the
    42-year horizon for launches 1851–2025 needs 0.6028. Observed: 0.03 s.
    From 1620 to 1956, at least the largest of three measured indicators:
    0.46 s (Table S15 against IERS, RMS over 1962–1971), SMH's own
    occultation data about the curve, and the authors' 2016-to-2020
    revision; before 1620, at least the revision and 0.6·t² s (SMH eq. 4.1,
    32.5 ± 0.6 s/cy²). Before 1620 σ is an estimate, not a calibrated 1-σ.
  - *Sources.* Only CC BY 4.0 and public data ship: SMH 2016 and its
    electronic supplement (PMC5247521), USNO (US Government work) and IERS
    (free with citation). The 2020 addendum's Table S15.2020 has no
    established licence and is used only to measure the revision: 0.423 s at
    most over 1800–1900, none over 1900–1941, 184.9 s near 962. HMNAO's web
    pages are not used. Rule 1c's "IERS/USNO table 1620–present" is read as
    SMH 2016 (which covers 1620) to 1941, USNO to 1961 and IERS after, since
    USNO's older reduction differs from SMH 2016 by an RMS of 6.4 s over
    1700–1800. Rule 1c's "DE440 tidal acceleration" is not applied: no
    primary source states DE440's value (Park et al. 2021 give it as implicit
    in the integration), and SMH say their values go with DE430 or
    −25.82″/cy², which is kept.
  - *Refresh.* Rule 1c's "weekly refresh via the existing cron" becomes:
    the table lives only in the engine package; it is refreshed at every
    engine release and at least once a year, with the yearly sky-data
    refresh, and reaches the site as an engine release through a normal pull
    request with full CI. A weekly workflow monitors it and commits nothing.
    It fetches finals2000A (USNO, with the IERS data centre as mirror) and
    opens or updates one issue when |ΔT_model − ΔT_IERS| on the run date at
    0h UTC exceeds max(0.1 s, σ_model) there, or when the table's last
    predicted day is fewer than 90 days away, or when the fetch or its
    validation fails. Replayed over the 89 weekly Bulletin A issues from
    2025-01-09 to 2026-09-17, with the table refreshed each January it would
    have fired on 13 runs (12 for the 90-day window, 1 for the value), and
    the largest |model − IERS| on a run date was 0.1055 s (2026-09-18).
    Weekly table commits were rejected. A weekly table would have changed ΔT
    in the site's 2026–2030 event span by 1 ms or more in 81 of the 89 weeks
    (median largest change 0.0115 s, largest 0.0772 s). The site's generated
    data hold those instants to the millisecond, and the prebuild matches
    them exactly (`verify-events-publication.ts`,
    `verify-horoscope-program.ts`, the fixed goldens of
    `replay-daily-publication.ts`), as do
    `phase1-acceptance-evidence.test.mjs` (its hash covers two transit
    files) and `daily-snapshot-lib.test.mjs`. `publish-through-pr.sh` merges
    before it dispatches Site Check. Each weekly change would have
    regenerated published data or broken the build after merge.
  - *Receipts.* The rc.8 conventions set adds `deltaT`; rc.7's set is frozen
    as `CONVENTIONS_RC7`; sets match on exact key sets; rc.3's set is read
    only from engines rc.3 to rc.6, rc.7's only from rc.7, the rc.8 set only
    from rc.8 on. `result.deltaT` is `{seconds, sigma, model, table,
    tableDigest, segment}`: model `zodiacs-deltat/1` with the table's version
    and digest, or `pinned` for a caller's value (`ChartInput.deltaT`,
    `BirthInput.deltaT`, finite) with sigma, table and tableDigest null;
    |seconds| and σ at most 1e10 s. The table is deep-frozen. A receipt made
    with this engine's table must carry the model's value at its instant; a
    value from another release's table is a claim. A replay pins ΔT only
    when the receipt records a caller's pin, which was part of the request;
    a modelled value is not pinned, so a replay on the same engine version is
    exact, and one across versions is a different calculation, as now.
  - *Budget.* The model is inline in the eager engine chunk, with no build
    transform of astronomy-engine. Measured on a copy of the site: 25,997 B
    gzipped with the model on engine b457204, 24,519 B without it, 24,253 B
    for rc.7; the model and its wiring cost 1,478 B. The `engine-chunk`
    budget in `budgets.json` goes from 25 KB to 26 KB (26,624 B), which
    leaves 627 B. No route budget changes.
  - *Gates, restated.* Gate 1: |ΔT − IERS| ≤ 0.2 s at 1962-03-15,
    1969-09-15, 1977-03-15, 1984-09-15, 1992-03-15, 1999-09-15, 2007-03-15,
    2014-09-15, 2017-08-21, 2020-01-01, 2024-04-08 and 2026-09-22, 0h UTC,
    with IERS values from 20 C04 through 1973-01-01 and finals2000A I rows
    after (`../deltat-2026-09-25/iers-12.json`); and M3's band rule, σ at
    least the IERS formal error on every observed and predicted row from
    1962. Gate 2: the receipt carries the model, the value, the band, the
    table and its digest, and the engine's and the site's receipt tests
    pass. Gate 3, all against Swiss 2.10.03 (`sepl_18.se1`, `semo_18.se1`)
    as an instrument, the returned flag read on every call, statistics only;
    gap = p50 of |engine − Swiss| at the same UT minus p50 at the engine's
    TT, p50 the ⌊n/2⌋-th sorted value: (a) on the §5 corpus's 18 MEASURE
    cases |gap| ≤ 0.3″; (b) on the multi-year fixture, |gap| ≤ 0.3″ in each
    of 1800–1849, 1850–1899, 1900–1949, 1950–1999 and 2000–2026; (c) in each
    of those eras the paired clock contribution, per instant |(engine −
    Swiss(UT)) − (engine − Swiss(TT))|, has p95 ≤ 0.3″. After 2026 the gaps
    are reported without a gate; both clocks are extrapolations there.
    Before 1962, gate 3 mostly checks that the engine and Swiss use the same
    reconstruction, both Table S15 of 2016. It does not check accuracy: both
    sides take ΔT from that table, and from 1800 to 1961 Swiss's ΔT is within
    0.29 s of the model (RMS 0.10 s), so the gate would pass just as well if
    the table were wrong. Accuracy before 1956 is what σ states, and nothing
    independent measures it; from 1962 it is gate 1's job.
  - *Holdout.* `zodiacs-holdout/1.4` is drawn by the rule in "Fresh
    holdouts" after the code commit, in the order fixed in
    `../deltat-2026-09-25/tools/holdout.ts`, and opened once. Its positions
    are scored per era up to 2026 with the paired p95 ≤ 0.3″ (the p50 gap
    reported), and with gate 1 at its instants from 1962-01-01 to the last
    observed IERS day. Its events part runs: 50 events drawn from the
    regenerated 2026–2035 catalog, each event's shift from rc.7 and its
    difference from Swiss reported per event class, without a gate. Its time
    part does not apply to this step.
  - *Said before the result.* On the reference implementation the gates
    read: gate 1 at most 0.0306 s (rc.7 6.302 s); every IERS day since 1962
    within 0.0834 s; gate 3 (a) +0.022″ (rc.7 +0.314″), (b) −0.070, −0.022,
    −0.009, +0.006 and −0.009″ (rc.7 −1.891, −1.028, −0.166, −0.003,
    +0.178″), (c) 0.103, 0.044, 0.119, 0.118 and 0.100″ (rc.7 2.838, 1.671,
    0.609, 0.075, 3.233″). Worse: without rc.7's ΔT error partly offsetting
    the analytic Moon's own error, the production-path Moon against Swiss at
    the same UT goes from a p50 of 2.808″ to 3.708″ over 1800–1954, and
    against Horizons before 1962 from 1.914″ to 2.443″ (9 instants), until
    M2. Better: 0.714″ to 0.527″ against Swiss over 2000–2026, and 2.642″ to
    0.671″ over 2000–2049. Today's Moon moves back 3.41″ and new and full
    moons of 2026–2030 come 5.93 to 8.49 s later than with rc.7. ΔT at 2100
    becomes 78.93 ± 42.39 s, where rc.7 gives 202.65 s. The verdicts are
    recorded on the vendored rc.8, beside the NOT RUN above.
- **A3, adopted.** Rule 1g's Moon gate is ≤ 1.5″ a day at perigee and
  apogee, and the speed is "the derivative of the reported longitude" in
  place of "state vectors"; version 2's Phase 1 table reads the same way.
  The figures A3 quoted from the planners' probes are now reproduced on the
  vendored bytes: 8 of 417 samples over 1″ a day, the largest 1.3971″ at
  2025-12-04T17:07:51Z; independently chosen Swiss apsides give 8 of 400,
  largest 1.3962″; no sample exceeds 1.5″ on either clock (1.4059″ at the
  same UT). The state-vector route leaves the same excess (1.3968″ to
  1.4004″, 8 over 1″), so no speed method on the current lunar series meets
  1″. Swiss's own apparent Moon speed is up to 0.19″ a day from the DE440s
  kernel (its light-time path steps the apparent longitude by about 0.7
  mas), so the instrument is good to about 0.2″ a day here. The gate returns
  to 1″ a day or tighter when the DE backend replaces the analytic Moon.
- **A4, adopted (rule 1d, 2026-09-25).** Adopted on the same delegation.
  The FAIL above stands. When step 1.4 has landed, the same 2 s gate is run
  again with the same denominator, all 124 committed lunations of 2026–2030
  against Swiss 2.10.03 with
  `../events-vs-swiss-2026-09-23/tools/compare.py` on the regenerated
  catalog, statistics only, and recorded as a new verdict beside it. The
  Swiss-free projection, the committed deltas plus each lunation's shift
  (`../deltat-2026-09-25/tools/lunations-a4.mjs`), must agree with it to
  1 ms. Said before the result: the projection gives 80 of 124 within 2 s,
  largest 5.15 s (the new moon of 2030-05-02), against 1 of 124 now; the
  expected verdict is FAIL, on the Moon's geometry, which is M2's work.
