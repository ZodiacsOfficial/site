import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_ME,
  ME_KEY,
  cleanDisplayName,
  isAutomaticChartName,
  loadMe,
  parseMe,
  removePhoto,
  resolvedDisplayName,
  saveMe,
} from './me';
import { centreSquare, isStorablePhoto } from './avatar';

const PHOTO = 'data:image/webp;base64,UklGRhYAAABXRUJQVlA4IAoAAAAQAgCdASoBAAEAAQAcJaQAA3AA/v3AgAA=';

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

  it('keeps a valid photo and falls back to the mark when the photo is missing', () => {
    expect(parseMe(JSON.stringify({ version: 1, avatar: 'photo', photo: PHOTO })).avatar).toBe('photo');
    expect(parseMe(JSON.stringify({ version: 1, avatar: 'sign' })).avatar).toBe('sign');
    expect(parseMe(JSON.stringify({ version: 1, avatar: 'selfie' })).avatar).toBe('mark');
  });

  it('writes, announces, and removes nothing it was not given', () => {
    expect(saveMe({ displayName: '  Maya ' })).toBe(true);
    expect(JSON.parse(storage.getItem(ME_KEY)!)).toEqual({ ...DEFAULT_ME, displayName: 'Maya' });
    expect(dispatched.map((event) => event.type)).toEqual(['zodiacs:me']);
    expect(saveMe({ keepCloseDismissed: true })).toBe(true);
    expect(loadMe()).toEqual({ ...DEFAULT_ME, displayName: 'Maya', keepCloseDismissed: true });
  });

  it('refuses to select a photo it does not hold', () => {
    expect(saveMe({ avatar: 'photo' })).toBe(false);
    expect(storage.getItem(ME_KEY)).toBeNull();
  });

  it('forgets a photo entirely and returns to the chart mark', () => {
    expect(saveMe({ avatar: 'photo', photo: PHOTO })).toBe(true);
    expect(removePhoto()).toBe(true);
    expect(storage.getItem(ME_KEY)).toBeNull();
  });
});

describe('photos', () => {
  it('stores only small base64 image data URLs', () => {
    expect(isStorablePhoto(PHOTO)).toBe(true);
    expect(isStorablePhoto('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isStorablePhoto('https://example.com/me.jpg')).toBe(false);
    expect(isStorablePhoto(`data:image/jpeg;base64,${'A'.repeat(200_000)}`)).toBe(false);
  });

  it('crops the centred square of any shape', () => {
    expect(centreSquare(400, 300)).toEqual({ sx: 50, sy: 0, side: 300 });
    expect(centreSquare(300, 401)).toEqual({ sx: 0, sy: 51, side: 300 });
  });
});
