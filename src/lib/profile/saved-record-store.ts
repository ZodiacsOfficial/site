/** Optional owner-bound local persistence. Importing this module opens no database. */
import type { NatalEnvelope } from '@zodiacs/engine/receipt';
import {
  createSavedNatalRecord, isSavedNatalId, isSavedNatalOwnerKey,
  MAX_SAVED_NATAL_RECORDS, parseSavedNatalRecord, type SavedNatalRecord,
} from './saved-record';

export const SAVED_NATAL_DATABASE_NAME = 'zodiacs-saved-natal-v1';
// Schema 3 replaces the unreleased schema-2 terminal erasure markers with
// admission rows that carry a durable generation. Existing v1/v2 databases are
// preserved and refused, never upgraded; a v2 writer receives VersionError.
export const SAVED_NATAL_SCHEMA_VERSION = 3;
const VERSION = SAVED_NATAL_SCHEMA_VERSION;
const RECORDS = 'records';
const OWNER_INDEX = 'ownerKey';
const ADMISSIONS = 'admissions';
export const SAVED_NATAL_DEVICE_TARGET = '*';
const DEVICE = SAVED_NATAL_DEVICE_TARGET;
/** Bounded owner metadata: one row per admitted owner, never one per cycle. */
export const MAX_SAVED_NATAL_OWNERS = 1000;

export type SavedNatalAdmissionStatus = 'active' | 'pending' | 'erased';
/** Content-free durable admission state for one owner namespace or the device. */
export interface SavedNatalAdmissionRow {
  readonly target: string;
  readonly generation: number;
  readonly status: SavedNatalAdmissionStatus;
}
/** The observed durable half of a capability: exact rows a handle was opened against. */
export interface SavedNatalScope {
  readonly ownerKey: string;
  readonly device: SavedNatalAdmissionRow | null;
  readonly owner: SavedNatalAdmissionRow | null;
}
/** Content-free inventory used by discovery and boundary decisions. */
export interface SavedNatalInventory {
  /** No database exists yet; nothing was created to learn this. */
  readonly absent: boolean;
  readonly device: SavedNatalAdmissionRow | null;
  readonly owner: SavedNatalAdmissionRow | null;
  /** The single guest namespace on this device, in any status. */
  readonly guest: SavedNatalAdmissionRow | null;
  readonly ownerRecords: number;
  readonly guestRecords: number;
  readonly pending: boolean;
  readonly owners: number;
}

export type SavedNatalFailureCode = 'access-denied' | 'stale' | 'invalid-input'
  | 'corrupt-record' | 'unsupported-record' | 'unsupported-storage'
  | 'erasure-pending' | 'owner-erased' | 'device-erased' | 'not-admitted' | 'owners-full'
  | 'storage-unavailable' | 'quota-exceeded' | 'blocked' | 'aborted' | 'full' | 'id-conflict';
export interface SavedNatalFailure {
  readonly ok: false;
  readonly code: SavedNatalFailureCode;
  /** A stale write can have committed. Never automatically retry it. */
  readonly mayHaveCommitted: boolean;
}
export type SavedNatalResult<T> = { readonly ok: true; readonly value: T } | SavedNatalFailure;
export interface SavedNatalAuthority { readonly ownerKey: string; readonly epoch: number }
export type SavedNatalErasureOutcome = 'erased' | 'absent';

type Guard = () => void;
interface Mutation<T> { readonly result: T; readonly add?: SavedNatalRecord; readonly deleteId?: string }
interface Admitted { readonly device: SavedNatalAdmissionRow; readonly owner: SavedNatalAdmissionRow }
/**
 * One adapter belongs to one handle. Production adapters must compare the
 * scope's generations with the stored admission rows inside EVERY read/write
 * transaction, persist erasure intent before deleting, and retain the erased
 * row's generation so readmission is a compare-and-swap, never a marker removal.
 * Test adapters model only stated cases.
 */
export interface SavedNatalAdapter {
  inspect(ownerKey: string | null, guard: Guard): Promise<SavedNatalInventory>;
  read(scope: SavedNatalScope, id: string | null, guard: Guard): Promise<unknown[]>;
  /** With `admit`, the same transaction creates or rotates admission rows by compare-and-swap. */
  mutate<T>(scope: SavedNatalScope, guard: Guard, operation: (rows: unknown[]) => Mutation<T>, admit?: boolean): Promise<{ result: T; admitted: Admitted }>;
  /** Durable intent; `expected` pins the generation the authorizing capability observed (0 = observed absent). */
  requestErasure(target: string, expected: number, guard: Guard): Promise<SavedNatalErasureOutcome | 'queued'>;
  /** Erase-only completion of a committed intent; needs no authority. */
  finishErasure(target: string): Promise<void>;
  abortPending(): void;
}

