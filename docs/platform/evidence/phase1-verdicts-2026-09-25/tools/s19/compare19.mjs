/*
 * Step 1.9 (brief v1 rule 1h) on the vendored @zodiacs/engine 0.1.1-rc.7: the 336-case ladder L
 * of angle-grid-inputs.json (±66.05, ±66.1, ±66.2, ±66.3, ±66.4, ±66.5, ±66.55; 21 June 1800,
 * 2000, 2200; every 3 h; longitude 0).
 *
 *   status: Swiss computes Placidus (houses_ex returns) or refuses (pyswisseph raises
 *           swisseph.Error; the C library returns -1, "within polar circle, switched to
 *           Porphyry", and fills Porphyry cusps) against the engine
 *           (a) end to end: the site computeChart's 'polar-fallback' flag, and
 *           (b) on Swiss's inputs: placidusCusps(ARMC, true obliquity) === null;
 *   cusps:  placidusCusps on Swiss's ARMC and true obliquity (@zodiacs/engine/internal/math)
 *           against Swiss's houses_ex cusps (gate 0.02"), and end to end for information;
 *   fallbacks, for information: the engine's whole sign vs Swiss's Porphyry substitute, and the
 *           engine's porphyryCusps on Swiss's inputs vs that substitute.
 *
 * Reads $WORK/s13/engine-grids.json and swiss-grids.json and the committed arbiter. Writes
 * $WORK/s19/verdict-19.json (statistics) and rows-19.json (per case: never committed), and
 * prints the verdict figures.
 *
 *   node tools/s19/compare19.mjs > $WORK/s19/compare19.log
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { SITE_ROOT, WORK, outDir } from '../lib/paths.mjs';

const O = WORK;
outDir('s19');
const TREE = SITE_ROOT;
const math = await import(`${TREE}/node_modules/@zodiacs/engine/dist/internal-math.js`);
if (math.ENGINE_VERSION !== '0.1.1-rc.7') throw new Error(math.ENGINE_VERSION);
const read = (p) => readFileSync(p);
const engBytes = read(`${O}/s13/engine-grids.json`);
const swBytes = read(`${O}/s13/swiss-grids.json`);
const arbBytes = read(`${TREE}/docs/platform/evidence/engine-beyond-swiss/corpora/angle-grid-erfa.json`);
const eng = JSON.parse(engBytes.toString('utf8')).L;
const sw = JSON.parse(swBytes.toString('utf8')).L;
const arb = JSON.parse(arbBytes.toString('utf8')).L;
if (eng.length !== 336 || sw.length !== 336 || arb.limitDegrees.length !== 336) throw new Error('counts');

const arcsec = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180) * 3600;
const INTERMEDIATE = [1, 2, 4, 5, 7, 8, 10, 11];
const maxOf = (xs) => xs.reduce((m, x) => Math.max(m, x), 0);

const rows = eng.map((e, i) => {
  const s = sw[i];
  if (s.utc !== e.utc || s.lat !== e.lat || s.lon !== e.lon) throw new Error(`row ${i}`);
  const swissRefused = s.status !== 0;
  if (swissRefused !== (s.c_rc !== 0)) throw new Error(`pyswisseph vs C status ${i}`);
  // Engine end to end (site computeChart): refused = polar-fallback, whole-sign houses.
  const engineRefused = e.flags.includes('polar-fallback');
  if (engineRefused !== (e.system === 'whole')) throw new Error(`flag/system ${i}`);
  // Engine on Swiss's inputs: ARMC and the true obliquity houses_ex used (houses_armc-confirmed).
  const input = { gastHours: s.armc / 15, latitude: s.lat, longitude: 0, obliquity: s.eps_true };
  const angles = math.computeAngles(input);
  const cusps = math.placidusCusps(input, angles);
  const houses = math.computeHouses('placidus', input, angles);
  const porphyry = math.porphyryCusps(angles);
  const row = {
    i, utc: e.utc, lat: e.lat, swissRefused, engineRefused, engineOnSwissInputsRefused: cusps === null,
    computeHousesOnSwissInputs: { system: houses.houses.system, fellBack: houses.fellBack, fallbackSystem: houses.fallbackSystem },
    erfaAllows: Math.abs(e.lat) < arb.limitDegrees[i],
    marginEngineDeg: 90 - e.tobl - Math.abs(e.lat),
    marginSwissDeg: 90 - s.eps_true - Math.abs(e.lat),
    marginErfaDeg: arb.limitDegrees[i] - Math.abs(e.lat),
  };
  if (!swissRefused) {
    row.ascOnSwissInputs = arcsec(angles.asc, s.ascmc[0]);
    row.mcOnSwissInputs = arcsec(angles.mc, s.ascmc[1]);
    if (cusps) {
      row.cuspsOnSwissInputs = maxOf(cusps.map((c, k) => arcsec(c, s.cusps[k])));
      row.intermediateOnSwissInputs = maxOf(INTERMEDIATE.map((k) => arcsec(cusps[k], s.cusps[k])));
    }
    if (!engineRefused) {
      row.cuspsEndToEnd = maxOf(e.cusps.map((c, k) => arcsec(c, s.cusps[k])));
      row.intermediateEndToEnd = maxOf(INTERMEDIATE.map((k) => arcsec(e.cusps[k], s.cusps[k])));
      row.ascEndToEnd = arcsec(e.asc, s.ascmc[0]);
      row.dRamcEndToEnd = arcsec(e.gastHours * 15 + e.lon, s.armc);
      row.dEpsEndToEnd = Math.abs(e.tobl - s.eps_true) * 3600;
    }
  } else {
    // Swiss's substitute, as the C library filled it (identical to houses_ex 'O', checked in swiss_grids.py).
    row.porphyryOnSwissInputsVsSwissSubstitute = maxOf(porphyry.map((c, k) => arcsec(c, s.c_cusps[k])));
    row.engineWholeSignVsSwissSubstituteDeg = maxOf(e.cusps.map((c, k) => arcsec(c, s.c_cusps[k]) / 3600));
  }
  return row;
});

const count = (f) => rows.filter(f).length;
const computed = rows.filter((r) => !r.swissRefused);
const byLat = {};
for (const lat of [...new Set(rows.map((r) => r.lat))].sort((a, b) => a - b)) {
  const sel = computed.filter((r) => r.lat === lat && r.cuspsEndToEnd !== undefined);
  byLat[lat] = {
    swissComputes: count((r) => r.lat === lat && !r.swissRefused),
    engineComputes: count((r) => r.lat === lat && !r.engineRefused),
    maxCuspOnSwissInputs: +maxOf(computed.filter((r) => r.lat === lat).map((r) => r.cuspsOnSwissInputs ?? 0)).toExponential(3),
    maxCuspEndToEnd: sel.length ? +maxOf(sel.map((r) => r.cuspsEndToEnd)).toFixed(3) : null,
    maxAscEndToEnd: sel.length ? +maxOf(sel.map((r) => r.ascEndToEnd)).toFixed(3) : null,
  };
}
const worstBy = (key) => {
  const r = rows.filter((x) => x[key] !== undefined).reduce((a, b) => (b[key] > a[key] ? b : a));
  return { utc: r.utc, lat: r.lat, value: r[key] };
};
const minAbs = (key) => Math.min(...rows.map((r) => Math.abs(r[key])));

const verdict = {
  what: 'Step 1.9 (rule 1h) on @zodiacs/engine 0.1.1-rc.7: status and cusps on the 336-case ladder',
  inputs: {
    'engine-grids.json': createHash('sha256').update(engBytes).digest('hex'),
    'swiss-grids.json': createHash('sha256').update(swBytes).digest('hex'),
    'angle-grid-erfa.json': createHash('sha256').update(arbBytes).digest('hex'),
  },
  engine: math.ENGINE_VERSION,
  placidusPolarFallback: math.PLACIDUS_POLAR_FALLBACK,
  cases: rows.length,
  swiss: { computes: count((r) => !r.swissRefused), refuses: count((r) => r.swissRefused),
           refusedCases: rows.filter((r) => r.swissRefused).map((r) => `${r.utc} ${r.lat}`) },
  status: {
    endToEnd_agree: count((r) => r.swissRefused === r.engineRefused),
    endToEnd_engineComputes: count((r) => !r.engineRefused),
    onSwissInputs_agree: count((r) => r.swissRefused === r.engineOnSwissInputsRefused),
    erfaLimit_agreeWithSwiss: count((r) => r.swissRefused === !r.erfaAllows),
    fellBackOnSwissInputs_whole: count((r) => r.computeHousesOnSwissInputs.fellBack && r.computeHousesOnSwissInputs.fallbackSystem === 'whole'),
    swissRefusedExactlyWhereLatAtOrBeyond90MinusEpsSwiss: rows.every((r) => r.swissRefused === (r.marginSwissDeg <= 0)),
    minAbsMarginDeg: { engine: minAbs('marginEngineDeg'), swiss: minAbs('marginSwissDeg'), erfa: minAbs('marginErfaDeg') },
  },
  cuspsOnSwissInputs: {
    n: computed.length,
    maxAll12Arcsec: maxOf(computed.map((r) => r.cuspsOnSwissInputs)),
    worstAll12: worstBy('cuspsOnSwissInputs'),
    maxIntermediateArcsec: maxOf(computed.map((r) => r.intermediateOnSwissInputs)),
    maxAscArcsec: maxOf(computed.map((r) => r.ascOnSwissInputs)),
    maxMcArcsec: maxOf(computed.map((r) => r.mcOnSwissInputs)),
    gate_le_0_02: maxOf(computed.map((r) => r.cuspsOnSwissInputs)) <= 0.02,
  },
  endToEndForInformation: {
    n: count((r) => r.cuspsEndToEnd !== undefined),
    maxCuspArcsec: maxOf(rows.map((r) => r.cuspsEndToEnd ?? 0)),
    worstCusp: worstBy('cuspsEndToEnd'),
    maxIntermediateArcsec: maxOf(rows.map((r) => r.intermediateEndToEnd ?? 0)),
    maxAscArcsec: maxOf(rows.map((r) => r.ascEndToEnd ?? 0)),
    maxDRamcArcsec: maxOf(rows.map((r) => r.dRamcEndToEnd ?? 0)),
    maxDEpsArcsec: maxOf(rows.map((r) => r.dEpsEndToEnd ?? 0)),
    byLatitude: byLat,
  },
  refusedCasesForInformation: {
    n: count((r) => r.swissRefused),
    porphyryOnSwissInputsVsSwissSubstituteMaxArcsec: maxOf(rows.map((r) => r.porphyryOnSwissInputsVsSwissSubstitute ?? 0)),
    engineWholeSignVsSwissPorphyryMaxDeg: maxOf(rows.map((r) => r.engineWholeSignVsSwissSubstituteDeg ?? 0)),
  },
};
writeFileSync(`${O}/s19/verdict-19.json`, JSON.stringify(verdict, null, 1));
writeFileSync(`${O}/s19/rows-19.json`, JSON.stringify(rows));
console.log(JSON.stringify(verdict, null, 1));
