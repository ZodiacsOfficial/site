import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLivingForecastSnapshot } from './forecast-snapshot';
import { MAX_ACTIVE_LIVING_MOMENTS } from './schema';
import {
  createLivingChartStore,
  IndexedDbLivingChartAdapter,
  installLivingChartAccessInvalidation,
  invalidateLivingChartAccess,
  listLivingMoments,
  lockLivingChartAccountOwners,
  LIVING_CHART_CHANGE_PULSE_KEY,
  LIVING_CHART_CLEAR_REQUEST_KEY,
  requestLivingChartClear,
  setLivingChartAuthenticatedAccountOwner,
  type LivingChartAdapterMutation,
  type LivingChartAsyncAdapter,
} from './store';
import type {
  CreateLivingMomentInput,
  LivingChartChangeDetail,
  LivingChartOwnerScope,
} from './types';

const GUEST: LivingChartOwnerScope = {
  kind: 'guest',
  vaultId: '41000000-0000-4000-8000-000000000001',
};
const ACCOUNT: LivingChartOwnerScope = {
  kind: 'account',
  accountId: '42000000-0000-4000-8000-000000000001',
};
const CHART_ID = '43000000-0000-4000-8000-000000000001';
const MOMENT_ID = '44000000-0000-4000-8000-000000000001';
const NOW = new Date('2026-08-18T10:00:00.000Z');

afterEach(() => {
  vi.unstubAllGlobals();
});

class MemoryAdapter implements LivingChartAsyncAdapter {
  readonly data = new Map<string, Map<string, unknown>>();
  afterRead: (() => void) | null = null;
  afterMutation: (() => void) | null = null;

  async readAll(ownerKey: string): Promise<unknown[]> {
    const values = [...(this.data.get(ownerKey)?.values() ?? [])];
    this.afterRead?.();
    return values;
  }

  async mutate<T>(
    ownerKey: string,
    operation: (records: unknown[]) => LivingChartAdapterMutation<T>,
  ): Promise<T> {
    const owner = this.data.get(ownerKey) ?? new Map<string, unknown>();
    this.data.set(ownerKey, owner);
    const mutation = operation([...owner.values()]);
    if (mutation.put && mutation.deleteId) throw new Error('invalid mutation');
    if (mutation.put) owner.set(mutation.put.id, structuredClone(mutation.put.value));
    else if (mutation.deleteId) owner.delete(mutation.deleteId);
    this.afterMutation?.();
    return mutation.result;
  }

  async clear(ownerKey: string): Promise<void> { this.data.delete(ownerKey); }
  async clearAll(): Promise<void> { this.data.clear(); }
}

