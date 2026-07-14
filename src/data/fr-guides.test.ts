import { describe, expect, it } from 'vitest';
import { SIGNS } from '../lib/signs';
import { spanishGuideFor } from './es-guides';
import { frenchGuideFor } from './fr-guides';

describe('French sign guides', () => {
  it('keeps the full French guide structure complete across all twelve signs', () => {
    for (const sign of SIGNS) {
      const guide = frenchGuideFor(sign);
      const source = spanishGuideFor(sign);
      const text = [
        ...guide.intro,
        ...guide.sections.flatMap((section) => [section.heading, ...section.body]),
        ...guide.faq.flatMap(({ q, a }) => [q, a]),
      ].join('\n');

      expect(guide.intro).toHaveLength(source.intro.length);
      expect(guide.sections).toHaveLength(source.sections.length);
      expect(guide.sections.map((section) => section.body.length)).toEqual(
        source.sections.map((section) => section.body.length),
      );
      expect(guide.faq).toHaveLength(source.faq.length);
      expect(guide.sections.filter((section) => section.risingProfile)).toHaveLength(
        source.sections.filter((section) => section.risingProfile).length,
      );
      expect(guide.intro).toHaveLength(2);
      expect(guide.sections).toHaveLength(9);
      expect(guide.sections.flatMap((section) => section.body)).toHaveLength(24);
      expect(guide.faq).toHaveLength(6);
      expect(guide.sections.filter((section) => section.risingProfile)).toHaveLength(1);
      expect(guide.sections[6]?.heading).toContain('dans les placements du thème');
      expect(text).toContain('Le signe solaire n’est qu’un début.');
      expect(text).toMatch(/un signe (?:de |d’)/u);
      expect(text).not.toMatch(/[¿¡]|\b(?:carta|signo|compatibilidad|preguntas|nacimiento)\b/iu);
      expect(text).not.toMatch(/\b(?:birth chart|sun sign|rising sign|read more)\b/iu);
      expect(text).not.toContain('de adoucir');
      expect(text).not.toContain('se traduire toute la journée');
    }
  });

  it('preserves a distinct growth practice for every sign', () => {
    const practices = SIGNS.map((sign) => frenchGuideFor(sign).sections[7]?.body[1]);
    expect(new Set(practices).size).toBe(SIGNS.length);
  });
});
