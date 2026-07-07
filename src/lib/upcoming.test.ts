import { describe, expect, it } from 'vitest';
import {
  eclipseHitLine,
  eclipseHits,
  nextEclipseHit,
  saturnWindowLine,
  type EclipseRecord,
} from './upcoming';
import { wholeSignHouseFromAsc } from './daily';

const NOW = new Date('2026-07-07T00:00:00Z');
const ecl = (peak: string, lon: number, over: Partial<EclipseRecord> = {}): EclipseRecord => ({
  type: 'solar',
  kind: 'total',
  peak,
  sign: 'leo',
  lon,
  degree: lon % 30,
  ...over,
});

const BANNED = ['done properly', 'computed properly', 'shows its work', 'like a human', 'no mush', 'not vibes'];

describe('eclipseHits', () => {
  it('matches a conjunction within orb and skips past eclipses', () => {
    const list = [ecl('2026-01-01T00:00:00Z', 100), ecl('2026-08-12T17:00:00Z', 140.1)];
    const hits = eclipseHits(list, [{ body: 'Sun', lon: 141.5 }], NOW);
    expect(hits).toHaveLength(1);
    expect(hits[0].contact).toBe('conjunction');
    expect(hits[0].orb).toBeCloseTo(1.4, 1);
  });

  it('matches an opposition and labels it', () => {
    const hits = eclipseHits([ecl('2026-08-12T17:00:00Z', 140)], [{ body: 'Moon', lon: 322 }], NOW);
    expect(hits).toHaveLength(1);
    expect(hits[0].contact).toBe('opposition');
    expect(hits[0].orb).toBeCloseTo(2, 1);
  });

  it('handles the 0°/360° wraparound', () => {
    const hits = eclipseHits([ecl('2026-08-12T17:00:00Z', 359)], [{ body: 'Venus', lon: 1.5 }], NOW);
    expect(hits).toHaveLength(1);
    expect(hits[0].orb).toBeCloseTo(2.5, 1);
  });

  it('respects the orb boundary and ignores nodes', () => {
    expect(eclipseHits([ecl('2026-08-12T17:00:00Z', 140)], [{ body: 'Mars', lon: 144 }], NOW)).toHaveLength(0);
    expect(
      eclipseHits([ecl('2026-08-12T17:00:00Z', 140)], [{ body: 'North Node', lon: 140 }], NOW),
    ).toHaveLength(0);
  });

  it('keeps the tightest contact per eclipse and sorts soonest first', () => {
    const list = [ecl('2026-12-01T00:00:00Z', 200), ecl('2026-08-12T17:00:00Z', 140)];
    const natal = [
      { body: 'Sun', lon: 141 },
      { body: 'Mercury', lon: 139.5 },
      { body: 'Saturn', lon: 200.4 },
    ];
    const hits = eclipseHits(list, natal, NOW);
    expect(hits.map((h) => h.body)).toEqual(['Mercury', 'Saturn']);
    expect(nextEclipseHit(list, natal, NOW)?.body).toBe('Mercury');
  });
});

describe('lines', () => {
  it('composes an eclipse line with a dated receipt and no banned tells', () => {
    const hit = eclipseHits([ecl('2026-08-12T17:00:00Z', 140.1)], [{ body: 'Sun', lon: 141 }], NOW)[0];
    const line = eclipseHitLine(hit);
    expect(line).toContain('Aug 12, 2026');
    expect(line).toContain('Leo');
    expect(line).toContain('your Sun');
    for (const tell of BANNED) expect(line.toLowerCase()).not.toContain(tell);
  });

  it('phrases a single-crossing season as a date, not a degenerate range', () => {
    const one = [{ index: 2, from: '2053-03-01T05:00:00Z', to: '2053-03-01T05:00:00Z' }];
    expect(saturnWindowLine(one, NOW)).toBe('Your second Saturn return arrives around Mar 1, 2053.');
  });

  it('phrases Saturn windows for active, future, and exhausted cases', () => {
    const seasons = [
      { index: 1, from: '2025-01-01T00:00:00Z', to: '2026-09-01T00:00:00Z' },
      { index: 2, from: '2054-05-01T00:00:00Z', to: '2055-02-01T00:00:00Z' },
    ];
    expect(saturnWindowLine(seasons, NOW)).toContain('running now');
    expect(saturnWindowLine([seasons[1]], NOW)).toContain('runs May 1, 2054');
    expect(saturnWindowLine([seasons[0]], new Date('2027-01-01T00:00:00Z'))).toContain('closed');
    expect(saturnWindowLine([], NOW)).toBeNull();
  });
});

describe('wholeSignHouseFromAsc', () => {
  it('anchors house one at the ascendant sign with wraparound', () => {
    expect(wholeSignHouseFromAsc('leo', 'leo')).toBe(1);
    expect(wholeSignHouseFromAsc('virgo', 'leo')).toBe(2);
    expect(wholeSignHouseFromAsc('cancer', 'leo')).toBe(12);
    expect(wholeSignHouseFromAsc('aries', 'capricorn')).toBe(4);
  });
});
