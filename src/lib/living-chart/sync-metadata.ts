import { isAccountV2Id } from '../account-v2/storage-identity';

const SYNC_CHOICE_PREFIX = 'zodiacs.living-chart.sync-choice.v1.';
const PENDING_MUTATIONS_PREFIX = 'zodiacs.living-chart.pending-mutations.v1.';
const CONSENT_AUTHORITY_PREFIX = 'zodiacs.living-chart.consent-authority.v1.';

export function livingChartSyncChoiceKey(accountId: string): string | null {
  return isAccountV2Id(accountId) ? `${SYNC_CHOICE_PREFIX}${accountId.toLowerCase()}` : null;
}

export function livingChartPendingMutationsKey(accountId: string): string | null {
  return isAccountV2Id(accountId) ? `${PENDING_MUTATIONS_PREFIX}${accountId.toLowerCase()}` : null;
}

export function livingChartConsentAuthorityKey(accountId: string): string | null {
  return isAccountV2Id(accountId) ? `${CONSENT_AUTHORITY_PREFIX}${accountId.toLowerCase()}` : null;
}

export function livingChartSyncMetadataKeys(accountId: string): string[] {
  return [
    livingChartSyncChoiceKey(accountId),
    livingChartPendingMutationsKey(accountId),
    livingChartConsentAuthorityKey(accountId),
  ].filter((key): key is string => key !== null);
}
