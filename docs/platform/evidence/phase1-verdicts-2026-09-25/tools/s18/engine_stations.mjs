// Step 1.8: station-flag agreement on the VENDORED rc.7 chart (computeChart from
// @zodiacs/engine/internal, the site's shipped path). For each of the 54 Swiss stations of
// Mercury..Pluto in 2024-2026 (stations-swiss.json):
//   rule:   the chart's retrograde flag at the Swiss station -1 h and +1 h against the sign
//           of Swiss's speed there, clock pinned (engine UTC chosen so its own TT equals
//           Swiss's TT) and, separately, at the same UT (Swiss's own Delta-T);
//   ladder: the same at -/+ 45, 30, 20, 10, 5 minutes (not part of the rule; shows the margin);
//   station offset: the chart speed's own sign change, bisected, minus Swiss's (minutes);
//   Saturn: saturnReturn(...).natalRetrograde against the chart's flag at every Saturn
//           station -/+ 1 h (rule 1g's change column: natalRetrograde from the same derivative).
// Reads $WORK/s18/stations-swiss.json and the installed @zodiacs/engine and astronomy-engine.
// Writes $WORK/s18/stations-results.json (its rows carry Swiss's station instants and speeds,
// so it stays in WORK) and prints the statistics.
//   node tools/s18/engine_stations.mjs > $WORK/s18/engine-stations.log
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { ENGINE, SITE_ROOT, outDir } from '../lib/paths.mjs';

const OUT = outDir('s18');
const internal = await import(`${ENGINE}/dist/internal.js`);
const root = await import(`${ENGINE}/dist/index.js`);
if (root.ENGINE_VERSION !== '0.1.1-rc.7') throw new Error('not rc.7');
const require = createRequire(`${SITE_ROOT}/package.json`);
const A = require('astronomy-engine');

const J2000 = 2451545.0;
const dateAtTT = (jdTT) => A.AstroTime.FromTerrestrialTime(jdTT - J2000).date;
const dateAtUT = (jdUT) => new Date(Math.round((jdUT - 2440587.5) * 86_400_000));
const chartBody = (date, body) => {
  const chart = internal.computeChart({ utc: date, houseSystem: 'whole', timeKnown: true, latitude: 0, longitude: 0 });
  if (chart.engineVersion !== '0.1.1-rc.7') throw new Error('chart engineVersion');
  return chart.bodies.find((row) => row.body === body);
};

const sw = JSON.parse(fs.readFileSync(OUT + 'stations-swiss.json', 'utf8'));
const LADDER = ['60', '45', '30', '20', '10', '5'];
const agree = { TT: {}, UT: {} };
for (const k of LADDER) { agree.TT[k] = { flags: 0, agree: 0, disagreements: [] }; agree.UT[k] = { flags: 0, agree: 0, disagreements: [] }; }
const rows = [];
const saturn = { checked: 0, agreeWithChart: 0, agreeWithSwiss: 0, rows: [] };

