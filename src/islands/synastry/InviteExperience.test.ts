import { readFile } from 'node:fs/promises';
import type { Session } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  createInviteAccountResolver,
  type InviteAccountSnapshot,
} from './InviteExperience';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function session(accountId: string): Session {
  return {
    access_token: `token-${accountId}`,
    refresh_token: `refresh-${accountId}`,
    expires_in: 3_600,
    token_type: 'bearer',
    user: { id: accountId },
  } as Session;
}

function resolverHarness(
  getSyncSession: () => Promise<Session | null>,
  getSyncedChartIds: (userId: string) => Promise<string[]>,
) {
  const commits: InviteAccountSnapshot[] = [];
  let accessAllowed = true;
  let accessGeneration = 0;
  const resolver = createInviteAccountResolver({
    getSyncSession,
    getSyncedChartIds,
    profileAccessAllowed: () => accessAllowed,
    profileAccessGeneration: () => accessGeneration,
    commit: (snapshot) => commits.push(snapshot),
  });
  return {
    commits,
    resolver,
    denyAccess() {
      accessAllowed = false;
      accessGeneration += 1;
      resolver.invalidate();
    },
  };
}

describe('InvitePanel account resolution', () => {
  it('lets account B supersede account A while A is still resolving synced charts', async () => {
    const accountA = session('account-a');
    const accountB = session('account-b');
    const initialSession = deferred<Session | null>();
    const idsA = deferred<string[]>();
    const idsB = deferred<string[]>();
    const getSyncedChartIds = vi.fn((userId: string) => (
      userId === accountA.user.id ? idsA.promise : idsB.promise
    ));
    const harness = resolverHarness(() => initialSession.promise, getSyncedChartIds);

    const resolvingA = harness.resolver.resolve();
    initialSession.resolve(accountA);
    await vi.waitFor(() => expect(getSyncedChartIds).toHaveBeenCalledWith(accountA.user.id));

    const resolvingB = harness.resolver.resolve(accountB);
    idsB.resolve(['chart-b']);
    await resolvingB;
    idsA.resolve(['chart-a']);
    await resolvingA;

    expect(harness.commits.at(-1)).toEqual({
      account: 'signed-in',
      session: accountB,
      syncedIds: ['chart-b'],
    });
    expect(harness.commits).not.toContainEqual({
      account: 'signed-in',
      session: accountA,
      syncedIds: ['chart-a'],
    });
  });

  it('discards an older getSyncSession error after account B is ready', async () => {
    const accountB = session('account-b');
    const initialSession = deferred<Session | null>();
    const harness = resolverHarness(
      () => initialSession.promise,
      async () => ['chart-b'],
    );

    const stale = harness.resolver.resolve();
    await harness.resolver.resolve(accountB);
    initialSession.reject(new Error('stale account-a snapshot failed'));
    await stale;

    expect(harness.commits.at(-1)).toEqual({
      account: 'signed-in',
      session: accountB,
      syncedIds: ['chart-b'],
    });
  });

  it('discards an older synced-chart error after account B is ready', async () => {
    const accountA = session('account-a');
    const accountB = session('account-b');
    const idsA = deferred<string[]>();
    const harness = resolverHarness(
      async () => accountA,
      (userId) => userId === accountA.user.id
        ? idsA.promise
        : Promise.resolve(['chart-b']),
    );

    const stale = harness.resolver.resolve(accountA);
    await harness.resolver.resolve(accountB);
    idsA.reject(new Error('stale account-a chart lookup failed'));
    await stale;

    expect(harness.commits.at(-1)).toEqual({
      account: 'signed-in',
      session: accountB,
      syncedIds: ['chart-b'],
    });
  });

  it('scrubs account state on denial and ignores a late synced-id completion', async () => {
    const accountA = session('account-a');
    const idsA = deferred<string[]>();
    const getSyncedChartIds = vi.fn(() => idsA.promise);
    const harness = resolverHarness(async () => accountA, getSyncedChartIds);

    const pending = harness.resolver.resolve(accountA);
    await vi.waitFor(() => expect(getSyncedChartIds).toHaveBeenCalledOnce());
    harness.denyAccess();
    expect(harness.commits.at(-1)).toEqual({
      account: 'signed-out',
      session: null,
      syncedIds: [],
    });

    idsA.resolve(['private-chart-a']);
    await pending;
    expect(harness.commits.at(-1)).toEqual({
      account: 'signed-out',
      session: null,
      syncedIds: [],
    });
  });

  it('wires profile-access denial to all account-derived InvitePanel state', async () => {
    const source = await readFile(new URL('./InviteExperience.tsx', import.meta.url), 'utf8');
    const hook = source.indexOf('useProfileAccessGeneration(() => {');
    const effect = source.indexOf('\n  });', hook);
    const denial = source.slice(hook, effect);
    expect(denial).toContain('accountResolverRef.current?.invalidate()');
    expect(denial).toContain('setSession(null)');
    expect(denial).toContain('setSyncedIds([])');
    expect(denial).toContain("setAccount('signed-out')");
  });
});
