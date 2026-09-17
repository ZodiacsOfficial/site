import { describe, expect, it } from 'vitest';
import {
  circularDelta, circularDistance, compareAngles, compareScalars, formatDelta,
  DISPLAY_EPSILON, IDENTICAL_EPSILON,
} from './angles';

describe('circular angular differences', () => {
  it('takes the short way round zero', () => {
    // The whole point: 359° and 1° are two degrees apart, not 358.
    expect(circularDistance(359, 1)).toBeCloseTo(2, 10);
    expect(circularDelta(359, 1)).toBeCloseTo(2, 10);
    expect(circularDelta(1, 359)).toBeCloseTo(-2, 10);
    expect(circularDistance(0.0001, 359.9999)).toBeCloseTo(0.0002, 10);
  });

  it('is signed in the direction of increasing longitude', () => {
    expect(circularDelta(10, 20)).toBeCloseTo(10, 10);
    expect(circularDelta(20, 10)).toBeCloseTo(-10, 10);
    expect(circularDelta(350, 10)).toBeCloseTo(20, 10);
    expect(circularDelta(10, 350)).toBeCloseTo(-20, 10);
  });

  it('reads an exactly opposite pair the same way from either side', () => {
    expect(circularDelta(0, 180)).toBe(180);
    expect(circularDelta(180, 0)).toBe(180);
    expect(circularDistance(90, 270)).toBe(180);
  });

  it('never exceeds half a turn, at any offset', () => {
    for (let base = 0; base < 360; base += 7) {
      for (let step = 0; step < 360; step += 11) {
        const distance = circularDistance(base, (base + step) % 360);
        expect(distance).toBeGreaterThanOrEqual(0);
        expect(distance).toBeLessThanOrEqual(180 + 1e-9);
      }
    }
  });

  it('treats multiples of a full turn as the same place', () => {
    expect(circularDistance(10, 370)).toBeLessThanOrEqual(IDENTICAL_EPSILON);
    expect(circularDistance(10, -350)).toBeLessThanOrEqual(IDENTICAL_EPSILON);
  });

  it('refuses to invent a difference from a non-finite value', () => {
    expect(Number.isNaN(circularDelta(Number.NaN, 10))).toBe(true);
    expect(compareAngles(Number.NaN, 10)).toBe('different');
  });
});

describe('separating a real difference from rounding', () => {
  it('calls bit-identical values identical', () => {
    expect(compareAngles(84.18908508711235, 84.18908508711235)).toBe('identical');
    expect(compareScalars(51.5074, 51.5074)).toBe('identical');
  });

  it('calls a six-decimal rounding difference display-only, not a different calculation', () => {
    // The same longitude, written once in full and once as the tables show it.
    expect(compareAngles(84.18908508711235, 84.189085)).toBe('display-only');
    expect(compareScalars(-0.12780000001, -0.1278)).toBe('display-only');
  });

  it('calls anything a reader could see a genuine difference', () => {
    expect(compareAngles(84.189085, 84.189185)).toBe('different');
    expect(compareAngles(0, 180)).toBe('different');
    expect(compareScalars(51.5074, 51.5075)).toBe('different');
  });

  it('puts the display threshold where the displayed precision is', () => {
    expect(compareAngles(10, 10 + DISPLAY_EPSILON / 2)).toBe('display-only');
    expect(compareAngles(10, 10 + DISPLAY_EPSILON * 2)).toBe('different');
  });
});

describe('formatting', () => {
  it('writes the direction of the difference', () => {
    expect(formatDelta(1.5)).toBe('+1.500000°');
    expect(formatDelta(-1.5)).toBe('−1.500000°');
    expect(formatDelta(0)).toBe('0.000000°');
    expect(formatDelta(Number.NaN)).toBe('—');
  });
});