for (const st of sw.stations) {
  const row = { body: st.body, kind: st.kind, swissStationUtcByEngineClock: dateAtTT(st.jd_tt).toISOString(), jd_tt: st.jd_tt };
  for (const clock of ['TT', 'UT']) {
    for (const k of LADDER) {
      const [swissBefore, swissAfter] = clock === 'TT' ? st.ladderTT[k] : st.ladderUT[k];
      const offset = Number(k) / 1440;
      const center = clock === 'TT' ? st.jd_tt : st.jd_ut;
      const at = (jd) => (clock === 'TT' ? dateAtTT(jd) : dateAtUT(jd));
      const before = chartBody(at(center - offset), st.body);
      const after = chartBody(at(center + offset), st.body);
      for (const [engine, swissSpeed, side] of [[before, swissBefore, 'before'], [after, swissAfter, 'after']]) {
        agree[clock][k].flags += 1;
        if (engine.retrograde === swissSpeed < 0) agree[clock][k].agree += 1;
        else agree[clock][k].disagreements.push({ body: st.body, kind: st.kind, side, minutes: Number(k), engineSpeed: engine.speed, swissSpeed });
      }
      if (k === '60') row[`flags${clock}`] = { before: before.retrograde, after: after.retrograde, swissBefore: swissBefore < 0, swissAfter: swissAfter < 0 };
    }
  }
  // The chart speed's own sign change near the Swiss station (engine clock, TT-pinned).
  let lo = st.jd_tt - 3, hi = st.jd_tt + 3;
  const f = (jd) => chartBody(dateAtTT(jd), st.body).speed;
  let flo = f(lo);
  if (flo * f(hi) > 0) throw new Error('no engine sign change near ' + row.swissStationUtcByEngineClock);
  for (let i = 0; i < 45; i += 1) { const m = (lo + hi) / 2; const fm = f(m); if (flo * fm <= 0) hi = m; else { lo = m; flo = fm; } }
  row.engineMinusSwissMinutes = +(((lo + hi) / 2 - st.jd_tt) * 1440).toFixed(2);
  if (st.body === 'Saturn') {
    for (const [sign, side] of [[-1, 'before'], [1, 'after']]) {
      const date = dateAtTT(st.jd_tt + sign / 24);
      const chartFlag = chartBody(date, 'Saturn').retrograde;
      const natal = root.saturnReturn({ utc: date, houseSystem: 'whole', timeKnown: true, latitude: 0, longitude: 0 }).natalRetrograde;
      const swissFlag = (sign < 0 ? st.ladderTT['60'][0] : st.ladderTT['60'][1]) < 0;
      saturn.checked += 1;
      if (natal === chartFlag) saturn.agreeWithChart += 1;
      if (natal === swissFlag) saturn.agreeWithSwiss += 1;
      saturn.rows.push({ station: row.swissStationUtcByEngineClock, side, natalRetrograde: natal, chart: chartFlag, swiss: swissFlag });
    }
  }
  rows.push(row);
}
const offsets = rows.map((r) => Math.abs(r.engineMinusSwissMinutes)).sort((a, b) => a - b);
const byBody = {};
for (const r of rows) { byBody[r.body] ??= 0; byBody[r.body] = Math.max(byBody[r.body], Math.abs(r.engineMinusSwissMinutes)); }
const result = {
  engine: root.ENGINE_VERSION,
  stations: rows.length,
  rule_pm1h: { TT: { flags: agree.TT['60'].flags, agree: agree.TT['60'].agree }, UT: { flags: agree.UT['60'].flags, agree: agree.UT['60'].agree } },
  ladder: Object.fromEntries(['TT', 'UT'].map((c) => [c, Object.fromEntries(LADDER.map((k) => [k + ' min', { flags: agree[c][k].flags, agree: agree[c][k].agree, disagreements: agree[c][k].disagreements }]))])),
  stationOffsetMinutes: { median: offsets[offsets.length >> 1], max: offsets.at(-1), maxByBody: Object.fromEntries(Object.entries(byBody).map(([b, v]) => [b, +v.toFixed(2)])), worst: [...rows].sort((a, b) => Math.abs(b.engineMinusSwissMinutes) - Math.abs(a.engineMinusSwissMinutes)).slice(0, 5).map((r) => ({ body: r.body, kind: r.kind, swissStationUtcByEngineClock: r.swissStationUtcByEngineClock, engineMinusSwissMinutes: r.engineMinusSwissMinutes })) },
  saturnNatalDirection: { checked: saturn.checked, agreeWithChart: saturn.agreeWithChart, agreeWithSwiss: saturn.agreeWithSwiss }
};
fs.writeFileSync(OUT + 'stations-results.json', JSON.stringify({ ...result, rows, saturnRows: saturn.rows }, null, 1));
console.log(JSON.stringify(result, null, 1));
