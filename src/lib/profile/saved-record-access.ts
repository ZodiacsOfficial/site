/**
 * Strict capability for local calculation records, derived from the existing
 * profile access coordinator. Importing this module opens no database and
 * subscribes to nothing; a scope is opened only by an explicit call.
 *
 * `profileAccessAllowed() === true` is never record authority by itself: in
 * account-sync-v2 mode the coordinator's exact grant and owner markers decide
 * the namespace, and in the account-free build a positively unowned device is
 * required. Every handle carries the evaluation counter it was opened under;
 * each access event advances the counter synchronously, so a delayed result
 * from a previous evaluation is withheld.
 */
import { getAccountV2BrowserStorage, type AccountV2BrowserStorage } from '../account-v2/browser-storage';
import {
  isAccountV2Id,
  readLocalAccountOwner,
  readRetainedAccountOwner,
  retainedProfileAccessAllowed,
} from '../account-v2/local-state';
import { profileAccessAllowed } from '../account-v2/profile-access-reader';
import { readProfileAccessGrant } from '../account-v2/profile-access';
import { ACCOUNT_V2_PROFILE_REVOKE_EVENT } from '../account-v2/profile-lease';
import { ACCOUNT_V2_PROFILE_LEASE_REVOKE_KEY } from '../account-v2/storage-identity';
import { parseNatalEnvelope, type NatalEnvelope } from '@zodiacs/engine/receipt';
import { savedRecordsEnabled } from './saved-record-flags';
import {
  IndexedDbSavedNatalAdapter,
  isGuestSavedNatalOwnerKey,
  SAVED_NATAL_DEVICE_TARGET,
  SavedNatalStore,
  savedNatalAdapterFailure,
  savedNatalFailureFrom,
  savedNatalScopeState,
  type SavedNatalAdmissionRow,
  type SavedNatalErasureOutcome,
  type SavedNatalFailureCode,
  type SavedNatalInventory,
  type SavedNatalResult,
  type SavedNatalScope,
} from './saved-record-store';

/** Tab-scoped explicit selection of the device guest scope while signed out with retained access. */
export const SAVED_RECORD_GUEST_VIEW_KEY = 'zodiacs.saved-records.guest-view.v1';
export const SAVED_RECORD_SCOPE_EVENT = 'zodiacs:saved-records-scope';
/** Cross-tab announcement of a record-scope change (erasure, admission); the value is opaque. */
export const SAVED_RECORD_SCOPE_KEY = 'zodiacs.saved-records.scope-change.v1';

export type SavedRecordRights = 'full' | 'read-only';
export interface SavedRecordMode {
  readonly kind: 'guest' | 'account' | 'retained';
  readonly source: 'device' | 'account-sync-v2';
  readonly accountId: string | null;
  readonly rights: SavedRecordRights;
  /** Signed out with retained account access, explicitly viewing the guest scope instead. */
  readonly guestView: boolean;
}
export type SavedRecordModeState =
  | { readonly status: 'ready'; readonly mode: SavedRecordMode }
  | { readonly status: 'disabled' | 'locked' | 'unavailable' | 'blocked'; readonly reason: string };

export interface SavedRecordDeps {
  readonly enabled: boolean;
  readonly accountSyncV2: boolean;
  readonly accessAllowed: () => boolean;
  readonly storage: AccountV2BrowserStorage | null;
  readonly randomUUID: () => string;
  readonly adapter: () => IndexedDbSavedNatalAdapter;
  readonly now?: () => Date;
}

function accountSyncV2Active(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    return document.documentElement.hasAttribute('data-account-sync-v2');
  } catch {
    // Mirror the profile reader: an unreadable boundary is never account-free.
    return true;
  }
}

export function browserSavedRecordDeps(): SavedRecordDeps {
  return {
    enabled: savedRecordsEnabled(),
    accountSyncV2: accountSyncV2Active(),
    accessAllowed: profileAccessAllowed,
    storage: getAccountV2BrowserStorage(),
    randomUUID: () => crypto.randomUUID(),
    adapter: () => new IndexedDbSavedNatalAdapter(),
  };
}

function ownerKeyFor(accountId: string): string {
  return `account:${accountId.toLowerCase()}`;
}

function guestViewSelected(storage: AccountV2BrowserStorage, accountId: string): boolean {
  try {
    return storage.session.getItem(SAVED_RECORD_GUEST_VIEW_KEY) === accountId;
  } catch {
    return false;
  }
}

