/*
 * Computes one month of real sky events for the horoscope pipeline:
 * sign ingresses (Sun–Pluto), new + full moons, stations, and exact
 * major aspects between the fast planets and the slow ones. The output
 * is committed JSON that horoscope copy must cite and the horoscope
 * pages render as their event list.
 *
 *   node scripts/build-transits.mjs 2026-07   →  src/data/transits-2026-07.json
 *
 * Same positional math as build-sky.mjs: apparent geocentric tropical
 * longitudes of date. Events are refined to the minute by bisection.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  MakeTime, GeoVector, RotateVector, Rotation_EQJ_ECT, EclipticGeoMoon, SearchMoonPhase,
} from 'astronomy-engine';

const month = process.argv[2];
if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? '')) {
  console.error('Usage: node scripts/build-transits.mjs YYYY-MM');
  process.exit(1);
}

const [year, mon] = month.split('-').map(Number);
const FROM = new Date(Date.UTC(year, mon - 1, 1));
const TO = new Date(Date.UTC(year, mon, 1));

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, `src/data/transits-${month}.json`);
await mkdir(dirname(out), { recursive: true });

const SIGN_SLUGS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
const PLANETS = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const FAST = ['Sun', 'Mercury', 'Venus', 'Mars'];
const SLOW = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const ASPECTS = [
  { type: 'conjunction', angle: 0 },
  { type: 'sextile', angle: 60 },
  { type: 'square', angle: 90 },
  { type: 'trine', angle: 120 },
  { type: 'opposition', angle: 180 },
];

const norm = (x) => ((x % 360) + 360) % 360;
/** Wrap to (−180, 180]. */
const wrap180 = (x) => {
  const w = norm(x);
  return w > 180 ? w - 360 : w;
};
const signAt = (lon) => SIGN_SLUGS[Math.floor(norm(lon) / 30)];
const degreeIn = (lon) => norm(lon) % 30;

function lonAt(body, date) {
  const t = MakeTime(date);
  if (body === 'Moon') return norm(EclipticGeoMoon(t).lon);
  const vec = GeoVector(body, t, true);
  const ecl = RotateVector(Rotation_EQJ_ECT(t), vec);
  return norm((Math.atan2(ecl.y, ecl.x) * 180) / Math.PI);
}

function speedAt(body, date) {
  const h = 0.25; // days
  const before = lonAt(body, new Date(date.getTime() - h * 86400_000));
  const after = lonAt(body, new Date(date.getTime() + h * 86400_000));
  return wrap180(after - before) / (2 * h);
}

/** Bisect a boolean predicate flip between lo (false) and hi (true). */
function refine(lo, hi, flipped) {
  for (let i = 0; i < 20; i += 1) {
    const mid = new Date((lo.getTime() + hi.getTime()) / 2);
    if (flipped(mid)) hi = mid; else lo = mid;
  }
  return hi;
}

const DAY = 86400_000;

// ── Ingresses: sign-index changes, either direction ──────────────────
const ingresses = [];
for (const planet of PLANETS) {
  let prev = signAt(lonAt(planet, FROM));
  for (let t = FROM.getTime() + DAY; t <= TO.getTime(); t += DAY) {
    const date = new Date(t);
    const sign = signAt(lonAt(planet, date));
    if (sign !== prev) {
      const at = refine(new Date(t - DAY), date, (d) => signAt(lonAt(planet, d)) !== prev);
      if (at >= FROM && at < TO) {
        ingresses.push({
          planet,
          at: at.toISOString(),
          sign: signAt(lonAt(planet, at)),
          retrograde: speedAt(planet, at) < 0,
        });
      }
      prev = sign;
    }
  }
}

