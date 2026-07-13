import { describe, expect, it } from 'vitest';
import { computeBodies } from './full';
import {
  PROGRESSION_DAYS_PER_YEAR,
  progressedBodies,
  progressedInstant,
} from './progressions';

const DAY_MS = 86_400_000;
const KAHLO_BIRTH = new Date('1907-07-06T15:06:36Z');

function eastwardDistance(from: number, to: number): number {
  return ((to - from) % 360 + 360) % 360;
}

describe('secondary progressions', () => {
  it('maps elapsed tropical years to civil days and delegates planetary positions', () => {
    const target = new Date('2026-07-06T00:00:00Z');
    const progressed = progressedInstant(KAHLO_BIRTH, target);
    const yearsLived = (target.getTime() - KAHLO_BIRTH.getTime())
      / (PROGRESSION_DAYS_PER_YEAR * DAY_MS);
    const expectedTime = KAHLO_BIRTH.getTime() + yearsLived * DAY_MS;

    expect(Math.abs(progressed.getTime() - expectedTime)).toBeLessThanOrEqual(1_000);
    expect(progressedBodies(KAHLO_BIRTH, target)).toEqual(computeBodies(progressed));
  });

  it('advances the progressed Moon at the doctrinal 12–15° per year across three spot years', () => {
    // Doctrinal-rate fallback: no independently retrievable external vector was
    // available for this fixture, so three consecutive years assert the standard
    // secondary-progressed Moon motion requested by the implementation packet.
    const targets = [2024, 2025, 2026, 2027].map(
      (year) => new Date(`${year}-07-06T00:00:00Z`),
    );
    const moonLongitudes = targets.map((target) =>
      progressedBodies(KAHLO_BIRTH, target).find((body) => body.body === 'Moon')!.lon);

    for (let i = 1; i < moonLongitudes.length; i += 1) {
      expect(eastwardDistance(moonLongitudes[i - 1], moonLongitudes[i])).toBeGreaterThanOrEqual(12);
      expect(eastwardDistance(moonLongitudes[i - 1], moonLongitudes[i])).toBeLessThanOrEqual(15);
    }
  });
});