const failures = new WeakMap<object, SavedNatalFailure>();
function issue(code: SavedNatalFailureCode, mayHaveCommitted = false): Error {
  const error = new Error('Saved natal record operation failed.');
  failures.set(error, { ok: false, code, mayHaveCommitted });
  return error;
}
function failure(error: unknown, committed = false): SavedNatalFailure {
  const own = error !== null && (typeof error === 'object' || typeof error === 'function') ? failures.get(error) : undefined;
  if (own) return { ...own, mayHaveCommitted: committed || own.mayHaveCommitted };
  let name = '';
  try {
    if (typeof DOMException !== 'undefined') {
      name = Object.getOwnPropertyDescriptor(DOMException.prototype, 'name')?.get?.call(error) ?? '';
    }
  } catch { /* Do not inspect arbitrary thrown objects or private messages. */ }
  return { ok: false, code: name === 'QuotaExceededError' ? 'quota-exceeded'
    : name === 'VersionError' ? 'unsupported-storage' : name === 'AbortError' ? 'aborted' : 'storage-unavailable',
  mayHaveCommitted: committed };
}
function rethrow(error: unknown, committed = false): Error {
  const result = failure(error, committed);
  return issue(result.code, result.mayHaveCommitted);
}
/** Lets a test adapter model an adapter-level refusal with an exact code. */
export function savedNatalAdapterFailure(code: SavedNatalFailureCode): Error {
  return issue(code);
}

export function isSavedNatalAdmissionTarget(value: unknown): value is string {
  return value === DEVICE || isSavedNatalOwnerKey(value);
}
export function isGuestSavedNatalOwnerKey(value: unknown): value is string {
  return isSavedNatalOwnerKey(value) && value.startsWith('guest:');
}
function parseAdmission(value: unknown, target: string): SavedNatalAdmissionRow | null {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    throw issue('unsupported-storage');
  }
  const fields = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(fields).length !== 3 || !fields.target || !fields.generation || !fields.status
    || !('value' in fields.target) || !('value' in fields.generation) || !('value' in fields.status)
    || fields.target.value !== target || !isSavedNatalAdmissionTarget(target)
    || !Number.isSafeInteger(fields.generation.value) || (fields.generation.value as number) < 1
    || !['active', 'pending', 'erased'].includes(fields.status.value)) throw issue('unsupported-storage');
  return { target, generation: fields.generation.value as number, status: fields.status.value as SavedNatalAdmissionStatus };
}
function nextGeneration(row: SavedNatalAdmissionRow | null): number {
  const next = (row?.generation ?? 0) + 1;
  // Exhaustion fails closed; generations never wrap or reuse.
  if (!Number.isSafeInteger(next)) throw issue('unsupported-storage');
  return next;
}
function sameRow(observed: SavedNatalAdmissionRow | null, stored: SavedNatalAdmissionRow | null): boolean {
  return observed === null ? stored === null
    : stored !== null && stored.generation === observed.generation && stored.status === observed.status;
}
/** Maps stored rows to the failure an ordinary operation must report. */
function admissionFailure(scope: SavedNatalScope, device: SavedNatalAdmissionRow | null, owner: SavedNatalAdmissionRow | null): SavedNatalFailureCode | null {
  if (device?.status === 'pending' || owner?.status === 'pending') return 'erasure-pending';
  if (device?.status === 'erased') return 'device-erased';
  if (owner?.status === 'erased') return 'owner-erased';
  if (!device || !owner) return 'not-admitted';
  if (!scope.device || !scope.owner || scope.device.generation !== device.generation
    || scope.owner.generation !== owner.generation) return 'stale';
  return null;
}

/** Dedicated native database; no upgrades or writes to existing application databases. */
export class IndexedDbSavedNatalAdapter implements SavedNatalAdapter {
  private pending: Promise<IDBDatabase> | null = null;
  private connection: IDBDatabase | null = null;
  private cancelOpen: (() => void) | null = null;
  private generation = 0;
  private readonly transactions = new Set<{ abort: () => void }>();

  /** Read-only visits must not create an empty database. */
  private async exists(guard: Guard): Promise<boolean> {
    guard();
    if (this.connection) return true;
    let names: { name?: string }[];
    try {
      if (typeof indexedDB === 'undefined') throw issue('storage-unavailable');
      // Runtime target: browsers exposing indexedDB.databases(); others stay unavailable.
      if (typeof indexedDB.databases !== 'function') throw issue('unsupported-storage');
      names = await indexedDB.databases();
    } catch (error) { throw rethrow(error); }
    guard();
    return names.some((entry) => entry?.name === SAVED_NATAL_DATABASE_NAME);
  }

