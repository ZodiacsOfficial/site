export const ACCOUNT_SYNC_V2_PUBLIC_FLAG = 'PUBLIC_ACCOUNT_SYNC_V2_ENABLED';
export const ACCOUNT_SYNC_V2_PREVIEW_ACK_FLAG = 'PUBLIC_ACCOUNT_SYNC_V2_PREVIEW_ACK';

export interface AccountSyncV2PublicEnv {
  PUBLIC_ACCOUNT_SYNC_V2_ENABLED?: string;
  PUBLIC_ACCOUNT_SYNC_V2_PREVIEW_ACK?: string;
}

/** Two exact flags prevent an allowlisted preview from becoming a global cutover accidentally. */
export function accountSyncV2Enabled(
  env: AccountSyncV2PublicEnv = {
    PUBLIC_ACCOUNT_SYNC_V2_ENABLED: import.meta.env.PUBLIC_ACCOUNT_SYNC_V2_ENABLED,
    PUBLIC_ACCOUNT_SYNC_V2_PREVIEW_ACK: import.meta.env.PUBLIC_ACCOUNT_SYNC_V2_PREVIEW_ACK,
  },
): boolean {
  return env.PUBLIC_ACCOUNT_SYNC_V2_ENABLED === '1'
    && env.PUBLIC_ACCOUNT_SYNC_V2_PREVIEW_ACK === '1';
}
