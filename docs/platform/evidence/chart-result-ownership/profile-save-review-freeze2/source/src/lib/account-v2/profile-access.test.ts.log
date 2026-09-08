import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AccountV2Storage } from './storage-identity';
import {
  ACCOUNT_V2_PROFILE_ACCESS_KEY,
  clearProfileAccessGrant,
  profileAccessAllowed,
  setProfileAccessGrant,
  setProfileAccessLeaseActive,
  setRetainedProfileAccessGrant,
} from './profile-access';

const ACCOUNT_A = '11111111-1111-4111-8111-111111111111';

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

describe('global private profile access guard', () => {
  it('preserves the existing account-free product when v2 is disabled', () => {
    expect(profileAccessAllowed(null, false)).toBe(true);
  });

  it('fails closed until this tab has a verified grant', () => {
    expect(profileAccessAllowed(null, true)).toBe(false);
  });

  it('delegates to the pre-hydration boundary reader and fails closed on errors', () => {
    expect(profileAccessAllowed({ canRead: () => true }, true)).toBe(true);
    expect(profileAccessAllowed({ canRead: () => false }, true)).toBe(false);
    expect(profileAccessAllowed({ canRead: () => { throw new Error('blocked'); } }, true)).toBe(false);
  });

  it('keeps involuntary signed-out access distinct from explicit retention', () => {
    const session = new MemoryStorage();
    expect(setProfileAccessGrant(session, null)).toBe(true);
    expect(session.getItem(ACCOUNT_V2_PROFILE_ACCESS_KEY)).toBe(
      JSON.stringify({ version: 1, mode: 'unowned' }),
    );

    expect(setRetainedProfileAccessGrant(session, ACCOUNT_A)).toBe(true);
    expect(session.getItem(ACCOUNT_V2_PROFILE_ACCESS_KEY)).toBe(
      JSON.stringify({ version: 1, mode: 'retained', accountId: ACCOUNT_A }),
    );

    expect(setProfileAccessGrant(session, ACCOUNT_A)).toBe(true);
    expect(session.getItem(ACCOUNT_V2_PROFILE_ACCESS_KEY)).toBe(
      JSON.stringify({ version: 1, mode: 'account', accountId: ACCOUNT_A }),
    );
    expect(setProfileAccessGrant(session, 'not-an-account')).toBe(false);
    expect(setRetainedProfileAccessGrant(session, 'not-an-account')).toBe(false);
    expect(session.getItem(ACCOUNT_V2_PROFILE_ACCESS_KEY)).toBe(
      JSON.stringify({ version: 1, mode: 'account', accountId: ACCOUNT_A }),
    );
  });

  it('activates and revokes only through the installed pre-hydration reader', () => {
    let active = false;
    vi.stubGlobal('window', {
      zodiacsProfileAccess: {
        canRead: () => active,
        activateLease: () => { active = true; },
        revokeLease: () => { active = false; },
      },
    });

    expect(setProfileAccessLeaseActive(true)).toBe(true);
    expect(active).toBe(true);
    expect(setProfileAccessLeaseActive(false)).toBe(true);
    expect(active).toBe(false);
  });

  it('fails closed when grant storage or lease methods are unavailable', () => {
    const unavailable: AccountV2Storage = {
      length: 0,
      getItem: () => null,
      key: () => null,
      removeItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };
    expect(setProfileAccessGrant(unavailable, null)).toBe(false);
    expect(setRetainedProfileAccessGrant(unavailable, ACCOUNT_A)).toBe(false);

    vi.stubGlobal('window', {
      zodiacsProfileAccess: {
        canRead: () => false,
        activateLease: () => { throw new Error('blocked'); },
      },
    });
    expect(setProfileAccessLeaseActive(true)).toBe(false);
    expect(setProfileAccessLeaseActive(false)).toBe(false);
  });

  it('clears access deterministically', () => {
    const session = new MemoryStorage();
    expect(setProfileAccessGrant(session, null)).toBe(true);
    clearProfileAccessGrant(session);
    expect(session.getItem(ACCOUNT_V2_PROFILE_ACCESS_KEY)).toBeNull();
  });
});
