import { describe, expect, it } from 'vitest';
import programData from '../data/horoscope-program.json';
import { horoscopeHubTeaser, pageReadingFromProgram } from './horoscope-page-data';
import type { HoroscopeProgram } from './horoscope-program';

const program = programData as HoroscopeProgram;
const zodiacNamePattern = new RegExp(
  `\\b(?:${program.signs.map(({ sign }) => sign).join('|')})\\b`,
  'gu',
);

function normalizedTeaserTokens(value: string): string[] {
  return value
    .normalize('NFKD')
    .replace(/\p{Mark}+/gu, '')
    .toLowerCase()
    // Replacing rather than deleting sign names exposes boilerplate whose
    // only apparent difference is the interpolated sign.
    .replace(zodiacNamePattern, ' zodiac-sign ')
    .replace(/[^a-z0-9-]+/gu, ' ')
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

function shingles(tokens: readonly string[], width = 3): Set<string> {
  const values = new Set<string>();
  for (let index = 0; index <= tokens.length - width; index += 1) {
    values.add(tokens.slice(index, index + width).join(' '));
  }
  return values;
}

function shingleSimilarity(left: string, right: string): number {
  const a = shingles(normalizedTeaserTokens(left));
  const b = shingles(normalizedTeaserTokens(right));
  const intersection = [...a].filter((value) => b.has(value)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 1 : intersection / union;
}

describe('horoscope page sky strip', () => {
  it('does not inject a generic page-layer action after the evidence-backed reading', () => {
    for (const { sign } of program.signs) {
      for (const surface of ['today', 'tomorrow', 'weekly', 'love', 'career', 'year'] as const) {
        const reading = pageReadingFromProgram(program, sign, surface);
        expect('action' in reading, `${sign}/${surface} includes an uncited page-layer action`).toBe(false);
        expect(reading.sections.every((section) => section.body.length > 0)).toBe(true);
      }
    }
  });

  it.each(['today', 'tomorrow', 'weekly', 'love', 'career', 'year'] as const)(
    'derives concise %s markers from the reading evidence',
    (surface) => {
      const reading = pageReadingFromProgram(program, 'aries', surface);

      expect(reading.skyStrip.label).toBeTruthy();
      expect(reading.skyStrip.markers.length).toBeGreaterThanOrEqual(1);
      expect(reading.skyStrip.markers.length).toBeLessThanOrEqual(2);
      for (const marker of reading.skyStrip.markers) {
        expect(marker.value).toBeTruthy();
        expect(marker.datetime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    },
  );

  it('pairs the current Moon position with the exact daily event', () => {
    const reading = pageReadingFromProgram(program, 'aries', 'today');

    expect(reading.skyStrip.markers[0]).toMatchObject({ label: 'Moon' });
    expect(reading.skyStrip.markers[0].value).toContain('Waxing Crescent');
    expect(reading.skyStrip.markers[0].value).not.toMatch(/^Moon\b/);
    expect(reading.skyStrip.markers[1]).toMatchObject({ label: 'Exact' });
    expect(reading.skyStrip.markers[1].value).toMatch(/\bMars\b.*\bSaturn\b/u);
  });

  it('uses tomorrow’s own Moon phase without repeating the marker label', () => {
    const reading = pageReadingFromProgram(program, 'aries', 'tomorrow');

    expect(reading.skyStrip.markers[0]).toMatchObject({ label: 'Moon' });
    expect(reading.skyStrip.markers[0].value).toContain('First Quarter');
    expect(reading.skyStrip.markers[0].value).not.toMatch(/^Moon\b/);
  });

  it('keeps weekly publication metadata stable until the next Monday edition', () => {
    const reading = pageReadingFromProgram(program, 'aries', 'weekly');
    const weekFrom = program.signs[0].readings.weekly.period.from;

    expect(reading.datePublished).toBe(`${weekFrom}T00:00:00.000Z`);
    expect(reading.dateModified).toBe(reading.datePublished);
  });

  it('keeps the yearly renderer’s editorial chapter headings', () => {
    const reading = pageReadingFromProgram(program, 'capricorn', 'year');

    expect(reading.sections[0].heading).toBe('The shape of Capricorn’s 2027');
    expect(reading.sections.map((section) => section.heading)).toContain('Love, friendship, and clear terms');
    expect(reading.sections.at(-1)?.heading).toBe('A three-date plan for the year');
  });

  it('keeps all twelve rendered hub teasers distinct after truncation', () => {
    const teasers = program.signs.map(({ sign }) => {
      const reading = pageReadingFromProgram(program, sign, 'today');
      return {
        sign,
        text: horoscopeHubTeaser(reading.sections[0]?.body ?? reading.intro),
      };
    });

    expect(teasers).toHaveLength(12);
    expect(new Set(teasers.map(({ text }) => text))).toHaveLength(12);
    expect(teasers.every(({ text }) => text.length <= 177)).toBe(true);

    for (let left = 0; left < teasers.length; left += 1) {
      for (let right = left + 1; right < teasers.length; right += 1) {
        const a = teasers[left];
        const b = teasers[right];
        const similarity = shingleSimilarity(a.text, b.text);
        expect(
          similarity,
          `${a.sign}/${b.sign} rendered teasers are ${similarity.toFixed(3)} similar`,
        ).toBeLessThan(0.28);
      }
    }
  });
});
