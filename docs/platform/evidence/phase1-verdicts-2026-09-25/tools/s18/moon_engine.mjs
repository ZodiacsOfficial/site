// Step 1.8, engine side: the Moon's speed from the VENDORED rc.7 chart (computeChart
// from @zodiacs/engine/internal, the site's shipped path) at
//   set "swissApsides": every Swiss perigee and apogee 2024-2026 (apsides-swiss.json)
//        at -12, -6, 0, +6, +12 h (TT offsets; UTC by the engine's own clock), 400 samples;
//   set "a3": A3's own instants: astronomy-engine SearchLunarApsis from 2024-01-01T00Z to
//        2027-01-01T00Z at -12..+12 h UTC (400) plus the 2024-10-17 perigee window,
//        2024-10-15T00Z to 2024-10-19T00Z every 6 h (17) = 417, as the planners' probe
//        (phase1-design/aspects-speeds/p2-speeds-engine.mjs) sampled them.
// Each sample records the engine's TT and UT Julian dates so Swiss can be read at the
// same TT (clock pinned; the rule is about speed, not Delta-T) and at the same UT.
// Also recorded, to split any residual: the derivative of the engine's own reported
// longitude with a +-1e-4 day step, and the longitudes at t -/+ 0.001 day.
// Reads $WORK/s18/apsides-swiss.json and the installed @zodiacs/engine and astronomy-engine.
// Writes $WORK/s18/moon-engine.json (its Swiss set is anchored on Swiss's apsis instants, so
// it stays in WORK) and prints the sample counts.
//   node tools/s18/moon_engine.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { ENGINE, SITE_ROOT, outDir } from '../lib/paths.mjs';

const OUT = outDir('s18');
const internal = await import(`${ENGINE}/dist/internal.js`);
const root = await import(`${ENGINE}/dist/index.js`);
if (root.ENGINE_VERSION !== '0.1.1-rc.7') throw new Error('not rc.7');
const require = createRequire(`${SITE_ROOT}/package.json`);
const A = require('astronomy-engine');
const aePkg = JSON.parse(fs.readFileSync(`${SITE_ROOT}/node_modules/astronomy-engine/package.json`, 'utf8'));
if (aePkg.version !== '2.1.19') throw new Error('astronomy-engine version');

const DAY = 86_400_000;
const HOUR = 3_600_000;
const J2000 = 2451545.0;
const dateAtTT = (jdTT) => A.AstroTime.FromTerrestrialTime(jdTT - J2000).date;
const moonOf = (chart) => chart.bodies.find((row) => row.body === 'Moon');
const chartAt = (date) => internal.computeChart({ utc: date, houseSystem: 'whole', timeKnown: true, latitude: 0, longitude: 0 });
const wrap = (x) => { x = ((x % 360) + 360) % 360; return x > 180 ? x - 360 : x; };
const cd = (date, h) => wrap(internal.bodyLongitude('Moon', new Date(date.getTime() + h * DAY)) - internal.bodyLongitude('Moon', new Date(date.getTime() - h * DAY))) / (2 * h);

const samples = [];
function sample(set, group, anchor, offsetHours, date) {
  const chart = chartAt(date);
  const moon = moonOf(chart);
  const time = A.MakeTime(date);
  samples.push({
    set, group, anchor, offsetHours,
    utc: date.toISOString(),
    jd_tt: time.tt + J2000,
    jd_ut: time.ut + J2000,
    engineSpeed: moon.speed,
    engineRetrograde: moon.retrograde,
    engineLon: moon.lon,
    engineLonMinus: internal.bodyLongitude('Moon', new Date(date.getTime() - 0.001 * DAY)),
    engineLonPlus: internal.bodyLongitude('Moon', new Date(date.getTime() + 0.001 * DAY)),
    engineTightDerivative: cd(date, 1e-4)
  });
}

// Set "swissApsides".
const swiss = JSON.parse(fs.readFileSync(OUT + 'apsides-swiss.json', 'utf8'));
for (const aps of swiss.apsides) {
  for (const off of [-12, -6, 0, 6, 12]) {
    const date = dateAtTT(aps.jd_tt + off / 24);
    sample('swissApsides', aps.kind, aps.jd_tt, off, date);
  }
}
// Set "a3".
const a3Apsides = [];
let aps = A.SearchLunarApsis(new Date('2024-01-01T00:00:00Z'));
while (aps.time.date < new Date('2027-01-01T00:00:00Z')) {
  const kind = aps.kind === 0 ? 'perigee' : 'apogee';
  a3Apsides.push({ kind, utc: aps.time.date.toISOString() });
  for (const off of [-12, -6, 0, 6, 12]) sample('a3', kind, aps.time.date.toISOString(), off, new Date(aps.time.date.getTime() + off * HOUR));
  aps = A.NextLunarApsis(aps);
}
for (let t = Date.UTC(2024, 9, 15); t <= Date.UTC(2024, 9, 19); t += 6 * HOUR) sample('a3', 'perigee-2024-10-17-window', '2024-10-17', null, new Date(t));

// The root API gives the same Moon speed (spot check on every 25th sample).
let rootChecked = 0;
for (let i = 0; i < samples.length; i += 25) {
  const s = samples[i];
  const viaRoot = root.natalChart({ utc: new Date(s.utc), houseSystem: 'whole', timeKnown: true, latitude: 0, longitude: 0 }).bodies.find((row) => row.body === 'Moon');
  if (viaRoot.speed !== s.engineSpeed) throw new Error('natalChart and computeChart disagree');
  const viaPositions = root.positions(new Date(s.utc)).find((row) => row.body === 'Moon');
  if (viaPositions.speed !== s.engineSpeed) throw new Error('positions and computeChart disagree');
  rootChecked += 1;
}
fs.writeFileSync(OUT + 'moon-engine.json', JSON.stringify({ engine: root.ENGINE_VERSION, astronomyEngine: aePkg.version, a3Apsides, rootChecked, samples }, null, 1));
console.log(JSON.stringify({ samples: samples.length, swissApsides: samples.filter((s) => s.set === 'swissApsides').length, a3: samples.filter((s) => s.set === 'a3').length, a3Apsides: a3Apsides.length, rootChecked }));
