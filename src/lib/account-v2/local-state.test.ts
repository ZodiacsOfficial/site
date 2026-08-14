import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_V2_LOCAL_OWNER_KEY,
  ACCOUNT_V2_RETAINED_OWNER_KEY,
  ACCOUNT_V2_STORAGE_PREFIX,
  MAX_ACCOUNT_SYNC_CHARTS,
  MAX_ACCOUNT_SYNC_METADATA_BYTES,
  accountDeletionRequestKey,
  accountPrivacyWithdrawalKey,
  accountSyncMetadataKey,
  clearAllAccountV2Metadata,
  clearConfirmedAccountDeletionRequest,
  clearConfirmedAccountPrivacyWithdrawal,
  clearCurrentAccountV2Metadata,
  createAccountSyncMetadata,
  inspectLocalAccountBoundary,
  listAccountDeletionRequests,
  lockCurrentAccountProfile,
  parseAccountSyncMetadata,
  persistAccountSyncMetadata,
  persistAccountDeletionRequest,
  persistAccountPrivacyWithdrawal,
  readAccountPrivacyWithdrawal,
  readAccountDeletionRequest,
  readAccountSyncMetadata,
  readLocalAccountOwner,
  readRetainedAccountOwner,
  recordCompletedAccountBoundaryDecision,
  retainedProfileAccessAllowed,
  retainCurrentAccountProfile,
  withAccountSyncCursor,
  withChartSyncMetadata,
  withPendingConsentOperation,
  withoutChartSyncMetadata,
  type AccountV2Storage,
} from './local-state';

const ACCOUNT_A = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_B = '22222222-2222-4222-8222-222222222222';
const INSTALL_ID = '33333333-3333-4333-8333-333333333333';
const INSTALL_ID_B = '77777777-7777-4777-8777-777777777777';
const CHART_A = '44444444-4444-4444-8444-444444444444';
const CHART_B = '55555555-5555-4555-8555-555555555555';
const MUTATION_A = '66666666-6666-4666-8666-666666666666';
const FINGERPRINT_A = 'a'.repeat(64);
const RECOVERY_SECRET = 'A'.repeat(43);

