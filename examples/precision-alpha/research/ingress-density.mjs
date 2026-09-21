/*
 * Same quantity, same library, same frame as scripts/build-ingresses.mjs.
 * The ONLY thing changed is the sampling density. So any difference is a
 * sampling artefact of one of the two scans, never a disagreement about
 * astronomy -- which keeps this clear of the "compare two different
 * quantities and call the gap an error" trap.
 */
import { MakeTime, GeoVector, RotateVector, Rotation_EQJ_ECT, Body } from 'astronomy-engine';

const DAY = 86400000;
const rot = Rotation_EQJ_ECT(MakeTime(new Date('2000-01-01T12:00:00Z')));
const lonAt = (planet, date) => {
  const t = MakeTime(date);
  const v = RotateVector(Rotation_EQJ_ECT(t), GeoVector(Body[planet], t, true));
  const lon = (Math.atan2(v.y, v.x) * 180) / Math.PI;
  return (lon + 360) % 360;
};
const signIndexAt = (planet, date) => Math.floor(lonAt(planet, date) / 30);

const GROUPS = [
  { planets: ['Sun', 'Mercury', 'Venus', 'Mars'], from: Date.parse('2026-01-01T00:00:00Z'), to: Date.parse('2029-07-01T00:00:00Z') },
  { planets: ['Jupiter'], from: Date.parse('2014-01-01T00:00:00Z'), to: Date.parse('2046-01-01T00:00:00Z') },
  { planets: ['Saturn'], from: Date.parse('1980-01-01T00:00:00Z'), to: Date.parse('2080-01-01T00:00:00Z') },
  { planets: ['Uranus', 'Neptune', 'Pluto'], from: Date.parse('1900-01-01T00:00:00Z'), to: Date.parse('2100-01-01T00:00:00Z') },
];

// Count sign-index flips at a given step, and record the instants.
function flips(planet, from, to, step) {
  const out = [];
  let prev = signIndexAt(planet, new Date(from));
  let maxDelta = 0, prevLon = lonAt(planet, new Date(from));
  for (let t = from + step; t <= to; t += step) {
    const d = new Date(t);
    const idx = signIndexAt(planet, d);
    const lon = lonAt(planet, d);
    let dl = Math.abs(lon - prevLon); if (dl > 180) dl = 360 - dl;
    if (dl > maxDelta) maxDelta = dl;
    prevLon = lon;
    if (idx !== prev) { out.push({ t, from: prev, to: idx }); prev = idx; }
  }
  return { flips: out, maxDelta };
}

const FINE = Number(process.argv[2] ?? 3600000); // default 1 hour
console.log(`fine step = ${FINE / 60000} min\n`);
let anyGap = false;
for (const g of GROUPS) {
  for (const p of g.planets) {
    const coarse = flips(p, g.from, g.to, DAY);
    const fine = flips(p, g.from, g.to, FINE);
    const perDay = coarse.maxDelta;
    const same = coarse.flips.length === fine.flips.length;
    if (!same) anyGap = true;
    console.log(
      `${p.padEnd(8)} coarse(1d)=${String(coarse.flips.length).padStart(4)}  ` +
      `fine(${FINE / 60000}m)=${String(fine.flips.length).padStart(4)}  ` +
      `${same ? 'agree' : '*** DIFFER by ' + (fine.flips.length - coarse.flips.length) + ' ***'}  ` +
      `max motion per day sampled: ${perDay.toFixed(3)} deg`,
    );
    if (!same) {
      const ct = new Set(coarse.flips.map((f) => Math.round(f.t / DAY)));
      for (const f of fine.flips) {
        if (!ct.has(Math.round(f.t / DAY))) {
          console.log(`    fine-only crossing: ${new Date(f.t).toISOString()} sign ${f.from} -> ${f.to}`);
        }
      }
    }
  }
}
console.log(anyGap ? '\nRESULT: the 1-day scan and the fine scan DISAGREE.' : '\nRESULT: identical crossing counts at both densities.');
