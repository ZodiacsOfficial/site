import { describe, expect, it } from 'vitest';
import { isExpectedLunarError, lunarTextGeometryFits } from './lunar-return-drive.mjs';
describe('lunar browser observation boundaries', () => {
  it('allows only the exact deliberately failed URL and zero-argument network error', () => {
    const url = 'http://127.0.0.1:4399/_astro/lunar-return-card.test.js';
    const row = { url, argumentCount: 0, text: 'Failed to load resource: net::ERR_FAILED' };
    expect(isExpectedLunarError(row, new Set([url]))).toBe(true);
    for (const changed of [{ ...row, url: url + '?other' }, { ...row, argumentCount: 1 }, { ...row, text: 'Unexpected failure' }]) expect(isExpectedLunarError(changed, new Set([url]))).toBe(false);
    expect(isExpectedLunarError(row, new Set())).toBe(false);
  });
  it('rejects clipped, nonfinite and overlapping PNG ink while allowing adjacent lines', () => {
    const box = { left: 64, right: 500, top: 70, bottom: 90 };
    expect(lunarTextGeometryFits([box, { ...box, top: 100, bottom: 120 }])).toBe(true);
    expect(lunarTextGeometryFits([box, { ...box, top: 80, bottom: 100 }])).toBe(false);
    for (const changed of [{ ...box, left: -1 }, { ...box, right: 1081 }, { ...box, bottom: 1351 }, { ...box, right: NaN }]) expect(lunarTextGeometryFits([changed])).toBe(false);
    expect(lunarTextGeometryFits([])).toBe(false);
  });
});
