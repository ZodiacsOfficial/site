/**
 * A birth date as written, read in the calendar the form was given (engine
 * brief step 1.13b). The birth forms offer the Julian (Old Style) calendar only
 * for a date written before 1924. An Old Style date is converted with
 * calendar.ts before its local time is resolved, so a chart, a saved chart and
 * every shared link carry the Gregorian date they carry today.
 */
import { gregorianAdoption, type GregorianAdoption } from '../../data/gregorian-adoption';
import { julianToGregorian } from './calendar';
import { CALENDAR_CHOICE_BEFORE } from './calendar-choice';
import { parseCivilDate } from './civil-date';

export type CalendarChoice = 'gregorian' | 'julian';

/** The birth forms' range, as written: the date inputs' min and max. */
export const BIRTH_DATE_FIRST = '1800-01-01';
export const BIRTH_DATE_LAST = '2199-12-31';

const COMPLETE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A date typed into the Old Style text field, as YYYY-MM-DD: a four-digit
 * year, then month and day, separated by -, ., / or a space, or eight digits
 * in that order. Anything else comes back trimmed and fails the next check.
 */
export function writtenDate(value: string): string {
  const text = value.trim();
  const parts = /^(\d{4})[-./ ](\d{1,2})[-./ ](\d{1,2})$/.exec(text) ?? /^(\d{4})(\d{2})(\d{2})$/.exec(text);
  return parts ? `${parts[1]}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}` : text;
}

export type BirthDateProblem = 'format' | 'range' | 'julian' | 'gregorian';

export type BirthDateReading =
  /** The Gregorian date to compute from, and the date as written when it was Old Style. */
  | { date: string; oldStyle?: string }
  | { problem: BirthDateProblem };

/** Read a birth date in the calendar chosen for it; a date written in 1924 or later is Gregorian. */
export function readBirthDate(value: string, calendar: CalendarChoice): BirthDateReading {
  const written = writtenDate(value);
  if (!COMPLETE.test(written)) return { problem: 'format' };
  if (written < BIRTH_DATE_FIRST || written > BIRTH_DATE_LAST) return { problem: 'range' };
  if (calendar === 'gregorian' || written >= CALENDAR_CHOICE_BEFORE) {
    return parseCivilDate(written) ? { date: written } : { problem: 'gregorian' };
  }
  const date = julianToGregorian(written);
  return date ? { date, oldStyle: written } : { problem: 'julian' };
}

export type AdoptionNoteKind = 'old-style' | 'new-style' | 'other-calendar';

export interface AdoptionNote {
  kind: AdoptionNoteKind;
  adoption: GregorianAdoption;
}

/**
 * What the birthplace's calendar history says about a date written before
 * 1924. `old-style`: it was left Gregorian but falls before the country took
 * the New Style. `new-style`: it was marked Old Style but falls on or after
 * that day. `other-calendar`: it falls before the change in a country whose
 * earlier calendar was not the Julian, which the forms cannot convert. Null
 * when the country is not in the table or the date says nothing about it.
 * Advice only: no note stops a chart.
 */
export function adoptionNote(value: string, calendar: CalendarChoice, country: string | undefined): AdoptionNote | null {
  const adoption = gregorianAdoption(country);
  if (!adoption || writtenDate(value) >= CALENDAR_CHOICE_BEFORE) return null;
  const reading = readBirthDate(value, calendar);
  if ('problem' in reading) return null;
  const julian = calendar === 'julian';
  if (reading.date >= adoption.firstGregorian) return julian ? { kind: 'new-style', adoption } : null;
  if (!adoption.lastJulian) return { kind: 'other-calendar', adoption };
  return julian ? null : { kind: 'old-style', adoption };
}
