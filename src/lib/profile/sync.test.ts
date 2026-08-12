import { AuthSessionMissingError } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../supabase/client', () => ({
  getSupabaseClient: () => ({ auth }),
  isSupabaseConfigured: () => true,
}));

import { getSyncSession, signOutOfSync, signOutOfSyncLocal } from './sync';

describe('profile sync auth outcomes', () => {
  beforeEach(() => {
    auth.getSession.mockReset();
    auth.signOut.mockReset();
  });

  it('treats an absent or explicitly missing session as signed out', async () => {
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    await expect(getSyncSession()).resolves.toBeNull();

    auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: new AuthSessionMissingError(),
    });
    await expect(getSyncSession()).resolves.toBeNull();
  });

  it('propagates session-read failures instead of reporting signed out', async () => {
    const error = new Error('storage unavailable');
    auth.getSession.mockResolvedValue({ data: { session: null }, error });
    await expect(getSyncSession()).rejects.toBe(error);
  });

  it('propagates global and local sign-out failures', async () => {
    const globalError = new Error('global sign-out failed');
    auth.signOut.mockResolvedValueOnce({ error: globalError });
    await expect(signOutOfSync()).rejects.toBe(globalError);
    expect(auth.signOut).toHaveBeenNthCalledWith(1);

    const localError = new Error('local sign-out failed');
    auth.signOut.mockResolvedValueOnce({ error: localError });
    await expect(signOutOfSyncLocal()).rejects.toBe(localError);
    expect(auth.signOut).toHaveBeenNthCalledWith(2, { scope: 'local' });
  });

  it('resolves only after successful global and local sign-out responses', async () => {
    auth.signOut.mockResolvedValue({ error: null });
    await expect(signOutOfSync()).resolves.toBeUndefined();
    await expect(signOutOfSyncLocal()).resolves.toBeUndefined();
  });
});
