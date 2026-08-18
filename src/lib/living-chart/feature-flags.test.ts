import { describe, expect, it } from 'vitest';
import { livingChartCaptureEnabled, livingChartSyncEnabled } from './feature-flags';

describe('Living Chart public flags', () => {
  it('ships capture and sync on by default', () => {
    expect(livingChartCaptureEnabled({})).toBe(true);
    expect(livingChartSyncEnabled({})).toBe(true);
  });

  it('treats only exact one as enabled when an override is present', () => {
    expect(livingChartCaptureEnabled({ PUBLIC_LIVING_CHART_CAPTURE_ENABLED: '1' })).toBe(true);
    expect(livingChartCaptureEnabled({ PUBLIC_LIVING_CHART_CAPTURE_ENABLED: 'true' })).toBe(false);
    expect(livingChartCaptureEnabled({ PUBLIC_LIVING_CHART_CAPTURE_ENABLED: '0' })).toBe(false);
    expect(livingChartSyncEnabled({ PUBLIC_LIVING_CHART_SYNC_ENABLED: '1' })).toBe(true);
    expect(livingChartSyncEnabled({ PUBLIC_LIVING_CHART_SYNC_ENABLED: '0' })).toBe(false);
    expect(livingChartSyncEnabled({ PUBLIC_LIVING_CHART_SYNC_ENABLED: ' 1 ' })).toBe(false);
  });

  it('does not imply sync from capture or capture from sync', () => {
    const captureOnly = {
      PUBLIC_LIVING_CHART_CAPTURE_ENABLED: '1',
      PUBLIC_LIVING_CHART_SYNC_ENABLED: '0',
    };
    const syncOnly = {
      PUBLIC_LIVING_CHART_CAPTURE_ENABLED: '0',
      PUBLIC_LIVING_CHART_SYNC_ENABLED: '1',
    };
    expect(livingChartCaptureEnabled(captureOnly)).toBe(true);
    expect(livingChartSyncEnabled(captureOnly)).toBe(false);
    expect(livingChartCaptureEnabled(syncOnly)).toBe(false);
    expect(livingChartSyncEnabled(syncOnly)).toBe(true);
  });
});
