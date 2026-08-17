import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  SEASON_ID_PATTERN,
  daysLeftInSeason,
  isoWeekUtc,
  seasonInstanceAt,
  seasonInstanceForId,
} from './season';
import { SIGNS } from '../lib/signs';

describe('seasonInstanceAt', () => {
  it('matches the Registry-published date ranges for every sign', () => {
    const registry = JSON.parse(
      readFileSync(new URL('../../public/registry/zodiacs.registry.json', import.meta.url), 'utf8'),
    ) as { assets: { sign: string; metadata: { dateRange: string } }[] };
    for (const asset of registry.assets) {
      const [, sm, sd, em, ed] = /^(\d{2})-(\d{2}) to (\d{2})-(\d{2})$/.exec(
        asset.metadata.dateRange,
      )!.map(Number);
      const startYear = 2026;
      const start = seasonInstanceAt(Date.UTC(startYear, sm! - 1, sd));
      expect(start.sign.slug, `${asset.sign} start`).toBe(asset.sign);
      const endYear = sm! > em! ? startYear + 1 : startYear;
      const end = seasonInstanceAt(Date.UTC(endYear, em! - 1, ed));
      expect(end.sign.slug, `${asset.sign} end`).toBe(asset.sign);
      const after = seasonInstanceAt(Date.UTC(endYear, em! - 1, ed! + 1));
      expect(after.sign.slug, `${asset.sign} rollover`).not.toBe(asset.sign);
    }
  });

  it('year-qualifies instances by their UTC start date', () => {
    expect(seasonInstanceAt(Date.UTC(2026, 7, 17)).id).toBe('leo-2026');
    expect(seasonInstanceAt(Date.UTC(2026, 7, 23)).id).toBe('virgo-2026');
    // Capricorn wraps the year boundary and keeps its December start year.
    expect(seasonInstanceAt(Date.UTC(2026, 11, 22)).id).toBe('capricorn-2026');
    expect(seasonInstanceAt(Date.UTC(2027, 0, 19)).id).toBe('capricorn-2026');
    expect(seasonInstanceAt(Date.UTC(2027, 0, 20)).id).toBe('aquarius-2027');
  });

  it('emits ids the SQL layer accepts', () => {
    for (const sign of SIGNS) {
      const instance = seasonInstanceAt(Date.UTC(2026, sign.start[0] - 1, sign.start[1]));
      expect(instance.id).toMatch(SEASON_ID_PATTERN);
    }
  });
});

describe('daysLeftInSeason', () => {
  it('counts the current UTC day and never reaches zero', () => {
    const virgo = seasonInstanceAt(Date.UTC(2026, 7, 23));
    expect(daysLeftInSeason(virgo, Date.UTC(2026, 7, 23))).toBe(31);
    expect(daysLeftInSeason(virgo, Date.UTC(2026, 8, 22))).toBe(1);
    expect(daysLeftInSeason(virgo, Date.UTC(2026, 8, 22, 23, 59))).toBe(1);
  });
});

describe('isoWeekUtc', () => {
  it('matches ISO-8601 reference vectors', () => {
    expect(isoWeekUtc(Date.UTC(2026, 7, 17))).toEqual({ isoYear: 2026, isoWeek: 34 });
    expect(isoWeekUtc(Date.UTC(2026, 0, 1))).toEqual({ isoYear: 2026, isoWeek: 1 });
    expect(isoWeekUtc(Date.UTC(2026, 11, 28))).toEqual({ isoYear: 2026, isoWeek: 53 });
    expect(isoWeekUtc(Date.UTC(2027, 0, 1))).toEqual({ isoYear: 2026, isoWeek: 53 });
    expect(isoWeekUtc(Date.UTC(2021, 0, 1))).toEqual({ isoYear: 2020, isoWeek: 53 });
  });
});

describe('seasonInstanceForId', () => {
  it('round-trips instances resolved from dates', () => {
    for (const probe of [
      Date.UTC(2026, 7, 17), Date.UTC(2026, 11, 25), Date.UTC(2027, 0, 10),
    ]) {
      const fromDate = seasonInstanceAt(probe);
      const fromId = seasonInstanceForId(fromDate.id);
      expect(fromId).toEqual(fromDate);
    }
  });

  it('rejects malformed ids', () => {
    expect(() => seasonInstanceForId('virgo-19')).toThrow();
    expect(() => seasonInstanceForId('ophiuchus-2026')).toThrow();
  });
});
