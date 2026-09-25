// Step 1.8, the other reading of "station-flag agreement at +-1 h": the chart's retrograde
// flag agrees with Swiss everywhere except within 1 h of a station. Engine side: the
// VENDORED rc.7 chart (computeChart) every hour of 2024-2026 UTC for Mercury..Pluto, with
// the engine's own TT so Swiss can be read at the same TT (flags_hourly_swiss.py).
// No Swiss input. Reads the installed @zodiacs/engine and astronomy-engine; writes
// $WORK/s18/flags-hourly-engine.json (3 MB of the engine's flags) and prints counts.
//   node tools/s18/flags_hourly_engine.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { ENGINE, SITE_ROOT, outDir } from '../lib/paths.mjs';

const OUT = outDir('s18');
const internal = await import(`${ENGINE}/dist/internal.js`);
const root = await import(`${ENGINE}/dist/index.js`);
if (root.ENGINE_VERSION !== '0.1.1-rc.7') throw new Error('not rc.7');
const require = createRequire(`${SITE_ROOT}/package.json`);
const A = require('astronomy-engine');
const BODIES = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const rows = [];
for (let t = Date.UTC(2024, 0, 1); t < Date.UTC(2027, 0, 1); t += 3_600_000) {
  const date = new Date(t);
  const chart = internal.computeChart({ utc: date, houseSystem: 'whole', timeKnown: true, latitude: 0, longitude: 0 });
  const by = Object.fromEntries(chart.bodies.map((b) => [b.body, b]));
  rows.push({ utc: date.toISOString(), jd_tt: A.MakeTime(date).tt + 2451545.0, retro: BODIES.map((b) => by[b].retrograde) });
}
fs.writeFileSync(OUT + 'flags-hourly-engine.json', JSON.stringify({ bodies: BODIES, rows }));
console.log(JSON.stringify({ instants: rows.length, flags: rows.length * BODIES.length }));
