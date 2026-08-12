import { describe, expect, it } from 'vitest';
import { ACCOUNT_V2_LOCAL_OWNER_KEY, type AccountV2Storage } from '../lib/account-v2/local-state';
import { ACCOUNT_BOUNDARY_PROFILE_KEYS } from '../lib/account-v2/profile-boundary';
import { accountBoundProfileAccess } from './AccountBoundProfileSurface';

const ACCOUNT_A = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_B = '22222222-2222-4222-8222-222222222222';

class MemoryStorage implements AccountV2Storage {
  readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('account-bound profile rendering', () => {
  it('keeps local charts usable without an account', () => {
    const storage = new MemoryStorage();
    storage.setItem(ACCOUNT_BOUNDARY_PROFILE_KEYS[0], JSON.stringify({ version: 1, charts: [{}] }));
    expect(accountBoundProfileAccess(storage, null)).toBe('visible');
  });

  it('shows a profile only to its matching signed-in owner', () => {
    const storage = new MemoryStorage();
    storage.setItem(ACCOUNT_BOUNDARY_PROFILE_KEYS[0], JSON.stringify({ version: 1, charts: [{}] }));
    storage.setItem(ACCOUNT_V2_LOCAL_OWNER_KEY, JSON.stringify({ version: 1, accountId: ACCOUNT_A }));
    expect(accountBoundProfileAccess(storage, ACCOUNT_A)).toBe('visible');
    expect(accountBoundProfileAccess(storage, ACCOUNT_B)).toBe('withheld');
  });

  it('fails closed on malformed owner state', () => {
    const storage = new MemoryStorage();
    storage.setItem(ACCOUNT_V2_LOCAL_OWNER_KEY, '{bad');
    expect(accountBoundProfileAccess(storage, ACCOUNT_A)).toBe('withheld');
  });
});
