import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { resolveLivingChartOwnerScope } from '../living-chart/owner';
import {
  countImportableGuestLivingMoments,
  createLivingMoment,
  deleteLivingMoment,
  exportLivingChart,
  installLivingChartAccessInvalidation,
  listLivingMoments,
  lockLivingChartAccountOwners,
  setLivingChartAuthenticatedAccountOwner,
  subscribeLivingChart,
  updateLivingMoment,
} from '../living-chart/store';
import type {
  CreateLivingMomentInput,
  LivingChartChangeDetail,
  LivingChartOwnerScope,
  LivingChartSyncStatus,
  LivingMomentV1,
  UpdateLivingMomentInput,
} from '../living-chart/types';
import type {
  LivingChartCloudClient,
  LivingChartCloudConsent,
  LivingChartConsentState,
} from '../living-chart/cloud';
import { livingChartConsentAuthorityKey } from '../living-chart/sync-metadata';
import {
  sameLivingChartOwner as sameOwner,
  shouldSurfaceLivingChartInitializationFailure,
} from '../living-chart/initialization-guard';

type LivingChartSyncModule = typeof import('../living-chart/sync');

const DISABLED_SYNC_STATUS: LivingChartSyncStatus = {
  phase: 'disabled',
  lastSyncedAt: null,
  pendingCount: 0,
  conflictCount: 0,
  message: 'Saved on this device.',
};

export interface LivingChartState {
  owner: LivingChartOwnerScope | null;
  ownerReady: boolean;
  moments: LivingMomentV1[];
  loading: boolean;
  create(input: CreateLivingMomentInput): Promise<LivingMomentV1 | null>;
  update(id: string, patch: UpdateLivingMomentInput): Promise<LivingMomentV1 | null>;
  remove(id: string): Promise<boolean>;
  exportAs(format: 'json' | 'markdown'): Promise<string | null>;
  syncStatus: LivingChartSyncStatus;
  syncConsent: LivingChartConsentState | 'unavailable';
  guestImportCount: number;
  enableSync(): Promise<boolean>;
  withdrawSync(): Promise<boolean>;
  chooseDeviceOnly(): void;
  retrySync(): Promise<boolean>;
  resolveConflict(id: string, resolution: 'device' | 'cloud'): Promise<boolean>;
  importGuestMoments(): Promise<boolean>;
  importGuestMoment(id: string): Promise<boolean>;
  refresh(): Promise<void>;
}

export interface UseLivingChartOptions {
  /** Capture needs an owner and write path, but should not read the full timeline. */
  readMoments?: boolean;
  /** Server-computed feature flag; cloud code stays out of capture bundles when false. */
  syncEnabled?: boolean;
}

