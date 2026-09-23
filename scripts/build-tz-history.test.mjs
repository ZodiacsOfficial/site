import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HISTORY_BUCKETS, historyBefore, historyBucket } from './build-tz-history.mjs';
import { historyBucket as resolverBucket } from '../src/lib/time/tz-history-load.ts';

// The committed output of `node scripts/build-tz-history.mjs`, checked
// offline; `--check` re-derives it from the pinned release with zic.
const directory = new URL('../src/data/tz-history/2025c/', import.meta.url);
const files = readdirSync(directory).sort();
const read = (file) => JSON.parse(readFileSync(new URL(file, directory), 'utf8'));
const buckets = files.filter((file) => file !== 'excluded.json');
const zones = Object.assign({}, ...buckets.map((file) => read(file).zones));
const { excluded } = read('excluded.json');
const lmt = JSON.parse(readFileSync(new URL('../src/data/tz-lmt.json', import.meta.url), 'utf8'));
const cities = JSON.parse(readFileSync(new URL('../public/data/cities/index.json', import.meta.url), 'utf8'));
const at = (history, seconds) => {
  let index = 0;
  while (index < history.t.length && history.t[index] <= seconds) index += 1;
  return history.o[index];
};

describe('the pinned zone history generator', () => {
  it('keeps the offsets before 1970, dropping zic\'s big bang and changes that keep the offset', () => {
    const tzif = { t: [-(2 ** 59), -2871681132, -2208992414, -1692496800, -1680483600, -1, 0, 100], typeOf: [0, 1, 2, 3, 2, 4, 3, 2], offsets: [4332, 3614, 3600, 7200, 3600] };
    expect(historyBefore(tzif)).toEqual({ t: [-2871681132, -2208992414, -1692496800, -1680483600], o: [4332, 3614, 3600, 7200, 3600] });
  });

  it('hashes names to buckets as the resolver\'s loader does', () => {
    expect(historyBucket('Europe/Stockholm')).toBe(resolverBucket('Europe/Stockholm'));
    for (const name of [...Object.keys(zones), ...Object.keys(excluded)]) expect(resolverBucket(name)).toBe(historyBucket(name));
  });
});

describe('the committed pinned zone history (tzdb 2025c with backzone)', () => {
  it(`is ${HISTORY_BUCKETS} bucket files and a list of excluded names`, () => {
    expect(buckets).toEqual(Array.from({ length: HISTORY_BUCKETS }, (_, index) => `${String(index).padStart(2, '0')}.json`));
    expect(files).toContain('excluded.json');
    for (const file of buckets) {
      const { tzdb, zones: inBucket } = read(file);
      expect(tzdb).toBe('2025c');
      for (const name of Object.keys(inBucket)) expect(`${historyBucket(name)}.json`).toBe(file);
    }
    expect(Object.keys(zones).length).toBeGreaterThan(550);
    for (const name of Object.keys(excluded)) expect(zones).not.toHaveProperty(name);
  });

  it('holds well-formed offsets before 1970', () => {
    for (const [name, history] of Object.entries(zones)) {
      expect(history.o.length, name).toBe(history.t.length + 1);
      history.t.forEach((t, index) => {
        expect(Number.isInteger(t) && t < 0, name).toBe(true);
        if (index > 0) expect(t > history.t[index - 1], name).toBe(true);
      });
      history.o.forEach((offset, index) => {
        expect(Number.isInteger(offset) && Math.abs(offset) <= 16 * 3600, name).toBe(true);
        if (index > 0) expect(offset, name).not.toBe(history.o[index - 1]);
      });
    }
  });

  it('gives Stockholm its own history, not Berlin\'s', () => {
    expect(zones['Europe/Stockholm']).toEqual({
      source: 'Europe/Stockholm',
      t: [-2871681132, -2208992414, -1692496800, -1680483600],
      o: [4332, 3614, 3600, 7200, 3600],
    });
    expect(zones['America/Kralendijk'].source).toBe('America/Curacao');
    expect(zones['Arctic/Longyearbyen'].source).toBe('Europe/Oslo');
  });

  it('agrees with the local mean time table about every era', () => {
    for (const [name, end] of Object.entries(lmt.eras)) {
      const history = zones[name];
      if (!history) continue;
      const lines = lmt.dateLine[name];
      expect(at(history, end - 1), name).toBe(lines ? lines.at(-1)[1] : lmt.offsets[name]);
    }
  });

  it('covers every zone in the city index', () => {
    const missing = cities.tz.filter((zone) => !zones[zone]);
    expect(missing).toEqual([]);
  });

  it.runIf(process.versions.tz === '2025c')('hands over to the host at 1970 with the same offset (host tzdb 2025c)', () => {
    const format = new Map();
    const hostOffset = (zone) => {
      if (!format.has(zone)) format.set(zone, new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' }));
      const name = format.get(zone).formatToParts(0).find((part) => part.type === 'timeZoneName').value;
      const match = /GMT([+-])(\d\d):(\d\d)(?::(\d\d))?/.exec(name);
      return match ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 3600 + Number(match[3]) * 60 + Number(match[4] ?? 0)) : 0;
    };
    const supported = new Set(Intl.supportedValuesOf('timeZone'));
    const differ = [];
    for (const [name, history] of Object.entries(zones)) {
      let known = supported.has(name);
      if (!known) {
        try { hostOffset(name); known = true; } catch { known = false; }
      }
      if (known && history.o.at(-1) !== hostOffset(name)) differ.push(name);
    }
    expect(differ).toEqual([]);
  });
});
