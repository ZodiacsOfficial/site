import type { LivingChartConsentState } from './cloud';
import type { LivingChartOwnerScope, LivingChartSyncPhase } from './types';

export type LivingMomentCaptureSyncMode =
  | 'none'
  | 'checking'
  | 'account_choice'
  | 'guest_choice'
  | 'guest_import'
  | 'granted';

/** Keeps a device-only promise behind an authoritative consent read. */
export function livingMomentCaptureSyncMode(input: {
  syncEnabled: boolean;
  syncDismissed: boolean;
  syncConsent: LivingChartConsentState | 'unavailable';
  syncPhase: LivingChartSyncPhase;
  owner: LivingChartOwnerScope | null;
  savedOwner: LivingChartOwnerScope;
}): LivingMomentCaptureSyncMode {
  if (!input.syncEnabled || input.syncDismissed) return 'none';
  if (input.syncConsent === 'unavailable') {
    return input.owner?.kind === 'guest' && input.syncPhase === 'signed_out'
      ? 'guest_choice'
      : 'checking';
  }
  if (input.owner?.kind === 'guest') return 'guest_choice';
  if (input.owner?.kind !== 'account') return 'checking';
  if (input.syncConsent === 'granted') {
    return input.savedOwner.kind === 'guest' ? 'guest_import' : 'granted';
  }
  return 'account_choice';
}
