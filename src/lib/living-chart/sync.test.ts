import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLivingForecastSnapshot } from './forecast-snapshot';
import { livingMomentCloudPayload, type LivingChartCloudClient } from './cloud';
import {
  createLivingChartStore,
  type LivingChartAdapterMutation,
  type LivingChartAsyncAdapter,
} from './store';
import {
  createLivingChartDirtyPassRunner,
  livingChartPendingMutationsKey,
  quiesceLivingChartSync,
  reconcileLivingChartConsent,
  syncLivingChartNow,
  type LivingChartSyncStorePort,
} from './sync';
import type { LivingChartOwnerScope } from './types';

afterEach(() => vi.unstubAllGlobals());

class MemoryAdapter implements LivingChartAsyncAdapter {
  readonly data = new Map<string, Map<string, unknown>>();

  async readAll(ownerKey: string): Promise<unknown[]> {
    return [...(this.data.get(ownerKey)?.values() ?? [])];
  }

  async mutate<T>(
    ownerKey: string,
    operation: (records: unknown[]) => LivingChartAdapterMutation<T>,
  ): Promise<T> {
    const records = this.data.get(ownerKey) ?? new Map<string, unknown>();
    this.data.set(ownerKey, records);
    const mutation = operation([...records.values()]);
    if (mutation.put) records.set(mutation.put.id, structuredClone(mutation.put.value));
    else if (mutation.deleteId) records.delete(mutation.deleteId);
    return mutation.result;
  }

  async clear(ownerKey: string): Promise<void> { this.data.delete(ownerKey); }
  async clearAll(): Promise<void> { this.data.clear(); }
}

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

function installBrowserMetadata() {
  let mutation = 0;
  vi.stubGlobal('window', { localStorage: memoryStorage() });
  vi.stubGlobal('crypto', {
    randomUUID: () => `70000000-0000-4000-8000-${String(++mutation).padStart(12, '0')}`,
  });
}

function storePort(store: ReturnType<typeof createLivingChartStore>): LivingChartSyncStorePort {
  return {
    list: (owner, options) => store.list(owner, options),
    cacheRemote: (owner, remote, revision) => store.cacheRemote(owner, remote, revision),
    cacheRemoteDeletion: (owner, id, revision, deletedAt) => (
      store.cacheRemoteDeletion(owner, id, revision, deletedAt)
    ),
    acknowledge: (owner, id, expected, server) => store.acknowledgeSync(owner, id, expected, server),
    markConflict: (owner, id, revision) => store.markSyncConflict(owner, id, revision),
    acceptRemoteDeletion: (owner, id, revision) => store.acceptRemoteDeletion(owner, id, revision),
  };
}

function owner(index: number): Extract<LivingChartOwnerScope, { kind: 'account' }> {
  return { kind: 'account', accountId: `71000000-0000-4000-8000-${String(index).padStart(12, '0')}` };
}

const CHART_ID = '72000000-0000-4000-8000-000000000001';
const MOMENT_ID = '73000000-0000-4000-8000-000000000001';
const NOW = '2026-08-18T10:00:00.000Z';