class FailingReadAdapter extends MemoryAdapter {
  override async readAll(): Promise<unknown[]> {
    throw new Error('storage unavailable');
  }
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

function stubClearOnlyIndexedDb() {
  const close = vi.fn();
  const open = vi.fn(() => {
    const cursorRequest: Record<string, ((event: Event) => void) | null> = {};
    const transaction: Record<string, unknown> = {};
    const store = {
      index: () => ({
        openKeyCursor: () => {
          queueMicrotask(() => {
            cursorRequest.onsuccess?.(new Event('success'));
            queueMicrotask(() => {
              (transaction.oncomplete as ((event: Event) => void) | undefined)?.(new Event('complete'));
            });
          });
          return cursorRequest;
        },
      }),
      delete: vi.fn(),
    };
    Object.assign(transaction, {
      objectStore: () => store,
      error: null,
    });
    const database = {
      close,
      objectStoreNames: { contains: () => true },
      onversionchange: null,
      transaction: () => transaction,
    };
    const request: Record<string, unknown> = { result: database, error: null };
    queueMicrotask(() => {
      (request.onsuccess as ((event: Event) => void) | undefined)?.(new Event('success'));
    });
    return request;
  });
  vi.stubGlobal('indexedDB', { open });
  vi.stubGlobal('IDBKeyRange', { only: (value: string) => value });
  return { close, open };
}

function forecast(chartId = CHART_ID) {
  return createLivingForecastSnapshot({
    editionDate: '2026-08-18',
    chartId,
    source: 'personalized',
    generatorVersion: 'today-1',
    capturedAt: NOW.toISOString(),
    lines: [{
      id: 'contact:mars-moon',
      text: 'Pause long enough to hear the second answer.',
      receipt: 'Mars 14.2° Cancer · square natal Moon · 0.8° from exact',
    }],
  })!;
}

function input(overrides: Partial<CreateLivingMomentInput> = {}): CreateLivingMomentInput {
  return {
    id: MOMENT_ID,
    primaryChartId: CHART_ID,
    occurredAt: NOW.toISOString(),
    timePrecision: 'exact',
    category: 'relationships',
    note: 'We finally made a decision.',
    forecast: forecast(),
    reflectionQuestionId: 'reflection:what-shifted',
    ...overrides,
  };
}

describe('LivingChartStore', () => {
  it('creates, lists, updates, and owner-isolates moments', async () => {
    const adapter = new MemoryAdapter();
    const changes: LivingChartChangeDetail[] = [];
    const store = createLivingChartStore({
      adapter,
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => NOW,
      randomUUID: () => MOMENT_ID,
      dispatch: (detail) => changes.push(detail),
    });

    const created = await store.create(GUEST, input({ note: '  We finally made a decision.  ' }));
    expect(created?.note).toBe('We finally made a decision.');
    expect(await store.list(ACCOUNT)).toEqual([]);
    expect((await store.list(GUEST))[0]?.forecast.lines[0]?.receipt).toContain('0.8°');

    const updated = await store.update(GUEST, MOMENT_ID, { note: 'A better decision.' });
    expect(updated).toMatchObject({ note: 'A better decision.', revision: 2, syncState: 'local' });
    expect(changes.map((change) => change.operation)).toEqual(['create', 'update']);
  });

  it('rejects a well-formed vault that is not the currently authorized owner', async () => {
    const adapter = new MemoryAdapter();
    const seed = createLivingChartStore({
      adapter,
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => NOW,
    });
    expect(await seed.create(ACCOUNT, input())).not.toBeNull();
    const store = createLivingChartStore({
      adapter,
      accessAllowed: () => true,
      ownerAllowed: (owner) => owner.kind === 'guest' && owner.vaultId === GUEST.vaultId,
      now: () => NOW,
    });

    expect(await store.list(ACCOUNT)).toEqual([]);
    expect(await store.export(ACCOUNT, 'json')).toBeNull();
    expect(await store.softDelete(ACCOUNT, MOMENT_ID)).toBe(false);
    expect(await seed.get(ACCOUNT, MOMENT_ID)).not.toBeNull();
  });

  it('physically erases a device-only guest record', async () => {
    const adapter = new MemoryAdapter();
    const store = createLivingChartStore({
      adapter,
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => NOW,
    });
    await store.create(GUEST, input());

    expect(await store.softDelete(GUEST, MOMENT_ID)).toBe(true);
    expect(await store.list(GUEST)).toEqual([]);
    expect(await store.list(GUEST, { includeDeleted: true })).toEqual([]);
    expect([...adapter.data.values()].flatMap((records) => [...records.values()])).toEqual([]);
    expect(await store.softDelete(GUEST, MOMENT_ID)).toBe(false);
  });

  it('redacts an account delete before persisting its technical outbox marker', async () => {
    const adapter = new MemoryAdapter();
    let clock = new Date('2026-08-17T08:00:00.000Z');
    const store = createLivingChartStore({
      adapter,
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => clock,
    });
    const privateInput = input({
      note: 'PRIVATE NOTE 7391',
      occurredAt: '2026-08-16T07:00:00.000Z',
      reflectionQuestionId: 'reflection:private-7391',
    });
    await store.create(ACCOUNT, privateInput);
    clock = new Date('2026-08-18T10:00:00.000Z');

    expect(await store.softDelete(ACCOUNT, MOMENT_ID)).toBe(true);
    expect(await store.get(ACCOUNT, MOMENT_ID)).toMatchObject({
      id: MOMENT_ID,
      baseRevision: 0,
      syncState: 'deleted',
      deletedAt: clock.toISOString(),
    });
    const raw = JSON.stringify([...adapter.data.values()].flatMap((records) => [...records.values()]));
    expect(raw).not.toContain('PRIVATE NOTE 7391');
    expect(raw).not.toContain(CHART_ID);
    expect(raw).not.toContain('2026-08-16T07:00:00.000Z');
    expect(raw).not.toContain('reflection:private-7391');
    expect(raw).not.toContain('Pause long enough');
    expect(raw).not.toContain('Mars 14.2');

    expect(await store.acknowledgeSync(ACCOUNT, MOMENT_ID, 2, 1)).not.toBeNull();
    expect(await store.get(ACCOUNT, MOMENT_ID)).toBeNull();
  });

  it('retains both copies on conflict and requires an explicit resolution', async () => {
    const adapter = new MemoryAdapter();
    const store = createLivingChartStore({
      adapter,
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => NOW,
    });
    const local = await store.create(ACCOUNT, input({ note: 'Note from this device' }));
    expect(local).not.toBeNull();
    const remote = {
      ...local!,
      note: 'Note from the other device',
      revision: 2,
      baseRevision: 2,
      syncState: 'synced' as const,
      updatedAt: '2026-08-18T10:01:00.000Z',
    };

    expect(await store.cacheRemote(ACCOUNT, remote, 2)).toBe('conflict');
    const conflicted = await store.get(ACCOUNT, MOMENT_ID);
    expect(conflicted).toMatchObject({
      note: 'Note from this device',
      syncState: 'conflict',
      conflictCopy: { note: 'Note from the other device', serverRevision: 2 },
    });

    expect(await store.retryConflict(ACCOUNT, MOMENT_ID, 'cloud')).toMatchObject({
      note: 'Note from the other device',
      syncState: 'synced',
      baseRevision: 2,
    });
  });

  it('does not let a late sync acknowledgement erase a newer local edit', async () => {
    const adapter = new MemoryAdapter();
    const store = createLivingChartStore({
      adapter,
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => NOW,
    });
    await store.create(ACCOUNT, input({ note: 'First note' }));
    await store.update(ACCOUNT, MOMENT_ID, { note: 'Newer note' });

    expect(await store.acknowledgeSync(ACCOUNT, MOMENT_ID, 1, 1)).toMatchObject({
      note: 'Newer note',
      revision: 2,
      baseRevision: 1,
      syncState: 'queued',
    });
  });

  it('lets deletion and consent withdrawal safely clear conflict metadata', async () => {
    const adapter = new MemoryAdapter();
    const store = createLivingChartStore({
      adapter,
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => NOW,
    });
    const local = await store.create(ACCOUNT, input({ note: 'Local copy' }));
    const remote = {
      ...local!,
      note: 'Remote copy',
      revision: 2,
      baseRevision: 2,
      syncState: 'synced' as const,
      updatedAt: '2026-08-18T10:01:00.000Z',
    };
    await store.cacheRemote(ACCOUNT, remote, 2);
    expect(await store.softDelete(ACCOUNT, MOMENT_ID)).toBe(true);
    expect(await store.get(ACCOUNT, MOMENT_ID)).toMatchObject({ syncState: 'deleted' });
    expect((await store.get(ACCOUNT, MOMENT_ID))?.conflictCopy).toBeUndefined();

    const secondId = '44000000-0000-4000-8000-000000000002';
    const second = await store.create(ACCOUNT, input({ id: secondId, note: 'Second local' }));
    await store.cacheRemote(ACCOUNT, { ...remote, id: secondId, note: 'Second remote' }, 2);
    expect(await store.resetSyncState(ACCOUNT)).toBe(true);
    expect(await store.get(ACCOUNT, secondId)).toMatchObject({ syncState: 'local', baseRevision: 0 });
    expect((await store.get(ACCOUNT, secondId))?.conflictCopy).toBeUndefined();

    expect(second).not.toBeNull();
  });

  it('applies a remote deletion over an unsynced device edit', async () => {
    const adapter = new MemoryAdapter();
    const store = createLivingChartStore({
      adapter,
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => NOW,
    });
    await store.create(ACCOUNT, input({ note: 'Unsynced edit' }));
    expect(await store.cacheRemoteDeletion(
      ACCOUNT,
      MOMENT_ID,
      3,
      '2026-08-18T10:02:00.000Z',
    )).toBe('applied');
    expect(await store.list(ACCOUNT)).toEqual([]);
    expect(await store.get(ACCOUNT, MOMENT_ID)).toBeNull();
    expect([...adapter.data.values()].flatMap((records) => [...records.values()])).toEqual([]);
  });

  it('lets an equal terminal-revision tombstone erase the last local payload', async () => {
    const adapter = new MemoryAdapter();
    const store = createLivingChartStore({
      adapter,
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => NOW,
    });
    const terminalRevision = 9_007_199_254_740_990;
    await store.create(ACCOUNT, input({ note: 'Erase even at the revision ceiling' }));
    await store.acknowledgeSync(ACCOUNT, MOMENT_ID, 1, terminalRevision);

    expect(await store.cacheRemoteDeletion(
      ACCOUNT,
      MOMENT_ID,
      terminalRevision,
      '2026-08-18T10:02:00.000Z',
    )).toBe('applied');
    expect(await store.get(ACCOUNT, MOMENT_ID)).toBeNull();
    expect(JSON.stringify([...adapter.data.values()])).not.toContain('Erase even at the revision ceiling');
  });

  it('caps active records at 250 without blocking tombstones', async () => {
    const adapter = new MemoryAdapter();
    let id = 0;
    const store = createLivingChartStore({
      adapter,
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => NOW,
      randomUUID: () => `45000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
    });
    for (let index = 0; index < MAX_ACTIVE_LIVING_MOMENTS; index += 1) {
      expect(await store.create(GUEST, { ...input(), id: undefined })).not.toBeNull();
    }
    expect(await store.create(GUEST, { ...input(), id: undefined })).toBeNull();
    const first = (await store.list(GUEST))[0]!;
    expect(await store.softDelete(GUEST, first.id)).toBe(true);
    expect(await store.create(GUEST, { ...input(), id: undefined })).not.toBeNull();
  });

  it('fails closed before access and after async access revocation', async () => {
    const adapter = new MemoryAdapter();
    let allowed = false;
    const store = createLivingChartStore({
      adapter,
      accessAllowed: () => allowed,
      ownerAllowed: () => true,
      now: () => NOW,
    });
    expect(await store.create(GUEST, input())).toBeNull();
    expect(adapter.data.size).toBe(0);

    allowed = true;
    expect(await store.create(GUEST, input())).not.toBeNull();
    adapter.afterRead = () => { allowed = false; };
    expect(await store.list(GUEST)).toEqual([]);

    allowed = true;
    adapter.afterMutation = () => { allowed = false; };
    expect(await store.update(GUEST, MOMENT_ID, { note: 'Hidden result' })).toBeNull();
  });

  it('fails closed on malformed or cross-owner adapter rows', async () => {
    const adapter = new MemoryAdapter();
    adapter.data.set(`guest:${GUEST.vaultId}`, new Map([['bad', { note: 'private' }]]));
    const store = createLivingChartStore({
      adapter,
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => NOW,
    });
    expect(await store.list(GUEST)).toEqual([]);
    expect(await store.create(GUEST, input())).toBeNull();
  });

  it('exports readable Markdown and portable JSON without internal owner or sync identifiers', async () => {
    const adapter = new MemoryAdapter();
    const store = createLivingChartStore({
      adapter,
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => NOW,
    });
    await store.create(GUEST, input());

    const markdown = await store.export(GUEST, 'markdown');
    expect(markdown).toContain('# Living Chart');
    expect(markdown).toContain('> We finally made a decision.');
    expect(markdown).toContain('Receipt: Mars 14.2° Cancer');

    const json = JSON.parse((await store.export(GUEST, 'json'))!);
    expect(json).toMatchObject({
      schema: 'zodiacs.living-chart.export.v1',
      ownerKind: 'guest',
      moments: [{ id: MOMENT_ID, revision: 1 }],
    });
    expect(json.moments[0]).not.toHaveProperty('owner');
    expect(json.moments[0]).not.toHaveProperty('syncState');
    expect(json.moments[0]).not.toHaveProperty('baseRevision');
  });

  it('does not misreport a failed or malformed storage read as an empty export', async () => {
    const failed = createLivingChartStore({
      adapter: new FailingReadAdapter(),
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => NOW,
    });
    expect(await failed.list(GUEST)).toEqual([]);
    expect(await failed.export(GUEST, 'json')).toBeNull();

    const malformedAdapter = new MemoryAdapter();
    malformedAdapter.data.set(`guest:${GUEST.vaultId}`, new Map([['bad', { note: 'private' }]]));
    const malformed = createLivingChartStore({
      adapter: malformedAdapter,
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => NOW,
    });
    expect(await malformed.export(GUEST, 'markdown')).toBeNull();
  });

  it('uses a content-free pulse to invalidate another tab after a local change', async () => {
    const storage = memoryStorage();
    const listeners = new Map<string, (event: Event) => void>();
    const dispatchEvent = vi.fn();
    vi.stubGlobal('crypto', { randomUUID: () => '48000000-0000-4000-8000-000000000001' });
    vi.stubGlobal('window', {
      localStorage: storage,
      addEventListener: (type: string, listener: (event: Event) => void) => listeners.set(type, listener),
      removeEventListener: (type: string) => listeners.delete(type),
      dispatchEvent,
    });
    const store = createLivingChartStore({
      adapter: new MemoryAdapter(),
      accessAllowed: () => true,
      ownerAllowed: () => true,
      now: () => NOW,
    });

    expect(await store.create(GUEST, input())).not.toBeNull();
    expect(JSON.parse(storage.getItem(LIVING_CHART_CHANGE_PULSE_KEY)!)).toEqual({
      version: 1,
      eventId: '48000000-0000-4000-8000-000000000001',
    });
    const uninstall = installLivingChartAccessInvalidation();
    listeners.get('storage')?.({
      key: LIVING_CHART_CHANGE_PULSE_KEY,
      newValue: storage.getItem(LIVING_CHART_CHANGE_PULSE_KEY),
    } as StorageEvent);
    expect(dispatchEvent.mock.calls.some(([event]) => (
      (event as CustomEvent).detail?.operation === 'invalidate'
    ))).toBe(true);
    uninstall();
  });

  it('limits boundary authorization to a content-free clear request', () => {
    const storage = memoryStorage();
    const randomUUID = vi.fn()
      .mockReturnValueOnce('46000000-0000-4000-8000-000000000001')
      .mockReturnValueOnce('46000000-0000-4000-8000-000000000002');
    vi.stubGlobal('crypto', { randomUUID });
    vi.stubGlobal('document', { documentElement: { hasAttribute: () => true } });
    vi.stubGlobal('window', {
      localStorage: storage,
      zodiacsProfileAccess: { canRead: () => false },
      dispatchEvent: vi.fn(),
    });

    expect(requestLivingChartClear(GUEST)).toBe(false);
    expect(storage.getItem(LIVING_CHART_CLEAR_REQUEST_KEY)).toBeNull();

    expect(requestLivingChartClear(GUEST, { boundaryAuthorized: true })).toBe(true);
    expect(JSON.parse(storage.getItem(LIVING_CHART_CLEAR_REQUEST_KEY)!)).toEqual({
      version: 2,
      requestId: '46000000-0000-4000-8000-000000000001',
      targets: [`guest:${GUEST.vaultId}`],
    });

    expect(requestLivingChartClear(ACCOUNT, { boundaryAuthorized: true })).toBe(true);
    expect(JSON.parse(storage.getItem(LIVING_CHART_CLEAR_REQUEST_KEY)!)).toEqual({
      version: 2,
      requestId: '46000000-0000-4000-8000-000000000002',
      targets: [`guest:${GUEST.vaultId}`, `account:${ACCOUNT.accountId}`],
    });
  });

  it('does not abort an in-flight guest read when the initial auth check settles signed out', async () => {
    const storage = memoryStorage();
    storage.setItem('zodiacs.living-chart.guest-vault.v1', JSON.stringify({
      version: 1,
      vaultId: GUEST.vaultId,
    }));
    vi.stubGlobal('window', {
      localStorage: storage,
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal('document', { documentElement: { hasAttribute: () => false } });

    const close = vi.fn();
    const getAllRequest: Record<string, unknown> = { result: [], error: null };
    const transaction = {
      objectStore: () => ({ index: () => ({ getAll: () => getAllRequest }) }),
      onabort: null,
    };
    const database = {
      close,
      onversionchange: null,
      transaction: () => transaction,
    };
    const openRequest: Record<string, unknown> = { result: database, error: null };
    vi.stubGlobal('indexedDB', { open: () => openRequest });

    lockLivingChartAccountOwners();
    const pending = listLivingMoments(GUEST);
    expect(setLivingChartAuthenticatedAccountOwner(null)).toBe(true);
    (openRequest.onsuccess as ((event: Event) => void))(new Event('success'));
    await vi.waitFor(() => expect(getAllRequest.onsuccess).toBeTypeOf('function'));
    (getAllRequest.onsuccess as ((event: Event) => void))(new Event('success'));

    await expect(pending).resolves.toEqual([]);
    expect(close).not.toHaveBeenCalled();

    // Crossing into or out of verified account authority still revokes the
    // open handle; only the same guest scope survives the initial check.
    expect(setLivingChartAuthenticatedAccountOwner(ACCOUNT.accountId)).toBe(true);
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(setLivingChartAuthenticatedAccountOwner(null)).toBe(true);
  });

  it('drains an existing clear marker on the next mount even while read access is revoked', async () => {
    const storage = memoryStorage();
    storage.setItem(LIVING_CHART_CLEAR_REQUEST_KEY, JSON.stringify({
      version: 1,
      requestId: '47000000-0000-4000-8000-000000000001',
      target: `guest:${GUEST.vaultId}`,
    }));
    vi.stubGlobal('document', { documentElement: { hasAttribute: () => true } });
    vi.stubGlobal('window', {
      localStorage: storage,
      zodiacsProfileAccess: { canRead: () => false },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    const indexedDb = stubClearOnlyIndexedDb();

    const uninstall = installLivingChartAccessInvalidation();
    await vi.waitFor(() => expect(storage.getItem(LIVING_CHART_CLEAR_REQUEST_KEY)).toBeNull());
    expect(storage.getItem(LIVING_CHART_CHANGE_PULSE_KEY)).toBeNull();
    expect(indexedDb.open).toHaveBeenCalledWith('zodiacs-living-chart-v1', 1);
    uninstall();
    invalidateLivingChartAccess();
  });

  it('closes a late IndexedDB open instead of retaining it after invalidation', async () => {
    const close = vi.fn();
    const database = { close, onversionchange: null };
    const request: Record<string, unknown> = { result: database, error: null };
    vi.stubGlobal('indexedDB', { open: () => request });
    const adapter = new IndexedDbLivingChartAdapter();

    const pending = adapter.readAll(`guest:${GUEST.vaultId}`);
    adapter.close();
    (request.onsuccess as ((event: Event) => void))(new Event('success'));

    await expect(pending).rejects.toThrow('living-chart-storage-unavailable');
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('keeps a verified account authoritative when a second hook requests the initial lock', async () => {
    const verified = {
      kind: 'account',
      accountId: '42000000-0000-4000-8000-000000000002',
    } as const;
    expect(setLivingChartAuthenticatedAccountOwner(verified.accountId)).toBe(true);
    lockLivingChartAccountOwners();
    const store = createLivingChartStore({
      adapter: new MemoryAdapter(),
      accessAllowed: () => true,
      now: () => NOW,
    });

    expect(await store.create(verified, input())).not.toBeNull();
    expect(await store.create(ACCOUNT, input({ id: '44000000-0000-4000-8000-000000000002' }))).toBeNull();
    setLivingChartAuthenticatedAccountOwner(null);
  });
});
