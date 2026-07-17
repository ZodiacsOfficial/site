import { describe, expect, it } from 'vitest';
import { bodyLongitude } from './full';
import {
  mostRecentSolarReturnInstant, solarReturnChart, solarReturnInstant,
} from './solar-return';
import { yearScan } from './year-scan';

const KAHLO_BIRTH = new Date('1907-07-06T15:06:36Z');
const KAHLO_SUN_LON = bodyLongitude('Sun', KAHLO_BIRTH);
const NEAR = new Date('2026-07-06T00:00:00Z');
const DAY_MS = 86_400_000;

function angleDiff(a: number, b: number): number {
  const distance = Math.abs(((a - b) % 360 + 360) % 360);
  return distance > 180 ? 360 - distance : distance;
}

describe('solar returns', () => {
  it('agrees with yearScan for the same scan window within one minute', () => {
    const from = new Date(NEAR.getTime() - 200 * DAY_MS);
    const to = new Date(NEAR.getTime() + 200 * DAY_MS);
    const scan = yearScan({
      sunLon: KAHLO_SUN_LON,
      moonLon: null,
      ascLon: null,
      birthUtc: KAHLO_BIRTH,
    }, from, to);
    const instant = solarReturnInstant(KAHLO_SUN_LON, NEAR);

    expect(scan.solarReturns).toHaveLength(1);
    expect(Math.abs(instant.getTime() - new Date(scan.solarReturns[0]).getTime()))
      .toBeLessThanOrEqual(60_000);
  });

  it('casts a full located chart and a planets-only unlocated chart', () => {
    const instant = solarReturnInstant(KAHLO_SUN_LON, NEAR);
    const located = solarReturnChart(
      KAHLO_SUN_LON,
      NEAR,
      { latitude: 19.4326, longitude: -99.1332 },
      'placidus',
    );
    const unlocated = solarReturnChart(KAHLO_SUN_LON, NEAR, null, 'placidus');

    expect(located.angles).not.toBeNull();
    expect(located.houses).not.toBeNull();
    expect(located.houses?.cusps).toHaveLength(12);
    expect(unlocated.angles).toBeNull();
    expect(unlocated.houses).toBeNull();
    expect(located.input.utc).toEqual(instant);
    expect(unlocated.input.utc).toEqual(instant);
    expect(angleDiff(
      located.bodies.find((body) => body.body === 'Sun')!.lon,
      KAHLO_SUN_LON,
    )).toBeLessThan(0.01);
    expect(angleDiff(
      unlocated.bodies.find((body) => body.body === 'Sun')!.lon,
      KAHLO_SUN_LON,
    )).toBeLessThan(0.01);
  });

  it('can select the birthday-year that is already in progress', () => {
    const inBetweenReturns = new Date('2026-03-01T00:00:00Z');
    const previous = mostRecentSolarReturnInstant(KAHLO_SUN_LON, inBetweenReturns);

    expect(previous.getTime()).toBeLessThanOrEqual(inBetweenReturns.getTime());
    expect(inBetweenReturns.getTime() - previous.getTime()).toBeLessThan(367 * DAY_MS);
  });
});
