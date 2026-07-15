/**
 * Node-only ephemeris primitives for serverless functions.
 *
 * `@zodiacs/engine` is browser-first ESM and imports named values from the
 * dual-mode `astronomy-engine` package. Vercel externalizes that dependency as
 * CommonJS, so this boundary deliberately selects its `require` export and
 * avoids relying on synthetic named exports.
 */
import { createRequire } from 'node:module';
import type * as AstronomyEngine from 'astronomy-engine';
import type { BodyName } from './types';

const require = createRequire(import.meta.url);
const Astronomy = require('astronomy-engine') as typeof AstronomyEngine;
const RAD = 180 / Math.PI;
const DAY = 86_400_000;

const PLANETS = [
  { name: 'Sun', body: Astronomy.Body.Sun },
  { name: 'Mercury', body: Astronomy.Body.Mercury },
  { name: 'Venus', body: Astronomy.Body.Venus },
  { name: 'Mars', body: Astronomy.Body.Mars },
  { name: 'Jupiter', body: Astronomy.Body.Jupiter },
  { name: 'Saturn', body: Astronomy.Body.Saturn },
  { name: 'Uranus', body: Astronomy.Body.Uranus },
  { name: 'Neptune', body: Astronomy.Body.Neptune },
  { name: 'Pluto', body: Astronomy.Body.Pluto },
] as const;

function normalizeLongitude(value: number): number {
  return ((value % 360) + 360) % 360;
}

function eclipticLongitude(
  body: AstronomyEngine.Body,
  date: Date,
): number {
  const time = Astronomy.MakeTime(date);
  const equatorial = Astronomy.GeoVector(body, time, true);
  const ecliptic = Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECT(time), equatorial);
  return normalizeLongitude(Math.atan2(ecliptic.y, ecliptic.x) * RAD);
}

function trueNodeLongitude(date: Date): number {
  const time = Astronomy.MakeTime(date);
  const state = Astronomy.GeoMoonState(time);
  const angularMomentum = {
    x: state.y * state.vz - state.z * state.vy,
    y: state.z * state.vx - state.x * state.vz,
    z: state.x * state.vy - state.y * state.vx,
  };
  const eclipticMomentum = Astronomy.RotateVector(
    Astronomy.Rotation_EQJ_ECT(time),
    new Astronomy.Vector(
      angularMomentum.x,
      angularMomentum.y,
      angularMomentum.z,
      time,
    ),
  );
  return normalizeLongitude(Math.atan2(eclipticMomentum.x, -eclipticMomentum.y) * RAD);
}

export function bodyLongitude(body: BodyName, date: Date): number {
  if (body === 'Moon') {
    return normalizeLongitude(Astronomy.EclipticGeoMoon(Astronomy.MakeTime(date)).lon);
  }
  if (body === 'North Node') return trueNodeLongitude(date);
  if (body === 'South Node') return normalizeLongitude(trueNodeLongitude(date) + 180);

  const planet = PLANETS.find((candidate) => candidate.name === body);
  if (!planet) throw new RangeError(`Unknown body: ${body}`);
  return eclipticLongitude(planet.body, date);
}

/** Longitude speed in degrees/day by central difference (±6h). */
export function longitudeSpeed(body: BodyName, date: Date): number {
  const before = bodyLongitude(body, new Date(date.getTime() - 0.25 * DAY));
  const after = bodyLongitude(body, new Date(date.getTime() + 0.25 * DAY));
  let difference = after - before;
  if (difference > 180) difference -= 360;
  if (difference < -180) difference += 360;
  return difference / 0.5;
}
