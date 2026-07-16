export type AuraHeldCountBucket = '0' | '1' | '2-5' | '6-12';

/**
 * Coarsens the public-record count before analytics sees it. The upper bucket
 * intentionally includes twelve so a complete set is never a distinct cohort.
 */
export function auraHeldCountBucket(count: number): AuraHeldCountBucket {
  if (!Number.isInteger(count) || count < 0 || count > 12) {
    throw new RangeError('Aura held count must be an integer from 0 through 12.');
  }
  if (count === 0) return '0';
  if (count === 1) return '1';
  if (count <= 5) return '2-5';
  return '6-12';
}
