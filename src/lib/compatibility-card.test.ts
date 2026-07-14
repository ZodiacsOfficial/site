import { describe, expect, it } from 'vitest';
import { compatibilityHeadline, type CompatibilityCardPerson } from './compatibility-card';
import { SHARE_CARD_WORDMARK } from './share-card';

describe('compatibility share card', () => {
  it('selects a deterministic headline from the computed aspect balance', () => {
    expect(compatibilityHeadline({ easeful: 4, charged: 2 })).toBe('Flow, with useful friction');
    expect(compatibilityHeadline({ easeful: 1, charged: 3 })).toContain('attention');
    expect(compatibilityHeadline({ easeful: 2, charged: 2 })).toContain('even exchange');
  });

  it('accepts placements and a chosen label, never birth inputs', () => {
    const person: CompatibilityCardPerson = {
      label: 'Person A',
      bodies: [{ body: 'Sun', lon: 12 }],
      asc: 42,
    };
    expect(Object.keys(person).sort()).toEqual(['asc', 'bodies', 'label']);
  });

  it('shares the bottom-right wordmark register with chart cards', () => {
    expect(SHARE_CARD_WORDMARK.align).toBe('right');
    expect(SHARE_CARD_WORDMARK.x).toBeGreaterThan(1000);
  });
});
