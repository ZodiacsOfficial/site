/**
 * Calculation records kept on this device: find, download the exact file,
 * remove one or all, recover from an unfinished removal, and switch a
 * signed-out retained view to the guest scope. Every state is stated as it
 * is; nothing here syncs, migrates or reconstructs a legacy saved chart.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { downloadCalculationReceipt } from '../lib/receipt-download';
import { localizePath, normalizeCatalogLocale, type CatalogLocale } from '../lib/i18n';
import { formatDateTime } from '../lib/i18n/dates';
import type { SavedNatalRecord } from '../lib/profile/saved-record';
import { SAVED_RECORDS_COPY } from './saved-records-copy';

type Access = typeof import('../lib/profile/saved-record-access');
type Scope = import('../lib/profile/saved-record-access').SavedRecordScope;

interface Props {
  /** Server-computed build flag; client code cannot enable this surface. */
  enabled?: boolean;
  locale?: CatalogLocale | string;
}

type PanelState =
  | { status: 'loading' | 'disabled' | 'locked' | 'unavailable' | 'unsupported' | 'pending' | 'stale' }
  | { status: 'ready'; records: readonly SavedNatalRecord[] };

/** Display facts read from the exact record bytes; nothing is recalculated. */
export function describeRecord(record: SavedNatalRecord): { date: string; time: string | null; zone: string | null } {
  try {
    const parsed = JSON.parse(record.envelopeJson) as { receipt?: { instant?: unknown; timeKnown?: unknown;
      localResolution?: { date?: unknown; time?: unknown; timeZone?: unknown } | null } };
    const receipt = parsed?.receipt;
    const local = receipt?.localResolution;
    const timeKnown = receipt?.timeKnown === true;
    if (local && typeof local.date === 'string') {
      return { date: local.date, time: timeKnown && typeof local.time === 'string' ? local.time : null,
        zone: typeof local.timeZone === 'string' ? local.timeZone : null };
    }
    if (typeof receipt?.instant === 'string') {
      return { date: receipt.instant.slice(0, 10), time: timeKnown ? `${receipt.instant.slice(11, 16)} UTC` : null, zone: null };
    }
  } catch { /* A validated record that cannot be summarized is still listed by its label. */ }
  return { date: '', time: null, zone: null };
}

