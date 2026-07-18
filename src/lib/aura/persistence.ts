import {
  AURA_SIGN_ORDER,
  type AuraCabinetFinish,
  type AuraCabinetHolding,
  type AuraChain,
  type AuraPersistedLookup,
  type AuraPersistenceMode,
  type AuraPersistenceOptions,
  type AuraPersistenceRecord,
  type AuraSign,
  type AuraStorageLike,
} from './types';
import { isCanonicalGoldCount } from './cabinet-finish';

export const AURA_SESSION_STORAGE_KEY = 'zodiacs.aura.session.v3';
export const AURA_LOCAL_STORAGE_KEY = 'zodiacs.aura.local.v3';
export const AURA_V2_SESSION_STORAGE_KEY = 'zodiacs.aura.session.v2';
export const AURA_V2_LOCAL_STORAGE_KEY = 'zodiacs.aura.local.v2';
export const AURA_LEGACY_SESSION_STORAGE_KEY = 'zodiacs.aura.session.v1';
export const AURA_LEGACY_LOCAL_STORAGE_KEY = 'zodiacs.aura.local.v1';
export const AURA_SESSION_TTL_MS = 8 * 60 * 60 * 1_000;
export const AURA_LOCAL_TTL_MS = 24 * 60 * 60 * 1_000;

const SIGN_SET = new Set<string>(AURA_SIGN_ORDER);
const FINISH_SET = new Set<AuraCabinetFinish>([
  'pastel',
  'bronze',
  'silver',
  'gold',
]);

function keyForMode(mode: AuraPersistenceMode): string {
  return mode === 'session' ? AURA_SESSION_STORAGE_KEY : AURA_LOCAL_STORAGE_KEY;
}

function v2KeyForMode(mode: AuraPersistenceMode): string {
  return mode === 'session' ? AURA_V2_SESSION_STORAGE_KEY : AURA_V2_LOCAL_STORAGE_KEY;
}

function legacyKeyForMode(mode: AuraPersistenceMode): string {
  return mode === 'session' ? AURA_LEGACY_SESSION_STORAGE_KEY : AURA_LEGACY_LOCAL_STORAGE_KEY;
}

function ttlForMode(mode: AuraPersistenceMode): number {
  return mode === 'session' ? AURA_SESSION_TTL_MS : AURA_LOCAL_TTL_MS;
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function validChain(value: unknown): value is AuraChain {
  return value === 'solana' || value === 'base';
}

function normalizePersistedHoldings(
  value: unknown,
  legacyV2 = false,
): AuraCabinetHolding[] | null {
  if (!Array.isArray(value)) return null;
  const holdings = new Map<AuraSign, AuraCabinetHolding>();
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null;
    const holding = entry as Record<string, unknown>;
    if (
      typeof holding.sign !== 'string'
      || !SIGN_SET.has(holding.sign)
      || typeof holding.finish !== 'string'
      || !FINISH_SET.has(holding.finish as AuraCabinetFinish)
      || holdings.has(holding.sign as AuraSign)
    ) return null;
    const sign = holding.sign as AuraSign;
    const finish = holding.finish as AuraCabinetFinish;
    if (finish === 'gold') {
      if (legacyV2) {
        // A v2 Gold finish proves at least one complete million-token edition.
        if (holding.goldCount !== undefined) return null;
        holdings.set(sign, { sign, finish, goldCount: '1' });
      } else {
        if (!isCanonicalGoldCount(holding.goldCount)) return null;
        holdings.set(sign, { sign, finish, goldCount: holding.goldCount });
      }
    } else {
      if (holding.goldCount !== undefined) return null;
      holdings.set(sign, { sign, finish });
    }
  }
  return AURA_SIGN_ORDER
    .filter((sign) => holdings.has(sign))
    .map((sign) => holdings.get(sign)!);
}

