import { describe, expect, it } from 'vitest';
import type { AccountV2Storage } from '../account-v2/storage-identity';
import {
  LIVING_CHART_GUEST_VAULT_KEY,
  livingChartOwnerKey,
  resolveLivingChartOwnerScope,
} from './owner';

const ACCOUNT_ID = '11000000-0000-4000-8000-000000000001';
const VAULT_ID = '12000000-0000-4000-8000-000000000001';

class MemoryStorage implements AccountV2Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('resolveLivingChartOwnerScope', () => {
  it('uses an explicit authenticated owner without creating guest state', () => {
    const storage = new MemoryStorage();
    expect(resolveLivingChartOwnerScope({ accountId: ACCOUNT_ID, storage })).toEqual({
      kind: 'account',
      accountId: ACCOUNT_ID,
    });
    expect(storage.getItem(LIVING_CHART_GUEST_VAULT_KEY)).toBeNull();
  });

  it('creates one stable guest vault and reuses it', () => {
    const storage = new MemoryStorage();
    const options = {
      accountId: null,
      storage,
      randomUUID: () => VAULT_ID,
      accessAllowed: () => true,
    } as const;
    expect(resolveLivingChartOwnerScope(options)).toEqual({ kind: 'guest', vaultId: VAULT_ID });
    expect(resolveLivingChartOwnerScope({
      ...options,
      randomUUID: () => '13000000-0000-4000-8000-000000000001',
    })).toEqual({ kind: 'guest', vaultId: VAULT_ID });
  });

  it('fails closed on denied access, malformed state, or invalid account identity', () => {
    const denied = new MemoryStorage();
    expect(resolveLivingChartOwnerScope({
      accountId: null,
      storage: denied,
      randomUUID: () => VAULT_ID,
      accessAllowed: () => false,
    })).toBeNull();
    expect(denied.getItem(LIVING_CHART_GUEST_VAULT_KEY)).toBeNull();

    const malformed = new MemoryStorage();
    malformed.setItem(LIVING_CHART_GUEST_VAULT_KEY, '{bad');
    expect(resolveLivingChartOwnerScope({ accountId: null, storage: malformed })).toBeNull();
    expect(resolveLivingChartOwnerScope({ accountId: 'not-an-account', storage: malformed })).toBeNull();
  });
});

describe('livingChartOwnerKey', () => {
  it('creates disjoint canonical namespaces', () => {
    expect(livingChartOwnerKey({ kind: 'account', accountId: ACCOUNT_ID })).toBe(`account:${ACCOUNT_ID}`);
    expect(livingChartOwnerKey({ kind: 'guest', vaultId: ACCOUNT_ID })).toBe(`guest:${ACCOUNT_ID}`);
  });
});
