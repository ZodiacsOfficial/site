import { describe, expect, it, vi } from 'vitest';
import type { AccountV2Storage } from './storage-identity';
import { ACCOUNT_V2_PROFILE_LEASE_REVOKE_KEY } from './storage-identity';
import {
  ACCOUNT_V2_PROFILE_LOCK_NAME,
  acquireAccountProfileReadLease,
  runExclusiveAccountProfileTransition,
} from './profile-lease';

type LockOptions = { mode: 'shared' | 'exclusive'; signal?: AbortSignal };

class MemoryStorage implements AccountV2Storage {
  readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

class ImmediateLocks {
  readonly calls: Array<{ name: string; options: LockOptions }> = [];

  async request<T>(
    name: string,
    options: LockOptions,
    callback: (lock: unknown) => Promise<T> | T,
  ): Promise<T> {
    this.calls.push({ name, options });
    return callback({ name, mode: options.mode });
  }
}

class RejectingLocks {
  async request<T>(
    _name: string,
    _options: LockOptions,
    _callback: (lock: unknown) => Promise<T> | T,
  ): Promise<T> {
    throw new Error('lock request rejected');
  }
}

class QueuedLocks {
  private activeShared = 0;
  private activeExclusive = false;
  private readonly queue: Array<{
    name: string;
    options: LockOptions;
    callback: (lock: unknown) => Promise<unknown> | unknown;
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  request<T>(
    name: string,
    options: LockOptions,
    callback: (lock: unknown) => Promise<T> | T,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        name,
        options,
        callback,
        resolve: (value) => resolve(value as T),
        reject,
      });
      this.drain();
    });
  }

  private drain(): void {
    if (this.activeExclusive || this.queue.length === 0) return;
    const first = this.queue[0];
    if (first.options.mode === 'exclusive') {
      if (this.activeShared > 0) return;
      this.queue.shift();
      this.activeExclusive = true;
      void Promise.resolve(first.callback({ name: first.name, mode: 'exclusive' }))
        .then(first.resolve, first.reject)
        .finally(() => {
          this.activeExclusive = false;
          this.drain();
        });
      return;
    }

    while (this.queue[0]?.options.mode === 'shared') {
      const item = this.queue.shift()!;
      this.activeShared += 1;
      void Promise.resolve(item.callback({ name: item.name, mode: 'shared' }))
        .then(item.resolve, item.reject)
        .finally(() => {
          this.activeShared -= 1;
          this.drain();
        });
    }
  }
}

describe('account profile Web Lock leases', () => {
  it('fails closed when Web Locks are unavailable', async () => {
    const storage = new MemoryStorage();
    const transition = vi.fn(() => 'changed');

    await expect(acquireAccountProfileReadLease(null)).resolves.toBeNull();
    await expect(runExclusiveAccountProfileTransition(storage, transition, null)).resolves.toEqual({
      ok: false,
      reason: 'locks-unavailable',
    });
    expect(transition).not.toHaveBeenCalled();
    expect(storage.getItem(ACCOUNT_V2_PROFILE_LEASE_REVOKE_KEY)).toBeNull();
  });

  it('holds a shared lease until its idempotent release completes', async () => {
    const locks = new ImmediateLocks();
    const lease = await acquireAccountProfileReadLease(locks);
    expect(lease).not.toBeNull();
    expect(locks.calls).toHaveLength(1);
    expect(locks.calls[0]).toMatchObject({
      name: ACCOUNT_V2_PROFILE_LOCK_NAME,
      options: { mode: 'shared' },
    });

    let finished = false;
    void lease!.released.then(() => { finished = true; });
    await Promise.resolve();
    expect(finished).toBe(false);
    lease!.release();
    lease!.release();
    await lease!.released;
    expect(finished).toBe(true);
  });

  it('returns null when a shared lock request is rejected', async () => {
    await expect(acquireAccountProfileReadLease(new RejectingLocks())).resolves.toBeNull();
  });

  it('broadcasts revocation before running an exclusive transition', async () => {
    const storage = new MemoryStorage();
    const locks = new ImmediateLocks();
    const transition = vi.fn(() => 42);

    await expect(runExclusiveAccountProfileTransition(storage, transition, locks)).resolves.toEqual({
      ok: true,
      value: 42,
    });
    expect(storage.getItem(ACCOUNT_V2_PROFILE_LEASE_REVOKE_KEY)).toBeTruthy();
    expect(transition).toHaveBeenCalledOnce();
    expect(locks.calls).toHaveLength(1);
    expect(locks.calls[0]).toMatchObject({
      name: ACCOUNT_V2_PROFILE_LOCK_NAME,
      options: { mode: 'exclusive' },
    });
  });

  it('waits for an acquired shared lease to release before mutating exclusively', async () => {
    const events: string[] = [];
    const storage = new MemoryStorage();
    const originalSetItem = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      if (key === ACCOUNT_V2_PROFILE_LEASE_REVOKE_KEY) events.push('revoked');
      originalSetItem(key, value);
    };
    const locks = new QueuedLocks();
    const lease = await acquireAccountProfileReadLease(locks);
    expect(lease).not.toBeNull();

    const exclusive = runExclusiveAccountProfileTransition(storage, () => {
      events.push('transition');
      return 'changed';
    }, locks);
    await Promise.resolve();
    expect(events).toEqual(['revoked']);

    lease!.release();
    await lease!.released;
    await expect(exclusive).resolves.toEqual({ ok: true, value: 'changed' });
    expect(events).toEqual(['revoked', 'transition']);
  });

  it('does not request an exclusive lock when revocation storage fails', async () => {
    const backing = new MemoryStorage();
    const storage: AccountV2Storage = {
      get length() { return backing.length; },
      getItem: (key) => backing.getItem(key),
      key: (index) => backing.key(index),
      removeItem: (key) => backing.removeItem(key),
      setItem: () => { throw new Error('blocked'); },
    };
    const locks = new ImmediateLocks();
    const transition = vi.fn();

    await expect(runExclusiveAccountProfileTransition(storage, transition, locks)).resolves.toEqual({
      ok: false,
      reason: 'revoke-unavailable',
    });
    expect(locks.calls).toHaveLength(0);
    expect(transition).not.toHaveBeenCalled();
  });

  it('reports a failed exclusive transition without claiming a mutation', async () => {
    const storage = new MemoryStorage();
    const locks = new ImmediateLocks();

    await expect(runExclusiveAccountProfileTransition(storage, () => {
      throw new Error('transition failed');
    }, locks)).resolves.toEqual({
      ok: false,
      reason: 'transition-failed',
    });
  });
});
