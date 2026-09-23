import { beforeAll, describe, expect, it } from 'vitest';
import adoption from '../../data/gregorian-adoption.json';
import cityIndex from '../../../public/data/cities/index.json';
import { computeChart } from '../engine/full';
import { gregorianToJulian, julianToGregorian, parseJulianDate } from './calendar';
import { parseCivilDate } from './civil-date';
import { prepareLocalTime, resolveLocalToUtc } from './localToUtc';

const iso = (d: { year: number; month: number; day: number }) =>
  `${String(d.year).padStart(4, '0')}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;

/** A day counter that knows only its own calendar's month lengths. */
function counter(start: { year: number; month: number; day: number }, leap: (year: number) => boolean) {
  const date = { ...start };
  const days = () => (date.month === 2 ? (leap(date.year) ? 29 : 28) : [4, 6, 9, 11].includes(date.month) ? 30 : 31);
  return {
    iso: () => iso(date),
    next() {
      date.day += 1;
      if (date.day > days()) { date.day = 1; date.month += 1; }
      if (date.month > 12) { date.month = 1; date.year += 1; }
    },
    previous() {
      date.day -= 1;
      if (date.day < 1) {
        date.month -= 1;
        if (date.month < 1) { date.month = 12; date.year -= 1; }
        date.day = days();
      }
    },
  };
}

describe('Julian and Gregorian calendar dates', () => {
  it('agrees, day by day from 1500 to 2199, with two counters walked from the 1582 changeover', () => {
    // Julian 1582-10-04 was followed by Gregorian 1582-10-15: the same day as Julian 1582-10-05.
    const julian = counter({ year: 1582, month: 10, day: 5 }, (y) => y % 4 === 0);
    const gregorian = counter({ year: 1582, month: 10, day: 15 }, (y) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0));
    let checked = 0;
    const wrong: string[] = [];
    const check = () => {
      if (julianToGregorian(julian.iso()) !== gregorian.iso()) wrong.push(`${julian.iso()} → ${julianToGregorian(julian.iso())}`);
      if (gregorianToJulian(gregorian.iso()) !== julian.iso()) wrong.push(`${gregorian.iso()} ← ${gregorianToJulian(gregorian.iso())}`);
      checked += 1;
    };
    while (julian.iso() <= '2199-12-31') { check(); julian.next(); gregorian.next(); }
    const back = [counter({ year: 1582, month: 10, day: 4 }, (y) => y % 4 === 0),
      counter({ year: 1582, month: 10, day: 14 }, (y) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0))] as const;
    Object.assign(julian, back[0]);
    Object.assign(gregorian, back[1]);
    while (julian.iso() >= '1500-01-01') { check(); julian.previous(); gregorian.previous(); }
    expect(checked).toBeGreaterThan(255_000);
    expect(wrong.slice(0, 5)).toEqual([]);
  });

  it.each([
    ['1917-10-25', '1917-11-07'],
    ['1918-01-31', '1918-02-13'],
    ['1900-02-29', '1900-03-13'],
    ['1800-02-29', '1800-03-12'],
    ['2100-02-29', '2100-03-14'],
    ['1752-09-02', '1752-09-13'],
    ['1923-02-15', '1923-02-28'],
    ['1800-01-01', '1800-01-12'],
    ['2199-12-17', '2199-12-31'],
  ])('reads Old Style %s as %s', (julian, gregorian) => {
    expect(julianToGregorian(julian)).toBe(gregorian);
    expect(gregorianToJulian(gregorian)).toBe(julian);
  });

  it('keeps each calendar\'s own leap rule', () => {
    expect(parseJulianDate('1900-02-29')).toEqual({ year: 1900, month: 2, day: 29 });
    expect(parseJulianDate('1900-02-30')).toBeNull();
    expect(parseCivilDate('1900-02-29')).toBeNull();
    expect(gregorianToJulian('1900-02-29')).toBeNull();
    expect(julianToGregorian('1917-13-01')).toBeNull();
    expect(julianToGregorian(19171025)).toBeNull();
  });
});

describe('an Old Style birth', () => {
  beforeAll(() => prepareLocalTime('1917-11-07'));

  it('gives the same chart in Petrograd as typing its Gregorian date', () => {
    const place = { latitude: 59.94, longitude: 30.31 };
    const oldStyle = resolveLocalToUtc(julianToGregorian('1917-10-25')!, '12:00', 'Europe/Moscow', { longitude: place.longitude });
    const newStyle = resolveLocalToUtc('1917-11-07', '12:00', 'Europe/Moscow', { longitude: place.longitude });
    expect(oldStyle.utc.toISOString()).toBe(newStyle.utc.toISOString());
    const chart = computeChart({ utc: oldStyle.utc, ...place, houseSystem: 'placidus', timeKnown: true, flags: oldStyle.flags });
    const sun = chart.bodies.find((row) => row.body === 'Sun')!;
    // Scorpio, where the Old Style date read as Gregorian would put it in Libra.
    expect(Math.floor(sun.lon / 30)).toBe(7);
  });
});

describe('the Gregorian adoption table', () => {
  it('cites every row and joins the city index by country', () => {
    const countries = new Set(cityIndex.countries);
    for (const row of adoption.rows) {
      expect(countries.has(row.country), row.country).toBe(true);
      expect(row.source.length).toBeGreaterThan(20);
      // The last Old Style day is the day before the first New Style one.
      const next = new Date(`${julianToGregorian(row.lastJulian)}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      expect(next.toISOString().slice(0, 10)).toBe(row.firstGregorian);
    }
  });
});
