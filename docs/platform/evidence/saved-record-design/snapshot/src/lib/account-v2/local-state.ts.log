import {
  ACCOUNT_SYNC_METADATA_VERSION,
  type AccountBoundaryDecision,
  type AccountBoundaryState,
  type AccountDeletionRequestListResult,
  type AccountDeletionRequestReadResult,
  type AccountDeletionRequestV1,
  type AccountMetadataReadResult,
  type AccountPrivacyWithdrawalReadResult,
  type AccountPrivacyWithdrawalV1,
  type AccountSyncChartMetadataV1,
  type AccountSyncMetadataV1,
  type AccountV2ClearResult,
  type PendingChartOperationV1,
  type PendingConsentOperationV1,
} from './types';
import { isSha256Hex } from './mutation-fingerprint';
import {
  ACCOUNT_V2_LOCAL_OWNER_KEY,
  ACCOUNT_V2_RETAINED_OWNER_KEY,
  ACCOUNT_V2_STORAGE_PREFIX,
  isAccountV2Id,
  type AccountV2Storage,
} from './storage-identity';

export {
  ACCOUNT_V2_LOCAL_OWNER_KEY,
  ACCOUNT_V2_RETAINED_OWNER_KEY,
  ACCOUNT_V2_STORAGE_PREFIX,
  isAccountV2Id,
} from './storage-identity';
export type { AccountV2Storage } from './storage-identity';

export const MAX_ACCOUNT_SYNC_METADATA_BYTES = 32 * 1024;
export const MAX_ACCOUNT_SYNC_CHARTS = 64;
export const MAX_ACCOUNT_SYNC_CURSOR_LENGTH = 1_024;

const MAX_SMALL_RECORD_BYTES = 512;
const MAX_SERVER_REVISION = Number.MAX_SAFE_INTEGER;
const CURSOR = /^[^\u0000-\u001f\u007f]*$/u;
const POLICY_VERSION = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
// Unpadded canonical base64url for exactly 32 bytes. The final character has
// two zero padding bits, hence the deliberately narrower final character set.
const DELETION_RECOVERY_SECRET = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u;
const UNOWNED_BOUNDARY_DECISIONS = ['import', 'clear', 'cancel'] as const;
const MISMATCH_BOUNDARY_DECISIONS = ['isolate', 'clear', 'cancel'] as const;

interface LocalOwnerRecordV1 {
  version: 1;
  accountId: string;
}

type OwnerReadResult =
  | { status: 'ready'; accountId: string }
  | { status: 'missing' }
  | { status: 'invalid' }
  | { status: 'unavailable' };

export type AccountLocalOwnerReadResult = OwnerReadResult;

export function accountSyncMetadataKey(accountId: string): string | null {
  if (!isAccountV2Id(accountId)) return null;
  return `${ACCOUNT_V2_STORAGE_PREFIX}account.${accountId}.v1`;
}

export function accountDeletionRequestKey(accountId: string): string | null {
  if (!isAccountV2Id(accountId)) return null;
  return `${ACCOUNT_V2_STORAGE_PREFIX}account.${accountId}.deletion.v1`;
}

export function accountPrivacyWithdrawalKey(accountId: string): string | null {
  if (!isAccountV2Id(accountId)) return null;
  return `${ACCOUNT_V2_STORAGE_PREFIX}account.${accountId}.withdrawal.v1`;
}

export function readAccountPrivacyWithdrawal(
  storage: AccountV2Storage,
  accountId: string,
): AccountPrivacyWithdrawalReadResult {
  const key = accountPrivacyWithdrawalKey(accountId);
  if (!key) return { status: 'invalid' };
  let serialized: string | null;
  try {
    serialized = storage.getItem(key);
  } catch {
    return { status: 'unavailable' };
  }
  if (serialized === null) return { status: 'missing' };
  if (utf8Bytes(serialized) > MAX_SMALL_RECORD_BYTES) return { status: 'invalid' };
  const request = parseJson(serialized);
  return isAccountPrivacyWithdrawal(request) && request.accountId === accountId
    ? { status: 'ready', request: { ...request } }
    : { status: 'invalid' };
}

