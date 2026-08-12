import type { AccountV2Storage } from './storage-identity';

export interface AccountV2BrowserStorage {
  local: AccountV2Storage;
  session: AccountV2Storage;
}

/** Browser storage getters can themselves throw under restrictive policies. */
export function getAccountV2BrowserStorage(): AccountV2BrowserStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return {
      local: window.localStorage as AccountV2Storage,
      session: window.sessionStorage as AccountV2Storage,
    };
  } catch {
    return null;
  }
}
