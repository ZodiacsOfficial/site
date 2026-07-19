import { describe, expect, it } from 'vitest';
import { planetsOnlyReturnReading } from './copy';

describe('planets-only solar-return reading', () => {
  it('uses the closest stable annual aspect and keeps the exact basis separate', () => {
    const reading = planetsOnlyReturnReading(
      [{ body: 'Jupiter', lon: 125 }],
      [
        { a: 'Moon', b: 'Mars', type: 'square', orb: 0.1 },
        { a: 'Saturn', b: 'Neptune', type: 'trine', orb: 0.4 },
        { a: 'Sun', b: 'Mars', type: 'opposition', orb: 0.8 },
      ],
    );

    expect(reading.text).toContain('your standards and commitments');
    expect(reading.text).toContain('your imagination and ideals');
    expect(reading.text).not.toContain('Saturn trine Neptune');
    expect(reading.receipt).toBe('Saturn trine Neptune · 0.4° orb');
  });

  it('changes the interpretation when the return chart changes', () => {
    const supportive = planetsOnlyReturnReading([], [
      { a: 'Jupiter', b: 'Saturn', type: 'sextile', orb: 0.6 },
    ]);
    const challenging = planetsOnlyReturnReading([], [
      { a: 'Jupiter', b: 'Saturn', type: 'square', orb: 0.6 },
    ]);

    expect(supportive.text).not.toBe(challenging.text);
    expect(supportive.receipt).not.toBe(challenging.receipt);
  });

  it('falls back to the return-year Jupiter sign when no stable aspect is available', () => {
    const reading = planetsOnlyReturnReading(
      [{ body: 'Jupiter', lon: 125 }],
      [{ a: 'Moon', b: 'Mars', type: 'square', orb: 0.1 }],
    );

    expect(reading.text).toContain('creative visibility');
    expect(reading.receipt).toBe('Jupiter in Leo');
  });
});
