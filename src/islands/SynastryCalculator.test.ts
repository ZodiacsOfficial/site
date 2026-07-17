import { describe, expect, it } from 'vitest';
import { pairSaveIsComplete } from './SynastryCalculator';

describe('compatibility save progression', () => {
  it('offers saving only until the comparison is stored', () => {
    expect(pairSaveIsComplete('idle', false)).toBe(false);
    expect(pairSaveIsComplete('full', false)).toBe(false);
    expect(pairSaveIsComplete('error', false)).toBe(false);
    expect(pairSaveIsComplete('saved', false)).toBe(true);
    expect(pairSaveIsComplete('exists', false)).toBe(true);
    expect(pairSaveIsComplete('idle', true)).toBe(true);
  });
});
