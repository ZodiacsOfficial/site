import { build } from 'esbuild';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { computePortableChart } from '../engine/portable';
import { parseNatalEnvelope } from '@zodiacs/engine/receipt';
import { createSavedNatalRecord, type SavedNatalRecord } from './saved-record';
import {
  IndexedDbSavedNatalAdapter, SavedNatalStore, SAVED_NATAL_DATABASE_NAME,
  type SavedNatalAdapter, type SavedNatalAuthority, type SavedNatalResult,
} from './saved-record-store';

const A = 'account:10000000-0000-4000-8000-000000000001';
const B = 'account:20000000-0000-4000-8000-000000000002';
const ID = '30000000-0000-4000-8000-000000000003';
const WHEN = '2026-09-08T00:00:00.000Z';
const base = { utc: '2001-12-21T08:30:00-00:00', latitude: 78.2232, longitude: 15.6267,
  houseSystem: 'placidus' as const, timeKnown: true };
const polar = computePortableChart(base, { sourceInstant: base.utc });
const whole = computePortableChart({ ...base, houseSystem: 'whole' });
const unknown = computePortableChart({ ...base, timeKnown: false }, { sourceInstant: base.utc });
function value<T>(result: SavedNatalResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Expected synthetic test operation success');
  return result.value;
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

/** Deterministic adapter contract model; native IDB schedules are verified separately. */
class Backend {
  rows = new Map<string, Map<string, unknown>>();
  tail: Promise<unknown> = Promise.resolve();
  owner(key: string) { if (!this.rows.has(key)) this.rows.set(key, new Map()); return this.rows.get(key)!; }
  async serial<T>(action: () => Promise<T>): Promise<T> {
    const result = this.tail.then(action, action);
    this.tail = result.catch(() => {});
    return result;
  }
}
class MemoryAdapter implements SavedNatalAdapter {
  generation = 0;
  aborts = 0;
  calls = 0;
  fault: unknown;
  beforeRead?: () => Promise<void> | void;
  beforeCommit?: () => Promise<void> | void;
  afterCommit?: () => Promise<void> | void;
  constructor(readonly backend = new Backend()) {}
  async read(owner: string, id: string | null, guard: () => void): Promise<unknown[]> {
    this.calls++;
    const generation = this.generation;
    guard();
    await this.beforeRead?.();
    if (this.fault) throw this.fault;
    if (generation !== this.generation) throw new DOMException('synthetic', 'AbortError');
    guard();
    const rows = this.backend.owner(owner);
    return structuredClone(id === null ? [...rows.values()].slice(0, 41) : rows.has(id) ? [rows.get(id)] : []);
  }
  async mutate<T>(owner: string, guard: () => void,
    operation: (rows: unknown[]) => { result: T; add?: SavedNatalRecord; deleteId?: string }): Promise<T> {
    return this.mutation(owner, guard, operation);
  }
  private async mutation<T>(owner: string, guard: () => void,
    operation: (rows: unknown[]) => { result: T; add?: SavedNatalRecord; deleteId?: string }): Promise<T> {
    this.calls++;
    const generation = this.generation;
    return this.backend.serial(async () => {
      guard();
      if (generation !== this.generation) throw new DOMException('synthetic', 'AbortError');
      if (this.fault) throw this.fault;
      const rows = this.backend.owner(owner);
      const mutation = operation(structuredClone([...rows.values()].slice(0, 41)));
      await this.beforeCommit?.();
      if (generation !== this.generation) throw new DOMException('synthetic', 'AbortError');
      guard();
      if (mutation.add) rows.set(mutation.add.id, structuredClone(mutation.add));
      if (mutation.deleteId) rows.delete(mutation.deleteId);
      // Deliberately return an already committed result after this hook so the
      // STORE's own post-await authority check is independently exercised.
      await this.afterCommit?.();
      return mutation.result;
    });
  }
  async clear(owner: string, guard: () => void): Promise<void> {
    this.calls++;
    const generation = this.generation;
    return this.backend.serial(async () => {
      guard();
      await this.beforeCommit?.();
      if (this.fault) throw this.fault;
      if (generation !== this.generation) throw new DOMException('synthetic', 'AbortError');
      guard();
      this.backend.rows.delete(owner);
      await this.afterCommit?.();
    });
  }
  abortPending() { this.generation++; this.aborts++; }
}

function fixture(owner = A, backend = new Backend()) {
  let authority: SavedNatalAuthority | null = { ownerKey: owner, epoch: 1 };
  let serial = 0;
  const adapter = new MemoryAdapter(backend);
  const store = new SavedNatalStore({ ownerKey: owner, epoch: 1, readAuthority: () => authority,
    adapter, now: () => new Date(WHEN), randomUUID: () => `${String(++serial).padStart(8, '0')}-0000-4000-8000-000000000000` });
  return { store, adapter, backend, setAuthority: (next: SavedNatalAuthority | null) => { authority = next; } };
}

afterEach(() => vi.unstubAllGlobals());

describe('owner-bound immutable saved natal operations', () => {
  it('creates/reads/exports an unlabeled record without local metadata in the envelope', async () => {
    const { store } = fixture();
    const record = value(await store.create(polar.envelope));
    expect(Object.isFrozen(record)).toBe(true);
    expect(value(await store.get(record.id))).toEqual(record);
    const json = value(await store.exportEnvelope(record.id));
    expect(json).toBe(record.envelopeJson);
    expect(parseNatalEnvelope(json!)).toEqual({ ok: true, envelope: polar.envelope });
    expect(json).not.toContain(record.id);
    expect(json).not.toContain(record.ownerKey);
    expect(Object.isFrozen(value(await store.list()))).toBe(true);
  });

  it('keeps polar/explicit Whole and repeated equivalent requests as distinct IDs', async () => {
    const { store } = fixture();
    const records = await Promise.all([polar, whole, polar].map((calculation) => store.create(calculation.envelope)));
    expect(new Set(records.map((record) => value(record).id)).size).toBe(3);
    const parsed = value(await store.list()).map((record) => JSON.parse(record.envelopeJson).receipt.houses);
    expect(parsed.map((houses) => houses.requested)).toEqual(['placidus', 'whole', 'placidus']);
    expect(parsed.every((houses) => houses.actual === 'whole')).toBe(true);
  });

  it('preserves unknown 08:30 and exact source spelling through persistence', async () => {
    const { store } = fixture();
    const record = value(await store.create(unknown.envelope, 'local label'));
    const parsed = parseNatalEnvelope(value(await store.exportEnvelope(record.id))!);
    expect(parsed.ok && parsed.envelope.receipt).toMatchObject({ instant: '2001-12-21T08:30:00.000Z',
      sourceInstant: base.utc, timeKnown: false, houses: { requested: 'placidus', actual: null } });
  });

  it('captures the mutable caller envelope before waiting for storage', async () => {
    const { store, adapter } = fixture();
    const ready = deferred(), release = deferred();
    adapter.beforeCommit = async () => { ready.resolve(); await release.promise; };
    const source = JSON.parse(JSON.stringify(polar.envelope));
    const pending = store.create(source);
    await ready.promise;
    source.receipt.instant = '1900-01-01T00:00:00.000Z';
    source.result.bodies[0].lon = 0;
    release.resolve();
    expect(JSON.parse(value(await pending).envelopeJson)).toEqual(polar.envelope);
  });

  it('serializes concurrent creates and enforces cap40 with insertion atomically', async () => {
    const { store, backend } = fixture();
    const results = await Promise.all(Array.from({ length: 42 }, () => store.create(polar.envelope)));
    expect(results.filter((result) => result.ok)).toHaveLength(40);
    expect(results.filter((result) => !result.ok)).toEqual([
      { ok: false, code: 'full', mayHaveCommitted: false }, { ok: false, code: 'full', mayHaveCommitted: false },
    ]);
    expect(backend.owner(A).size).toBe(40);
    expect(value(await store.list())).toHaveLength(40);
  });

  it('reports a UUID collision without overwriting the existing immutable record', async () => {
    const adapter = new MemoryAdapter();
    const store = new SavedNatalStore({ ownerKey: A, epoch: 1, readAuthority: () => ({ ownerKey: A, epoch: 1 }),
      adapter, randomUUID: () => ID, now: () => new Date(WHEN) });
    const first = value(await store.create(polar.envelope));
    expect(await store.create(whole.envelope)).toEqual({ ok: false, code: 'id-conflict', mayHaveCommitted: false });
    expect(value(await store.get(ID))).toEqual(first);
  });

  it('partitions the same ID by explicit owner and deletes idempotently', async () => {
    const backend = new Backend();
    const a = fixture(A, backend), b = fixture(B, backend);
    const one = value(await a.store.create(polar.envelope));
    const two = value(await b.store.create(whole.envelope));
    expect(one.id).toBe(two.id);
    expect(value(await a.store.get(one.id))?.envelopeJson).toBe(one.envelopeJson);
    expect(value(await b.store.get(two.id))?.envelopeJson).toBe(two.envelopeJson);
    expect(await a.store.delete(one.id)).toEqual({ ok: true, value: undefined });
    expect(await a.store.delete(one.id)).toEqual({ ok: true, value: undefined });
    expect(await a.store.get(one.id)).toEqual({ ok: true, value: null });
    expect(value(await b.store.get(two.id))).toEqual(two);
  });

  it.each([null, { ownerKey: B, epoch: 1 }, { ownerKey: A, epoch: 2 }])('rejects mismatched authority before adapter access (%#)', async (authority) => {
    const { store, adapter, setAuthority } = fixture();
    setAuthority(authority);
    for (const operation of [() => store.create(polar.envelope), () => store.get(ID), () => store.list(),
      () => store.delete(ID), () => store.clearOwner()]) {
      expect(await operation()).toEqual({ ok: false, code: 'access-denied', mayHaveCommitted: false });
    }
    expect(adapter.calls).toBe(0);
  });

  it('invalidates A-to-B-to-A pending reads using the explicit authority epoch', async () => {
    const { store, adapter, setAuthority } = fixture();
    const ready = deferred(), release = deferred();
    adapter.beforeRead = async () => { ready.resolve(); await release.promise; };
    const pending = store.list(); await ready.promise;
    setAuthority({ ownerKey: B, epoch: 2 }); setAuthority({ ownerKey: A, epoch: 3 });
    release.resolve();
    expect(await pending).toEqual({ ok: false, code: 'stale', mayHaveCommitted: false });
  });

  it('aborts pending writes on revoke and does not reactivate the handle', async () => {
    const { store, adapter, backend } = fixture();
    const ready = deferred(), release = deferred();
    adapter.beforeCommit = async () => { ready.resolve(); await release.promise; };
    const pending = store.create(polar.envelope); await ready.promise;
    store.revoke(); release.resolve();
    expect(await pending).toEqual({ ok: false, code: 'stale', mayHaveCommitted: false });
    expect(backend.owner(A).size).toBe(0);
    expect(adapter.aborts).toBe(1);
    expect(await store.list()).toEqual({ ok: false, code: 'access-denied', mayHaveCommitted: false });
  });

  it('does not return success/data after an already committed write loses authority', async () => {
    const { store, adapter, backend, setAuthority } = fixture();
    adapter.afterCommit = () => { setAuthority(null); };
    expect(await store.create(polar.envelope)).toEqual({ ok: false, code: 'stale', mayHaveCommitted: true });
    expect(backend.owner(A).size).toBe(1);
    expect(adapter.calls).toBe(1); // No automatic retry.
  });

  it.each(['QuotaExceededError', 'AbortError', 'VersionError', 'UnknownError'])('returns fixed %s storage failure without a partial write', async (name) => {
    const { store, adapter, backend } = fixture();
    adapter.fault = new DOMException('private birth diagnostic', name);
    const result = await store.create(polar.envelope);
    expect(result).toEqual({ ok: false, code: name === 'QuotaExceededError' ? 'quota-exceeded'
      : name === 'AbortError' ? 'aborted' : name === 'VersionError' ? 'unsupported-storage' : 'storage-unavailable',
    mayHaveCommitted: false });
    expect(JSON.stringify(result)).not.toContain('private');
    expect(backend.owner(A).size).toBe(0);
  });

  it('does not inspect arbitrary private adapter exceptions', async () => {
    const { store, adapter } = fixture(); let reads = 0;
    adapter.fault = new Proxy({}, { get() { reads++; throw new Error('private'); } });
    expect(await store.list()).toEqual({ ok: false, code: 'storage-unavailable', mayHaveCommitted: false });
    expect(reads).toBe(0);
  });

  it('distinguishes absent rows from unavailable and corrupt storage', async () => {
    const { store, adapter, backend } = fixture();
    expect(await store.get(ID)).toEqual({ ok: true, value: null });
    adapter.fault = new Error('private');
    expect(await store.get(ID)).toEqual({ ok: false, code: 'storage-unavailable', mayHaveCommitted: false });
    adapter.fault = undefined;
    backend.owner(A).set(ID, { schema: 'damaged' });
    expect(await store.get(ID)).toEqual({ ok: false, code: 'corrupt-record', mayHaveCommitted: false });
    expect(await store.list()).toEqual({ ok: false, code: 'corrupt-record', mayHaveCommitted: false });
    expect(await store.create(polar.envelope)).toEqual({ ok: false, code: 'corrupt-record', mayHaveCommitted: false });
    expect(backend.owner(A).get(ID)).toEqual({ schema: 'damaged' });
  });

  it('preserves unknown records on read/create but permits explicit exact-key deletion', async () => {
    const { store, backend } = fixture();
    const future = { schema: 'zodiacs.saved-natal.v10', ownerKey: A, id: ID, future: 'opaque' };
    backend.owner(A).set(ID, future);
    expect(await store.list()).toEqual({ ok: false, code: 'unsupported-record', mayHaveCommitted: false });
    expect(await store.create(polar.envelope)).toEqual({ ok: false, code: 'unsupported-record', mayHaveCommitted: false });
    expect(backend.owner(A).get(ID)).toBe(future);
    expect(await store.delete(ID)).toEqual({ ok: true, value: undefined });
    expect(await store.get(ID)).toEqual({ ok: true, value: null });
  });

  it('rejects wrong-owner and row/key identity mismatches', async () => {
    const { store, backend } = fixture();
    backend.owner(A).set(ID, createSavedNatalRecord(B, ID, WHEN, polar.envelope));
    expect(await store.get(ID)).toEqual({ ok: false, code: 'corrupt-record', mayHaveCommitted: false });
    backend.owner(A).set(ID, createSavedNatalRecord(A, '40000000-0000-4000-8000-000000000004', WHEN, polar.envelope));
    expect(await store.get(ID)).toEqual({ ok: false, code: 'corrupt-record', mayHaveCommitted: false });
  });

  it('consumes a clear handle and aborts its previously started creates', async () => {
    const { store, adapter, backend } = fixture();
    const ready = deferred(), release = deferred();
    adapter.beforeCommit = async () => { ready.resolve(); await release.promise; };
    const pending = store.create(polar.envelope); await ready.promise;
    const clear = store.clearOwner(); release.resolve();
    expect(await pending).toEqual({ ok: false, code: 'stale', mayHaveCommitted: false });
    expect(await clear).toEqual({ ok: true, value: undefined });
    expect(backend.owner(A).size).toBe(0);
    expect(adapter.aborts).toBe(2); // Abort old work; close clear's final connection.
    expect(await store.create(polar.envelope)).toEqual({ ok: false, code: 'access-denied', mayHaveCommitted: false });
  });

  it('explicit clear removes corrupt/future owned content, preserves other owners, and allows a separate handle to create later', async () => {
    const backend = new Backend(); const a = fixture(A, backend), b = fixture(B, backend);
    backend.owner(A).set(ID, { schema: 'zodiacs.saved-natal.v100', future: true });
    const other = value(await b.store.create(whole.envelope));
    expect(await a.store.clearOwner()).toEqual({ ok: true, value: undefined });
    expect(backend.owner(A).size).toBe(0);
    expect(value(await b.store.get(other.id))).toEqual(other);
    const separateHandle = fixture(A, backend);
    expect((await separateHandle.store.create(polar.envelope)).ok).toBe(true);
    // This primitive is not durable/cross-handle account erasure.
    expect(backend.owner(A).size).toBe(1);
  });

  it('a failed clear preserves content and requires an explicit new handle for retry', async () => {
    const f = fixture(); value(await f.store.create(polar.envelope));
    f.adapter.fault = new Error('private failure');
    expect(await f.store.clearOwner()).toEqual({ ok: false, code: 'storage-unavailable', mayHaveCommitted: false });
    expect(f.backend.owner(A).size).toBe(1);
    expect(await f.store.clearOwner()).toEqual({ ok: false, code: 'access-denied', mayHaveCommitted: false });
    expect(await fixture(A, f.backend).store.clearOwner()).toEqual({ ok: true, value: undefined });
    expect(f.backend.owner(A).size).toBe(0);
  });

  it('reports that stale post-commit clear may already have erased the owner', async () => {
    const f = fixture(); value(await f.store.create(polar.envelope));
    f.adapter.afterCommit = () => f.setAuthority(null);
    expect(await f.store.clearOwner()).toEqual({ ok: false, code: 'stale', mayHaveCommitted: true });
    expect(f.backend.owner(A).size).toBe(0);
  });

  it('keeps constructor, authority callback and clock failures fixed and private', async () => {
    const options = Object.defineProperty({}, 'ownerKey', { get() { throw new Error('private constructor'); } });
    expect(() => new SavedNatalStore(options as never)).toThrow('Unable to configure saved natal records.');
    const denied = new SavedNatalStore({ ownerKey: A, epoch: 1,
      readAuthority: () => { throw new Error('private authority'); } });
    expect(await denied.list()).toEqual({ ok: false, code: 'access-denied', mayHaveCommitted: false });
    const adapter = new MemoryAdapter();
    const invalidClock = new SavedNatalStore({ ownerKey: A, epoch: 1,
      readAuthority: () => ({ ownerKey: A, epoch: 1 }), adapter, randomUUID: () => ID,
      now: () => new Date(NaN) });
    expect(await invalidClock.create(polar.envelope)).toEqual({ ok: false, code: 'invalid-input', mayHaveCommitted: false });
    expect(adapter.calls).toBe(0);
  });

  it('catches revocation reentrancy inside the authority callback before storage', async () => {
    const adapter = new MemoryAdapter();
    const store = new SavedNatalStore({ ownerKey: A, epoch: 1, adapter, readAuthority: () => {
      store.revoke(); return { ownerKey: A, epoch: 1 };
    } });
    expect(await store.list()).toEqual({ ok: false, code: 'access-denied', mayHaveCommitted: false });
    expect(adapter.calls).toBe(0);
  });

  it('invalid UUID/label/envelope/time inputs fail before adapter writes', async () => {
    for (const randomUUID of [() => '', () => ID + '\n', () => { throw new Error('private'); }]) {
      const adapter = new MemoryAdapter();
      const store = new SavedNatalStore({ ownerKey: A, epoch: 1, readAuthority: () => ({ ownerKey: A, epoch: 1 }), adapter, randomUUID });
      expect(await store.create(polar.envelope)).toEqual({ ok: false, code: 'invalid-input', mayHaveCommitted: false });
      expect(adapter.calls).toBe(0);
    }
    const { store, adapter } = fixture();
    expect(await store.create(polar.envelope, '\n')).toEqual({ ok: false, code: 'invalid-input', mayHaveCommitted: false });
    expect(await store.create({ ...polar.envelope, schema: 'future' } as never)).toEqual({ ok: false, code: 'invalid-input', mayHaveCommitted: false });
    expect(adapter.calls).toBe(0);
  });

  it('stays optional, imports no ephemeris or legacy storage, and performs no import-time effects', async () => {
    for (const entry of ['src/lib/profile/saved-record-store.ts', 'src/lib/engine/full.ts']) {
      const result = await build({ entryPoints: [entry], bundle: true, platform: 'browser', format: 'esm',
        write: false, metafile: true, logLevel: 'silent' });
      const paths = Object.keys(result.metafile!.inputs);
      if (entry.includes('saved-record-store')) {
        expect(paths.some((path) => path.includes('astronomy-engine') || /\/(living-chart|supabase)\//u.test(path))).toBe(false);
        expect(paths.some((path) => path.endsWith('/profile/store.ts'))).toBe(false);
        const forbidden = vi.fn(() => { throw new Error('unexpected effect'); });
        vi.stubGlobal('indexedDB', { open: forbidden }); vi.stubGlobal('fetch', forbidden);
        vi.stubGlobal('localStorage', new Proxy({}, { get: forbidden }));
        await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
        expect(forbidden).not.toHaveBeenCalled();
      } else expect(paths.some((path) => path.includes('saved-record'))).toBe(false);
    }
  });
});

describe('native adapter bounded opening failures', () => {
  it('reports absent IndexedDB without exposing a raw reference exception', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const store = new SavedNatalStore({ ownerKey: A, epoch: 1, readAuthority: () => ({ ownerKey: A, epoch: 1 }) });
    expect(await store.list()).toEqual({ ok: false, code: 'storage-unavailable', mayHaveCommitted: false });
  });

  it('closes a late successful native open after a blocked event', async () => {
    const request: Record<string, unknown> = {};
    const close = vi.fn();
    const database = { close, version: 1, objectStoreNames: { length: 1, contains: () => true } };
    vi.stubGlobal('indexedDB', { open: vi.fn(() => request) });
    const adapter = new IndexedDbSavedNatalAdapter();
    const store = new SavedNatalStore({ ownerKey: A, epoch: 1, readAuthority: () => ({ ownerKey: A, epoch: 1 }), adapter });
    const pending = store.list();
    (request.onblocked as () => void)();
    expect(await pending).toEqual({ ok: false, code: 'blocked', mayHaveCommitted: false });
    request.result = database;
    (request.onsuccess as () => void)();
    expect(close).toHaveBeenCalledTimes(1);
    expect(indexedDB.open).toHaveBeenCalledWith(SAVED_NATAL_DATABASE_NAME, 1);
  });

  it('closes a late successful native open after revocation', async () => {
    const request: Record<string, unknown> = {};
    const close = vi.fn();
    vi.stubGlobal('indexedDB', { open: () => request });
    const store = new SavedNatalStore({ ownerKey: A, epoch: 1, readAuthority: () => ({ ownerKey: A, epoch: 1 }) });
    const pending = store.list(); store.revoke();
    // Must settle before an unrelated native blocker releases the open request.
    expect(await pending).toEqual({ ok: false, code: 'stale', mayHaveCommitted: false });
    expect(close).not.toHaveBeenCalled();
    request.result = { close };
    (request.onsuccess as () => void)();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
