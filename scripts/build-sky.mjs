/*
 * Precomputes the sky data the homepage needs without shipping the
 * ephemeris there: retrograde windows for Mercury–Pluto and the list of
 * new/full moons over a two-year window.
 *
 *   npm run data:sky   →  src/data/sky.json
 *
 * The homepage's SkyTicker island reads this at build time; its own
 * lite Sun/Moon math covers the live positions. Re-run yearly (or wire
 * a cron) so the window stays ahead of the calendar.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  MakeTime, GeoVector, RotateVector, Rotation_EQJ_ECT, SearchMoonPhase,
} from 'astronomy-engine';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'src/data/sky.json');
await mkdir(dirname(out), { recursive: true });

const FROM = new Date('2026-01-01T00:00:00Z');
const TO = new Date('2028-01-01T00:00:00Z');
const PLANETS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

function lonAt(body, date) {
  const t = MakeTime(date);
  const vec = GeoVector(body, t, true);
  const ecl = RotateVector(Rotation_EQJ_ECT(t), vec);
  const lon = (Math.atan2(ecl.y, ecl.x) * 180) / Math.PI;
  return ((lon % 360) + 360) % 360;
}

// Signed longitude speed (deg/day) via central difference.
function speedAt(body, date) {
  const h = 0.25; // days
  const before = lonAt(body, new Date(date.getTime() - h * 86400_000));
  const after = lonAt(body, new Date(date.getTime() + h * 86400_000));
  let d = after - before;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d / (2 * h);
}

// ── Retrograde windows (daily scan, refined to the hour) ─────────────
function refine(body, lo, hi, wantRetro) {
  // Binary search for the sign change of the speed between lo and hi.
  for (let i = 0; i < 16; i += 1) {
    const mid = new Date((lo.getTime() + hi.getTime()) / 2);
    if ((speedAt(body, mid) < 0) === wantRetro) hi = mid; else lo = mid;
  }
  return hi;
}

const retrogrades = [];
for (const body of PLANETS) {
  let prevRetro = speedAt(body, FROM) < 0;
  let openStart = prevRetro ? FROM : null;
  for (let t = FROM.getTime() + 86400_000; t <= TO.getTime(); t += 86400_000) {
    const date = new Date(t);
    const retro = speedAt(body, date) < 0;
    if (retro !== prevRetro) {
      const boundary = refine(body, new Date(t - 86400_000), date, retro);
      if (retro) openStart = boundary;
      else {
        retrogrades.push({ planet: body, from: openStart?.toISOString() ?? FROM.toISOString(), to: boundary.toISOString() });
        openStart = null;
      }
      prevRetro = retro;
    }
  }
  if (openStart) retrogrades.push({ planet: body, from: openStart.toISOString(), to: null });
  console.log(`${body}: scanned`);
}
retrogrades.sort((a, b) => a.from.localeCompare(b.from));

// ── New + full moons ──────────────────────────────────────────────────
const moons = [];
for (const [targetLon, type] of [[0, 'new'], [180, 'full']]) {
  let cursor = MakeTime(FROM);
  while (true) {
    const found = SearchMoonPhase(targetLon, cursor, 40);
    if (!found || found.date >= TO) break;
    moons.push({ type, at: found.date.toISOString() });
    cursor = found.AddDays(1);
  }
}
moons.sort((a, b) => a.at.localeCompare(b.at));

const payload = {
  generatedAt: new Date().toISOString(),
  from: FROM.toISOString(),
  to: TO.toISOString(),
  retrogrades,
  moons,
};
await writeFile(out, JSON.stringify(payload, null, 2) + '\n');
console.log(`Done — ${retrogrades.length} retrograde windows, ${moons.length} lunations → src/data/sky.json`);
