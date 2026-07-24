import { describe, expect, it } from 'vitest';
import { SIGNS } from '../signs';
import { cabinetOf, tierFor, totalHeld } from './tiers';

const fullCabinet = (amountPerSign: number) => SIGNS
  .map((sign) => ({ sign: sign.slug, amount: amountPerSign }));

describe('collection tiers', () => {
  it('is none with nothing held and bronze from the first dust', () => {
    expect(tierFor([])).toBe('none');
    expect(tierFor([{ sign: 'leo', amount: 0 }])).toBe('none');
    expect(tierFor([{ sign: 'leo', amount: 0.000001 }])).toBe('bronze');
  });

  it('follows total amount across signs for silver and gold', () => {
    expect(tierFor([{ sign: 'leo', amount: 99_999.999999 }])).toBe('bronze');
    expect(tierFor([{ sign: 'leo', amount: 100_000 }])).toBe('silver');
    expect(tierFor([
      { sign: 'leo', amount: 600_000 },
      { sign: 'aries', amount: 400_000 },
    ])).toBe('gold');
  });

  it('reserves master for gold depth with every seat filled', () => {
    expect(tierFor(fullCabinet(1))).toBe('bronze');
    expect(tierFor(fullCabinet(10_000))).toBe('silver');
    expect(tierFor([{ sign: 'leo', amount: 5_000_000 }])).toBe('gold');
    expect(tierFor(fullCabinet(90_000))).toBe('master');
  });

  it('counts each sign once in zodiac order and ignores unknown or zero rows', () => {
    expect(cabinetOf([
      { sign: 'pisces', amount: 2 },
      { sign: 'aries', amount: 1 },
      { sign: 'aries', amount: 3 },
      { sign: 'not-a-sign', amount: 9 },
      { sign: 'leo', amount: 0 },
    ])).toEqual(['aries', 'pisces']);
    expect(totalHeld([
      { sign: 'aries', amount: 1.5 },
      { sign: 'not-a-sign', amount: 9 },
      { sign: 'virgo', amount: 0.5 },
    ])).toBe(2);
  });
});