  private open(guard: Guard): Promise<IDBDatabase> {
    guard();
    if (this.pending) return this.pending;
    const generation = ++this.generation;
    let pending!: Promise<IDBDatabase>;
    pending = new Promise((resolve, reject) => {
      let request: IDBOpenDBRequest;
      let settled = false;
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        if (this.cancelOpen === cancel) this.cancelOpen = null;
        reject(rethrow(error));
      };
      const cancel = () => {
        // The native request cannot be cancelled while queued. Settle our
        // caller now, abort any upgrade already active, and close late success.
        try { request?.transaction?.abort(); } catch { /* Already completed. */ }
        fail(issue('stale'));
      };
      this.cancelOpen = cancel;
      try { request = indexedDB.open(SAVED_NATAL_DATABASE_NAME, VERSION); }
      catch (error) { fail(error); return; }
      request.onupgradeneeded = (event) => {
        try {
          guard();
          if (settled || generation !== this.generation || event.oldVersion !== 0) throw issue('unsupported-storage');
          const store = request.result.createObjectStore(RECORDS, { keyPath: ['ownerKey', 'id'] });
          store.createIndex(OWNER_INDEX, 'ownerKey', { unique: false });
          request.result.createObjectStore(ADMISSIONS, { keyPath: 'target' });
        } catch (error) {
          try { request.transaction?.abort(); } catch { /* Already aborted; retain the fixed original failure. */ }
          fail(error);
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        try {
          guard();
          if (settled || this.pending !== pending || this.generation !== generation) throw issue('stale');
          if (database.version !== VERSION || database.objectStoreNames.length !== 2
            || !database.objectStoreNames.contains(RECORDS) || !database.objectStoreNames.contains(ADMISSIONS)) throw issue('unsupported-storage');
          this.connection = database;
          // A newer schema elsewhere must never observe this connection writing around it.
          database.onversionchange = () => this.abortPending();
          settled = true;
          if (this.cancelOpen === cancel) this.cancelOpen = null;
          resolve(database);
        } catch (error) { database.close(); fail(error); }
      };
      request.onerror = () => fail(request.error);
      // A blocked request can later succeed. Invalidate this attempt, then close
      // that late success instead of retaining an unreachable connection.
      request.onblocked = () => fail(issue('blocked'));
    });
    this.pending = pending;
    void pending.catch(() => { if (this.pending === pending) this.pending = null; });
    return pending;
  }

  private async execute<T>(
    mode: IDBTransactionMode,
    guard: Guard,
    queue: (store: IDBObjectStore, admissions: IDBObjectStore, done: (value: T) => void, fail: (error: unknown) => void, check: Guard) => void,
  ): Promise<T> {
    guard();
    const database = await this.open(guard);
    const generation = this.generation;
    const check = () => {
      guard();
      if (generation !== this.generation || this.connection !== database) throw issue('stale');
    };
    check();
    return new Promise((resolve, reject) => {
      let transaction: IDBTransaction;
      try { transaction = database.transaction([RECORDS, ADMISSIONS], mode); }
      catch (error) { reject(rethrow(error)); return; }
      let result: T;
      let ready = false;
      let priorFailure: unknown;
      let settled = false;
      let abortRequested = false;
      const finishFailure = (error: unknown, committed = false) => {
        if (settled) return;
        settled = true;
        this.transactions.delete(active);
        reject(rethrow(error, committed));
      };
      const abort = (error: unknown) => {
        priorFailure = error;
        if (abortRequested || settled) return;
        try { transaction.abort(); abortRequested = true; }
        catch { finishFailure(error, mode === 'readwrite'); }
      };
      const active = { abort: () => abort(issue('stale')) };
      this.transactions.add(active);
      transaction.onabort = () => finishFailure(priorFailure ?? transaction.error ?? issue('aborted'));
      transaction.onerror = () => { priorFailure ??= transaction.error ?? issue('storage-unavailable'); };
      transaction.oncomplete = () => {
        if (settled) return;
        this.transactions.delete(active);
        try {
          check();
          if (!ready) throw issue('storage-unavailable');
          settled = true;
          resolve(result);
        } catch (error) { finishFailure(error, mode === 'readwrite'); }
      };
      try {
        check();
        const store = transaction.objectStore(RECORDS);
        const keyPath = store.keyPath;
        if (store.autoIncrement || !Array.isArray(keyPath) || keyPath.length !== 2
          || keyPath[0] !== 'ownerKey' || keyPath[1] !== 'id'
          || store.indexNames.length !== 1 || !store.indexNames.contains(OWNER_INDEX)) throw issue('unsupported-storage');
        const index = store.index(OWNER_INDEX);
        if (index.keyPath !== 'ownerKey' || index.unique || index.multiEntry) throw issue('unsupported-storage');
        const admissions = transaction.objectStore(ADMISSIONS);
        if (admissions.autoIncrement || admissions.keyPath !== 'target' || admissions.indexNames.length !== 0) {
          throw issue('unsupported-storage');
        }
        queue(store, admissions, (value) => { check(); result = value; ready = true; }, abort, check);
      } catch (error) { abort(error); }
    });
  }