function forecast() {
  return createLivingForecastSnapshot({
    editionDate: '2026-08-18',
    chartId: CHART_ID,
    source: 'personalized',
    generatorVersion: 'today-1',
    capturedAt: NOW,
    lines: [{ id: 'contact:mars', text: 'Take one clear step.', receipt: 'Mars square Moon · 0.8°' }],
  })!;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('Living Chart sync scheduling', () => {
  it('runs a follow-up pass when a mutation arrives after the active local snapshot', async () => {
    const runner = createLivingChartDirtyPassRunner<number>();
    const firstPass = deferred<number>();
    const snapshots: string[][] = [];
    const pending = ['created-before-sync'];
    let passNumber = 0;
    const pass = async () => {
      snapshots.push([...pending]);
      passNumber += 1;
      if (passNumber === 1) return firstPass.promise;
      pending.length = 0;
      return passNumber;
    };

    const active = runner.run('account:epoch', pass);
    await Promise.resolve();
    pending.push('deleted-during-sync');
    const coalesced = runner.run('account:epoch', pass);
    expect(coalesced).toBe(active);
    firstPass.resolve(1);

    await expect(active).resolves.toBe(2);
    expect(snapshots).toEqual([
      ['created-before-sync'],
      ['created-before-sync', 'deleted-during-sync'],
    ]);
  });

  it('does not share a mutex across consent epochs', async () => {
    const runner = createLivingChartDirtyPassRunner<string>();
    const oldEpoch = deferred<string>();
    const oldRun = runner.run('account:1', () => oldEpoch.promise);
    await expect(runner.run('account:2', async () => 'new epoch')).resolves.toBe('new epoch');
    oldEpoch.resolve('old epoch');
    await expect(oldRun).resolves.toBe('old epoch');
  });

  it('sends a base-zero delete for a create deleted before its first cloud acknowledgement', async () => {
    installBrowserMetadata();
    const account = owner(1);
    const store = createLivingChartStore({
      adapter: new MemoryAdapter(),
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => new Date(NOW),
    });
    await store.create(account, {
      id: MOMENT_ID,
      primaryChartId: CHART_ID,
      occurredAt: NOW,
      timePrecision: 'exact',
      category: 'work',
      note: 'Delete before upload',
      forecast: forecast(),
      reflectionQuestionId: 'reflection:focus',
    });
    await store.softDelete(account, MOMENT_ID);
    const deletedBases: number[] = [];
    const cloud: LivingChartCloudClient = {
      readConsent: async () => ({ state: 'granted', consentEpoch: 1, policyVersion: 'test' }),
      setConsent: async () => ({ outcome: 'temporarily_disabled' }),
      put: async () => ({ outcome: 'mutation_conflict' }),
      delete: async (moment) => {
        deletedBases.push(moment.baseRevision);
        return { outcome: 'deleted', revision: 1, updatedAt: NOW };
      },
      snapshot: async () => ({ outcome: 'ready', consentEpoch: 1, moments: [] }),
    };

    await expect(syncLivingChartNow(
      account,
      cloud,
      { state: 'granted', consentEpoch: 1, policyVersion: 'test' },
      storePort(store),
    )).resolves.toMatchObject({ status: { phase: 'ready', pendingCount: 0 } });
    expect(deletedBases).toEqual([0]);
    expect(await store.get(account, MOMENT_ID)).toBeNull();
  });

  it('automatically retries a delete when the remote row updates after the snapshot', async () => {
    installBrowserMetadata();
    const account = owner(2);
    const store = createLivingChartStore({
      adapter: new MemoryAdapter(),
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => new Date(NOW),
    });
    const created = await store.create(account, {
      id: MOMENT_ID,
      primaryChartId: CHART_ID,
      occurredAt: NOW,
      timePrecision: 'exact',
      category: 'work',
      note: 'This private note must stay deleted',
      forecast: forecast(),
      reflectionQuestionId: 'reflection:focus',
    });
    expect(created).not.toBeNull();
    await store.acknowledgeSync(account, MOMENT_ID, 1, 1);
    await store.softDelete(account, MOMENT_ID);

    const deletedBases: number[] = [];
    const cloud: LivingChartCloudClient = {
      readConsent: async () => ({ state: 'granted', consentEpoch: 1, policyVersion: 'test' }),
      setConsent: async () => ({ outcome: 'temporarily_disabled' }),
      put: async () => ({ outcome: 'mutation_conflict' }),
      delete: async (moment) => {
        deletedBases.push(moment.baseRevision);
        return deletedBases.length === 1
          ? { outcome: 'conflict', revision: 2, deleted: false }
          : { outcome: 'deleted', revision: 3, updatedAt: NOW };
      },
      snapshot: async () => ({
        outcome: 'ready',
        consentEpoch: 1,
        moments: [{
          momentId: MOMENT_ID,
          consentEpoch: 1,
          revision: 1,
          payload: livingMomentCloudPayload(created!),
          createdAt: NOW,
          updatedAt: NOW,
          deletedAt: null,
        }],
      }),
    };

    await expect(syncLivingChartNow(
      account,
      cloud,
      { state: 'granted', consentEpoch: 1, policyVersion: 'test' },
      storePort(store),
    )).resolves.toMatchObject({ status: { phase: 'ready', pendingCount: 0, conflictCount: 0 } });
    expect(deletedBases).toEqual([1, 2]);
    expect(await store.get(account, MOMENT_ID)).toBeNull();
  });

  it('processes deletes before puts so a full cloud account can recover capacity', async () => {
    installBrowserMetadata();
    const account = owner(3);
    const store = createLivingChartStore({
      adapter: new MemoryAdapter(),
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => new Date(NOW),
    });
    const oldId = '73000000-0000-4000-8000-000000000002';
    const newId = '73000000-0000-4000-8000-000000000003';
    const oldMoment = await store.create(account, {
      id: oldId,
      primaryChartId: CHART_ID,
      occurredAt: '2026-08-17T10:00:00.000Z',
      timePrecision: 'exact',
      category: 'work',
      forecast: forecast(),
      reflectionQuestionId: 'reflection:old',
    });
    await store.acknowledgeSync(account, oldId, 1, 1);
    await store.softDelete(account, oldId);
    await store.create(account, {
      id: newId,
      primaryChartId: CHART_ID,
      occurredAt: '2026-08-18T11:00:00.000Z',
      timePrecision: 'exact',
      category: 'work',
      forecast: forecast(),
      reflectionQuestionId: 'reflection:new',
    });
    const operations: string[] = [];
    const cloud: LivingChartCloudClient = {
      readConsent: async () => ({ state: 'granted', consentEpoch: 1, policyVersion: 'test' }),
      setConsent: async () => ({ outcome: 'temporarily_disabled' }),
      put: async (moment) => {
        operations.push(`put:${moment.id}`);
        return operations[0]?.startsWith('delete:')
          ? { outcome: 'saved', revision: 1, updatedAt: NOW }
          : { outcome: 'moment_limit_reached' };
      },
      delete: async (moment) => {
        operations.push(`delete:${moment.id}`);
        return { outcome: 'deleted', revision: 2, updatedAt: NOW };
      },
      snapshot: async () => ({
        outcome: 'ready',
        consentEpoch: 1,
        moments: [{
          momentId: oldId,
          consentEpoch: 1,
          revision: 1,
          payload: livingMomentCloudPayload(oldMoment!),
          createdAt: NOW,
          updatedAt: NOW,
          deletedAt: null,
        }],
      }),
    };

    await expect(syncLivingChartNow(
      account,
      cloud,
      { state: 'granted', consentEpoch: 1, policyVersion: 'test' },
      storePort(store),
    )).resolves.toMatchObject({ status: { phase: 'ready', pendingCount: 0 } });
    expect(operations).toEqual([`delete:${oldId}`, `put:${newId}`]);
  });

  it('resets local cloud revisions whenever authoritative consent state or epoch changes', async () => {
    const storage = memoryStorage();
    const account = owner(4);
    const reset = vi.fn(async () => true);
    expect(await reconcileLivingChartConsent(
      account,
      { state: 'granted', consentEpoch: 1, policyVersion: 'test' },
      storage,
      reset,
    )).toBe(true);
    const pendingKey = livingChartPendingMutationsKey(account.accountId)!;
    storage.setItem(pendingKey, 'old-epoch-receipts');
    expect(await reconcileLivingChartConsent(
      account,
      { state: 'withdrawn', consentEpoch: 2, policyVersion: null },
      storage,
      reset,
    )).toBe(true);
    expect(storage.getItem(pendingKey)).toBeNull();
    expect(await reconcileLivingChartConsent(
      account,
      { state: 'granted', consentEpoch: 3, policyVersion: 'test' },
      storage,
      reset,
    )).toBe(true);
    expect(reset).toHaveBeenCalledTimes(3);
  });

  it('prevents a revoked in-flight generation from caching or acknowledging late cloud data', async () => {
    const account = owner(5);
    const snapshot = deferred<Awaited<ReturnType<LivingChartCloudClient['snapshot']>>>();
    const store: LivingChartSyncStorePort = {
      list: vi.fn(async () => []),
      cacheRemote: vi.fn(async () => 'applied' as const),
      cacheRemoteDeletion: vi.fn(async () => 'applied' as const),
      acknowledge: vi.fn(async () => null),
      markConflict: vi.fn(async () => null),
      acceptRemoteDeletion: vi.fn(async () => true),
    };
    const cloud: LivingChartCloudClient = {
      readConsent: async () => ({ state: 'granted', consentEpoch: 1, policyVersion: 'test' }),
      setConsent: async () => ({ outcome: 'temporarily_disabled' }),
      put: async () => ({ outcome: 'saved', revision: 1, updatedAt: NOW }),
      delete: async () => ({ outcome: 'deleted', revision: 1, updatedAt: NOW }),
      snapshot: () => snapshot.promise,
    };
    const active = syncLivingChartNow(
      account,
      cloud,
      { state: 'granted', consentEpoch: 1, policyVersion: 'test' },
      store,
    );
    await Promise.resolve();
    await quiesceLivingChartSync(account.accountId);
    snapshot.resolve({ outcome: 'ready', consentEpoch: 1, moments: [] });

    await expect(active).rejects.toThrow('living-chart-sync-superseded');
    expect(store.list).not.toHaveBeenCalled();
    expect(store.cacheRemote).not.toHaveBeenCalled();
    expect(store.acknowledge).not.toHaveBeenCalled();
  });
});
