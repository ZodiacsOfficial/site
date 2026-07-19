import { describe, expect, it } from 'vitest';
import programData from '../data/horoscope-program.json';
import { pageReadingFromProgram } from './horoscope-page-data';
import type { HoroscopeProgram } from './horoscope-program';

const program = programData as HoroscopeProgram;

describe('horoscope page sky strip', () => {
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
});
