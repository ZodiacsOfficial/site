import { describe, expect, it } from 'vitest';
import { checkPairUniqueness, jaccardSimilarity } from './check-programmatic-uniqueness.mjs';

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
});
