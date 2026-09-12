import { describe, expect, it } from 'vitest';
import { parseCivilDate, parseCivilTime } from './civil-date';

describe('parseCivilDate', () => {
  it.each([
    ['0000-02-29', { year: 0, month: 2, day: 29 }],
    ['0001-01-01', { year: 1, month: 1, day: 1 }],
    ['0099-12-31', { year: 99, month: 12, day: 31 }],
    ['1600-02-29', { year: 1600, month: 2, day: 29 }],
    ['1900-02-28', { year: 1900, month: 2, day: 28 }],
    ['2000-02-29', { year: 2000, month: 2, day: 29 }],
    ['2024-04-30', { year: 2024, month: 4, day: 30 }],
    ['9999-12-31', { year: 9999, month: 12, day: 31 }],
  ])('parses the actual Gregorian fields of %s', (value, fields) => {
    expect(parseCivilDate(value)).toEqual(fields);
  });

  it.each([
    '0001-02-29', '0100-02-29', '1900-02-29', '2001-02-29', '2100-02-29',
    '2000-02-30', '2001-04-31', '2001-06-31', '2001-09-31', '2001-11-31',
    '2001-00-01', '2001-13-01', '2001-01-00', '2001-01-32',
    '2001-2-03', '01-02-03', '-0001-01-01', '+010000-01-01', '10000-01-01',
    ' 2001-01-01', '2001-01-01 ', '2001-01-01\n', '2001-01-01\r\n',
    '2001-01-01T00:00:00Z', '２００１-０１-０１', '',
    null, undefined, 20010101, NaN, {}, ['2001-01-01'],
  ])('rejects invalid or non-canonical date %j without normalization', (value) => {
    expect(parseCivilDate(value)).toBeNull();
  });
});

describe('parseCivilTime', () => {
  it.each([
    ['00:00', { hour: 0, minute: 0 }],
    ['08:30', { hour: 8, minute: 30 }],
    ['23:59', { hour: 23, minute: 59 }],
  ])('parses canonical clock %s', (value, fields) => {
    expect(parseCivilTime(value)).toEqual(fields);
  });

  it.each([
    '24:00', '08:60', '99:99', '-1:00', '8:30', '08:3', '08:30:00',
    '08:30Z', '08:30+00:00', ' 08:30', '08:30 ', '08:30\n', '08:30\r\n',
    '０８:３０', '', null, undefined, 830, Infinity, {}, ['08:30'],
  ])('rejects invalid or non-canonical clock %j without normalization', (value) => {
    expect(parseCivilTime(value)).toBeNull();
  });
});
