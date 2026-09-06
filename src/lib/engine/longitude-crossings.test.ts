import { describe, expect, it } from 'vitest';
import { findLongitudeCrossingsWith } from './longitude-crossings';

const DAY = 86_400_000;
const norm = (value: number) => ((value % 360) + 360) % 360;

function crossings(longitudeAtDay: (day: number) => number, target: number) {
  return findLongitudeCrossingsWith(
    (_body, date) => norm(longitudeAtDay(date.getTime() / DAY)),
    'Sun', target, new Date(0), new Date(2 * DAY), 1,
  );
}

describe('longitude crossing interval (from, to]', () => {
  for (const retrograde of [false, true]) {
    const direction = retrograde ? 'retrograde' : 'direct';
    const longitude = (day: number) => retrograde ? 20 - 10 * day : 10 * day;

    it(`${direction}: excludes an exact lower endpoint`, () => {
      expect(crossings(longitude, longitude(0))).toEqual([]);
    });

    it(`${direction}: emits an exact internal sample once`, () => {
      expect(crossings(longitude, longitude(1)))
        .toEqual([{ at: new Date(DAY), retrograde }]);
    });

    it(`${direction}: includes an exact upper endpoint once`, () => {
      expect(crossings(longitude, longitude(2)))
        .toEqual([{ at: new Date(2 * DAY), retrograde }]);
    });

    it(`${direction}: still bisects between samples`, () => {
      const result = crossings(longitude, longitude(0.375));
      expect(result).toHaveLength(1);
      expect(result[0].retrograde).toBe(retrograde);
      // One 24-step bisection of a day is 5.15ms; Date adds <1ms rounding.
      expect(Math.abs(result[0].at.getTime() - 0.375 * DAY)).toBeLessThanOrEqual(6);
    });

    it(`${direction}: recognizes the real 360° wrap once`, () => {
      const wrap = (day: number) => retrograde ? 10 - 10 * day : 350 + 10 * day;
      expect(crossings(wrap, 0)).toEqual([{ at: new Date(DAY), retrograde }]);
    });

    it(`${direction}: rejects the antipodal sign change`, () => {
      const opposite = (day: number) => retrograde ? 190 - 10 * day : 170 + 10 * day;
      expect(crossings(opposite, 0)).toEqual([]);
    });
  }
});
