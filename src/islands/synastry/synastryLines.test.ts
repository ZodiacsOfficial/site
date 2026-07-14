import { describe, expect, it } from 'vitest';
import { canonicalSynastryPair, synastryCorpusLine, SYNASTRY_LINES } from './synastryLines';

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
