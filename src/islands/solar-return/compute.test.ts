import { describe, expect, it } from 'vitest';
import { bodyLongitude } from '../../lib/engine/full';
import { yearScan } from '../../lib/engine/year-scan';
import { computeSolarReturn, currentReturnYear, nearForReturnYear } from './compute';

const KAHLO_BIRTH = new Date('1907-07-06T15:06:36Z');
const KAHLO_SUN = bodyLongitude('Sun', KAHLO_BIRTH);

describe('solar return calculator model', () => {
  it('exercises the island helper against yearScan within a minute', () => {
    const result = computeSolarReturn({
      birthDate: '1907-07-06', birthTime: null, timeKnown: true, birthplace: null,
      savedSunLon: KAHLO_SUN, houseSystem: 'whole', castLocation: null, year: 2026,
    }, new Date('2026-08-01T00:00:00Z'));
    const near = nearForReturnYear(2026, '1907-07-06');
    const scan = yearScan({ sunLon: KAHLO_SUN, moonLon: null, ascLon: null, birthUtc: KAHLO_BIRTH },
      new Date(near.getTime() - 200 * 86_400_000), new Date(near.getTime() + 200 * 86_400_000));
    expect(Math.abs(result.chart.input.utc.getTime() - new Date(scan.solarReturns[0]).getTime())).toBeLessThanOrEqual(60_000);
  });

  it('flips the governing year at the exact return instant', () => {
    const thisReturn = computeSolarReturn({
      birthDate: '1907-07-06', birthTime: null, timeKnown: true, birthplace: null,
      savedSunLon: KAHLO_SUN, houseSystem: 'whole', castLocation: null, year: 2026,
    }).chart.input.utc;
    expect(currentReturnYear(KAHLO_SUN, '1907-07-06', new Date(thisReturn.getTime() - 1))).toBe(2025);
    expect(currentReturnYear(KAHLO_SUN, '1907-07-06', thisReturn)).toBe(2026);
  });

  it('relocation changes angles but not planets and no-time suppresses houses', () => {
    const base = {
      birthDate: '1907-07-06', birthTime: '08:30', timeKnown: true,
      birthplace: { name: 'Mexico City', admin1: '', country: 'Mexico', lat: 19.4326, lon: -99.1332, tz: 'America/Mexico_City' },
      savedSunLon: KAHLO_SUN, houseSystem: 'whole' as const, year: 2026,
    };
    const mexico = computeSolarReturn({ ...base, castLocation: base.birthplace });
    const london = computeSolarReturn({ ...base, castLocation: { name: 'London', lat: 51.5072, lon: -0.1276, tz: 'Europe/London' } });
    expect(mexico.chart.angles?.asc).not.toBeCloseTo(london.chart.angles!.asc, 2);
    expect(mexico.chart.bodies.map((b) => b.lon)).toEqual(london.chart.bodies.map((b) => b.lon));
    const noTime = computeSolarReturn({ ...base, timeKnown: false, castLocation: base.birthplace });
    expect(noTime.chart.angles).toBeNull();
    expect(noTime.chart.houses).toBeNull();
  });
});
