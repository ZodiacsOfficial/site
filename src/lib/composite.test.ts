import { describe, expect, it } from 'vitest';
import { compositeAspects, compositeMidpoints } from './composite';

describe('compositeMidpoints', () => {
  it('uses the shorter arc and preserves chart-a order for shared bodies', () => {
    const points = compositeMidpoints(
      [
        { body: 'Sun', lon: 359 },
        { body: 'Moon', lon: 10 },
        { body: 'Mars', lon: 40 },
        { body: 'Mercury', lon: 80 },
      ],
      [
        { body: 'Mercury', lon: 100 },
        { body: 'Sun', lon: 1 },
        { body: 'Moon', lon: 50 },
        { body: 'Venus', lon: 30 },
      ],
    );

    expect(points).toEqual([
      { body: 'Sun', lon: 0 },
      { body: 'Moon', lon: 30 },
      { body: 'Mercury', lon: 90 },
    ]);
  });

  it('takes the eastward midpoint from chart a for exact opposites', () => {
    expect(compositeMidpoints(
      [{ body: 'Sun', lon: 0 }],
      [{ body: 'Sun', lon: 180 }],
    )).toEqual([{ body: 'Sun', lon: 90 }]);
    expect(compositeMidpoints(
      [{ body: 'Sun', lon: 180 }],
      [{ body: 'Sun', lon: 0 }],
    )).toEqual([{ body: 'Sun', lon: 270 }]);
  });
});

describe('compositeAspects', () => {
  it('returns natal-rule aspects without applying/separating state', () => {
    const aspects = compositeAspects([
      { body: 'Sun', lon: 0 },
      { body: 'Mars', lon: 120 },
      { body: 'Mercury', lon: 20 },
      { body: 'Venus', lon: 110 },
    ]);

    expect(aspects).toEqual([
      { a: 'Sun', b: 'Mars', type: 'trine', orb: 0 },
      { a: 'Mercury', b: 'Venus', type: 'square', orb: 0 },
    ]);
    for (const aspect of aspects) expect(aspect).not.toHaveProperty('applying');
  });
});
