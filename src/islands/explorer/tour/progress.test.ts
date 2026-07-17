import { describe, expect, it } from 'vitest';
import {
  EMPTY_FIRST_READING,
  FIRST_READING_STORAGE_KEY,
  readFirstReadingProgress,
  writeFirstReadingProgress,
} from './progress';

function memoryStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial) values.set(FIRST_READING_STORAGE_KEY, initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  };
}

describe('first-reading progress', () => {
  it('uses the unopened state when storage is empty or malformed', () => {
    expect(readFirstReadingProgress(memoryStorage())).toBe(EMPTY_FIRST_READING);
    expect(readFirstReadingProgress(memoryStorage('{bad json'))).toBe(EMPTY_FIRST_READING);
    expect(readFirstReadingProgress(memoryStorage(JSON.stringify({ version: 2 })))).toBe(EMPTY_FIRST_READING);
  });

  it('persists status and clamps the resumable step to the four-stop path', () => {
    const storage = memoryStorage();
    const saved = writeFirstReadingProgress(
      storage,
      { status: 'in_progress', step: 9 },
      new Date('2026-07-17T00:00:00.000Z'),
    );
    expect(saved).toEqual({
      version: 1,
      status: 'in_progress',
      step: 3,
      updatedAt: '2026-07-17T00:00:00.000Z',
    });
    expect(readFirstReadingProgress(storage)).toEqual(saved);
  });

  it('keeps working in memory when storage writes are blocked', () => {
    const blocked = {
      getItem: () => null,
      setItem: () => { throw new Error('blocked'); },
    };
    expect(writeFirstReadingProgress(blocked, { status: 'dismissed', step: 0 }).status)
      .toBe('dismissed');
  });

  it('keeps an in-progress reading tied to the chart it started from', () => {
    const storage = memoryStorage();
    const saved = writeFirstReadingProgress(storage, {
      status: 'in_progress',
      step: 2,
      chartKey: '1990-06-15T16:30:00.000Z|1|40.7128|-74.0060',
    });

    expect(readFirstReadingProgress(storage).chartKey).toBe(saved.chartKey);
  });
});
