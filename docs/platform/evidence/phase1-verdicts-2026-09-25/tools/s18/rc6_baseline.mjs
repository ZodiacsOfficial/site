// Step 1.8, baseline at the same samples: rc.6's Moon speed was a +-0.25-day central
// difference of the same longitude (rc.6 and rc.7 share longitudeAt/moonOfDate verbatim;
// only the step changed), so it is rebuilt from the vendored rc.7 bodyLongitude and set
// against Swiss at the engine's TT, in arcseconds per day.
// Reads $WORK/s18/moon-engine.json and moon-swiss.json and the installed @zodiacs/engine;
// writes $WORK/s18/rc6-baseline.json (statistics) and prints it.
//   node tools/s18/rc6_baseline.mjs
import fs from 'node:fs';
import { ENGINE, outDir } from '../lib/paths.mjs';
const OUT = outDir('s18');
const internal = await import(`${ENGINE}/dist/internal.js`);
const eng = JSON.parse(fs.readFileSync(OUT + 'moon-engine.json', 'utf8'));
const sw = JSON.parse(fs.readFileSync(OUT + 'moon-swiss.json', 'utf8'));
const DAY = 86_400_000;
const wrap = (x) => { x = ((x % 360) + 360) % 360; return x > 180 ? x - 360 : x; };
const out = {};
for (const set of ['swissApsides', 'a3']) {
  const v = [];
  eng.samples.forEach((s, i) => {
    if (s.set !== set || !sw.rows[i]) return;
    const t = new Date(s.utc).getTime();
    const rc6 = wrap(internal.bodyLongitude('Moon', new Date(t + 0.25 * DAY)) - internal.bodyLongitude('Moon', new Date(t - 0.25 * DAY))) / 0.5;
    v.push({ group: s.group, d: Math.abs(rc6 - sw.rows[i].speedTT) * 3600 });
  });
  const by = (g) => { const a = v.filter((x) => !g || x.group === g).map((x) => x.d); return { n: a.length, max: +Math.max(...a).toFixed(4), over1: a.filter((x) => x > 1).length }; };
  out[set] = { all: by(null), perigee: by('perigee'), apogee: by('apogee') };
}
fs.writeFileSync(OUT + 'rc6-baseline.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
