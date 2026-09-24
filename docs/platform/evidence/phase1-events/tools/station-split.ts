/**
 * PROTOTYPE for step 1.6 (not site code). Station-split longitude crossings,
 * lifted from src/lib/engine/transit-scan-core.ts:192-268 and :313-334 so that
 * returns.ts / year-scan.ts get the same guarantee the transit scanner has.
 */
import { findLongitudeCrossingsWith, type LongitudeCrossing } from '<base>/src/lib/engine/longitude-crossings';
import type { BodyName } from '<base>/src/lib/engine/types';

const DAY = 86_400_000;
const MINUTE = 60_000;

export interface CrossingEphemeris {
  bodyLongitude(body: BodyName, date: Date): number;
  longitudeSpeed(body: BodyName, date: Date): number;
}

function signedAngularDelta(referenceLon: number, lon: number): number {
  return ((((lon - referenceLon + 540) % 360) + 360) % 360) - 180;
}
function angularError(targetLon: number, lon: number): number {
  return Math.abs((((lon - targetLon + 540) % 360) + 360) % 360 - 180);
}

function refineLongitudeExtremum(eph: CrossingEphemeris, body: BodyName, fromMs: number, toMs: number, maximize: boolean): Date {
  const referenceLon = eph.bodyLongitude(body, new Date((fromMs + toMs) / 2));
  const valueAt = (time: number) => referenceLon + signedAngularDelta(referenceLon, eph.bodyLongitude(body, new Date(time)));
  let lo = fromMs;
  let hi = toMs;
  for (let i = 0; i < 56; i += 1) {
    const third = (hi - lo) / 3;
    const left = lo + third;
    const right = hi - third;
    if (maximize ? valueAt(left) < valueAt(right) : valueAt(left) > valueAt(right)) lo = left;
    else hi = right;
  }
  const center = Math.round((lo + hi) / 2);
  let bestMs = center;
  let bestValue = valueAt(center);
  for (let offset = -3; offset <= 3; offset += 1) {
    const v = valueAt(center + offset);
    if (maximize ? v > bestValue : v < bestValue) { bestMs = center + offset; bestValue = v; }
  }
  return new Date(bestMs);
}

export function stationBreakpoints(eph: CrossingEphemeris, body: BodyName, from: Date, to: Date, stepDays: number): Date[] {
  if (body === 'Sun' || body === 'Moon') return [];
  const stations: Date[] = [];
  const stepMs = stepDays * DAY;
  const toMs = to.getTime();
  let previousMs = from.getTime();
  let previousSpeed = eph.longitudeSpeed(body, from);
  while (previousMs < toMs) {
    const currentMs = Math.min(previousMs + stepMs, toMs);
    const currentSpeed = eph.longitudeSpeed(body, new Date(currentMs));
    const ps = Math.sign(previousSpeed);
    const cs = Math.sign(currentSpeed);
    if (!(ps === 0 && cs === 0) && (ps === 0 || cs === 0 || ps !== cs)) {
      stations.push(refineLongitudeExtremum(eph, body, Math.max(from.getTime(), previousMs - stepMs), Math.min(toMs, currentMs + stepMs), previousSpeed > currentSpeed));
    }
    previousMs = currentMs;
    previousSpeed = currentSpeed;
  }
  return stations
    .filter((s) => s.getTime() > from.getTime() && s.getTime() < toMs)
    .filter((s, i, all) => i === 0 || s.getTime() - all[i - 1].getTime() > MINUTE);
}

/** Every crossing in (from, to], split at stations, with a tangent fallback. */
export function findStationSplitCrossings(
  eph: CrossingEphemeris, body: BodyName, targetLon: number, from: Date, to: Date, stepDays = 5,
): LongitudeCrossing[] {
  const stations = stationBreakpoints(eph, body, from, to, stepDays);
  const bounds = [from, ...stations, to];
  const hits: LongitudeCrossing[] = bounds.slice(0, -1).flatMap((b, i) =>
    findLongitudeCrossingsWith(eph.bodyLongitude, body, targetLon, b, bounds[i + 1], stepDays));
  for (const station of stations) {
    const ms = station.getTime();
    const lon = eph.bodyLongitude(body, station);
    const resolution = Math.max(
      angularError(lon, eph.bodyLongitude(body, new Date(ms - 500))),
      angularError(lon, eph.bodyLongitude(body, new Date(ms + 500))),
    ) + 1e-12;
    if (!hits.some((h) => Math.abs(h.at.getTime() - ms) <= MINUTE) && angularError(targetLon, lon) <= resolution) {
      hits.push({ at: station, retrograde: false });
    }
  }
  hits.sort((a, b) => a.at.getTime() - b.at.getTime());
  return hits.filter((h, i) => i === 0 || h.at.getTime() - hits[i - 1].at.getTime() >= 100);
}
