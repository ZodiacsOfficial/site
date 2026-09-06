import { describe, expect, it } from 'vitest';
import { learningExercises, type ExerciseInput } from './learning-exercises';
const input: ExerciseInput = {
  placements: [{ body: 'Sun', lon: 15, house: 3 }, { body: 'Moon', lon: 61, house: 5 }],
  topAspects: [{ a: 'Sun', b: 'Moon', type: 'sextile', orb: 1, applying: true },
    { a: 'Venus', b: 'Mars', type: 'square', orb: 2, applying: false }],
  timeKnown: true, risingLon: 300, housesKnown: true,
  effectiveHouseSystem: 'whole', requestedHouseSystem: null, polarFallback: false,
};
describe('practice uses established reading facts only', () => {
  it('asks for actual placements and the supplied leading aspect', () => {
    const model = learningExercises(input);
    expect(model['big-three']?.answer).toBe('Aries');
    expect(model['planets-houses']?.answer).toBe('House 3');
    expect(model.aspects?.answer).toBe('sextile');
    expect(model['planets-houses']?.explanation).toContain('does not retain an earlier requested system');
  });
  it('known-time Moon does not depend on having houses or place', () => {
    const model = learningExercises({ ...input, housesKnown: false, risingLon: null, effectiveHouseSystem: null }, 'Moon');
    expect(model['big-three']?.answer).toBe('Gemini'); expect(model.aspects?.answer).toBe('sextile');
    expect(model['planets-houses']).toBeNull();
  });
  it('unknown singleton Moon supports sign only and spotlights the sign, not an exact degree', () => {
    const model = learningExercises({ ...input, timeKnown: false, moonSignCandidates: ['cancer'] }, 'Moon');
    expect(model['big-three']?.answer).toBe('Cancer');
    expect(model['big-three']?.entity).toEqual({ kind: 'sign', sign: 'cancer' });
    expect(model['big-three']?.explanation).toContain('not an exact birth degree');
    expect(model.aspects?.answer).toBe('square'); expect(model['planets-houses']).toBeNull();
  });
  it.each([undefined, [], ['gemini', 'cancer'], ['bad'], ['cancer', 'cancer']])('withholds unresolved Moon candidate %#', (moonSignCandidates) => {
    expect(learningExercises({ ...input, timeKnown: false, moonSignCandidates }, 'Moon')['big-three']).toBeNull();
  });
  it('withholds rising and houses for unknown time even if accidental cached values exist', () => {
    const model = learningExercises({ ...input, timeKnown: false }, 'Rising');
    expect(model['big-three']).toBeNull(); expect(model['planets-houses']).toBeNull();
  });
  it('does not invent an aspect when the only supplied one involves an unknown-time Moon', () => {
    expect(learningExercises({ ...input, timeKnown: false, topAspects: input.topAspects.slice(0, 1) }).aspects).toBeNull();
    const reversed = { ...input.topAspects[0], a: 'Moon' as const, b: 'Sun' as const };
    expect(learningExercises({ ...input, timeKnown: false, topAspects: [reversed] }).aspects).toBeNull();
  });
  it('names the actual effective house system and recorded polar fallback', () => {
    expect(learningExercises({ ...input, polarFallback: true })['planets-houses']?.explanation).toContain('whole-sign result. A polar fallback');
    expect(learningExercises({ ...input, effectiveHouseSystem: null })['planets-houses']).toBeNull();
  });
});
