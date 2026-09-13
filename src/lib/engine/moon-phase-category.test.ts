import { describe, expect, it } from 'vitest';
import { moonPhaseAngle, moonPhaseName, moonPhaseNameFromAngle } from './lite';

// Adjacent representable doubles expose rounding that decimal epsilon tests miss.
function adjacent(value: number, direction: bigint): number {
  const bytes = new DataView(new ArrayBuffer(8));
  bytes.setFloat64(0, value);
  bytes.setBigUint64(0, bytes.getBigUint64(0) + direction);
  return bytes.getFloat64(0);
}
const boundaries = [
  [22.5, 'New Moon', 'Waxing Crescent'],
  [67.5, 'Waxing Crescent', 'First Quarter'],
  [112.5, 'First Quarter', 'Waxing Gibbous'],
  [157.5, 'Waxing Gibbous', 'Full Moon'],
  [202.5, 'Full Moon', 'Waning Gibbous'],
  [247.5, 'Waning Gibbous', 'Last Quarter'],
  [292.5, 'Last Quarter', 'Waning Crescent'],
  [337.5, 'Waning Crescent', 'New Moon'],
] as const;

describe('retained phase-angle categories', () => {
  it.each(boundaries)('keeps both adjacent doubles and the exact %s° boundary', (angle, before, after) => {
    expect(moonPhaseNameFromAngle(adjacent(angle, -1n))).toBe(before);
    expect(moonPhaseNameFromAngle(angle)).toBe(after);
    expect(moonPhaseNameFromAngle(adjacent(angle, 1n))).toBe(after);
  });
  it('does not normalize a retained value across a boundary', () => {
    const retained = adjacent(22.5, -1n);
    expect(((retained % 360) + 360) % 360).toBe(22.5);
    expect(moonPhaseNameFromAngle(retained)).toBe('New Moon');
  });
  it('keeps the wraparound category without changing zero or the last double', () => {
    for (const value of [0, -0, Number.MIN_VALUE, adjacent(360, -1n)]) {
      expect(moonPhaseNameFromAngle(value)).toBe('New Moon');
    }
  });
  it.each([
    ['2024-01-09T00:00:00Z', 'Waning Crescent'],
    ['2024-01-09T23:59:00Z', 'New Moon'],
    ['2024-01-16T00:00:00Z', 'Waxing Crescent'],
    ['2024-01-16T12:00:00Z', 'First Quarter'],
    ['2024-04-07T00:00:00Z', 'Waning Crescent'],
    ['2024-04-07T12:00:00Z', 'New Moon'],
  ] as const)('preserves the recorded lite/live witness %s', (instant, expected) => {
    const date = new Date(instant);
    expect(moonPhaseName(date)).toBe(expected);
    expect(moonPhaseNameFromAngle(moonPhaseAngle(date))).toBe(expected);
  });
});
