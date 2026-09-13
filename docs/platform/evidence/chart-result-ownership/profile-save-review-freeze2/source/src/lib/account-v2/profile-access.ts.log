import {
  isAccountV2Id,
  type AccountV2Storage,
} from './storage-identity';
import {
  browserProfileAccessReader,
  profileAccessAllowed,
} from './profile-access-reader';

export { profileAccessAllowed } from './profile-access-reader';
export type { AccountV2ProfileAccessReader } from './profile-access-reader';

export const ACCOUNT_V2_PROFILE_ACCESS_KEY = 'zodiacs.account-sync-v2.profile-access.v1';
export const ACCOUNT_PROFILE_ACCESS_REEVALUATE_EVENT = 'zodiacs:profile-access-reevaluate';

type ProfileAccessGrant =
  | { version: 1; mode: 'unowned' }
  | { version: 1; mode: 'retained'; accountId: string }
  | { version: 1; mode: 'account'; accountId: string };

export function setProfileAccessLeaseActive(active: boolean): boolean {
  const reader = browserProfileAccessReader();
  const method = active ? reader?.activateLease : reader?.revokeLease;
  if (typeof method !== 'function') return false;
  try {
    method.call(reader);
    return true;
  } catch {
    return false;
  }
}

export function setProfileAccessGrant(
  session: AccountV2Storage,
  accountId: string | null,
): boolean {
  const grant: ProfileAccessGrant | null = accountId === null
    ? { version: 1, mode: 'unowned' }
    : isAccountV2Id(accountId)
      ? { version: 1, mode: 'account', accountId }
      : null;
  if (!grant) return false;
  try {
    session.setItem(ACCOUNT_V2_PROFILE_ACCESS_KEY, JSON.stringify(grant));
    return true;
  } catch {
    return false;
  }
}

export function setRetainedProfileAccessGrant(
  session: AccountV2Storage,
  accountId: string,
): boolean {
  if (!isAccountV2Id(accountId)) return false;
  try {
    session.setItem(ACCOUNT_V2_PROFILE_ACCESS_KEY, JSON.stringify({
      version: 1,
      mode: 'retained',
      accountId,
    } satisfies ProfileAccessGrant));
    return true;
  } catch {
    return false;
  }
}

export function clearProfileAccessGrant(session: AccountV2Storage): void {
  try {
    session.removeItem(ACCOUNT_V2_PROFILE_ACCESS_KEY);
  } catch {
    // Failure remains fail-closed because malformed/unavailable grants are denied.
  }
}

export async function waitForProfileAccess(
  timeoutMs = 5_000,
  validate: () => boolean = () => true,
): Promise<boolean> {
  if (profileAccessAllowed() && validate()) return true;
  if (typeof window === 'undefined') return false;
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (allowed: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      window.removeEventListener('zodiacs:profile-access', onAccess);
      resolve(allowed);
    };
    const onAccess = () => {
      if (profileAccessAllowed() && validate()) finish(true);
    };
    const timeout = setTimeout(() => finish(false), timeoutMs);
    window.addEventListener('zodiacs:profile-access', onAccess);
    if (profileAccessAllowed() && validate()) finish(true);
  });
}
