import { describe, expect, it } from 'vitest';
import {
  AURA_LOCAL_STORAGE_KEY,
  AURA_LEGACY_LOCAL_STORAGE_KEY,
  AURA_LEGACY_SESSION_STORAGE_KEY,
  AURA_LOCAL_TTL_MS,
  AURA_SESSION_STORAGE_KEY,
  AURA_SESSION_TTL_MS,
  AURA_V2_LOCAL_STORAGE_KEY,
  AURA_V2_SESSION_STORAGE_KEY,
  clearAllAuraPersistence,
  clearAuraPersistence,
  loadAuraPersistence,
  saveAuraPersistence,
} from './persistence';
import type { AuraStorageLike } from './types';

class MemoryStorage implements AuraStorageLike {
  readonly values = new Map<string, string>();
  readonly removed: string[] = [];

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.removed.push(key);
    this.values.delete(key);
  }
}

const NOW = new Date('2026-07-16T12:00:00.000Z');
const LOOKUP = {
  address: 'wallet-public-address',
  chain: 'solana' as const,
  holdings: [
    { sign: 'leo', finish: 'silver' },
    { sign: 'aries', finish: 'gold', goldCount: '3' },
  ] as const,
  checkedAt: '2026-07-16T11:59:00.000Z',
  chartId: 'chart-1',
};

