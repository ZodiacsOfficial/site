import { computeChart } from '../../lib/engine/full';
import { solarReturnChart, solarReturnInstant } from '../../lib/engine/solar-return';
import type { Chart, HouseSystem } from '../../lib/engine/types';
import { resolveLocalToUtc } from '../../lib/time/localToUtc';

export interface SolarReturnPlace {
  name: string;
  lat: number;
  lon: number;
  tz: string;
}

export interface SolarReturnComputeInput {
  birthDate: string;
  birthTime: string | null;
  timeKnown: boolean;
  birthplace: SolarReturnPlace | null;
  savedSunLon: number | null;
  houseSystem: HouseSystem;
  castLocation: SolarReturnPlace | null;
  year: 'current' | number;
}

export interface SolarReturnResultData {
  chart: Chart;
  returnYear: number;
  noTime: boolean;
  noPlace: boolean;
}

export function nearForReturnYear(year: number, birthDate: string): Date {
  const [, month, day] = birthDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function currentReturnYear(natalSunLon: number, birthDate: string, now: Date): number {
  const year = now.getUTCFullYear();
  const candidates = [year - 2, year - 1, year, year + 1]
    .map((label) => ({ label, instant: solarReturnInstant(natalSunLon, nearForReturnYear(label, birthDate)) }))
    .filter(({ instant }) => instant.getTime() <= now.getTime());
  if (!candidates.length) throw new Error('No governing solar return found.');
  return candidates.reduce((latest, candidate) => (
    candidate.instant.getTime() > latest.instant.getTime() ? candidate : latest
  )).label;
}

export function computeSolarReturn(input: SolarReturnComputeInput, now = new Date()): SolarReturnResultData {
  let natalSunLon = input.savedSunLon;
  if (natalSunLon == null) {
    if (!input.birthplace) throw new Error('A birthplace is required.');
    const resolved = resolveLocalToUtc(
      input.birthDate,
      input.timeKnown && input.birthTime ? input.birthTime : '12:00',
      input.birthplace.tz,
    );
    const natal = computeChart({
      utc: resolved.utc,
      latitude: input.birthplace.lat,
      longitude: input.birthplace.lon,
      houseSystem: input.houseSystem,
      timeKnown: input.timeKnown,
      flags: resolved.flags,
    });
    natalSunLon = natal.bodies.find((body) => body.body === 'Sun')?.lon ?? null;
  }
  if (natalSunLon == null) throw new Error('The saved chart has no Sun position.');

  const returnYear = input.year === 'current'
    ? currentReturnYear(natalSunLon, input.birthDate, now)
    : input.year;
  const near = nearForReturnYear(returnYear, input.birthDate);
  const location = input.timeKnown && input.birthplace && input.castLocation
    ? { latitude: input.castLocation.lat, longitude: input.castLocation.lon }
    : null;
  return {
    chart: solarReturnChart(natalSunLon, near, location, input.houseSystem),
    returnYear,
    noTime: !input.timeKnown,
    noPlace: input.birthplace == null,
  };
}