export function persistAccountPrivacyWithdrawal(
  storage: AccountV2Storage,
  request: AccountPrivacyWithdrawalV1,
): boolean {
  const key = accountPrivacyWithdrawalKey(request.accountId);
  if (!key || !isAccountPrivacyWithdrawal(request)) return false;
  try {
    storage.setItem(key, JSON.stringify(request));
    return true;
  } catch {
    return false;
  }
}

export function clearConfirmedAccountPrivacyWithdrawal(
  storage: AccountV2Storage,
  accountId: string,
  mutationId: string,
): boolean {
  const key = accountPrivacyWithdrawalKey(accountId);
  if (!key || !isAccountV2Id(mutationId)) return false;
  const current = readAccountPrivacyWithdrawal(storage, accountId);
  if (current.status === 'missing') return true;
  if (current.status !== 'ready' || current.request.mutationId !== mutationId) return false;
  return removeIfPresent(storage, key).ok;
}

export function createAccountSyncMetadata(
  accountId: string,
  deviceId: string,
): AccountSyncMetadataV1 | null {
  if (!isAccountV2Id(accountId) || !isAccountV2Id(deviceId)) return null;
  return {
    version: ACCOUNT_SYNC_METADATA_VERSION,
    accountId,
    deviceId,
    serverCursor: null,
    pendingConsentOperation: null,
    charts: [],
  };
}

export function readAccountDeletionRequest(
  storage: AccountV2Storage,
  authenticatedAccountId: string,
): AccountDeletionRequestReadResult {
  const key = accountDeletionRequestKey(authenticatedAccountId);
  if (!key) return { status: 'invalid' };
  let serialized: string | null;
  try {
    serialized = storage.getItem(key);
  } catch {
    return { status: 'unavailable' };
  }
  if (serialized === null) return { status: 'missing' };
  if (utf8Bytes(serialized) > MAX_SMALL_RECORD_BYTES) return { status: 'invalid' };
  const parsed = parseJson(serialized);
  if (!isAccountDeletionRequest(parsed) || parsed.accountId !== authenticatedAccountId) {
    return { status: 'invalid' };
  }
  return { status: 'ready', request: { ...parsed } };
}

/** Finds account-scoped deletion capabilities after auth has already ended. */
export function listAccountDeletionRequests(
  storage: AccountV2Storage,
): AccountDeletionRequestListResult {
  let keys: string[];
  try {
    keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => key?.startsWith(ACCOUNT_V2_STORAGE_PREFIX) === true)
      .filter((key) => key.endsWith('.deletion.v1'));
  } catch {
    return { status: 'unavailable' };
  }
  if (keys.length > 16) return { status: 'invalid' };
  const requests: AccountDeletionRequestV1[] = [];
  for (const key of keys) {
    let serialized: string | null;
    try {
      serialized = storage.getItem(key);
    } catch {
      return { status: 'unavailable' };
    }
    if (serialized === null || utf8Bytes(serialized) > MAX_SMALL_RECORD_BYTES) {
      return { status: 'invalid' };
    }
    const request = parseJson(serialized);
    if (!isAccountDeletionRequest(request) || accountDeletionRequestKey(request.accountId) !== key) {
      return { status: 'invalid' };
    }
    requests.push({ ...request });
  }
  requests.sort((left, right) => left.accountId.localeCompare(right.accountId));
  return { status: 'ready', requests };
}