function parseRecord(value: string, expectedVersion: 2 | 3): AuraPersistenceRecord | null {
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const holdings = normalizePersistedHoldings(record.holdings, expectedVersion === 2);
  if (
    record.version !== expectedVersion
    || typeof record.address !== 'string'
    || record.address.trim().length === 0
    || !validChain(record.chain)
    || holdings === null
    || !validDate(record.checkedAt)
    || !validDate(record.savedAt)
    || !validDate(record.expiresAt)
    || (record.chartId !== undefined && typeof record.chartId !== 'string')
  ) return null;
  return {
    version: 3,
    address: record.address,
    chain: record.chain,
    holdings,
    checkedAt: record.checkedAt,
    savedAt: record.savedAt,
    expiresAt: record.expiresAt,
    ...(typeof record.chartId === 'string' ? { chartId: record.chartId } : {}),
  };
}

/** Saves only when the caller explicitly chooses a session or remembered-local mode. */
export function saveAuraPersistence(
  storage: AuraStorageLike,
  mode: AuraPersistenceMode,
  lookup: AuraPersistedLookup,
  options: AuraPersistenceOptions = {},
): AuraPersistenceRecord | null {
  const now = options.now ?? new Date();
  const ttlMs = options.ttlMs ?? ttlForMode(mode);
  const holdings = normalizePersistedHoldings(lookup.holdings);
  if (
    !Number.isFinite(now.getTime())
    || !Number.isFinite(ttlMs)
    || ttlMs <= 0
    || lookup.address.trim().length === 0
    || !validChain(lookup.chain)
    || holdings === null
    || !validDate(lookup.checkedAt)
  ) return null;

  const record: AuraPersistenceRecord = {
    version: 3,
    address: lookup.address,
    chain: lookup.chain,
    holdings,
    checkedAt: new Date(lookup.checkedAt).toISOString(),
    savedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    ...(lookup.chartId ? { chartId: lookup.chartId } : {}),
  };
  try {
    storage.removeItem(legacyKeyForMode(mode));
    storage.removeItem(v2KeyForMode(mode));
    storage.setItem(keyForMode(mode), JSON.stringify(record));
    return record;
  } catch {
    return null;
  }
}

/** Loads a valid unexpired record; malformed and expired values are deleted. */
export function loadAuraPersistence(
  storage: AuraStorageLike,
  mode: AuraPersistenceMode,
  now = new Date(),
): AuraPersistenceRecord | null {
  const key = keyForMode(mode);
  try {
    storage.removeItem(legacyKeyForMode(mode));
  } catch {
    // Legacy cleanup is best-effort; it must not block a current record.
  }
  let serialized: string | null;
  try {
    serialized = storage.getItem(key);
  } catch {
    return null;
  }
  const sourceKey = serialized === null ? v2KeyForMode(mode) : key;
  const sourceVersion = serialized === null ? 2 : 3;
  if (serialized === null) {
    try {
      serialized = storage.getItem(sourceKey);
    } catch {
      return null;
    }
  }
  if (serialized === null) return null;

  const record = parseRecord(serialized, sourceVersion);
  if (!record || !Number.isFinite(now.getTime()) || Date.parse(record.expiresAt) <= now.getTime()) {
    try {
      storage.removeItem(sourceKey);
    } catch {
      // Storage can be read-only; an invalid value still must not be returned.
    }
    return null;
  }
  if (sourceVersion === 2) {
    try {
      storage.setItem(key, JSON.stringify(record));
      storage.removeItem(sourceKey);
    } catch {
      // A valid in-memory migration can still be used when storage is read-only.
    }
  }
  return record;
}

export function clearAuraPersistence(
  storage: AuraStorageLike,
  mode: AuraPersistenceMode,
): void {
  try {
    storage.removeItem(keyForMode(mode));
    storage.removeItem(v2KeyForMode(mode));
    storage.removeItem(legacyKeyForMode(mode));
  } catch {
    // Clearing is best-effort when browser storage is unavailable.
  }
}

export function clearAllAuraPersistence(
  sessionStorage: AuraStorageLike,
  localStorage: AuraStorageLike,
): void {
  clearAuraPersistence(sessionStorage, 'session');
  clearAuraPersistence(localStorage, 'local');
}
