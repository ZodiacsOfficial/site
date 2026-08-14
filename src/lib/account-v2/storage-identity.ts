export const ACCOUNT_V2_STORAGE_PREFIX = 'zodiacs.account-sync-v2.';
export const ACCOUNT_V2_LOCAL_OWNER_KEY = `${ACCOUNT_V2_STORAGE_PREFIX}local-owner.v1`;
export const ACCOUNT_V2_RETAINED_OWNER_KEY = `${ACCOUNT_V2_STORAGE_PREFIX}retained-owner.v1`;
export const ACCOUNT_V2_PROFILE_LEASE_REVOKE_KEY = `${ACCOUNT_V2_STORAGE_PREFIX}profile-lease-revoke.v1`;
export const ACCOUNT_V2_ID_PATTERN_SOURCE = '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

const UUID = new RegExp(ACCOUNT_V2_ID_PATTERN_SOURCE, 'u');

export interface AccountV2Storage {
  readonly length: number;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export function isAccountV2Id(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}
