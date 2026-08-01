import { describe, expect, it } from 'vitest';
import {
  aspectEvents, assembleYearAhead, eclipseEvents, ingressEvents,
  saturnSeasonEvents, selectComingUp, solarReturnEvents, yearCacheFresh,
  type IngressWindow, type YearAheadEvent, type YearScanCache,
} from './year-ahead';
import type { YearScanResult } from './engine/year-scan';
import type { EclipseRecord } from './upcoming';

const BANNED = [/properly/i, /not vibes/i, /no mush/i, /like a human/i, /in plain language/i, /shows? (its|their) work/i, /unlock/i, /delve/i];

const scan: YearScanResult = {
  solarReturns: ['2027-02-01T14:22:00.000Z'],
  aspects: [
    { body: 'Saturn', aspect: 'square', natal: 'Sun', from: '2026-09-10T00:00:00.000Z', to: '2027-04-02T00:00:00.000Z', passes: 3 },
    { body: 'Jupiter', aspect: 'conjunction', natal: 'ASC', from: '2026-08-01T00:00:00.000Z', to: '2026-08-01T00:00:00.000Z', passes: 1 },
    { body: 'Jupiter', aspect: 'opposition', natal: 'Moon', from: '2027-01-15T00:00:00.000Z', to: '2027-01-15T00:00:00.000Z', passes: 1 },
  ],
  saturnSeasons: [
    { index: 1, from: '2026-11-20T00:00:00.000Z', to: '2027-08-14T00:00:00.000Z' },
    { index: 2, from: '2055-01-01T00:00:00.000Z', to: '2055-10-01T00:00:00.000Z' },
  ],
};

const FROM = new Date('2026-07-07T00:00:00Z');
const TO = new Date('2027-07-07T00:00:00Z');

describe('event builders', () => {
  it('solar return carries the exact UTC instant', () => {
    const [ev] = solarReturnEvents(scan);
    expect(ev.kind).toBe('solar-return');
    expect(ev.receipt).toContain('Feb 1, 2027');
    expect(ev.receipt).toContain('14:22 UTC');
  });

  it('aspect events phrase planets via the transit register and ASC via its own lines', () => {
    const events = aspectEvents(scan);
    const saturnSun = events.find((e) => e.receipt.startsWith('Saturn square Natal Sun'));
    expect(saturnSun?.line).toContain('Saturn');
    expect(saturnSun?.receipt).toContain('3 exact passes');
    expect(saturnSun?.endAt).toBe('2027-04-02T00:00:00.000Z');
    const jupAsc = events.find((e) => e.receipt.startsWith('Jupiter conjunction Natal ASC'));
    expect(jupAsc?.line).toContain('rising degree');
    expect(jupAsc?.endAt).toBeUndefined();
  });

  it('ingress events flag the chart\'s own signs and skip out-of-window entries', () => {
    const windows: IngressWindow[] = [
      { planet: 'Jupiter', sign: 'leo', from: '2026-09-01T00:00:00.000Z', to: '2027-09-20T00:00:00.000Z' },
      { planet: 'Saturn', sign: 'aries', from: '2028-05-01T00:00:00.000Z', to: '2030-09-01T00:00:00.000Z' },
      { planet: 'Mars', sign: 'leo', from: '2026-08-10T00:00:00.000Z', to: '2026-09-20T00:00:00.000Z' },
    ];
    const events = ingressEvents(windows, 'leo', 'scorpio', FROM, TO);
    expect(events).toHaveLength(1);
    expect(events[0].line).toContain('Jupiter enters Leo');
    expect(events[0].line).toContain('your sun sign');
  });

  it('rising-sign ingress gets the rising flag', () => {
    const windows: IngressWindow[] = [
      { planet: 'Saturn', sign: 'scorpio', from: '2026-10-01T00:00:00.000Z', to: '2029-01-01T00:00:00.000Z' },
    ];
    const [ev] = ingressEvents(windows, 'leo', 'scorpio', FROM, TO);
    expect(ev.line).toContain('your rising sign');
  });

  it('eclipse events window-clip and keep the receipt', () => {
    const eclipses: EclipseRecord[] = [
      { type: 'solar', kind: 'total', peak: '2026-08-12T17:47:00.000Z', sign: 'leo', lon: 140.1, degree: 20.1 },
      { type: 'lunar', kind: 'total', peak: '2028-01-12T00:00:00.000Z', sign: 'cancer', lon: 111, degree: 21 },
    ];
    const natal = [{ body: 'Sun', lon: 141 }];
    const events = eclipseEvents(eclipses, natal, FROM, TO);
    expect(events).toHaveLength(1);
    expect(events[0].receipt).toContain('orb 0.9°');
  });

  it('saturn seasons clip to the window and phrase passes honestly', () => {
    const events = saturnSeasonEvents(scan.saturnSeasons, FROM, TO);
    expect(events).toHaveLength(1);
    expect(events[0].line).toContain('first Saturn return');
    expect(events[0].endAt).toBeDefined();
  });
});

