import { describe, expect, it } from 'vitest';
import { AURA_SIGN_ORDER } from '../../lib/aura/types';
import { earnedCuratorialSets } from './curatorialSets';

describe('earnedCuratorialSets', () => {
  it('returns only fully represented arrangements', () => {
    const sets = earnedCuratorialSets(['aries', 'libra', 'leo', 'sagittarius']);

    expect(sets.map(({ id }) => id)).toEqual([
      'axis-aries-libra',
      'element-fire',
    ]);
    expect(sets.flatMap(({ members }) => members)).not.toContain('taurus');
  });

  it('does not expose incomplete-set progress', () => {
    expect(earnedCuratorialSets(['aries'])).toEqual([]);
    expect(earnedCuratorialSets(['aries', 'leo'])).toEqual([]);
  });

  it('recognizes every axis, triptych, quartet, and the complete Twelve', () => {
    const sets = earnedCuratorialSets(AURA_SIGN_ORDER);

    expect(sets.filter(({ kind }) => kind === 'opposite-pair')).toHaveLength(6);
    expect(sets.filter(({ kind }) => kind === 'element-triptych')).toHaveLength(4);
    expect(sets.filter(({ kind }) => kind === 'modality-quartet')).toHaveLength(3);
    expect(sets.filter(({ kind }) => kind === 'complete-twelve')).toHaveLength(1);
    expect(sets).toHaveLength(14);
  });
});
