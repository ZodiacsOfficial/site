import { describe, expect, it } from 'vitest';
import { collectionReadingMatchesRequest, formatHeldAmount } from './Cabinet';

const REQUEST = { chain: 'base' as const, address: '0x0000000000000000000000000000000000000001' };

const READING = {
  chain: 'base',
  address: REQUEST.address,
  holdings: [{ sign: 'aries', amount: 1.5 }],
  totalAmount: 1.5,
  checkedAt: '2026-07-16T00:00:00.000Z',
};

describe('collection reading validation', () => {
  it('accepts only a well-formed reading for the requested address', () => {
    expect(collectionReadingMatchesRequest(READING, REQUEST)).toBe(true);
    expect(collectionReadingMatchesRequest({ ...READING, address: '0x0000000000000000000000000000000000000002' }, REQUEST)).toBe(false);
    expect(collectionReadingMatchesRequest({ ...READING, chain: 'solana' }, REQUEST)).toBe(false);
    expect(collectionReadingMatchesRequest({ ...READING, holdings: [{ sign: 'not-a-sign', amount: 1 }] }, REQUEST)).toBe(false);
    expect(collectionReadingMatchesRequest({ ...READING, holdings: [{ sign: 'aries', amount: Number.NaN }] }, REQUEST)).toBe(false);
    expect(collectionReadingMatchesRequest({ ...READING, checkedAt: 'yesterday' }, REQUEST)).toBe(false);
    expect(collectionReadingMatchesRequest(null, REQUEST)).toBe(false);
  });

  it('formats held amounts for reading', () => {
    expect(formatHeldAmount(2)).toBe('2');
    expect(formatHeldAmount(0.25)).toBe('0.25');
    expect(formatHeldAmount(214_600)).toBe('214,600');
    expect(formatHeldAmount(1_234_567.89)).toBe('1,234,568');
  });
});