describe('assembly + voice', () => {
  it('merges sorted by date', () => {
    const all = assembleYearAhead([
      solarReturnEvents(scan),
      aspectEvents(scan),
      saturnSeasonEvents(scan.saturnSeasons, FROM, TO),
    ]);
    const dates = all.map((e) => e.at);
    expect([...dates].sort()).toEqual(dates);
    expect(all[0].at).toBe('2026-08-01T00:00:00.000Z');
  });

  it('no banned tells in any composed line', () => {
    const all = assembleYearAhead([
      solarReturnEvents(scan),
      aspectEvents(scan),
      saturnSeasonEvents(scan.saturnSeasons, FROM, TO),
      ingressEvents(
        [{ planet: 'Jupiter', sign: 'leo', from: '2026-09-01T00:00:00.000Z', to: '2027-09-20T00:00:00.000Z' }],
        'leo', null, FROM, TO,
      ),
    ]);
    for (const ev of all) {
      for (const rx of BANNED) {
        expect(ev.line, `${ev.kind}: ${ev.line}`).not.toMatch(rx);
      }
      expect(ev.line.length).toBeGreaterThan(30);
      expect(ev.receipt.length).toBeGreaterThan(8);
    }
  });
});

describe('cache freshness', () => {
  const cache: YearScanCache = {
    engineVersion: 'v3',
    computedAt: '2026-07-01T00:00:00.000Z',
    from: '2026-07-01T00:00:00.000Z',
    to: '2027-07-01T00:00:00.000Z',
    scan,
  };

  it('fresh within two weeks on the same engine', () => {
    expect(yearCacheFresh(cache, 'v3', new Date('2026-07-10T00:00:00Z'))).toBe(true);
    expect(yearCacheFresh(cache, 'v3', new Date('2026-07-20T00:00:00Z'))).toBe(false);
    expect(yearCacheFresh(cache, 'v4', new Date('2026-07-02T00:00:00Z'))).toBe(false);
  });
});

describe('compact coming-up selection', () => {
  const event = (at: string, body = 'Saturn'): YearAheadEvent => ({
    at,
    body,
    kind: 'aspect',
    line: `${body} makes a test aspect to a natal point.`,
    receipt: `${body} test receipt`,
  });

  it('caps the 7-day and 8–30-day windows independently', () => {
    const result = selectComingUp([
      event('2026-08-02T00:00:00.000Z'),
      event('2026-08-03T00:00:00.000Z', 'Jupiter'),
      event('2026-08-04T00:00:00.000Z', 'Mars'),
      event('2026-08-12T00:00:00.000Z'),
      event('2026-08-20T00:00:00.000Z', 'Jupiter'),
      event('2026-08-25T00:00:00.000Z', 'Mars'),
      event('2026-10-01T00:00:00.000Z'),
    ], new Date('2026-08-01T00:00:00.000Z'));
    expect(result.nextSevenDays.map((entry) => entry.at)).toEqual([
      '2026-08-02T00:00:00.000Z',
      '2026-08-03T00:00:00.000Z',
    ]);
    expect(result.daysEightToThirty.map((entry) => entry.at)).toEqual([
      '2026-08-12T00:00:00.000Z',
      '2026-08-20T00:00:00.000Z',
    ]);
    expect(result.nextLater).toBeNull();
  });

  it('shows one later event only when the first 30 days are empty', () => {
    const result = selectComingUp([
      event('2026-07-01T00:00:00.000Z'),
      event('2026-09-15T00:00:00.000Z'),
      event('2026-10-01T00:00:00.000Z'),
    ], new Date('2026-08-01T00:00:00.000Z'));
    expect(result.nextSevenDays).toEqual([]);
    expect(result.daysEightToThirty).toEqual([]);
    expect(result.nextLater?.at).toBe('2026-09-15T00:00:00.000Z');
  });
});
