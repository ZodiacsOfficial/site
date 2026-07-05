/**
 * The full chart engine. THIS IS THE ONLY MODULE THAT MAY IMPORT
 * 'astronomy-engine' — everything else lazy-imports this file so the
 * ephemeris never reaches the homepage bundle.
 *
 * Positions are apparent geocentric tropical longitudes of date:
 * planets via GeoVector (light-time + aberration) rotated EQJ→ECT
 * (true ecliptic/equinox of date, so nutation is included); the Moon
 * via EclipticGeoMoon (documented for exactly this use); the True Node
 * from the instantaneous lunar orbit plane (h = r × v).
 */
import {
  Body,
  GeoVector,
  RotateVector,
  Rotation_EQJ_ECT,
  EclipticGeoMoon,
  GeoMoonState,
  SiderealTime,
  MakeTime,
  Vector,
} from 'astronomy-engine';

import type {
  BodyName, BodyPosition, Chart, ChartInput, ChartFlag,
} from './types';
import { ENGINE_VERSION } from './types';
import { computeAngles, computeHouses, meanObliquity, norm } from './houses';
import { findAspects } from './aspects';

const RAD = 180 / Math.PI;

const PLANETS: { name: BodyName; body: Body }[] = [
  { name: 'Sun', body: Body.Sun },
  { name: 'Mercury', body: Body.Mercury },
  { name: 'Venus', body: Body.Venus },
  { name: 'Mars', body: Body.Mars },
  { name: 'Jupiter', body: Body.Jupiter },
  { name: 'Saturn', body: Body.Saturn },
  { name: 'Uranus', body: Body.Uranus },
  { name: 'Neptune', body: Body.Neptune },
  { name: 'Pluto', body: Body.Pluto },
];

function eclipticOfDate(body: Body, date: Date): { lon: number; lat: number } {
  const t = MakeTime(date);
  const vec = GeoVector(body, t, true);
  const ecl = RotateVector(Rotation_EQJ_ECT(t), vec);
  const lon = norm(Math.atan2(ecl.y, ecl.x) * RAD);
  const lat = Math.asin(ecl.z / Math.hypot(ecl.x, ecl.y, ecl.z)) * RAD;
  return { lon, lat };
}

function moonOfDate(date: Date): { lon: number; lat: number } {
  const m = EclipticGeoMoon(MakeTime(date));
  return { lon: norm(m.lon), lat: m.lat };
}

/** True lunar node: ascending node of the instantaneous orbit plane. */
function trueNodeLongitude(date: Date): number {
  const t = MakeTime(date);
  const state = GeoMoonState(t);
  // Angular momentum in EQJ…
  const h = {
    x: state.y * state.vz - state.z * state.vy,
    y: state.z * state.vx - state.x * state.vz,
    z: state.x * state.vy - state.y * state.vx,
  };
  // …rotated to the true ecliptic of date.
  const hEct = RotateVector(Rotation_EQJ_ECT(t), new Vector(h.x, h.y, h.z, t));
  // Ascending node line: n = ẑ × h.
  const nx = -hEct.y;
  const ny = hEct.x;
  return norm(Math.atan2(ny, nx) * RAD);
}

function lonAt(name: BodyName, date: Date): number {
  if (name === 'Moon') return moonOfDate(date).lon;
  if (name === 'North Node') return trueNodeLongitude(date);
  if (name === 'South Node') return norm(trueNodeLongitude(date) + 180);
  const planet = PLANETS.find((p) => p.name === name);
  if (!planet) throw new Error(`Unknown body: ${name}`);
  return eclipticOfDate(planet.body, date).lon;
}

/** Longitude speed in degrees/day by central difference (±6h). */
export function longitudeSpeed(name: BodyName, date: Date): number {
  const h = 0.25;
  const before = lonAt(name, new Date(date.getTime() - h * 86400_000));
  const after = lonAt(name, new Date(date.getTime() + h * 86400_000));
  let d = after - before;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d / (2 * h);
}

export function computeBodies(date: Date): BodyPosition[] {
  const out: BodyPosition[] = [];

  for (const { name, body } of PLANETS) {
    const { lon, lat } = eclipticOfDate(body, date);
    const speed = longitudeSpeed(name, date);
    out.push({ body: name, lon, lat, speed, retrograde: speed < 0 });
  }

  const moon = moonOfDate(date);
  const moonSpeed = longitudeSpeed('Moon', date);
  // Moon sits after Sun in display order.
  out.splice(1, 0, {
    body: 'Moon', lon: moon.lon, lat: moon.lat, speed: moonSpeed, retrograde: false,
  });

  const nodeLon = trueNodeLongitude(date);
  const nodeSpeed = longitudeSpeed('North Node', date);
  out.push(
    { body: 'North Node', lon: nodeLon, lat: 0, speed: nodeSpeed, retrograde: nodeSpeed < 0 },
    { body: 'South Node', lon: norm(nodeLon + 180), lat: 0, speed: nodeSpeed, retrograde: nodeSpeed < 0 },
  );

  return out;
}

/** Julian centuries TT since J2000 (UT≈TT is fine at obliquity precision). */
function centuriesSinceJ2000(date: Date): number {
  return (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (86400_000 * 36525);
}

export function computeChart(input: ChartInput): Chart {
  const flags: ChartFlag[] = [...(input.flags ?? [])];
  const bodies = computeBodies(input.utc);

  let angles = null;
  let houses = null;

  if (input.timeKnown && input.latitude !== undefined && input.longitude !== undefined) {
    const gastHours = SiderealTime(MakeTime(input.utc));
    const obliquity = meanObliquity(centuriesSinceJ2000(input.utc));
    const angleInput = {
      gastHours,
      latitude: input.latitude,
      longitude: input.longitude,
      obliquity,
    };
    angles = computeAngles(angleInput);
    const result = computeHouses(input.houseSystem, angleInput, angles);
    houses = result.houses;
    if (result.fellBack) flags.push('polar-fallback');
  } else if (!input.timeKnown) {
    flags.push('no-time');
  }

  return {
    input,
    bodies,
    angles,
    houses,
    aspects: findAspects(bodies),
    flags,
    engineVersion: ENGINE_VERSION,
  };
}
