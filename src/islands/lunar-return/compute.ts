import { lunarReturnChart } from '../../lib/engine/lunar-return';
import type { Chart, HouseSystem } from '../../lib/engine/types';
import { resolveLocalToUtc } from '../../lib/time/localToUtc';

export interface LunarReturnPlace { name: string; lat: number; lon: number; tz: string }
export interface LunarReturnComputeInput {
  birthDate: string;
  birthTime: string | null;
  timeKnown: boolean;
  birthplace: LunarReturnPlace | null;
  houseSystem: HouseSystem;
  castLocation: LunarReturnPlace | null;
}
export interface LunarReturnResultData {
  chart: Chart;
  /** Captured once by submit; retries retain this instant. */
  referenceUtc: string;
  natalTimeFlags: ReadonlyArray<'lmt'>;
}

/** Resolve original birth input afresh. A summary or cached Moon is never an input. */
export function computeLunarReturn(input: LunarReturnComputeInput, reference: Date): LunarReturnResultData {
  if (input.timeKnown !== true || !input.birthTime) {
    throw new RangeError('A known birth time is needed. Enter the time from your birth record to calculate a lunar return.');
  }
  if (!input.birthplace || typeof input.birthplace.tz !== 'string' || !input.birthplace.tz.trim()) {
    throw new RangeError('Choose a birthplace with a known timezone before calculating a lunar return.');
  }
  const resolved = resolveLocalToUtc(input.birthDate, input.birthTime, input.birthplace.tz);
  if (resolved.flags.includes('dst-gap') || resolved.flags.includes('dst-fold')) {
    throw new RangeError('This local birth time is skipped or repeated by a clock change. Check the original birth record before calculating.');
  }
  const chart = lunarReturnChart({
    utc: resolved.utc, latitude: input.birthplace.lat, longitude: input.birthplace.lon,
    houseSystem: input.houseSystem, timeKnown: true, flags: resolved.flags,
  }, reference, input.castLocation
    ? { latitude: input.castLocation.lat, longitude: input.castLocation.lon }
    : undefined);
  return {
    chart, referenceUtc: reference.toISOString(),
    natalTimeFlags: resolved.flags.filter((flag): flag is 'lmt' => flag === 'lmt'),
  };
}
