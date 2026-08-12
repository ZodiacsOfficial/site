import { describe, expect, it } from 'vitest';
import {
  assertAccountAuthEpochCurrent,
  beginAccountAuthEpoch,
  isAccountAuthEpochCurrent,
  readAccountAuthSnapshotAtCurrentEpoch,
} from './auth-epoch';

describe('account authentication epoch', () => {
  it('prevents a slow account-A action from writing after account B becomes current', async () => {
    const epoch = { current: 0 };
    const accountA = beginAccountAuthEpoch(epoch);
    let releaseA: (() => void) | undefined;
    const slowA = new Promise<void>((resolve) => { releaseA = resolve; });
    let wroteAccountA = false;
    const actionA = (async () => {
      await slowA;
      if (isAccountAuthEpochCurrent(epoch, accountA)) wroteAccountA = true;
    })();

    const accountB = beginAccountAuthEpoch(epoch);
    releaseA?.();
    await actionA;

    expect(wroteAccountA).toBe(false);
    expect(() => assertAccountAuthEpochCurrent(epoch, accountA))
      .toThrow('stale-auth-transition');
    expect(() => assertAccountAuthEpochCurrent(epoch, accountB)).not.toThrow();
  });

  it('ignores an initial session rejection after a newer auth event', async () => {
    const epoch = { current: 0 };
    let rejectSnapshot: ((reason: Error) => void) | undefined;
    const snapshot = readAccountAuthSnapshotAtCurrentEpoch(
      epoch,
      () => new Promise<never>((_resolve, reject) => { rejectSnapshot = reject; }),
    );

    beginAccountAuthEpoch(epoch);
    rejectSnapshot?.(new Error('late initial-session failure'));

    await expect(snapshot).resolves.toEqual({ status: 'stale' });
  });

  it('reports a current initial session rejection to its caller', async () => {
    const epoch = { current: 4 };
    const failure = new Error('current initial-session failure');

    await expect(readAccountAuthSnapshotAtCurrentEpoch(
      epoch,
      async () => { throw failure; },
    )).resolves.toEqual({ status: 'error', error: failure });
  });
});