  /** Reads all admission rows, bounded and strictly parsed; fails closed above the bound. */
  private static readAdmissions(admissions: IDBObjectStore, onRows: (rows: SavedNatalAdmissionRow[]) => void, fail: (error: unknown) => void, check: Guard): void {
    const request = admissions.getAll(undefined, MAX_SAVED_NATAL_OWNERS + 2);
    request.onsuccess = () => {
      try {
        check();
        if (request.result.length > MAX_SAVED_NATAL_OWNERS + 1) throw issue('unsupported-storage');
        const rows: SavedNatalAdmissionRow[] = [];
        for (const raw of request.result) {
          const target = raw !== null && typeof raw === 'object' ? Object.getOwnPropertyDescriptor(raw, 'target')?.value : undefined;
          const row = parseAdmission(raw, typeof target === 'string' ? target : '');
          if (!row) throw issue('unsupported-storage');
          rows.push(row);
        }
        onRows(rows);
      } catch (error) { fail(error); }
    };
    request.onerror = () => fail(request.error);
  }

  private static count(store: IDBObjectStore, ownerKey: string | null, onCount: (count: number) => void, fail: (error: unknown) => void, check: Guard): void {
    if (ownerKey === null) { onCount(0); return; }
    const request = store.index(OWNER_INDEX).count(ownerKey);
    request.onsuccess = () => { try { check(); onCount(request.result); } catch (error) { fail(error); } };
    request.onerror = () => fail(request.error);
  }

  async inspect(ownerKey: string | null, guard: Guard): Promise<SavedNatalInventory> {
    if (ownerKey !== null && !isSavedNatalOwnerKey(ownerKey)) throw issue('invalid-input');
    if (!await this.exists(guard)) {
      return { absent: true, device: null, owner: null, guest: null, ownerRecords: 0, guestRecords: 0, pending: false, owners: 0 };
    }
    return this.execute<SavedNatalInventory>('readonly', guard, (store, admissions, done, fail, check) => {
      IndexedDbSavedNatalAdapter.readAdmissions(admissions, (rows) => {
        const device = rows.find((row) => row.target === DEVICE) ?? null;
        const owner = ownerKey === null ? null : rows.find((row) => row.target === ownerKey) ?? null;
        const guests = rows.filter((row) => isGuestSavedNatalOwnerKey(row.target));
        if (guests.length > 1) throw issue('unsupported-storage');
        const guest = guests[0] ?? null;
        const owners = rows.length - (device ? 1 : 0);
        IndexedDbSavedNatalAdapter.count(store, owner ? owner.target : null, (ownerRecords) => {
          IndexedDbSavedNatalAdapter.count(store, guest ? guest.target : null, (guestRecords) => {
            done({ absent: false, device, owner, guest, ownerRecords, guestRecords,
              pending: rows.some((row) => row.status === 'pending'), owners });
          }, fail, check);
        }, fail, check);
      }, fail, check);
    });
  }

  /** Both admission lookups and the operation share one native transaction. */
  private static admitted(admissions: IDBObjectStore, scope: SavedNatalScope, onRows: (device: SavedNatalAdmissionRow | null, owner: SavedNatalAdmissionRow | null) => void, fail: (error: unknown) => void, check: Guard): void {
    const device = admissions.get(DEVICE);
    const owner = admissions.get(scope.ownerKey);
    let remaining = 2;
    const checked = () => {
      try {
        check();
        if (--remaining !== 0) return;
        onRows(parseAdmission(device.result, DEVICE), parseAdmission(owner.result, scope.ownerKey));
      } catch (error) { fail(error); }
    };
    device.onsuccess = checked; owner.onsuccess = checked;
    device.onerror = () => fail(device.error); owner.onerror = () => fail(owner.error);
  }

  read(scope: SavedNatalScope, id: string | null, guard: Guard): Promise<unknown[]> {
    if (!isSavedNatalOwnerKey(scope.ownerKey)) return Promise.reject(issue('invalid-input'));
    return this.execute('readonly', guard, (store, admissions, done, fail, check) => {
      IndexedDbSavedNatalAdapter.admitted(admissions, scope, (device, owner) => {
        const denied = admissionFailure(scope, device, owner);
        if (denied) throw issue(denied);
        const request = id === null ? store.index(OWNER_INDEX).getAll(scope.ownerKey, MAX_SAVED_NATAL_RECORDS + 1)
          : store.get([scope.ownerKey, id]);
        request.onsuccess = () => {
          try { check(); done(id === null ? request.result : request.result === undefined ? [] : [request.result]); }
          catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error);
      }, fail, check);
    });
  }

