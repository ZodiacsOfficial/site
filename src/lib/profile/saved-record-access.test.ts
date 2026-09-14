import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computePortableChart } from '../engine/portable';
import {
  ACCOUNT_V2_LOCAL_OWNER_KEY,
  ACCOUNT_V2_PROFILE_LEASE_REVOKE_KEY,
  ACCOUNT_V2_RETAINED_OWNER_KEY,
  type AccountV2Storage,
} from '../account-v2/storage-identity';
import { ACCOUNT_V2_PROFILE_ACCESS_KEY } from '../account-v2/profile-access';
import { ACCOUNT_V2_PROFILE_REVOKE_EVENT } from '../account-v2/profile-lease';
import {
  MAX_SAVED_NATAL_OWNERS,
  SAVED_NATAL_DEVICE_TARGET,
  savedNatalAdapterFailure,
  type IndexedDbSavedNatalAdapter,
  type SavedNatalAdmissionRow,
  type SavedNatalInventory,
  type SavedNatalScope,
} from './saved-record-store';
import type { SavedNatalRecord } from './saved-record';

const A = '10000000-0000-4000-8000-000000000001';
const B = '20000000-0000-4000-8000-000000000002';
const GUEST = '30000000-0000-4000-8000-000000000003';
const DEVICE = SAVED_NATAL_DEVICE_TARGET;
const envelope = computePortableChart({ utc: '2001-12-21T08:30:00-00:00', latitude: 78.2232, longitude: 15.6267,
  houseSystem: 'placidus', timeKnown: true }, { sourceInstant: '2001-12-21T08:30:00-00:00' }).envelope;

