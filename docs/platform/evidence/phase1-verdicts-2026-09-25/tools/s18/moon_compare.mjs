// Step 1.8: rc.7 Moon speed against Swiss at the lunar apsides, in arcseconds per day,
// against the rule's 1"/day gate and A3's proposed 1.5"/day.
//   residual      = engine chart speed - Swiss FLG_SPEED at the engine's TT (the gate)
//   residualUT    = engine chart speed - Swiss FLG_SPEED at the same UT (Swiss Delta-T)
// and the split of the gated residual:
//   method        = engine chart speed - derivative of the engine's longitude (+-1e-4 day)
//   series        = [engine lon(t+h) - Swiss lon(t+h)] - [engine lon(t-h) - Swiss lon(t-h)] / 2h,
//                   h = 0.001 day: the rate of the longitude difference itself
//   swissSelf     = Swiss's own +-0.001-day difference - Swiss's analytic speed
// so residual = series + swissSelf exactly (up to rounding).
// Reads $WORK/s18/moon-engine.json and moon-swiss.json. Writes $WORK/s18/moon-results.json
// (statistics, with the worst samples named) and moon-rows.json (per-sample Swiss speeds:
// never committed), and prints the results.
//   node tools/s18/moon_compare.mjs > $WORK/s18/moon-compare.log
import fs from 'node:fs';
import { outDir } from '../lib/paths.mjs';

const OUT = outDir('s18');
const eng = JSON.parse(fs.readFileSync(OUT + 'moon-engine.json', 'utf8'));
const sw = JSON.parse(fs.readFileSync(OUT + 'moon-swiss.json', 'utf8'));
if (eng.samples.length !== sw.rows.length) throw new Error('length');
const AS = 3600;
const wrap = (x) => { x = ((x % 360) + 360) % 360; return x > 180 ? x - 360 : x; };

const rows = [];
eng.samples.forEach((e, i) => {
  const s = sw.rows[i];
  if (!s) return; // discarded for a non-SWIEPH flag (none expected)
  const h = 0.001;
  const series = (wrap(e.engineLonPlus - s.lonPlus) - wrap(e.engineLonMinus - s.lonMinus)) / (2 * h);
  rows.push({
    set: e.set, group: e.group, anchor: e.anchor, offsetHours: e.offsetHours, utc: e.utc,
    engineSpeed: e.engineSpeed, swissSpeedTT: s.speedTT, swissSpeedUT: s.speedUT,
    residual: (e.engineSpeed - s.speedTT) * AS,
    residualUT: (e.engineSpeed - s.speedUT) * AS,
    method: (e.engineSpeed - e.engineTightDerivative) * AS,
    series: series * AS,
    swissSelf: (s.cdTT - s.speedTT) * AS,
    lonDiff: wrap(e.engineLon - s.lonTT) * AS
  });
});
const stats = (list, key) => {
  const a = list.map((r) => Math.abs(r[key])).sort((x, y) => x - y);
  const q = (p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
  const worst = list.reduce((m, r) => (Math.abs(r[key]) > Math.abs(m[key]) ? r : m), list[0]);
  return { n: a.length, p50: +q(0.5).toFixed(4), p95: +q(0.95).toFixed(4), max: +a.at(-1).toFixed(4),
    over1: a.filter((x) => x > 1).length, over1_5: a.filter((x) => x > 1.5).length,
    worst: { utc: worst.utc, group: worst.group, anchor: worst.anchor, offsetHours: worst.offsetHours, value: +worst[key].toFixed(4) } };
};
const report = { engine: eng.engine, unit: 'arcsec/day', gates: { rule: 1, A3: 1.5 }, sets: {} };
for (const set of ['swissApsides', 'a3']) {
  const inSet = rows.filter((r) => r.set === set);
  const apsisOnly = inSet.filter((r) => r.offsetHours === 0);
  const block = {
    all: { residual: stats(inSet, 'residual'), residualUT: stats(inSet, 'residualUT'), method: stats(inSet, 'method'), series: stats(inSet, 'series'), swissSelf: stats(inSet, 'swissSelf') },
    atApsisInstantOnly: { residual: stats(apsisOnly, 'residual'), residualUT: stats(apsisOnly, 'residualUT') },
    byGroup: {}
  };
  for (const group of [...new Set(inSet.map((r) => r.group))]) {
    const g = inSet.filter((r) => r.group === group);
    block.byGroup[group] = { residual: stats(g, 'residual'), residualUT: stats(g, 'residualUT') };
  }
  block.samplesOver1 = inSet.filter((r) => Math.abs(r.residual) > 1).map((r) => ({ utc: r.utc, group: r.group, anchor: r.anchor, offsetHours: r.offsetHours, residual: +r.residual.toFixed(4), residualUT: +r.residualUT.toFixed(4), series: +r.series.toFixed(4), method: +r.method.toFixed(5) }));
  block.signedMeanResidual = +(inSet.reduce((t, r) => t + r.residual, 0) / inSet.length).toFixed(4);
  block.maxAbsDecompositionError = +Math.max(...inSet.map((r) => Math.abs(r.residual - (r.series + r.swissSelf)))).toExponential(2);
  report.sets[set] = block;
}
fs.writeFileSync(OUT + 'moon-results.json', JSON.stringify(report, null, 1));
fs.writeFileSync(OUT + 'moon-rows.json', JSON.stringify(rows));
console.log(JSON.stringify(report, null, 1));