  mutate<T>(scope: SavedNatalScope, guard: Guard, operation: (rows: unknown[]) => Mutation<T>, admit = false): Promise<{ result: T; admitted: Admitted }> {
    if (!isSavedNatalOwnerKey(scope.ownerKey)) return Promise.reject(issue('invalid-input'));
    return this.execute('readwrite', guard, (store, admissions, done, fail, check) => {
      const proceed = (admitted: Admitted) => {
        const request = store.index(OWNER_INDEX).getAll(scope.ownerKey, MAX_SAVED_NATAL_RECORDS + 1);
        request.onsuccess = () => {
          try {
            check();
            const mutation = operation(request.result);
            check();
            if (mutation.add && mutation.deleteId) throw issue('invalid-input');
            if (mutation.add) {
              if (mutation.add.ownerKey !== scope.ownerKey || !isSavedNatalId(mutation.add.id)) throw issue('invalid-input');
              const add = store.add(mutation.add);
              add.onerror = () => fail(add.error);
            } else if (mutation.deleteId) {
              if (!isSavedNatalId(mutation.deleteId)) throw issue('invalid-input');
              const remove = store.delete([scope.ownerKey, mutation.deleteId]);
              remove.onerror = () => fail(remove.error);
            }
            done({ result: mutation.result, admitted });
          } catch (error) { fail(error); }
        };
        request.onerror = () => fail(request.error);
      };
      if (!admit) {
        IndexedDbSavedNatalAdapter.admitted(admissions, scope, (device, owner) => {
          const denied = admissionFailure(scope, device, owner);
          if (denied) throw issue(denied);
          proceed({ device: device!, owner: owner! });
        }, fail, check);
        return;
      }
      // Explicit admission: compare-and-swap on the exact observed rows. Only
      // one of two concurrent admissions can succeed; the other is stale.
      IndexedDbSavedNatalAdapter.readAdmissions(admissions, (rows) => {
        const device = rows.find((row) => row.target === DEVICE) ?? null;
        const owner = rows.find((row) => row.target === scope.ownerKey) ?? null;
        if (device?.status === 'pending' || owner?.status === 'pending') throw issue('erasure-pending');
        if (!sameRow(scope.device, device) || !sameRow(scope.owner, owner)) throw issue('stale');
        const nextDevice: SavedNatalAdmissionRow = device?.status === 'active' ? device
          : { target: DEVICE, generation: nextGeneration(device), status: 'active' };
        let nextOwner: SavedNatalAdmissionRow;
        if (owner?.status === 'active' && device?.status === 'active') nextOwner = owner;
        else {
          // Device readmission admits no owner by itself; every owner row is
          // created anew under the rotated device generation.
          const survivingOwner = device?.status === 'active' ? owner : null;
          if (survivingOwner === null && rows.length - (device ? 1 : 0) >= MAX_SAVED_NATAL_OWNERS) throw issue('owners-full');
          if (survivingOwner === null && isGuestSavedNatalOwnerKey(scope.ownerKey)
            && rows.some((row) => isGuestSavedNatalOwnerKey(row.target) && row.target !== scope.ownerKey)) throw issue('stale');
          nextOwner = { target: scope.ownerKey, generation: nextGeneration(survivingOwner), status: 'active' };
        }
        const writes: IDBRequest[] = [];
        if (nextDevice !== device) writes.push(admissions.put(nextDevice));
        if (nextOwner !== owner) writes.push(admissions.put(nextOwner));
        for (const write of writes) write.onerror = () => fail(write.error);
        proceed({ device: nextDevice, owner: nextOwner });
      }, fail, check);
    });
  }

  requestErasure(target: string, expected: number, guard: Guard): Promise<SavedNatalErasureOutcome | 'queued'> {
    if (!isSavedNatalAdmissionTarget(target) || !Number.isSafeInteger(expected) || expected < 0) return Promise.reject(issue('invalid-input'));
    return this.execute<SavedNatalErasureOutcome | 'queued'>('readwrite', guard, (_store, admissions, done, fail, check) => {
      const request = admissions.get(target);
      request.onsuccess = () => {
        try {
          check();
          const row = parseAdmission(request.result, target);
          if (!row) { done('absent'); return; }
          if (row.status === 'erased') { done('erased'); return; }
          if (row.status === 'active') {
            // A capability captured against an older admission cannot queue
            // deletion of a newer one, even for the same owner string.
            if (expected !== row.generation) throw issue('stale');
            const intent = admissions.put({ target, generation: row.generation, status: 'pending' } satisfies SavedNatalAdmissionRow);
            intent.onerror = () => fail(intent.error);
          }
          done('queued');
        } catch (error) { fail(error); }
      };
      request.onerror = () => fail(request.error);
    });
  }

