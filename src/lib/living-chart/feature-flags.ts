export const LIVING_CHART_CAPTURE_PUBLIC_FLAG = 'PUBLIC_LIVING_CHART_CAPTURE_ENABLED';
export const LIVING_CHART_SYNC_PUBLIC_FLAG = 'PUBLIC_LIVING_CHART_SYNC_ENABLED';
/** Owner-authorized public core release recorded 2026-08-18. */
export const LIVING_CHART_PUBLIC_RELEASE = true;

export interface LivingChartPublicEnv {
  PUBLIC_LIVING_CHART_CAPTURE_ENABLED?: string;
  PUBLIC_LIVING_CHART_SYNC_ENABLED?: string;
}

export function livingChartCaptureEnabled(
  env: LivingChartPublicEnv = {
    PUBLIC_LIVING_CHART_CAPTURE_ENABLED: import.meta.env.PUBLIC_LIVING_CHART_CAPTURE_ENABLED,
  },
): boolean {
  const value = env.PUBLIC_LIVING_CHART_CAPTURE_ENABLED;
  return value === undefined ? LIVING_CHART_PUBLIC_RELEASE : value === '1';
}

export function livingChartSyncEnabled(
  env: LivingChartPublicEnv = {
    PUBLIC_LIVING_CHART_SYNC_ENABLED: import.meta.env.PUBLIC_LIVING_CHART_SYNC_ENABLED,
  },
): boolean {
  const value = env.PUBLIC_LIVING_CHART_SYNC_ENABLED;
  return value === undefined ? LIVING_CHART_PUBLIC_RELEASE : value === '1';
}
