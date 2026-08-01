import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  HOROSCOPE_SIGNS,
  assertEditionAge,
  assertHoroscopePackageFreshness,
  parseMonthlyHoroscopeEntry,
} from './horoscope-freshness-lib.mjs';

const now = new Date('2026-08-01T23:59:59.999Z');
const monthlyEntries = HOROSCOPE_SIGNS.map((sign) => ({
  sourceName: `${sign}.mdx`, sign, month: '2026-08', draft: false,
}));
const freshPackage = {
  now,
  daily: { date: '2026-08-01' },
  publication: { date: '2026-08-01' },
  manifest: { date: '2026-08-01' },
  program: { anchorDate: '2026-08-01' },
  transits: { month: '2026-08' },
  monthlyEntries,
};

describe('horoscope freshness gate', () => {
  it('accepts only the exact UTC day when the current-edition gate uses max age zero', () => {
    expect(assertEditionAge('2026-08-01', now, 0)).toBe(0);
    expect(() => assertEditionAge('2026-07-31', now, 0)).toThrow(
      'daily edition 2026-07-31 has age 1; allowed deployment range is 0-0 UTC days',
    );
    expect(() => assertEditionAge('2026-08-02', now, 0)).toThrow(/has age -1/u);
  });

  it('requires aligned daily artifacts and one complete current monthly edition', () => {
    expect(assertHoroscopePackageFreshness(freshPackage)).toEqual({
      currentDate: '2026-08-01', currentMonth: '2026-08', signCount: 12,
    });
    expect(() => assertHoroscopePackageFreshness({
      ...freshPackage,
      publication: { date: '2026-07-31' },
    })).toThrow('daily publication date 2026-07-31 does not match current UTC date 2026-08-01');
    expect(() => assertHoroscopePackageFreshness({
      ...freshPackage,
      monthlyEntries: monthlyEntries.slice(1),
    })).toThrow('monthly horoscope 2026-08 must contain exactly the 12 signs');
    expect(() => assertHoroscopePackageFreshness({
      ...freshPackage,
      monthlyEntries: [
        ...monthlyEntries,
        { sourceName: 'future.mdx', sign: 'aries', month: '2026-09', draft: false },
      ],
    })).toThrow('latest live monthly horoscope 2026-09 does not match current UTC month 2026-08');
  });

  it('parses explicit and implicit live monthly frontmatter', () => {
    expect(parseMonthlyHoroscopeEntry([
      '---',
      'sign: aries',
      'month: "2026-08"',
      'draft: false',
      '---',
      '',
      'Reading.',
    ].join('\n'), 'aries.mdx')).toEqual({
      sourceName: 'aries.mdx', sign: 'aries', month: '2026-08', draft: false,
    });
    expect(parseMonthlyHoroscopeEntry([
      '---',
      'sign: taurus',
      "month: '2026-07'",
      '---',
      '',
      'Reading.',
    ].join('\n'), 'taurus.mdx').draft).toBe(false);
  });

  it('pins the build command to zero-day freshness and the complete package gate', async () => {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    expect(pkg.scripts['editorial:daily:freshness']).toBe(
      'node scripts/verify-daily-freshness.mjs --max-age 0',
    );
    expect(pkg.scripts.prebuild).toContain('npm run editorial:horoscopes:freshness');
  });
});
