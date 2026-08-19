import { profileAccessAllowed } from '../account-v2/profile-access-reader';
import {
  isAccountV2Id,
  readLocalAccountOwner,
  type AccountV2Storage,
} from '../account-v2/local-state';
import type { LivingChartOwnerScope } from './types';

export const LIVING_CHART_GUEST_VAULT_KEY = 'zodiacs.living-chart.guest-vault.v1';

interface GuestVaultRecordV1 {
  version: 1;
  vaultId: string;
}

export interface LivingChartOwnerResolverOptions {
  /** `undefined` checks the account-v2 local owner; `null` explicitly selects guest mode. */
  accountId?: string | null;
  storage?: AccountV2Storage | null;
  randomUUID?: () => string;
  accessAllowed?: () => boolean;
}

function browserStorage(): AccountV2Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function browserRandomUUID(): string {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : '';
}

function readGuestVault(storage: AccountV2Storage): string | null {
  let raw: string | null;
  try {
    raw = storage.getItem(LIVING_CHART_GUEST_VAULT_KEY);
  } catch {
    return null;
  }
  if (raw === null) return '';
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    return Object.keys(record).sort().join(',') === 'vaultId,version'
      && record.version === 1
      && isAccountV2Id(record.vaultId)
      ? record.vaultId.toLowerCase()
      : null;
  } catch {
    return null;
  }
}

/** Reads an existing guest vault without creating one or changing account ownership. */
export function readLivingChartGuestOwnerScope(
  storage: AccountV2Storage | null = browserStorage(),
): Extract<LivingChartOwnerScope, { kind: 'guest' }> | null {
  if (!storage) return null;
  const vaultId = readGuestVault(storage);
  return vaultId ? { kind: 'guest', vaultId } : null;
}

export function livingChartOwnerKey(owner: LivingChartOwnerScope): string | null {
  if (owner.kind === 'guest' && isAccountV2Id(owner.vaultId)) {
    return `guest:${owner.vaultId.toLowerCase()}`;
  }
  if (owner.kind === 'account' && isAccountV2Id(owner.accountId)) {
    return `account:${owner.accountId.toLowerCase()}`;
  }
  return null;
}

/**
 * Resolves the one local Living Chart vault that may be opened in this profile
 * access generation. It never falls back to a new guest vault when owner or
 * storage metadata is malformed.
 */
export function resolveLivingChartOwnerScope(
  options: LivingChartOwnerResolverOptions = {},
): LivingChartOwnerScope | null {
  const allowed = options.accessAllowed ?? profileAccessAllowed;
  if (!allowed()) return null;
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  if (!storage) return null;

  if (options.accountId !== undefined) {
    if (options.accountId !== null) {
      return isAccountV2Id(options.accountId)
        ? { kind: 'account', accountId: options.accountId.toLowerCase() }
        : null;
    }
  } else {
    const localOwner = readLocalAccountOwner(storage);
    if (localOwner.status === 'ready') {
      return { kind: 'account', accountId: localOwner.accountId.toLowerCase() };
    }
    if (localOwner.status === 'invalid' || localOwner.status === 'unavailable') return null;
  }

  const existing = readGuestVault(storage);
  if (existing === null) return null;
  if (existing) return { kind: 'guest', vaultId: existing };

  const vaultId = (options.randomUUID ?? browserRandomUUID)();
  if (!isAccountV2Id(vaultId) || !allowed()) return null;
  const record: GuestVaultRecordV1 = { version: 1, vaultId: vaultId.toLowerCase() };
  const serialized = JSON.stringify(record);
  try {
    storage.setItem(LIVING_CHART_GUEST_VAULT_KEY, serialized);
    if (!allowed() || storage.getItem(LIVING_CHART_GUEST_VAULT_KEY) !== serialized) return null;
  } catch {
    return null;
  }
  return { kind: 'guest', vaultId: record.vaultId };
}
