import { build } from 'esbuild';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { computePortableChart } from '../engine/portable';
import { parseNatalEnvelope } from '@zodiacs/engine/receipt';
import { createSavedNatalRecord, type SavedNatalRecord } from './saved-record';
import {
  IndexedDbSavedNatalAdapter, MAX_SAVED_NATAL_OWNERS, SavedNatalStore, SAVED_NATAL_DATABASE_NAME,
  SAVED_NATAL_DEVICE_TARGET, SAVED_NATAL_SCHEMA_VERSION, savedNatalAdapterFailure, savedNatalScopeState,
  type SavedNatalAdapter, type SavedNatalAdmissionRow, type SavedNatalAuthority, type SavedNatalInventory,
  type SavedNatalResult, type SavedNatalScope,
} from './saved-record-store';

const A = 'account:10000000-0000-4000-8000-000000000001';
const B = 'account:20000000-0000-4000-8000-000000000002';
const G = 'guest:30000000-0000-4000-8000-000000000003';
const G2 = 'guest:50000000-0000-4000-8000-000000000005';
const ID = '30000000-0000-4000-8000-000000000003';
const WHEN = '2026-09-08T00:00:00.000Z';
const DEVICE = SAVED_NATAL_DEVICE_TARGET;
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
const row = (target: string, generation: number, status: SavedNatalAdmissionRow['status'] = 'active'): SavedNatalAdmissionRow => ({ target, generation, status });

