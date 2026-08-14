import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAccountV2BrowserStorage } from './browser-storage';
import type { AccountV2Storage } from './storage-identity';

class MemoryStorage implements AccountV2Storage {
  readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('account v2 browser storage', () => {
  it('returns both browser stores only after both getters succeed', () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    vi.stubGlobal('window', { localStorage: local, sessionStorage: session });

    expect(getAccountV2BrowserStorage()).toEqual({ local, session });
  });

  it('returns null when either storage getter is blocked', () => {
    for (const blocked of ['localStorage', 'sessionStorage'] as const) {
      const browserWindow = {
        localStorage: new MemoryStorage(),
        sessionStorage: new MemoryStorage(),
      };
      Object.defineProperty(browserWindow, blocked, {
        configurable: true,
        get() { throw new Error('storage blocked'); },
      });
      vi.stubGlobal('window', browserWindow);
      expect(getAccountV2BrowserStorage()).toBeNull();
      vi.unstubAllGlobals();
    }
  });

  it('returns null outside the browser', () => {
    expect(getAccountV2BrowserStorage()).toBeNull();
  });
});