export function persistAccountDeletionRequest(
  storage: AccountV2Storage,
  request: AccountDeletionRequestV1,
): boolean {
  const key = accountDeletionRequestKey(request.accountId);
  if (!key || !isAccountDeletionRequest(request)) return false;
  const serialized = JSON.stringify(request);
  if (utf8Bytes(serialized) > MAX_SMALL_RECORD_BYTES) return false;
  try {
    storage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

/** Call only after the server result and local deletion completion are confirmed. */
export function clearConfirmedAccountDeletionRequest(
  storage: AccountV2Storage,
  authenticatedAccountId: string,
  requestId: string,
): boolean {
  const key = accountDeletionRequestKey(authenticatedAccountId);
  if (!key || !isAccountV2Id(requestId)) return false;
  const current = readAccountDeletionRequest(storage, authenticatedAccountId);
  if (current.status === 'missing') return true;
  if (current.status !== 'ready' || current.request.requestId !== requestId) return false;
  return removeIfPresent(storage, key).ok;
}

export function readAccountSyncMetadata(
  storage: AccountV2Storage,
  authenticatedAccountId: string,
): AccountMetadataReadResult {
  const key = accountSyncMetadataKey(authenticatedAccountId);
  if (!key) return { status: 'invalid', reason: 'invalid-account-id' };

  let serialized: string | null;
  try {
    serialized = storage.getItem(key);
  } catch {
    return { status: 'unavailable' };
  }
  if (serialized === null) return { status: 'missing' };
  if (utf8Bytes(serialized) > MAX_ACCOUNT_SYNC_METADATA_BYTES) {
    return { status: 'invalid', reason: 'too-large' };
  }

  const metadata = parseAccountSyncMetadata(serialized);
  if (!metadata) return { status: 'invalid', reason: 'schema' };
  if (metadata.accountId !== authenticatedAccountId) {
    return { status: 'invalid', reason: 'owner-mismatch' };
  }
  return { status: 'ready', metadata };
}

export function persistAccountSyncMetadata(
  storage: AccountV2Storage,
  metadata: AccountSyncMetadataV1,
): boolean {
  const key = accountSyncMetadataKey(metadata.accountId);
  if (!key) return false;
  const serialized = JSON.stringify(metadata);
  if (
    utf8Bytes(serialized) > MAX_ACCOUNT_SYNC_METADATA_BYTES
    || parseAccountSyncMetadata(serialized)?.accountId !== metadata.accountId
  ) return false;
  try {
    storage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

/** Strict parser: unknown fields are rejected to keep sensitive data out. */
export function parseAccountSyncMetadata(serialized: string): AccountSyncMetadataV1 | null {
  if (utf8Bytes(serialized) > MAX_ACCOUNT_SYNC_METADATA_BYTES) return null;
  const parsed = parseJson(serialized);
  if (!hasExactKeys(parsed, [
    'version',
    'accountId',
    'deviceId',
    'serverCursor',
    'pendingConsentOperation',
    'charts',
  ])) {
    return null;
  }
  if (
    parsed.version !== ACCOUNT_SYNC_METADATA_VERSION
    || !isAccountV2Id(parsed.accountId)
    || !isAccountV2Id(parsed.deviceId)
    || !isCursor(parsed.serverCursor)
    || !isPendingConsentOperationOrNull(parsed.pendingConsentOperation)
    || !Array.isArray(parsed.charts)
    || parsed.charts.length > MAX_ACCOUNT_SYNC_CHARTS
  ) return null;

  const seen = new Set<string>();
  const charts: AccountSyncChartMetadataV1[] = [];
  for (const candidate of parsed.charts) {
    if (!isChartMetadata(candidate) || seen.has(candidate.chartId)) return null;
    seen.add(candidate.chartId);
    charts.push({ ...candidate });
  }

  return {
    version: ACCOUNT_SYNC_METADATA_VERSION,
    accountId: parsed.accountId,
    deviceId: parsed.deviceId,
    serverCursor: parsed.serverCursor,
    pendingConsentOperation: parsed.pendingConsentOperation === null
      ? null
      : { ...parsed.pendingConsentOperation },
    charts: charts.sort((left, right) => left.chartId.localeCompare(right.chartId)),
  };
}

export function withAccountSyncCursor(
  metadata: AccountSyncMetadataV1,
  serverCursor: string | null,
): AccountSyncMetadataV1 | null {
  if (!isCursor(serverCursor)) return null;
  return validatedMetadata({ ...metadata, serverCursor });
}

export function withPendingConsentOperation(
  metadata: AccountSyncMetadataV1,
  pendingConsentOperation: PendingConsentOperationV1 | null,
): AccountSyncMetadataV1 | null {
  if (!isPendingConsentOperationOrNull(pendingConsentOperation)) return null;
  return validatedMetadata({ ...metadata, pendingConsentOperation });
}

export function withChartSyncMetadata(
  metadata: AccountSyncMetadataV1,
  chart: AccountSyncChartMetadataV1,
): AccountSyncMetadataV1 | null {
  if (!isChartMetadata(chart)) return null;
  const charts = metadata.charts.filter((candidate) => candidate.chartId !== chart.chartId);
  charts.push({ ...chart });
  return validatedMetadata({ ...metadata, charts });
}

export function withoutChartSyncMetadata(
  metadata: AccountSyncMetadataV1,
  chartId: string,
): AccountSyncMetadataV1 | null {
  if (!isAccountV2Id(chartId)) return null;
  return validatedMetadata({
    ...metadata,
    charts: metadata.charts.filter((candidate) => candidate.chartId !== chartId),
  });
}

/**
 * Purely inspects the local-owner boundary. It never binds the current browser
 * profile to the authenticated account and never deletes local chart data.
 */
export function inspectLocalAccountBoundary(
  storage: AccountV2Storage,
  authenticatedAccountId: string,
  hasLocalProfileData: boolean,
): AccountBoundaryState {
  if (!isAccountV2Id(authenticatedAccountId)) {
    return { status: 'blocked', reason: 'invalid-account-id' };
  }

  const owner = readLocalOwner(storage);
  if (owner.status === 'unavailable') {
    return { status: 'blocked', reason: 'storage-unavailable' };
  }
  if (owner.status === 'invalid') {
    return { status: 'blocked', reason: 'invalid-owner-record' };
  }
  if (owner.status === 'missing') {
    if (!hasLocalProfileData) {
      return {
        status: 'ready',
        authenticatedAccountId,
        localOwnerAccountId: null,
      };
    }
    return decisionRequired('unowned-local-data', authenticatedAccountId, null);
  }
  if (owner.accountId !== authenticatedAccountId) {
    return decisionRequired('owner-mismatch', authenticatedAccountId, owner.accountId);
  }
  return {
    status: 'ready',
    authenticatedAccountId,
    localOwnerAccountId: owner.accountId,
  };
}

export function readLocalAccountOwner(storage: AccountV2Storage): AccountLocalOwnerReadResult {
  return readLocalOwner(storage);
}

export function readRetainedAccountOwner(storage: AccountV2Storage): AccountLocalOwnerReadResult {
  return readRetainedOwner(storage);
}

/** Account-owned charts are visible signed out only after that owner explicitly retained them. */
export function retainedProfileAccessAllowed(
  storage: AccountV2Storage,
  accountId: string,
): boolean {
  if (!isAccountV2Id(accountId)) return false;
  const owner = readLocalOwner(storage);
  const retained = readRetainedOwner(storage);
  return owner.status === 'ready'
    && retained.status === 'ready'
    && owner.accountId === accountId
    && retained.accountId === accountId;
}

export function retainCurrentAccountProfile(
  storage: AccountV2Storage,
  accountId: string,
): boolean {
  if (!isAccountV2Id(accountId)) return false;
  const owner = readLocalOwner(storage);
  if (owner.status !== 'ready' || owner.accountId !== accountId) return false;
  try {
    storage.setItem(ACCOUNT_V2_RETAINED_OWNER_KEY, JSON.stringify({
      version: ACCOUNT_SYNC_METADATA_VERSION,
      accountId,
    } satisfies LocalOwnerRecordV1));
    return retainedProfileAccessAllowed(storage, accountId);
  } catch {
    return false;
  }
}

/** Re-authentication relocks an explicitly retained profile to its owner. */
export function lockCurrentAccountProfile(
  storage: AccountV2Storage,
  accountId: string,
): boolean {
  if (!isAccountV2Id(accountId)) return false;
  const owner = readLocalOwner(storage);
  if (owner.status !== 'ready' || owner.accountId !== accountId) return false;
  const retained = readRetainedOwner(storage);
  if (retained.status === 'missing') return true;
  if (retained.status !== 'ready' || retained.accountId !== accountId) return false;
  try {
    storage.removeItem(ACCOUNT_V2_RETAINED_OWNER_KEY);
    return readRetainedOwner(storage).status === 'missing';
  } catch {
    return false;
  }
}

/**
 * Records a choice only after the caller has completed the corresponding
 * import, isolation, or local clear. `cancel` is always a no-op. An import is
 * valid only for unowned data; cross-account data must be isolated or cleared.
 */
export function recordCompletedAccountBoundaryDecision(
  storage: AccountV2Storage,
  authenticatedAccountId: string,
  decision: AccountBoundaryDecision,
): boolean {
  if (!isAccountV2Id(authenticatedAccountId)) return false;
  if (decision === 'cancel') return true;
  if (decision !== 'import' && decision !== 'isolate' && decision !== 'clear') return false;

  const owner = readLocalOwner(storage);
  if (owner.status === 'invalid' || owner.status === 'unavailable') return false;
  if (decision === 'import' && owner.status !== 'missing') return false;
  if (
    decision === 'isolate'
    && (owner.status !== 'ready' || owner.accountId === authenticatedAccountId)
  ) return false;
  if (
    decision === 'clear'
    && owner.status === 'ready'
    && owner.accountId === authenticatedAccountId
  ) return false;
  const record: LocalOwnerRecordV1 = {
    version: ACCOUNT_SYNC_METADATA_VERSION,
    accountId: authenticatedAccountId,
  };
  let previousOwner: string | null = null;
  let previousRetention: string | null = null;
  let snapshotReady = false;
  try {
    previousOwner = storage.getItem(ACCOUNT_V2_LOCAL_OWNER_KEY);
    previousRetention = storage.getItem(ACCOUNT_V2_RETAINED_OWNER_KEY);
    snapshotReady = true;
    storage.setItem(ACCOUNT_V2_LOCAL_OWNER_KEY, JSON.stringify(record));
    storage.removeItem(ACCOUNT_V2_RETAINED_OWNER_KEY);
    return true;
  } catch {
    if (snapshotReady) {
      try {
        if (previousOwner === null) storage.removeItem(ACCOUNT_V2_LOCAL_OWNER_KEY);
        else storage.setItem(ACCOUNT_V2_LOCAL_OWNER_KEY, previousOwner);
        if (previousRetention === null) storage.removeItem(ACCOUNT_V2_RETAINED_OWNER_KEY);
        else storage.setItem(ACCOUNT_V2_RETAINED_OWNER_KEY, previousRetention);
      } catch {
        // The exclusive transition caller will keep access revoked after a failed rollback.
      }
    }
    return false;
  }
}

/**
 * Clears only sync metadata and the matching local-owner marker. A pending
 * account-deletion request is deliberately separate and survives this call.
 */
export function clearCurrentAccountV2Metadata(
  storage: AccountV2Storage,
  authenticatedAccountId: string,
  options: { preserveOwner?: boolean } = {},
): AccountV2ClearResult {
  const key = accountSyncMetadataKey(authenticatedAccountId);
  if (!key) return { ok: false, removedKeys: 0 };
  let ok = true;
  const accountRemoval = removeIfPresent(storage, key);
  if (!accountRemoval.ok) ok = false;
  let removedKeys = accountRemoval.removed ? 1 : 0;

  if (!options.preserveOwner) {
    const owner = readLocalOwner(storage);
    if (owner.status === 'ready' && owner.accountId === authenticatedAccountId) {
      const ownerRemoval = removeIfPresent(storage, ACCOUNT_V2_LOCAL_OWNER_KEY);
      if (!ownerRemoval.ok) ok = false;
      if (ownerRemoval.removed) removedKeys += 1;
      const retainedRemoval = removeIfPresent(storage, ACCOUNT_V2_RETAINED_OWNER_KEY);
      if (!retainedRemoval.ok) ok = false;
      if (retainedRemoval.removed) removedKeys += 1;
    } else if (owner.status === 'unavailable') {
      ok = false;
    }
  }
  return { ok, removedKeys };
}

/**
 * Clears ordinary v2 metadata while preserving unrelated storage and any
 * unconfirmed deletion or privacy-withdrawal recovery capability.
 */
export function clearAllAccountV2Metadata(storage: AccountV2Storage): AccountV2ClearResult {
  let keys: string[];
  try {
    keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => key?.startsWith(ACCOUNT_V2_STORAGE_PREFIX) === true)
      .filter((key) => !key.endsWith('.deletion.v1') && !key.endsWith('.withdrawal.v1'));
  } catch {
    return { ok: false, removedKeys: 0 };
  }

  let ok = true;
  let removedKeys = 0;
  for (const key of keys) {
    try {
      storage.removeItem(key);
      removedKeys += 1;
    } catch {
      ok = false;
    }
  }
  return { ok, removedKeys };
}

function validatedMetadata(value: AccountSyncMetadataV1): AccountSyncMetadataV1 | null {
  return parseAccountSyncMetadata(JSON.stringify(value));
}

function isChartMetadata(value: unknown): value is AccountSyncChartMetadataV1 {
  if (!hasExactKeys(value, [
    'chartId',
    'selectedForSync',
    'serverRevision',
    'pendingOperation',
  ])) return false;
  return isAccountV2Id(value.chartId)
    && typeof value.selectedForSync === 'boolean'
    && typeof value.serverRevision === 'number'
    && Number.isSafeInteger(value.serverRevision)
    && value.serverRevision >= 0
    && value.serverRevision <= MAX_SERVER_REVISION
    && isPendingChartOperationOrNull(value.pendingOperation)
    && (value.pendingOperation === null || (
      value.pendingOperation.chartId === value.chartId
      && value.pendingOperation.baseRevision === value.serverRevision
    ));
}

function isPendingChartOperationOrNull(value: unknown): value is PendingChartOperationV1 | null {
  if (value === null) return true;
  if (!hasExactKeys(value, [
    'version',
    'operation',
    'mutationId',
    'chartId',
    'baseRevision',
    'semanticFingerprint',
  ])) return false;
  return value.version === ACCOUNT_SYNC_METADATA_VERSION
    && (value.operation === 'put_chart' || value.operation === 'delete_chart')
    && isAccountV2Id(value.mutationId)
    && isAccountV2Id(value.chartId)
    && typeof value.baseRevision === 'number'
    && Number.isSafeInteger(value.baseRevision)
    && value.baseRevision >= 0
    && value.baseRevision <= MAX_SERVER_REVISION
    && isSha256Hex(value.semanticFingerprint);
}

function isPendingConsentOperationOrNull(
  value: unknown,
): value is PendingConsentOperationV1 | null {
  if (value === null) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const expected = candidate.decision === 'grant'
    ? ['version', 'operation', 'decision', 'policyVersion', 'mutationId', 'semanticFingerprint']
    : ['version', 'operation', 'decision', 'mutationId', 'semanticFingerprint'];
  if (!hasExactKeys(value, expected)) return false;
  return candidate.version === ACCOUNT_SYNC_METADATA_VERSION
    && candidate.operation === 'consent'
    && (candidate.decision === 'grant' || candidate.decision === 'withdraw')
    && (candidate.decision !== 'grant'
      || (typeof candidate.policyVersion === 'string' && POLICY_VERSION.test(candidate.policyVersion)))
    && isAccountV2Id(candidate.mutationId)
    && isSha256Hex(candidate.semanticFingerprint);
}

function isCursor(value: unknown): value is string | null {
  return value === null || (
    typeof value === 'string'
    && value.length <= MAX_ACCOUNT_SYNC_CURSOR_LENGTH
    && CURSOR.test(value)
  );
}

function readLocalOwner(storage: AccountV2Storage): OwnerReadResult {
  let serialized: string | null;
  try {
    serialized = storage.getItem(ACCOUNT_V2_LOCAL_OWNER_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  if (serialized === null) return { status: 'missing' };
  if (utf8Bytes(serialized) > MAX_SMALL_RECORD_BYTES) return { status: 'invalid' };
  const parsed = parseJson(serialized);
  if (!isLocalOwnerRecord(parsed)) return { status: 'invalid' };
  return { status: 'ready', accountId: parsed.accountId };
}

function readRetainedOwner(storage: AccountV2Storage): OwnerReadResult {
  let serialized: string | null;
  try {
    serialized = storage.getItem(ACCOUNT_V2_RETAINED_OWNER_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  if (serialized === null) return { status: 'missing' };
  if (utf8Bytes(serialized) > MAX_SMALL_RECORD_BYTES) return { status: 'invalid' };
  const parsed = parseJson(serialized);
  if (!isLocalOwnerRecord(parsed)) return { status: 'invalid' };
  return { status: 'ready', accountId: parsed.accountId };
}

function decisionRequired(
  reason: 'unowned-local-data' | 'owner-mismatch',
  authenticatedAccountId: string,
  localOwnerAccountId: string | null,
): AccountBoundaryState {
  if (reason === 'owner-mismatch' && localOwnerAccountId !== null) {
    return {
      status: 'decision-required',
      reason,
      authenticatedAccountId,
      localOwnerAccountId,
      decisions: MISMATCH_BOUNDARY_DECISIONS,
    };
  }
  return {
    status: 'decision-required',
    reason: 'unowned-local-data',
    authenticatedAccountId,
    localOwnerAccountId: null,
    decisions: UNOWNED_BOUNDARY_DECISIONS,
  };
}

function isLocalOwnerRecord(value: unknown): value is LocalOwnerRecordV1 {
  return hasExactKeys(value, ['version', 'accountId'])
    && value.version === ACCOUNT_SYNC_METADATA_VERSION
    && isAccountV2Id(value.accountId);
}

function isAccountDeletionRequest(value: unknown): value is AccountDeletionRequestV1 {
  return hasExactKeys(value, ['version', 'accountId', 'requestId', 'recoverySecret'])
    && value.version === ACCOUNT_SYNC_METADATA_VERSION
    && isAccountV2Id(value.accountId)
    && isAccountV2Id(value.requestId)
    && typeof value.recoverySecret === 'string'
    && DELETION_RECOVERY_SECRET.test(value.recoverySecret);
}

function isAccountPrivacyWithdrawal(value: unknown): value is AccountPrivacyWithdrawalV1 {
  return hasExactKeys(value, [
    'version', 'accountId', 'mutationId', 'semanticFingerprint',
  ])
    && value.version === ACCOUNT_SYNC_METADATA_VERSION
    && isAccountV2Id(value.accountId)
    && isAccountV2Id(value.mutationId)
    && isSha256Hex(value.semanticFingerprint);
}

function hasExactKeys<T extends readonly string[]>(
  value: unknown,
  expected: T,
): value is Record<T[number], unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function utf8Bytes(value: string): number {
  if (value.length > MAX_ACCOUNT_SYNC_METADATA_BYTES) return value.length;
  return new TextEncoder().encode(value).byteLength;
}

function removeIfPresent(
  storage: AccountV2Storage,
  key: string,
): { ok: boolean; removed: boolean } {
  try {
    const exists = storage.getItem(key) !== null;
    storage.removeItem(key);
    return { ok: true, removed: exists };
  } catch {
    return { ok: false, removed: false };
  }
}