  /** Only a persisted pending intent authorizes this erase-only operation. */
  finishErasure(target: string): Promise<void> {
    if (!isSavedNatalAdmissionTarget(target)) return Promise.reject(issue('invalid-input'));
    return this.execute('readwrite', () => {}, (store, admissions, done, fail, check) => {
      const request = admissions.get(target);
      request.onsuccess = () => {
        try {
          check();
          const row = parseAdmission(request.result, target);
          // A stale completion can neither purge a readmitted namespace nor
          // acknowledge anything but the exact pending row.
          if (!row || row.status !== 'pending') { done(undefined); return; }
          const acknowledge = () => {
            // Purge + acknowledgment commit together. A failed purge leaves
            // the prior durable pending row and all original rows intact.
            const ack = admissions.put({ target, generation: row.generation, status: 'erased' } satisfies SavedNatalAdmissionRow);
            ack.onerror = () => fail(ack.error);
            done(undefined);
          };
          const purgeOwnerRows = (after: () => void) => {
            if (target !== DEVICE) { after(); return; }
            // Device erasure removes every owner admission with its records;
            // readmission of the device initially admits no owner.
            const cursorRequest = admissions.openKeyCursor();
            cursorRequest.onsuccess = () => {
              try {
                check();
                const cursor = cursorRequest.result;
                if (!cursor) { after(); return; }
                if (cursor.primaryKey !== DEVICE) {
                  const remove = admissions.delete(cursor.primaryKey);
                  remove.onerror = () => fail(remove.error);
                }
                cursor.continue();
              } catch (error) { fail(error); }
            };
            cursorRequest.onerror = () => fail(cursorRequest.error);
          };
          const cursorRequest = target === DEVICE ? store.openKeyCursor() : store.index(OWNER_INDEX).openKeyCursor(target);
          cursorRequest.onsuccess = () => {
            try {
              check();
              const cursor = cursorRequest.result;
              if (!cursor) { purgeOwnerRows(acknowledge); return; }
              const remove = store.delete(cursor.primaryKey);
              remove.onerror = () => fail(remove.error);
              cursor.continue();
            } catch (error) { fail(error); }
          };
          cursorRequest.onerror = () => fail(cursorRequest.error);
        } catch (error) { fail(error); }
      };
      request.onerror = () => fail(request.error);
    });
  }

  /**
   * Intent commits first under the caller's authority; purge and acknowledgment
   * commit together afterwards without it. `mayHaveCommitted` reports a committed
   * intent, never physical deletion: after it, recovery finishes the exact target.
   */
  async erase(target: string, expected: number, guard: Guard): Promise<SavedNatalResult<SavedNatalErasureOutcome>> {
    let intentCommitted = false;
    try {
      const outcome = await this.requestErasure(target, expected, guard);
      if (outcome !== 'queued') return { ok: true, value: outcome };
      intentCommitted = true;
      await this.finishErasure(target);
      return { ok: true, value: 'erased' };
    } catch (error) { return failure(error, intentCommitted); }
  }

  /**
   * Explicit startup/retry hook, never automatic on import/open. Has erase-only
   * authority from committed intents; exposes no receipts or owner inventory,
   * creates no database and admits nothing.
   */
  async recoverPendingErasures(): Promise<SavedNatalResult<number>> {
    let completed = 0;
    try {
      if (!await this.exists(() => {})) return { ok: true, value: 0 };
      const targets = await this.execute<string[]>('readonly', () => {}, (_store, admissions, done, fail, check) => {
        IndexedDbSavedNatalAdapter.readAdmissions(admissions, (rows) => {
          const pending = rows.filter((row) => row.status === 'pending').map((row) => row.target);
          // The device intent subsumes every owner intent; finish it first.
          done(pending.sort((a, b) => (a === DEVICE ? -1 : b === DEVICE ? 1 : 0)));
        }, fail, check);
      });
      for (const target of targets) { await this.finishErasure(target); completed += 1; }
      return { ok: true, value: completed };
    } catch (error) { return failure(error, completed > 0); }
  }

  /** close() alone cannot abort transactions; abort every tracked transaction first. */
  abortPending(): void {
    this.generation += 1;
    const cancel = this.cancelOpen;
    this.cancelOpen = null;
    this.pending = null;
    cancel?.();
    for (const transaction of [...this.transactions]) transaction.abort();
    this.connection?.close();
    this.connection = null;
  }
}

export interface SavedNatalStoreOptions {
  readonly scope: SavedNatalScope;
  readonly epoch: number;
  /** Explicit application policy, not authentication or a same-origin sandbox. */
  readonly readAuthority: () => SavedNatalAuthority | null;
  readonly adapter?: SavedNatalAdapter;
  readonly now?: () => Date;
  readonly randomUUID?: () => string;
}
interface Ticket { readonly generation: number; readonly state: 'active' | 'clearing' }
export interface SavedNatalCreated { readonly record: SavedNatalRecord; readonly scope: SavedNatalScope }

