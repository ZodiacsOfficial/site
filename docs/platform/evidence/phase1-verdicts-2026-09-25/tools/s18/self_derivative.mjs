// Step 1.8, supplementary (Swiss-free): A3 proposes that rule 1g name "the derivative of
// the reported longitude" rather than "state vectors". Check that rc.7's chart speed is
// that derivative for every body: chart speed (computeChart, shipped path) minus a
// +-1e-4-day central difference of the engine's own reported longitude (bodyLongitude),
// every 6 hours from 2024-01-01 to 2027-01-01, in arcseconds per day.
// No Swiss input. Reads the installed @zodiacs/engine; writes $WORK/s18/self-derivative.json
// and prints it.
//   node tools/s18/self_derivative.mjs
import fs from 'node:fs';
import { ENGINE, outDir } from '../lib/paths.mjs';

const OUT = outDir('s18');
const internal = await import(`${ENGINE}/dist/internal.js`);
const root = await import(`${ENGINE}/dist/index.js`);
if (root.ENGINE_VERSION !== '0.1.1-rc.7') throw new Error('not rc.7');
const DAY = 86_400_000;
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const wrap = (x) => { x = ((x % 360) + 360) % 360; return x > 180 ? x - 360 : x; };
const worst = Object.fromEntries(BODIES.map((b) => [b, { value: 0, utc: null }]));
let instants = 0, retrogradeMismatch = 0;
for (let t = Date.UTC(2024, 0, 1); t < Date.UTC(2027, 0, 1); t += DAY / 4) {
  const date = new Date(t);
  const chart = internal.computeChart({ utc: date, houseSystem: 'whole', timeKnown: true, latitude: 0, longitude: 0 });
  instants += 1;
  for (const row of chart.bodies) {
    if (!BODIES.includes(row.body)) continue;
    if (row.retrograde !== row.speed < 0) retrogradeMismatch += 1;
    const cd = wrap(internal.bodyLongitude(row.body, new Date(t + 1e-4 * DAY)) - internal.bodyLongitude(row.body, new Date(t - 1e-4 * DAY))) / 2e-4;
    const err = Math.abs(row.speed - cd) * 3600;
    if (err > worst[row.body].value) worst[row.body] = { value: err, utc: date.toISOString() };
  }
}
const result = { engine: root.ENGINE_VERSION, instants, unit: 'arcsec/day', retrogradeFlagNotSignOfSpeed: retrogradeMismatch, maxAbsChartSpeedMinusDerivative: Object.fromEntries(Object.entries(worst).map(([b, v]) => [b, { max: +v.value.toFixed(5), utc: v.utc }])) };
fs.writeFileSync(OUT + 'self-derivative.json', JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
