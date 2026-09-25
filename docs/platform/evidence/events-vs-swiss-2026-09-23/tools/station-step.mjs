/**
 * Does the speed step move the published stations closer to Swiss?
 *
 *   node docs/platform/evidence/events-vs-swiss-2026-09-23/tools/station-step.mjs
 *
 * Finds each of the 92 stations in deltas.json twice, with the same longitude
 * function and bisection as scripts/build-sky.mjs: once with its ±0.25-day
 * central difference and once with the ±0.001-day step @zodiacs/engine uses
 * since 0.1.1-rc.7. The shift between the two is added to the station's
 * measured difference from Swiss, so no Swiss call is repeated. Prints each
 * planet's largest and RMS difference from Swiss, in minutes, for both steps.
 * Reads the repository only; writes nothing.
 */
import { readFileSync } from 'node:fs';
import { GeoVector, MakeTime, RotateVector, Rotation_EQJ_ECT } from 'astronomy-engine';

const DAY = 86_400_000;
const deltas = JSON.parse(readFileSync(new URL('../deltas.json', import.meta.url), 'utf8')).deltas
  .filter((row) => row.family === 'station');

function lonAt(body, date) {
  const time = MakeTime(date);
  const ecliptic = RotateVector(Rotation_EQJ_ECT(time), GeoVector(body, time, true));
  return (((Math.atan2(ecliptic.y, ecliptic.x) * 180) / Math.PI) % 360 + 360) % 360;
}

function speedAt(body, date, stepDays) {
  let difference = lonAt(body, new Date(date.getTime() + stepDays * DAY))
    - lonAt(body, new Date(date.getTime() - stepDays * DAY));
  if (difference > 180) difference -= 360;
  if (difference < -180) difference += 360;
  return difference / (2 * stepDays);
}

/** The speed's sign change within half a day of the published instant. */
function station(body, published, retrograde, stepDays) {
  let lo = new Date(published.getTime() - DAY / 2);
  let hi = new Date(published.getTime() + DAY / 2);
  for (let i = 0; i < 32; i += 1) {
    const mid = new Date((lo.getTime() + hi.getTime()) / 2);
    if ((speedAt(body, mid, stepDays) < 0) === retrograde) hi = mid; else lo = mid;
  }
  return hi;
}

const planets = new Map();
for (const row of deltas) {
  const [name, , direction] = row.id.split('-');
  const body = name[0].toUpperCase() + name.slice(1);
  const published = new Date(row.published);
  const coarse = station(body, published, direction === 'retrograde', 0.25);
  const fine = station(body, published, direction === 'retrograde', 0.001);
  const shift = (fine.getTime() - coarse.getTime()) / 1000;
  const entry = planets.get(body) ?? { n: 0, coarse: [], fine: [], shift: 0 };
  entry.n += 1;
  entry.coarse.push(Math.abs(row.deltaSeconds));
  entry.fine.push(Math.abs(row.deltaSeconds + shift));
  entry.shift = Math.max(entry.shift, Math.abs(shift));
  planets.set(body, entry);
}

const minutes = (seconds) => (seconds / 60).toFixed(2);
const rms = (values) => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
console.log('planet    n   largest ±0.25 d → ±0.001 d   RMS ±0.25 d → ±0.001 d   largest shift');
for (const [body, entry] of planets) {
  console.log(`${body.padEnd(8)} ${String(entry.n).padStart(2)}   `
    + `${minutes(Math.max(...entry.coarse)).padStart(6)} → ${minutes(Math.max(...entry.fine)).padEnd(6)} min      `
    + `${minutes(rms(entry.coarse)).padStart(6)} → ${minutes(rms(entry.fine)).padEnd(6)} min   `
    + `${entry.shift.toFixed(1)} s`);
}
