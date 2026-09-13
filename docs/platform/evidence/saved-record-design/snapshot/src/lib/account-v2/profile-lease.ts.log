import { ACCOUNT_V2_PROFILE_LEASE_REVOKE_KEY, type AccountV2Storage } from './storage-identity';

export const ACCOUNT_V2_PROFILE_LOCK_NAME = 'zodiacs-profile-boundary-v1';
export const ACCOUNT_V2_PROFILE_REVOKE_EVENT = 'zodiacs:profile-lease-revoke';

const EXCLUSIVE_LOCK_TIMEOUT_MS = 5_000;

export interface AccountProfileReadLease {
  release(): void;
  released: Promise<void>;
}

type LockMode = 'shared' | 'exclusive';
type LockRequestOptions = { mode: LockMode; signal?: AbortSignal };

interface LockManagerLike {
  request<T>(
    name: string,
    options: LockRequestOptions,
    callback: (lock: unknown) => Promise<T> | T,
  ): Promise<T>;
}

function browserLockManager(): LockManagerLike | null {
  if (typeof navigator === 'undefined') return null;
  try {
    const locks: unknown = Reflect.get(navigator, 'locks');
    return locks && typeof Reflect.get(locks, 'request') === 'function'
      ? locks as LockManagerLike
      : null;
  } catch {
    return null;
  }
}

/** Holds a shared lease until release; profile readers/writers are enabled only while it exists. */
export async function acquireAccountProfileReadLease(
  locks: LockManagerLike | null = browserLockManager(),
): Promise<AccountProfileReadLease | null> {
  if (!locks) return null;
  let releaseHold = () => {};
  let markAcquired: (value: boolean) => void = () => {};
  const acquired = new Promise<boolean>((resolve) => { markAcquired = resolve; });
  const hold = new Promise<void>((resolve) => { releaseHold = resolve; });
  let released = false;
  const request = locks.request(
    ACCOUNT_V2_PROFILE_LOCK_NAME,
    { mode: 'shared' },
    async () => {
      markAcquired(true);
      await hold;
    },
  ).catch(() => { markAcquired(false); });
  if (!await acquired) return null;
  return {
    release() {
      if (released) return;
      released = true;
      releaseHold();
    },
    released: request.then(() => {}),
  };
}

/**
 * Revokes same- and cross-tab shared leases before an exclusive owner transition.
 * A failed broadcast blocks the transition because a tab could otherwise keep writing.
 */
export function requestAccountProfileLeaseRevocation(storage: AccountV2Storage): boolean {
  try {
    const token = typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
    storage.setItem(ACCOUNT_V2_PROFILE_LEASE_REVOKE_KEY, token);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(ACCOUNT_V2_PROFILE_REVOKE_EVENT));
    }
    return true;
  } catch {
    return false;
  }
}

/** Runs one rare profile-owner mutation only after every current reader lease has yielded. */
export async function runExclusiveAccountProfileTransition<T>(
  storage: AccountV2Storage,
  transition: () => Promise<T> | T,
  locks: LockManagerLike | null = browserLockManager(),
): Promise<{ ok: true; value: T } | { ok: false; reason: 'locks-unavailable' | 'revoke-unavailable' | 'lock-timeout' | 'transition-failed' }> {
  if (!locks) return { ok: false, reason: 'locks-unavailable' };
  if (!requestAccountProfileLeaseRevocation(storage)) {
    return { ok: false, reason: 'revoke-unavailable' };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXCLUSIVE_LOCK_TIMEOUT_MS);
  try {
    const value = await locks.request(
      ACCOUNT_V2_PROFILE_LOCK_NAME,
      { mode: 'exclusive', signal: controller.signal },
      transition,
    );
    return { ok: true, value };
  } catch (error) {
    return {
      ok: false,
      reason: controller.signal.aborted ? 'lock-timeout' : 'transition-failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function onAccountProfileLeaseRevocation(revoke: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === ACCOUNT_V2_PROFILE_LEASE_REVOKE_KEY) revoke();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(ACCOUNT_V2_PROFILE_REVOKE_EVENT, revoke);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(ACCOUNT_V2_PROFILE_REVOKE_EVENT, revoke);
  };
}
