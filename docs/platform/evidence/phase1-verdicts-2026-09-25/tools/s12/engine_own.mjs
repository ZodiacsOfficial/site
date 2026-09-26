// Step 1.2, supplementary: the same 2024 30-minute scan on the engine's OWN positions,
// through the shipped path (computeChart from @zodiacs/engine/internal, which the
// site's src/lib/engine/full.ts wraps), judged by the orb's actual motion in the
// engine's own longitudes over +-1 s (bodyLongitude). The audit's baseline for rc.6
// on this scan was 486 of 236,910 (60 s reference), 510 with the linear reference.
// natalChart (the root API) is checked to return the same aspects on every 97th instant.
// No Swiss input. Reads the installed @zodiacs/engine and $WORK/tgz-rc6; writes
// $WORK/s12/engine-own.json and prints it.
//   node tools/s12/engine_own.mjs > $WORK/s12/engine-own.log
import fs from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { ENGINE, RC6, outDir } from '../lib/paths.mjs';

const OUT = outDir('s12');
const internal = await import(`${ENGINE}/dist/internal.js`);
const root = await import(`${ENGINE}/dist/index.js`);
if (root.ENGINE_VERSION !== '0.1.1-rc.7') throw new Error('not rc.7');
const rc6 = await import(`${RC6}/dist/internal-math.js`);

const ANGLE = Object.fromEntries(root.ASPECTS.map((row) => [row.type, row.angle]));
const wrap = (x) => { x = ((x % 360) + 360) % 360; return x > 180 ? x - 360 : x; };
const signedDev = (lonA, lonB, angle) => { const s = wrap(lonA - lonB); if (angle === 0) return s; if (angle === 180) return wrap(s - 180); return Math.abs(s) - angle; };
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

const res = { instants: 0, aspects: 0, judged: 0, setAside: 0, rc7: { misclassified: 0, falsePositives: 0, examples: [] }, rc6FlagOnRc7Speeds: { misclassified: 0, falsePositives: 0 }, natalChartChecked: 0, natalChartMismatches: 0, stationary: 0 };
const t0 = Date.now();
let index = 0;
for (let t = Date.UTC(2024, 0, 1); t < Date.UTC(2025, 0, 1); t += 30 * 60_000, index += 1) {
  const utc = new Date(t);
  const input = { utc, houseSystem: 'whole', timeKnown: true, latitude: 0, longitude: 0 };
  const chart = internal.computeChart(input);
  if (chart.engineVersion !== '0.1.1-rc.7') throw new Error('chart engineVersion');
  if (index % 97 === 0) {
    const viaRoot = root.natalChart(input);
    res.natalChartChecked += 1;
    if (!isDeepStrictEqual(viaRoot.aspects, chart.aspects) || !isDeepStrictEqual(viaRoot.bodies, chart.bodies)) res.natalChartMismatches += 1;
  }
  res.instants += 1;
  const by = Object.fromEntries(chart.bodies.map((b) => [b.body, b]));
  const minus = Object.fromEntries(BODIES.map((b) => [b, internal.bodyLongitude(b, new Date(t - 1000))]));
  const plus = Object.fromEntries(BODIES.map((b) => [b, internal.bodyLongitude(b, new Date(t + 1000))]));
  const old = new Map(rc6.findAspects(chart.bodies).map((x) => [`${x.a}|${x.b}|${x.type}`, x]));
  for (const asp of chart.aspects) {
    res.aspects += 1;
    const angle = ANGLE[asp.type];
    if (root.aspectMotion(by[asp.a], by[asp.b], angle) === 'stationary') res.stationary += 1;
    const dm = signedDev(minus[asp.a], minus[asp.b], angle);
    const d0 = signedDev(by[asp.a].lon, by[asp.b].lon, angle);
    const dp = signedDev(plus[asp.a], plus[asp.b], angle);
    if (d0 === 0 || Math.sign(dm) !== Math.sign(dp) || Math.sign(dm) !== Math.sign(d0)) { res.setAside += 1; continue; }
    const truth = Math.abs(dp) < Math.abs(dm);
    res.judged += 1;
    if (asp.applying !== truth) {
      res.rc7.misclassified += 1;
      if (asp.applying) res.rc7.falsePositives += 1;
      if (res.rc7.examples.length < 5) res.rc7.examples.push({ utc: utc.toISOString(), a: asp.a, b: asp.b, type: asp.type, orb: asp.orb, applying: asp.applying, truth });
    }
    const prior = old.get(`${asp.a}|${asp.b}|${asp.type}`);
    if (prior.applying !== truth) { res.rc6FlagOnRc7Speeds.misclassified += 1; if (prior.applying) res.rc6FlagOnRc7Speeds.falsePositives += 1; }
  }
}
res.elapsedSeconds = (Date.now() - t0) / 1000;
fs.writeFileSync(OUT + 'engine-own.json', JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
