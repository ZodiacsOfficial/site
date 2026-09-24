import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_ME,
  ME_KEY,
  cleanDisplayName,
  isAutomaticChartName,
  loadMe,
  parseMe,
  resolvedDisplayName,
  saveMe,
} from './me';

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
}

let storage: MemoryStorage;
let dispatched: Event[];

beforeEach(() => {
  storage = new MemoryStorage();
  dispatched = [];
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { dispatchEvent: (event: Event) => { dispatched.push(event); return true; } });
});

afterEach(() => vi.unstubAllGlobals());

describe('display names', () => {
  it('drops invisible and bidirectional control characters and collapses space', () => {
    expect(cleanDisplayName('  Maya‮​  Rose\n')).toBe('Maya Rose');
    expect(cleanDisplayName('⁦⁩')).toBeNull();
    expect(cleanDisplayName(42)).toBeNull();
  });

  it('caps names at 24 code points without splitting an emoji', () => {
    const long = '🌙'.repeat(30);
    const cleaned = cleanDisplayName(long)!;
    expect(Array.from(cleaned)).toHaveLength(24);
    expect(cleaned).toBe('🌙'.repeat(24));
  });

  it('never treats an automatic chart name, which carries the birth date, as a person', () => {
    expect(isAutomaticChartName('Leo Sun · 1990-08-14')).toBe(true);
    expect(isAutomaticChartName('Chart · 1990-08-14')).toBe(true);
    expect(isAutomaticChartName('Maya')).toBe(false);
    expect(resolvedDisplayName(DEFAULT_ME, 'Leo Sun · 1990-08-14')).toBeNull();
    expect(resolvedDisplayName(DEFAULT_ME, 'Maya · work')).toBe('Maya');
    expect(resolvedDisplayName({ ...DEFAULT_ME, displayName: 'M' }, 'Maya')).toBe('M');
  });
});

describe('stored settings', () => {
  it('rebuilds settings from known fields only and refuses hostile values', () => {
    expect(parseMe(null)).toEqual(DEFAULT_ME);
    expect(parseMe('{')).toEqual(DEFAULT_ME);
    expect(parseMe('{"version":2,"displayName":"x"}')).toEqual(DEFAULT_ME);
    const parsed = parseMe(JSON.stringify({
      version: 1,
      displayName: 'Maya‮',
      avatar: 'photo',
      photo: 'javascript:alert(1)',
      keepCloseDismissed: 'yes',
      extra: true,
    }));
    expect(parsed).toEqual({ ...DEFAULT_ME, displayName: 'Maya' });
  });

  it('keeps no picture: fields from an earlier preview are dropped on read', () => {
    const photo = 'data:image/webp;base64,UklGRhYAAABXRUJQVlA4IAoAAAAQAgCdASoBAAEAAQAcJaQAA3AA/v3AgAA=';
    const parsed = parseMe(JSON.stringify({ version: 1, displayName: 'Maya', avatar: 'photo', photo }));
    expect(parsed).toEqual({ ...DEFAULT_ME, displayName: 'Maya' });
    expect(JSON.stringify(parsed)).not.toContain('data:image');
  });

  it('writes, announces, and removes nothing it was not given', () => {
    expect(saveMe({ displayName: '  Maya ' })).toBe(true);
    expect(JSON.parse(storage.getItem(ME_KEY)!)).toEqual({ ...DEFAULT_ME, displayName: 'Maya' });
    expect(dispatched.map((event) => event.type)).toEqual(['zodiacs:me']);
    expect(saveMe({ keepCloseDismissed: true })).toBe(true);
    expect(loadMe()).toEqual({ ...DEFAULT_ME, displayName: 'Maya', keepCloseDismissed: true });
  });

  it('clears back to nothing stored when the name is removed', () => {
    expect(saveMe({ displayName: 'Maya' })).toBe(true);
    expect(saveMe({ displayName: '   ' })).toBe(true);
    expect(storage.getItem(ME_KEY)).toBeNull();
  });
});
