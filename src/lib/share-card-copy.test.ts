import { describe, expect, it } from 'vitest';
import { shareCardFormat, shareCardText } from './share-card-copy';

describe('share-card catalogue', () => {
  it('keeps every label translated through the card catalogue', () => {
    expect(shareCardText('en', 'bigThreeAction')).toBe('Share the big three');
    expect(shareCardText('es', 'compatibilityAction')).toContain('compatibilidad');
  });

  it('formats dominant-profile labels without free text', () => {
    expect(shareCardFormat('en', 'dominant', { element: 'Fire', modality: 'Fixed' }))
      .toBe('Dominant Fire · Fixed');
  });
});
