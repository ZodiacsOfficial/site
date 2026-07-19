/**
 * Independent astronomy audit for committed daily facts and monthly events.
 *
 * This intentionally does not import the daily snapshot builder. It repeats
 * the small set of astronomical checks from the published inputs so a defect
 * in the writer cannot automatically bless its own output.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  Body,
  EclipticGeoMoon,
  GeoVector,
  Illumination,
  MakeTime,
  RotateVector,
  Rotation_EQJ_ECT,
} from 'astronomy-engine';

const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
const BODIES = ['Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const PLANETS = BODIES.filter((name) => name !== 'Moon');
const ASPECT_ANGLES = new Map([
  ['conjunction', 0],
  ['sextile', 60],
  ['square', 90],
  ['trine', 120],
  ['opposition', 180],
]);
const EVENT_ARRAYS = [
  ['ingresses', 'ingress'],
  ['lunations', 'lunation'],
  ['stations', 'station'],
  ['aspects', 'aspect'],
];

const norm = (value) => ((value % 360) + 360) % 360;
const wrap180 = (value) => {
  const wrapped = norm(value);
  return wrapped > 180 ? wrapped - 360 : wrapped;
};
const signAt = (longitude) => SIGNS[Math.floor(norm(longitude) / 30)];
const degreeAt = (longitude) => norm(longitude) % 30;
const near = (left, right, tolerance) => Math.abs(left - right) <= tolerance;

function longitudeAt(body, when) {
  const time = MakeTime(when);
  if (body === 'Moon') return norm(EclipticGeoMoon(time).lon);
  const vector = GeoVector(Body[body], time, true);
  const ecliptic = RotateVector(Rotation_EQJ_ECT(time), vector);
  return norm((Math.atan2(ecliptic.y, ecliptic.x) * 180) / Math.PI);
}

/** Centered numerical derivative, close to instantaneous speed at `when`. */
function speedAt(body, when) {
  const halfWindowMs = 0.01 * 86_400_000;
  const before = longitudeAt(body, new Date(when.getTime() - halfWindowMs));
  const after = longitudeAt(body, new Date(when.getTime() + halfWindowMs));
  return wrap180(after - before) / 0.02;
}

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

const failure = (ruleId, path, message) => ({ ruleId, path, message });

function canonicalInstant(value) {
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value ? null : parsed;
}

function auditEventPhysics(event, path) {
  const failures = [];
  const when = canonicalInstant(event.at);
  if (!when) return [failure('ASTRO-EVENT-INSTANT', `${path}.at`, 'event instant is not canonical ISO UTC')];

  if (event.kind === 'ingress') {
    if (!PLANETS.includes(event.planet)) return [failure('ASTRO-EVENT-BODY', `${path}.planet`, 'unknown ingress body')];
    const longitude = longitudeAt(event.planet, when);
    const boundaryDistance = Math.min(degreeAt(longitude), 30 - degreeAt(longitude));
    if (signAt(longitude) !== event.sign || boundaryDistance > 0.02) {
      failures.push(failure('ASTRO-INGRESS', path, 'ingress sign/time does not land on the stated boundary'));
    }
    if (typeof event.retrograde !== 'boolean' || event.retrograde !== (speedAt(event.planet, when) < 0)) {
      failures.push(failure('ASTRO-INGRESS-DIRECTION', `${path}.retrograde`, 'ingress direction disagrees with centered speed'));
    }
  } else if (event.kind === 'lunation') {
    const moon = longitudeAt('Moon', when);
    const sun = longitudeAt('Sun', when);
    const target = event.type === 'new' ? 0 : 180;
    const separation = Math.abs(wrap180(moon - sun));
    if (Math.abs(separation - target) > 0.02) {
      failures.push(failure('ASTRO-LUNATION-PHASE', path, 'lunation instant is not astronomically exact'));
    }
    if (signAt(moon) !== event.sign || !near(degreeAt(moon), event.degree, 0.051)) {
      failures.push(failure('ASTRO-LUNATION-COORDINATE', path, 'lunation coordinate disagrees with the Moon'));
    }
  } else if (event.kind === 'station') {
    if (!PLANETS.includes(event.planet) || event.planet === 'Sun') {
      return [failure('ASTRO-EVENT-BODY', `${path}.planet`, 'unknown or impossible station body')];
    }
    const longitude = longitudeAt(event.planet, when);
    const before = speedAt(event.planet, new Date(when.getTime() - 6 * 3_600_000));
    const after = speedAt(event.planet, new Date(when.getTime() + 6 * 3_600_000));
    const expectedTurn = event.type === 'retrograde' ? before >= 0 && after < 0 : before < 0 && after >= 0;
    if (Math.abs(speedAt(event.planet, when)) > 0.02 || !expectedTurn) {
      failures.push(failure('ASTRO-STATION-DIRECTION', path, 'station time/direction disagrees with centered speed'));
    }
    if (signAt(longitude) !== event.sign || !near(degreeAt(longitude), event.degree, 0.051)) {
      failures.push(failure('ASTRO-STATION-COORDINATE', path, 'station coordinate disagrees with the body'));
    }
  } else if (event.kind === 'aspect') {
    if (!PLANETS.includes(event.a) || !PLANETS.includes(event.b) || event.a === event.b) {
      return [failure('ASTRO-EVENT-BODY', path, 'aspect participants are invalid')];
    }
    const target = ASPECT_ANGLES.get(event.type);
    if (target === undefined) return [failure('ASTRO-ASPECT-TYPE', `${path}.type`, 'unknown aspect type')];
    const aLongitude = longitudeAt(event.a, when);
    const bLongitude = longitudeAt(event.b, when);
    const separation = Math.abs(wrap180(aLongitude - bLongitude));
    if (Math.abs(separation - target) > 0.02) {
      failures.push(failure('ASTRO-ASPECT-ANGLE', path, 'aspect instant is not astronomically exact'));
    }
    for (const [prefix, longitude] of [['a', aLongitude], ['b', bLongitude]]) {
      if (event[`${prefix}Sign`] !== signAt(longitude)
        || !near(event[`${prefix}Degree`], degreeAt(longitude), 0.051)) {
        failures.push(failure('ASTRO-ASPECT-COORDINATE', `${path}.${prefix}`, 'aspect coordinate disagrees with the body'));
      }
    }
  }
  return failures;
}
export async function readAndAuditTransitMonth(month, repoRoot) {
  const relativePath = `src/data/transits-${month}.json`;
  let raw;
  try {
    raw = await readFile(resolve(repoRoot, relativePath), 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return { source: null, events: [], failures: [] };
    }
    throw error;
  }
  let source;
  try {
    source = JSON.parse(raw);
  } catch (error) {
    return {
      source: null,
      events: [],
      failures: [failure('ASTRO-SOURCE-JSON', relativePath, `invalid JSON: ${error instanceof Error ? error.message : String(error)}`)],
    };
  }
  const failures = [];
  const events = [];
  if (source?.month !== month) failures.push(failure('ASTRO-SOURCE-MONTH', `${relativePath}.month`, `expected ${month}`));
  for (const [arrayName, kind] of EVENT_ARRAYS) {
    if (!Array.isArray(source?.[arrayName])) {
      failures.push(failure('ASTRO-SOURCE-SHAPE', `${relativePath}.${arrayName}`, 'expected an array'));
      continue;
    }
    let previous = '';
    source[arrayName].forEach((value, index) => {
      const event = { kind, ...value };
      const path = `${relativePath}.${arrayName}[${index}]`;
      events.push(event);
      if (typeof event.at !== 'string' || event.at.slice(0, 7) !== month || event.at < previous) {
        failures.push(failure('ASTRO-SOURCE-ORDER', path, 'event must be in-month and sorted'));
      }
      previous = event.at ?? previous;
      failures.push(...auditEventPhysics(event, path));
    });
  }
  const identities = events.map((event) => JSON.stringify(event));
  if (new Set(identities).size !== identities.length) {
    failures.push(failure('ASTRO-SOURCE-DUPLICATE', relativePath, 'monthly source contains duplicate events'));
  }
  return { source, events, failures };
}