export default function SavedRecordsPanel({ enabled = false, locale: rawLocale = 'en' }: Props) {
  const locale = normalizeCatalogLocale(rawLocale);
  const copy = SAVED_RECORDS_COPY[locale];
  const [state, setState] = useState<PanelState>({ status: enabled ? 'loading' : 'disabled' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState<'all' | string | null>(null);
  const scopeRef = useRef<Scope | null>(null);
  const apiRef = useRef<Access | null>(null);
  const openRun = useRef(0);
  // Feedback belongs to the owner namespace whose records it describes. A
  // reopen that settles on a different namespace (sign-in, the guest view) or
  // on none (locked: signed out, or another account) drops it; one that keeps
  // the namespace keeps it, including a reopen that fails at the storage
  // level, where "queued but did not finish" is exactly what must stay
  // visible. `undefined` means a reopen is in flight.
  const shownOwner = useRef<string | null | undefined>(null);
  const knownOwner = useRef<string | null>(null);
  const messageOwner = useRef<string | null>(null);

  function say(text: string, owner: string | null): void {
    messageOwner.current = text ? owner : null;
    setMessage(text);
  }
  function settle(owner: string | null | 'unchanged'): void {
    const next = owner === 'unchanged' ? knownOwner.current : owner;
    knownOwner.current = next;
    shownOwner.current = next;
    if (messageOwner.current !== null && messageOwner.current !== next) say('', null);
  }
  /** Whether an outcome for `scope` may still be reported here. */
  function reportable(scope: Scope): boolean {
    return shownOwner.current === undefined || shownOwner.current === scope.ownerKey;
  }

  async function open(): Promise<void> {
    const run = ++openRun.current;
    scopeRef.current?.close();
    scopeRef.current = null;
    shownOwner.current = undefined;
    setArmed(null);
    try {
      const api = apiRef.current ?? await import('../lib/profile/saved-record-access');
      apiRef.current = api;
      const opened = await api.openSavedRecordScope();
      if (run !== openRun.current) { if (opened.status === 'ready') opened.scope.close(); return; }
      if (opened.status !== 'ready') {
        settle(opened.status === 'locked' || opened.status === 'disabled' ? null : 'unchanged');
        setState({ status: opened.status === 'blocked' ? 'unavailable' : opened.status === 'disabled' ? 'disabled' : opened.status });
        return;
      }
      scopeRef.current = opened.scope;
      if (opened.scope.state !== null) {
        // Not admitted, erased, or pending: the inventory is honestly empty or blocked.
        settle(opened.scope.ownerKey);
        setState(opened.scope.state === 'erasure-pending' ? { status: 'pending' } : { status: 'ready', records: [] });
        return;
      }
      const listed = await opened.scope.store.list();
      if (run !== openRun.current) return;
      settle(opened.scope.ownerKey);
      if (!listed.ok) {
        setState(listed.code === 'stale' || listed.code === 'access-denied' ? { status: 'stale' }
          : listed.code === 'unsupported-storage' || listed.code === 'corrupt-record' || listed.code === 'unsupported-record' ? { status: 'unsupported' }
            : listed.code === 'erasure-pending' ? { status: 'pending' } : { status: 'unavailable' });
        return;
      }
      setState({ status: 'ready', records: listed.value });
    } catch {
      if (run === openRun.current) { settle('unchanged'); setState({ status: 'unavailable' }); }
    }
  }

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    let scheduled = false;
    let unsubscribe = () => {};
    void open();
    void import('../lib/profile/saved-record-access').then((api) => {
      if (!live) return;
      apiRef.current = api;
      unsubscribe = api.subscribeSavedRecordScope(() => {
        // Invalidation is synchronous; the fresh inventory follows on the next task.
        setState((current) => (current.status === 'ready' ? { status: 'stale' } : current));
        if (scheduled) return;
        scheduled = true;
        setTimeout(() => { scheduled = false; if (live) void open(); }, 0);
      });
    }).catch(() => {});
    return () => {
      live = false;
      openRun.current += 1;
      unsubscribe();
      scopeRef.current?.close();
      scopeRef.current = null;
    };
  }, [enabled]);

  /** The download is decided at the click, synchronously, from the already verified bytes. */
  function download(record: SavedNatalRecord): void {
    const scope = scopeRef.current;
    const api = apiRef.current;
    say('', null);
    if (!scope || !api || scope.epoch !== api.savedRecordEvaluation() || state.status !== 'ready'
      || !state.records.some((entry) => entry === record)) {
      setState({ status: 'stale' });
      return;
    }
    try {
      const facts = describeRecord(record);
      downloadCalculationReceipt(record.envelopeJson, `zodiacs-calculation-record${facts.date ? `-${facts.date}` : ''}.json`);
    } catch {
      say(copy.downloadFailed, scope.ownerKey);
    }
  }

  async function remove(record: SavedNatalRecord): Promise<void> {
    const scope = scopeRef.current;
    if (!scope || busy) return;
    if (armed !== record.id) { setArmed(record.id); return; }
    setBusy(true);
    say('', null);
    try {
      const result = await scope.store.delete(record.id);
      // A removal that committed (or may have) is a fact for every open tab:
      // their inventories, download buttons and calculators re-open on it.
      // This tab re-opens below; an uncertain outcome is reconciled by that
      // fresh inventory, never by a retry.
      if (result.ok || result.mayHaveCommitted) apiRef.current?.broadcastSavedRecordScopeChange();
      if (!result.ok && !result.mayHaveCommitted && reportable(scope)) {
        say(result.code === 'stale' || result.code === 'access-denied' ? copy.staleRefresh : copy.removeFailed, scope.ownerKey);
      }
    } finally {
      setBusy(false);
      setArmed(null);
      void open();
    }
  }

  async function removeAll(): Promise<void> {
    const scope = scopeRef.current;
    if (!scope || busy) return;
    if (armed !== 'all') { setArmed('all'); return; }
    setBusy(true);
    say('', null);
    try {
      const result = await scope.store.clearOwner();
      // The outcome describes `scope`'s namespace. If ownership moved while
      // it was pending, the listing now shown is someone else's, and the
      // result is not said there; the same namespace keeps its feedback.
      if (reportable(scope)) {
        say(result.ok ? copy.removeAllDone
          : result.mayHaveCommitted ? copy.removeAllPending
            : result.code === 'stale' || result.code === 'access-denied' ? copy.staleRefresh : copy.removeAllFailed, scope.ownerKey);
      }
      apiRef.current?.announceSavedRecordScopeChange();
    } finally {
      setBusy(false);
      setArmed(null);
      void open();
    }
  }

  function switchGuestView(select: boolean): void {
    if (!apiRef.current || busy) return;
    say('', null);
    apiRef.current.selectSavedRecordGuestView(select);
  }

  if (!enabled || state.status === 'disabled') return null;
  const scope = scopeRef.current;
  const mode = scope?.mode ?? null;
  const emptyErased = scope?.state === 'owner-erased' || scope?.state === 'device-erased';
  // Guest records kept before sign-in are never listed to an account; say that they exist.
  const hiddenGuest = scope && scope.inventory.guest?.status === 'active' ? scope.inventory.guestRecords : 0;

  return (
    <section class="pf-records shell" id="calculation-records" aria-labelledby="calculation-records-heading" data-saved-records data-saved-records-state={state.status}>
      <div class="core pf-records__core">
        <div class="pf-records__head">
          <h2 id="calculation-records-heading">{copy.heading}</h2>
          <p>{copy.intro}</p>
          {mode?.kind === 'retained' && !mode.guestView && (
            <p class="pf-records__notice" data-records-retained>{copy.retainedNotice}{' '}
              <button class="pf-chart__action" type="button" disabled={busy} onClick={() => switchGuestView(true)} data-records-use-guest>{copy.useGuest}</button>
            </p>
          )}
          {mode?.guestView && (
            <p class="pf-records__notice" data-records-guest-view>{copy.guestViewNotice}{' '}
              <button class="pf-chart__action" type="button" disabled={busy} onClick={() => switchGuestView(false)} data-records-use-account>{copy.useAccount}</button>
            </p>
          )}
          {mode?.kind === 'account' && hiddenGuest > 0 && (
            <p class="pf-records__notice" data-records-hidden-guest={hiddenGuest}>{copy.hiddenGuest(hiddenGuest)}</p>
          )}
        </div>

        {state.status === 'loading' && <p class="pf-loading" role="status">…</p>}
        {state.status === 'locked' && <p class="pf-records__status" role="status">{copy.locked}</p>}
        {state.status === 'unavailable' && <p class="pf-records__status" role="status">{copy.unavailable}</p>}
        {state.status === 'unsupported' && <p class="pf-records__status" role="status">{copy.unsupported}</p>}
        {state.status === 'stale' && (
          <p class="pf-records__status" role="status">{copy.staleRefresh}{' '}
            <button class="pf-chart__action" type="button" onClick={() => void open()} data-records-refresh>↻</button>
          </p>
        )}
        {state.status === 'pending' && (
          <p class="pf-records__status" role="alert">{copy.pending}{' '}
            <button class="pf-chart__action" type="button" disabled={busy} onClick={() => void open()} data-records-recover>{copy.pendingRetry}</button>
          </p>
        )}

        {state.status === 'ready' && state.records.length === 0 && (
          <p class="pf-records__empty" data-records-empty={emptyErased ? 'erased' : 'none'}>
            {emptyErased ? copy.emptyErased : copy.empty}{' '}
            {mode?.rights === 'full' && <a href={localizePath(locale, '/birth-chart/')}>{copy.emptyLink} →</a>}
          </p>
        )}

        {state.status === 'ready' && state.records.length > 0 && (
          <>
            <p class="pf-count mono" data-records-count={state.records.length}>{copy.count(state.records.length)}</p>
            <ol class="pf-records__list">
              {state.records.map((record) => {
                const facts = describeRecord(record);
                return (
                  <li class="pf-records__item" key={record.id} data-record-id={record.id}>
                    <div class="pf-records__facts">
                      <strong>{record.label ?? facts.date}</strong>
                      <span class="mono pf-records__meta">
                        {facts.date}{facts.time ? ` · ${facts.time}` : ` · ${copy.unknownTime}`}{facts.zone ? ` · ${facts.zone}` : ''}
                      </span>
                      <span class="mono pf-records__meta">{copy.savedOn} {formatDateTime(locale, record.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    <div class="pf-chart__actions">
                      <button class="pf-chart__action" type="button" onClick={() => download(record)} data-record-download>{copy.download}</button>
                      <button
                        class="pf-chart__action pf-chart__action--danger"
                        type="button"
                        disabled={busy}
                        aria-pressed={armed === record.id}
                        onClick={() => void remove(record)}
                        data-record-remove
                      >{armed === record.id ? copy.removeConfirm : copy.remove}</button>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p class="pf-records__privacy">{copy.privacy}</p>
            <div class="pf-sync__actions">
              <button
                class="pf-chart__action pf-chart__action--danger"
                type="button"
                disabled={busy}
                aria-pressed={armed === 'all'}
                onClick={() => void removeAll()}
                data-records-remove-all
              >{armed === 'all' ? copy.removeAllConfirm : copy.removeAll}</button>
            </div>
          </>
        )}
        {message && <p class="pf-records__status" role="status" aria-live="polite" data-records-message>{message}</p>}
      </div>
    </section>
  );
}
