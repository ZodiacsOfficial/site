import { describe, expect, it } from 'vitest';
import { gamesQuestionForWeek, isGamesAnswer } from './questions';

describe('weekly Games questions', () => {
  it('is deterministic, bounded, and uses three plain fixed answers', () => {
    const first = gamesQuestionForWeek(2026, 34);
    expect(gamesQuestionForWeek(2026, 34)).toEqual(first);
    expect(first.id).toMatch(/^[a-z]+-2026-w34$/);
    expect(first.choices).toHaveLength(3);
    expect(new Set(first.choices.map((choice) => choice.key)).size).toBe(3);
    expect(first.choices.every((choice) => choice.label.length > 0)).toBe(true);
  });

  it('accepts only a choice from the current question', () => {
    const question = gamesQuestionForWeek(2026, 34);
    expect(isGamesAnswer(question, question.choices[0]!.key)).toBe(true);
    expect(isGamesAnswer(question, 'write-in answer')).toBe(false);
    expect(isGamesAnswer(question, undefined)).toBe(false);
  });

  it('does not repeat a prompt inside the 12-week rotation', () => {
    const prompts = Array.from({ length: 12 }, (_, index) => (
      gamesQuestionForWeek(2026, index + 1).prompt
    ));
    expect(new Set(prompts).size).toBe(12);
  });

  it('rejects malformed week coordinates', () => {
    expect(() => gamesQuestionForWeek(2026, 0)).toThrow(RangeError);
    expect(() => gamesQuestionForWeek(2026, 54)).toThrow(RangeError);
  });
});
