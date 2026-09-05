import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { render } from 'preact-render-to-string';
import LearningPath, {
  activeLearningStep,
  normalizeLearningProgress,
  normalizeLearningState,
  updateLearningProgress,
} from './LearningPath';

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

  it('renders all five linked steps before hydration without a permanent loading state', () => {
    const markup = render(h(LearningPath, {}));
    expect(markup.match(/data-learning-step=/g)).toHaveLength(5);
    for (const href of ['/birth-chart/', '/learn/houses/', '/learn/aspects/', '/today/', '/horoscopes/']) {
      expect(markup).toContain(`href="${href}"`);
    }
    expect(markup).toContain('5 steps to explore');
    expect(markup).toContain('Check off each step yourself after reading and reflecting.');
    expect(markup).not.toContain('Opening your saved path');
    expect(markup).not.toContain('Loading');
    expect(markup).not.toContain('Mark Meet the three sides of you complete');
  });

  it('migrates former link-open completions to started steps', () => {
    expect(normalizeLearningState(['aspects', 'big-three', 'aspects', 'missing'])).toEqual({
      started: ['big-three', 'aspects'], completed: [],
    });
  });

  it('opening or reopening a lesson never records completion', () => {
    const initial = normalizeLearningState(null);
    const started = updateLearningProgress(initial, 'start', 'big-three');
    const openedAgain = updateLearningProgress(started, 'start', 'big-three');
    expect(openedAgain).toEqual({ started: ['big-three'], completed: [] });
    expect(activeLearningStep(openedAgain.completed)?.id).toBe('big-three');
  });

  it('requires a started step and an explicit reflection confirmation to complete it', () => {
    const initial = normalizeLearningState(null);
    expect(updateLearningProgress(initial, 'complete', 'big-three')).toEqual(initial);
    const started = updateLearningProgress(initial, 'start', 'big-three');
    const reflected = updateLearningProgress(started, 'complete', 'big-three');
    expect(reflected).toEqual({ started: ['big-three'], completed: ['big-three'] });
    expect(activeLearningStep(reflected.completed)?.id).toBe('planets-houses');
    expect(updateLearningProgress(reflected, 'start', 'big-three')).toEqual(reflected);
    expect(updateLearningProgress(reflected, 'complete', 'big-three')).toEqual(reflected);
  });

  it('restores versioned progress while discarding malformed or unstarted completions', () => {
    expect(normalizeLearningState({ version: 2, started: ['aspects', 'big-three'], completed: ['aspects', 'whole-chart'] })).toEqual({
      started: ['big-three', 'aspects'], completed: ['aspects'],
    });
    for (const value of [null, false, {}, { version: 1, completed: ['big-three'] }, { version: 2, started: 'big-three' }]) {
      expect(normalizeLearningState(value)).toEqual({ started: [], completed: [] });
    }
  });
});
