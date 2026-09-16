/**
 * Calculation records kept on this device: find, download the exact file,
 * remove one or all, recover from an unfinished removal, and switch a
 * signed-out retained view to the guest scope. Every state is stated as it
 * is; nothing here syncs, migrates or reconstructs a legacy saved chart.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { downloadCalculationReceipt } from '../lib/receipt-download';
import { localizePath, normalizeCatalogLocale, type CatalogLocale } from '../lib/i18n';
import { formatDateTime } from '../lib/i18n/dates';
import type { SavedNatalRecord } from '../lib/profile/saved-record';
import { savedRecordsRetainedOnDevice } from '../lib/profile/saved-record-flags';
import { SAVED_RECORDS_COPY } from './saved-records-copy';

type Access = typeof import('../lib/profile/saved-record-access');
type Scope = import('../lib/profile/saved-record-access').SavedRecordScope;
type Deps = import('../lib/profile/saved-record-access').SavedRecordDeps;

interface Props {
  /** Server-computed build flag; client code cannot enable this surface. */
  enabled?: boolean;
  locale?: CatalogLocale | string;
}

type PanelState =
  | { status: 'loading' | 'disabled' | 'locked' | 'unavailable' | 'unsupported' | 'pending' | 'stale' }
  | { status: 'ready'; records: readonly SavedNatalRecord[] };

