/**
 * Saturn-return scanner against the real ephemeris. The dated anchors
 * are externally checkable: the 2018–2020 Saturn-in-Capricorn transit
 * produced the first return for early-1990 births and the second for
 * mid-1961 births.
 */
import { describe, expect, it } from 'vitest';
import { groupIntoSeasons, saturnReturns } from './returns';
import type { Crossing } from './returns';

const YEAR = 365.25 * 86400_000;

const ageAt = (birth: Date, d: Date) => (d.getTime() - birth.getTime()) / YEAR;

describe('groupIntoSeasons', () => {
  it('groups near crossings and splits distant ones', () => {
    const t0 = Date.UTC(2019, 2, 1);
    const mk = (ms: number, retrograde = false): Crossing => ({ at: new Date(ms), retrograde });
    const seasons = groupIntoSeasons([
      mk(t0),
      mk(t0 + 200 * 86400_000, true),
      mk(t0 + 350 * 86400_000),
      mk(t0 + 29 * YEAR),
    ]);
    expect(seasons).toHaveLength(2);
    expect(seasons[0].crossings).toHaveLength(3);
    expect(seasons[0].index).toBe(1);
    expect(seasons[1].index).toBe(2);
    expect(seasons[0].first.getTime()).toBe(t0);
    expect(seasons[0].last.getTime()).toBe(t0 + 350 * 86400_000);
  });
});

describe('saturnReturns', () => {
  const births = [
    new Date('1990-02-01T12:00:00Z'),
    new Date('1961-08-04T00:00:00Z'),
    new Date('2000-06-15T12:00:00Z'),
    new Date('1975-03-10T12:00:00Z'),
  ];

  it('first return begins between ages 27.5 and 30.5 for every fixture', () => {
    for (const birth of births) {
      const { seasons } = saturnReturns(birth);
      expect(seasons.length).toBeGreaterThanOrEqual(3);
      const age = ageAt(birth, seasons[0].first);
      expect(age).toBeGreaterThan(27.5);
      expect(age).toBeLessThan(30.5);
    }
  }, 120_000);

  it('every season carries an odd number of crossings', () => {
    for (const birth of births) {
      for (const season of saturnReturns(birth).seasons) {
        expect([1, 3, 5]).toContain(season.crossings.length);
      }
    }
  }, 120_000);

  it('1990-02-01: natal Saturn in Capricorn, triple first pass across 2019', () => {
    const r = saturnReturns(new Date('1990-02-01T12:00:00Z'));
    // Natal longitude ~289.3° = Capricorn (270–300).
    expect(Math.floor(r.natalLon / 30)).toBe(9);
    const first = r.seasons[0];
    expect(first.crossings).toHaveLength(3);
    expect(first.crossings.map((c) => c.at.toISOString().slice(0, 10))).toEqual([
      '2019-03-21', '2019-06-09', '2019-12-13',
    ]);
    // The middle hit is the retrograde pass.
    expect(first.crossings.map((c) => c.retrograde)).toEqual([false, true, false]);
    // Second return: single crossing, ~29.8 years after the first ends.
    const second = r.seasons[1];
    expect(second.crossings).toHaveLength(1);
    expect(second.first.toISOString().slice(0, 7)).toBe('2049-01');
    expect(ageAt(new Date('1990-02-01T12:00:00Z'), second.first)).toBeCloseTo(58.96, 1);
  }, 120_000);

  it('1961-08-04: second return is the 2020 Saturn-in-Capricorn stint', () => {
    const r = saturnReturns(new Date('1961-08-04T00:00:00Z'));
    expect(r.seasons[0].crossings).toHaveLength(1);
    expect(r.seasons[0].first.toISOString().slice(0, 10)).toBe('1990-12-29');
    const second = r.seasons[1];
    expect(second.crossings).toHaveLength(3);
    for (const c of second.crossings) {
      expect(c.at.toISOString().slice(0, 4)).toBe('2020');
    }
  }, 120_000);
});
