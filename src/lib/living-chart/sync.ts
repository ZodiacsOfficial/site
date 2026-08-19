import { isAccountV2Id } from '../account-v2/storage-identity';
import {
  livingChartConsentAuthorityKey,
  livingChartPendingMutationsKey,
  livingChartSyncChoiceKey,
} from './sync-metadata';
export {
  livingChartConsentAuthorityKey,
  livingChartPendingMutationsKey,
  livingChartSyncChoiceKey,
  livingChartSyncMetadataKeys,
} from './sync-metadata';
import {
  acceptLivingMomentRemoteDeletion,
  cacheRemoteLivingMoment,
  cacheRemoteLivingMomentDeletion,
  acknowledgeLivingMomentSync,
  countImportableGuestLivingMoments,
  importGuestLivingMomentsToAccount,
  listLivingMoments,
  markLivingMomentSyncConflict,
  resetLivingChartSyncState,
  retryLivingMomentConflict,
  type LivingChartImportResult,
} from './store';
import {
  cloudSnapshotMoment,
  createLivingChartCloudClient,
  type LivingChartCloudClient,
  type LivingChartCloudConsent,
} from './cloud';
import type {
  LivingChartOwnerScope,
  LivingChartSyncStatus,
  LivingMomentV1,
} from './types';


interface SyncChoiceRecord {
  version: 1;
  accountId: string;
  choice: 'device_only';
}

interface PendingMutationRecord {
  version: 1;
  accountId: string;
  operations: Record<string, string>;
}

interface ConsentAuthorityRecord {
  version: 1;
  accountId: string;
  state: LivingChartCloudConsent['state'];
  consentEpoch: number;
}

export interface LivingChartSyncRunResult {
  status: LivingChartSyncStatus;
  consentInvalidated: boolean;
}

export interface LivingChartSyncStorePort {
  list(owner: LivingChartOwnerScope, options: { includeDeleted: true }): Promise<LivingMomentV1[]>;
  cacheRemote(
    owner: LivingChartOwnerScope,
    remote: LivingMomentV1,
    serverRevision: number,
  ): Promise<'applied' | 'unchanged' | 'conflict' | 'failed'>;
  cacheRemoteDeletion(
    owner: LivingChartOwnerScope,
    id: string,
    serverRevision: number,
    deletedAt: string,
  ): Promise<'applied' | 'unchanged' | 'conflict' | 'failed'>;
  acknowledge(
    owner: LivingChartOwnerScope,
    id: string,
    expectedRevision: number,
    serverRevision: number,
  ): Promise<LivingMomentV1 | null>;
  markConflict(
    owner: LivingChartOwnerScope,
    id: string,
    serverRevision: number,
  ): Promise<LivingMomentV1 | null>;
  acceptRemoteDeletion(
    owner: LivingChartOwnerScope,
    id: string,
    serverRevision: number,
  ): Promise<boolean>;
}

const DEFAULT_SYNC_STORE: LivingChartSyncStorePort = {
  list: (owner, options) => listLivingMoments(owner, options),
  cacheRemote: cacheRemoteLivingMoment,
  cacheRemoteDeletion: cacheRemoteLivingMomentDeletion,
  acknowledge: acknowledgeLivingMomentSync,
  markConflict: markLivingMomentSyncConflict,
  acceptRemoteDeletion: acceptLivingMomentRemoteDeletion,
};

const syncGeneration = new Map<string, number>();

export interface LivingChartDirtyPassRunner<T> {
  run(key: string, pass: () => Promise<T>): Promise<T>;
}

/**
 * Coalesces concurrent triggers without losing work created after an active
 * pass took its local snapshot. A trigger marks the key dirty; the active
 * promise then makes one more pass using the newest callback before settling.
 */
export function createLivingChartDirtyPassRunner<T>(maximumPasses = 8): LivingChartDirtyPassRunner<T> {
  interface ActiveRun {
    version: number;
    pass: () => Promise<T>;
    promise: Promise<T>;
  }
  const active = new Map<string, ActiveRun>();
  return {
    run(key, pass) {
      const current = active.get(key);
      if (current) {
        current.version += 1;
        current.pass = pass;
        return current.promise;
      }
      const state = { version: 1, pass, promise: null as unknown as Promise<T> };
      state.promise = (async () => {
        let result!: T;
        for (let passNumber = 0; passNumber < maximumPasses; passNumber += 1) {
          const observedVersion = state.version;
          result = await state.pass();
          if (state.version === observedVersion) return result;
        }
        throw new Error('living-chart-sync-too-busy');
      })().finally(() => {
        if (active.get(key) === state) active.delete(key);
      });
      active.set(key, state);
      return state.promise;
    },
  };
}

