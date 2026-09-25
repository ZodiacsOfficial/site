/*
 * Statistics for results/, from what run-all.sh left in WORK:
 *
 *   step-1.2.json, step-1.3.json, step-1.8.json, step-1.9.json   each step's gates and figures
 *   provenance.json                                            versions, and digests of the readings
 *
 * No Swiss Ephemeris output is copied: no positions, speeds, station or apsis instants, cusps or
 * per-row values. What passes is counts; p50, p95 and max; the identifiers of a few worst cases
 * (UTC and latitude of a grid case; body, direction and date of a station; kind, date and offset
 * of a sample around an apsis Swiss found), each with the engine-minus-reference difference
 * there; and the SHA-256 of each Swiss reading, so a re-run can be matched without the reading.
 * The step files do not depend on where the repository or WORK lives. In provenance.json, the
 * two dumps that record the corpus's absolute path, and the arbiter dump that records the
 * kernel's, also get a digest with that path written portably.
 *
 *   node tools/summarize.mjs                      (RESULTS=<dir> writes somewhere else)
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { CORPORA, TOOLS, WORK } from './lib/paths.mjs';

const RESULTS = resolve(process.env.RESULTS || join(TOOLS, '..', 'results'));
const raw = (...parts) => readFileSync(join(WORK, ...parts));
const json = (...parts) => JSON.parse(raw(...parts).toString('utf8'));
const jsonLines = (...parts) => raw(...parts).toString('utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sig = (x, digits = 4) => Number(x.toPrecision(digits));
const fixed = (x, digits) => Number(x.toFixed(digits));
const day = (iso) => iso.slice(0, 10);
const pair = (a, b) => `${a}–${b}`;
const range = (values) => [Math.min(...values), Math.max(...values)];
const unique = (values) => [...new Set(values)].sort((a, b) => a - b);
const verdictOf = (gates) => (gates.every((g) => g.pass) ? 'PASS' : gates.some((g) => g.pass) ? 'PARTIAL' : 'FAIL');
const check = (condition, message) => { if (!condition) throw new Error(message); };
const NOTE = 'Statistics only: counts, quantiles and a few named worst cases with the difference there. '
  + 'Swiss Ephemeris readings are not committed; provenance.json names each by SHA-256.';

// The site test run by run-all.sh (vitest, verbose reporter).
const vitestLog = raw('s13', 'site-angles-grid-test.log').toString('utf8');
const siteTests = [...vitestLog.matchAll(/^ +(✓|×|↓) scripts\/angles-grid\.test\.mjs > (.+?)(?: \d+ms)?$/gmu)]
  .map((m) => ({ test: m[2], pass: m[1] === '✓' }));
const siteTotals = /Tests +(?:(\d+) failed \| )?(\d+) passed \((\d+)\)/u.exec(vitestLog);
const siteTest = (rule) => ({
  file: 'scripts/angles-grid.test.mjs',
  passed: siteTests.filter((t) => t.pass).length,
  of: siteTotals ? Number(siteTotals[3]) : siteTests.length,
  tests: siteTests.filter((t) => t.test.includes(`(rule ${rule})`)),
});

// ---------------------------------------------------------------------------------- step 1.2
const classify = json('s12', 'classify.json');
const scan = json('s12', 'swiss-scan-summary.json');
const synthetic = json('s12', 'synthetic.json');
const verifier = json('s12', 'verifier-sweep.json');
const own = json('s12', 'engine-own.json');
const scanSetAside = jsonLines('s12', 'set-aside.json');
const ownSetAside = jsonLines('s12', 'engine-own-set-aside.json');
const S1 = synthetic.S1_engineTestSweep;
const S2 = synthetic.S2_plannerSweep;
const S3 = synthetic.S3_wrapRetrogradeSweep;
const dense = verifier.denseSweep;
const auditSweep = verifier.verifierSweep;
const scan10 = verifier.engineScan10min;
const named = synthetic.named.all;
const tally = (b) => ({ judged: b.judged, misclassified: b.misclassified, falsePositives: b.falsePositives, falseNegatives: b.falseNegatives });
check(classify.rc7.T1.judged === classify.aspects.rc7, 'orb-rate truth judged every aspect');

const gates12 = [
  { gate: 'Scan: 0 misclassified, against the orb\'s rate from Swiss\'s speeds',
    misclassified: classify.rc7.T1.misclassified, of: classify.rc7.T1.judged },
  { gate: 'Scan: 0 misclassified, against the orb\'s motion under Swiss over ±1 s',
    misclassified: classify.rc7.T2.misclassified, of: classify.rc7.T2.judged },
  { gate: '0 false positives, scan and sweeps',
    falsePositives: classify.rc7.T1.falsePositives + classify.rc7.T2.falsePositives + S1.rc7FalsePositives
      + S2.rc7FalsePositives + dense.rc7FalsePositives + S3.rc7FalsePositives },
  { gate: 'Synthetic sweeps: 0 misclassified',
    misclassified: S1.rc7Misclassified + S2.rc7AspectMotionMisclassified + S2.rc7FindAspectsMisclassified
      + auditSweep.rc7Misclassified + dense.rc7Misclassified + S3.rc7Misclassified,
    of: S1.cases + S2.cases + auditSweep.cases + dense.cases + S3.cases },
  { gate: 'Wrap and retrograde cases pass', failed: named.filter((c) => !c.pass).length, of: named.length },
].map((g) => ({ ...g, pass: (g.misclassified ?? g.falsePositives ?? g.failed) === 0 }));

const step12 = {
  step: '1.2',
  title: 'Applying and separating',
  rule: 'Version 1, rule 1a: 0 misclassifications over the 2024 30-min Swiss-position scan (236,932 aspects) and the synthetic sweep; 0 false positives; wrap and retrograde cases pass.',
  engine: classify.engine.ENGINE_VERSION,
  verdict: verdictOf(gates12),
  gates: gates12,
  note: NOTE,
  scan: {
    what: 'Every 30 minutes of 2024 UTC, ten bodies, the engine\'s five aspects and orbs, on Swiss\'s positions and speeds (calc_ut with FLG_SWIEPH|FLG_SPEED); rc.7 findAspects, the function computeChart calls.',
    instants: scan.instants_kept,
    instantsDiscarded: scan.instants_discarded,
    swissCalls: scan.calls,
    swissCallsWithoutSWIEPH: scan.calls_without_SWIEPH,
    swissCallsWithoutSPEED: scan.calls_without_SPEED,
    aspects: classify.aspects.rc7,
    aspectsByType: classify.aspects.byType,
    rc6FindsTheSameAspects: classify.aspects.sameSet && classify.aspects.rc6 === classify.aspects.rc7,
    truths: {
      orbRate: 'the sign of d(orb)/dt = sign(|s| - A) * sign(s) * (vA - vB), s = wrap(lonA - lonB), from Swiss\'s speeds; |rate| < 1e-9 set aside',
      motion: 'orb(t + 1 s) < orb(t - 1 s), from Swiss\'s positions at t ± 1 s; set aside when exactness falls inside the stencil',
    },
    rc7: {
      orbRate: tally(classify.rc7.T1),
      motion: tally(classify.rc7.T2),
      stationary: classify.rc7.stationary,
      flaggedApplying: classify.rc7.applyingCount,
    },
    setAside: {
      orbRate: classify.T1setAside,
      motion: classify.T2setAside,
      motionCases: scanSetAside.map((r) => ({ utc: r.utc, pair: pair(r.a, r.b), aspect: r.type, rc7: r.rc7Motion, why: 'exact within the ±1 s stencil' })),
    },
    truthsDisagree: classify.truthsDisagree,
    subsets: Object.fromEntries(Object.entries(classify.subsets)
      .map(([name, v]) => [name, { aspects: v.aspects, rc7Misclassified: v.rc7MisT1, rc6Misclassified: v.rc6MisT1 }])),
    rc6Control: {
      what: 'the vendored rc.6 findAspects (0.02-day step) on the same positions',
      orbRate: tally(classify.rc6.T1),
      motion: tally(classify.rc6.T2),
      latestErrorMinutesBeforeExact: classify.rc6.maxMinutesToExactT1,
      errorsWithoutTheMoon: classify.rc6.nonMoonT1,
    },
  },
  sweeps: {
    engineTest: {
      what: 'the engine\'s own seeded sweep (aspects.test.ts): 400,000 pairs, linear-motion truth',
      cases: S1.cases, rc7Misclassified: S1.rc7Misclassified, rc7FalsePositives: S1.rc7FalsePositives,
      steppedRuleMisclassified: S1.steppedRuleMisclassified, rc6Misclassified: S1.rc6FindAspectsMisclassified,
    },
    planners: {
      what: 'the Phase 1 planners\' sweep: 400,000 cases, luminary orbs, 1 % tiny orbs, fast and slow speeds',
      cases: S2.cases, rc7AspectMotionMisclassified: S2.rc7AspectMotionMisclassified,
      rc7FindAspectsMisclassified: S2.rc7FindAspectsMisclassified, rc7FalsePositives: S2.rc7FalsePositives,
      rc6Misclassified: S2.rc6FindAspectsMisclassified, ties: S2.ties, skipped: S2.skippedNoMatch + S2.skippedExact,
    },
    auditVerifier: {
      what: 'the audit verifier\'s sweep: a Moon–Sun conjunction 0.5 to 30 minutes before exact, and Jupiter–Saturn 10 minutes before',
      cases: auditSweep.cases, rc7Misclassified: auditSweep.rc7Misclassified, rc6Misclassified: auditSweep.rc6Misclassified,
    },
    timeToExact: {
      what: 'every aspect, four pairs (fast, slow, one retrograde, both retrograde), 0.001 to 60 minutes either side of exact, across the 0/360 seam and away from it',
      cases: dense.cases, rc7Misclassified: dense.rc7Misclassified, rc7FalsePositives: dense.rc7FalsePositives,
      rc6Misclassified: dense.rc6Misclassified, rc6FalsePositives: dense.rc6FalsePositives,
      rc6LatestErrorMinutesBeforeExact: dense.rc6WorstMinutes,
    },
    wrapAndRetrograde: {
      what: '200,000 pairs within 15° of 0°, every mix of direct, retrograde and stationary bodies, oppositions across ±180°',
      cases: S3.cases, rc7Misclassified: S3.rc7Misclassified, rc7FalsePositives: S3.rc7FalsePositives,
      rc6Misclassified: S3.rc6Misclassified, zeroRelativeSpeed: S3.stationaryExpected,
      zeroRelativeSpeedStationaryAndNotApplying: S3.stationaryGot, rawDifferenceWraps: S3.seamCrossings,
      oppositions: S3.oppositionWrapCases, byMotion: S3.byCombo,
    },
  },
  namedCases: {
    what: 'wrap and retrograde cases written out in s12/synthetic.mjs, each expectation also re-derived from linear motion',
    cases: named.length,
    passed: named.filter((c) => c.pass).length,
    bySource: Object.fromEntries([...new Set(named.map((c) => c.source))].map((source) => {
      const mine = named.filter((c) => c.source === source);
      return [source, { cases: mine.length, passed: mine.filter((c) => c.pass).length }];
    })),
  },
  engineOwnPositions: {
    what: 'the same scan on the engine\'s own positions through computeChart, judged by the orb\'s motion in its own longitudes over ±1 s; no Swiss input',
    every30Minutes: {
      instants: own.instants, aspects: own.aspects, judged: own.judged, setAside: own.setAside,
      setAsideCases: ownSetAside.map((r) => ({ utc: r.utc, pair: pair(r.a, r.b), aspect: r.type, secondsFromExact: sig(r.secondsFromExact, 2), rc7: r.motion })),
      rc7Misclassified: own.rc7.misclassified, rc7FalsePositives: own.rc7.falsePositives, stationary: own.stationary,
      rc6StepOnRc7SpeedsMisclassified: own.rc6FlagOnRc7Speeds.misclassified,
      natalChartChecked: own.natalChartChecked, natalChartMismatches: own.natalChartMismatches,
    },
    every10Minutes: {
      instants: scan10.instants, aspects: scan10.aspects,
      closedForm: { judged: scan10.closedForm.judged, rc7Misclassified: scan10.closedForm.rc7Mis, rc7FalsePositives: scan10.closedForm.rc7FP, stationarySkipped: scan10.closedForm.stationarySkipped, rc6StepMisclassified: scan10.closedForm.rc6FlagMis },
      motion: { judged: scan10.realMotion.judged, rc7Misclassified: scan10.realMotion.rc7Mis, rc7FalsePositives: scan10.realMotion.rc7FP, setAside: scan10.realMotion.setAside },
    },
  },
};

// ---------------------------------------------------------------------------------- step 1.3
const V13 = json('s13', 'verdict-13.json');
const SG = json('s13', 'swiss-grids.json');
const EG = json('s13', 'engine-grids.json');
const R6 = json('s13', 'rc6-control.json');
const JS = json('s13', 'crosscheck-js.json');
const XV = json('s13', 'extra-vectors-cusps.json');
const SP = json('s13', 'sidt-window-probe.json');
const E2E = json('s19', 'endtoend.json');
const LG = json('s19', 'ladder-gains.json');
const A = V13.a_vsSwiss;
const B = V13.b_vsERFA;
const vectors = V13.c_extraVectors;
const arbiterRebuilt = raw('s13', 'erfa-rebuild', 'angle-grid-erfa.json');
const arbiterCommitted = readFileSync(join(CORPORA, 'angle-grid-erfa.json'));
const same = (js, py) => js.n === py.n && js.p50 === py.p50 && js.p95 === py.p95 && js.max === py.max;

const SCHEMES = {
  rule_5arcsec_vsSwiss: ['asFirstWritten', 'As first written: 5″ against Swiss at every vector.'],
  A1_8at66_ERFAoutside1850_2050: ['underA1', 'A1 as adopted: 5″ at 63° and 65°, 8″ at 66°; against Swiss from 1850-01-01 0h UT up to 2050-01-01 0h UT, against ERFA outside.'],
  A1narrow_8at66_ERFAoutsideOnlyAt66: ['A1AtSixtySixOnly', 'A1\'s gates, with ERFA replacing Swiss outside the window at 66° only.'],
  vsERFA_everywhere_5: ['erfaEverywhere5', 'ERFA at every vector, 5″.'],
  vsERFA_everywhere_A1gates: ['erfaEverywhereA1Gates', 'ERFA at every vector, A1\'s gates.'],
};
const exceedingGroups = (fails) => {
  const groups = new Map();
  for (const f of fails) {
    const key = `${Math.abs(f.lat)}|${f.insideSwissSidtWindow ? 0 : 1}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, g]) => ({
    latitude: `±${Math.abs(g[0].lat)}`,
    swissSiderealTime: g[0].insideSwissSidtWindow ? 'inside 1850-01-01..2050-01-01' : 'outside 1850-01-01..2050-01-01',
    judgedAgainst: g[0].oracle,
    gateArcsec: g[0].gate,
    cases: g.length,
    years: unique(g.map((f) => Number(f.utc.slice(0, 4)))),
    engineMinusSwissAbs: range(g.map((f) => Math.abs(f.engMinusSwiss))),
    engineMinusErfaAbsMax: Math.max(...g.map((f) => Math.abs(f.engMinusErfa))),
    swissMinusErfaAbs: range(g.map((f) => Math.abs(f.swissMinusErfa))),
  }));
};
const decomposition = (f) => ({
  utc: f.utc, lat: f.lat,
  engineMinusSwiss: f.engMinusSwiss, engineMinusErfa: f.engMinusErfa, swissMinusErfa: f.swissMinusErfa,
  ascGainPerArcsecOfRamc: f.gainR, ascGainPerArcsecOfObliquity: f.gainEps,
  engineMinusErfaInputs: {
    ramc: f.eng.dR, trueObliquity: f.eng.dEps, ascFromRamc: f.eng.ascFromR, ascFromObliquity: f.eng.ascFromEps,
    nutationInLongitude: f.eng.dDpsi, nutationInObliquity: f.eng.dDeps,
    equationOfEquinoxesComplementaryTerms: f.eng.eeComplementary, gmst: f.eng.dGmst,
  },
  swissMinusErfaInputs: {
    ramc: f.swiss.dR, trueObliquity: f.swiss.dEps, ascFromRamc: f.swiss.ascFromR, ascFromObliquity: f.swiss.ascFromEps,
    ramcFromTheClocks: f.swiss.dR_clockShare,
  },
  mc: { engineMinusSwiss: f.mc.engMinusSwiss, engineMinusErfa: f.mc.engMinusErfa },
  intermediateCuspsEngineMinusSwissMax: f.placidusIntermediateCusps_engMinusSwiss_max,
});
const vectorSet = (v, detail) => ({
  cases: v.n,
  maxAbs: { engineMinusSwiss: v.maxAbs.engVsSwiss, engineMinusErfa: v.maxAbs.engVsErfa, swissMinusErfa: v.maxAbs.swissVsErfa },
  ...(detail ? { byLatitude: v.byLatitude } : {}),
  gates: Object.fromEntries(Object.entries(SCHEMES).map(([key, [name, what]]) => [name, {
    ...(detail ? { what } : {}),
    cases: v[key].n,
    exceeding: v[key].exceed,
    ...(detail ? { perLatitude: v[key].perLatitude } : {}),
    exceedingByGroup: exceedingGroups(v[key].exceeding),
  }])),
});
const gridA = vectors.gridA_63_65_66_all17epochs;
const insideCases = gridA.rule_5arcsec_vsSwiss.exceeding.filter((f) => f.insideSwissSidtWindow);
const gates13 = [
  { gate: 'Against Swiss houses_ex: ASC p95 ≤ 3″', measured: A.asc.p95, measuredSiteQuantile: A.asc.p95_site, limit: 3, pass: A.gates.p95_le_3 },
  { gate: 'Against Swiss houses_ex: ASC max ≤ 75″', measured: A.asc.max, limit: 75, pass: A.gates.max_le_75 },
  { gate: 'Against the ERFA arbiter: ASC max ≤ 8″', measured: B.asc.max, limit: 8, pass: B.gates.max_le_8 },
  { gate: 'Against the ERFA arbiter, |lat| ≤ 45: ASC max ≤ 0.5″', measured: B.asc_lat_le45.max, limit: 0.5, pass: B.gates.lat_le45_max_le_0_5 },
  { gate: 'Added vectors at ±63, ±65 and ±66°: 5″ against Swiss', exceeding: gridA.rule_5arcsec_vsSwiss.exceed, of: gridA.n, pass: gridA.rule_5arcsec_vsSwiss.exceed === 0 },
];
const gateA1 = {
  gate: 'Amendment A1: added vectors 5″ at 63° and 65°, 8″ at 66°; Swiss from 1850-01-01 0h UT up to 2050-01-01 0h UT, ERFA outside',
  exceeding: gridA.A1_8at66_ERFAoutside1850_2050.exceed, of: gridA.n, pass: gridA.A1_8at66_ERFAoutside1850_2050.exceed === 0,
};
const epochs = Object.fromEntries(Object.entries(V13.perEpoch).map(([year, e]) => [year, {
  insideSwissSiderealWindow: e.inside,
  swissMinusErfaRamc: e.swissMinusErfaRamc, engineMinusErfaRamc: e.engineMinusErfaRamc,
  swissMinusErfaTrueObliquity: e.swissMinusErfaEps, engineMinusErfaTrueObliquity: e.engineMinusErfaEps,
}]));
const renameCusps = (o) => ({
  engineMinusSwissAsc: o.engSwiss_asc, engineMinusSwissIntermediate: o.engSwiss_inter,
  engineMinusErfaInputsAsc: o.engErfa_asc, engineMinusErfaInputsIntermediate: o.engErfa_inter,
  swissMinusErfaInputsAsc: o.swissErfa_asc, swissMinusErfaInputsIntermediate: o.swissErfa_inter,
});
const inputs13 = B.engineInputs;

const step13 = {
  step: '1.3',
  title: 'True obliquity for angles and Placidus',
  rule: 'Version 1, rule 1b: 3,128-case grid vs Swiss houses_ex: ASC p95 ≤ 3″, max ≤ 75″; vs the ERFA arbiter: max ≤ 8″, and ≤ 0.5″ for |lat| ≤ 45. The step also adds Swiss vectors at 63, 65 and 66° in both hemispheres with 5″ gates. Amendment A1 (adopted 2026-09-25) sets those gates to 5″ at 63° and 65° and 8″ at 66°, against Swiss from 1850-01-01 0h UT up to 2050-01-01 0h UT and against ERFA outside.',
  engine: EG.engineVersion,
  verdict: { asFirstWritten: verdictOf(gates13), underA1: verdictOf([...gates13.slice(0, 4), gateA1]) },
  gates: [...gates13, { ...gateA1, amendment: 'A1' }],
  note: NOTE,
  grid: {
    name: 'A of corpora/angle-grid-inputs.json',
    cases: EG.A.length,
    years: unique(EG.A.map((r) => Number(r.utc.slice(0, 4)))),
    latitudes: unique(EG.A.map((r) => r.lat)),
    hoursUtc: unique(EG.A.map((r) => Number(r.utc.slice(11, 13)))),
    path: 'site computeChart (src/lib/engine/full.ts) over @zodiacs/engine/internal computeChart; Placidus; time known',
    siteMinusPackageMismatches: EG.packageMismatches,
  },
  swissReadings: {
    kept: SG.summary.A.cases - SG.summary.A.discardedNonSwieph,
    discarded: SG.summary.A.discardedNonSwieph,
    returnFlags: { sun: SG.summary.A.flagsSun, moon: SG.summary.A.flagsMoon, eclNut: SG.summary.A.flagsEclNut },
    housesArmcReproducesHousesExArcsec: sig(SG.summary.A.maxArmcCheckArcsec, 2),
  },
  quantiles: 'p50 and p95 as the audit computed them, v[floor(p (n - 1))]; *_site as scripts/angles-grid.test.mjs, v[floor(p n)]; arcseconds',
  againstSwiss: {
    what: '|engine - Swiss 2.10.03 houses_ex|, UT taken as UTC',
    asc: A.asc,
    ascWorst: A.asc_worst,
    ascByLatitude: { upTo45: A.asc_lat_le45, from50To60: A.asc_lat_50_60, from63: A.asc_lat_ge63 },
    ascInsideSwissSiderealWindow: A.asc_inside1850_2050,
    ascOutsideSwissSiderealWindow: A.asc_outside1850_2050,
    mc: A.mc,
    mcWorst: A.mc_worst,
    placidusCuspsAll12: A.placidusCuspsAll12,
    placidusIntermediateCusps: A.placidusIntermediateCusps,
    swissMinusErfa: {
      asc: A.swissMinusErfa_asc,
      ramcInsideWindow: A.swissMinusErfa_ramc_inside,
      ramcOutsideWindow: A.swissMinusErfa_ramc_outside,
      trueObliquity: A.swissMinusErfa_eps,
    },
  },
  againstErfa: {
    what: '|engine - the committed ERFA arbiter| (corpora/angle-grid-erfa.json, rebuilt byte for byte from its tools)',
    asc: B.asc,
    ascWorst: B.asc_worst,
    ascUpTo45: B.asc_lat_le45,
    ascUpTo45Worst: B.asc_lat_le45_worst,
    mc: B.mc,
    mcWorst: B.mc_worst,
    ascFormulaOnEngineInputsMaxArcsec: sig(B.formulaGapMaxArcsec, 2),
    engineInputsMinusErfa: {
      ramc: inputs13.dR, trueObliquity: inputs13.dEps, nutationInLongitude: inputs13.dDpsi, nutationInObliquity: inputs13.dDeps,
      equationOfEquinoxesComplementaryTerms: inputs13.eeComplementary, gmst: inputs13.dGmst, meanObliquity: inputs13.dMobl,
    },
    arbiterRebuild: { byteIdentical: Buffer.compare(arbiterRebuilt, arbiterCommitted) === 0, sha256: sha256(arbiterRebuilt) },
  },
  addedVectors: {
    what: 'grid A\'s cases at ±63, ±65 and ±66° (17 epochs × 8 hours × 6 latitudes), and the 1800/1950/2200 subset the ledger named',
    gridA: vectorSet(gridA, true),
    insideWindowCase: insideCases.map(decomposition),
    ledgerYears: vectorSet(vectors.ledger_1800_1950_2200, false),
    mcAndIntermediateCusps: XV,
  },
  byEpoch: epochs,
  swissSiderealTimeSwitch: {
    what: 'jump in swe.sidtime minus ERFA gst06a (UT1 taken as UTC, Swiss ΔT for TT) across each switch, arcseconds of RA',
    at18500101: SP.jump1850,
    at20500101: SP.jump2050,
  },
  placidusCuspsEndToEnd: renameCusps(E2E.A.overall),
  ascGainsByLatitude: LG.A,
  rc6Control: {
    what: 'the vendored rc.6 on the same Swiss readings: the preregistered baseline',
    ascAgainstSwiss: R6.gridA.ascVsSwiss,
    ascWorst: { utc: R6.gridA.worst.utc, lat: R6.gridA.worst.lat, value: R6.gridA.worst.d },
    mcAgainstSwiss: R6.gridA.mcVsSwiss,
  },
  javascriptRecount: {
    agreesWithPython: same(JS.ascVsSwiss, A.asc) && same(JS.mcVsSwiss, A.mc) && same(JS.ascVsErfa, B.asc)
      && same(JS.ascVsErfaLat45, B.asc_lat_le45) && same(JS.mcVsErfa, B.mc)
      && JS.extraVectors.exceed5VsSwiss === gridA.rule_5arcsec_vsSwiss.exceed
      && JS.extraVectors.exceedA1 === gridA.A1_8at66_ERFAoutside1850_2050.exceed,
  },
  siteTest: siteTest('1b'),
};

// ---------------------------------------------------------------------------------- step 1.9
const V19 = json('s19', 'verdict-19.json');
const SL = SG.summary.L;
const engineRefused = EG.L.filter((r) => r.flags.includes('polar-fallback')).map((r) => `${r.utc} ${r.lat}`);
check(JSON.stringify([...engineRefused].sort()) === JSON.stringify([...V19.swiss.refusedCases].sort()), 'the engine refuses where Swiss refuses');
const gates19 = [
  { gate: 'Status agrees with Swiss, end to end through the site\'s computeChart', agree: V19.status.endToEnd_agree, of: V19.cases },
  { gate: 'Status agrees with Swiss, on Swiss\'s own ARMC and true obliquity', agree: V19.status.onSwissInputs_agree, of: V19.cases },
].map((g) => ({ ...g, pass: g.agree === g.of }));
gates19.push({ gate: 'Placidus cusps ≤ 0.02″ given Swiss\'s inputs', measured: sig(V19.cuspsOnSwissInputs.maxAll12Arcsec), limit: 0.02, pass: V19.cuspsOnSwissInputs.gate_le_0_02 });
const c19 = V19.cuspsOnSwissInputs;
const e19 = V19.endToEndForInformation;

const step19 = {
  step: '1.9',
  title: 'Placidus polar limit',
  rule: 'Version 1, rule 1h: on the 336-case 66.05–66.55 ladder, status agrees with Swiss 336/336; cusps ≤ 0.02″ given Swiss inputs.',
  engine: V19.engine,
  verdict: verdictOf(gates19),
  gates: gates19,
  note: NOTE,
  ladder: {
    name: 'L of corpora/angle-grid-inputs.json',
    cases: EG.L.length,
    latitudes: unique(EG.L.map((r) => r.lat)),
    dates: [...new Set(EG.L.map((r) => day(r.utc)))].sort(),
    hoursUtc: unique(EG.L.map((r) => Number(r.utc.slice(11, 13)))),
    longitudes: unique(EG.L.map((r) => r.lon)),
  },
  swissReadings: {
    kept: SL.cases - SL.discardedNonSwieph,
    discarded: SL.discardedNonSwieph,
    returnFlags: { sun: SL.flagsSun, moon: SL.flagsMoon, eclNut: SL.flagsEclNut },
    housesArmcReproducesHousesExArcsec: sig(SL.maxArmcCheckArcsec, 2),
    computes: V19.swiss.computes,
    refuses: V19.swiss.refuses,
    howPyswissephRefuses: SL.errors,
    cLibraryUnderneath: { returnCodes: SL.cReturnCodes, message: SL.cSerr, filledCuspsMinusHousesExPorphyryMaxArcsec: SL.maxCVsPorphyryArcsec },
    pyswissephAndCLibraryAgree: SL.statusVsCrcAgree,
    refusesExactlyWhereLatitudeReaches90MinusItsTrueObliquity: V19.status.swissRefusedExactlyWhereLatAtOrBeyond90MinusEpsSwiss,
  },
  refusedCases: { byEngineSwissAndErfaAlike: engineRefused.length, cases: engineRefused },
  status: {
    endToEndAgree: V19.status.endToEnd_agree,
    engineComputesEndToEnd: V19.status.endToEnd_engineComputes,
    onSwissInputsAgree: V19.status.onSwissInputs_agree,
    erfaLimitAgreesWithSwiss: V19.status.erfaLimit_agreeWithSwiss,
    computeHousesFellBackToWholeSign: V19.status.fellBackOnSwissInputs_whole,
    placidusPolarFallback: V19.placidusPolarFallback,
    closestCaseToItsLimitDeg: {
      engine: fixed(V19.status.minAbsMarginDeg.engine, 5),
      swiss: fixed(V19.status.minAbsMarginDeg.swiss, 5),
      erfa: fixed(V19.status.minAbsMarginDeg.erfa, 5),
    },
  },
  cuspsOnSwissInputs: {
    what: 'placidusCusps (@zodiacs/engine/internal/math) on Swiss\'s ARMC and ECL_NUT true obliquity, against Swiss\'s houses_ex cusps; |difference| in arcseconds',
    cases: c19.n,
    maxAll12: sig(c19.maxAll12Arcsec),
    worst: { utc: c19.worstAll12.utc, lat: c19.worstAll12.lat, value: sig(c19.worstAll12.value) },
    maxIntermediate: sig(c19.maxIntermediateArcsec),
    maxAsc: sig(c19.maxAscArcsec, 2),
    maxMc: sig(c19.maxMcArcsec, 2),
  },
  endToEndForInformation: {
    what: 'the site\'s computeChart against Swiss\'s houses_ex; not part of the rule; |difference| in arcseconds',
    cases: e19.n,
    maxCusp: fixed(e19.maxCuspArcsec, 3),
    worst: { utc: e19.worstCusp.utc, lat: e19.worstCusp.lat, value: fixed(e19.worstCusp.value, 3) },
    maxIntermediate: fixed(e19.maxIntermediateArcsec, 3),
    maxAsc: fixed(e19.maxAscArcsec, 3),
    maxRamc: fixed(e19.maxDRamcArcsec, 4),
    maxTrueObliquity: fixed(e19.maxDEpsArcsec, 4),
    byLatitude: e19.byLatitude,
    byEpochAgainstErfaInputs: Object.fromEntries(Object.entries(E2E.L.byYear).map(([year, v]) => [year, { cases: v.n, ...renameCusps(v) }])),
    ascGainsByLatitude: LG.L,
  },
  refusedCasesForInformation: {
    cases: V19.refusedCasesForInformation.n,
    enginePorphyryOnSwissInputsMinusSwissSubstituteMaxArcsec: sig(V19.refusedCasesForInformation.porphyryOnSwissInputsVsSwissSubstituteMaxArcsec, 2),
    engineWholeSignMinusSwissPorphyryMaxDeg: sig(V19.refusedCasesForInformation.engineWholeSignVsSwissPorphyryMaxDeg),
  },
  rc6Control: { what: 'the vendored rc.6 on the ladder: the preregistered baseline', cases: R6.ladder.cases, refused: R6.ladder.refused },
  siteTest: siteTest('1h'),
};

// ---------------------------------------------------------------------------------- step 1.8
const ME = json('s18', 'moon-engine.json');
const MS = json('s18', 'moon-swiss.json');
const MR = json('s18', 'moon-results.json');
const AP = json('s18', 'apsides-swiss.json').summary;
const RB = json('s18', 'rc6-baseline.json');
const SR = json('s18', 'state-route.json');
const SD = json('s18', 'self-derivative.json');
const AR = json('s18', 'arbiter-results.json');
const MA = json('s18', 'moon-arbiter.json');
const SS = json('s18', 'stations-swiss.json').summary;
const ST = json('s18', 'stations-results.json');
const FH = json('s18', 'flags-hourly-results.json');
const FE = json('s18', 'flags-hourly-engine.json');
const probe = raw('s18', 'probe', 'swiss-self-probe.log').toString('utf8');
const SETS = ['a3', 'swissApsides'];

// A sample around an apsis Swiss found is named by the apsis's kind, its UTC date and the
// offset; A3's samples come from astronomy-engine's own apsides and keep their instants.
const apsisDate = new Map(ME.samples.filter((s) => s.set === 'swissApsides' && s.offsetHours === 0).map((s) => [s.anchor, day(s.utc)]));
const sampleAt = Object.fromEntries(SETS.map((set) => [set, new Map(ME.samples.filter((s) => s.set === set).map((s) => [s.utc, s]))]));
const where = (set, r) => (set === 'swissApsides'
  ? { apsis: r.group, date: apsisDate.get(r.anchor), offsetHours: r.offsetHours }
  : { apsis: r.group, anchor: r.anchor, offsetHours: r.offsetHours, utc: r.utc });
const moonStat = (set, s) => ({ n: s.n, p50: s.p50, p95: s.p95, max: s.max, over1: s.over1, over1_5: s.over1_5, worst: { ...where(set, s.worst), value: s.worst.value } });
const moonSet = (set) => {
  const b = MR.sets[set];
  return {
    residual: moonStat(set, b.all.residual),
    residualSameUT: moonStat(set, b.all.residualUT),
    atTheApsisItself: { residual: moonStat(set, b.atApsisInstantOnly.residual), residualSameUT: moonStat(set, b.atApsisInstantOnly.residualUT) },
    byGroup: Object.fromEntries(Object.entries(b.byGroup).map(([group, v]) => [group, { residual: moonStat(set, v.residual), residualSameUT: moonStat(set, v.residualUT) }])),
    split: { method: moonStat(set, b.all.method), series: moonStat(set, b.all.series), swissSelf: moonStat(set, b.all.swissSelf), maxAbsDecompositionError: b.maxAbsDecompositionError },
    signedMeanResidual: b.signedMeanResidual,
    samplesOver1: b.samplesOver1.map((r) => ({ ...where(set, r), residual: r.residual, residualSameUT: r.residualUT, series: r.series, method: r.method })),
  };
};
const flaggedIndex = MS.rows.reduce((best, r, i) => (r && (best < 0 || Math.abs(r.cdTT - r.speedTT) > Math.abs(MS.rows[best].cdTT - MS.rows[best].speedTT)) ? i : best), -1);
const flagged = ME.samples[flaggedIndex];
const secondDifferences = JSON.parse(/second differences \(mas\) on a 10 s grid: (\[.*\])/u.exec(probe)[1]);
const probeFlags = Object.fromEntries([...probe.matchAll(/^(\w+) cd - analytic = (-?[\d.]+)/gmu)].map((m) => [m[1], Number(m[2])]));
const flips = Object.fromEntries(FE.bodies.map((b) => [b, 0]));
FE.rows.forEach((row, i) => { if (i) row.retro.forEach((r, k) => { if (r !== FE.rows[i - 1].retro[k]) flips[FE.bodies[k]] += 1; }); });
const stationKey = (r) => `${r.body}|${r.kind}|${day(r.swissStationUtcByEngineClock)}`;
const stationRows = new Map(ST.rows.map((r) => [stationKey(r), r]));
const AUDIT_STATIONS = [['Mercury', 'retrograde-station', '2024-04-01'], ['Mars', 'retrograde-station', '2024-12-06'], ['Venus', 'retrograde-station', '2025-03-02']];
// The ±60 to ±5 minute ladder on each clock, without Swiss's speeds; UT is written out only if it differs.
const flagsCloser = () => {
  const ladder = (clock) => Object.fromEntries(Object.entries(ST.ladder[clock]).map(([minutes, v]) => [minutes, {
    flags: v.flags, agree: v.agree, disagreements: v.disagreements.map((d) => ({ body: d.body, station: d.kind, side: d.side })),
  }]));
  const tt = ladder('TT');
  const ut = ladder('UT');
  return { sameTT: tt, sameUT: JSON.stringify(ut) === JSON.stringify(tt) ? 'the same as sameTT, case for case' : ut };
};

const moonOver1 = SETS.reduce((t, set) => t + MR.sets[set].all.residual.over1, 0);
const moonOver15 = SETS.reduce((t, set) => t + MR.sets[set].all.residual.over1_5 + MR.sets[set].all.residualUT.over1_5, 0);
const gates18 = [
  { gate: 'Moon speed vs Swiss ≤ 1″/day at perigee and apogee', measured: MR.sets.a3.all.residual.max, over: MR.sets.a3.all.residual.over1, of: MR.sets.a3.all.residual.n, limit: 1, pass: moonOver1 === 0 },
  { gate: 'Station-flag agreement at ±1 h', agree: ST.rule_pm1h.TT.agree, of: ST.rule_pm1h.TT.flags, agreeSameUT: ST.rule_pm1h.UT.agree, pass: ST.rule_pm1h.TT.agree === ST.rule_pm1h.TT.flags && ST.rule_pm1h.UT.agree === ST.rule_pm1h.UT.flags },
];
const gateA3 = {
  gate: 'Amendment A3: Moon speed vs Swiss ≤ 1.5″/day at perigee and apogee, the speed being the derivative of the reported longitude',
  measured: Math.max(...SETS.flatMap((set) => [MR.sets[set].all.residual.max, MR.sets[set].all.residualUT.max])),
  limit: 1.5,
  pass: moonOver15 === 0,
  amendment: 'A3',
};

const step18 = {
  step: '1.8',
  title: 'Speeds',
  rule: 'Version 1, rule 1g: Moon speed vs Swiss ≤ 1″/day at perigee and apogee; station-flag agreement at ±1 h. Amendment A3 (adopted 2026-09-25): ≤ 1.5″/day, and "the derivative of the reported longitude" in place of "state vectors".',
  engine: ME.engine,
  verdict: { asFirstWritten: verdictOf(gates18), underA3: verdictOf([gateA3, gates18[1]]) },
  gates: [...gates18, gateA3],
  note: NOTE,
  moonSpeed: {
    samples: {
      a3: { what: 'A3\'s own instants: astronomy-engine SearchLunarApsis from 2024-01-01T00Z to 2027-01-01T00Z, each apsis at 0, ±6 and ±12 h UTC, plus 2024-10-15T00Z to 2024-10-19T00Z every 6 h', apsides: ME.a3Apsides.length, samples: MR.sets.a3.all.residual.n },
      swissApsides: { what: 'apsides chosen independently: sign changes of Swiss\'s geocentric distance rate on a 0.25-day TT grid, bisected, each at 0, ±6 and ±12 h TT', apsides: AP.apsides, perigees: AP.perigees, apogees: AP.apogees, samples: MR.sets.swissApsides.all.residual.n },
    },
    swissCalls: { apsides: AP.calls, apsidesAllSWIEPHandSPEED: AP.allSWIEPH, speeds: MS.calls, samplesDiscarded: MS.discarded },
    rootApiSpotChecks: ME.rootChecked,
    definitions: {
      unit: MR.unit,
      residual: 'chart speed (computeChart) minus Swiss FLG_SPEED at the engine\'s own TT: the rule\'s comparison',
      residualSameUT: 'the same with Swiss at the same UT (Swiss\'s ΔT)',
      method: 'chart speed minus a ±1e-4-day difference of the engine\'s own longitude',
      series: 'rate of (engine longitude minus Swiss longitude) over ±0.001 day',
      swissSelf: 'Swiss\'s own ±0.001-day longitude difference minus its analytic speed; residual = series + swissSelf',
    },
    bySet: Object.fromEntries(SETS.map((set) => [set, moonSet(set)])),
    rc6Baseline: { what: 'rc.6\'s ±0.25-day difference of the same longitude, against Swiss at the engine\'s TT', ...RB },
    stateVectorRoute: { what: 'GeoMoonState velocity rotated to the ecliptic of date, with and without the frame rate, against Swiss at the engine\'s TT; shipped = the chart speed', ...SR },
    arbiter: {
      what: 'the DE440s kernel (jplephem) rotated with ERFA pnm06a and obl06 + nut06a Δε; rates over ±0.001 day at the engine\'s TT (TDB taken as TT)',
      kernel: basename(MA.kernel), pyerfa: MA.pyerfa, jplephem: MA.jplephem, numpy: MA.numpy,
      bySet: Object.fromEntries(SETS.map((set) => {
        const b = AR.sets[set];
        const w = b.atWorstEngineVsSwiss;
        return [set, {
          engineMinusKernel: b.engineVsKernel,
          swissApparentMinusKernelWithLightTime: b.swissApparentVsKernelLt,
          swissTrueposMinusKernel: b.swissTrueposVsKernel,
          engineMinusSwiss: b.engineVsSwiss,
          atWorstEngineMinusSwiss: {
            ...where(set, { ...w, anchor: sampleAt[set].get(w.utc).anchor }),
            engineMinusKernel: w.engineVsKernel, swissApparentMinusKernelWithLightTime: w.swissApparentVsKernelLt,
            swissTrueposMinusKernel: w.swissTrueposVsKernel, engineMinusSwiss: w.engineVsSwiss,
          },
        }];
      })),
    },
    instrument: {
      what: 'Swiss\'s apparent Moon at the sample where its own ±0.001-day longitude difference departs most from its analytic speed',
      sample: where(flagged.set, flagged),
      maxAbsSecondDifferenceOnA10sGridMas: Math.max(...secondDifferences.map(Math.abs)),
      differenceMinusAnalyticSpeed: probeFlags,
    },
  },
  selfDerivative: {
    what: 'chart speed minus a ±1e-4-day difference of the engine\'s own reported longitude, every 6 h of 2024–2026, ten bodies; no Swiss input',
    instants: SD.instants,
    bodyInstants: SD.instants * Object.keys(SD.maxAbsChartSpeedMinusDerivative).length,
    retrogradeFlagNotSignOfSpeed: SD.retrogradeFlagNotSignOfSpeed,
    unit: SD.unit,
    maxAbs: SD.maxAbsChartSpeedMinusDerivative,
  },
  stations: {
    swiss: {
      what: 'sign changes of Swiss\'s longitude speed for Mercury to Pluto, 2024–2026: 1-day grid and 60 bisections, in TT and in UT; every call SWIEPH|SPEED or the run stops',
      stations: SS.stations, byBody: SS.byBody, calls: SS.calls, allCallsSWIEPHandSPEED: SS.allSWIEPH,
    },
    flagsAnHourEitherSide: { sameTT: ST.rule_pm1h.TT, sameUT: ST.rule_pm1h.UT },
    flagsCloser: flagsCloser(),
    chartStationMinusSwissMinutes: {
      what: 'the chart speed\'s own sign change, bisected, minus Swiss\'s, on the engine\'s clock pinned to Swiss\'s TT',
      medianAbs: ST.stationOffsetMinutes.median,
      maxAbs: ST.stationOffsetMinutes.max,
      maxAbsByBody: ST.stationOffsetMinutes.maxByBody,
      worst: ST.stationOffsetMinutes.worst.map((r) => ({ body: r.body, station: r.kind, date: day(r.swissStationUtcByEngineClock), minutes: r.engineMinusSwissMinutes })),
      namedByTheAudit: AUDIT_STATIONS.map(([body, kind, date]) => ({ body, station: kind, date, minutes: stationRows.get(`${body}|${kind}|${date}`).engineMinusSwissMinutes })),
    },
    saturnNatalDirection: ST.saturnNatalDirection,
    hourly: {
      what: 'the chart\'s retrograde flag every hour of 2024–2026 for Mercury to Pluto, against the sign of Swiss\'s speed at the engine\'s TT',
      instants: FH.instants,
      flags: FH.flags,
      discarded: FH.discarded,
      moreThanAnHourFromAStation: { flags: FH.outsideOneHour.flags, agree: FH.outsideOneHour.agree },
      withinAnHourOfAStation: {
        flags: FH.withinOneHour.flags,
        agree: FH.withinOneHour.agree,
        disagreements: FH.withinOneHour.disagreements.map((d) => ({ body: d.body, date: day(d.utc), chartRetrograde: d.engineRetrograde })),
      },
      chartFlagChanges: { total: Object.values(flips).reduce((t, n) => t + n, 0), byBody: flips, sameAsSwissStationsByBody: FE.bodies.every((b) => flips[b] === SS.byBody[b]) },
    },
  },
};

// ---------------------------------------------------------------------------------- provenance
const PN = json('env', 'provenance-node.json');
const PP = json('env', 'provenance-py.json');
const statusBefore = raw('env', 'tree-status-before.txt');
const statusAfter = raw('env', 'tree-status-after.txt');
const file = ([path, start, end, denum]) => ({ file: basename(path), jdStart: start, jdEnd: end, jplEphemeris: denum });
const REL_CORPUS = 'docs/platform/evidence/engine-beyond-swiss/corpora/angle-grid-inputs.json';
const reading = (rel, tool, portable) => {
  const bytes = raw(...rel.split('/'));
  const entry = { tool, bytes: bytes.length, sha256: sha256(bytes) };
  if (portable) {
    const recorded = portable.get(JSON.parse(bytes.toString('utf8')));
    entry.records = portable.what;
    entry.portableSha256 = sha256(bytes.toString('utf8').split(JSON.stringify(recorded)).join(JSON.stringify(portable.as(recorded))));
    entry.portableAs = portable.as(recorded);
  }
  return entry;
};
const corpusPath = { what: 'the corpus\'s absolute path (corpus.path)', get: (d) => d.corpus.path, as: () => REL_CORPUS };
const kernelPath = { what: 'the kernel\'s absolute path (kernel)', get: (d) => d.kernel, as: (p) => basename(p) };

const provenance = {
  what: 'Versions and digests for the Phase 1 verdict runs of steps 1.2, 1.3, 1.8 and 1.9. Swiss Ephemeris readings are named here by SHA-256 and are not committed.',
  siteTree: {
    head: PN.siteTree.head,
    headSubject: PN.siteTree.headSubject,
    measuredInputs: PN.siteTree.measuredInputs,
    measuredInputsMatchHead: PN.siteTree.measuredInputsMatchHead,
    gitStatusUnchangedByTheRun: Buffer.compare(statusBefore, statusAfter) === 0,
  },
  engine: {
    package: '@zodiacs/engine',
    packageVersion: PN.engine.packageVersion,
    ENGINE_VERSION: PN.engine.ENGINE_VERSION,
    vendorTarball: PN.engine.vendorTarball,
    vendorTarballSha256: PN.engine.vendorTarballSha256,
    vendorSha256File: PN.engine.vendorSha256File,
    engineRepoArtifactSha256: PN.engine.engineRepoArtifactSha256,
    installedDistEqualsTarball: PN.engine.nodeModulesDistEqualsTarball,
    distSha256: PN.engine.distSha256,
    placidusPolarFallback: PN.engine.placidusPolarFallback,
    houseSystems: PN.engine.houseSystems,
    receiptConventions: PN.engine.receiptConventions,
  },
  rc6Control: PN.rc6Control,
  sitePath: PN.sitePath,
  corpora: PN.corpora,
  node: {
    version: PN.node,
    vite: PN.vite,
    viteNode: PN.viteNode,
    vitest: PN.vitest,
    astronomyEngine: PN.astronomyEngine,
  },
  python: {
    version: PP.python,
    platform: PP.platform,
    pyswisseph: PP.pyswisseph,
    swissEphemeris: PP['swe.version'],
    swissSharedObjectSha256: PP.swissSo.sha256,
    pyerfa: PP.pyerfa,
    erfa: PP.erfa,
    numpy: PP.numpy,
    jplephem: PP.jplephem,
  },
  swissEphemerisFiles: {
    'sepl_18.se1': { sha256: PP.files['sepl_18.se1'], ...file(PP.get_current_file_data.planets) },
    'semo_18.se1': { sha256: PP.files['semo_18.se1'], ...file(PP.get_current_file_data.moon) },
    astroModels: PP.swe_get_astro_models.split('\n').map((line) => line.trim()).filter((line) => line && !/^(swetest|-amod|For list|\(swetest)/u.test(line)),
  },
  jplKernel: { file: basename(PP.jplKernel.path), sha256: PP.jplKernel.sha256 },
  swissReadings: {
    what: 'written under WORK by the tools named, never committed; a re-run that matches these digests read the same values',
    's12/swiss-2024.json': { ...reading('s12/swiss-2024.json', 's12/swiss_scan_2024.py'), audit: 'corpora/README.md names the audit\'s file by this digest' },
    's12/swiss-2024-pm1s.json': reading('s12/swiss-2024-pm1s.json', 's12/swiss_scan_2024.py'),
    's12/swiss-scan-summary.json': reading('s12/swiss-scan-summary.json', 's12/swiss_scan_2024.py'),
    's18/apsides-swiss.json': reading('s18/apsides-swiss.json', 's18/swiss_apsides.py'),
    's18/moon-swiss.json': reading('s18/moon-swiss.json', 's18/moon_swiss.py'),
    's18/moon-arbiter.json': reading('s18/moon-arbiter.json', 's18/arbiter_moon.py', kernelPath),
    's18/stations-swiss.json': reading('s18/stations-swiss.json', 's18/swiss_stations.py'),
    's18/flags-hourly-results.json': reading('s18/flags-hourly-results.json', 's18/flags_hourly_swiss.py'),
    's18/probe/swiss-self-probe.log': reading('s18/probe/swiss-self-probe.log', 's18/swiss_self_probe.py'),
    's13/swiss-grids.json': reading('s13/swiss-grids.json', 's13/swiss_grids.py', corpusPath),
    's13/sidt-window-probe.json': reading('s13/sidt-window-probe.json', 's13/sidt_window_probe.py'),
  },
  engineAndErfaDumps: {
    what: 'written under WORK, not committed (size, or samples anchored on Swiss\'s apsides)',
    's13/engine-grids.json': reading('s13/engine-grids.json', 's13/engine_grids.mjs', corpusPath),
    's13/erfa-rebuild/angle-clock.json': reading('s13/erfa-rebuild/angle-clock.json', 'corpora/tools/angle-clock.ts'),
    's19/erfa-inputs.json': reading('s19/erfa-inputs.json', 's19/erfa_inputs.py'),
    's18/moon-engine.json': reading('s18/moon-engine.json', 's18/moon_engine.mjs'),
    's18/flags-hourly-engine.json': reading('s18/flags-hourly-engine.json', 's18/flags_hourly_engine.mjs'),
  },
};

// JSON with one-space indents, where an array of plain values, or a short object of plain values,
// sits on one line.
const plain = (v) => v === null || typeof v !== 'object' || (Array.isArray(v) && v.every((x) => x === null || typeof x !== 'object'));
const pretty = (value, indent = '') => {
  const inner = `${indent} `;
  if (Array.isArray(value)) {
    if (value.every((x) => x === null || typeof x !== 'object')) return `[${value.map((x) => JSON.stringify(x)).join(', ')}]`;
    return `[\n${value.map((x) => inner + pretty(x, inner)).join(',\n')}\n${indent}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    const flat = `{${entries.map(([k, v]) => `${JSON.stringify(k)}: ${pretty(v)}`).join(', ')}}`;
    if (entries.every(([, v]) => plain(v)) && indent.length + flat.length <= 110) return flat;
    return `{\n${entries.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${pretty(v, inner)}`).join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
};

mkdirSync(RESULTS, { recursive: true });
const write = (name, value) => writeFileSync(join(RESULTS, name), `${pretty(value)}\n`);
write('step-1.2.json', step12);
write('step-1.3.json', step13);
write('step-1.8.json', step18);
write('step-1.9.json', step19);
write('provenance.json', provenance);
console.log(JSON.stringify({
  results: RESULTS,
  '1.2': step12.verdict,
  '1.3': step13.verdict,
  '1.8': step18.verdict,
  '1.9': step19.verdict,
}));
