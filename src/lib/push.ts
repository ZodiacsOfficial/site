export const PUSH_PREFERENCE_KEY = 'zodiacs.push.v1';

export type PushPreference = 'offered' | 'dismissed' | 'subscribed';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readPushPreference(storage: StorageLike): PushPreference | null {
  try {
    const value = storage.getItem(PUSH_PREFERENCE_KEY);
    return value === 'offered' || value === 'dismissed' || value === 'subscribed'
      ? value
      : null;
  } catch {
    return null;
  }
}

/** Claims the one-time affordance without requesting permission or registering a worker. */
export function claimPushPrompt(storage: StorageLike): boolean {
  try {
    if (storage.getItem(PUSH_PREFERENCE_KEY)) return false;
    storage.setItem(PUSH_PREFERENCE_KEY, 'offered');
    return true;
  } catch {
    return false;
  }
}

export function setPushPreference(storage: StorageLike, value: PushPreference): void {
  try {
    storage.setItem(PUSH_PREFERENCE_KEY, value);
  } catch {
    // A browser that blocks storage can still manage its native permission.
  }
}

export function isIosDevice(userAgent: string): boolean {
  return /\b(?:iPhone|iPad|iPod)\b/.test(userAgent)
    || (/\bMacintosh\b/.test(userAgent) && /\bMobile\//.test(userAgent));
}

export function isStandaloneDisplay(
  navigatorLike: { standalone?: boolean },
  matchMediaLike: (query: string) => { matches: boolean },
): boolean {
  return navigatorLike.standalone === true || matchMediaLike('(display-mode: standalone)').matches;
}

/** Convert the URL-safe VAPID public key to the bytes PushManager expects. */
export function vapidKeyBytes(value: string): ArrayBuffer {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
