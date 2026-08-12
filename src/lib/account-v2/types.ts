/**
 * Browser-only synchronization metadata for the optional account foundation.
 *
 * This deliberately contains no chart payload, birth input, email address, or
 * authentication credential. A future sync adapter can use these identifiers
 * to coordinate encrypted/private records without widening this local boundary.
 */
export const ACCOUNT_SYNC_METADATA_VERSION = 1 as const;

export type PendingChartOperationV1 = {
  version: typeof ACCOUNT_SYNC_METADATA_VERSION;
  operation: 'put_chart' | 'delete_chart';
  mutationId: string;
  chartId: string;
  baseRevision: number;
  semanticFingerprint: string;
};

export type PendingConsentOperationV1 =
  | {
      version: typeof ACCOUNT_SYNC_METADATA_VERSION;
      operation: 'consent';
      decision: 'grant';
      policyVersion: string;
      mutationId: string;
      semanticFingerprint: string;
    }
  | {
      version: typeof ACCOUNT_SYNC_METADATA_VERSION;
      operation: 'consent';
      decision: 'withdraw';
      mutationId: string;
      semanticFingerprint: string;
    };

export interface AccountDeletionRequestV1 {
  version: typeof ACCOUNT_SYNC_METADATA_VERSION;
  accountId: string;
  requestId: string;
  /** Client-only capability for same-origin deletion recovery; 32-byte base64url. */
  recoverySecret: string;
}

export interface AccountPrivacyWithdrawalV1 {
  version: typeof ACCOUNT_SYNC_METADATA_VERSION;
  accountId: string;
  mutationId: string;
  semanticFingerprint: string;
}

export type AccountPrivacyWithdrawalReadResult =
  | { status: 'ready'; request: AccountPrivacyWithdrawalV1 }
  | { status: 'missing' }
  | { status: 'invalid' }
  | { status: 'unavailable' };

export interface AccountSyncChartMetadataV1 {
  chartId: string;
  selectedForSync: boolean;
  serverRevision: number;
  pendingOperation: PendingChartOperationV1 | null;
}

export interface AccountSyncMetadataV1 {
  version: typeof ACCOUNT_SYNC_METADATA_VERSION;
  accountId: string;
  /** Generated inside this account namespace; never shared as a global install key. */
  deviceId: string;
  serverCursor: string | null;
  pendingConsentOperation: PendingConsentOperationV1 | null;
  charts: AccountSyncChartMetadataV1[];
}

export type AccountBoundaryDecision = 'import' | 'isolate' | 'clear' | 'cancel';

export type AccountBoundaryState =
  | {
      status: 'ready';
      authenticatedAccountId: string;
      localOwnerAccountId: string | null;
    }
  | {
      status: 'decision-required';
      reason: 'unowned-local-data';
      authenticatedAccountId: string;
      localOwnerAccountId: null;
      decisions: readonly ['import', 'clear', 'cancel'];
    }
  | {
      status: 'decision-required';
      reason: 'owner-mismatch';
      authenticatedAccountId: string;
      localOwnerAccountId: string;
      decisions: readonly ['isolate', 'clear', 'cancel'];
    }
  | {
      status: 'blocked';
      reason: 'invalid-account-id' | 'invalid-owner-record' | 'storage-unavailable';
    };

export type AccountMetadataReadResult =
  | { status: 'ready'; metadata: AccountSyncMetadataV1 }
  | { status: 'missing' }
  | {
      status: 'invalid';
      reason: 'invalid-account-id' | 'too-large' | 'schema' | 'owner-mismatch';
    }
  | { status: 'unavailable' };

export type AccountDeletionRequestReadResult =
  | { status: 'ready'; request: AccountDeletionRequestV1 }
  | { status: 'missing' }
  | { status: 'invalid' }
  | { status: 'unavailable' };

export type AccountDeletionRequestListResult =
  | { status: 'ready'; requests: AccountDeletionRequestV1[] }
  | { status: 'invalid' }
  | { status: 'unavailable' };

export interface AccountV2ClearResult {
  ok: boolean;
  removedKeys: number;
}