/** Deterministic adapter contract model; native IDB schedules are verified separately. */
class Backend {
  rows = new Map<string, Map<string, unknown>>();
  admissions = new Map<string, SavedNatalAdmissionRow>();
  tail: Promise<unknown> = Promise.resolve();
  owner(key: string) { if (!this.rows.has(key)) this.rows.set(key, new Map()); return this.rows.get(key)!; }
  admit(...targets: string[]) { if (!this.admissions.has(DEVICE)) this.admissions.set(DEVICE, row(DEVICE, 1)); for (const target of targets) this.admissions.set(target, row(target, 1)); }
  scope(ownerKey: string): SavedNatalScope { return { ownerKey, device: this.admissions.get(DEVICE) ?? null, owner: this.admissions.get(ownerKey) ?? null }; }
  async serial<T>(action: () => Promise<T>): Promise<T> {
    const result = this.tail.then(action, action);
    this.tail = result.catch(() => {});
    return result;
  }
}
function same(observed: SavedNatalAdmissionRow | null, stored: SavedNatalAdmissionRow | null): boolean {
  return observed === null ? stored === null : stored !== null && stored.generation === observed.generation && stored.status === observed.status;
}
class MemoryAdapter implements SavedNatalAdapter {
  generation = 0;
  aborts = 0;
  calls = 0;
  fault: unknown;
  beforeRead?: () => Promise<void> | void;
  beforeCommit?: () => Promise<void> | void;
  afterCommit?: () => Promise<void> | void;
  afterIntent?: () => Promise<void> | void;
  constructor(readonly backend = new Backend()) {}
  private fence(scope: SavedNatalScope): void {
    const device = this.backend.admissions.get(DEVICE) ?? null;
    const owner = this.backend.admissions.get(scope.ownerKey) ?? null;
    if (device?.status === 'pending' || owner?.status === 'pending') throw savedNatalAdapterFailure('erasure-pending');
    if (device?.status === 'erased') throw savedNatalAdapterFailure('device-erased');
    if (owner?.status === 'erased') throw savedNatalAdapterFailure('owner-erased');
    if (!device || !owner) throw savedNatalAdapterFailure('not-admitted');
    if (scope.device?.generation !== device.generation || scope.owner?.generation !== owner.generation) throw savedNatalAdapterFailure('stale');
  }
  async inspect(ownerKey: string | null, guard: () => void): Promise<SavedNatalInventory> {
    this.calls++;
    guard();
    if (this.fault) throw this.fault;
    const rows = [...this.backend.admissions.values()];
    const guest = rows.find((entry) => entry.target.startsWith('guest:')) ?? null;
    return { absent: rows.length === 0, device: this.backend.admissions.get(DEVICE) ?? null,
      owner: ownerKey ? this.backend.admissions.get(ownerKey) ?? null : null, guest,
      ownerRecords: ownerKey ? this.backend.owner(ownerKey).size : 0, guestRecords: guest ? this.backend.owner(guest.target).size : 0,
      pending: rows.some((entry) => entry.status === 'pending'), owners: rows.filter((entry) => entry.target !== DEVICE).length };
  }
  async read(scope: SavedNatalScope, id: string | null, guard: () => void): Promise<unknown[]> {
    this.calls++;
    const generation = this.generation;
    guard();
    await this.beforeRead?.();
    if (this.fault) throw this.fault;
    if (generation !== this.generation) throw new DOMException('synthetic', 'AbortError');
    guard();
    this.fence(scope);
    const rows = this.backend.owner(scope.ownerKey);
    return structuredClone(id === null ? [...rows.values()].slice(0, 41) : rows.has(id) ? [rows.get(id)] : []);
  }
  async mutate<T>(scope: SavedNatalScope, guard: () => void,
    operation: (rows: unknown[]) => { result: T; add?: SavedNatalRecord; deleteId?: string }, admit = false) {
    this.calls++;
    const generation = this.generation;
    return this.backend.serial(async () => {
      guard();
      if (generation !== this.generation) throw new DOMException('synthetic', 'AbortError');
      if (this.fault) throw this.fault;
      const admissions = this.backend.admissions;
      let device = admissions.get(DEVICE) ?? null;
      let owner = admissions.get(scope.ownerKey) ?? null;
      const writes: SavedNatalAdmissionRow[] = [];
      if (!admit) this.fence(scope);
      else {
        if (device?.status === 'pending' || owner?.status === 'pending') throw savedNatalAdapterFailure('erasure-pending');
        if (!same(scope.device, device) || !same(scope.owner, owner)) throw savedNatalAdapterFailure('stale');
        if (device?.status !== 'active') {
          const next = (device?.generation ?? 0) + 1;
          if (!Number.isSafeInteger(next)) throw savedNatalAdapterFailure('unsupported-storage');
          writes.push(row(DEVICE, next));
          owner = null;
        }
        if (owner?.status !== 'active') {
          const owners = [...admissions.keys()].filter((target) => target !== DEVICE);
          if (owner === null && owners.length >= MAX_SAVED_NATAL_OWNERS) throw savedNatalAdapterFailure('owners-full');
          if (owner === null && scope.ownerKey.startsWith('guest:') && owners.some((target) => target.startsWith('guest:') && target !== scope.ownerKey)) throw savedNatalAdapterFailure('stale');
          const next = (owner?.generation ?? 0) + 1;
          if (!Number.isSafeInteger(next)) throw savedNatalAdapterFailure('unsupported-storage');
          writes.push(row(scope.ownerKey, next));
        }
      }
      const rows = this.backend.owner(scope.ownerKey);
      const mutation = operation(structuredClone([...rows.values()].slice(0, 41)));
      await this.beforeCommit?.();
      if (generation !== this.generation) throw new DOMException('synthetic', 'AbortError');
      guard();
      for (const write of writes) admissions.set(write.target, write);
      device = admissions.get(DEVICE)!;
      owner = admissions.get(scope.ownerKey)!;
      if (mutation.add) rows.set(mutation.add.id, structuredClone(mutation.add));
      if (mutation.deleteId) rows.delete(mutation.deleteId);
      // Deliberately return an already committed result after this hook so the
      // STORE's own post-await authority check is independently exercised.
      await this.afterCommit?.();
      return { result: mutation.result, admitted: { device, owner } };
    });
  }
  async requestErasure(target: string, expected: number, guard: () => void) {
    this.calls++;
    const generation = this.generation;
    return this.backend.serial(async () => {
      guard();
      await this.beforeCommit?.();
      if (this.fault) throw this.fault;
      if (generation !== this.generation) throw new DOMException('synthetic', 'AbortError');
      guard();
      const current = this.backend.admissions.get(target);
      if (!current) return 'absent' as const;
      if (current.status === 'erased') return 'erased' as const;
      if (current.status === 'active') {
        if (expected !== current.generation) throw savedNatalAdapterFailure('stale');
        this.backend.admissions.set(target, row(target, current.generation, 'pending'));
      }
      await this.afterIntent?.();
      return 'queued' as const;
    });
  }
  async finishErasure(target: string): Promise<void> {
    this.calls++;
    return this.backend.serial(async () => {
      if (this.fault) throw this.fault;
      const current = this.backend.admissions.get(target);
      if (!current || current.status !== 'pending') return;
      if (target === DEVICE) {
        this.backend.rows.clear();
        for (const key of [...this.backend.admissions.keys()]) if (key !== DEVICE) this.backend.admissions.delete(key);
      } else this.backend.rows.delete(target);
      this.backend.admissions.set(target, row(target, current.generation, 'erased'));
      await this.afterCommit?.();
    });
  }
  abortPending() { this.generation++; this.aborts++; }
}

