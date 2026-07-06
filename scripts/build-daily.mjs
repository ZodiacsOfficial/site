/*
 * Computes today's sky for the daily horoscope layer: apparent
 * geocentric tropical longitudes at 12:00 UTC for the Sun through
 * Pluto plus the Moon, the lunar phase, and any same-day events pulled
 * from the committed monthly transit JSON. Output overwrites one file —
 * the repo carries today, git history carries the archive.
 *
 *   node scripts/build-daily.mjs              → src/data/daily.json (today, UTC)
 *   node scripts/build-daily.mjs 2026-07-06   → same, for an explicit date
 *
 * Deterministic for a given date (no generated-at stamp), so the daily
 * cron can commit-iff-changed and re-runs are no-ops.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  MakeTime, GeoVector, RotateVector, Rotation_EQJ_ECT, EclipticGeoMoon, Illumination, Body,
} from 'astronomy-engine';

const arg = process.argv[2];
if (arg && !/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
  console.error('Usage: node scripts/build-daily.mjs [YYYY-MM-DD]');
  process.exit(1);
}
const date = arg ?? new Date().toISOString().slice(0, 10);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'src/data/daily.json');

const SIGN_SLUGS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
const PLANETS = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

const norm = (x) => ((x % 360) + 360) % 360;

function lonAt(body, when) {
  const t = MakeTime(when);
  if (body === 'Moon') return norm(EclipticGeoMoon(t).lon);
  const vec = GeoVector(Body[body], t, true);
  const ecl = RotateVector(Rotation_EQJ_ECT(t), vec);
  return norm((Math.atan2(ecl.y, ecl.x) * 180) / Math.PI);
}

/** Same eight names and boundaries as src/lib/engine/lite.ts. */
function phaseName(angle) {
  if (angle < 22.5 || angle >= 337.5) return 'New Moon';
  if (angle < 67.5) return 'Waxing Crescent';
  if (angle < 112.5) return 'First Quarter';
  if (angle < 157.5) return 'Waxing Gibbous';
  if (angle < 202.5) return 'Full Moon';
  if (angle < 247.5) return 'Waning Gibbous';
  if (angle < 292.5) return 'Last Quarter';
  return 'Waning Crescent';
}

const noon = new Date(`${date}T12:00:00.000Z`);
const dayStart = new Date(`${date}T00:00:00.000Z`);
const dayEnd = new Date(dayStart.getTime() + 86400_000);

const bodies = ['Moon', ...PLANETS].map((body) => {
  const lon = lonAt(body, noon);
  // Retrograde when the longitude is decreasing across two hours.
  const ahead = lonAt(body, new Date(noon.getTime() + 7200_000));
  const delta = ((ahead - lon + 540) % 360) - 180;
  return {
    body,
    lon: Math.round(lon * 100) / 100,
    sign: SIGN_SLUGS[Math.floor(norm(lon) / 30)],
    degree: Math.round((norm(lon) % 30) * 10) / 10,
    retrograde: body === 'Moon' ? false : delta < 0,
  };
});

const sunLon = bodies.find((b) => b.body === 'Sun').lon;
const moonLon = bodies.find((b) => b.body === 'Moon').lon;
const phaseAngle = norm(moonLon - sunLon);
const illum = Illumination(Body.Moon, MakeTime(noon));

// Same-day events from the committed monthly file, when it exists.
let events = [];
try {
  const month = date.slice(0, 7);
  const monthly = JSON.parse(await readFile(resolve(root, `src/data/transits-${month}.json`), 'utf8'));
  const inDay = (at) => {
    const when = new Date(at);
    return when >= dayStart && when < dayEnd;
  };
  events = [
    ...monthly.ingresses.filter((e) => inDay(e.at)).map((e) => ({ kind: 'ingress', ...e })),
    ...monthly.lunations.filter((e) => inDay(e.at)).map((e) => ({ kind: 'lunation', ...e })),
    ...monthly.stations.filter((e) => inDay(e.at)).map((e) => ({ kind: 'station', ...e })),
    ...monthly.aspects.filter((e) => inDay(e.at)).map((e) => ({ kind: 'aspect', ...e })),
  ].sort((a, b) => a.at.localeCompare(b.at));
} catch {
  // No monthly file for this date — the daily still stands on positions.
}

const daily = {
  date,
  bodies,
  moon: {
    phase: phaseName(phaseAngle),
    illumination: Math.round(illum.phase_fraction * 1000) / 1000,
  },
  events,
};

await writeFile(out, `${JSON.stringify(daily, null, 2)}\n`);
console.log(`✓ src/data/daily.json — ${date}, ${bodies.length} bodies, ${events.length} events, ${daily.moon.phase}`);