const syncPassRunner = createLivingChartDirtyPassRunner<LivingChartSyncRunResult>();

function currentSyncGeneration(accountId: string): number {
  return syncGeneration.get(accountId) ?? 0;
}

function assertSyncGeneration(accountId: string, generation: number): void {
  if (currentSyncGeneration(accountId) !== generation) throw new Error('living-chart-sync-superseded');
}

export async function quiesceLivingChartSync(accountId: string): Promise<void> {
  if (!isAccountV2Id(accountId)) return;
  syncGeneration.set(accountId, currentSyncGeneration(accountId) + 1);
  // Do not await a stalled network request before consent withdrawal. The
  // server serializes revoke against old-epoch writes, while generation checks
  // prevent a late response from touching the local cache.
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseJson(value: string | null): unknown {
  if (value === null || value.length > 64 * 1024) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readConsentAuthority(accountId: string, storage = browserStorage()): ConsentAuthorityRecord | null {
  const key = livingChartConsentAuthorityKey(accountId);
  if (!storage || !key) return null;
  try {
    const value = parseJson(storage.getItem(key));
    if (!isRecord(value)
      || value.version !== 1
      || value.accountId !== accountId.toLowerCase()
      || (value.state !== 'pending' && value.state !== 'granted' && value.state !== 'withdrawn')
      || !Number.isSafeInteger(value.consentEpoch)
      || (value.consentEpoch as number) < 0) return null;
    return value as unknown as ConsentAuthorityRecord;
  } catch {
    return null;
  }
}

export async function reconcileLivingChartConsent(
  owner: Extract<LivingChartOwnerScope, { kind: 'account' }>,
  consent: LivingChartCloudConsent,
  storage = browserStorage(),
  resetSyncState: (scope: LivingChartOwnerScope) => Promise<boolean> = resetLivingChartSyncState,
): Promise<boolean> {
  const key = livingChartConsentAuthorityKey(owner.accountId);
  if (!storage || !key) return false;
  const previous = readConsentAuthority(owner.accountId, storage);
  const authorityChanged = previous === null
    || previous.state !== consent.state
    || previous.consentEpoch !== consent.consentEpoch;
  if (authorityChanged) {
    if (!await resetSyncState(owner)) return false;
    const pendingKey = livingChartPendingMutationsKey(owner.accountId);
    if (pendingKey) {
      try {
        storage.removeItem(pendingKey);
      } catch {
        return false;
      }
    }
  }
  const record: ConsentAuthorityRecord = {
    version: 1,
    accountId: owner.accountId,
    state: consent.state,
    consentEpoch: consent.consentEpoch,
  };
  try {
    storage.setItem(key, JSON.stringify(record));
    return storage.getItem(key) === JSON.stringify(record);
  } catch {
    return false;
  }
}

export function livingChartDeviceOnlyChosen(accountId: string, storage = browserStorage()): boolean {
  const key = livingChartSyncChoiceKey(accountId);
  if (!storage || !key) return false;
  try {
    const value = parseJson(storage.getItem(key));
    return isRecord(value)
      && value.version === 1
      && value.accountId === accountId.toLowerCase()
      && value.choice === 'device_only';
  } catch {
    return false;
  }
}

export function setLivingChartDeviceOnlyChoice(
  accountId: string,
  deviceOnly: boolean,
  storage = browserStorage(),
): boolean {
  const key = livingChartSyncChoiceKey(accountId);
  if (!storage || !key) return false;
  try {
    if (!deviceOnly) {
      const current = parseJson(storage.getItem(key));
      if (isRecord(current) && current.accountId === accountId.toLowerCase()) {
        storage.removeItem(key);
      }
      return true;
    }
    const record: SyncChoiceRecord = {
      version: 1,
      accountId: accountId.toLowerCase(),
      choice: 'device_only',
    };
    storage.setItem(key, JSON.stringify(record));
    return storage.getItem(key) === JSON.stringify(record);
  } catch {
    return false;
  }
}

function readPendingMutations(accountId: string, storage: Storage | null): PendingMutationRecord {
  const empty: PendingMutationRecord = { version: 1, accountId, operations: {} };
  const key = livingChartPendingMutationsKey(accountId);
  if (!storage || !key) return empty;
  try {
    const value = parseJson(storage.getItem(key));
    if (!isRecord(value)
      || value.version !== 1
      || value.accountId !== accountId
      || !isRecord(value.operations)
      || Object.keys(value.operations).length > 300
      || Object.values(value.operations).some((id) => !isAccountV2Id(id))) return empty;
    return { version: 1, accountId, operations: value.operations as Record<string, string> };
  } catch {
    return empty;
  }
}

function persistPendingMutations(record: PendingMutationRecord, storage: Storage | null): boolean {
  const key = livingChartPendingMutationsKey(record.accountId);
  if (!storage || !key) return false;
  try {
    storage.setItem(key, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

function pendingMutationId(
  owner: Extract<LivingChartOwnerScope, { kind: 'account' }>,
  operationKey: string,
): string | null {
  const storage = browserStorage();
  const record = readPendingMutations(owner.accountId, storage);
  const existing = record.operations[operationKey];
  if (existing) return existing;
  const mutationId = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : '';
  if (!isAccountV2Id(mutationId)) return null;
  record.operations[operationKey] = mutationId.toLowerCase();
  return persistPendingMutations(record, storage) ? mutationId.toLowerCase() : null;
}

function clearPendingMutation(
  owner: Extract<LivingChartOwnerScope, { kind: 'account' }>,
  operationKey: string,
): void {
  const storage = browserStorage();
  const record = readPendingMutations(owner.accountId, storage);
  if (!(operationKey in record.operations)) return;
  delete record.operations[operationKey];
  persistPendingMutations(record, storage);
}

function countPending(
  moments: LivingMomentV1[],
  remoteDeletedRevisions: ReadonlyMap<string, number>,
): { pendingCount: number; conflictCount: number } {
  let pendingCount = 0;
  let conflictCount = 0;
  for (const moment of moments) {
    if (moment.syncState === 'conflict') conflictCount += 1;
    else if (moment.syncState === 'local' || moment.syncState === 'queued') pendingCount += 1;
    else if (moment.syncState === 'deleted'
      && remoteDeletedRevisions.get(moment.id) !== moment.baseRevision) pendingCount += 1;
  }
  return { pendingCount, conflictCount };
}

function resultStatus(
  phase: LivingChartSyncStatus['phase'],
  counts: { pendingCount: number; conflictCount: number },
  message: string,
  lastSyncedAt: string | null = null,
): LivingChartSyncStatus {
  return { phase, ...counts, message, lastSyncedAt };
}

function online(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

async function syncInternal(
  owner: Extract<LivingChartOwnerScope, { kind: 'account' }>,
  cloud: LivingChartCloudClient,
  consent: LivingChartCloudConsent,
  generation: number,
  store: LivingChartSyncStorePort,
): Promise<LivingChartSyncRunResult> {
  const assertCurrent = () => assertSyncGeneration(owner.accountId, generation);
  assertCurrent();
  if (consent.state !== 'granted' || consent.consentEpoch < 1) {
    return {
      status: resultStatus('device_only', { pendingCount: 0, conflictCount: 0 }, 'Saved on this device.'),
      consentInvalidated: true,
    };
  }
  if (!online()) {
    const local = await store.list(owner, { includeDeleted: true });
    return {
      status: resultStatus('offline', countPending(local, new Map()), 'Offline. Changes will sync when you reconnect.'),
      consentInvalidated: false,
    };
  }

  const snapshot = await cloud.snapshot(consent.consentEpoch);
  assertCurrent();
  if (snapshot.outcome !== 'ready') {
    return {
      status: resultStatus('device_only', { pendingCount: 0, conflictCount: 0 }, 'Cloud sync needs your permission again.'),
      consentInvalidated: true,
    };
  }
  const remoteDeletedRevisions = new Map<string, number>();
  const unresolvedConflictIds = new Set<string>();
  for (const row of snapshot.moments) {
    if (row.consentEpoch !== snapshot.consentEpoch) continue;
    if (row.deletedAt !== null) {
      remoteDeletedRevisions.set(row.momentId, row.revision);
      const cached = await store.cacheRemoteDeletion(owner, row.momentId, row.revision, row.deletedAt);
      if (cached === 'failed') throw new Error('living-chart-local-cache-failed');
      assertCurrent();
      continue;
    }
    const remote = cloudSnapshotMoment(owner, row);
    if (!remote) throw new Error('living-chart-cloud-invalid-moment');
    const cached = await store.cacheRemote(owner, remote, row.revision);
    if (cached === 'failed') throw new Error('living-chart-local-cache-failed');
    assertCurrent();
  }

  const moments = await store.list(owner, { includeDeleted: true });
  // A delete can free the server's active-row capacity for a pending put. Keep
  // the store's stable order inside each group, but always drain deletions first.
  const mutationOrder = [...moments].sort((left, right) => (
    Number(right.syncState === 'deleted') - Number(left.syncState === 'deleted')
  ));
  for (const moment of mutationOrder) {
    if (moment.syncState === 'synced' || moment.syncState === 'conflict') continue;
    if (moment.syncState === 'deleted'
      && remoteDeletedRevisions.get(moment.id) === moment.baseRevision) continue;
    const operation = moment.syncState === 'deleted' ? 'delete' : 'put';
    const operationKey = [operation, moment.id, moment.revision, moment.baseRevision, consent.consentEpoch].join(':');
    const mutationId = pendingMutationId(owner, operationKey);
    if (!mutationId) throw new Error('living-chart-sync-metadata-unavailable');
    const outcome = operation === 'delete'
      ? await cloud.delete(moment, consent.consentEpoch, mutationId)
      : await cloud.put(moment, consent.consentEpoch, mutationId);
    assertCurrent();
    if (outcome.outcome === 'saved'
      || outcome.outcome === 'deleted'
      || outcome.outcome === 'already_deleted') {
      clearPendingMutation(owner, operationKey);
      if (!await store.acknowledge(owner, moment.id, moment.revision, outcome.revision)) {
        throw new Error('living-chart-local-ack-failed');
      }
      assertCurrent();
      if (operation === 'delete') remoteDeletedRevisions.set(moment.id, outcome.revision);
      continue;
    }
    if (outcome.outcome === 'conflict') {
      clearPendingMutation(owner, operationKey);
      if (outcome.deleted) {
        if (!await store.acceptRemoteDeletion(owner, moment.id, outcome.revision)) {
          throw new Error('living-chart-local-delete-failed');
        }
        assertCurrent();
        remoteDeletedRevisions.set(moment.id, outcome.revision);
      } else {
        if (operation === 'delete') {
          let activeRevision = outcome.revision;
          let deletionSettled = false;
          for (let attempt = 0; attempt < 4; attempt += 1) {
            if (!await store.markConflict(owner, moment.id, activeRevision)) {
              throw new Error('living-chart-local-conflict-failed');
            }
            assertCurrent();
            const retryKey = [
              'delete', moment.id, moment.revision, activeRevision, consent.consentEpoch,
            ].join(':');
            const retryMutationId = pendingMutationId(owner, retryKey);
            if (!retryMutationId) throw new Error('living-chart-sync-metadata-unavailable');
            const retry = await cloud.delete(
              { ...moment, baseRevision: activeRevision },
              consent.consentEpoch,
              retryMutationId,
            );
            assertCurrent();
            if (retry.outcome === 'deleted' || retry.outcome === 'already_deleted') {
              clearPendingMutation(owner, retryKey);
              if (!await store.acknowledge(owner, moment.id, moment.revision, retry.revision)) {
                throw new Error('living-chart-local-ack-failed');
              }
              assertCurrent();
              remoteDeletedRevisions.set(moment.id, retry.revision);
              deletionSettled = true;
              break;
            }
            if (retry.outcome === 'conflict') {
              clearPendingMutation(owner, retryKey);
              if (retry.deleted) {
                if (!await store.acceptRemoteDeletion(owner, moment.id, retry.revision)) {
                  throw new Error('living-chart-local-delete-failed');
                }
                assertCurrent();
                remoteDeletedRevisions.set(moment.id, retry.revision);
                deletionSettled = true;
                break;
              }
              activeRevision = retry.revision;
              continue;
            }
            if (retry.outcome === 'consent_stale') {
              return {
                status: resultStatus('device_only', countPending(moments, remoteDeletedRevisions), 'Cloud sync needs your permission again.'),
                consentInvalidated: true,
              };
            }
            throw new Error('living-chart-mutation-conflict');
          }
          if (!deletionSettled) {
            if (!await store.markConflict(owner, moment.id, activeRevision)) {
              throw new Error('living-chart-local-conflict-failed');
            }
            throw new Error('living-chart-delete-conflict-busy');
          }
        } else {
          if (!await store.markConflict(owner, moment.id, outcome.revision)) {
            throw new Error('living-chart-local-conflict-failed');
          }
          assertCurrent();
          unresolvedConflictIds.add(moment.id);
        }
      }
      continue;
    }
    if (outcome.outcome === 'consent_required' || outcome.outcome === 'consent_stale') {
      return {
        status: resultStatus('device_only', countPending(moments, remoteDeletedRevisions), 'Cloud sync needs your permission again.'),
        consentInvalidated: true,
      };
    }
    if (outcome.outcome === 'moment_limit_reached') {
      // Active capacity can recover after another device/local deletion. Do
      // not pin a recoverable limit receipt to this operation forever.
      clearPendingMutation(owner, operationKey);
      throw new Error('living-chart-cloud-limit');
    }
    if (outcome.outcome === 'temporarily_disabled') {
      return {
        status: resultStatus('error', countPending(moments, remoteDeletedRevisions), 'Cloud sync is temporarily paused. Your changes remain on this device.'),
        consentInvalidated: false,
      };
    }
    throw new Error('living-chart-mutation-conflict');
  }

  if (unresolvedConflictIds.size > 0) {
    const refreshed = await cloud.snapshot(consent.consentEpoch);
    assertCurrent();
    if (refreshed.outcome !== 'ready') {
      return {
        status: resultStatus('device_only', countPending(moments, remoteDeletedRevisions), 'Cloud sync needs your permission again.'),
        consentInvalidated: true,
      };
    }
    for (const row of refreshed.moments) {
      if (!unresolvedConflictIds.has(row.momentId)) continue;
      if (row.deletedAt !== null) {
        if (!await store.acceptRemoteDeletion(owner, row.momentId, row.revision)) {
          throw new Error('living-chart-local-delete-failed');
        }
        assertCurrent();
        remoteDeletedRevisions.set(row.momentId, row.revision);
        unresolvedConflictIds.delete(row.momentId);
        continue;
      }
      const remote = cloudSnapshotMoment(owner, row);
      if (!remote) throw new Error('living-chart-cloud-invalid-conflict-copy');
      const cached = await store.cacheRemote(owner, remote, row.revision);
      assertCurrent();
      if (cached === 'applied' || cached === 'conflict') unresolvedConflictIds.delete(row.momentId);
    }
    if (unresolvedConflictIds.size > 0) throw new Error('living-chart-cloud-missing-conflict-copy');
  }

  const settled = await store.list(owner, { includeDeleted: true });
  const counts = countPending(settled, remoteDeletedRevisions);
  const now = new Date().toISOString();
  return {
    status: resultStatus(
      counts.conflictCount > 0 ? 'conflict' : counts.pendingCount > 0 ? 'offline' : 'ready',
      counts,
      counts.conflictCount > 0
        ? `${counts.conflictCount} ${counts.conflictCount === 1 ? 'entry needs' : 'entries need'} your choice before syncing.`
        : counts.pendingCount > 0 ? 'Some changes are waiting to sync.' : 'Up to date on every device.',
      now,
    ),
    consentInvalidated: false,
  };
}

export function syncLivingChartNow(
  owner: Extract<LivingChartOwnerScope, { kind: 'account' }>,
  cloud: LivingChartCloudClient,
  consent: LivingChartCloudConsent,
  store: LivingChartSyncStorePort = DEFAULT_SYNC_STORE,
): Promise<LivingChartSyncRunResult> {
  const generation = currentSyncGeneration(owner.accountId);
  const key = `${owner.accountId}:${consent.consentEpoch}:${generation}`;
  return syncPassRunner.run(key, () => syncInternal(owner, cloud, consent, generation, store));
}

export async function loadLivingChartCloudContext(
  owner: Extract<LivingChartOwnerScope, { kind: 'account' }>,
): Promise<{
  cloud: LivingChartCloudClient;
  consent: LivingChartCloudConsent;
  importableGuestMoments: number;
} | null> {
  const cloud = createLivingChartCloudClient(owner.accountId);
  if (!cloud) return null;
  const consent = await cloud.readConsent();
  if (!await reconcileLivingChartConsent(owner, consent)) return null;
  const importableGuestMoments = await countImportableGuestLivingMoments(owner);
  return { cloud, consent, importableGuestMoments };
}

export async function importGuestLivingChart(
  owner: Extract<LivingChartOwnerScope, { kind: 'account' }>,
): Promise<LivingChartImportResult | null> {
  return importGuestLivingMomentsToAccount(owner);
}

export async function importGuestLivingChartMoment(
  owner: Extract<LivingChartOwnerScope, { kind: 'account' }>,
  momentId: string,
): Promise<LivingChartImportResult | null> {
  if (!isAccountV2Id(momentId)) return null;
  return importGuestLivingMomentsToAccount(owner, { momentId });
}

export async function resolveLivingChartConflict(
  owner: Extract<LivingChartOwnerScope, { kind: 'account' }>,
  momentId: string,
  resolution: 'device' | 'cloud',
): Promise<boolean> {
  return (await retryLivingMomentConflict(owner, momentId, resolution)) !== null;
}
