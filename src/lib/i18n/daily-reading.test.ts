import { describe, expect, it } from 'vitest';
import dailyData from '../../data/daily.json';
import { dailyReading, type Daily } from '../daily';
import { SIGNS } from '../signs';
import { dailyReadingForLocale } from './daily-reading';

const daily = dailyData as Daily;

describe('localized daily readings', () => {
  it.each(['es', 'pt'] as const)('%s renders the English selection line for line, from the same receipts', (locale) => {
    for (const sign of SIGNS) {
      const english = dailyReading(sign.slug, daily);
      const localized = dailyReadingForLocale(sign.slug, daily, locale);
      // Everything but the sentence itself must be identical: the house, the
      // body, the hue, the template that produced it, its scope, and the
      // evidence it cites.
      const shape = (reading: typeof english) => reading.lines.map((line) => ({
        house: line.house ?? null,
        body: line.body ?? null,
        hue: line.hue ?? null,
        templateId: line.templateId ?? null,
        scope: line.scope ?? null,
        evidenceRefs: line.evidenceRefs ?? null,
      }));
      expect(localized.lines, sign.slug).toHaveLength(english.lines.length);
      expect(shape(localized), sign.slug).toEqual(shape(english));
      for (const [index, line] of localized.lines.entries()) {
        expect(line.text.length, `${sign.slug} line ${index}`).toBeGreaterThan(20);
        expect(line.text, `${sign.slug} line ${index}`).not.toBe(english.lines[index]?.text);
        expect(line.receipt, `${sign.slug} line ${index}`).toBeTruthy();
      }
      expect(localized.headline).toBe(localized.lines[0]?.text);
    }
  });
});