// ── Lunations: new + full moons with sign + degree ────────────────────
const lunations = [];
for (const [targetLon, type] of [[0, 'new'], [180, 'full']]) {
  let cursor = MakeTime(new Date(FROM.getTime() - DAY));
  while (true) {
    const found = SearchMoonPhase(targetLon, cursor, 40);
    if (!found || found.date >= TO) break;
    if (found.date >= FROM) {
      const lon = lonAt('Moon', found.date);
      lunations.push({
        type,
        at: found.date.toISOString(),
        sign: signAt(lon),
        degree: Math.round(degreeIn(lon) * 10) / 10,
      });
    }
    cursor = found.AddDays(1);
  }
}

// ── Stations: longitude-speed sign changes ────────────────────────────
const stations = [];
for (const planet of PLANETS) {
  if (planet === 'Sun') continue; // never stations
  let prevRetro = speedAt(planet, FROM) < 0;
  for (let t = FROM.getTime() + DAY; t <= TO.getTime(); t += DAY) {
    const date = new Date(t);
    const retro = speedAt(planet, date) < 0;
    if (retro !== prevRetro) {
      const at = refine(new Date(t - DAY), date, (d) => (speedAt(planet, d) < 0) === retro);
      if (at >= FROM && at < TO) {
        const lon = lonAt(planet, at);
        stations.push({
          planet,
          at: at.toISOString(),
          type: retro ? 'retrograde' : 'direct',
          sign: signAt(lon),
          degree: Math.round(degreeIn(lon) * 10) / 10,
        });
      }
      prevRetro = retro;
    }
  }
}

// ── Exact aspects: fast × slow and slow × slow, majors only ───────────
// For each pair, g(t) = wrap180(lonA − lonB). An aspect of angle A is
// exact when g crosses +A or −A. Daily samples catch every crossing
// (the fastest pair drifts ~1.3°/day); each is bisected to the minute.
const pairs = [
  ...FAST.flatMap((a) => SLOW.map((b) => [a, b])),
  ...SLOW.flatMap((a, i) => SLOW.slice(i + 1).map((b) => [a, b])),
];
const aspects = [];
for (const [a, b] of pairs) {
  const targets = new Set();
  for (const { angle } of ASPECTS) {
    targets.add(angle);
    if (angle !== 0 && angle !== 180) targets.add(-angle);
  }
  for (const target of targets) {
    const h = (d) => wrap180(lonAt(a, d) - lonAt(b, d) - target);
    let prev = h(FROM);
    for (let t = FROM.getTime() + DAY; t <= TO.getTime(); t += DAY) {
      const date = new Date(t);
      const cur = h(date);
      // A true zero crossing, not the ±180 wrap seam.
      if (Math.sign(cur) !== Math.sign(prev) && Math.abs(cur) < 90 && Math.abs(prev) < 90) {
        const rising = cur > prev;
        const at = refine(new Date(t - DAY), date, (d) => (h(d) > 0) === rising);
        if (at >= FROM && at < TO) {
          const lonA = lonAt(a, at);
          const lonB = lonAt(b, at);
          aspects.push({
            a,
            b,
            type: ASPECTS.find((x) => x.angle === Math.abs(target)).type,
            at: at.toISOString(),
            aSign: signAt(lonA),
            aDegree: Math.round(degreeIn(lonA) * 10) / 10,
            bSign: signAt(lonB),
            bDegree: Math.round(degreeIn(lonB) * 10) / 10,
          });
        }
      }
      prev = cur;
    }
  }
  console.log(`${a}–${b}: scanned`);
}

const byTime = (x, y) => x.at.localeCompare(y.at);
const payload = {
  month,
  generatedAt: new Date().toISOString(),
  ingresses: ingresses.sort(byTime),
  lunations: lunations.sort(byTime),
  stations: stations.sort(byTime),
  aspects: aspects.sort(byTime),
};
await writeFile(out, JSON.stringify(payload, null, 2) + '\n');
console.log(
  `Done — ${ingresses.length} ingresses, ${lunations.length} lunations, ` +
  `${stations.length} stations, ${aspects.length} exact aspects → src/data/transits-${month}.json`,
);
