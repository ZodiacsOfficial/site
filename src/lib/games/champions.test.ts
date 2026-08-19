import { describe, expect, it } from 'vitest';
import { championSeasons, currentAnnouncement, type SeasonChampionEntry } from './champions';
import { SIGN_SLUGS } from '../signs';

function entry(seasonId: string, overrides: Partial<SeasonChampionEntry> = {}): SeasonChampionEntry {
  const [slug, year] = [seasonId.split('-')[0]!, Number(seasonId.split('-')[1])];
  return {
    seasonId,
    seasonName: slug.charAt(0).toUpperCase() + slug.slice(1),
    year,
    endedAtUtc: 0,
    champion: 'scorpio',
    runnerUp: 'leo',
    marginPoints: 125,
    finalStandings: [
      { sign: 'scorpio', points: 350 },
      { sign: 'leo', points: 225 },
      ...SIGN_SLUGS.filter((sign) => !['scorpio', 'leo'].includes(sign))
        .map((sign) => ({ sign, points: 0 })),
    ],
    ...overrides,
  };
}

describe('the Trophy Hall record', () => {
  it('validates the committed champions file at import time', () => {
    // Today the Hall may be empty; the contract is that whatever is
    // committed parses and validates without throwing.
    expect(Array.isArray(championSeasons())).toBe(true);
  });

  it('announces only the season that closed most recently', () => {
    const cancer = entry('cancer-2026');
    const leo = entry('leo-2026');

    // 2026-08-19 sits inside leo-2026: cancer-2026 is the announcement.
    const duringLeo = Date.UTC(2026, 7, 19);
    expect(currentAnnouncement([cancer], duringLeo)).toBe(cancer);
    expect(currentAnnouncement([], duringLeo)).toBeNull();

    // 2026-08-25 sits inside virgo-2026: leo-2026 replaces it.
    const duringVirgo = Date.UTC(2026, 7, 25);
    expect(currentAnnouncement([cancer, leo], duringVirgo)).toBe(leo);
    expect(currentAnnouncement([cancer], duringVirgo)).toBeNull();
  });
});
