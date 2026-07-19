import { describe, expect, it } from 'vitest';
import dailyData from '../../data/daily.json';
import type { Daily } from '../../lib/daily';
import { SIGN_SLUGS } from '../../lib/signs';
import { sunSignTodayLine } from './sun-sign-reading';

describe('sunSignTodayLine', () => {
  it('gives every Sun sign a single plain-language focus without house jargon', () => {
    const lines: string[] = [];
    for (const sign of SIGN_SLUGS) {
      const line = sunSignTodayLine(sign, dailyData as Daily);
      lines.push(line);
      expect(line).toMatch(/^Today may draw more attention to /);
      expect(line).not.toMatch(/\b(?:aspect|degree|house|UTC)\b/i);
    }
    expect(new Set(lines).size).toBe(12);
  });
});
