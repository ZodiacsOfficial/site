import { describe, expect, it } from 'vitest';
import { LUNAR_HOUSE_COPY, LUNAR_RETURN_NOTE, lunarAspectReading } from './copy';
describe('lunar reflection copy', () => {
  it('covers every actual Moon house with a distinct reflection', () => {
    expect(Object.keys(LUNAR_HOUSE_COPY).map(Number)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(new Set(Object.values(LUNAR_HOUSE_COPY)).size).toBe(12);
    for (const text of Object.values(LUNAR_HOUSE_COPY)) expect(text).not.toMatch(/this year|birthday|will happen|guarantee/i);
    expect(LUNAR_RETURN_NOTE).toContain('reflection');
  });
  it('uses the non-Moon body on either side of the aspect', () => {
    expect(lunarAspectReading({ a: 'Moon', b: 'Saturn', type: 'square', orb: 1, applying: true }))
      .toBe(lunarAspectReading({ a: 'Saturn', b: 'Moon', type: 'square', orb: 1, applying: true }));
    expect(lunarAspectReading({ a: 'Moon', b: 'Saturn', type: 'square', orb: 1, applying: true })).toContain('responsibility');
  });
});
