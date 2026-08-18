import { describe, expect, it } from 'vitest';
import { livingMomentCaptureSyncMode } from './capture-sync-choice';

const ACCOUNT = { kind: 'account', accountId: '81000000-0000-4000-8000-000000000001' } as const;
const GUEST = { kind: 'guest', vaultId: '82000000-0000-4000-8000-000000000001' } as const;

describe('Living Moment post-save sync choice', () => {
  it('never offers a definitive device-only choice before account consent resolves', () => {
    expect(livingMomentCaptureSyncMode({
      syncEnabled: true,
      syncDismissed: false,
      syncConsent: 'unavailable',
      syncPhase: 'checking',
      owner: ACCOUNT,
      savedOwner: ACCOUNT,
    })).toBe('checking');
    expect(livingMomentCaptureSyncMode({
      syncEnabled: true,
      syncDismissed: false,
      syncConsent: 'unavailable',
      syncPhase: 'checking',
      owner: ACCOUNT,
      savedOwner: GUEST,
    })).toBe('checking');
  });

  it('offers account device-only only for authoritative pending or withdrawn consent', () => {
    for (const syncConsent of ['pending', 'withdrawn'] as const) {
      expect(livingMomentCaptureSyncMode({
        syncEnabled: true,
        syncDismissed: false,
        syncConsent,
        syncPhase: 'device_only',
        owner: ACCOUNT,
        savedOwner: ACCOUNT,
      })).toBe('account_choice');
    }
    expect(livingMomentCaptureSyncMode({
      syncEnabled: true,
      syncDismissed: false,
      syncConsent: 'granted',
      syncPhase: 'ready',
      owner: ACCOUNT,
      savedOwner: ACCOUNT,
    })).toBe('granted');
  });

  it('keeps an exact guest save import optional even when account consent is granted', () => {
    expect(livingMomentCaptureSyncMode({
      syncEnabled: true,
      syncDismissed: false,
      syncConsent: 'granted',
      syncPhase: 'ready',
      owner: ACCOUNT,
      savedOwner: GUEST,
    })).toBe('guest_import');
  });

  it('allows a signed-out guest to dismiss the optional account offer locally', () => {
    expect(livingMomentCaptureSyncMode({
      syncEnabled: true,
      syncDismissed: false,
      syncConsent: 'unavailable',
      syncPhase: 'signed_out',
      owner: GUEST,
      savedOwner: GUEST,
    })).toBe('guest_choice');
  });
});
