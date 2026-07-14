import { describe, expect, it } from 'vitest';
import type { Element } from '../../lib/signs';
import {
  canonicalSynastryPair,
  MERCURY_ELEMENT_PAIRS,
  mercuryElementPairKey,
  synastryCorpusLine,
  SYNASTRY_LINES,
} from './synastryLines';

describe('synastry corpus resolution', () => {
  it('uses the corpus canonical order', () => {
    expect(canonicalSynastryPair('Mars', 'Moon')).toBe('Moon-Mars');
    expect(canonicalSynastryPair('Pluto', 'Sun')).toBe('Sun-Pluto');
    expect(canonicalSynastryPair('Neptune', 'Uranus')).toBe('Neptune-Uranus');
  });

  it('uses the conjunction override when supplied', () => {
    expect(synastryCorpusLine('Mars', 'Venus', 'conjunction')).toBe(SYNASTRY_LINES['Venus-Mars'].conj);
  });

  it('uses soft as the default conjunction line and maps hard aspects', () => {
    expect(synastryCorpusLine('Moon', 'Sun', 'conjunction')).toBe(SYNASTRY_LINES['Sun-Moon'].soft);
    expect(synastryCorpusLine('Moon', 'Sun', 'opposition')).toBe(SYNASTRY_LINES['Sun-Moon'].hard);
  });

  it('returns null for an uncurated pair', () => {
    expect(synastryCorpusLine('Uranus', 'Neptune', 'trine')).toBeNull();
  });
});

describe('Mercury element-pair framing', () => {
  const elements: Element[] = ['fire', 'earth', 'air', 'water'];

  it('contains the complete canonical ten-key corpus', () => {
    expect(Object.keys(MERCURY_ELEMENT_PAIRS)).toEqual([
      'fire-fire',
      'fire-earth',
      'fire-air',
      'fire-water',
      'earth-earth',
      'earth-air',
      'earth-water',
      'air-air',
      'air-water',
      'water-water',
    ]);
  });

  it('resolves every element pairing independent of chart order', () => {
    for (const a of elements) {
      for (const b of elements) {
        expect(mercuryElementPairKey(a, b)).toBe(mercuryElementPairKey(b, a));
        expect(MERCURY_ELEMENT_PAIRS[mercuryElementPairKey(a, b)]).toBeTruthy();
      }
    }
  });

  it('reuses all three existing communication contact entries', () => {
    expect(synastryCorpusLine('Mercury', 'Mercury', 'trine')).toBe(SYNASTRY_LINES['Mercury-Mercury'].soft);
    expect(synastryCorpusLine('Mercury', 'Moon', 'opposition')).toBe(SYNASTRY_LINES['Moon-Mercury'].hard);
    expect(synastryCorpusLine('Mars', 'Mercury', 'sextile')).toBe(SYNASTRY_LINES['Mercury-Mars'].soft);
  });
});
