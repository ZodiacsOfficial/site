import { describe, expect, it } from 'vitest';
import { activeLearningStep, normalizeLearningProgress } from './LearningPath';

describe('learning path progress', () => {
  it('keeps known steps in curriculum order and removes duplicates', () => {
    expect(normalizeLearningProgress([
      'aspects',
      'big-three',
      'aspects',
      'not-a-step',
    ])).toEqual(['big-three', 'aspects']);
  });

  it('treats malformed stored values as no progress', () => {
    expect(normalizeLearningProgress(null)).toEqual([]);
    expect(normalizeLearningProgress({ completed: ['big-three'] })).toEqual([]);
  });

  it('moves the emphasized action through the path without locking later steps', () => {
    expect(activeLearningStep([])).toEqual({ id: 'big-three', cue: 'Start here' });
    expect(activeLearningStep(['big-three'])).toEqual({ id: 'planets-houses', cue: 'Up next' });
    expect(activeLearningStep(['aspects'])).toEqual({ id: 'big-three', cue: 'Up next' });
    expect(activeLearningStep([
      'big-three', 'planets-houses', 'aspects', 'whole-chart', 'follow-sky',
    ])).toBeNull();
  });
});
