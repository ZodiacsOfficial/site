import { describe, expect, it } from 'vitest';
import { checkCollectionUniqueness, checkPairUniqueness, jaccardSimilarity } from './check-programmatic-uniqueness.mjs';

describe('programmatic-page uniqueness gate', () => {
  it('detects duplicate and distinct bodies', () => {
    const body = 'one two three four five six seven eight nine';
    expect(jaccardSimilarity(body, body)).toBe(1);
    expect(jaccardSimilarity(body, 'alpha beta gamma delta epsilon zeta eta theta')).toBe(0);
  });

  it('keeps all 78 compatibility pages below the CI threshold', async () => {
    const report = await checkPairUniqueness();
    expect(report.count).toBe(78);
    expect(report.collisions).toEqual([]);
  });

  it('keeps all 366 birthday essays below the CI threshold', async () => {
    // The largest programmatic family on the site is exactly the one with
    // classic doorway-page risk; regeneration or bulk edits must not drift
    // it toward near-duplicates. Measured headroom is enormous (max
    // similarity ~0.016 against a 0.42 gate).
    const report = await checkCollectionUniqueness('birthdays');
    expect(report.count).toBe(366);
    expect(report.collisions).toEqual([]);
  });
});