export async function auditDailyAstronomy(daily, repoRoot) {
  const failures = [];
  const noon = new Date(`${daily.date}T12:00:00.000Z`);
  if (Number.isNaN(noon.getTime()) || noon.toISOString().slice(0, 10) !== daily.date) {
    return [failure('ASTRO-DATE', 'daily.date', 'daily date is not a real UTC day')];
  }

  const exact = new Map();
  for (const body of daily.bodies ?? []) {
    if (!BODIES.includes(body.body)) continue;
    const longitude = longitudeAt(body.body, noon);
    exact.set(body.body, longitude);
    if (!near(body.lon, longitude, 1e-9)) {
      failures.push(failure('ASTRO-BODY-LONGITUDE', `daily.bodies.${body.body}.lon`, 'longitude differs from independent recomputation'));
    }
    if (body.sign !== signAt(longitude) || !near(body.degree, degreeAt(longitude), 1e-9)) {
      failures.push(failure('ASTRO-BODY-COORDINATE', `daily.bodies.${body.body}`, 'sign/degree differs from independent recomputation'));
    }
    if (body.retrograde !== (body.body !== 'Moon' && speedAt(body.body, noon) < 0)) {
      failures.push(failure('ASTRO-BODY-DIRECTION', `daily.bodies.${body.body}.retrograde`, 'retrograde state differs from centered speed'));
    }
  }
  if (exact.has('Moon') && exact.has('Sun')) {
    const phase = phaseName(norm(exact.get('Moon') - exact.get('Sun')));
    const illumination = Math.round(Illumination(Body.Moon, MakeTime(noon)).phase_fraction * 1000) / 1000;
    if (daily.moon?.phase !== phase) failures.push(failure('ASTRO-MOON-PHASE', 'daily.moon.phase', `expected ${phase}`));
    if (daily.moon?.illumination !== illumination) {
      failures.push(failure('ASTRO-MOON-ILLUMINATION', 'daily.moon.illumination', `expected ${illumination}`));
    }
  }

  const month = daily.date.slice(0, 7);
  const audited = await readAndAuditTransitMonth(month, repoRoot);
  failures.push(...audited.failures);
  const expectedEvents = audited.events
    .filter((event) => event.at?.slice(0, 10) === daily.date)
    .sort((left, right) => left.at.localeCompare(right.at));
  if (audited.source === null) {
    if (daily.eventsCoverage !== 'unavailable' || daily.eventsSource !== null || (daily.events?.length ?? 0) !== 0) {
      failures.push(failure('ASTRO-EVENT-COVERAGE', 'daily.events', 'missing monthly source must be disclosed as unavailable'));
    }
  } else {
    const expectedSource = `src/data/transits-${month}.json`;
    if (daily.eventsCoverage !== 'complete' || daily.eventsSource !== expectedSource) {
      failures.push(failure('ASTRO-EVENT-COVERAGE', 'daily.eventsSource', `expected complete coverage from ${expectedSource}`));
    }
    if (JSON.stringify(daily.events ?? []) !== JSON.stringify(expectedEvents)) {
      failures.push(failure('ASTRO-EVENT-SLICE', 'daily.events', 'daily events differ from the audited monthly day slice'));
    }
  }
  return failures;
}