function fixture(owner = A, backend = new Backend(), options: { admitted?: boolean } = {}) {
  if (options.admitted !== false) backend.admit(owner);
  let authority: SavedNatalAuthority | null = { ownerKey: owner, epoch: 1 };
  let serial = 0;
  const adapter = new MemoryAdapter(backend);
  const store = new SavedNatalStore({ scope: backend.scope(owner), epoch: 1, readAuthority: () => authority,
    adapter, now: () => new Date(WHEN), randomUUID: () => `${String(++serial).padStart(8, '0')}-0000-4000-8000-000000000000` });
  return { store, adapter, backend, setAuthority: (next: SavedNatalAuthority | null) => { authority = next; } };
}

afterEach(() => vi.unstubAllGlobals());

describe('owner-bound immutable saved natal operations', () => {
  it('creates/reads/exports an unlabeled record without local metadata in the envelope', async () => {
    const { store } = fixture();
    const { record } = value(await store.create(polar.envelope));
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
    expect(new Set(records.map((record) => value(record).record.id)).size).toBe(3);
    const parsed = value(await store.list()).map((record) => JSON.parse(record.envelopeJson).receipt.houses);
    expect(parsed.map((houses) => houses.requested)).toEqual(['placidus', 'whole', 'placidus']);
    expect(parsed.every((houses) => houses.actual === 'whole')).toBe(true);
  });

  it('preserves unknown 08:30 and exact source spelling through persistence', async () => {
    const { store } = fixture();
    const { record } = value(await store.create(unknown.envelope, 'local label'));
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
    expect(JSON.parse(value(await pending).record.envelopeJson)).toEqual(polar.envelope);
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
    const backend = new Backend(); backend.admit(A);
    const adapter = new MemoryAdapter(backend);
    const store = new SavedNatalStore({ scope: backend.scope(A), epoch: 1, readAuthority: () => ({ ownerKey: A, epoch: 1 }),
      adapter, randomUUID: () => ID, now: () => new Date(WHEN) });
    const first = value(await store.create(polar.envelope)).record;
    expect(await store.create(whole.envelope)).toEqual({ ok: false, code: 'id-conflict', mayHaveCommitted: false });
    expect(value(await store.get(ID))).toEqual(first);
  });

  it('partitions the same ID by explicit owner and deletes idempotently', async () => {
    const backend = new Backend();
    const a = fixture(A, backend), b = fixture(B, backend);
    const one = value(await a.store.create(polar.envelope)).record;
    const two = value(await b.store.create(whole.envelope)).record;
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

  it.each(['create', 'get', 'export', 'delete'] as const)('withholds delayed %s across an A-to-B-to-A access generation', async (operation) => {
    const f = fixture();
    const { record } = value(await f.store.create(polar.envelope));
    const ready = deferred(), release = deferred();
    const wait = async () => { ready.resolve(); await release.promise; };
    if (operation === 'create' || operation === 'delete') f.adapter.beforeCommit = wait;
    else f.adapter.beforeRead = wait;
    const pending = operation === 'create' ? f.store.create(whole.envelope)
      : operation === 'get' ? f.store.get(record.id)
        : operation === 'export' ? f.store.exportEnvelope(record.id) : f.store.delete(record.id);
    await ready.promise;
    f.setAuthority({ ownerKey: B, epoch: 2 });
    f.setAuthority({ ownerKey: A, epoch: 3 });
    release.resolve();
    expect(await pending).toEqual({ ok: false, code: 'stale', mayHaveCommitted: false });
    expect([...f.backend.owner(A).values()]).toEqual([record]);
  });

  it.each(['get', 'list', 'export'] as const)('sign-out withholds pending %s without deleting retained receipt bytes', async (operation) => {
    const f = fixture();
    const { record } = value(await f.store.create(polar.envelope));
    const ready = deferred(), release = deferred();
    f.adapter.beforeRead = async () => { ready.resolve(); await release.promise; };
    const pending = operation === 'get' ? f.store.get(record.id)
      : operation === 'list' ? f.store.list() : f.store.exportEnvelope(record.id);
    await ready.promise; f.setAuthority(null); f.store.revoke(); release.resolve();
    expect(await pending).toEqual({ ok: false, code: 'stale', mayHaveCommitted: false });
    expect([...f.backend.owner(A).values()]).toEqual([record]);
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
    expect(await clear).toEqual({ ok: true, value: 'erased' });
    expect(backend.owner(A).size).toBe(0);
    expect(adapter.aborts).toBe(2); // Abort old work; close clear's final connection.
    expect(await store.create(polar.envelope)).toEqual({ ok: false, code: 'access-denied', mayHaveCommitted: false });
  });

  it('explicit clear removes corrupt/future owned content, preserves other owners, and fences a separate handle', async () => {
    const backend = new Backend(); const a = fixture(A, backend), b = fixture(B, backend);
    backend.owner(A).set(ID, { schema: 'zodiacs.saved-natal.v100', future: true });
    const other = value(await b.store.create(whole.envelope)).record;
    expect(await a.store.clearOwner()).toEqual({ ok: true, value: 'erased' });
    expect(backend.owner(A).size).toBe(0);
    expect(backend.admissions.get(A)).toEqual(row(A, 1, 'erased'));
    expect(value(await b.store.get(other.id))).toEqual(other);
    const separateHandle = fixture(A, backend, { admitted: false });
    expect(await separateHandle.store.create(polar.envelope)).toEqual({ ok: false, code: 'owner-erased', mayHaveCommitted: false });
    expect(await separateHandle.store.list()).toEqual({ ok: false, code: 'owner-erased', mayHaveCommitted: false });
    expect(backend.owner(A).size).toBe(0);
    // Native tests independently verify the durable transaction barrier.
  });

  it('a failed clear preserves content and requires an explicit new handle for retry', async () => {
    const f = fixture(); value(await f.store.create(polar.envelope));
    f.adapter.fault = new Error('private failure');
    expect(await f.store.clearOwner()).toEqual({ ok: false, code: 'storage-unavailable', mayHaveCommitted: false });
    expect(f.backend.owner(A).size).toBe(1);
    expect(f.backend.admissions.get(A)).toEqual(row(A, 1));
    expect(await f.store.clearOwner()).toEqual({ ok: false, code: 'access-denied', mayHaveCommitted: false });
    f.adapter.fault = undefined;
    expect(await fixture(A, f.backend).store.clearOwner()).toEqual({ ok: true, value: 'erased' });
    expect(f.backend.owner(A).size).toBe(0);
  });

  it('reports that stale post-commit clear may already have erased the owner', async () => {
    const f = fixture(); value(await f.store.create(polar.envelope));
    f.adapter.afterCommit = () => f.setAuthority(null);
    expect(await f.store.clearOwner()).toEqual({ ok: false, code: 'stale', mayHaveCommitted: true });
    expect(f.backend.owner(A).size).toBe(0);
  });

  it('reports committed intent as pending, not deleted, when the purge fails after authority loss', async () => {
    const f = fixture(); const { record } = value(await f.store.create(polar.envelope));
    f.adapter.afterIntent = () => { f.setAuthority(null); f.adapter.fault = new Error('private purge failure'); };
    expect(await f.store.clearOwner()).toEqual({ ok: false, code: 'stale', mayHaveCommitted: true });
    expect(f.backend.admissions.get(A)).toEqual(row(A, 1, 'pending'));
    expect([...f.backend.owner(A).values()]).toEqual([record]);
  });

  it('keeps constructor, authority callback and clock failures fixed and private', async () => {
    const options = Object.defineProperty({}, 'scope', { get() { throw new Error('private constructor'); } });
    expect(() => new SavedNatalStore(options as never)).toThrow('Unable to configure saved natal records.');
    const backend = new Backend(); backend.admit(A);
    const denied = new SavedNatalStore({ scope: backend.scope(A), epoch: 1,
      readAuthority: () => { throw new Error('private authority'); } });
    expect(await denied.list()).toEqual({ ok: false, code: 'access-denied', mayHaveCommitted: false });
    const adapter = new MemoryAdapter(backend);
    const invalidClock = new SavedNatalStore({ scope: backend.scope(A), epoch: 1,
      readAuthority: () => ({ ownerKey: A, epoch: 1 }), adapter, randomUUID: () => ID,
      now: () => new Date(NaN) });
    expect(await invalidClock.create(polar.envelope)).toEqual({ ok: false, code: 'invalid-input', mayHaveCommitted: false });
    expect(adapter.calls).toBe(0);
  });

  it('catches revocation reentrancy inside the authority callback before storage', async () => {
    const backend = new Backend(); backend.admit(A);
    const adapter = new MemoryAdapter(backend);
    const store = new SavedNatalStore({ scope: backend.scope(A), epoch: 1, adapter, readAuthority: () => {
      store.revoke(); return { ownerKey: A, epoch: 1 };
    } });
    expect(await store.list()).toEqual({ ok: false, code: 'access-denied', mayHaveCommitted: false });
    expect(adapter.calls).toBe(0);
  });

  it('invalid UUID/label/envelope/time inputs fail before adapter writes', async () => {
    const backend = new Backend(); backend.admit(A);
    for (const randomUUID of [() => '', () => ID + '\n', () => { throw new Error('private'); }]) {
      const adapter = new MemoryAdapter(backend);
      const store = new SavedNatalStore({ scope: backend.scope(A), epoch: 1, readAuthority: () => ({ ownerKey: A, epoch: 1 }), adapter, randomUUID });
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
        vi.stubGlobal('indexedDB', { open: forbidden, databases: forbidden }); vi.stubGlobal('fetch', forbidden);
        vi.stubGlobal('localStorage', new Proxy({}, { get: forbidden }));
        await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
        expect(forbidden).not.toHaveBeenCalled();
      } else expect(paths.some((path) => path.includes('saved-record'))).toBe(false);
    }
  });
});

describe('explicit admission and durable generations', () => {
  it('refuses ordinary operations on an unadmitted scope and admits only through an explicit save', async () => {
    const f = fixture(A, new Backend(), { admitted: false });
    expect(savedNatalScopeState(f.store.currentScope)).toBe('not-admitted');
    for (const operation of [() => f.store.list(), () => f.store.get(ID), () => f.store.delete(ID), () => f.store.create(polar.envelope)]) {
      expect(await operation()).toEqual({ ok: false, code: 'not-admitted', mayHaveCommitted: false });
    }
    expect(f.adapter.calls).toBe(0);
    const created = value(await f.store.create(polar.envelope, undefined, { admit: true }));
    expect(created.scope).toEqual({ ownerKey: A, device: row(DEVICE, 1), owner: row(A, 1) });
    expect(f.store.currentScope).toBe(created.scope);
    expect(f.backend.admissions.get(DEVICE)).toEqual(row(DEVICE, 1));
    expect(value(await f.store.list())).toEqual([created.record]);
  });

  it('readmits an erased owner by rotating its generation and fences the old handle without touching new rows', async () => {
    const backend = new Backend();
    const old = fixture(A, backend);
    value(await old.store.create(polar.envelope));
    expect(await fixture(A, backend).store.clearOwner()).toEqual({ ok: true, value: 'erased' });
    const erased = fixture(A, backend, { admitted: false });
    expect(await erased.store.create(polar.envelope)).toEqual({ ok: false, code: 'owner-erased', mayHaveCommitted: false });
    const readmitted = value(await erased.store.create(whole.envelope, undefined, { admit: true }));
    expect(readmitted.scope.owner).toEqual(row(A, 2));
    expect(readmitted.scope.device).toEqual(row(DEVICE, 1));
    expect(backend.owner(A).size).toBe(1);
    // Every callback of the pre-erasure handle is now stale against the new generation.
    expect(await old.store.list()).toEqual({ ok: false, code: 'stale', mayHaveCommitted: false });
    expect(await old.store.delete(readmitted.record.id)).toEqual({ ok: false, code: 'stale', mayHaveCommitted: false });
    expect(await old.store.create(polar.envelope)).toEqual({ ok: false, code: 'stale', mayHaveCommitted: false });
    expect(await old.store.clearOwner()).toEqual({ ok: false, code: 'stale', mayHaveCommitted: false });
    expect(backend.admissions.get(A)).toEqual(row(A, 2));
    expect([...backend.owner(A).values()]).toEqual([readmitted.record]);
  });

  it('device erasure removes every owner admission and readmission rotates the device generation', async () => {
    const backend = new Backend();
    for (const owner of [A, B, G]) value(await fixture(owner, backend).store.create(polar.envelope));
    const adapter = new MemoryAdapter(backend);
    expect(await adapter.requestErasure(DEVICE, 1, () => {})).toBe('queued');
    expect(backend.admissions.get(DEVICE)).toEqual(row(DEVICE, 1, 'pending'));
    for (const owner of [A, B, G]) {
      expect(await fixture(owner, backend, { admitted: false }).store.list()).toEqual({ ok: false, code: 'erasure-pending', mayHaveCommitted: false });
    }
    await adapter.finishErasure(DEVICE);
    expect([...backend.admissions.keys()]).toEqual([DEVICE]);
    expect(backend.admissions.get(DEVICE)).toEqual(row(DEVICE, 1, 'erased'));
    expect(backend.rows.size).toBe(0);
    const blocked = fixture(A, backend, { admitted: false });
    expect(await blocked.store.list()).toEqual({ ok: false, code: 'device-erased', mayHaveCommitted: false });
    const readmitted = value(await blocked.store.create(polar.envelope, undefined, { admit: true }));
    expect(readmitted.scope).toEqual({ ownerKey: A, device: row(DEVICE, 2), owner: row(A, 1) });
    expect(backend.admissions.get(B)).toBeUndefined();
  });

  it('never queues deletion of a newer admission from a capability pinned to an older one', async () => {
    const backend = new Backend();
    const adapter = new MemoryAdapter(backend);
    backend.admissions.set(DEVICE, row(DEVICE, 1));
    backend.admissions.set(A, row(A, 3));
    await expect(adapter.requestErasure(A, 2, () => {})).rejects.toThrow();
    expect(backend.admissions.get(A)).toEqual(row(A, 3));
    expect(await adapter.requestErasure(A, 3, () => {})).toBe('queued');
    expect(await adapter.requestErasure(A, 3, () => {})).toBe('queued');
    expect(await adapter.requestErasure(B, 0, () => {})).toBe('absent');
    await adapter.finishErasure(A);
    expect(await adapter.requestErasure(A, 3, () => {})).toBe('erased');
  });

  it('refuses admission while an erasure is pending and fails closed on generation exhaustion', async () => {
    const backend = new Backend();
    backend.admissions.set(DEVICE, row(DEVICE, 1));
    backend.admissions.set(A, row(A, 1, 'pending'));
    const pendingStore = fixture(A, backend, { admitted: false });
    expect(await pendingStore.store.create(polar.envelope, undefined, { admit: true })).toEqual({ ok: false, code: 'erasure-pending', mayHaveCommitted: false });
    backend.admissions.set(A, row(A, Number.MAX_SAFE_INTEGER, 'erased'));
    const exhausted = fixture(A, backend, { admitted: false });
    expect(await exhausted.store.create(polar.envelope, undefined, { admit: true })).toEqual({ ok: false, code: 'unsupported-storage', mayHaveCommitted: false });
    expect(backend.admissions.get(A)).toEqual(row(A, Number.MAX_SAFE_INTEGER, 'erased'));
    expect(backend.rows.size).toBe(0);
  });

  it('bounds owner metadata and keeps one guest namespace per device', async () => {
    const backend = new Backend();
    backend.admissions.set(DEVICE, row(DEVICE, 1));
    for (let index = 0; index < MAX_SAVED_NATAL_OWNERS; index += 1) {
      const target = `account:${String(index).padStart(8, '0')}-0000-4000-8000-000000000000`;
      backend.admissions.set(target, row(target, 1));
    }
    const full = fixture(B, backend, { admitted: false });
    expect(await full.store.create(polar.envelope, undefined, { admit: true })).toEqual({ ok: false, code: 'owners-full', mayHaveCommitted: false });
    const existing = fixture('account:00000007-0000-4000-8000-000000000000', backend);
    value(await existing.store.create(polar.envelope));
    const guests = new Backend();
    value(await fixture(G, guests, { admitted: false }).store.create(polar.envelope, undefined, { admit: true }));
    expect(await fixture(G2, guests, { admitted: false }).store.create(polar.envelope, undefined, { admit: true })).toEqual({ ok: false, code: 'stale', mayHaveCommitted: false });
    expect([...guests.admissions.keys()]).toEqual([DEVICE, G]);
  });

  it('reports inventory content-free and distinguishes absent, empty, pending and erased states', async () => {
    const backend = new Backend();
    const adapter = new MemoryAdapter(backend);
    expect(await adapter.inspect(null, () => {})).toMatchObject({ absent: true, guest: null, pending: false, owners: 0 });
    value(await fixture(G, backend, { admitted: false }).store.create(polar.envelope, undefined, { admit: true }));
    const inventory = await adapter.inspect(A, () => {});
    expect(inventory).toMatchObject({ absent: false, owner: null, guest: row(G, 1), guestRecords: 1, ownerRecords: 0, pending: false, owners: 1 });
    expect(JSON.stringify(inventory)).not.toContain('receipt');
  });
});

describe('native adapter bounded opening failures', () => {
  const scope: SavedNatalScope = { ownerKey: A, device: row(DEVICE, 1), owner: row(A, 1) };

  it('reports absent IndexedDB without exposing a raw reference exception', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const store = new SavedNatalStore({ scope, epoch: 1, readAuthority: () => ({ ownerKey: A, epoch: 1 }) });
    expect(await store.list()).toEqual({ ok: false, code: 'storage-unavailable', mayHaveCommitted: false });
    const adapter = new IndexedDbSavedNatalAdapter();
    await expect(adapter.inspect(A, () => {})).rejects.toThrow();
    expect(await adapter.recoverPendingErasures()).toEqual({ ok: false, code: 'storage-unavailable', mayHaveCommitted: false });
  });

  it('treats a runtime without indexedDB.databases() as unsupported and never opens a database to look', async () => {
    const open = vi.fn();
    vi.stubGlobal('indexedDB', { open });
    const adapter = new IndexedDbSavedNatalAdapter();
    await expect(adapter.inspect(null, () => {})).rejects.toThrow();
    expect(await adapter.recoverPendingErasures()).toEqual({ ok: false, code: 'unsupported-storage', mayHaveCommitted: false });
    expect(open).not.toHaveBeenCalled();
  });

  it('reports an absent database without creating it', async () => {
    const open = vi.fn();
    vi.stubGlobal('indexedDB', { open, databases: async () => [{ name: 'zodiacs-living-chart-v1', version: 1 }] });
    const adapter = new IndexedDbSavedNatalAdapter();
    expect(await adapter.inspect(A, () => {})).toEqual({ absent: true, device: null, owner: null, guest: null,
      ownerRecords: 0, guestRecords: 0, pending: false, owners: 0 });
    expect(await adapter.recoverPendingErasures()).toEqual({ ok: true, value: 0 });
    expect(open).not.toHaveBeenCalled();
  });

  it('closes a late successful native open after a blocked event', async () => {
    const request: Record<string, unknown> = {};
    const close = vi.fn();
    const database = { close, version: SAVED_NATAL_SCHEMA_VERSION, objectStoreNames: { length: 2, contains: () => true } };
    vi.stubGlobal('indexedDB', { open: vi.fn(() => request) });
    const adapter = new IndexedDbSavedNatalAdapter();
    const store = new SavedNatalStore({ scope, epoch: 1, readAuthority: () => ({ ownerKey: A, epoch: 1 }), adapter });
    const pending = store.list();
    (request.onblocked as () => void)();
    expect(await pending).toEqual({ ok: false, code: 'blocked', mayHaveCommitted: false });
    request.result = database;
    (request.onsuccess as () => void)();
    expect(close).toHaveBeenCalledTimes(1);
    expect(indexedDB.open).toHaveBeenCalledWith(SAVED_NATAL_DATABASE_NAME, SAVED_NATAL_SCHEMA_VERSION);
  });

  it('closes a late successful native open after revocation', async () => {
    const request: Record<string, unknown> = {};
    const close = vi.fn();
    vi.stubGlobal('indexedDB', { open: () => request });
    const store = new SavedNatalStore({ scope, epoch: 1, readAuthority: () => ({ ownerKey: A, epoch: 1 }) });
    const pending = store.list(); store.revoke();
    // Must settle before an unrelated native blocker releases the open request.
    expect(await pending).toEqual({ ok: false, code: 'stale', mayHaveCommitted: false });
    expect(close).not.toHaveBeenCalled();
    request.result = { close };
    (request.onsuccess as () => void)();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
