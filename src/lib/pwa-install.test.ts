import { describe, expect, it } from 'vitest';
import {
  PWA_COMPUTE_COUNT_KEY,
  PWA_INSTALL_DISMISSED_KEY,
  dismissPwaInstall,
  recordChartComputation,
} from './pwa-install';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  };
}

describe('PWA retention prompt', () => {
  it('becomes eligible only after the second computed chart', () => {
    const storage = memoryStorage();
    expect(recordChartComputation(storage)).toBe(false);
    expect(recordChartComputation(storage)).toBe(true);
    expect(recordChartComputation(storage)).toBe(true);
    expect(storage.values.get(PWA_COMPUTE_COUNT_KEY)).toBe('2');
  });

  it('never becomes eligible again after dismissal', () => {
    const storage = memoryStorage();
    recordChartComputation(storage);
    dismissPwaInstall(storage);
    expect(storage.values.get(PWA_INSTALL_DISMISSED_KEY)).toBe('1');
    expect(recordChartComputation(storage)).toBe(false);
  });
});
