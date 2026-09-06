import { describe, expect, it } from 'vitest';
import { inspectPatternInk, isExpectedPatternModuleError } from './aspect-pattern-browser-checks.mjs';

describe('pattern browser observations', () => {
  it('rejects non-finite and clipped native ink, including translated diagram coordinates', () => {
    const good = { text: 'Mercury', left: 350, right: 410, top: 280, bottom: 300 };
    expect(inspectPatternInk([good])).toEqual({ clipped: [], overlaps: [] });
    for (const bad of [{ ...good, left: 31 }, { ...good, right: 1049 }, { ...good, top: NaN }, { ...good, bottom: 1326 }]) {
      expect(inspectPatternInk([bad]).clipped).toEqual([bad]);
    }
  });
  it('detects actual two-dimensional overlapping labels, without confusing aligned rows', () => {
    const a = { text: 'Moon', left: 64, right: 130, top: 100, bottom: 120 };
    const b = { text: 'Mars', left: 100, right: 170, top: 115, bottom: 135 };
    expect(inspectPatternInk([a, b]).overlaps).toEqual([['Moon', 'Mars']]);
    expect(inspectPatternInk([a, { ...b, top: 121 }]).overlaps).toEqual([]);
  });
  it('allows only the exact recorded failed module resource diagnostic', () => {
    const url = 'http://127.0.0.1:4399/_astro/AspectPatternPanel.test.js';
    const entry = { argumentCount: 0, url, text: 'Failed to load resource: net::ERR_FAILED' };
    const expected = new Set([url]);
    expect(isExpectedPatternModuleError(entry, expected)).toBe(true);
    for (const changed of [{ ...entry, url: `${url}?other` }, { ...entry, argumentCount: 1 }, { ...entry, text: `${entry.text} unrelated` }]) {
      expect(isExpectedPatternModuleError(changed, expected)).toBe(false);
    }
  });
});
