/**
 * How often is each charted body inside the deflection profile's five-degree
 * solar-elongation floor?
 *
 * Daily samples, 1900-01-01 to 2100-01-01, from `astronomy-engine` through
 * the same call the production engine makes -- GeoVector(body, time, true),
 * light-time and aberration applied -- so the elongation is the one a chart
 * would actually present the profile with.
 *
 * Daily sampling UNDERSTATES nothing and OVERSTATES nothing about the
 * fraction of days: it is the fraction of sampled days, and for Mercury,
 * whose elongation moves about 1.5 deg/day near conjunction, a sub-day
 * excursion below the floor can be missed. The number is a proportion of
 * days, not a proof of one.
 */
import { Body, GeoVector, MakeTime } from 'astronomy-engine';

const BODIES = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Moon'];
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = (a) => Math.sqrt(dot(a, a));

const start = Date.UTC(1900, 0, 1);
const days = 73050;
const counts = new Map(BODIES.map((b) => [b, { below: 0, min: Infinity, total: 0 }]));
let anyDays = 0;
const histogram = new Map();

for (let i = 0; i < days; i += 1) {
  const time = MakeTime(new Date(start + i * 86400000));
  const sun = GeoVector(Body.Sun, time, true);
  const sn = norm(sun);
  let onThisDay = 0;
  for (const name of BODIES) {
    const v = GeoVector(Body[name], time, true);
    const cos = dot(sun, v) / (sn * norm(v));
    const deg = (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
    const c = counts.get(name);
    c.total += 1;
    if (deg < 5) { c.below += 1; onThisDay += 1; }
    if (deg < c.min) c.min = deg;
  }
  if (onThisDay > 0) anyDays += 1;
  histogram.set(onThisDay, (histogram.get(onThisDay) ?? 0) + 1);
}

process.stdout.write(`days with at least one body inside the floor: ${anyDays} of ${days}, ${((100 * anyDays) / days).toFixed(3)} per cent\n`);
for (const k of [...histogram.keys()].sort((a, b) => a - b)) {
  process.stdout.write(`  ${k} bodies inside: ${histogram.get(k)} days (${((100 * histogram.get(k)) / days).toFixed(3)} per cent)\n`);
}
process.stdout.write('body       days<5deg   of      percent   min elongation\n');
for (const [name, c] of counts) {
  process.stdout.write(`${name.padEnd(10)} ${String(c.below).padStart(8)} ${String(c.total).padStart(8)}  ${((100 * c.below) / c.total).toFixed(3).padStart(7)}%  ${c.min.toFixed(4)} deg\n`);
}
