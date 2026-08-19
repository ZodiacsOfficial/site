/**
 * Season-close contracts (Zodiac Games R2.3): the previous-season id walk
 * (including both year boundaries) and the immutable champion entry.
 */
import { describe, expect, it } from 'vitest';
import { ZODIAC_ORDER, championEntryFrom, previousSeasonIdOf } from './race-close-lib.mjs';

function closedPayload(overrides = {}) {
  return {
    seasonId: 'leo-2026',
    seasonSign: 'leo',
    seasonName: 'Leo',
    seasonEndsAt: Date.UTC(2026, 7, 23),
    closed: true,
    standings: [
      { sign: 'scorpio', points: 350, joins: 3, checkins: 2 },
      { sign: 'leo', points: 225, joins: 2, checkins: 1 },
      ...ZODIAC_ORDER.filter((sign) => !['scorpio', 'leo'].includes(sign))
        .map((sign) => ({ sign, points: 0, joins: 0, checkins: 0 })),
    ],
    ...overrides,
  };
}

describe('season close', () => {
  it('walks the zodiac calendar backward, including both year boundaries', () => {
    expect(previousSeasonIdOf('virgo-2026')).toBe('leo-2026');
    expect(previousSeasonIdOf('aries-2026')).toBe('pisces-2026');
    expect(previousSeasonIdOf('aquarius-2027')).toBe('capricorn-2026');
    expect(previousSeasonIdOf('capricorn-2026')).toBe('sagittarius-2026');
    expect(() => previousSeasonIdOf('dragon-2026')).toThrow();
  });

  it('walking forward through a full year returns to the start', () => {
    let id = 'aries-2026';
    for (let step = 0; step < 12; step += 1) id = previousSeasonIdOf(id);
    expect(id).toBe('aries-2025');
  });

  it('engraves champion, runner-up, margin, and the full final board', () => {
    const entry = championEntryFrom(closedPayload());
    expect(entry).toMatchObject({
      seasonId: 'leo-2026',
      seasonName: 'Leo',
      year: 2026,
      endedAtUtc: Date.UTC(2026, 7, 23),
      champion: 'scorpio',
      runnerUp: 'leo',
      marginPoints: 125,
    });
    expect(entry.finalStandings).toHaveLength(12);
    expect(entry.finalStandings[0]).toEqual({ sign: 'scorpio', points: 350 });
    expect(Object.keys(entry.finalStandings[0])).toEqual(['sign', 'points']);
  });

  it('refuses open seasons and never crowns an empty board', () => {
    expect(() => championEntryFrom(closedPayload({ closed: false }))).toThrow();
    expect(championEntryFrom(closedPayload({
      standings: ZODIAC_ORDER.map((sign) => ({ sign, points: 0 })),
    }))).toBeNull();
  });
});
