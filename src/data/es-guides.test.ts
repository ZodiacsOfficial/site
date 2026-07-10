import { describe, expect, it } from 'vitest';
import { SIGNS } from '../lib/signs';
import { spanishGuideFor } from './es-guides';

describe('Spanish sign guides', () => {
  it('keeps the shared expansion grammatically complete across all twelve signs', () => {
    for (const sign of SIGNS) {
      const guide = spanishGuideFor(sign);
      const text = [
        ...guide.intro,
        ...guide.sections.flatMap((section) => [section.heading, ...section.body]),
        ...guide.faq.flatMap(({ q, a }) => [q, a]),
      ].join('\n');

      expect(text).toContain('Su don es claro:');
      expect(text).toContain('Esa suele ser la química más fácil.');
      expect(text).toContain(`${guide.title.split(':')[0]} en el trabajo, el dinero y el propósito`);
      expect(text).toContain('le ayudan estas prácticas:');
      expect(text).toContain('un signo de');
      expect(text).not.toMatch(/\.\s+[a-záéíóúñü]/u);
      expect(text).not.toMatch(/\bEn trabajo\b|\ble ayuda\b|\bregido por\b/u);
    }
  });
});