/** Synchronous, fail-closed mode read. Ready never means a namespace is admitted. */
export function readSavedRecordMode(deps: SavedRecordDeps = browserSavedRecordDeps()): SavedRecordModeState {
  try {
    if (!deps.enabled) return { status: 'disabled', reason: 'flag-off' };
    if (!deps.storage) return { status: 'unavailable', reason: 'storage' };
    const owner = readLocalAccountOwner(deps.storage.local);
    if (owner.status === 'unavailable') return { status: 'unavailable', reason: 'storage' };
    if (owner.status === 'invalid') return { status: 'blocked', reason: 'owner-marker' };
    if (!deps.accountSyncV2) {
      // Account-free build: the whole device is one guest, but only when no
      // account-bound marker from an account-capable build is present.
      if (owner.status !== 'missing') return { status: 'blocked', reason: 'account-marker' };
      const retained = readRetainedAccountOwner(deps.storage.local);
      if (retained.status !== 'missing') return { status: 'blocked', reason: retained.status === 'unavailable' ? 'storage' : 'account-marker' };
      return { status: 'ready', mode: { kind: 'guest', source: 'device', accountId: null, rights: 'full', guestView: false } };
    }
    if (!deps.accessAllowed()) return { status: 'locked', reason: 'no-grant' };
    const grant = readProfileAccessGrant(deps.storage.session);
    if (!grant) return { status: 'locked', reason: 'no-grant' };
    if (grant.mode === 'unowned') {
      if (owner.status !== 'missing') return { status: 'locked', reason: 'owner-marker' };
      return { status: 'ready', mode: { kind: 'guest', source: 'account-sync-v2', accountId: null, rights: 'full', guestView: false } };
    }
    if (owner.status !== 'ready' || owner.accountId !== grant.accountId) return { status: 'locked', reason: 'owner-marker' };
    if (grant.mode === 'account') {
      // Re-authentication consumes any per-tab guest-view selection: the next
      // retained sign-out starts on the account's records again.
      try { deps.storage.session.removeItem(SAVED_RECORD_GUEST_VIEW_KEY); } catch { /* The selection is advisory. */ }
      return { status: 'ready', mode: { kind: 'account', source: 'account-sync-v2', accountId: grant.accountId, rights: 'full', guestView: false } };
    }
    if (!retainedProfileAccessAllowed(deps.storage.local, grant.accountId)) return { status: 'locked', reason: 'retention-marker' };
    if (guestViewSelected(deps.storage, grant.accountId)) {
      return { status: 'ready', mode: { kind: 'guest', source: 'account-sync-v2', accountId: grant.accountId, rights: 'full', guestView: true } };
    }
    return { status: 'ready', mode: { kind: 'retained', source: 'account-sync-v2', accountId: grant.accountId, rights: 'read-only', guestView: false } };
  } catch {
    return { status: 'unavailable', reason: 'storage' };
  }
}

let evaluation = 0;
let installed = false;
const listeners = new Set<() => void>();

function advance(): void {
  evaluation += 1;
  for (const listener of [...listeners]) {
    try { listener(); } catch { /* One listener never blocks invalidation of the others. */ }
  }
}

export function savedRecordEvaluation(): number {
  return evaluation;
}

/**
 * Installs the synchronous invalidation listeners once per page. Every access
 * change, lease revocation (same tab or another tab) and scope selection
 * advances the evaluation before any awaiting caller can resume.
 */
export function installSavedRecordScopeInvalidation(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('zodiacs:profile-access', advance);
  window.addEventListener(ACCOUNT_V2_PROFILE_REVOKE_EVENT, advance);
  window.addEventListener(SAVED_RECORD_SCOPE_EVENT, advance);
  window.addEventListener('storage', (event) => {
    if (event.key === ACCOUNT_V2_PROFILE_LEASE_REVOKE_KEY || event.key === SAVED_RECORD_SCOPE_KEY) advance();
  });
}

