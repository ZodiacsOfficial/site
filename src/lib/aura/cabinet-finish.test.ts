import { describe, expect, it } from 'vitest';
import {
  GILDED_MINIMUM_SCULPTURES,
  cabinetEditionForHolding,
  cabinetFinishForAtomicAmount,
  cabinetHoldingForAtomicAmount,
  goldCountForAtomicAmount,
  isCanonicalGoldCount,
  isGildedGoldCount,
} from './cabinet-finish';

describe('cabinetFinishForAtomicAmount', () => {
  it.each([
    ['empty', 0n, 6, null],
    ['smallest positive', 1n, 6, 'pastel'],
    ['below bronze', 9_999_999_999n, 6, 'pastel'],
    ['bronze boundary', 10_000_000_000n, 6, 'bronze'],
    ['below silver', 99_999_999_999n, 6, 'bronze'],
    ['silver boundary', 100_000_000_000n, 6, 'silver'],
    ['below gold', 999_999_999_999n, 6, 'silver'],
    ['gold boundary', 1_000_000_000_000n, 6, 'gold'],
  ] as const)('classifies %s exactly', (_label, amount, decimals, expected) => {
    expect(cabinetFinishForAtomicAmount(amount, decimals)).toBe(expected);
  });

  it('derives thresholds from the representation decimals', () => {
    expect(cabinetFinishForAtomicAmount(999_999n, 0)).toBe('silver');
    expect(cabinetFinishForAtomicAmount(1_000_000n, 0)).toBe('gold');
    expect(cabinetFinishForAtomicAmount(999_999_999n, 3)).toBe('silver');
    expect(cabinetFinishForAtomicAmount(1_000_000_000n, 3)).toBe('gold');
    expect(cabinetFinishForAtomicAmount(10_000n * 10n ** 9n, 9)).toBe('bronze');
  });

  it.each([
    ['below Gold', 999_999_999_999n, 6, null],
    ['one Gold', 1_000_000_000_000n, 6, '1'],
    ['three Gold with a remainder', 3_999_999_999_999n, 6, '3'],
    ['zero-decimal Gold', 7_000_001n, 0, '7'],
    ['nine-decimal Gold', 2_000_000n * 10n ** 9n, 9, '2'],
  ] as const)('counts %s using exact atomic units', (_label, amount, decimals, expected) => {
    expect(goldCountForAtomicAmount(amount, decimals)).toBe(expected);
  });

  it('preserves arbitrarily large Gold counts as canonical decimal strings', () => {
    const count = 12_345_678_901_234_567_890n;
    const amount = count * 1_000_000n * 1_000n + 999n;
    expect(goldCountForAtomicAmount(amount, 3)).toBe(count.toString());
  });

  it('builds holdings with Gold multiplicity only for Gold finishes', () => {
    expect(cabinetHoldingForAtomicAmount('aries', 10_000_000_000n, 6)).toEqual({
      sign: 'aries', finish: 'bronze',
    });
    expect(cabinetHoldingForAtomicAmount('aries', 3_500_000_000_000n, 6)).toEqual({
      sign: 'aries', finish: 'gold', goldCount: '3',
    });
  });

  it.each(['1', '3', '12345678901234567890'])('accepts canonical Gold count %s', (value) => {
    expect(isCanonicalGoldCount(value)).toBe(true);
  });

  it.each([undefined, null, 1, '', '0', '01', '-1', '1.0', '1e3', ' 1'])
    ('rejects non-canonical Gold count %j', (value) => {
      expect(isCanonicalGoldCount(value)).toBe(false);
    });

  it('gilds the case from the tenth complete sculpture', () => {
    expect(GILDED_MINIMUM_SCULPTURES).toBe(10n);
    expect(isGildedGoldCount('9')).toBe(false);
    expect(isGildedGoldCount('10')).toBe(true);
    expect(isGildedGoldCount(10n)).toBe(true);
    expect(isGildedGoldCount('12345678901234567890')).toBe(true);
    expect(isGildedGoldCount(null)).toBe(false);
    expect(isGildedGoldCount(undefined)).toBe(false);
    expect(isGildedGoldCount('not-a-count')).toBe(false);
  });

  it('derives the fifth edition from Gold multiplicity, never from storage', () => {
    // Ten million held in one sign is ten complete sculptures.
    const gilded = cabinetHoldingForAtomicAmount('aries', 10_000_000_000_000n, 6)!;
    expect(gilded).toEqual({ sign: 'aries', finish: 'gold', goldCount: '10' });
    expect(cabinetEditionForHolding(gilded)).toBe('gilded');
    expect(cabinetEditionForHolding(
      cabinetHoldingForAtomicAmount('aries', 9_999_999_999_999n, 6)!,
    )).toBe('gold');
    expect(cabinetEditionForHolding({ finish: 'silver' })).toBe('silver');
    expect(cabinetEditionForHolding({ finish: 'pastel' })).toBe('pastel');
  });

  it('rejects negative amounts and invalid decimals', () => {
    expect(() => cabinetFinishForAtomicAmount(-1n, 6)).toThrow(RangeError);
    expect(() => cabinetFinishForAtomicAmount(1n, -1)).toThrow(RangeError);
    expect(() => cabinetFinishForAtomicAmount(0n, -1)).toThrow(RangeError);
    expect(() => cabinetFinishForAtomicAmount(1n, 1.5)).toThrow(RangeError);
    expect(() => cabinetFinishForAtomicAmount(1n, 256)).toThrow(RangeError);
  });
});