class MemoryStorage implements AccountV2Storage {
  readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
const row = (target: string, generation: number, status: SavedNatalAdmissionRow['status'] = 'active'): SavedNatalAdmissionRow => ({ target, generation, status });
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

/** Models the native adapter's durable rows; the real transaction schedule is proved natively. */
class FakeAdapter {
  static rows = new Map<string, Map<string, unknown>>();
  static admissions = new Map<string, SavedNatalAdmissionRow>();
  static absent = true;
  static fault: unknown;
  static beforeInspect?: () => Promise<void>;
  static instances: FakeAdapter[] = [];
  static reset() { this.rows.clear(); this.admissions.clear(); this.absent = true; this.fault = undefined; this.beforeInspect = undefined; this.instances = []; }
  static seedGuest(records = 1) {
    this.absent = false;
    this.admissions.set(DEVICE, row(DEVICE, 1));
    this.admissions.set(`guest:${GUEST}`, row(`guest:${GUEST}`, 1));
    const rows = new Map<string, unknown>();
    for (let index = 0; index < records; index++) rows.set(`${String(index).padStart(8, '0')}-0000-4000-8000-000000000000`, { synthetic: index });
    this.rows.set(`guest:${GUEST}`, rows);
  }
  aborted = 0;
  constructor() { FakeAdapter.instances.push(this); }
  async recoverPendingErasures() {
    if (FakeAdapter.fault) return { ok: false as const, code: FakeAdapter.fault as never, mayHaveCommitted: false };
    let completed = 0;
    const pending = [...FakeAdapter.admissions.values()].filter((current) => current.status === 'pending')
      .map((current) => current.target).sort((a, b) => (a === DEVICE ? -1 : b === DEVICE ? 1 : 0));
    for (const target of pending) {
      await this.finishErasure(target);
      completed += 1;
    }
    return { ok: true as const, value: completed };
  }
  async inspect(ownerKey: string | null, guard: () => void): Promise<SavedNatalInventory> {
    guard();
    await FakeAdapter.beforeInspect?.();
    guard();
    if (FakeAdapter.absent) return { absent: true, device: null, owner: null, guest: null, ownerRecords: 0, guestRecords: 0, pending: false, owners: 0 };
    const rows = [...FakeAdapter.admissions.values()];
    const guest = rows.find((entry) => entry.target.startsWith('guest:')) ?? null;
    return { absent: false, device: FakeAdapter.admissions.get(DEVICE) ?? null,
      owner: ownerKey ? FakeAdapter.admissions.get(ownerKey) ?? null : null, guest,
      ownerRecords: ownerKey ? FakeAdapter.rows.get(ownerKey)?.size ?? 0 : 0,
      guestRecords: guest ? FakeAdapter.rows.get(guest.target)?.size ?? 0 : 0,
      pending: rows.some((entry) => entry.status === 'pending'), owners: rows.filter((entry) => entry.target !== DEVICE).length };
  }
  async read(scope: SavedNatalScope, id: string | null, guard: () => void): Promise<unknown[]> {
    guard();
    const rows = FakeAdapter.rows.get(scope.ownerKey) ?? new Map();
    return id === null ? [...rows.values()] : rows.has(id) ? [rows.get(id)] : [];
  }
  async mutate<T>(scope: SavedNatalScope, guard: () => void, operation: (rows: unknown[]) => { result: T; add?: SavedNatalRecord; deleteId?: string }, admit = false) {
    guard();
    FakeAdapter.absent = false;
    let device = FakeAdapter.admissions.get(DEVICE) ?? null;
    let owner = FakeAdapter.admissions.get(scope.ownerKey) ?? null;
    if (admit) {
      // Mirrors the native rotation: an erased device is readmitted at the next
      // generation and every owner is admitted anew under it.
      const deviceRotated = device !== null && device.status !== 'active';
      if (!device || deviceRotated) { device = row(DEVICE, (device?.generation ?? 0) + 1); FakeAdapter.admissions.set(DEVICE, device); }
      if (!owner || deviceRotated || owner.status !== 'active') {
        if (scope.ownerKey.startsWith('guest:') && [...FakeAdapter.admissions.keys()].some((key) => key.startsWith('guest:') && key !== scope.ownerKey)) throw savedNatalAdapterFailure('stale');
        owner = row(scope.ownerKey, deviceRotated ? 1 : (owner?.generation ?? 0) + 1); FakeAdapter.admissions.set(scope.ownerKey, owner);
      }
    }
    if (!device || !owner) throw savedNatalAdapterFailure('not-admitted');
    const rows = FakeAdapter.rows.get(scope.ownerKey) ?? new Map<string, unknown>();
    FakeAdapter.rows.set(scope.ownerKey, rows);
    const mutation = operation([...rows.values()]);
    guard();
    if (mutation.add) rows.set(mutation.add.id, mutation.add);
    if (mutation.deleteId) rows.delete(mutation.deleteId);
    return { result: mutation.result, admitted: { device, owner } };
  }
  async requestErasure(target: string, expected: number, expectedDevice: number, guard: () => void) {
    guard();
    const current = FakeAdapter.admissions.get(target);
    if (!current) return 'absent' as const;
    if (current.status === 'erased') return 'erased' as const;
    if (current.status === 'active') {
      if (expected !== current.generation) throw savedNatalAdapterFailure('stale');
      if (target !== DEVICE && FakeAdapter.admissions.get(DEVICE)?.generation !== expectedDevice) throw savedNatalAdapterFailure('stale');
      FakeAdapter.admissions.set(target, row(target, current.generation, 'pending'));
    }
    return 'queued' as const;
  }
  async finishErasure(target: string) {
    const current = FakeAdapter.admissions.get(target);
    if (!current || current.status !== 'pending') return;
    if (target === DEVICE) { FakeAdapter.rows.clear(); for (const key of [...FakeAdapter.admissions.keys()]) if (key !== DEVICE) FakeAdapter.admissions.delete(key); }
    else FakeAdapter.rows.delete(target);
    FakeAdapter.admissions.set(target, row(target, current.generation, 'erased'));
  }
  async erase(target: string, expected: number, expectedDevice: number, guard: () => void) {
    let intent = false;
    try {
      const outcome = await this.requestErasure(target, expected, expectedDevice, guard);
      if (outcome !== 'queued') return { ok: true as const, value: outcome };
      intent = true;
      await this.finishErasure(target);
      return { ok: true as const, value: 'erased' as const };
    } catch {
      // The fake throws only guard/stale refusals; the native adapter maps codes itself.
      return { ok: false as const, code: 'stale' as const, mayHaveCommitted: intent };
    }
  }
  abortPending() { this.aborted += 1; }
}

interface Harness {
  local: MemoryStorage;
  session: MemoryStorage;
  access: { allowed: boolean };
  deps: import('./saved-record-access').SavedRecordDeps;
}
function harness(options: { enabled?: boolean; v2?: boolean } = {}): Harness {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  const access = { allowed: true };
  let serial = 0;
  return {
    local, session, access,
    deps: {
      enabled: options.enabled ?? true,
      accountSyncV2: options.v2 ?? true,
      accessAllowed: () => access.allowed,
      storage: { local, session },
      randomUUID: () => `${String(++serial).padStart(8, '0')}-0000-4000-8000-00000000000${serial % 10}`,
      adapter: () => new FakeAdapter() as unknown as IndexedDbSavedNatalAdapter,
      now: () => new Date('2026-09-14T00:00:00.000Z'),
    },
  };
}
function grant(session: MemoryStorage, mode: 'unowned' | 'account' | 'retained', accountId?: string) {
  session.setItem(ACCOUNT_V2_PROFILE_ACCESS_KEY, JSON.stringify(mode === 'unowned' ? { version: 1, mode } : { version: 1, mode, accountId }));
}
function owner(local: MemoryStorage, accountId: string, retained = false) {
  local.setItem(ACCOUNT_V2_LOCAL_OWNER_KEY, JSON.stringify({ version: 1, accountId }));
  if (retained) local.setItem(ACCOUNT_V2_RETAINED_OWNER_KEY, JSON.stringify({ version: 1, accountId }));
}

type Access = typeof import('./saved-record-access');
let access: Access;

beforeEach(async () => {
  FakeAdapter.reset();
  vi.resetModules();
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', { documentElement: { hasAttribute: () => false } });
  access = await import('./saved-record-access');
});
afterEach(() => vi.unstubAllGlobals());

describe('strict record mode derived from the coordinator', () => {
  it('is disabled with the flag off and never touches storage or the adapter', async () => {
    const h = harness({ enabled: false });
    expect(access.readSavedRecordMode(h.deps)).toEqual({ status: 'disabled', reason: 'flag-off' });
    expect(await access.discoverSavedRecordBoundary(h.deps)).toEqual({ status: 'empty', guestRecords: 0 });
    expect(await access.openSavedRecordScope(h.deps)).toEqual({ status: 'disabled', reason: 'flag-off' });
    expect(FakeAdapter.instances).toHaveLength(0);
  });

  it('never treats an allowed legacy read as record authority in account-sync-v2 mode', () => {
    const h = harness();
    // Allowed lease but no exact grant: locked.
    expect(access.readSavedRecordMode(h.deps)).toEqual({ status: 'locked', reason: 'no-grant' });
    grant(h.session, 'unowned');
    h.access.allowed = false;
    expect(access.readSavedRecordMode(h.deps)).toEqual({ status: 'locked', reason: 'no-grant' });
    h.access.allowed = true;
    expect(access.readSavedRecordMode(h.deps)).toMatchObject({ status: 'ready', mode: { kind: 'guest', source: 'account-sync-v2', rights: 'full' } });
    // An unowned grant with an owner marker present is not guest eligibility.
    owner(h.local, A);
    expect(access.readSavedRecordMode(h.deps)).toEqual({ status: 'locked', reason: 'owner-marker' });
    grant(h.session, 'account', A);
    expect(access.readSavedRecordMode(h.deps)).toMatchObject({ status: 'ready', mode: { kind: 'account', accountId: A, rights: 'full' } });
    grant(h.session, 'account', B);
    expect(access.readSavedRecordMode(h.deps)).toEqual({ status: 'locked', reason: 'owner-marker' });
    grant(h.session, 'retained', A);
    expect(access.readSavedRecordMode(h.deps)).toEqual({ status: 'locked', reason: 'retention-marker' });
    owner(h.local, A, true);
    expect(access.readSavedRecordMode(h.deps)).toMatchObject({ status: 'ready', mode: { kind: 'retained', accountId: A, rights: 'read-only', guestView: false } });
    h.local.setItem(ACCOUNT_V2_LOCAL_OWNER_KEY, '{"version":1,"accountId":"not-a-uuid"}');
    expect(access.readSavedRecordMode(h.deps)).toEqual({ status: 'blocked', reason: 'owner-marker' });
  });

  it('positively establishes the account-free device guest and fails closed on account markers', () => {
    const h = harness({ v2: false });
    h.access.allowed = true;
    expect(access.readSavedRecordMode(h.deps)).toMatchObject({ status: 'ready', mode: { kind: 'guest', source: 'device', accountId: null, rights: 'full' } });
    owner(h.local, A);
    expect(access.readSavedRecordMode(h.deps)).toEqual({ status: 'blocked', reason: 'account-marker' });
    h.local.removeItem(ACCOUNT_V2_LOCAL_OWNER_KEY);
    h.local.setItem(ACCOUNT_V2_RETAINED_OWNER_KEY, JSON.stringify({ version: 1, accountId: A }));
    expect(access.readSavedRecordMode(h.deps)).toEqual({ status: 'blocked', reason: 'account-marker' });
    const failing = harness({ v2: false });
    failing.local.getItem = () => { throw new Error('denied'); };
    expect(access.readSavedRecordMode(failing.deps)).toEqual({ status: 'unavailable', reason: 'storage' });
    expect(access.readSavedRecordMode({ ...h.deps, storage: null })).toEqual({ status: 'unavailable', reason: 'storage' });
  });

  it('switches only the record scope to the guest view while retained, per tab and explicitly', () => {
    const h = harness();
    owner(h.local, A, true);
    grant(h.session, 'retained', A);
    expect(access.selectSavedRecordGuestView(true, h.deps)).toMatchObject({ status: 'ready', mode: { kind: 'guest', guestView: true, accountId: A, rights: 'full' } });
    expect(h.session.getItem(access.SAVED_RECORD_GUEST_VIEW_KEY)).toBe(A);
    // Re-authentication grants the account; the selection is inert and A never becomes the guest.
    grant(h.session, 'account', A);
    expect(access.readSavedRecordMode(h.deps)).toMatchObject({ status: 'ready', mode: { kind: 'account', guestView: false } });
    // The account session consumed the selection: the next retained sign-out starts on A's records.
    expect(h.session.getItem(access.SAVED_RECORD_GUEST_VIEW_KEY)).toBeNull();
    grant(h.session, 'retained', A);
    expect(access.readSavedRecordMode(h.deps)).toMatchObject({ status: 'ready', mode: { kind: 'retained', guestView: false } });
    expect(access.selectSavedRecordGuestView(false, h.deps)).toMatchObject({ status: 'ready', mode: { kind: 'retained' } });
    // Guest mode outside retention cannot select anything.
    h.local.removeItem(ACCOUNT_V2_LOCAL_OWNER_KEY); h.local.removeItem(ACCOUNT_V2_RETAINED_OWNER_KEY);
    grant(h.session, 'unowned');
    expect(access.selectSavedRecordGuestView(true, h.deps)).toMatchObject({ status: 'ready', mode: { kind: 'guest', guestView: false } });
    expect(h.session.getItem(access.SAVED_RECORD_GUEST_VIEW_KEY)).toBeNull();
  });
});

describe('evaluation fencing and scope handles', () => {
  it('advances synchronously on every access, revocation and scope event', () => {
    access.installSavedRecordScopeInvalidation();
    const seen: number[] = [];
    const unsubscribe = access.subscribeSavedRecordScope(() => seen.push(access.savedRecordEvaluation()));
    const start = access.savedRecordEvaluation();
    window.dispatchEvent(new Event('zodiacs:profile-access'));
    window.dispatchEvent(new Event(ACCOUNT_V2_PROFILE_REVOKE_EVENT));
    window.dispatchEvent(new Event(access.SAVED_RECORD_SCOPE_EVENT));
    const storageEvent = new Event('storage') as Event & { key?: string };
    storageEvent.key = ACCOUNT_V2_PROFILE_LEASE_REVOKE_KEY;
    window.dispatchEvent(storageEvent);
    // Another tab's erasure or admission announces itself through its own key.
    const scopeEvent = new Event('storage') as Event & { key?: string };
    scopeEvent.key = access.SAVED_RECORD_SCOPE_KEY;
    window.dispatchEvent(scopeEvent);
    const unrelated = new Event('storage') as Event & { key?: string };
    unrelated.key = 'zodiacs.profile.v1';
    window.dispatchEvent(unrelated);
    expect(access.savedRecordEvaluation()).toBe(start + 5);
    expect(seen).toEqual([start + 1, start + 2, start + 3, start + 4, start + 5]);
    unsubscribe();
    access.announceSavedRecordScopeChange();
    expect(seen).toHaveLength(5);
  });

  it('opens the exact account namespace, then withholds a delayed result across A to B to A', async () => {
    const h = harness();
    owner(h.local, A); grant(h.session, 'account', A);
    FakeAdapter.absent = false;
    FakeAdapter.admissions.set(DEVICE, row(DEVICE, 1));
    FakeAdapter.admissions.set(`account:${A}`, row(`account:${A}`, 1));
    const opened = await access.openSavedRecordScope(h.deps);
    expect(opened.status).toBe('ready');
    if (opened.status !== 'ready') return;
    expect(opened.scope.ownerKey).toBe(`account:${A}`);
    expect(opened.scope.state).toBeNull();
    expect(opened.scope.canSave).toBe(true);
    const created = await opened.scope.store.create(envelope);
    expect(created.ok).toBe(true);
    // A -> B -> A: the owner string returns to A but the evaluation moved on.
    window.dispatchEvent(new Event('zodiacs:profile-access'));
    owner(h.local, B); grant(h.session, 'account', B);
    window.dispatchEvent(new Event('zodiacs:profile-access'));
    owner(h.local, A); grant(h.session, 'account', A);
    window.dispatchEvent(new Event('zodiacs:profile-access'));
    expect(await opened.scope.store.list()).toEqual({ ok: false, code: 'access-denied', mayHaveCommitted: false });
    const reopened = await access.openSavedRecordScope(h.deps);
    expect(reopened.status).toBe('ready');
    if (reopened.status === 'ready') expect((await reopened.scope.store.list()).ok).toBe(true);
  });

  it('keeps an erased owner fenced across re-authentication until an explicit keep readmits it', async () => {
    const h = harness();
    owner(h.local, A); grant(h.session, 'account', A);
    FakeAdapter.absent = false;
    FakeAdapter.admissions.set(DEVICE, row(DEVICE, 1));
    FakeAdapter.admissions.set(`account:${A}`, row(`account:${A}`, 1));
    FakeAdapter.rows.set(`account:${A}`, new Map([['x', { synthetic: true }]]));
    const opened = await access.openSavedRecordScope(h.deps);
    expect(opened.status === 'ready' && await opened.scope.store.clearOwner()).toEqual({ ok: true, value: 'erased' });
    // Sign out retaining the profile, then sign in again: two access events, same account.
    owner(h.local, A, true); grant(h.session, 'retained', A);
    window.dispatchEvent(new Event('zodiacs:profile-access'));
    owner(h.local, A); grant(h.session, 'account', A);
    window.dispatchEvent(new Event('zodiacs:profile-access'));
    const reopened = await access.openSavedRecordScope(h.deps);
    expect(reopened.status === 'ready' && reopened.scope.state).toBe('owner-erased');
    if (reopened.status !== 'ready') return;
    expect(await reopened.scope.store.list()).toEqual({ ok: false, code: 'owner-erased', mayHaveCommitted: false });
    expect(await reopened.scope.store.create(envelope)).toEqual({ ok: false, code: 'owner-erased', mayHaveCommitted: false });
    const readmitted = await reopened.scope.store.create(envelope, undefined, { admit: true });
    expect(readmitted.ok && readmitted.value.scope.owner).toEqual(row(`account:${A}`, 2));
    expect(FakeAdapter.rows.get(`account:${A}`)?.size).toBe(1);
  });

  it('withholds a scope whose discovery resolved after a newer evaluation began', async () => {
    const h = harness();
    grant(h.session, 'unowned');
    const gate = deferred();
    FakeAdapter.beforeInspect = () => gate.promise;
    const pending = access.openSavedRecordScope(h.deps);
    window.dispatchEvent(new Event('zodiacs:profile-access'));
    gate.resolve();
    expect(await pending).toEqual({ status: 'stale' });
    expect(FakeAdapter.instances.at(-1)?.aborted).toBe(1);
  });

  it('provisions a guest key only for an explicit first save and reuses the single durable guest afterwards', async () => {
    const h = harness();
    grant(h.session, 'unowned');
    const first = await access.openSavedRecordScope(h.deps);
    expect(first.status).toBe('ready');
    if (first.status !== 'ready') return;
    expect(first.scope.ownerKey).toMatch(/^guest:/u);
    expect(first.scope.state).toBe('not-admitted');
    expect(FakeAdapter.absent).toBe(true);
    expect(await first.scope.store.list()).toEqual({ ok: false, code: 'not-admitted', mayHaveCommitted: false });
    const created = await first.scope.store.create(envelope, undefined, { admit: true });
    expect(created.ok).toBe(true);
    expect([...FakeAdapter.admissions.keys()]).toEqual([DEVICE, first.scope.ownerKey]);
    const second = await access.openSavedRecordScope(h.deps);
    expect(second.status === 'ready' && second.scope.ownerKey).toBe(first.scope.ownerKey);
    expect(second.status === 'ready' && second.scope.inventory.ownerRecords).toBe(1);
  });

  it('reports retained scopes read-only and guest-view scopes as the guest namespace', async () => {
    const h = harness();
    owner(h.local, A, true); grant(h.session, 'retained', A);
    FakeAdapter.seedGuest(2);
    FakeAdapter.admissions.set(`account:${A}`, row(`account:${A}`, 1));
    const retained = await access.openSavedRecordScope(h.deps);
    expect(retained.status === 'ready' && retained.scope.ownerKey).toBe(`account:${A}`);
    expect(retained.status === 'ready' && retained.scope.canSave).toBe(false);
    // Read-only is enforced by the store itself, not only by the button that hides.
    expect(await (retained.status === 'ready' ? retained.scope.store.create(envelope) : Promise.resolve(null)))
      .toEqual({ ok: false, code: 'access-denied', mayHaveCommitted: false });
    expect(FakeAdapter.rows.get(`account:${A}`)).toBeUndefined();
    expect(await (retained.status === 'ready' ? retained.scope.store.list() : Promise.resolve(null))).toEqual({ ok: true, value: [] });
    access.selectSavedRecordGuestView(true, h.deps);
    expect(await (retained.status === 'ready' ? retained.scope.store.list() : Promise.resolve(null))).toEqual({ ok: false, code: 'access-denied', mayHaveCommitted: false });
    const guest = await access.openSavedRecordScope(h.deps);
    expect(guest.status === 'ready' && guest.scope.ownerKey).toBe(`guest:${GUEST}`);
    expect(guest.status === 'ready' && guest.scope.canSave).toBe(true);
  });

  it('surfaces recovery failure, pending intent and unsupported storage as distinct unavailable states', async () => {
    const h = harness();
    grant(h.session, 'unowned');
    FakeAdapter.fault = 'unsupported-storage';
    expect(await access.openSavedRecordScope(h.deps)).toEqual({ status: 'unsupported', reason: 'unsupported-storage' });
    FakeAdapter.fault = 'storage-unavailable';
    expect(await access.openSavedRecordScope(h.deps)).toEqual({ status: 'unavailable', reason: 'storage-unavailable' });
    FakeAdapter.fault = undefined;
    FakeAdapter.seedGuest(1);
    FakeAdapter.admissions.set(`guest:${GUEST}`, row(`guest:${GUEST}`, 1, 'pending'));
    // Opening recovers the committed intent (erase only) before selecting a scope.
    const opened = await access.openSavedRecordScope(h.deps);
    expect(FakeAdapter.admissions.get(`guest:${GUEST}`)).toEqual(row(`guest:${GUEST}`, 1, 'erased'));
    expect(opened.status === 'ready' && opened.scope.state).toBe('owner-erased');
  });
});

describe('content-free discovery and erasure authority', () => {
  it('distinguishes empty, guest records, pending and unavailable without exposing content', async () => {
    const h = harness();
    expect(await access.discoverSavedRecordBoundary(h.deps)).toEqual({ status: 'empty', guestRecords: 0 });
    FakeAdapter.seedGuest(3);
    const discovered = await access.discoverSavedRecordBoundary(h.deps);
    expect(discovered).toEqual({ status: 'guest-records', guestRecords: 3 });
    expect(JSON.stringify(discovered)).not.toContain('synthetic');
    FakeAdapter.admissions.set(DEVICE, row(DEVICE, 1, 'pending'));
    // Recovery finishes the device intent first; afterwards nothing remains.
    expect(await access.discoverSavedRecordBoundary(h.deps)).toEqual({ status: 'empty', guestRecords: 0 });
    expect(FakeAdapter.rows.size).toBe(0);
    FakeAdapter.fault = 'storage-unavailable';
    expect(await access.discoverSavedRecordBoundary(h.deps)).toEqual({ status: 'unavailable', guestRecords: 0 });
    FakeAdapter.fault = 'unsupported-storage';
    expect(await access.discoverSavedRecordBoundary(h.deps)).toEqual({ status: 'unsupported', guestRecords: 0 });
    expect(FakeAdapter.instances.every((instance) => instance.aborted === 1)).toBe(true);
  });

  it('pins erasure to the observed generation and survives the ordinary access revocation', async () => {
    const h = harness();
    owner(h.local, A); grant(h.session, 'account', A);
    FakeAdapter.seedGuest(1);
    FakeAdapter.admissions.set(`account:${A}`, row(`account:${A}`, 4));
    FakeAdapter.rows.set(`account:${A}`, new Map([['x', { synthetic: true }]]));
    const prepared = await access.prepareSavedRecordErasure({ accountId: A }, h.deps);
    expect(prepared).toEqual({ status: 'ready', ticket: { target: `account:${A}`, expected: 4, expectedDevice: 1, guestRecords: 0 } });
    if (prepared.status !== 'ready') return;
    // The exclusive transition revokes ordinary access before erasing.
    h.access.allowed = false;
    window.dispatchEvent(new Event(ACCOUNT_V2_PROFILE_REVOKE_EVENT));
    let authorized = true;
    expect(await access.eraseSavedRecords(prepared.ticket, () => authorized, h.deps)).toEqual({ ok: true, value: 'erased' });
    expect(FakeAdapter.rows.has(`account:${A}`)).toBe(false);
    expect(FakeAdapter.rows.get(`guest:${GUEST}`)?.size).toBe(1);
    // A stale ticket cannot queue deletion of a readmitted namespace.
    FakeAdapter.admissions.set(`account:${A}`, row(`account:${A}`, 5));
    FakeAdapter.rows.set(`account:${A}`, new Map([['y', { synthetic: true }]]));
    expect(await access.eraseSavedRecords(prepared.ticket, () => authorized, h.deps)).toEqual({ ok: false, code: 'stale', mayHaveCommitted: false });
    expect(FakeAdapter.rows.get(`account:${A}`)?.size).toBe(1);
    // Nor can a ticket from before a device erasure cycle reach the same owner string readmitted at its old generation.
    const preWipe = await access.prepareSavedRecordErasure({ accountId: A }, h.deps);
    expect(preWipe).toMatchObject({ status: 'ready', ticket: { expected: 5, expectedDevice: 1 } });
    const wipe = await access.prepareSavedRecordErasure('device', h.deps);
    expect(wipe.status === 'ready' && await access.eraseSavedRecords(wipe.ticket, () => true, h.deps)).toEqual({ ok: true, value: 'erased' });
    grant(h.session, 'account', A); h.access.allowed = true;
    const reopened = await access.openSavedRecordScope(h.deps);
    expect(reopened.status === 'ready' && (await reopened.scope.store.create(envelope, undefined, { admit: true })).ok).toBe(true);
    expect(FakeAdapter.admissions.get(DEVICE)).toEqual(row(DEVICE, 2));
    expect(FakeAdapter.admissions.get(`account:${A}`)).toEqual(row(`account:${A}`, 1));
    FakeAdapter.admissions.set(`account:${A}`, row(`account:${A}`, 5));
    expect(preWipe.status === 'ready' && await access.eraseSavedRecords(preWipe.ticket, () => true, h.deps)).toEqual({ ok: false, code: 'stale', mayHaveCommitted: false });
    expect(FakeAdapter.rows.get(`account:${A}`)?.size).toBe(1);
    FakeAdapter.admissions.set(`account:${A}`, row(`account:${A}`, 1));
    h.access.allowed = false;
    // The caller's own authority ends the action before intent.
    const fresh = await access.prepareSavedRecordErasure({ accountId: A }, h.deps);
    authorized = false;
    expect(fresh.status === 'ready' && await access.eraseSavedRecords(fresh.ticket, () => authorized, h.deps)).toEqual({ ok: false, code: 'stale', mayHaveCommitted: false });
    expect(FakeAdapter.admissions.get(`account:${A}`)).toEqual(row(`account:${A}`, 1));
  });

  it('prepares device and guest targets, reports absent scopes, and refuses pending ones', async () => {
    const h = harness();
    expect(await access.prepareSavedRecordErasure('device', h.deps)).toEqual({ status: 'absent' });
    expect(await access.prepareSavedRecordErasure('guest', h.deps)).toEqual({ status: 'absent' });
    FakeAdapter.seedGuest(2);
    expect(await access.prepareSavedRecordErasure('guest', h.deps)).toEqual({ status: 'ready', ticket: { target: `guest:${GUEST}`, expected: 1, expectedDevice: 1, guestRecords: 2 } });
    expect(await access.prepareSavedRecordErasure('device', h.deps)).toEqual({ status: 'ready', ticket: { target: DEVICE, expected: 1, expectedDevice: 1, guestRecords: 0 } });
    expect(await access.prepareSavedRecordErasure({ accountId: B }, h.deps)).toEqual({ status: 'absent' });
    expect(await access.prepareSavedRecordErasure({ accountId: 'nope' }, h.deps)).toEqual({ status: 'unavailable', reason: 'invalid-account' });
    expect(await access.prepareSavedRecordErasure('guest', { ...h.deps, enabled: false })).toEqual({ status: 'disabled', reason: 'flag-off' });
    const device = await access.prepareSavedRecordErasure('device', h.deps);
    if (device.status === 'ready') {
      expect(await access.eraseSavedRecords(device.ticket, () => true, h.deps)).toEqual({ ok: true, value: 'erased' });
    }
    expect([...FakeAdapter.admissions.keys()]).toEqual([DEVICE]);
    expect(await access.prepareSavedRecordErasure('device', h.deps)).toEqual({ status: 'absent' });
    expect(MAX_SAVED_NATAL_OWNERS).toBe(1000);
  });
});