class MemoryStorage implements AccountV2Storage {
  readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

function metadata(accountId = ACCOUNT_A) {
  const value = createAccountSyncMetadata(
    accountId,
    accountId === ACCOUNT_B ? INSTALL_ID_B : INSTALL_ID,
  );
  if (!value) throw new Error('test metadata must be valid');
  return value;
}

describe('account-scoped synchronization metadata', () => {
  it('stores account namespaces independently without sensitive profile fields', () => {
    const storage = new MemoryStorage();
    const accountA = withChartSyncMetadata(metadata(ACCOUNT_A), {
      chartId: CHART_A,
      selectedForSync: true,
      serverRevision: 7,
      pendingOperation: {
        version: 1,
        operation: 'put_chart',
        mutationId: MUTATION_A,
        chartId: CHART_A,
        baseRevision: 7,
        semanticFingerprint: FINGERPRINT_A,
      },
    });
    const accountB = withChartSyncMetadata(metadata(ACCOUNT_B), {
      chartId: CHART_B,
      selectedForSync: false,
      serverRevision: 0,
      pendingOperation: null,
    });
    expect(accountA).not.toBeNull();
    expect(accountB).not.toBeNull();
    expect(accountA?.deviceId).not.toBe(accountB?.deviceId);
    expect(persistAccountSyncMetadata(storage, accountA!)).toBe(true);
    expect(persistAccountSyncMetadata(storage, accountB!)).toBe(true);

    expect(readAccountSyncMetadata(storage, ACCOUNT_A)).toEqual({
      status: 'ready',
      metadata: accountA,
    });
    expect(readAccountSyncMetadata(storage, ACCOUNT_B)).toEqual({
      status: 'ready',
      metadata: accountB,
    });
    expect(accountSyncMetadataKey(ACCOUNT_A)).not.toBe(accountSyncMetadataKey(ACCOUNT_B));

    const serialized = [...storage.values.values()].join('\n');
    expect(serialized).not.toContain('birth');
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('bearer');
    expect(serialized).not.toContain('token');
  });

  it('immutably tracks selection, server revision, strict pending operation, and cursor', () => {
    const original = metadata();
    const withChart = withChartSyncMetadata(original, {
      chartId: CHART_A,
      selectedForSync: true,
      serverRevision: 12,
      pendingOperation: {
        version: 1,
        operation: 'delete_chart',
        mutationId: MUTATION_A,
        chartId: CHART_A,
        baseRevision: 12,
        semanticFingerprint: FINGERPRINT_A,
      },
    });
    const withCursor = withAccountSyncCursor(withChart!, 'change:000012');

    expect(original).toEqual(metadata());
    expect(withCursor).toMatchObject({
      serverCursor: 'change:000012',
      charts: [{
        chartId: CHART_A,
        selectedForSync: true,
        serverRevision: 12,
        pendingOperation: {
          operation: 'delete_chart',
          mutationId: MUTATION_A,
          semanticFingerprint: FINGERPRINT_A,
        },
      }],
    });
    expect(withoutChartSyncMetadata(withCursor!, CHART_A)?.charts).toEqual([]);
  });

  it('rejects unexpected fields, versions, bounds, duplicate charts, and invalid values', () => {
    const valid = {
      ...metadata(),
      charts: [{
        chartId: CHART_A,
        selectedForSync: true,
        serverRevision: 0,
        pendingOperation: null,
      }],
    };
    expect(parseAccountSyncMetadata(JSON.stringify(valid))).not.toBeNull();
    expect(parseAccountSyncMetadata(JSON.stringify({ ...valid, email: 'private@example.com' }))).toBeNull();
    expect(parseAccountSyncMetadata(JSON.stringify({ ...valid, version: 2 }))).toBeNull();
    expect(parseAccountSyncMetadata(JSON.stringify({
      ...valid,
      charts: [{ ...valid.charts[0], birthDate: '1990-01-01' }],
    }))).toBeNull();
    expect(parseAccountSyncMetadata(JSON.stringify({
      ...valid,
      charts: [valid.charts[0], valid.charts[0]],
    }))).toBeNull();
    expect(parseAccountSyncMetadata(JSON.stringify({
      ...valid,
      charts: [{ ...valid.charts[0], serverRevision: -1 }],
    }))).toBeNull();
    expect(parseAccountSyncMetadata(JSON.stringify({
      ...valid,
      charts: [{
        ...valid.charts[0],
        pendingOperation: {
          version: 1,
          operation: 'put_chart',
          mutationId: MUTATION_A,
          chartId: CHART_A,
          baseRevision: 1,
          semanticFingerprint: FINGERPRINT_A,
        },
      }],
    }))).toBeNull();
    expect(parseAccountSyncMetadata(JSON.stringify({
      ...valid,
      serverCursor: 'bad\ncursor',
    }))).toBeNull();
    expect(parseAccountSyncMetadata(JSON.stringify({
      ...valid,
      charts: Array.from({ length: MAX_ACCOUNT_SYNC_CHARTS + 1 }, (_, index) => ({
        ...valid.charts[0],
        chartId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      })),
    }))).toBeNull();
    expect(parseAccountSyncMetadata('x'.repeat(MAX_ACCOUNT_SYNC_METADATA_BYTES + 1))).toBeNull();
  });

  it('stores consent retry identity without allowing policy data on withdrawal', () => {
    const grant = withPendingConsentOperation(metadata(), {
      version: 1,
      operation: 'consent',
      decision: 'grant',
      policyVersion: 'chart-sync-2026-08-12.v1',
      mutationId: MUTATION_A,
      semanticFingerprint: FINGERPRINT_A,
    });
    expect(grant?.pendingConsentOperation).toMatchObject({ decision: 'grant' });
    expect(parseAccountSyncMetadata(JSON.stringify({
      ...metadata(),
      pendingConsentOperation: {
        version: 1,
        operation: 'consent',
        decision: 'withdraw',
        policyVersion: 'stale-policy-must-not-travel',
        mutationId: MUTATION_A,
        semanticFingerprint: FINGERPRINT_A,
      },
    }))).toBeNull();
  });

  it('rejects a record whose embedded owner differs from its account namespace', () => {
    const storage = new MemoryStorage();
    storage.setItem(accountSyncMetadataKey(ACCOUNT_A)!, JSON.stringify(metadata(ACCOUNT_B)));
    expect(readAccountSyncMetadata(storage, ACCOUNT_A)).toEqual({
      status: 'invalid',
      reason: 'owner-mismatch',
    });
  });
});

describe('local profile account boundary', () => {
  it('requires import, clear, or cancel for unowned data without changing storage', () => {
    const storage = new MemoryStorage();
    const before = new Map(storage.values);
    expect(inspectLocalAccountBoundary(storage, ACCOUNT_A, true)).toEqual({
      status: 'decision-required',
      reason: 'unowned-local-data',
      authenticatedAccountId: ACCOUNT_A,
      localOwnerAccountId: null,
      decisions: ['import', 'clear', 'cancel'],
    });
    expect(storage.values).toEqual(before);
  });

  it('detects an account switch and never auto-claims the prior account data', () => {
    const storage = new MemoryStorage();
    expect(recordCompletedAccountBoundaryDecision(storage, ACCOUNT_A, 'import')).toBe(true);
    const ownerBefore = storage.getItem(ACCOUNT_V2_LOCAL_OWNER_KEY);

    expect(inspectLocalAccountBoundary(storage, ACCOUNT_B, true)).toEqual({
      status: 'decision-required',
      reason: 'owner-mismatch',
      authenticatedAccountId: ACCOUNT_B,
      localOwnerAccountId: ACCOUNT_A,
      decisions: ['isolate', 'clear', 'cancel'],
    });
    expect(storage.getItem(ACCOUNT_V2_LOCAL_OWNER_KEY)).toBe(ownerBefore);
    expect(recordCompletedAccountBoundaryDecision(storage, ACCOUNT_B, 'import')).toBe(false);
    expect(storage.getItem(ACCOUNT_V2_LOCAL_OWNER_KEY)).toBe(ownerBefore);
    expect(recordCompletedAccountBoundaryDecision(storage, ACCOUNT_B, 'cancel')).toBe(true);
    expect(storage.getItem(ACCOUNT_V2_LOCAL_OWNER_KEY)).toBe(ownerBefore);
    expect(recordCompletedAccountBoundaryDecision(storage, ACCOUNT_B, 'isolate')).toBe(true);
    expect(inspectLocalAccountBoundary(storage, ACCOUNT_B, false)).toMatchObject({
      status: 'ready',
      localOwnerAccountId: ACCOUNT_B,
    });
  });

  it('binds only after an explicit completed import or clear decision', () => {
    const storage = new MemoryStorage();
    expect(recordCompletedAccountBoundaryDecision(storage, ACCOUNT_A, 'clear')).toBe(true);
    expect(inspectLocalAccountBoundary(storage, ACCOUNT_A, false)).toEqual({
      status: 'ready',
      authenticatedAccountId: ACCOUNT_A,
      localOwnerAccountId: ACCOUNT_A,
    });
  });

  it('blocks on malformed ownership data instead of treating it as unowned', () => {
    const storage = new MemoryStorage();
    storage.setItem(ACCOUNT_V2_LOCAL_OWNER_KEY, JSON.stringify({
      version: 1,
      accountId: ACCOUNT_A,
      accessToken: 'must-not-be-here',
    }));
    expect(inspectLocalAccountBoundary(storage, ACCOUNT_A, true)).toEqual({
      status: 'blocked',
      reason: 'invalid-owner-record',
    });
  });

  it('requires exact owner and retention agreement for signed-out chart access', () => {
    const storage = new MemoryStorage();
    expect(retainedProfileAccessAllowed(storage, ACCOUNT_A)).toBe(false);
    expect(retainCurrentAccountProfile(storage, ACCOUNT_A)).toBe(false);

    expect(recordCompletedAccountBoundaryDecision(storage, ACCOUNT_A, 'import')).toBe(true);
    expect(readLocalAccountOwner(storage)).toEqual({ status: 'ready', accountId: ACCOUNT_A });
    expect(readRetainedAccountOwner(storage)).toEqual({ status: 'missing' });
    expect(retainedProfileAccessAllowed(storage, ACCOUNT_A)).toBe(false);
    expect(retainCurrentAccountProfile(storage, ACCOUNT_B)).toBe(false);

    expect(retainCurrentAccountProfile(storage, ACCOUNT_A)).toBe(true);
    expect(readRetainedAccountOwner(storage)).toEqual({ status: 'ready', accountId: ACCOUNT_A });
    expect(retainedProfileAccessAllowed(storage, ACCOUNT_A)).toBe(true);
    expect(retainedProfileAccessAllowed(storage, ACCOUNT_B)).toBe(false);

    storage.setItem(ACCOUNT_V2_RETAINED_OWNER_KEY, JSON.stringify({
      version: 1,
      accountId: ACCOUNT_B,
    }));
    expect(retainedProfileAccessAllowed(storage, ACCOUNT_A)).toBe(false);
    expect(lockCurrentAccountProfile(storage, ACCOUNT_A)).toBe(false);

    storage.setItem(ACCOUNT_V2_RETAINED_OWNER_KEY, JSON.stringify({
      version: 1,
      accountId: ACCOUNT_A,
    }));
    expect(lockCurrentAccountProfile(storage, ACCOUNT_A)).toBe(true);
    expect(readRetainedAccountOwner(storage)).toEqual({ status: 'missing' });
    expect(retainedProfileAccessAllowed(storage, ACCOUNT_A)).toBe(false);
  });
});

describe('account v2 clearing boundaries', () => {
  it('persists deletion request identity separately until confirmed completion', () => {
    const storage = new MemoryStorage();
    persistAccountSyncMetadata(storage, metadata(ACCOUNT_A));
    expect(persistAccountDeletionRequest(storage, {
      version: 1,
      accountId: ACCOUNT_A,
      requestId: MUTATION_A,
      recoverySecret: RECOVERY_SECRET,
    })).toBe(true);
    expect(readAccountDeletionRequest(storage, ACCOUNT_A)).toEqual({
      status: 'ready',
      request: {
        version: 1,
        accountId: ACCOUNT_A,
        requestId: MUTATION_A,
        recoverySecret: RECOVERY_SECRET,
      },
    });
    expect(listAccountDeletionRequests(storage)).toEqual({
      status: 'ready',
      requests: [{
        version: 1,
        accountId: ACCOUNT_A,
        requestId: MUTATION_A,
        recoverySecret: RECOVERY_SECRET,
      }],
    });

    expect(clearCurrentAccountV2Metadata(storage, ACCOUNT_A)).toEqual({
      ok: true,
      removedKeys: 1,
    });
    expect(storage.getItem(accountDeletionRequestKey(ACCOUNT_A)!)).not.toBeNull();
    expect(clearConfirmedAccountDeletionRequest(storage, ACCOUNT_A, INSTALL_ID)).toBe(false);
    expect(clearConfirmedAccountDeletionRequest(storage, ACCOUNT_A, MUTATION_A)).toBe(true);
    expect(readAccountDeletionRequest(storage, ACCOUNT_A)).toEqual({ status: 'missing' });
  });

  it('fails closed when a signed-out deletion descriptor key or secret is malformed', () => {
    const storage = new MemoryStorage();
    storage.setItem(`${ACCOUNT_V2_STORAGE_PREFIX}account.${ACCOUNT_A}.deletion.v1`, JSON.stringify({
      version: 1,
      accountId: ACCOUNT_B,
      requestId: MUTATION_A,
      recoverySecret: RECOVERY_SECRET,
    }));
    expect(listAccountDeletionRequests(storage)).toEqual({ status: 'invalid' });
    expect(readAccountDeletionRequest(storage, ACCOUNT_A)).toEqual({ status: 'invalid' });
  });

  it('persists a minimal account-scoped privacy withdrawal independently of sync metadata', () => {
    const storage = new MemoryStorage();
    expect(persistAccountPrivacyWithdrawal(storage, {
      version: 1,
      accountId: ACCOUNT_A,
      mutationId: MUTATION_A,
      semanticFingerprint: FINGERPRINT_A,
    })).toBe(true);
    expect(readAccountPrivacyWithdrawal(storage, ACCOUNT_A)).toEqual({
      status: 'ready',
      request: {
        version: 1,
        accountId: ACCOUNT_A,
        mutationId: MUTATION_A,
        semanticFingerprint: FINGERPRINT_A,
      },
    });
    expect(storage.getItem(accountPrivacyWithdrawalKey(ACCOUNT_A)!)).not.toContain('email');
    expect(clearConfirmedAccountPrivacyWithdrawal(storage, ACCOUNT_A, MUTATION_A)).toBe(true);
    expect(readAccountPrivacyWithdrawal(storage, ACCOUNT_A)).toEqual({ status: 'missing' });
  });

  it('clears only the current account and matching owner marker', () => {
    const storage = new MemoryStorage();
    persistAccountSyncMetadata(storage, metadata(ACCOUNT_A));
    persistAccountSyncMetadata(storage, metadata(ACCOUNT_B));
    recordCompletedAccountBoundaryDecision(storage, ACCOUNT_A, 'import');
    storage.setItem('zodiacs.profile.v1', 'private profile remains caller-owned');

    expect(clearCurrentAccountV2Metadata(storage, ACCOUNT_A)).toEqual({
      ok: true,
      removedKeys: 2,
    });
    expect(storage.getItem(accountSyncMetadataKey(ACCOUNT_A)!)).toBeNull();
    expect(storage.getItem(ACCOUNT_V2_LOCAL_OWNER_KEY)).toBeNull();
    expect(storage.getItem(accountSyncMetadataKey(ACCOUNT_B)!)).not.toBeNull();
    expect(storage.getItem('zodiacs.profile.v1')).not.toBeNull();
  });

  it('clears ordinary v2 metadata but preserves unrelated data and deletion recovery', () => {
    const storage = new MemoryStorage();
    persistAccountSyncMetadata(storage, metadata(ACCOUNT_A));
    persistAccountSyncMetadata(storage, metadata(ACCOUNT_B));
    recordCompletedAccountBoundaryDecision(storage, ACCOUNT_A, 'import');
    persistAccountDeletionRequest(storage, {
      version: 1,
      accountId: ACCOUNT_A,
      requestId: MUTATION_A,
      recoverySecret: RECOVERY_SECRET,
    });
    storage.setItem('unrelated', 'keep');

    expect(clearAllAccountV2Metadata(storage)).toEqual({ ok: true, removedKeys: 3 });
    expect(storage.getItem(accountDeletionRequestKey(ACCOUNT_A)!)).not.toBeNull();
    expect(storage.getItem('unrelated')).toBe('keep');
  });

  it('reports a failed current-account removal instead of claiming success', () => {
    const storage = new MemoryStorage();
    persistAccountSyncMetadata(storage, metadata(ACCOUNT_A));
    const failingStorage: AccountV2Storage = {
      get length() { return storage.length; },
      getItem: (key) => storage.getItem(key),
      key: (index) => storage.key(index),
      setItem: (key, value) => storage.setItem(key, value),
      removeItem: () => { throw new Error('blocked'); },
    };

    expect(clearCurrentAccountV2Metadata(failingStorage, ACCOUNT_A)).toEqual({
      ok: false,
      removedKeys: 0,
    });
    expect(storage.getItem(accountSyncMetadataKey(ACCOUNT_A)!)).not.toBeNull();
  });
});