/** How long a destructive control stays armed before it returns to its safe label. */
const ARM_TIMEOUT_MS = 12_000;

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
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  // Records kept while the feature was switched on, on a build where it no
  // longer is. The panel stays invisible unless such a database really exists;
  // when it does, find, export and removal must keep working, because a
  // rollback must never strand what someone was told they could delete.
  const [retained, setRetained] = useState(false);
  const retainedRef = useRef(false);
  const depsRef = useRef<Deps | undefined>(undefined);
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
      if (retainedRef.current && !depsRef.current) depsRef.current = api.retainedSavedRecordDeps();
      const opened = await api.openSavedRecordScope(depsRef.current);
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
    let live = true;
    let scheduled = false;
    let unsubscribe = () => {};
    const start = async () => {
      if (!enabled) {
        // Enumerating databases creates nothing: a device that never had the
        // feature on takes exactly the path it takes today and renders nothing.
        if (!await savedRecordsRetainedOnDevice() || !live) return;
        retainedRef.current = true;
        setRetained(true);
        setState({ status: 'loading' });
      }
      if (!live) return;
      void open();
      await import('../lib/profile/saved-record-access').then((api) => {
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
    };
    void start();
    return () => {
      live = false;
      openRun.current += 1;
      unsubscribe();
      scopeRef.current?.close();
      scopeRef.current = null;
    };
  }, [enabled]);

  // A destructive control that is waiting for its second activation must not
  // wait forever. These records are the only copy there is, so an armed button
  // left behind — by a changed mind, a scroll away, a pocket — would turn one
  // ordinary later tap into an unrecoverable removal. Every ordinary way of
  // saying "not that" disarms it: Escape, moving the pointer down anywhere
  // else, tabbing away, or simply leaving it alone. Re-arming costs one click
  // and loses nothing, so reverting to the safe state is always the right
  // default. This is a layout effect on purpose: an ordinary effect is deferred
  // past paint, which would leave a live armed control briefly uncancellable.
  useLayoutEffect(() => {
    if (armed === null) return;
    const disarm = () => setArmed(null);
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') disarm(); };
    // Pointer, not click: Safari does not focus a button that was clicked, so
    // blur alone would never fire there.
    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      const control = sectionRef.current?.querySelector('[aria-pressed="true"]') ?? null;
      if (!target || !control || !control.contains(target)) disarm();
    };
    const timer = setTimeout(disarm, ARM_TIMEOUT_MS);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [armed]);

  /**
   * Put the keyboard back somewhere real after a row unmounts under it, but
   * only when it was inside this panel: focus that has moved on is not ours
   * to take.
   */
  function refocusPanel(): void {
    const section = sectionRef.current;
    const active = document.activeElement;
    if (!section || (active !== null && active !== document.body && !section.contains(active))) return;
    headingRef.current?.focus();
  }

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
    if (armed !== record.id) { say('', null); setArmed(record.id); return; }
    setBusy(true);
    say('', null);
    try {
      const result = await scope.store.delete(record.id);
      // A removal that committed (or may have) is a fact for every open tab:
      // their inventories, download buttons and calculators re-open on it.
      // This tab re-opens below; an uncertain outcome is reconciled by that
      // fresh inventory, never by a retry.
      if (result.ok || result.mayHaveCommitted) apiRef.current?.broadcastSavedRecordScopeChange();
      // A removal that succeeded said nothing at all before: the row simply
      // vanished. Someone who cannot see the list has to be told which of
      // "removed", "failed" and "did nothing" happened, or the natural next
      // move is to try the destructive action again.
      // An uncertain outcome stays unsaid on purpose: the fresh inventory
      // below is the honest answer, and it arrives either way.
      if (result.ok && reportable(scope)) say(copy.removeDone, scope.ownerKey);
      if (!result.ok && !result.mayHaveCommitted && reportable(scope)) {
        say(result.code === 'stale' || result.code === 'access-denied' ? copy.staleRefresh : copy.removeFailed, scope.ownerKey);
      }
    } finally {
      setBusy(false);
      setArmed(null);
      // The row this was activated from is about to unmount; without this the
      // keyboard lands on <body>, at the top of the document.
      refocusPanel();
      void open();
    }
  }

  async function removeAll(): Promise<void> {
    const scope = scopeRef.current;
    if (!scope || busy) return;
    if (armed !== 'all') { say('', null); setArmed('all'); return; }
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
      // The control this was activated from unmounts with the list.
      refocusPanel();
      void open();
    }
  }

  function switchGuestView(select: boolean): void {
    if (!apiRef.current || busy) return;
    say('', null);
    apiRef.current.selectSavedRecordGuestView(select, depsRef.current);
  }

  if ((!enabled && !retained) || state.status === 'disabled') return null;
  const scope = scopeRef.current;
  const mode = scope?.mode ?? null;
  const emptyErased = scope?.state === 'owner-erased' || scope?.state === 'device-erased';
  // Guest records kept before sign-in are never listed to an account; say that they exist.
  const hiddenGuest = scope && scope.inventory.guest?.status === 'active' ? scope.inventory.guestRecords : 0;

  // An armed destructive control says what it is waiting for and how to back
  // out; otherwise the only signal is a button label someone may not be able
  // to see.
  const announcement = armed === 'all' ? copy.removeAllArmed : armed !== null ? copy.removeArmed : message;

  return (
    <section ref={sectionRef} class="pf-records shell" id="calculation-records" aria-labelledby="calculation-records-heading" data-saved-records data-saved-records-state={state.status}>
      <div class="core pf-records__core">
        {/* Present from the first render and empty: an announcement has to be a
            text change inside a region that already exists, not a region and
            its text arriving in the same mutation. */}
        <p class="sr-only" role="status" aria-live="polite" data-records-live>{announcement}</p>
        <div class="pf-records__head">
          <h2 id="calculation-records-heading" ref={headingRef} tabIndex={-1}>{copy.heading}</h2>
          <p>{copy.intro}</p>
          {retained && (
            <p class="pf-records__notice" data-records-retired>{copy.retiredNotice}</p>
          )}
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
                        onBlur={() => setArmed((current) => (current === record.id ? null : current))}
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
                onBlur={() => setArmed((current) => (current === 'all' ? null : current))}
                data-records-remove-all
              >{armed === 'all' ? copy.removeAllConfirm : copy.removeAll}</button>
            </div>
          </>
        )}
        {/* The announcement above carries this text to assistive technology;
            repeating the roles here would say everything twice. */}
        {message && <p class="pf-records__status" data-records-message>{message}</p>}
      </div>
    </section>
  );
}
