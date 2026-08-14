export interface AccountV2ProfileAccessReader {
  canRead(): boolean;
  activateLease?(): void;
  revokeLease?(): void;
}

/** Read the pre-hydration boundary without importing account mutation helpers. */
export function browserProfileAccessReader(): AccountV2ProfileAccessReader | null {
  if (typeof window === 'undefined') return null;
  try {
    const reader: unknown = Reflect.get(window, 'zodiacsProfileAccess');
    if (!reader || typeof reader !== 'object') return null;
    return typeof Reflect.get(reader, 'canRead') === 'function'
      ? reader as AccountV2ProfileAccessReader
      : null;
  } catch {
    return null;
  }
}

function accountProfileAccessEnabled(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    return document.documentElement.hasAttribute('data-account-sync-v2');
  } catch {
    // In a browser, an unreadable feature boundary must never be interpreted
    // as the account-free mode.
    return true;
  }
}

/** Synchronous, fail-closed read guard for hot profile-derived surfaces. */
export function profileAccessAllowed(
  reader: AccountV2ProfileAccessReader | null = browserProfileAccessReader(),
  enabled = accountProfileAccessEnabled(),
): boolean {
  if (!enabled) return true;
  try {
    return reader?.canRead() === true;
  } catch {
    return false;
  }
}
