import { describe, expect, it } from 'vitest';
import { positionsReading } from './share-positions-reading';
import type { PositionsShareChart } from './share-positions';

const chart: PositionsShareChart = {
  bodies: [
    ['Sun', 10], ['Moon', 100], ['Mercury', 12], ['Venus', 70],
    ['Mars', 190], ['Jupiter', 250], ['Saturn', 280], ['Uranus', 40],
    ['Neptune', 130], ['Pluto', 220], ['North Node', 300], ['South Node', 120],
  ].map(([body, lon]) => ({ body, lon })) as PositionsShareChart['bodies'],
  angles: { asc: 95, mc: 5 },
  houseSystem: 'placidus',
  engineVersion: 'test',
};

describe('positionsReading', () => {
  it('reconstructs whole-sign houses from the ASC without claiming Placidus', () => {
    const result = positionsReading(chart);
    expect(result.cusps).toEqual([90, 120, 150, 180, 210, 240, 270, 300, 330, 0, 30, 60]);
    expect(Object.fromEntries(result.houses)).toEqual({
      Sun: 10,
      Moon: 1,
      Mercury: 10,
      Venus: 12,
      Mars: 4,
      Jupiter: 6,
      Saturn: 7,
      Uranus: 11,
      Neptune: 2,
      Pluto: 5,
      'North Node': 8,
      'South Node': 2,
      ASC: 1,
      MC: 10,
    });
    expect(result.reconstructedWholeSign).toBe(true);
  });

  it('recomputes deterministic major aspects without applying state', () => {
    const result = positionsReading(chart);
    expect(result.aspects).toHaveLength(29);
    expect(result.topAspects).toEqual([
      { a: 'Sun', b: 'Moon', type: 'square', orb: 0 },
      { a: 'Sun', b: 'Venus', type: 'sextile', orb: 0 },
      { a: 'Sun', b: 'Mars', type: 'opposition', orb: 0 },
      { a: 'Sun', b: 'Jupiter', type: 'trine', orb: 0 },
    ]);
    expect(result.aspects[0]).not.toHaveProperty('applying');
    expect(result.topAspects.length).toBeLessThanOrEqual(4);
  });

  it('does not fabricate houses when angles are absent', () => {
    const result = positionsReading({ ...chart, angles: null });
    expect(result.cusps).toBeNull();
    expect(result.houses.size).toBe(0);
    expect(result.reconstructedWholeSign).toBe(false);
  });
});
