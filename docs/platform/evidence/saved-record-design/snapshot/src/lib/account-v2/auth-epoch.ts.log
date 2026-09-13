export interface AccountAuthEpoch {
  current: number;
}

export type AccountAuthSnapshotResult<T> =
  | { status: 'ready'; value: T }
  | { status: 'error'; error: unknown }
  | { status: 'stale' };

export function beginAccountAuthEpoch(epoch: AccountAuthEpoch): number {
  epoch.current += 1;
  return epoch.current;
}

export function isAccountAuthEpochCurrent(
  epoch: AccountAuthEpoch,
  captured: number,
): boolean {
  return epoch.current === captured;
}

export function assertAccountAuthEpochCurrent(
  epoch: AccountAuthEpoch,
  captured: number,
): void {
  if (!isAccountAuthEpochCurrent(epoch, captured)) {
    throw new Error('stale-auth-transition');
  }
}

/**
 * Reads the initial auth snapshot without letting a late resolution or
 * rejection overwrite a newer auth event. The caller invalidates the epoch on
 * every auth transition and on component cleanup.
 */
export async function readAccountAuthSnapshotAtCurrentEpoch<T>(
  epoch: AccountAuthEpoch,
  read: () => Promise<T>,
): Promise<AccountAuthSnapshotResult<T>> {
  const captured = epoch.current;
  try {
    const value = await read();
    return isAccountAuthEpochCurrent(epoch, captured)
      ? { status: 'ready', value }
      : { status: 'stale' };
  } catch (error) {
    return isAccountAuthEpochCurrent(epoch, captured)
      ? { status: 'error', error }
      : { status: 'stale' };
  }
}
