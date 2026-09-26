import { describe, expect, it } from 'vitest';
import { adoptionNote, readBirthDate, writtenDate } from './birth-calendar';

describe('a birth date read in its calendar', () => {
  it.each([
    ['1917-10-25', 'julian', { date: '1917-11-07', oldStyle: '1917-10-25' }],
    ['1900-02-29', 'julian', { date: '1900-03-13', oldStyle: '1900-02-29' }],
    // Eleven days until the Julian leap day of 1800, twelve after it.
    ['1800-01-01', 'julian', { date: '1800-01-12', oldStyle: '1800-01-01' }],
    ['1800-03-01', 'julian', { date: '1800-03-13', oldStyle: '1800-03-01' }],
    ['1923-12-31', 'julian', { date: '1924-01-13', oldStyle: '1923-12-31' }],
    ['1917-11-07', 'gregorian', { date: '1917-11-07' }],
    // Written in 1924 or later: Gregorian whatever was chosen.
    ['1924-01-01', 'julian', { date: '1924-01-01' }],
    ['1950-06-15', 'julian', { date: '1950-06-15' }],
  ] as const)('reads %s (%s)', (value, calendar, expected) => {
    expect(readBirthDate(value, calendar)).toEqual(expected);
  });

  it('rejects a date that does not exist in the calendar chosen for it', () => {
    // A Julian leap day the Gregorian calendar skipped.
    expect(readBirthDate('1900-02-29', 'gregorian')).toEqual({ problem: 'gregorian' });
    expect(readBirthDate('1800-02-29', 'gregorian')).toEqual({ problem: 'gregorian' });
    expect(readBirthDate('1900-02-30', 'julian')).toEqual({ problem: 'julian' });
    expect(readBirthDate('1917-04-31', 'julian')).toEqual({ problem: 'julian' });
    expect(readBirthDate('1917-13-01', 'julian')).toEqual({ problem: 'julian' });
    expect(readBirthDate('1917-04-31', 'gregorian')).toEqual({ problem: 'gregorian' });
  });

  it('keeps the forms\' range and asks for year, month and day', () => {
    expect(readBirthDate('1799-12-31', 'julian')).toEqual({ problem: 'range' });
    expect(readBirthDate('2200-01-01', 'gregorian')).toEqual({ problem: 'range' });
    for (const value of ['', '1917', '1917-10', '25.10.1917', '10/25/1917', 'October 25, 1917']) {
      expect(readBirthDate(value, 'julian'), value).toEqual({ problem: 'format' });
    }
  });

  it('accepts the separators people type between year, month and day', () => {
    for (const value of ['1917-10-25', '1917.10.25', '1917/10/25', '1917 10 25', ' 1917-10-25 ', '19171025']) {
      expect(writtenDate(value), value).toBe('1917-10-25');
    }
    expect(writtenDate('1917-1-5')).toBe('1917-01-05');
    expect(readBirthDate('1917.10.25', 'julian')).toEqual({ date: '1917-11-07', oldStyle: '1917-10-25' });
  });
});

describe('the birthplace country note', () => {
  it('suggests the Old Style for a Russian date before 14 February 1918 left Gregorian', () => {
    expect(adoptionNote('1917-10-25', 'gregorian', 'Russia')).toMatchObject({ kind: 'old-style', adoption: { code: 'RU' } });
    // Dates Russia skipped are before its first New Style day too.
    expect(adoptionNote('1918-02-05', 'gregorian', 'Russia')?.kind).toBe('old-style');
    expect(adoptionNote('1918-02-14', 'gregorian', 'Russia')).toBeNull();
  });

  it('is silent when the choice already matches the country\'s calendar', () => {
    expect(adoptionNote('1917-10-25', 'julian', 'Russia')).toBeNull();
    expect(adoptionNote('1918-03-01', 'gregorian', 'Russia')).toBeNull();
    expect(adoptionNote('1850-06-01', 'gregorian', 'United Kingdom')).toBeNull();
  });

  it('notes an Old Style date that falls after the country took the New Style', () => {
    // Julian 1 February 1918 is Gregorian 14 February, Russia's first New Style day.
    expect(adoptionNote('1918-01-31', 'julian', 'Russia')).toBeNull();
    expect(adoptionNote('1918-02-01', 'julian', 'Russia')).toMatchObject({ kind: 'new-style', adoption: { code: 'RU' } });
    expect(adoptionNote('1850-06-01', 'julian', 'United Kingdom')?.kind).toBe('new-style');
    expect(adoptionNote('1850-06-01', 'julian', 'France')?.kind).toBe('new-style');
  });

  it('says the form cannot convert where the calendar before was not the Julian', () => {
    expect(adoptionNote('1860-05-01', 'gregorian', 'Japan')).toMatchObject({ kind: 'other-calendar', adoption: { code: 'JP' } });
    expect(adoptionNote('1860-05-01', 'julian', 'Japan')?.kind).toBe('other-calendar');
    expect(adoptionNote('1880-05-01', 'gregorian', 'Japan')).toBeNull();
    expect(adoptionNote('1880-05-01', 'julian', 'Japan')?.kind).toBe('new-style');
  });

  it('follows Greece to the last change, in 1923', () => {
    expect(adoptionNote('1923-02-28', 'gregorian', 'Greece')?.kind).toBe('old-style');
    expect(adoptionNote('1923-03-01', 'gregorian', 'Greece')).toBeNull();
    expect(adoptionNote('1923-12-31', 'julian', 'Greece')?.kind).toBe('new-style');
  });

  it('has nothing to say from 1924, without a birthplace, outside the table or for a date it cannot read', () => {
    expect(adoptionNote('1924-01-01', 'gregorian', 'Russia')).toBeNull();
    expect(adoptionNote('1924-01-01', 'julian', 'Russia')).toBeNull();
    expect(adoptionNote('1917-10-25', 'gregorian', undefined)).toBeNull();
    expect(adoptionNote('1917-10-25', 'gregorian', '')).toBeNull();
    expect(adoptionNote('1917-10-25', 'gregorian', 'Brazil')).toBeNull();
    expect(adoptionNote('1917-10', 'gregorian', 'Russia')).toBeNull();
    expect(adoptionNote('1900-02-29', 'gregorian', 'Russia')).toBeNull();
  });
});
