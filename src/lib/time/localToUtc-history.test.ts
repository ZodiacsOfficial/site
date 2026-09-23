import { beforeAll, describe, expect, it, vi } from 'vitest';
import excluded from '../../data/tz-history/2025c/excluded.json';
import { prepareLocalTime, resolveLocalToUtc } from './localToUtc';

/*
 * Before 1970, a birthplace time takes its zone's legal offsets from the
 * pinned tzdb release with backzone (src/data/tz-history/), not from the
 * browser, whose default build gives many places another city's history.
 * Each case below differs from the host (Node's ICU, tzdb 2025c without
 * backzone), which the "host" column records.
 */
const CASES: [label: string, date: string, zone: string, longitude: number, utc: string, offset: number, host: number][] = [
  // Sweden had no summer time from 1949 to 1979, and none in 1947; Berlin had double summer time.
  ['Stockholm, July 1947', '1947-07-01', 'Europe/Stockholm', 18.07, '1947-07-01T11:00:00.000Z', 60, 120],
  ['Stockholm, June 1947', '1947-06-15', 'Europe/Stockholm', 18.07, '1947-06-15T11:00:00.000Z', 60, 180],
  // Amsterdam's own summer time, +1:20, where the host has Brussels's +1:00.
  ['Amsterdam, 1938', '1938-06-15', 'Europe/Amsterdam', 4.89, '1938-06-15T10:40:00.000Z', 80, 60],
  // Amsterdam Mean Time was Dutch legal time from 1835; the host has Brussels's +0:17:30.
  ['Rotterdam, 1880', '1880-06-15', 'Europe/Amsterdam', 4.48, '1880-06-15T11:40:28.000Z', 19 + 32 / 60, 17.5],
  ['Reykjavik, 1950', '1950-01-15', 'Atlantic/Reykjavik', -21.9, '1950-01-15T13:00:00.000Z', -60, 0],
  ['Oslo, 1960', '1960-07-01', 'Europe/Oslo', 10.75, '1960-07-01T10:00:00.000Z', 120, 60],
  ['Oranjestad, 1943', '1943-06-01', 'America/Aruba', -70.03, '1943-06-01T16:30:00.000Z', -270, -180],
  ["St John's, Antigua, 1930", '1930-06-01', 'America/Antigua', -61.85, '1930-06-01T17:00:00.000Z', -300, -240],
  ['Copenhagen, 1945', '1945-08-20', 'Europe/Copenhagen', 12.57, '1945-08-20T11:00:00.000Z', 60, 180],
  // Kinshasa adopted West Africa Time in 1897; the host has Lagos's mean time.
  ['Kinshasa, 1900', '1900-06-01', 'Africa/Kinshasa', 15.31, '1900-06-01T11:00:00.000Z', 60, 13 + 35 / 60],
];

describe('the pinned zone history before 1970', () => {
  beforeAll(() => Promise.all([...new Set([...CASES.map((row) => row[2]), 'America/New_York', 'WET'])]
    .map((zone) => prepareLocalTime('1900-01-01', zone))));

  it.each(CASES)('%s', (_label, date, zone, longitude, utc, offset, host) => {
    const resolved = resolveLocalToUtc(date, '12:00', zone, { longitude });
    expect(resolved.utc.toISOString()).toBe(utc);
    expect(resolved.offsetMinutes).toBeCloseTo(offset, 9);
    // Without a longitude the host's history applies, as before.
    expect(resolveLocalToUtc(date, '12:00', zone).offsetMinutes).toBeCloseTo(host, 9);
  });

  it('changes nothing where the host already has the place\'s history', () => {
    const resolved = resolveLocalToUtc('1950-07-01', '12:00', 'America/New_York', { longitude: -74.01 });
    expect(resolved).toEqual(resolveLocalToUtc('1950-07-01', '12:00', 'America/New_York'));
  });

  it('hands over to the host at 1970 without a jump', () => {
    for (const [date, time, utc] of [
      ['1969-12-31', '23:30', '1969-12-31T22:30:00.000Z'],
      ['1970-01-01', '00:30', '1969-12-31T23:30:00.000Z'],
      ['1970-01-01', '01:30', '1970-01-01T00:30:00.000Z'],
    ]) {
      const resolved = resolveLocalToUtc(date, time, 'Europe/Stockholm', { longitude: 18.07 });
      expect(resolved.utc.toISOString()).toBe(utc);
      expect(resolved.flags).toEqual([]);
    }
  });

  it('leaves a name whose pinned history differs after 1970 to the host', () => {
    expect(Object.keys(excluded.excluded)).toContain('WET');
    const resolved = resolveLocalToUtc('1950-06-15', '12:00', 'WET', { longitude: -9.14 });
    expect(resolved).toEqual(resolveLocalToUtc('1950-06-15', '12:00', 'WET'));
  });
});

describe('loading the pinned history', () => {
  it('refuses to resolve a birthplace time before 1970 until the zone is prepared', async () => {
    const fresh = await import('./localToUtc?history-unloaded' as string) as typeof import('./localToUtc');
    expect(() => fresh.resolveLocalToUtc('1960-07-01', '12:00', 'Europe/Oslo', { longitude: 10.75 }))
      .toThrow('prepareLocalTime');
    await fresh.prepareLocalTime('1960-07-01', 'Europe/Copenhagen');
    // Preparing another zone does not prepare this one.
    expect(() => fresh.resolveLocalToUtc('1960-07-01', '12:00', 'Europe/Oslo', { longitude: 10.75 }))
      .toThrow('prepareLocalTime');
    // 1971 needs nothing.
    expect(fresh.resolveLocalToUtc('1971-07-01', '12:00', 'Europe/Oslo', { longitude: 10.75 }).offsetMinutes).toBe(60);
    await fresh.prepareLocalTime('1960-07-01', 'Europe/Oslo');
    expect(fresh.resolveLocalToUtc('1960-07-01', '12:00', 'Europe/Oslo', { longitude: 10.75 }).offsetMinutes).toBe(120);
  });

  it('downloads a zone once, and does not remember a failed download', async () => {
    vi.resetModules();
    let calls = 0;
    let fail = true;
    vi.doMock('./tz-history-load', async (importOriginal) => {
      const original = await importOriginal<typeof import('./tz-history-load')>();
      return {
        ...original,
        loadZoneHistory: async (name: string) => {
          calls += 1;
          if (fail) throw new Error('offline');
          return original.loadZoneHistory(name);
        },
      };
    });
    const fresh = await import('./localToUtc');
    const { ModuleLoadError } = await import('../module-load');
    await expect(fresh.prepareLocalTime('1947-07-01', 'Europe/Stockholm')).rejects.toBeInstanceOf(ModuleLoadError);
    fail = false;
    await fresh.prepareLocalTime('1947-07-01', 'Europe/Stockholm');
    await fresh.prepareLocalTime('1930-01-01', 'Europe/Stockholm');
    expect(calls).toBe(2);
    expect(fresh.resolveLocalToUtc('1947-07-01', '12:00', 'Europe/Stockholm', { longitude: 18.07 }).offsetMinutes).toBe(60);
    vi.doUnmock('./tz-history-load');
    vi.resetModules();
  });
});
