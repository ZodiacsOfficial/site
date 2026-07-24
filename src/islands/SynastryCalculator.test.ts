import { describe, expect, it } from 'vitest';
import {
  comparisonResultSource,
  pairSaveIsComplete,
} from './SynastryCalculator';

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

describe('invitation result provenance', () => {
  it('distinguishes a fresh completion from a positions-only saved restore', () => {
    expect(comparisonResultSource('positions', true, 'form')).toBe('invite');
    expect(comparisonResultSource('positions', false, 'positions')).toBe('invite-restored');
    expect(comparisonResultSource('saved', false, 'form')).toBe('plain');
  });
});
