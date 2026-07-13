import { describe, expect, it, vi } from 'vitest';
import {
  PUSH_PREFERENCE_KEY,
  claimPushPrompt,
  isIosDevice,
  isStandaloneDisplay,
  readPushPreference,
  setPushPreference,
  vapidKeyBytes,
} from './push';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  };
}

describe('push prompt preference', () => {
  it('claims the contextual affordance once without invoking browser permission', () => {
    const storage = memoryStorage();
    const requestPermission = vi.fn();
    expect(claimPushPrompt(storage)).toBe(true);
    expect(claimPushPrompt(storage)).toBe(false);
    expect(storage.values.get(PUSH_PREFERENCE_KEY)).toBe('offered');
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('persists dismissal and subscription states', () => {
    const storage = memoryStorage();
    setPushPreference(storage, 'dismissed');
    expect(readPushPreference(storage)).toBe('dismissed');
    setPushPreference(storage, 'subscribed');
    expect(readPushPreference(storage)).toBe('subscribed');
  });

  it('recognizes iOS install requirements and standalone mode', () => {
    expect(isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_5) AppleWebKit Mobile/15E148')).toBe(true);
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit Mobile/15E148')).toBe(true);
    expect(isIosDevice('Mozilla/5.0 (Linux; Android 15) Chrome/136')).toBe(false);
    expect(isStandaloneDisplay({ standalone: true }, () => ({ matches: false }))).toBe(true);
    expect(isStandaloneDisplay({}, () => ({ matches: true }))).toBe(true);
  });

  it('decodes a URL-safe VAPID public key', () => {
    vi.stubGlobal('atob', (value: string) => Buffer.from(value, 'base64').toString('binary'));
    expect([...new Uint8Array(vapidKeyBytes('AQID-_8'))]).toEqual([1, 2, 3, 251, 255]);
    vi.unstubAllGlobals();
  });
});
