// Step 1.2, supplementary: which aspect of the engine's own 2024 30-minute scan (engine_own.mjs)
// has exactness inside the +-1 s stencil. No Swiss input. Reads the installed @zodiacs/engine
// and prints one JSON line per aspect set aside.
//   node tools/s12/engine-own-set-aside.mjs > $WORK/s12/engine-own-set-aside.json
import { ENGINE } from '../lib/paths.mjs';
const internal = await import(`${ENGINE}/dist/internal.js`);
const root = await import(`${ENGINE}/dist/index.js`);
const ANGLE = Object.fromEntries(root.ASPECTS.map((row) => [row.type, row.angle]));
const wrap = (x) => { x = ((x % 360) + 360) % 360; return x > 180 ? x - 360 : x; };
const signedDev = (lonA, lonB, angle) => { const s = wrap(lonA - lonB); if (angle === 0) return s; if (angle === 180) return wrap(s - 180); return Math.abs(s) - angle; };
for (let t = Date.UTC(2024, 0, 1); t < Date.UTC(2025, 0, 1); t += 30 * 60_000) {
  const chart = internal.computeChart({ utc: new Date(t), houseSystem: 'whole', timeKnown: true, latitude: 0, longitude: 0 });
  const by = Object.fromEntries(chart.bodies.map((b) => [b.body, b]));
  for (const asp of chart.aspects) {
    const angle = ANGLE[asp.type];
    const dm = signedDev(internal.bodyLongitude(asp.a, new Date(t - 1000)), internal.bodyLongitude(asp.b, new Date(t - 1000)), angle);
    const d0 = signedDev(by[asp.a].lon, by[asp.b].lon, angle);
    const dp = signedDev(internal.bodyLongitude(asp.a, new Date(t + 1000)), internal.bodyLongitude(asp.b, new Date(t + 1000)), angle);
    if (d0 === 0 || Math.sign(dm) !== Math.sign(dp) || Math.sign(dm) !== Math.sign(d0)) {
      const rel = by[asp.a].speed - by[asp.b].speed;
      console.log(JSON.stringify({ utc: new Date(t).toISOString(), a: asp.a, b: asp.b, type: asp.type, orb: asp.orb, secondsFromExact: asp.orb / Math.abs(rel) * 86400, applying: asp.applying, motion: root.aspectMotion(by[asp.a], by[asp.b], angle), devMinus1s: dm, dev0: d0, devPlus1s: dp }));
    }
  }
}
