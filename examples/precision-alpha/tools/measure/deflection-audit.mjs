/**
 * Why the all-ten-body maximum against Swiss is an arcsecond, when the
 * median is a fraction of a milliarcsecond.
 *
 *   node tools/measure/deflection-audit.mjs --pack <pack.zeph> \
 *        --ephe <swiss-ephe-dir> [--instants <instants.json>] [--out <dir>]
 *
 * FOUR-CONFIGURATIONS.md attributed the spread to centre-versus-barycentre:
 * "Swiss returns the planet centre; this pack and this kernel give a
 * planetary-SYSTEM barycentre for Mars outward." This tool tests that
 * attribution rather than repeating it, and separates what is left into
 *
 *   kernel/model     — different source ephemerides
 *   time and frame   — different clocks, precession, nutation, frame bias
 *   corrections      — light-time, aberration, gravitational deflection
 *   implementation   — the same correction computed differently
 *
 * by turning one correction off on BOTH sides and re-measuring. Swiss is a
 * measuring instrument here; no Swiss output is redistributed and the bulk
 * per-instant values this writes are gitignored.
 */
import { openPackFile } from '../../src/node.mjs';
import { CORRECTED } from '../../src/core/reduce.mjs';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);
const PACK = args.get('pack');
const EPHE = args.get('ephe');
const INSTANTS = args.get('instants') ?? '../../docs/platform/evidence/precision-2026-09-20/raw/four-configurations/instants-grid.json';
const OUT = args.get('out') ?? '../../docs/platform/evidence/precision-2026-09-20/raw/deflection-audit';
if (!PACK || !EPHE) throw new Error('--pack and --ephe are required');

const DAY = 86400;
const DEG = Math.PI / 180;
/** The Sun's mean apparent radius from Earth. A body inside this is behind it. */
const SOLAR_RADIUS_DEG = 0.26593;
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const BARYCENTRE = new Set(['Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']);

const wrap = (d) => (((d + 180) % 360) + 360) % 360 - 180;
const asec = (a, b) => wrap(a - b) * 3600;
const abs = (xs) => xs.map(Math.abs);
function stats(xs) {
  if (!xs.length) return { max: null, p50: null, p95: null, n: 0 };
  const v = [...xs].sort((a, b) => a - b);
  return { max: v[v.length - 1], p50: v[Math.floor(v.length * 0.5)], p95: v[Math.floor(v.length * 0.95)], n: v.length };
}

/** Great-circle separation of two ecliptic directions, degrees. */
function separation(lon1, lat1, lon2, lat2) {
  const c = Math.sin((90 - lat1) * DEG) * Math.sin((90 - lat2) * DEG) * Math.cos((lon1 - lon2) * DEG)
    + Math.cos((90 - lat1) * DEG) * Math.cos((90 - lat2) * DEG);
  return Math.acos(Math.max(-1, Math.min(1, c))) / DEG;
}

mkdirSync(OUT, { recursive: true });

function runSwiss(nogdefl) {
  const script = new URL('./swiss.py', import.meta.url).pathname;
  const argv = [script, INSTANTS, EPHE];
  if (nogdefl) argv.push('--nogdefl');
  const stdout = execFileSync('python3', argv, { encoding: 'utf8', maxBuffer: 1 << 28 });
  const swiss = JSON.parse(stdout);
  if (!swiss.isFullSwissConfiguration) {
    throw new Error(`Swiss fell back to ${swiss.backendsObserved.join(', ')}; a fallback is not the configuration under test`);
  }
  writeFileSync(join(OUT, `swiss-${nogdefl ? 'nogdefl' : 'default'}.json`), `${JSON.stringify(swiss)}\n`);
  return swiss;
}

console.log('Swiss, deflection on …');
const on = runSwiss(false);
console.log('Swiss, deflection off …');
const off = runSwiss(true);

const rt = await openPackFile(PACK);
const NO_DEFL = { ...CORRECTED, deflection: 'none' };

const rows = [];
for (let i = 0; i < on.cases.length; i += 1) {
  const a = on.cases[i];
  const b = off.cases[i];
  if (a.utc !== b.utc) throw new Error('the two Swiss runs are not aligned');
  // The harness's convention: adopt Swiss's own Delta-T so the two sides
  // share a time scale and a clock difference cannot masquerade as a
  // modelling difference.
  const utDays = (Date.parse(a.utc) - Date.UTC(2000, 0, 1, 12)) / 86400000;
  const ttDays = utDays + a.deltaTSeconds / DAY;
  let sun;
  try { sun = rt.apparent('Sun', ttDays, CORRECTED); } catch { continue; }
  for (const body of BODIES) {
    const ref = a.bodies[body];
    const refOff = b.bodies[body];
    if (!ref || ref.error || !refOff || refOff.error) continue;
    let ours; let oursOff;
    try {
      ours = rt.apparent(body, ttDays, CORRECTED);
      oursOff = rt.apparent(body, ttDays, NO_DEFL).lon;
    } catch { continue; }
    rows.push({
      utc: a.utc, ttDays, body,
      isSystemBarycentre: BARYCENTRE.has(body),
      elongDeg: body === 'Sun' ? 180 : separation(ours.lon, ours.lat, sun.lon, sun.lat),
      deflectionOn: asec(ours.lon, ref.lon),
      deflectionOff: asec(oursOff, refOff.lon),
      ourDeflection: asec(ours.lon, oursOff),
      swissDeflection: asec(ref.lon, refOff.lon),
    });
  }
}
writeFileSync(join(OUT, 'rows.json'), `${JSON.stringify(rows)}\n`);