describe('Registry Aura persistence', () => {
  it('uses separate session and explicit remembered-local records with bounded TTLs', () => {
    const session = new MemoryStorage();
    const local = new MemoryStorage();

    const sessionRecord = saveAuraPersistence(session, 'session', LOOKUP, { now: NOW });
    const localRecord = saveAuraPersistence(local, 'local', LOOKUP, { now: NOW });

    expect(session.values.has(AURA_SESSION_STORAGE_KEY)).toBe(true);
    expect(session.values.has(AURA_LOCAL_STORAGE_KEY)).toBe(false);
    expect(local.values.has(AURA_LOCAL_STORAGE_KEY)).toBe(true);
    expect(sessionRecord?.holdings).toEqual([
      { sign: 'aries', finish: 'gold', goldCount: '3' },
      { sign: 'leo', finish: 'silver' },
    ]);
    expect(Date.parse(sessionRecord!.expiresAt) - NOW.getTime()).toBe(AURA_SESSION_TTL_MS);
    expect(Date.parse(localRecord!.expiresAt) - NOW.getTime()).toBe(AURA_LOCAL_TTL_MS);
  });

  it('loads an unexpired record and deletes it at the expiry boundary', () => {
    const storage = new MemoryStorage();
    const record = saveAuraPersistence(storage, 'session', LOOKUP, { now: NOW, ttlMs: 1_000 });
    expect(record).not.toBeNull();
    expect(loadAuraPersistence(storage, 'session', new Date(NOW.getTime() + 999))).toEqual(record);
    expect(loadAuraPersistence(storage, 'session', new Date(NOW.getTime() + 1_000))).toBeNull();
    expect(storage.removed).toContain(AURA_SESSION_STORAGE_KEY);
  });

  it('deletes malformed persisted data instead of returning it', () => {
    const storage = new MemoryStorage();
    storage.values.set(AURA_LOCAL_STORAGE_KEY, JSON.stringify({ version: 3, address: 'x' }));

    expect(loadAuraPersistence(storage, 'local', NOW)).toBeNull();
    expect(storage.values.has(AURA_LOCAL_STORAGE_KEY)).toBe(false);
  });

  it('invalidates version-one records instead of inventing material finishes', () => {
    const storage = new MemoryStorage();
    storage.values.set(AURA_LEGACY_SESSION_STORAGE_KEY, JSON.stringify({
      version: 1,
      address: LOOKUP.address,
      chain: LOOKUP.chain,
      heldSigns: ['aries'],
      checkedAt: LOOKUP.checkedAt,
    }));

    expect(loadAuraPersistence(storage, 'session', NOW)).toBeNull();
    expect(storage.values.has(AURA_LEGACY_SESSION_STORAGE_KEY)).toBe(false);
  });

  it('migrates a valid non-Gold version-two record to version three', () => {
    const storage = new MemoryStorage();
    storage.values.set(AURA_V2_SESSION_STORAGE_KEY, JSON.stringify({
      version: 2,
      address: LOOKUP.address,
      chain: LOOKUP.chain,
      holdings: [
        { sign: 'leo', finish: 'silver' },
        { sign: 'aries', finish: 'pastel' },
      ],
      checkedAt: LOOKUP.checkedAt,
      savedAt: NOW.toISOString(),
      expiresAt: new Date(NOW.getTime() + 1_000).toISOString(),
    }));

    const migrated = loadAuraPersistence(storage, 'session', NOW);
    expect(migrated).toMatchObject({
      version: 3,
      holdings: [
        { sign: 'aries', finish: 'pastel' },
        { sign: 'leo', finish: 'silver' },
      ],
    });
    expect(storage.values.has(AURA_V2_SESSION_STORAGE_KEY)).toBe(false);
    expect(JSON.parse(storage.values.get(AURA_SESSION_STORAGE_KEY)!)).toEqual(migrated);
  });

  it('migrates version-two Gold to the proven minimum multiplicity', () => {
    const storage = new MemoryStorage();
    storage.values.set(AURA_V2_LOCAL_STORAGE_KEY, JSON.stringify({
      version: 2,
      address: LOOKUP.address,
      chain: LOOKUP.chain,
      holdings: [{ sign: 'aries', finish: 'gold' }],
      checkedAt: LOOKUP.checkedAt,
      savedAt: NOW.toISOString(),
      expiresAt: new Date(NOW.getTime() + 1_000).toISOString(),
    }));

    expect(loadAuraPersistence(storage, 'local', NOW)).toMatchObject({
      version: 3,
      holdings: [{ sign: 'aries', finish: 'gold', goldCount: '1' }],
    });
    expect(storage.values.has(AURA_V2_LOCAL_STORAGE_KEY)).toBe(false);
  });

  it('rejects duplicate signs and unknown cabinet finishes', () => {
    const storage = new MemoryStorage();
    const base = {
      version: 3,
      address: LOOKUP.address,
      chain: LOOKUP.chain,
      checkedAt: LOOKUP.checkedAt,
      savedAt: NOW.toISOString(),
      expiresAt: new Date(NOW.getTime() + 1_000).toISOString(),
    };
    storage.values.set(AURA_LOCAL_STORAGE_KEY, JSON.stringify({
      ...base,
      holdings: [
        { sign: 'aries', finish: 'pastel' },
        { sign: 'aries', finish: 'gold' },
      ],
    }));
    expect(loadAuraPersistence(storage, 'local', NOW)).toBeNull();

    storage.values.set(AURA_LOCAL_STORAGE_KEY, JSON.stringify({
      ...base,
      holdings: [{ sign: 'aries', finish: 'platinum' }],
    }));
    expect(loadAuraPersistence(storage, 'local', NOW)).toBeNull();
  });

  it('requires a canonical positive Gold count and forbids it on other finishes', () => {
    const storage = new MemoryStorage();
    const base = {
      version: 3,
      address: LOOKUP.address,
      chain: LOOKUP.chain,
      checkedAt: LOOKUP.checkedAt,
      savedAt: NOW.toISOString(),
      expiresAt: new Date(NOW.getTime() + 1_000).toISOString(),
    };
    for (const holding of [
      { sign: 'aries', finish: 'gold' },
      { sign: 'aries', finish: 'gold', goldCount: '0' },
      { sign: 'aries', finish: 'gold', goldCount: '03' },
      { sign: 'aries', finish: 'silver', goldCount: '1' },
    ]) {
      storage.values.set(AURA_LOCAL_STORAGE_KEY, JSON.stringify({
        ...base,
        holdings: [holding],
      }));
      expect(loadAuraPersistence(storage, 'local', NOW)).toBeNull();
    }
  });

  it('clears one mode or both browser storage locations', () => {
    const session = new MemoryStorage();
    const local = new MemoryStorage();
    saveAuraPersistence(session, 'session', LOOKUP, { now: NOW });
    saveAuraPersistence(local, 'local', LOOKUP, { now: NOW });

    clearAuraPersistence(session, 'session');
    expect(session.values.size).toBe(0);
    expect(local.values.size).toBe(1);

    saveAuraPersistence(session, 'session', LOOKUP, { now: NOW });
    clearAllAuraPersistence(session, local);
    expect(session.values.size).toBe(0);
    expect(local.values.size).toBe(0);
    expect(session.removed).toContain(AURA_LEGACY_SESSION_STORAGE_KEY);
    expect(local.removed).toContain(AURA_LEGACY_LOCAL_STORAGE_KEY);
    expect(session.removed).toContain(AURA_V2_SESSION_STORAGE_KEY);
    expect(local.removed).toContain(AURA_V2_LOCAL_STORAGE_KEY);
  });
});
