/**
 * The Moon's solar elongation over the holdout's F2/A2 window, from an
 * ephemeris the holdout did not use, so the claim about the geometry does
 * not rest on the search's own report of it.
 */
import { Body, GeoVector, MakeTime } from 'astronomy-engine';
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = (a) => Math.sqrt(dot(a, a));
const start = Date.parse('1977-06-19T00:00:00Z');
const end = Date.parse('1978-04-15T00:00:00Z');
const STEP = 600000; // 10 minutes
const runs = [];
let open = null;
let globalMin = Infinity;
let globalMinAt = null;
let hoursBelow = 0;
for (let ms = start; ms <= end; ms += STEP) {
  const time = MakeTime(new Date(ms));
  const sun = GeoVector(Body.Sun, time, true);
  const moon = GeoVector(Body.Moon, time, true);
  const deg = (Math.acos(Math.min(1, Math.max(-1, dot(sun, moon) / (norm(sun) * norm(moon))))) * 180) / Math.PI;
  if (deg < globalMin) { globalMin = deg; globalMinAt = new Date(ms).toISOString(); }
  if (deg < 5) {
    hoursBelow += STEP / 3600000;
    if (open === null) open = { from: ms, min: deg };
    else open.min = Math.min(open.min, deg);
    open.to = ms;
  } else if (open !== null) { runs.push(open); open = null; }
}
if (open !== null) runs.push(open);
process.stdout.write(`F2/A2 window 1977-06-19 .. 1978-04-15, 10-minute steps\n`);
process.stdout.write(`passages below 5 degrees: ${runs.length}\n`);
process.stdout.write(`total time below 5 degrees: ${hoursBelow.toFixed(1)} hours = ${(hoursBelow / 24).toFixed(3)} days\n`);
process.stdout.write(`closest approach: ${globalMin.toFixed(4)} deg at ${globalMinAt}\n`);
for (const r of runs) {
  process.stdout.write(`  ${new Date(r.from).toISOString().slice(0, 16)} .. ${new Date(r.to).toISOString().slice(0, 16)}`
    + `  (${((r.to - r.from) / 3600000).toFixed(1)} h, min ${r.min.toFixed(4)} deg)\n`);
}
