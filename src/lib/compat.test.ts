import { describe, expect, it } from 'vitest';
import { ALL_PAIRS, pairSlug } from './compat';

describe('canonical sun-sign pair index', () => {
  it('contains the 78 unique unordered pairings exactly once', () => {
    const slugs = ALL_PAIRS.map(([a, b]) => pairSlug(a, b));
    expect(slugs).toHaveLength(78);
    expect(new Set(slugs).size).toBe(78);
  });

  it('uses the same URL regardless of pair order', () => {
    expect(pairSlug('aries', 'pisces')).toBe(pairSlug('pisces', 'aries'));
  });
});
