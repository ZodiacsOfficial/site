import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import daily from '../data/daily.json';
import { currentHoroscopeMonth, utcMonth } from './horoscope-month.mjs';
import { eventList, monthLabel, transitMonthForEdition, transitsFor } from './horoscopes';

describe('transit editorial month', () => {
  it('selects the committed edition month despite future ephemeris files', () => {
    expect(transitsFor('2030-12')).not.toBeNull();
    expect(transitMonthForEdition('2026-09-04')).toBe('2026-09');
    expect(transitMonthForEdition(daily.date)).toBe(utcMonth(daily.date));
  });

  it('does not depend on the machine clock or publish a future month early', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2031-01-01T00:00:00Z'));
      expect(transitMonthForEdition('2026-09-30')).toBe('2026-09');
      expect(transitMonthForEdition('2026-10-01')).toBe('2026-10');
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses only available earlier data when the requested month is missing', () => {
    expect(currentHoroscopeMonth(['2026-08', '2030-12'], '2026-09')).toBe('2026-08');
    expect(currentHoroscopeMonth(['2030-12'], '2026-09')).toBeUndefined();
    expect(transitMonthForEdition('2025-12-31')).toBeNull();
    expect(transitMonthForEdition('2031-01-01')).toBe('2030-12');
  });

  it('rejects an invalid edition rather than guessing from the current clock', () => {
    expect(() => transitMonthForEdition('not-a-date')).toThrow('invalid clock value');
  });

  it.each(['en', 'es', 'pt', 'fr', 'it'] as const)('keeps %s labels and dates on the selected source month', (locale) => {
    const month = transitMonthForEdition('2026-09-04')!;
    expect(monthLabel(month, locale)).not.toMatch(/2030/u);
    expect(eventList(month, locale).length).toBeGreaterThan(0);
    expect(eventList(month, locale).every((event) => event.at.startsWith('2026-09-'))).toBe(true);
    const prefix = locale === 'en' ? '' : `${locale}/`;
    const page = readFileSync(new URL(`../pages/${prefix}transits/index.astro`, import.meta.url), 'utf8');
    expect(page).toContain('const month = transitMonthForEdition(daily.date);');
    expect(page).not.toContain('latestTransitMonth');
  });

  it('labels the fallback period explicitly instead of calling stale data this month', () => {
    const page = readFileSync(new URL('../pages/transits/index.astro', import.meta.url), 'utf8');
    expect(page).toContain('The sky in {label}');
    expect(page).toContain('Key dates for {label}');
    expect(page).not.toContain('Key dates this month');
  });
});
