import { useEffect } from 'preact/hooks';
import { getAccountV2BrowserStorage } from '../lib/account-v2/browser-storage';
import {
  inspectLocalAccountBoundary,
  lockCurrentAccountProfile,
  readLocalAccountOwner,
  readRetainedAccountOwner,
  recordCompletedAccountBoundaryDecision,
  retainedProfileAccessAllowed,
} from '../lib/account-v2/local-state';
import {
  hasAccountBoundLocalProfileData,
  sanitizeLegacyFirstReadingIdentity,
} from '../lib/account-v2/profile-boundary';
import {
  clearProfileAccessGrant,
  ACCOUNT_PROFILE_ACCESS_REEVALUATE_EVENT,
  setProfileAccessGrant,
  setProfileAccessLeaseActive,
  setRetainedProfileAccessGrant,
} from '../lib/account-v2/profile-access';
import {
  acquireAccountProfileReadLease,
  onAccountProfileLeaseRevocation,
  runExclusiveAccountProfileTransition,
  type AccountProfileReadLease,
} from '../lib/account-v2/profile-lease';

function announceAccessChange(): void {
  window.dispatchEvent(new Event('zodiacs:profile-access'));
  window.dispatchEvent(new Event('zodiacs:profile'));
}

/** Owns the tab-lifetime shared lease required by every private profile reader. */
export default function AccountProfileAccessBootstrap() {
  useEffect(() => {
    let live = true;
    let unsubscribeAuth = () => {};
    let unsubscribeRevocation = () => {};
    let authVersion = 0;
    let accessVersion = 0;
    let currentAccountId: string | null = null;
    let lease: AccountProfileReadLease | null = null;
    const browserStorage = getAccountV2BrowserStorage();

    const revoke = () => {
      accessVersion += 1;
      setProfileAccessLeaseActive(false);
      if (browserStorage) clearProfileAccessGrant(browserStorage.session);
      lease?.release();
      lease = null;
      announceAccessChange();
    };

    unsubscribeRevocation = onAccountProfileLeaseRevocation(revoke);
    if (!browserStorage) {
      revoke();
      return () => {
        live = false;
        unsubscribeRevocation();
      };
    }
    const { local, session } = browserStorage;

    const grant = async (
      mode: 'unowned' | 'retained' | 'account',
      accountId: string | null,
      expectedAuthVersion: number,
    ) => {
      const expectedAccessVersion = accessVersion;
      const nextLease = await acquireAccountProfileReadLease();
      if (!nextLease
        || !live
        || authVersion !== expectedAuthVersion
        || accessVersion !== expectedAccessVersion) {
        nextLease?.release();
        return;
      }
      const owner = readLocalAccountOwner(local);
      const stateStillValid = mode === 'unowned'
        ? owner.status === 'missing'
        : accountId !== null
          && owner.status === 'ready'
          && owner.accountId === accountId
          && (mode !== 'retained' || retainedProfileAccessAllowed(local, accountId));
      const stored = stateStillValid && (
        mode === 'retained'
          ? setRetainedProfileAccessGrant(session, accountId!)
          : setProfileAccessGrant(session, mode === 'account' ? accountId : null)
      );
      if (!stored || !setProfileAccessLeaseActive(true)) {
        clearProfileAccessGrant(session);
        nextLease.release();
        announceAccessChange();
        return;
      }
      lease = nextLease;
      announceAccessChange();
    };

    const evaluate = async (accountId: string | null, expectedAuthVersion: number) => {
      revoke();
      if (!live || authVersion !== expectedAuthVersion) return;
      // Remove the exact UTC/coordinate residue written by a brief v1 client
      // before granting any account, retained, or account-free profile lease.
      if (!sanitizeLegacyFirstReadingIdentity(local)) return;

      if (accountId === null) {
        const owner = readLocalAccountOwner(local);
        if (owner.status === 'missing') {
          await grant('unowned', null, expectedAuthVersion);
        } else if (owner.status === 'ready' && retainedProfileAccessAllowed(local, owner.accountId)) {
          await grant('retained', owner.accountId, expectedAuthVersion);
        }
        return;
      }

      let boundary = inspectLocalAccountBoundary(
        local,
        accountId,
        hasAccountBoundLocalProfileData(local),
      );
      if (boundary.status !== 'ready') return;

      if (boundary.localOwnerAccountId === null) {
        const transition = await runExclusiveAccountProfileTransition(local, () => {
          if (!live || authVersion !== expectedAuthVersion) return false;
          const current = inspectLocalAccountBoundary(
            local,
            accountId,
            hasAccountBoundLocalProfileData(local),
          );
          return current.status === 'ready'
            && current.localOwnerAccountId === null
            && recordCompletedAccountBoundaryDecision(local, accountId, 'clear');
        });
        if (!transition.ok || !transition.value) return;
        boundary = inspectLocalAccountBoundary(local, accountId, hasAccountBoundLocalProfileData(local));
        if (boundary.status !== 'ready' || boundary.localOwnerAccountId !== accountId) return;
      } else {
        const retained = readRetainedAccountOwner(local);
        if (retained.status === 'invalid' || retained.status === 'unavailable') return;
        if (retained.status === 'ready') {
          if (retained.accountId !== accountId) return;
          const transition = await runExclusiveAccountProfileTransition(
            local,
            () => live
              && authVersion === expectedAuthVersion
              && lockCurrentAccountProfile(local, accountId),
          );
          if (!transition.ok || !transition.value) return;
        }
      }
      if (!live || authVersion !== expectedAuthVersion) return;
      await grant('account', accountId, expectedAuthVersion);
    };

    void import('../lib/profile/sync').then(async (api) => {
      if (!live || !api.isSupabaseConfigured()) {
        revoke();
        return;
      }
      // Subscribe before reading the snapshot so a stale async read can never
      // restore the previous account's lease.
      unsubscribeAuth = api.onSyncAuthChange((next) => {
        authVersion += 1;
        currentAccountId = next?.user.id ?? null;
        void evaluate(currentAccountId, authVersion);
      });
      const snapshotVersion = authVersion;
      const current = await api.getSyncSession();
      if (!live || authVersion !== snapshotVersion) return;
      currentAccountId = current?.user.id ?? null;
      await evaluate(currentAccountId, snapshotVersion);
    }).catch(revoke);

    const reevaluate = () => { void evaluate(currentAccountId, authVersion); };
    window.addEventListener(ACCOUNT_PROFILE_ACCESS_REEVALUATE_EVENT, reevaluate);

    return () => {
      live = false;
      authVersion += 1;
      revoke();
      unsubscribeAuth();
      unsubscribeRevocation();
      window.removeEventListener(ACCOUNT_PROFILE_ACCESS_REEVALUATE_EVENT, reevaluate);
    };
  }, []);
  return null;
}
