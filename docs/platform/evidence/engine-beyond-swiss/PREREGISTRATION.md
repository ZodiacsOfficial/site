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
- **Verdict: NOT RUN.** A package change. It is written on a local rc.7
  branch of the SDK, where the scan gave 0 of 236,932; that branch is not
  pushed, so the figure cannot be checked from this repository yet.

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
- **Verdict: NOT RUN.** See amendment A1.

### 1.4 Observed ΔT with a band (version 1, rule 1c)

- **Rule.** |ΔT − IERS| ≤ 0.2 s on 12 dated values 1962–present; the receipt
  carries model, value and band; production-path Moon p50 vs Swiss within
  0.3″ of the TT-pinned p50.
- **Baseline.** On 2026-09-22 the engine's ΔT is 75.497 s where the IERS
  value is 69.196 s, which moves the Moon 3.46″
  (`../deltat-2026-09-23/values.json`).
- **Verdict: NOT RUN.** See amendment A2.

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
- **Verdict: PARTIAL.** Scans: PASS on the site. Returns, year scans and the
  solar return stay inside 1800–2199 and say when they were clipped
  (`src/lib/engine/reference-span.test.ts`). The `outside-reference-span` flag
  belongs to the package and waits for rc.7; the site refuses a birth date
  outside the span instead.

### 1.8 Speeds (version 1, rule 1g)

- **Rule.** Moon speed vs Swiss ≤ 1″/day at perigee and apogee; station-flag
  agreement at ±1 h.
- **Baseline.** The ±6 h central difference is off by up to 7.5″/day for the
  Moon (ledger production-positions-9); against Swiss's analytic speed, up to
  3.4″/day (swiss-parity-7); station instants 1–4 min from Swiss's
  (angles-houses-aspects-10).
- **Verdict: PARTIAL.** Natal Saturn's direction now comes from the chart's
  own speed (1.8c, landed). The speeds themselves are a package change on the
  local rc.7 branch. See amendment A3.

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
- **Verdict: NOT RUN.**

### 1.10 One crossing solver (version 1, rule 1i)

- **Rule.** Parity test on the audit's s2 cases; no throw on the site's Moon
  scans.
- **Baseline.** Two solvers ship with different semantics: the package's
  includes an exact lower endpoint and throws past 10,000 samples, the site's
  copy does neither (ledger production-event-search-5).
- **Verdict: NOT RUN.**

### 1.11 Receipts (version 1, rule 1j)

- **Rule.** The receipt validator rejects a receipt without ephemeris
  identity.
- **Baseline.** Receipts do not identify the ephemeris by default (ledger
  data-toolchain-packaging-8) and never carry a tzdb version (time-7).
- **Verdict: NOT RUN.**

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
- **Verdict: PASS for the library (1.13a).** 0 of 255,675 Julian dates from
  1500 to 2199 differ from Swiss 2.10.03 (`julian-vs-swiss.json`); the
  Petrograd chart is a test (`src/lib/time/calendar.test.ts`). Putting the
  calendar in the form (1.13b) has not landed.

### 1.14 Claims ledger (version 2)

- **Rule.** Every public sentence about accuracy, time handling or privacy
  has an evidence path; any sentence without one is removed.
- **Verdict: PARTIAL.** `docs/claims/ledger.json` listed, when it landed
  (`3a8f22e3`), the 1,075 public sentences its trigger lists select in 1,390
  files, each with the claim it makes (74 claims) or the listed reason it
  makes none (277), and `scripts/claims-ledger.test.mjs` holds the copy to
  it; later commits add to it, and `node scripts/claims-ledger.mjs --summary`
  prints the current counts. The corrections the audit, the fact-check and
  the ledger's own research found in English copy have landed, the measured
  ones bound by `scripts/claims-bindings.test.mjs`. 68 of those 74 claims
  are supported. 43 sentences are not, and are still public: four
  overstated claims (the positions-only chart code, 7 sentences, owner
  decision 10.4 with step 1.15; the receipt's "apparent" label, a receipt
  value rather than a sentence, step 1.11; the rising-sign guides, 12; the
  English catalog, 1) and two stale ones (the es/fr/it/pt pages the English
  has moved past, 23). The guides, the catalog and the translations are
  protected by the scope guard, and the chart code waits on the owner, so
  none was removed; each has what closes it. A sentence that uses none of
  the trigger words is outside the ledger.

### 1.15 The share token (version 2)

- **Verdict: NOT RUN.** Needs an owner decision.

### Version 1's other M3 rules

- The round-trip scan: PASS (see 1.1).
- `time-5`'s six flag probes classify correctly: NOT RUN.
- ΔT within 0.2 s of IERS 1962–present with the band ≥ the IERS formal
  error: NOT RUN (step 1.4).

## Phase 0 items

| item | status |
| --- | --- |
| 1. This file and the corpora | Done. |
| 2. Appended corrections | Done. Every file version 1 lists carries a dated correction beside the passage, with the original kept. The ΔT correction is appended to `docs/engine-validation/README.md` and `swiss-benchmark/RESULTS.md`; on the methodology page it and the mean obliquity are rewritten in place, since a reader's page cannot carry both wordings. In the validation report, the "1.57″ worst angle" row and Swiss's polar limit (90° − ε, about 66.56°), with four other passages the claims ledger found, are corrected in place because step 1.14 holds the report's sentences to their evidence, and their earlier wording is appended under the report's *Corrections*. Appended on 2026-09-23: `numerics/RESULTS.md` (the `.se1` files are DE441-based; the Moon's 0.0107″ is the DE440-versus-DE441 lunar difference); `PARTITION-RESULTS.md` (the widest floor cell, not span; 11 of the 42 test families record their mutation, and one of those does not hold); `CHART-ADAPTER-CONTRACT.md` (UTC → TT, the nutation model, the nodes, a coverage policy); `examples/00-prepare-a-pack.md` (423 tests); `METADATA-CORRECTION.md` and `LICENSING.md` (every tracked file of Swiss output, listed). `compiler/RESULTS.md` §11 also carries the public-domain correction `RIGHTS.md` made. |
| 3. Premises and the frame decomposition | Done. The three false premises are recorded (brief v2, R8). `horizons-frame/`: ERFA reproduces the frame of Horizons QUANTITIES=31 to within 5.5 mas of Swiss in longitude (median 1.4 mas) and 1.9 mas in latitude, for ten bodies at 24 instants from 1851 to 2148. It does so only with Horizons's nutation offsets from its EOP file, held constant outside 1962-01-20 to 2026-12-18, and with no frame bias. Version 1's bare `prec76+nut80+obl80` leaves up to 0.125″. The frame term is about −0.048″ from 1962 to 2026, −0.373″ at 1851 and +0.345″ at 2148, so R8's "about 0.05″" holds only inside that span. The VECTORS check involves no frame. It puts the DE440s Moon 10.2 mas from DE441 at 1851 and 8.6 mas at 2148, and Mars within 0.001 mas, which settles the lunar attribution in `numerics/RESULTS.md`. Every comparison with Swiss here uses barycentres for the outer planets. `src/lib/engine/fixtures/horizons-reference.json` still holds body centres (599–999), up to 0.073″ from the barycentres and far inside its 0.05° tolerance. It moves to barycentres at the rc.7 re-vendoring, which recaptures the Phase 1 receipt that hashes `src/lib`. |
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
