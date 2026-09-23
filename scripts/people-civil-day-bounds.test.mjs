import { describe, expect, it } from 'vitest';
import { completeCivilDay } from '../docs/phase5/people-pilot/tools/civil-day-bounds.mjs';
import data from '../src/data/people.json';

/*
 * validate-pilot.mjs once rejected any civil day whose end contained
 * "23:59", to catch compute-astro's UTC-day stand-in. A birthplace's own
 * mean time can put a real local midnight at 23:59 UTC and some seconds, and
 * "00:23:59" contains the same four characters, so the check now rejects
 * only the stand-in itself.
 */
describe('the People validator\'s complete civil-day check', () => {
  it.each([
    ['Honfleur, 1866: local midnight at 23:59:04 UTC', '1866-05-16T23:59:04.000Z', '1866-05-17T23:59:04.000Z'],
    ['Upton, 1827: local midnight at 23:59:54 UTC', '1827-04-04T23:59:54.000Z', '1827-04-05T23:59:54.000Z'],
    ['Wisbech, 1838: local midnight at 23:59:22 UTC', '1838-12-02T23:59:22.000Z', '1838-12-03T23:59:22.000Z'],
    ['Seville, 1875: local midnight at 00:23:59 UTC', '1875-07-26T00:23:59.000Z', '1875-07-27T00:23:59.000Z'],
    ['Jhang, 1926: a zone-time day', '1926-01-28T18:30:00.000Z', '1926-01-29T18:30:00.000Z'],
    ['London, 2021: a 23-hour day as the clocks go forward', '2021-03-28T00:00:00.000Z', '2021-03-28T23:00:00.000Z'],
    ['London, 2021: a 25-hour day as the clocks go back', '2021-10-30T23:00:00.000Z', '2021-11-01T00:00:00.000Z'],
  ])('accepts %s', (_, start, end) => {
    expect(completeCivilDay(start, end)).toBe(true);
  });

  it.each([
    ['the UTC-day stand-in', '1926-01-29T00:00:00.000Z', '1926-01-29T23:59:59.999Z'],
    ['a day shorter than 23 hours', '1926-01-28T18:30:00.000Z', '1926-01-29T17:29:59.000Z'],
    ['a day longer than 25 hours', '1926-01-28T18:30:00.000Z', '1926-01-29T19:30:01.000Z'],
    ['an unreadable bound', 'not a date', '1926-01-29T18:30:00.000Z'],
  ])('rejects %s', (_, start, end) => {
    expect(completeCivilDay(start, end)).toBe(false);
  });

  it('accepts every published record', () => {
    const failing = data.people.filter((person) => !completeCivilDay(
      person.computation.civilDayStartUtc,
      person.computation.civilDayEndUtc,
    )).map((person) => person.slug);
    expect(failing).toEqual([]);
  });
});
