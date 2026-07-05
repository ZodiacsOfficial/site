/**
 * Synastry math on synthetic fixtures plus one hand-checkable pair of
 * JPL Horizons longitudes (the same constants engine.test.ts verifies
 * the ephemeris against). No ephemeris imports — the module under test
 * is pure by design.
 */
import { describe, expect, it } from 'vitest';
import {
  findInterAspects, elementBalance, modalityBalance, summarizePair,
} from './synastry';
import type { MinimalBody } from './synastry';

/** Ten aspect bodies at spread longitudes (3 fire, 3 earth, 2 air, 2 water). */
const CHART: MinimalBody[] = [
  { body: 'Sun', lon: 10 },
  { body: 'Moon', lon: 40 },
  { body: 'Mercury', lon: 20 },
  { body: 'Venus', lon: 55 },
  { body: 'Mars', lon: 100 },
  { body: 'Jupiter', lon: 130 },
  { body: 'Saturn', lon: 190 },
  { body: 'Uranus', lon: 220 },
  { body: 'Neptune', lon: 280 },
  { body: 'Pluto', lon: 310 },
];

describe('findInterAspects', () => {
  it('detects an exact cross-chart square', () => {
    const a: MinimalBody[] = [{ body: 'Sun', lon: 0 }];
    const b: MinimalBody[] = [{ body: 'Moon', lon: 90 }];
    const found = findInterAspects(a, b);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ a: 'Sun', b: 'Moon', type: 'square' });
    expect(found[0].orb).toBeCloseTo(0, 6);
  });

  it('never reports intra-chart pairs', () => {
    // Chart A holds an exact internal square; B's lone Venus aspects nothing.
    const a: MinimalBody[] = [{ body: 'Sun', lon: 0 }, { body: 'Moon', lon: 90 }];
    const b: MinimalBody[] = [{ body: 'Venus', lon: 200 }];
    expect(findInterAspects(a, b)).toHaveLength(0);
  });

  it('is symmetric up to a/b swap', () => {
    const half = CHART.slice(0, 5);
    const ab = findInterAspects(half, CHART);
    const ba = findInterAspects(CHART, half);
    expect(ab.length).toBe(ba.length);
    const key = (x: { a: string; b: string; type: string; orb: number }) =>
      `${x.type}:${x.orb.toFixed(9)}`;
    expect(ab.map((x) => `${x.a}>${x.b}:${key(x)}`).sort()).toEqual(
      ba.map((x) => `${x.b}>${x.a}:${key(x)}`).sort(),
    );
  });

  it('self-synastry yields an exact conjunction per body', () => {
    const found = findInterAspects(CHART, CHART);
    const exact = found.filter((x) => x.a === x.b && x.type === 'conjunction' && x.orb < 1e-9);
    expect(exact).toHaveLength(10);
    // Sorted tightest first: the zero-orb conjunctions lead.
    expect(found[0].orb).toBeCloseTo(0, 9);
  });

  it('ignores nodes and unknown bodies', () => {
    const a: MinimalBody[] = [{ body: 'North Node', lon: 0 }, { body: 'Ascendant', lon: 0 }];
    const b: MinimalBody[] = [{ body: 'Sun', lon: 0 }];
    expect(findInterAspects(a, b)).toHaveLength(0);
  });

  it('matches the JPL cross-epoch fact: 2020 Sun opposes 1907 Sun', () => {
    // Longitudes verified against JPL Horizons in engine.test.ts:
    // Sun 2020-06-21 = 280.0094920°, Sun 1907-07-06 = 103.3759585°.
    const found = findInterAspects(
      [{ body: 'Sun', lon: 280.009492 }],
      [{ body: 'Sun', lon: 103.3759585 }],
    );
    expect(found).toHaveLength(1);
    expect(found[0].type).toBe('opposition');
    expect(found[0].orb).toBeCloseTo(3.37, 1);
  });
});

describe('balances', () => {
  it('element counts sum to ten and match the fixture', () => {
    expect(elementBalance(CHART)).toEqual({ fire: 3, earth: 3, air: 2, water: 2 });
  });

  it('modality counts sum to ten', () => {
    const m = modalityBalance(CHART);
    expect(m.cardinal + m.fixed + m.mutable).toBe(10);
  });

  it('excludes nodes from the tally', () => {
    const withNodes: MinimalBody[] = [
      ...CHART,
      { body: 'North Node', lon: 5 },
      { body: 'South Node', lon: 185 },
    ];
    const e = elementBalance(withNodes);
    expect(e.fire + e.earth + e.air + e.water).toBe(10);
  });
});

describe('summarizePair', () => {
  it('keeps counts, ease/charge, and top consistent', () => {
    const s = summarizePair(CHART.slice(0, 6), CHART, 5);
    const total = Object.values(s.counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(s.aspects.length);
    expect(s.easeful).toBe(s.counts.trine + s.counts.sextile);
    expect(s.charged).toBe(s.counts.square + s.counts.opposition);
    expect(s.top.length).toBeLessThanOrEqual(5);
    // top is the head of the orb-sorted list.
    expect(s.top).toEqual(s.aspects.slice(0, s.top.length));
  });
});
