/*
 * Control: the vendored rc.6 (vendor/zodiacs-engine-0.1.1-rc.6.tgz, extracted by run-all.sh to
 * $WORK/tgz-rc6/) on the same grids and the same Swiss readings. It must reproduce the
 * preregistered baselines (grid A ASC vs Swiss p50 2.409", p95 22.406", max 512.529"; MC max
 * 3.94"; ladder: all 336 refused), which shows this harness measures what the audit measured.
 * Reads $WORK/s13/swiss-grids.json and the corpus; prints statistics.
 *
 *   node tools/s13/rc6_control.mjs > $WORK/s13/rc6-control.json
 * ($WORK/tgz-rc6/node_modules is a symlink to the site's node_modules, for astronomy-engine.)
 */
import { readFileSync } from 'node:fs';
import { SITE_ROOT, WORK } from '../lib/paths.mjs';

const O = WORK;
const rc6 = await import(`${O}/tgz-rc6/package/dist/internal.js`);
const rc6math = await import(`${O}/tgz-rc6/package/dist/internal-math.js`);
const pkg = JSON.parse(readFileSync(`${O}/tgz-rc6/package/package.json`, 'utf8'));
const corpus = JSON.parse(readFileSync(`${SITE_ROOT}/docs/platform/evidence/engine-beyond-swiss/corpora/angle-grid-inputs.json`, 'utf8'));
const sw = JSON.parse(readFileSync(`${O}/s13/swiss-grids.json`, 'utf8'));

const arcsec = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180) * 3600;
const stats = (values) => {
  const v = [...values].sort((a, b) => a - b);
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * (v.length - 1)))];
  return { n: v.length, p50: +q(0.5).toFixed(3), p95: +q(0.95).toFixed(3), max: +v[v.length - 1].toFixed(3) };
};
const chart = ([utc, latitude, longitude]) => rc6.computeChart({ utc: new Date(utc), latitude, longitude, houseSystem: 'placidus', timeKnown: true });

const asc = [];
const mc = [];
let worst = null;
corpus.A.forEach((row, i) => {
  const c = chart(row);
  const s = sw.A[i];
  if (s.utc !== row[0] || s.lat !== row[1]) throw new Error('row mismatch');
  const d = arcsec(c.angles.asc, s.ascmc[0]);
  asc.push(d);
  mc.push(arcsec(c.angles.mc, s.ascmc[1]));
  if (!worst || d > worst.d) worst = { utc: row[0], lat: row[1], d: +d.toFixed(3) };
});
const ladder = corpus.L.map((row) => chart(row).flags.includes('polar-fallback'));
console.log(JSON.stringify({
  engine: pkg.version, ENGINE_VERSION: rc6math.ENGINE_VERSION ?? null,
  gridA: { ascVsSwiss: stats(asc), worst, mcVsSwiss: stats(mc) },
  ladder: { cases: ladder.length, refused: ladder.filter(Boolean).length },
}, null, 1));
