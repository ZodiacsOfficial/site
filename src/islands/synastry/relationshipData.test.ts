import { describe, expect, it } from 'vitest';
import {
  buildCompositeTabData,
  buildRelationshipGrid,
  relationshipContactId,
  relationshipPoints,
} from './relationshipData';

describe('relationship grid data', () => {
  it('uses the ten aspect bodies in canonical order and appends known angles', () => {
    const points = relationshipPoints({
      bodies: [
        { body: 'Pluto', lon: 9 },
        { body: 'Moon', lon: 2 },
        { body: 'Sun', lon: 1 },
        { body: 'North Node', lon: 7 },
      ],
      asc: 10,
      mc: 100,
    });
    expect(points.map((point) => point.name)).toEqual(['Sun', 'Moon', 'Pluto', 'ASC', 'MC']);
  });

  it('builds body and angle contacts with stable chart-A-first ids', () => {
    const grid = buildRelationshipGrid(
      { bodies: [{ body: 'Sun', lon: 0 }], asc: 30, mc: null },
      { bodies: [{ body: 'Moon', lon: 120 }], asc: null, mc: 210 },
    );
    expect(grid.contacts.map(relationshipContactId)).toEqual([
      'Sun-trine-Moon',
      'ASC-square-Moon',
      'ASC-opposition-MC',
    ]);
  });
});

describe('composite tab data', () => {
  it('uses compositeMidpoints conventions and derives static-wheel aspects', () => {
    const data = buildCompositeTabData(
      [
        { body: 'Sun', lon: 359 },
        { body: 'Moon', lon: 10 },
        { body: 'Mars', lon: 40 },
        { body: 'South Node', lon: 180 },
      ],
      [
        { body: 'Sun', lon: 1 },
        { body: 'Moon', lon: 50 },
        { body: 'Mars', lon: 200 },
        { body: 'South Node', lon: 0 },
      ],
    );

    expect(data.points).toEqual([
      { body: 'Sun', lon: 0 },
      { body: 'Moon', lon: 30 },
      { body: 'Mars', lon: 120 },
      { body: 'South Node', lon: 270 },
    ]);
    expect(data.aspects).toContainEqual({ a: 'Sun', b: 'Mars', type: 'trine', orb: 0 });
  });
});
