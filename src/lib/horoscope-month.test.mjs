import { describe, expect, it } from 'vitest';
import { currentHoroscopeMonth, utcMonth } from './horoscope-month.mjs';

describe('monthly horoscope edition selection', () => {
  it('shows the latest month that is not after the build month', () => {
    expect(currentHoroscopeMonth(['2026-07', '2026-08', '2026-09'], '2026-08')).toBe('2026-08');
    expect(currentHoroscopeMonth(['2026-09', '2026-07', '2026-08', '2026-08'], '2026-08')).toBe('2026-08');
    expect(currentHoroscopeMonth(['2026-07', '2026-08'], '2026-10')).toBe('2026-08');
  });

  it('keeps a month prepared ahead of time inert until its first day', () => {
    expect(currentHoroscopeMonth(['2026-09', '2026-10'], '2026-09')).toBe('2026-09');
    expect(currentHoroscopeMonth(['2026-09', '2026-10'], '2026-10')).toBe('2026-10');
    expect(currentHoroscopeMonth(['2026-10'], '2026-09')).toBeUndefined();
    expect(currentHoroscopeMonth([], '2026-09')).toBeUndefined();
  });

  it('rejects a malformed current month rather than guessing', () => {
    expect(() => currentHoroscopeMonth(['2026-09'], '2026-9')).toThrow('current month must be YYYY-MM');
    expect(() => currentHoroscopeMonth(['2026-09'], undefined)).toThrow('current month must be YYYY-MM');
  });

  it('reads the UTC month from a clock value', () => {
    expect(utcMonth(new Date('2026-09-30T23:59:59.999Z'))).toBe('2026-09');
    expect(utcMonth(new Date('2026-10-01T00:00:00.000Z'))).toBe('2026-10');
    expect(utcMonth('2026-12-31T12:00:00Z')).toBe('2026-12');
    expect(() => utcMonth('not a date')).toThrow('invalid clock value');
  });
});
