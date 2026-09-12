import type { DailyChartPreference } from '../profile/daily-email-client';

export type PostChartDailyState =
  | { kind: 'device-only' }
  | { kind: 'signed-in-unsynced' }
  | { kind: 'synced-eligible'; chartId: string }
  | {
    kind: 'pending';
    chartId: string;
    timezone: string;
    maskedEmail: string | null;
  }
  | { kind: 'active'; chartId: string }
  | { kind: 'paused' };

export interface PostChartDailyStateInput {
  authenticated: boolean;
  currentChartId: string | null;
  syncedChartIds: readonly string[];
  preference: DailyChartPreference;
}

/**
 * Derives one of Fable's six stable post-chart states from successful,
 * authenticated reads. A null result means the preference payload is
 * internally contradictory; callers must keep the optional surface hidden
 * instead of re-soliciting someone whose subscription state is unknown.
 */
export function derivePostChartDailyState({
  authenticated,
  currentChartId,
  syncedChartIds,
  preference,
}: PostChartDailyStateInput): PostChartDailyState | null {
  if (!authenticated) return { kind: 'device-only' };

  const synced = new Set(syncedChartIds);

  // State 6 is account-wide and must survive the selected chart's deletion.
  // It is the only handoff state without a "this chart" qualifier.
  if (preference.paused) {
    return preference.chartId === null
      && !preference.pending
      && preference.enabled !== preference.requiresConfirmation
      && Boolean(preference.timezone)
      && Boolean(preference.confirmedAt)
      ? { kind: 'paused' }
      : null;
  }
  if (preference.enabled
    && !preference.pending
    && !preference.paused
    && !preference.requiresConfirmation
    && preference.chartId
    && preference.timezone
    && preference.confirmedAt
    && !synced.has(preference.chartId)) {
    return { kind: 'paused' };
  }

  if (!currentChartId) return { kind: 'device-only' };
  if (!synced.has(currentChartId)) return { kind: 'signed-in-unsynced' };

  if (preference.pending) {
    if (preference.enabled
      || preference.paused
      || preference.requiresConfirmation
      || !preference.chartId
      || !preference.timezone
      || preference.confirmedAt !== null) {
      return null;
    }
    return {
      kind: 'pending',
      chartId: preference.chartId,
      timezone: preference.timezone,
      maskedEmail: preference.maskedEmail,
    };
  }

  if (preference.requiresConfirmation) {
    if (preference.enabled
      || preference.pending
      || !preference.chartId
      || !preference.timezone
      || !preference.confirmedAt) {
      return null;
    }
    // Delivery is stopped until the current Auth address completes DOI.
    // Point to profile without claiming that the old recipient is active.
    return synced.has(preference.chartId)
      ? { kind: 'synced-eligible', chartId: currentChartId }
      : { kind: 'paused' };
  }

  if (preference.enabled) {
    if (!preference.timezone || !preference.confirmedAt) return null;
    if (preference.paused) return null;
    if (!preference.chartId) return null;
    // A server-selected chart that no longer exists in the account is the
    // unavailable/deleted state. Never substitute the chart on screen.
    return synced.has(preference.chartId)
      ? { kind: 'active', chartId: preference.chartId }
      : { kind: 'paused' };
  }

  if (preference.paused
    || preference.requiresConfirmation
    || preference.chartId !== null
    || preference.timezone !== null
    || preference.confirmedAt !== null) {
    return null;
  }
  return { kind: 'synced-eligible', chartId: currentChartId };
}

export function postChartStateShowsSunCapture(state: PostChartDailyState): boolean {
  return state.kind !== 'active' && state.kind !== 'paused';
}
