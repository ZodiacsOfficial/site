import { describe, expect, it } from 'vitest';
import { auraHeldCountBucket } from './analytics';

describe('Registry Aura analytics buckets', () => {
  it.each([
    [0, '0'],
    [1, '1'],
    [2, '2-5'],
    [5, '2-5'],
    [6, '6-12'],
    [11, '6-12'],
    [12, '6-12'],
  ] as const)('maps %i holdings to %s', (count, bucket) => {
    expect(auraHeldCountBucket(count)).toBe(bucket);
  });

  it('never creates a distinct twelve-sign cohort', () => {
    expect(auraHeldCountBucket(12)).toBe(auraHeldCountBucket(6));
    expect(auraHeldCountBucket(12)).not.toBe('12');
  });

  it.each([-1, 1.5, 13, Number.NaN])('rejects an impossible count (%s)', (count) => {
    expect(() => auraHeldCountBucket(count)).toThrow(/integer from 0 through 12/i);
  });
});
