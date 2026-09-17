import { describe, expect, it } from 'vitest';
import {
  circularDelta, circularDistance, compareAngles, compareScalars, displayed, formatDelta,
  DISPLAYED_DECIMALS, IDENTICAL_EPSILON,
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

  it('never exceeds half a turn, and is antisymmetric, at any offset', () => {
    // Negative and out-of-range inputs included: a caller that hands us a raw
    // difference rather than a normalised longitude must not get nonsense.
    for (let a = -720; a <= 720; a += 13) {
      for (let b = -720; b <= 720; b += 17) {
        const delta = circularDelta(a, b);
        expect(delta).toBeGreaterThan(-180);
        expect(delta).toBeLessThanOrEqual(180);
        expect(circularDistance(a, b)).toBe(Math.abs(delta));
        // 180 is its own opposite, so it is the one value that cannot flip.
        if (delta !== 180) expect(circularDelta(b, a)).toBeCloseTo(-delta, 9);
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

  it('decides display-only on what the page prints, not on a tolerance', () => {
    // Rounding at six decimals is a step function, so the boundary cannot be a
    // distance. These two pairs are the counterexamples that break any epsilon:
    // the first is 8e-7 apart and prints the same, the second is 2e-8 apart and
    // prints differently. Whatever epsilon you pick, it gets one of them wrong.
    expect(displayed(308.1223466)).toBe(displayed(308.1223474));
    expect(compareAngles(308.1223466, 308.1223474)).toBe('display-only');

    expect(displayed(308.12234749)).not.toBe(displayed(308.12234751));
    expect(compareAngles(308.12234749, 308.12234751)).toBe('different');
  });

  it('holds that rule over a sweep, for angles and scalars alike', () => {
    const base = 123.456789;
    for (let step = 1; step <= 400; step += 1) {
      const other = base + step * 1e-8;
      const samePrint = displayed(base) === displayed(other);
      expect(compareAngles(base, other)).toBe(samePrint ? 'display-only' : 'different');
      expect(compareScalars(base, other)).toBe(samePrint ? 'display-only' : 'different');
    }
  });

  it('prints at the precision the receipts carry', () => {
    expect(DISPLAYED_DECIMALS).toBe(6);
    expect(displayed(84.18908508711235)).toBe('84.189085');
    expect(displayed(84.18908508711235).split('.')[1]).toHaveLength(DISPLAYED_DECIMALS);
  });
});

describe('formatting', () => {
  it('writes the direction of the difference', () => {
    expect(formatDelta(1.5)).toBe('+1.500000°');
    expect(formatDelta(-1.5)).toBe('−1.500000°');
    expect(formatDelta(0)).toBe('0.000000°');
    expect(formatDelta(Number.NaN)).toBe('—');
    expect(formatDelta(Number.POSITIVE_INFINITY)).toBe('—');
  });

  it('never writes a real difference as a bare zero', () => {
    // A difference can be too small for six decimals and still be the reason a
    // row is there; printing it as 0.000000° would contradict the row itself.
    expect(formatDelta(2e-8)).toBe('+2.0e-8°');
    expect(formatDelta(-2e-8)).toBe('−2.0e-8°');
    expect(formatDelta(1e-6)).toBe('+0.000001°');
  });
});
