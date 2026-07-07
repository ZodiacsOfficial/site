import { describe, expect, it } from 'vitest';
import {
  birthdaySlug, birthdayLabel, prevDate, nextDate,
  decanRuler, decanSpan, cuspSummary, cuspYearReading, boundaryDistance,
  type BirthdayEntry, type CuspTable,
} from './birthdays';
import birthdays from '../data/birthdays.json';

const days = birthdays.days as Record<string, BirthdayEntry>;

describe('date wheel', () => {
  it('slugs and labels', () => {
    expect(birthdaySlug(7, 7)).toBe('july-7');
    expect(birthdayLabel(2, 29)).toBe('February 29');
  });

  it('wraps the year and includes Feb 29', () => {
    expect(prevDate(1, 1)).toEqual({ month: 12, day: 31 });
    expect(nextDate(12, 31)).toEqual({ month: 1, day: 1 });
    expect(nextDate(2, 28)).toEqual({ month: 2, day: 29 });
    expect(nextDate(2, 29)).toEqual({ month: 3, day: 1 });
    expect(prevDate(3, 1)).toEqual({ month: 2, day: 29 });
  });

  it('walks all 366 dates in one loop', () => {
    let m = 1;
    let d = 1;
    let steps = 0;
    do {
      ({ month: m, day: d } = nextDate(m, d));
      steps += 1;
    } while (!(m === 1 && d === 1) && steps < 400);
    expect(steps).toBe(366);
  });
});

describe('decans', () => {
  it('uses traditional rulers through the triplicity sequence', () => {
    expect(decanRuler('cancer', 1)).toBe('Moon');
    expect(decanRuler('cancer', 2)).toBe('Mars'); // Scorpio's classical ruler
    expect(decanRuler('cancer', 3)).toBe('Jupiter'); // Pisces' classical ruler
    expect(decanRuler('aquarius', 1)).toBe('Saturn'); // classical, not Uranus
    expect(decanRuler('leo', 2)).toBe('Jupiter');
  });

  it('reads a single decan from a tight span', () => {
    const entry: BirthdayEntry = {
      month: 7, day: 7, lonMin: 104.5, lonMax: 105.89,
      now: { year: 2026, lon: 105.4, moonSign: 'aries' }, sign: 'cancer',
    };
    const d = decanSpan(entry);
    expect(d.lo).toBe(2);
    expect(d.hi).toBe(2);
    expect(d.ruler).toBe('Mars');
    expect(d.hiRuler).toBeUndefined();
  });

  it('flags spans that straddle a 10° line', () => {
    const entry: BirthdayEntry = {
      month: 7, day: 2, lonMin: 99.4, lonMax: 100.6,
      now: { year: 2026, lon: 100, moonSign: 'aries' }, sign: 'cancer',
    };
    const d = decanSpan(entry);
    expect(d.lo).toBe(1);
    expect(d.hi).toBe(2);
    expect(d.ruler).toBe('Moon');
    expect(d.hiRuler).toBe('Mars');
  });
});

describe('cusp tables', () => {
  const cusp: CuspTable = {
    a: 'cancer', b: 'leo',
    years: { 1989: 'a', 1990: 'a', 1991: 'a', 1992: '22:08', 1993: 'a', 1994: 'b', 1995: 'a', 1996: 'a', 1997: 'a', 1998: 'a' },
  };

  it('summarizes whole vs split years', () => {
    const s = cuspSummary(cusp);
    expect(s.wholeA).toBe(8);
    expect(s.wholeB).toBe(1);
    expect(s.split).toBe(1);
    expect(s.splitYears[0]).toEqual({ year: 1992, at: '22:08' });
    expect(s.majority?.slug).toBe('cancer');
  });

  it('reads a specific year', () => {
    expect(cuspYearReading(cusp, 1990)).toMatchObject({ kind: 'whole' });
    expect(cuspYearReading(cusp, 1992)).toMatchObject({ kind: 'split', atUtc: '22:08' });
    expect(cuspYearReading(cusp, 1800)).toBeNull();
  });
});

describe('real data integrity', () => {
  it('has 366 dates and the anchors hold', () => {
    expect(Object.keys(days)).toHaveLength(366);
    expect(days['july-7'].sign).toBe('cancer');
    expect(days['february-29'].sign).toBe('pisces');
    expect(days['july-22'].cusp?.a).toBe('cancer');
    expect(days['july-22'].cusp?.b).toBe('leo');
  });

  it('every non-cusp date resolves a decan and a plausible boundary distance', () => {
    for (const [slug, entry] of Object.entries(days)) {
      if (entry.cusp) continue;
      const d = decanSpan(entry);
      expect(d.lo, slug).toBeLessThanOrEqual(d.hi);
      const dist = boundaryDistance(entry);
      expect(dist, slug).toBeGreaterThanOrEqual(0);
      expect(dist, slug).toBeLessThanOrEqual(15);
    }
  });

  it('cusp tables carry adjacent signs and valid year values', () => {
    for (const [slug, entry] of Object.entries(days)) {
      if (!entry.cusp) continue;
      const s = cuspSummary(entry.cusp);
      expect(s.a.slug, slug).not.toBe(s.b.slug);
      for (const { at } of s.splitYears) expect(at, slug).toMatch(/^\d{2}:\d{2}$/);
    }
  });
});