/** Reports why a scope cannot perform ordinary operations, or null when admitted. */
export function savedNatalScopeState(scope: SavedNatalScope): Exclude<SavedNatalFailureCode, 'stale'> | null {
  if (scope.device?.status === 'pending' || scope.owner?.status === 'pending') return 'erasure-pending';
  if (scope.device?.status === 'erased') return 'device-erased';
  if (scope.owner?.status === 'erased') return 'owner-erased';
  if (!scope.device || !scope.owner) return 'not-admitted';
  return null;
}

export class SavedNatalStore {
  private scope: SavedNatalScope;
  private readonly epoch: number;
  private readonly readAuthority: () => SavedNatalAuthority | null;
  private readonly adapter: SavedNatalAdapter;
  private readonly now: () => Date;
  private readonly randomUUID: () => string;
  private generation = 0;
  private state: 'active' | 'clearing' | 'revoked' = 'active';

  constructor(options: SavedNatalStoreOptions) {
    try {
      this.scope = Object.freeze({ ownerKey: options.scope.ownerKey,
        device: options.scope.device ? Object.freeze({ ...options.scope.device }) : null,
        owner: options.scope.owner ? Object.freeze({ ...options.scope.owner }) : null });
      this.epoch = options.epoch;
      this.readAuthority = options.readAuthority;
      this.adapter = options.adapter ?? new IndexedDbSavedNatalAdapter();
      this.now = options.now ?? (() => new Date());
      this.randomUUID = options.randomUUID ?? (() => crypto.randomUUID());
    } catch { throw new Error('Unable to configure saved natal records.'); }
  }

  get ownerKey(): string { return this.scope.ownerKey; }
  get currentScope(): SavedNatalScope { return this.scope; }

  private allowed(ticket: Ticket): boolean {
    try {
      if (this.state !== ticket.state || this.generation !== ticket.generation
        || !isSavedNatalOwnerKey(this.scope.ownerKey) || !Number.isSafeInteger(this.epoch) || this.epoch < 0) return false;
      const current = this.readAuthority();
      const ownerKey = current?.ownerKey;
      const epoch = current?.epoch;
      return ownerKey === this.scope.ownerKey && epoch === this.epoch
        && this.state === ticket.state && this.generation === ticket.generation;
    } catch { return false; }
  }
  private guard(ticket: Ticket): Guard {
    return () => { if (!this.allowed(ticket)) throw issue('stale'); };
  }
  private start(): Ticket {
    const ticket = { generation: this.generation, state: 'active' } as const;
    if (!this.allowed(ticket)) throw issue('access-denied');
    return ticket;
  }
  private parse(rows: unknown[]): SavedNatalRecord[] {
    if (rows.length > MAX_SAVED_NATAL_RECORDS) throw issue('corrupt-record');
    const records = rows.map((value) => {
      const parsed = parseSavedNatalRecord(value, this.scope.ownerKey);
      if (!parsed.ok) throw issue(parsed.code);
      return parsed.record;
    });
    if (new Set(records.map((record) => record.id)).size !== records.length) throw issue('corrupt-record');
    return records;
  }
  private async perform<T>(ticket: Ticket, write: boolean, action: (guard: Guard) => Promise<T>): Promise<SavedNatalResult<T>> {
    let completed = false;
    try {
      const guard = this.guard(ticket);
      guard();
      const value = await action(guard);
      completed = true;
      guard();
      return { ok: true, value };
    } catch (error) {
      const failed = failure(error, completed && write);
      return { ...failed, code: this.allowed(ticket) ? failed.code : 'stale' };
    }
  }

  /**
   * Explicit save. Without `admit`, an unadmitted or erased scope is refused.
   * With it, the first explicit save admits (or readmits) the owner and device
   * by compare-and-swap in the same native transaction as the record itself.
   */
  async create(envelope: Readonly<NatalEnvelope>, label?: string, options: { readonly admit?: boolean } = {}): Promise<SavedNatalResult<SavedNatalCreated>> {
    try {
      const ticket = this.start();
      const blocked = savedNatalScopeState(this.scope);
      if (blocked && (!options.admit || blocked === 'erasure-pending')) return { ok: false, code: blocked, mayHaveCommitted: false };
      const id = this.randomUUID();
      const date = this.now();
      const timestamp = Date.prototype.toISOString.call(date);
      const record = createSavedNatalRecord(this.scope.ownerKey, id, timestamp, envelope, label);
      if (!record) return { ok: false, code: 'invalid-input', mayHaveCommitted: false };
      const scope = this.scope;
      const result = await this.perform(ticket, true, (guard) => this.adapter.mutate(scope, guard, (rows) => {
        const records = this.parse(rows);
        if (records.some((current) => current.id === record.id)) throw issue('id-conflict');
        if (records.length >= MAX_SAVED_NATAL_RECORDS) throw issue('full');
        return { result: record, add: record };
      }, blocked !== null));
      if (!result.ok) return result;
      if (this.scope === scope && this.allowed(ticket)) {
        this.scope = Object.freeze({ ownerKey: scope.ownerKey,
          device: Object.freeze({ ...result.value.admitted.device }), owner: Object.freeze({ ...result.value.admitted.owner }) });
      }
      return { ok: true, value: { record: result.value.result, scope: this.scope } };
    } catch (error) {
      const result = failure(error);
      return { ...result, code: result.code === 'access-denied' ? result.code : 'invalid-input' };
    }
  }

