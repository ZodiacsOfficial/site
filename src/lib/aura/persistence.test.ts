import { describe, expect, it } from 'vitest';
import {
  AURA_LOCAL_STORAGE_KEY,
  AURA_LOCAL_TTL_MS,
  AURA_SESSION_STORAGE_KEY,
  AURA_SESSION_TTL_MS,
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
  heldSigns: ['leo', 'aries', 'leo'] as const,
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
    expect(sessionRecord?.heldSigns).toEqual(['aries', 'leo']);
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
    storage.values.set(AURA_LOCAL_STORAGE_KEY, JSON.stringify({ version: 1, address: 'x' }));

    expect(loadAuraPersistence(storage, 'local', NOW)).toBeNull();
    expect(storage.values.has(AURA_LOCAL_STORAGE_KEY)).toBe(false);
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
  });
});
