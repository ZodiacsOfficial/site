import { describe, expect, it } from 'vitest';
import { SIGNS } from '../lib/signs';
import { portugueseGuideFor } from './pt-guides';

describe('Portuguese sign guides', () => {
  it('keeps the shared expansion grammatically complete across all twelve signs', () => {
    for (const sign of SIGNS) {
      const guide = portugueseGuideFor(sign);
      const text = [
        ...guide.intro,
        ...guide.sections.flatMap((section) => [section.heading, ...section.body]),
        ...guide.faq.flatMap(({ q, a }) => [q, a]),
      ].join('\n');

      expect(guide.intro).toHaveLength(2);
      expect(guide.sections).toHaveLength(9);
      expect(guide.sections.flatMap((section) => section.body)).toHaveLength(24);
      expect(guide.faq).toHaveLength(6);
      expect(text).toContain('Seu dom é claro:');
      expect(text).toContain('Essa costuma ser a química mais fácil.');
      expect(text).toContain(`${guide.title.split(':')[0]} no trabalho, no dinheiro e no propósito`);
      expect(text).toContain('Estas práticas ajudam');
      expect(text).toContain('um signo de');
      expect(text).not.toMatch(/\.\s+[a-záâãàéêíóôõúç]/u);
      expect(text).not.toMatch(/\bmapa natal\b|\bcarta natal\b|\bretrogado\b|\bascendente solar\b/iu);
    }
  });
});
