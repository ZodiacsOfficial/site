import {
  AURA_SIGN_ORDER,
  type AuraChain,
  type AuraPersistedLookup,
  type AuraPersistenceMode,
  type AuraPersistenceOptions,
  type AuraPersistenceRecord,
  type AuraSign,
  type AuraStorageLike,
} from './types';

export const AURA_SESSION_STORAGE_KEY = 'zodiacs.aura.session.v1';
export const AURA_LOCAL_STORAGE_KEY = 'zodiacs.aura.local.v1';
export const AURA_SESSION_TTL_MS = 8 * 60 * 60 * 1_000;
export const AURA_LOCAL_TTL_MS = 24 * 60 * 60 * 1_000;

const SIGN_SET = new Set<string>(AURA_SIGN_ORDER);

function keyForMode(mode: AuraPersistenceMode): string {
  return mode === 'session' ? AURA_SESSION_STORAGE_KEY : AURA_LOCAL_STORAGE_KEY;
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

function normalizePersistedSigns(value: unknown): AuraSign[] | null {
  if (!Array.isArray(value)) return null;
  const signs = new Set<AuraSign>();
  for (const entry of value) {
    if (typeof entry !== 'string' || !SIGN_SET.has(entry)) return null;
    signs.add(entry as AuraSign);
  }
  return AURA_SIGN_ORDER.filter((sign) => signs.has(sign));
}

function parseRecord(value: string): AuraPersistenceRecord | null {
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const heldSigns = normalizePersistedSigns(record.heldSigns);
  if (
    record.version !== 1
    || typeof record.address !== 'string'
    || record.address.trim().length === 0
    || !validChain(record.chain)
    || heldSigns === null
    || !validDate(record.checkedAt)
    || !validDate(record.savedAt)
    || !validDate(record.expiresAt)
    || (record.chartId !== undefined && typeof record.chartId !== 'string')
  ) return null;
  return {
    version: 1,
    address: record.address,
    chain: record.chain,
    heldSigns,
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
  const heldSigns = normalizePersistedSigns(lookup.heldSigns);
  if (
    !Number.isFinite(now.getTime())
    || !Number.isFinite(ttlMs)
    || ttlMs <= 0
    || lookup.address.trim().length === 0
    || !validChain(lookup.chain)
    || heldSigns === null
    || !validDate(lookup.checkedAt)
  ) return null;

  const record: AuraPersistenceRecord = {
    version: 1,
    address: lookup.address,
    chain: lookup.chain,
    heldSigns,
    checkedAt: new Date(lookup.checkedAt).toISOString(),
    savedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    ...(lookup.chartId ? { chartId: lookup.chartId } : {}),
  };
  try {
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
  let serialized: string | null;
  try {
    serialized = storage.getItem(key);
  } catch {
    return null;
  }
  if (serialized === null) return null;

  const record = parseRecord(serialized);
  if (!record || !Number.isFinite(now.getTime()) || Date.parse(record.expiresAt) <= now.getTime()) {
    try {
      storage.removeItem(key);
    } catch {
      // Storage can be read-only; an invalid value still must not be returned.
    }
    return null;
  }
  return record;
}

export function clearAuraPersistence(
  storage: AuraStorageLike,
  mode: AuraPersistenceMode,
): void {
  try {
    storage.removeItem(keyForMode(mode));
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