// ------------------------------------------------------------------ report
const worstOn = [...rows].sort((x, y) => Math.abs(y.deflectionOn) - Math.abs(x.deflectionOn)).slice(0, 12);
const groups = {
  'all body-epochs': () => true,
  'outside the solar disc (elongation > 0.266 deg)': (r) => r.elongDeg > SOLAR_RADIUS_DEG,
  'outside 1 degree': (r) => r.elongDeg > 1,
  'outside 3 degrees': (r) => r.elongDeg > 3,
};
const report = {
  what: 'whether the all-ten-body maximum against Swiss is centre-versus-barycentre, and what it is instead',
  pack: { path: PACK, digest: rt.integrity.computedDigest },
  swiss: { binding: on.swisseph_binding, backends: on.backendsObserved, ephe: EPHE },
  solarRadiusDeg: SOLAR_RADIUS_DEG,
  bodyEpochs: rows.length,
  byGroup: {},
  byBody: {},
  worstTwelve: worstOn.map((r) => ({
    utc: r.utc, body: r.body, elongDeg: Number(r.elongDeg.toFixed(4)),
    deflectionOn: Number(r.deflectionOn.toFixed(6)),
    deflectionOff: Number(r.deflectionOff.toFixed(6)),
    ourDeflection: Number(r.ourDeflection.toFixed(6)),
    swissDeflection: Number(r.swissDeflection.toFixed(6)),
    behindTheSun: r.elongDeg < SOLAR_RADIUS_DEG,
  })),
};
for (const [label, keep] of Object.entries(groups)) {
  const use = rows.filter(keep);
  report.byGroup[label] = {
    deflectionOn: stats(abs(use.map((r) => r.deflectionOn))),
    deflectionOffBothSides: stats(abs(use.map((r) => r.deflectionOff))),
    systemBarycentresOnly: stats(abs(use.filter((r) => r.isSystemBarycentre).map((r) => r.deflectionOn))),
    bodyCentresOnly: stats(abs(use.filter((r) => !r.isSystemBarycentre).map((r) => r.deflectionOn))),
  };
}
for (const body of BODIES) {
  const use = rows.filter((r) => r.body === body);
  const outside = use.filter((r) => r.elongDeg > SOLAR_RADIUS_DEG);
  report.byBody[body] = {
    isSystemBarycentre: BARYCENTRE.has(body),
    all: stats(abs(use.map((r) => r.deflectionOn))),
    outsideTheSolarDisc: stats(abs(outside.map((r) => r.deflectionOn))),
    deflectionOffBothSides: stats(abs(use.map((r) => r.deflectionOff))),
  };
}
writeFileSync(join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

const f = (x) => (x === null ? '     -' : x.toFixed(6));
console.log(`\n${rows.length} body-epochs\n`);
console.log('group'.padEnd(48), 'max(on)'.padStart(10), 'max(off)'.padStart(10), 'p95(on)'.padStart(10));
for (const [label, g] of Object.entries(report.byGroup)) {
  console.log(label.padEnd(48), f(g.deflectionOn.max).padStart(10), f(g.deflectionOffBothSides.max).padStart(10), f(g.deflectionOn.p95).padStart(10));
}
console.log('\nper body, arcsec');
console.log('body'.padEnd(10), 'bary?'.padEnd(6), 'max(all)'.padStart(10), 'max(outside)'.padStart(13), 'p50'.padStart(10), 'max(defl off)'.padStart(14));
for (const body of BODIES) {
  const b = report.byBody[body];
  console.log(body.padEnd(10), String(b.isSystemBarycentre).padEnd(6), f(b.all.max).padStart(10), f(b.outsideTheSolarDisc.max).padStart(13), f(b.all.p50).padStart(10), f(b.deflectionOffBothSides.max).padStart(14));
}
console.log('\nworst twelve');
for (const r of report.worstTwelve) {
  console.log(`  ${r.utc}  ${r.body.padEnd(8)} elong ${String(r.elongDeg).padStart(9)} deg  on ${String(r.deflectionOn).padStart(10)}  off ${String(r.deflectionOff).padStart(10)}  behind the Sun: ${r.behindTheSun}`);
}
console.log(`\nwrote ${OUT}/report.json`);
