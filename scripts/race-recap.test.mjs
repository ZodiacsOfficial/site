/**
 * State of the Race renderer contract (Zodiac Games R2.2). The drafts must
 * follow the approved §H skeleton verbatim, carry standings facts only, and
 * stay inside each platform's practical bounds.
 */
import { describe, expect, it } from 'vitest';
import {
  SIGN_LINES,
  SIGN_NAMES,
  biggestMover,
  buildRecap,
  closestRivalry,
  draftDocument,
  oneMoreThing,
} from './race-recap-lib.mjs';

const ORDER = Object.keys(SIGN_NAMES);

function payload(overrides = {}) {
  const standings = [
    { sign: 'scorpio', points: 350 },
    { sign: 'leo', points: 225 },
    { sign: 'aries', points: 100 },
    ...ORDER.filter((sign) => !['scorpio', 'leo', 'aries'].includes(sign))
      .map((sign) => ({ sign, points: 0 })),
  ];
  return {
    seasonId: 'leo-2026',
    seasonSign: 'leo',
    seasonName: 'Leo',
    daysLeft: 4,
    isoYear: 2026,
    isoWeek: 34,
    standings,
    ...overrides,
  };
}

describe('State of the Race drafts', () => {
  it('renders the §H skeleton with its labels verbatim', () => {
    const recap = buildRecap(payload());
    for (const label of ['**Standings.**', '**Closest rivalry.**', '**Biggest mover.**', '**The trophy.**', '**One more thing.**']) {
      expect(recap.site).toContain(label);
    }
    expect(recap.site).toContain('State of the Race — Week 34');
    expect(recap.site).toContain('1. Scorpio — 350 points');
    expect(recap.site).toContain('Leo is 125 points behind Scorpio.');
    expect(recap.site).toContain('4 days until Leo Season closes.');
    expect(recap.site).toContain('zodiacs.org/race');
  });

  it('keeps every platform draft free of market language and smug tells', () => {
    const recap = buildRecap(payload());
    const drafts = [recap.site, recap.email.text, recap.x, recap.instagram, recap.tiktok, recap.telegram]
      .join('\n')
      .toLowerCase();
    for (const banned of [
      'token', 'price', 'market', 'wallet', 'buy', 'holder',
      'properly', 'shows its work', 'no mush', 'not vibes', 'like a human',
    ]) {
      expect(drafts, `draft must not say "${banned}"`).not.toContain(banned);
    }
  });

  it('keeps the X draft inside 280 characters for every board shape', () => {
    for (const shape of [
      payload(),
      payload({ standings: ORDER.map((sign) => ({ sign, points: 0 })) }),
      payload({
        standings: ORDER.map((sign, index) => ({ sign, points: 1_000_000 - index * 12_345 })),
        daysLeft: 1,
        isoWeek: 53,
      }),
    ]) {
      expect([...buildRecap(shape).x].length).toBeLessThanOrEqual(280);
    }
  });

  it('subjects follow holds-on / makes-a-move / takes-the-lead rules', () => {
    const previous = { seasonId: 'leo-2026', isoYear: 2026, isoWeek: 33, standings: payload().standings };
    expect(buildRecap(payload(), previous).subject).toBe('Week 34: Scorpio holds on');

    const climbed = payload({
      standings: [
        { sign: 'scorpio', points: 350 },
        { sign: 'aries', points: 300 },
        { sign: 'leo', points: 225 },
        ...ORDER.filter((sign) => !['scorpio', 'leo', 'aries'].includes(sign))
          .map((sign) => ({ sign, points: 0 })),
      ],
    });
    const wayBack = {
      seasonId: 'leo-2026',
      isoYear: 2026,
      isoWeek: 33,
      standings: [
        { sign: 'scorpio', points: 350 },
        { sign: 'leo', points: 225 },
        { sign: 'taurus', points: 120 },
        { sign: 'gemini', points: 110 },
        { sign: 'aries', points: 100 },
        ...ORDER.filter((sign) => !['scorpio', 'leo', 'aries', 'taurus', 'gemini'].includes(sign))
          .map((sign) => ({ sign, points: 0 })),
      ],
    };
    expect(buildRecap(climbed, wayBack).subject).toBe('Week 34: Aries makes a move');

    const newLeader = payload({
      standings: [
        { sign: 'leo', points: 400 },
        { sign: 'scorpio', points: 350 },
        ...ORDER.filter((sign) => !['scorpio', 'leo'].includes(sign))
          .map((sign) => ({ sign, points: 0 })),
      ],
    });
    expect(buildRecap(newLeader, previous).subject).toBe('Week 34: Leo takes the lead');
  });

  it('handles the open board and the first stamp of a season honestly', () => {
    const open = buildRecap(payload({ standings: ORDER.map((sign) => ({ sign, points: 0 })) }));
    expect(open.subject).toBe('Week 34: the board is open');
    expect(open.site).toContain('The board is open.');
    expect(open.site).toContain('No rivalry yet');

    const fresh = buildRecap(payload());
    expect(fresh.site).toContain('First stamp of the season — no movers yet.');

    const otherSeason = {
      seasonId: 'cancer-2026', isoYear: 2026, isoWeek: 30, standings: payload().standings,
    };
    expect(buildRecap(payload(), otherSeason).site)
      .toContain('First stamp of the season — no movers yet.');
  });

  it('finds the closest rivalry and the biggest mover', () => {
    // Scorpio→Leo and Leo→Aries both sit at 125; ties go to the top pair.
    expect(closestRivalry(payload().standings)).toEqual({ ahead: 'scorpio', behind: 'leo', gap: 125 });
    expect(closestRivalry(ORDER.map((sign) => ({ sign, points: 0 })))).toBeNull();

    const previous = {
      standings: [
        { sign: 'scorpio', points: 1 },
        { sign: 'leo', points: 1 },
        { sign: 'pisces', points: 1 },
        { sign: 'aries', points: 1 },
        ...ORDER.filter((sign) => !['scorpio', 'leo', 'aries', 'pisces'].includes(sign))
          .map((sign) => ({ sign, points: 0 })),
      ],
    };
    expect(biggestMover(payload().standings, previous)).toEqual({ sign: 'aries', climbed: 1, rank: 3 });
  });

  it('rotates the §F sign line deterministically and quotes it verbatim', () => {
    const line = oneMoreThing(34, 'scorpio');
    const [signName, rest] = line.split(' — ');
    const slug = ORDER.find((entry) => SIGN_NAMES[entry] === signName);
    expect(SIGN_LINES[slug]).toBe(rest);
    expect(oneMoreThing(34, 'scorpio')).toBe(line);
    expect(oneMoreThing(35, 'scorpio')).not.toBe(line);
  });

  it('bundles every platform section and the nothing-auto-posts note', () => {
    const doc = draftDocument(buildRecap(payload()));
    for (const section of ['## Email draft', '## X draft', '## Instagram caption', '## TikTok caption', '## Telegram draft']) {
      expect(doc).toContain(section);
    }
    expect(doc).toContain('Nothing auto-posts');
    expect(doc).toContain('{{unsubscribe_url}}');
  });
});