  async list(): Promise<SavedNatalResult<readonly SavedNatalRecord[]>> {
    try {
      const ticket = this.start();
      const blocked = savedNatalScopeState(this.scope);
      if (blocked) return { ok: false, code: blocked, mayHaveCommitted: false };
      return this.perform(ticket, false, async (guard) => {
        const rows = await this.adapter.read(this.scope, null, guard);
        guard();
        return Object.freeze(this.parse(rows).sort((a, b) => a.createdAt === b.createdAt
          ? a.id < b.id ? -1 : a.id > b.id ? 1 : 0 : a.createdAt > b.createdAt ? -1 : 1));
      });
    } catch (error) { return failure(error); }
  }

  async get(id: string): Promise<SavedNatalResult<SavedNatalRecord | null>> {
    try {
      const ticket = this.start();
      if (!isSavedNatalId(id)) return { ok: false, code: 'invalid-input', mayHaveCommitted: false };
      const blocked = savedNatalScopeState(this.scope);
      if (blocked) return { ok: false, code: blocked, mayHaveCommitted: false };
      return this.perform(ticket, false, async (guard) => {
        const rows = await this.adapter.read(this.scope, id, guard);
        guard();
        const records = this.parse(rows);
        if (records.length > 1 || (records[0] && records[0].id !== id)) throw issue('corrupt-record');
        return records[0] ?? null;
      });
    } catch (error) { return failure(error); }
  }

  async exportEnvelope(id: string): Promise<SavedNatalResult<string | null>> {
    const result = await this.get(id);
    // A separate await can observe revocation after get() returned its snapshot.
    try {
      this.start();
      return result.ok ? { ok: true, value: result.value?.envelopeJson ?? null } : result;
    } catch { return { ok: false, code: 'stale', mayHaveCommitted: false }; }
  }

  /** Idempotent deletion of one exact owner/admission/record identity. */
  async delete(id: string): Promise<SavedNatalResult<void>> {
    try {
      const ticket = this.start();
      if (!isSavedNatalId(id)) return { ok: false, code: 'invalid-input', mayHaveCommitted: false };
      const blocked = savedNatalScopeState(this.scope);
      if (blocked) return { ok: false, code: blocked, mayHaveCommitted: false };
      const result = await this.perform(ticket, true, (guard) => this.adapter.mutate(this.scope, guard,
        () => ({ result: undefined, deleteId: id })));
      return result.ok ? { ok: true, value: undefined } : result;
    } catch (error) { return failure(error); }
  }

  /**
   * Explicit owner erasure consumes this handle, including on failure. Intent
   * is pinned to this handle's admission generation; after it commits, every
   * handle and page is fenced until the purge is acknowledged and the owner is
   * explicitly readmitted with a new generation.
   */
  async clearOwner(): Promise<SavedNatalResult<SavedNatalErasureOutcome>> {
    try {
      this.start();
      this.state = 'clearing';
      this.generation += 1;
      this.adapter.abortPending();
      const ticket = { generation: this.generation, state: 'clearing' } as const;
      const expected = this.scope.owner?.status === 'active' ? this.scope.owner.generation : 0;
      let intentCommitted = false;
      const result = await this.perform(ticket, true, async (guard) => {
        const outcome = await this.adapter.requestErasure(this.scope.ownerKey, expected, guard);
        if (outcome !== 'queued') return outcome;
        intentCommitted = true;
        await this.adapter.finishErasure(this.scope.ownerKey);
        return 'erased' as const;
      });
      if (!result.ok) return { ...result, mayHaveCommitted: result.mayHaveCommitted || intentCommitted };
      if (!this.allowed(ticket)) return { ok: false, code: 'stale', mayHaveCommitted: intentCommitted };
      return result;
    } catch (error) { return failure(error); }
    finally { this.revoke(); }
  }

  revoke(): void {
    this.state = 'revoked';
    this.generation += 1;
    try { this.adapter.abortPending(); } catch { /* No private adapter diagnostic escapes revocation. */ }
  }
}