export function useLivingChart({
  readMoments = true,
  syncEnabled = false,
}: UseLivingChartOptions = {}): LivingChartState {
  const [authorityReady, setAuthorityReady] = useState(!syncEnabled);
  const [owner, setOwner] = useState<LivingChartOwnerScope | null>(null);
  const ownerRef = useRef<LivingChartOwnerScope | null>(null);
  const [moments, setMoments] = useState<LivingMomentV1[]>([]);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const request = useRef(0);
  const syncRequest = useRef(0);
  const syncModuleRef = useRef<LivingChartSyncModule | null>(null);
  const cloudRef = useRef<LivingChartCloudClient | null>(null);
  const consentRef = useRef<LivingChartCloudConsent | null>(null);
  const [syncStatus, setSyncStatus] = useState<LivingChartSyncStatus>(DISABLED_SYNC_STATUS);
  const [syncConsent, setSyncConsent] = useState<LivingChartConsentState | 'unavailable'>('unavailable');
  const [guestImportCount, setGuestImportCount] = useState(0);

  useEffect(() => {
    if (syncEnabled) lockLivingChartAccountOwners();
    setAuthorityReady(true);
  }, [syncEnabled]);

  const load = useCallback(async (candidate: LivingChartOwnerScope | null = ownerRef.current) => {
    const requestId = request.current + 1;
    request.current = requestId;
    const requestGeneration = generation.current;
    if (!candidate || !readMoments) {
      setMoments([]);
      setLoading(false);
      return;
    }
    const next = await listLivingMoments(candidate);
    if (request.current !== requestId
      || generation.current !== requestGeneration
      || !sameOwner(ownerRef.current, candidate)) return;
    setMoments(next);
    setLoading(false);
  }, [readMoments]);

  const runSync = useCallback(async (): Promise<boolean> => {
    const current = ownerRef.current;
    const sync = syncModuleRef.current;
    const cloud = cloudRef.current;
    const consent = consentRef.current;
    if (!syncEnabled || current?.kind !== 'account' || !sync || !cloud || !consent || consent.state !== 'granted') {
      return false;
    }
    const syncId = syncRequest.current + 1;
    syncRequest.current = syncId;
    setSyncStatus((status) => ({
      ...status,
      phase: 'syncing',
      message: 'Syncing your Living Chart…',
    }));
    try {
      const result = await sync.syncLivingChartNow(current, cloud, consent);
      if (syncRequest.current !== syncId || !sameOwner(ownerRef.current, current)) return false;
      setSyncStatus(result.status);
      if (result.consentInvalidated) {
        consentRef.current = { ...consent, state: 'pending' };
        setSyncConsent('pending');
      }
      if (readMoments) await load(current);
      return !result.consentInvalidated && result.status.phase !== 'error';
    } catch {
      if (syncRequest.current !== syncId || !sameOwner(ownerRef.current, current)) return false;
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      setSyncStatus((status) => ({
        ...status,
        phase: offline ? 'offline' : 'error',
        message: offline
          ? 'Offline. Changes will sync when you reconnect.'
          : 'Sync paused. Your changes are safe on this device; retry when you’re ready.',
      }));
      return false;
    }
  }, [load, readMoments, syncEnabled]);

  const initializeSync = useCallback(async (candidate: LivingChartOwnerScope | null) => {
    const initializeId = syncRequest.current + 1;
    syncRequest.current = initializeId;
    syncModuleRef.current = null;
    cloudRef.current = null;
    consentRef.current = null;
    setGuestImportCount(0);
    setSyncConsent('unavailable');
    let expectedOwner = candidate;
    if (!syncEnabled) {
      setSyncStatus(DISABLED_SYNC_STATUS);
      return;
    }
    if (!candidate) {
      setSyncStatus({
        ...DISABLED_SYNC_STATUS,
        phase: 'signed_out',
        message: 'Saved on this device. Sign in when you want it on every device.',
      });
      return;
    }
    setSyncStatus({ ...DISABLED_SYNC_STATUS, phase: 'checking', message: 'Checking sync…' });
    try {
      const [sync, cloudModule] = await Promise.all([
        import('../living-chart/sync'),
        import('../living-chart/cloud'),
      ]);
      const accountId = await cloudModule.getLivingChartCloudAccountId();
      if (syncRequest.current !== initializeId) return;
      if (!accountId) {
        setLivingChartAuthenticatedAccountOwner(null);
        setSyncStatus({
          ...DISABLED_SYNC_STATUS,
          phase: 'signed_out',
          message: 'Saved on this device. Sign in to keep it on every device.',
        });
        return;
      }
      if (candidate.kind === 'account' && candidate.accountId !== accountId) {
        setLivingChartAuthenticatedAccountOwner(null);
        ownerRef.current = null;
        setOwner(null);
        setMoments([]);
        setLoading(false);
        setSyncStatus({
          ...DISABLED_SYNC_STATUS,
          phase: 'error',
          message: 'This browser changed accounts. Living Chart is locked until the profile boundary is ready.',
        });
        return;
      }
      const target: Extract<LivingChartOwnerScope, { kind: 'account' }> = {
        kind: 'account',
        accountId,
      };
      if (!setLivingChartAuthenticatedAccountOwner(accountId)) throw new Error('living-chart-account-invalid');
      expectedOwner = target;
      if (!sameOwner(ownerRef.current, target)) {
        generation.current += 1;
        ownerRef.current = target;
        setOwner(target);
        setMoments([]);
        setLoading(true);
        void load(target);
      }
      const context = await sync.loadLivingChartCloudContext(target);
      if (syncRequest.current !== initializeId || !sameOwner(ownerRef.current, target)) return;
      if (!context) throw new Error('living-chart-cloud-unavailable');
      syncModuleRef.current = sync;
      cloudRef.current = context.cloud;
      consentRef.current = context.consent;
      setSyncConsent(context.consent.state);
      setGuestImportCount(context.importableGuestMoments);
      if (context.consent.state === 'granted') {
        void runSync();
        return;
      }
      const deviceOnly = sync.livingChartDeviceOnlyChosen(target.accountId);
      setSyncStatus({
        ...DISABLED_SYNC_STATUS,
        phase: 'device_only',
        message: deviceOnly
          ? 'Saved on this device.'
          : 'Choose whether to keep your Living Chart on every device.',
      });
    } catch {
      if (!shouldSurfaceLivingChartInitializationFailure({
        requestId: initializeId,
        currentRequestId: syncRequest.current,
        expectedOwner,
        currentOwner: ownerRef.current,
      })) return;
      setSyncStatus({
        ...DISABLED_SYNC_STATUS,
        phase: 'error',
        message: 'Sync is temporarily unavailable. Your saves are still on this device.',
      });
    }
  }, [load, runSync, syncEnabled]);

  useEffect(() => {
    if (!authorityReady) return;
    let live = true;
    const resolve = () => {
      generation.current += 1;
      const next = syncEnabled
        ? resolveLivingChartOwnerScope({ accountId: null })
        : resolveLivingChartOwnerScope();
      ownerRef.current = next;
      if (!live) return;
      setOwner(next);
      setMoments([]);
      setLoading(true);
      void load(next);
      void initializeSync(next);
    };
    const onProfileAccess = () => resolve();
    resolve();
    window.addEventListener('zodiacs:profile-access', onProfileAccess);
    const uninstallAccessInvalidation = installLivingChartAccessInvalidation();
    const unsubscribe = subscribeLivingChart((detail: LivingChartChangeDetail) => {
      if (detail.operation === 'invalidate') {
        resolve();
        return;
      }
      if (detail.owner && !sameOwner(ownerRef.current, detail.owner)) return;
      if (readMoments) void load(ownerRef.current);
    });
    return () => {
      live = false;
      generation.current += 1;
      window.removeEventListener('zodiacs:profile-access', onProfileAccess);
      uninstallAccessInvalidation();
      unsubscribe();
    };
  }, [authorityReady, initializeSync, load, readMoments, syncEnabled]);

  const create = useCallback(async (input: CreateLivingMomentInput) => {
    const current = ownerRef.current;
    if (!current) return null;
    const saved = await createLivingMoment(current, input);
    if (saved && consentRef.current?.state === 'granted') void runSync();
    return saved;
  }, [runSync]);

  const update = useCallback(async (id: string, patch: UpdateLivingMomentInput) => {
    const current = ownerRef.current;
    if (!current) return null;
    const saved = await updateLivingMoment(current, id, patch);
    if (saved && consentRef.current?.state === 'granted') void runSync();
    return saved;
  }, [runSync]);

  const remove = useCallback(async (id: string) => {
    const current = ownerRef.current;
    if (!current) return false;
    const removed = await deleteLivingMoment(current, id);
    if (removed && consentRef.current?.state === 'granted') void runSync();
    return removed;
  }, [runSync]);

  const exportAs = useCallback(async (format: 'json' | 'markdown') => {
    const current = ownerRef.current;
    return current ? exportLivingChart(current, format) : null;
  }, []);

  const enableSync = useCallback(async (): Promise<boolean> => {
    const current = ownerRef.current;
    const sync = syncModuleRef.current;
    const cloud = cloudRef.current;
    if (current?.kind !== 'account' || !sync || !cloud) return false;
    const mutationId = typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : '';
    if (!mutationId) return false;
    syncRequest.current += 1;
    await sync.quiesceLivingChartSync(current.accountId);
    if (!sameOwner(ownerRef.current, current)) return false;
    setSyncStatus((status) => ({ ...status, phase: 'syncing', message: 'Turning on sync…' }));
    try {
      const outcome = await cloud.setConsent('grant', mutationId, consentRef.current?.consentEpoch ?? 0);
      if (outcome.outcome === 'temporarily_disabled') {
        setSyncStatus((status) => ({
          ...status,
          phase: 'error',
          message: 'New cloud sync is temporarily paused. Your Living Chart remains on this device.',
        }));
        return false;
      }
      if (outcome.outcome === 'consent_epoch_limit_reached') {
        setSyncStatus((status) => ({
          ...status,
          phase: 'error',
          message: 'Cloud sync cannot be turned on for this account. Your Living Chart remains on this device.',
        }));
        return false;
      }
      const consent = outcome.consent;
      if (!sameOwner(ownerRef.current, current)) return false;
      consentRef.current = consent;
      setSyncConsent(consent.state);
      if (consent.state !== 'granted') {
        setSyncStatus({
          ...DISABLED_SYNC_STATUS,
          phase: 'device_only',
          message: 'Your sync choice changed elsewhere. Review the current setting before trying again.',
        });
        return false;
      }
      if (!await sync.reconcileLivingChartConsent(current, consent)) return false;
      sync.setLivingChartDeviceOnlyChoice(current.accountId, false);
      return runSync();
    } catch {
      if (sameOwner(ownerRef.current, current)) {
        setSyncStatus((status) => ({
          ...status,
          phase: 'error',
          message: 'Sync could not be turned on. This moment is still saved on this device.',
        }));
      }
      return false;
    }
  }, [runSync]);

  const chooseDeviceOnly = useCallback(() => {
    const current = ownerRef.current;
    const sync = syncModuleRef.current;
    if (current?.kind === 'account' && sync) {
      sync.setLivingChartDeviceOnlyChoice(current.accountId, true);
    }
    setSyncStatus({ ...DISABLED_SYNC_STATUS, phase: current?.kind === 'account' ? 'device_only' : 'signed_out' });
  }, []);

  const withdrawSync = useCallback(async (): Promise<boolean> => {
    const current = ownerRef.current;
    const sync = syncModuleRef.current;
    const cloud = cloudRef.current;
    if (current?.kind !== 'account' || !sync || !cloud || consentRef.current?.state !== 'granted') {
      return false;
    }
    const mutationId = typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : '';
    if (!mutationId) return false;
    syncRequest.current += 1;
    await sync.quiesceLivingChartSync(current.accountId);
    if (!sameOwner(ownerRef.current, current)) return false;
    setSyncStatus((status) => ({ ...status, phase: 'syncing', message: 'Turning off sync…' }));
    try {
      const outcome = await cloud.setConsent('withdraw', mutationId, consentRef.current.consentEpoch);
      if (outcome.outcome === 'temporarily_disabled') return false;
      if (outcome.outcome === 'consent_epoch_limit_reached') return false;
      const consent = outcome.consent;
      if (!sameOwner(ownerRef.current, current)) return false;
      consentRef.current = consent;
      setSyncConsent(consent.state);
      if (consent.state !== 'withdrawn') {
        setSyncStatus((status) => ({
          ...status,
          phase: 'error',
          message: 'Your sync choice changed elsewhere. Refresh before trying to turn it off again.',
        }));
        return false;
      }
      if (!await sync.reconcileLivingChartConsent(current, consent)) return false;
      sync.setLivingChartDeviceOnlyChoice(current.accountId, true);
      if (readMoments) await load(current);
      setSyncStatus({
        ...DISABLED_SYNC_STATUS,
        phase: 'device_only',
        message: 'Sync is off. Your Living Chart remains on this device.',
      });
      return true;
    } catch {
      if (sameOwner(ownerRef.current, current)) {
        setSyncStatus((status) => ({
          ...status,
          phase: 'error',
          message: 'Sync could not be turned off safely. Retry before assuming cloud copies were removed.',
        }));
      }
      return false;
    }
  }, [load, readMoments]);

  const resolveConflict = useCallback(async (
    id: string,
    resolution: 'device' | 'cloud',
  ): Promise<boolean> => {
    const current = ownerRef.current;
    const sync = syncModuleRef.current;
    if (current?.kind !== 'account' || !sync) return false;
    const resolved = await sync.resolveLivingChartConflict(current, id, resolution);
    if (!resolved) return false;
    if (readMoments) await load(current);
    return resolution === 'device' ? runSync() : true;
  }, [load, readMoments, runSync]);

  const importGuestMoments = useCallback(async (): Promise<boolean> => {
    const current = ownerRef.current;
    const sync = syncModuleRef.current;
    if (current?.kind !== 'account' || !sync) return false;
    const result = await sync.importGuestLivingChart(current);
    if (!result) return false;
    setGuestImportCount(await countImportableGuestLivingMoments(current));
    if (readMoments) await load(current);
    if (result.imported > 0 && consentRef.current?.state === 'granted') void runSync();
    return result.conflicts === 0;
  }, [load, readMoments, runSync]);

  const importGuestMoment = useCallback(async (id: string): Promise<boolean> => {
    const current = ownerRef.current;
    const sync = syncModuleRef.current;
    if (current?.kind !== 'account' || !sync) return false;
    const result = await sync.importGuestLivingChartMoment(current, id);
    if (!result || result.conflicts > 0 || (result.imported === 0 && result.alreadyPresent === 0)) return false;
    setGuestImportCount(await countImportableGuestLivingMoments(current));
    if (readMoments) await load(current);
    if (consentRef.current?.state === 'granted') void runSync();
    return true;
  }, [load, readMoments, runSync]);

  useEffect(() => {
    if (!syncEnabled || !authorityReady) return;
    const onOnline = () => {
      if (consentRef.current?.state === 'granted') void runSync();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [authorityReady, runSync, syncEnabled]);

  useEffect(() => {
    if (!syncEnabled || !authorityReady) return;
    let live = true;
    let unsubscribe = () => {};
    void import('../living-chart/cloud').then((cloud) => {
      if (!live) return;
      unsubscribe = cloud.subscribeLivingChartCloudAuth(() => {
        const activeOwner = ownerRef.current;
        const activeSync = syncModuleRef.current;
        if (activeOwner?.kind === 'account' && activeSync) {
          void activeSync.quiesceLivingChartSync(activeOwner.accountId);
        }
        generation.current += 1;
        syncRequest.current += 1;
        syncModuleRef.current = null;
        cloudRef.current = null;
        consentRef.current = null;
        setLivingChartAuthenticatedAccountOwner(null);
        const guest = resolveLivingChartOwnerScope({ accountId: null });
        ownerRef.current = guest;
        setOwner(guest);
        setMoments([]);
        setLoading(true);
        void load(guest);
        void initializeSync(guest);
      });
    }).catch(() => {});
    return () => {
      live = false;
      unsubscribe();
    };
  }, [authorityReady, initializeSync, syncEnabled]);

  useEffect(() => {
    if (!syncEnabled || !authorityReady) return;
    const onStorage = (event: StorageEvent) => {
      const current = ownerRef.current;
      if (current?.kind !== 'account'
        || event.key !== livingChartConsentAuthorityKey(current.accountId)) return;
      syncRequest.current += 1;
      const sync = syncModuleRef.current;
      if (sync) void sync.quiesceLivingChartSync(current.accountId);
      cloudRef.current = null;
      consentRef.current = null;
      void initializeSync(current);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [authorityReady, initializeSync, syncEnabled]);

  return {
    owner,
    ownerReady: owner !== null,
    moments,
    loading,
    create,
    update,
    remove,
    exportAs,
    syncStatus,
    syncConsent,
    guestImportCount,
    enableSync,
    withdrawSync,
    chooseDeviceOnly,
    retrySync: runSync,
    resolveConflict,
    importGuestMoments,
    importGuestMoment,
    refresh: () => load(ownerRef.current),
  };
}