export function subscribeSavedRecordScope(listener: () => void): () => void {
  installSavedRecordScopeInvalidation();
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Announces a scope change made by this tab (selection, erasure, admission). */
export function announceSavedRecordScopeChange(): void {
  if (typeof window === 'undefined') { advance(); return; }
  installSavedRecordScopeInvalidation();
  window.dispatchEvent(new Event(SAVED_RECORD_SCOPE_EVENT));
  broadcastSavedRecordScopeChange();
}

/**
 * Tells other tabs only (the storage event never fires in its own tab) that
 * admissions changed, for example after an explicit keep readmitted a
 * namespace; this tab's own handle already observed the new rows.
 */
export function broadcastSavedRecordScopeChange(): void {
  if (typeof window === 'undefined') return;
  // The value carries nothing; it only has to differ from the last one.
  try { window.localStorage.setItem(SAVED_RECORD_SCOPE_KEY, `${Date.now()}:${Math.random().toString(36).slice(2)}`); } catch { /* Other tabs fail closed on their next operation instead. */ }
}

/**
 * Explicitly selects (or leaves) the device guest scope while signed out with
 * retained account access. Legacy retained charts keep the access the user
 * chose at sign-out; only the record scope changes, and only in this tab.
 */
export function selectSavedRecordGuestView(select: boolean, deps: SavedRecordDeps = browserSavedRecordDeps()): SavedRecordModeState {
  const current = readSavedRecordMode(deps);
  if (current.status !== 'ready' || current.mode.source !== 'account-sync-v2' || current.mode.accountId === null
    || (current.mode.kind !== 'retained' && !current.mode.guestView) || !deps.storage) return current;
  try {
    if (select) deps.storage.session.setItem(SAVED_RECORD_GUEST_VIEW_KEY, current.mode.accountId);
    else deps.storage.session.removeItem(SAVED_RECORD_GUEST_VIEW_KEY);
  } catch {
    return { status: 'unavailable', reason: 'storage' };
  }
  announceSavedRecordScopeChange();
  return readSavedRecordMode(deps);
}

export type SavedRecordDiscoveryStatus = 'empty' | 'guest-records' | 'pending' | 'unavailable' | 'unsupported';
export interface SavedRecordDiscovery {
  readonly status: SavedRecordDiscoveryStatus;
  readonly guestRecords: number;
}

function discoveryFailure(code: SavedNatalFailureCode): SavedRecordDiscovery {
  return { status: code === 'unsupported-storage' ? 'unsupported' : 'unavailable', guestRecords: 0 };
}

/**
 * Content-free pre-grant discovery: finishes committed erasure intents (erase
 * only), then reports whether a guest namespace holds records or an intent
 * is still pending. It creates no database, admits nothing and returns no
 * record content. With the feature off it reports empty without touching
 * storage, so the existing boundary behaviour is unchanged.
 */
export async function discoverSavedRecordBoundary(deps: SavedRecordDeps = browserSavedRecordDeps()): Promise<SavedRecordDiscovery> {
  if (!deps.enabled) return { status: 'empty', guestRecords: 0 };
  const adapter = deps.adapter();
  try {
    const recovery = await adapter.recoverPendingErasures();
    if (!recovery.ok) return discoveryFailure(recovery.code);
    const inventory = await adapter.inspect(null, () => {});
    if (inventory.pending) return { status: 'pending', guestRecords: 0 };
    if (inventory.guest?.status === 'active' && inventory.guestRecords > 0) {
      return { status: 'guest-records', guestRecords: inventory.guestRecords };
    }
    return { status: 'empty', guestRecords: 0 };
  } catch {
    return { status: 'unavailable', guestRecords: 0 };
  } finally {
    adapter.abortPending();
  }
}

export interface SavedRecordScope {
  readonly mode: SavedRecordMode;
  readonly ownerKey: string;
  readonly store: SavedNatalStore;
  readonly inventory: SavedNatalInventory;
  readonly epoch: number;
  /** Why ordinary operations are refused right now, or null when admitted. */
  readonly state: ReturnType<typeof savedNatalScopeState>;
  readonly canSave: boolean;
  close(): void;
}
export type SavedRecordScopeResult =
  | { readonly status: 'ready'; readonly scope: SavedRecordScope }
  | { readonly status: 'stale' }
  | { readonly status: 'disabled' | 'locked' | 'unavailable' | 'blocked' | 'unsupported' | 'pending'; readonly reason: string };

function scopeFailure(code: SavedNatalFailureCode): SavedRecordScopeResult {
  return code === 'unsupported-storage' ? { status: 'unsupported', reason: code }
    : code === 'erasure-pending' ? { status: 'pending', reason: code }
      : { status: 'unavailable', reason: code };
}

/**
 * Opens one record handle under the current evaluation. Recovery runs first
 * (erase only), then content-free discovery selects the namespace: the exact
 * account namespace, or the single device guest namespace, or a provisional
 * guest key that is only persisted by an explicit first save.
 */
export async function openSavedRecordScope(deps: SavedRecordDeps = browserSavedRecordDeps()): Promise<SavedRecordScopeResult> {
  installSavedRecordScopeInvalidation();
  const epoch = evaluation;
  const mode = readSavedRecordMode(deps);
  if (mode.status !== 'ready') return mode;
  const adapter = deps.adapter();
  const stillCurrent = () => evaluation === epoch;
  const guard = () => { if (!stillCurrent()) throw savedNatalAdapterFailure('stale'); };
  try {
    const recovery = await adapter.recoverPendingErasures();
    if (!stillCurrent()) { adapter.abortPending(); return { status: 'stale' }; }
    if (!recovery.ok) { adapter.abortPending(); return scopeFailure(recovery.code); }
    let ownerKey: string;
    if (mode.mode.kind === 'guest') {
      const devices = await adapter.inspect(null, guard);
      if (!stillCurrent()) { adapter.abortPending(); return { status: 'stale' }; }
      ownerKey = devices.guest?.target ?? `guest:${deps.randomUUID().toLowerCase()}`;
      if (!isGuestSavedNatalOwnerKey(ownerKey)) { adapter.abortPending(); return { status: 'unavailable', reason: 'randomness' }; }
    } else {
      ownerKey = ownerKeyFor(mode.mode.accountId!);
    }
    const inventory = await adapter.inspect(ownerKey, guard);
    if (!stillCurrent()) { adapter.abortPending(); return { status: 'stale' }; }
    const scope: SavedNatalScope = { ownerKey, device: inventory.device, owner: inventory.owner };
    const expectedMode = mode.mode;
    const store = new SavedNatalStore({
      scope,
      epoch,
      adapter,
      now: deps.now,
      randomUUID: deps.randomUUID,
      readAuthority: () => {
        const current = readSavedRecordMode(deps);
        if (current.status !== 'ready') return null;
        const sameNamespace = current.mode.kind === 'guest'
          ? expectedMode.kind === 'guest' && current.mode.guestView === expectedMode.guestView && isGuestSavedNatalOwnerKey(ownerKey)
          : current.mode.kind === expectedMode.kind && current.mode.accountId !== null && ownerKeyFor(current.mode.accountId) === ownerKey;
        return sameNamespace ? { ownerKey, epoch: evaluation, rights: current.mode.rights } : null;
      },
    });
    return {
      status: 'ready',
      scope: {
        mode: expectedMode, ownerKey, store, inventory, epoch,
        get state() { return savedNatalScopeState(store.currentScope); },
        canSave: expectedMode.rights === 'full',
        close: () => store.revoke(),
      },
    };
  } catch (error) {
    adapter.abortPending();
    const code = (error as { code?: unknown })?.code;
    return typeof code === 'string' ? scopeFailure(code as SavedNatalFailureCode) : { status: 'unavailable', reason: 'storage' };
  }
}

/** Content-free, one-shot authority to queue exactly one erasure at the observed generation. */
export interface SavedRecordEraseTicket {
  readonly target: string;
  readonly expected: number;
  /** The device admission generation the target was observed under. */
  readonly expectedDevice: number;
  readonly guestRecords: number;
}
export type SavedRecordEraseTarget = 'device' | 'guest' | { readonly accountId: string };
export type SavedRecordErasePreparation =
  | { readonly status: 'ready'; readonly ticket: SavedRecordEraseTicket }
  | { readonly status: 'absent' }
  | { readonly status: 'disabled' | 'unavailable' | 'unsupported' | 'pending'; readonly reason: string };

function erasureRow(target: SavedRecordEraseTarget, inventory: SavedNatalInventory): SavedNatalAdmissionRow | null {
  return target === 'device' ? inventory.device : target === 'guest' ? inventory.guest : inventory.owner;
}

/**
 * Pins the erasure to the admission generation observed now. Must run before
 * the exclusive transition; the transition then re-validates inside the
 * intent transaction (a rotated generation refuses the stale ticket). An
 * `absent` observation is not authority to skip: it is re-checked under the
 * transition by `confirmSavedRecordsAbsent`, because a keep in another tab can
 * admit a namespace between this observation and the transition.
 */
export async function prepareSavedRecordErasure(target: SavedRecordEraseTarget, deps: SavedRecordDeps = browserSavedRecordDeps()): Promise<SavedRecordErasePreparation> {
  if (!deps.enabled) return { status: 'disabled', reason: 'flag-off' };
  if (typeof target === 'object' && !isAccountV2Id(target.accountId)) return { status: 'unavailable', reason: 'invalid-account' };
  const adapter = deps.adapter();
  try {
    const recovery = await adapter.recoverPendingErasures();
    if (!recovery.ok) return recovery.code === 'unsupported-storage' ? { status: 'unsupported', reason: recovery.code } : { status: 'unavailable', reason: recovery.code };
    const ownerKey = typeof target === 'object' ? ownerKeyFor(target.accountId) : null;
    const inventory = await adapter.inspect(ownerKey, () => {});
    if (inventory.absent) return { status: 'absent' };
    const row = erasureRow(target, inventory);
    if (row?.status === 'pending') return { status: 'pending', reason: 'erasure-pending' };
    if (!row || row.status === 'erased') return { status: 'absent' };
    return { status: 'ready', ticket: { target: row.target, expected: row.generation,
      expectedDevice: inventory.device?.generation ?? 0,
      guestRecords: target === 'guest' ? inventory.guestRecords : 0 } };
  } catch {
    return { status: 'unavailable', reason: 'storage' };
  } finally {
    adapter.abortPending();
  }
}

/**
 * Re-checks, under the caller's exclusive transition, an absence that
 * `prepareSavedRecordErasure` observed before it. The transition has revoked
 * every reader lease, so a namespace admitted in between is already durable
 * and visible here; it is reported as `stale` and the caller refuses to
 * complete rather than reporting a whole-device removal that left records
 * behind. Nothing is created, admitted or retargeted: the caller prepares a
 * fresh ticket on its next attempt.
 */
export async function confirmSavedRecordsAbsent(
  target: SavedRecordEraseTarget,
  authorized: () => boolean,
  deps: SavedRecordDeps = browserSavedRecordDeps(),
): Promise<SavedNatalResult<'absent'>> {
  if (!deps.enabled) return { ok: false, code: 'access-denied', mayHaveCommitted: false };
  if (typeof target === 'object' && !isAccountV2Id(target.accountId)) return { ok: false, code: 'invalid-input', mayHaveCommitted: false };
  const adapter = deps.adapter();
  try {
    const guard = () => { if (!authorized()) throw savedNatalAdapterFailure('stale'); };
    guard();
    const inventory = await adapter.inspect(typeof target === 'object' ? ownerKeyFor(target.accountId) : null, guard);
    guard();
    if (inventory.absent) return { ok: true, value: 'absent' };
    const row = erasureRow(target, inventory);
    if (row?.status === 'pending') return { ok: false, code: 'erasure-pending', mayHaveCommitted: false };
    // A device erasure purges every owner admission; owner rows beside a
    // missing or erased device row are not a layout this client wrote.
    const admitted = row?.status === 'active' || (target === 'device' && inventory.owners > 0);
    return admitted ? { ok: false, code: 'stale', mayHaveCommitted: false } : { ok: true, value: 'absent' };
  } catch (error) {
    return savedNatalFailureFrom(error);
  } finally {
    adapter.abortPending();
  }
}

/**
 * Runs the two-phase erasure for a prepared ticket. The caller's `authorized`
 * predicate binds the action to its own transition (for example the panel's
 * auth epoch), deliberately not to the ordinary access evaluation, which the
 * exclusive transition revokes before this runs. `mayHaveCommitted` on failure
 * means the intent is durable and recovery will finish the exact target.
 */
export async function eraseSavedRecords(
  ticket: SavedRecordEraseTicket,
  authorized: () => boolean,
  deps: SavedRecordDeps = browserSavedRecordDeps(),
): Promise<SavedNatalResult<SavedNatalErasureOutcome>> {
  if (!deps.enabled) return { ok: false, code: 'access-denied', mayHaveCommitted: false };
  const adapter = deps.adapter();
  try {
    const guard = () => { if (!authorized()) throw savedNatalAdapterFailure('stale'); };
    const result = await adapter.erase(ticket.target, ticket.expected, ticket.expectedDevice, guard);
    if (result.ok || result.mayHaveCommitted) announceSavedRecordScopeChange();
    return result;
  } finally {
    adapter.abortPending();
  }
}

/**
 * The calculator keeps the exact receipt bytes it offers for download; the
 * store takes the envelope object and re-serializes it canonically, so the
 * stored bytes equal the offered bytes (the calculator verifies that
 * equality before confirming). Parsing lives here so the calculator's own
 * bundle carries no codec beyond the serializer it already uses.
 */
export function parseCalculationEnvelope(envelopeJson: string): NatalEnvelope | null {
  try {
    const parsed = parseNatalEnvelope(envelopeJson);
    return parsed.ok ? parsed.envelope : null;
  } catch {
    return null;
  }
}

export { SAVED_NATAL_DEVICE_TARGET };
