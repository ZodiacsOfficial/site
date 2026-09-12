import { describe, expect, it } from 'vitest';
import type { DailyChartPreference } from '../profile/daily-email-client';
import {
  derivePostChartDailyState,
  postChartStateShowsSunCapture,
} from './post-chart-state';

const CURRENT = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

const emptyPreference: DailyChartPreference = {
  enabled: false,
  pending: false,
  paused: false,
  requiresConfirmation: false,
  chartId: null,
  timezone: null,
  confirmedAt: null,
  maskedEmail: null,
};

function derive(overrides: Partial<Parameters<typeof derivePostChartDailyState>[0]> = {}) {
  return derivePostChartDailyState({
    authenticated: true,
    currentChartId: CURRENT,
    syncedChartIds: [CURRENT],
    preference: emptyPreference,
    ...overrides,
  });
}

describe('derivePostChartDailyState', () => {
  it.each([
    ['signed out', { authenticated: false }, 'device-only'],
    ['computed chart is not saved', { currentChartId: null }, 'device-only'],
    ['saved chart is not synced', { syncedChartIds: [] }, 'signed-in-unsynced'],
    ['synced chart has no preference', {}, 'synced-eligible'],
  ] as const)('%s', (_label, overrides, expected) => {
    expect(derive(overrides)?.kind).toBe(expected);
  });

  it('returns the server-owned pending chart, timezone, and mask', () => {
    expect(derive({
      preference: {
        enabled: false,
        pending: true,
        paused: false,
        requiresConfirmation: false,
        chartId: OTHER,
        timezone: 'Asia/Bangkok',
        confirmedAt: null,
        maskedEmail: 'f…@example.com',
      },
    })).toEqual({
      kind: 'pending',
      chartId: OTHER,
      timezone: 'Asia/Bangkok',
      maskedEmail: 'f…@example.com',
    });
  });

  it('keeps an active preference active when it selects another synced chart', () => {
    expect(derive({
      syncedChartIds: [CURRENT, OTHER],
      preference: {
        enabled: true,
        pending: false,
        paused: false,
        requiresConfirmation: false,
        chartId: OTHER,
        timezone: 'UTC',
        confirmedAt: '2026-07-20T00:00:00.000Z',
        maskedEmail: null,
      },
    })).toEqual({ kind: 'active', chartId: OTHER });
  });

  it('treats a missing selected chart as paused without choosing the displayed chart', () => {
    expect(derive({
      preference: {
        enabled: true,
        pending: false,
        paused: false,
        requiresConfirmation: false,
        chartId: OTHER,
        timezone: 'UTC',
        confirmedAt: '2026-07-20T00:00:00.000Z',
        maskedEmail: null,
      },
    })).toEqual({ kind: 'paused' });
  });

  it('keeps a confirmed deleted-chart pause visible even when the displayed chart is unsynced', () => {
    expect(derive({
      syncedChartIds: [],
      preference: {
        enabled: true,
        pending: false,
        paused: true,
        requiresConfirmation: false,
        chartId: null,
        timezone: 'UTC',
        confirmedAt: '2026-07-20T00:00:00.000Z',
        maskedEmail: null,
      },
    })).toEqual({ kind: 'paused' });
  });

  it('keeps a deleted-chart pause visible after the account email changes', () => {
    expect(derive({
      currentChartId: null,
      syncedChartIds: [],
      preference: {
        enabled: false,
        pending: false,
        paused: true,
        requiresConfirmation: true,
        chartId: null,
        timezone: 'UTC',
        confirmedAt: '2026-07-20T00:00:00.000Z',
        maskedEmail: null,
      },
    })).toEqual({ kind: 'paused' });
  });

  it('keeps an unsynced displayed chart in state 2 when another synced chart is active', () => {
    expect(derive({
      syncedChartIds: [OTHER],
      preference: {
        enabled: true,
        pending: false,
        paused: false,
        requiresConfirmation: false,
        chartId: OTHER,
        timezone: 'UTC',
        confirmedAt: '2026-07-20T00:00:00.000Z',
        maskedEmail: null,
      },
    })).toEqual({ kind: 'signed-in-unsynced' });
  });

  it('never calls an old recipient active after the account email changes', () => {
    expect(derive({
      preference: {
        enabled: false,
        pending: false,
        paused: false,
        requiresConfirmation: true,
        chartId: CURRENT,
        timezone: 'UTC',
        confirmedAt: '2026-07-20T00:00:00.000Z',
        maskedEmail: null,
      },
    })).toEqual({ kind: 'synced-eligible', chartId: CURRENT });
  });

  it('accepts the explicit paused shape only with a null chart id', () => {
    expect(derive({
      preference: {
        enabled: true,
        pending: false,
        paused: true,
        requiresConfirmation: false,
        chartId: null,
        timezone: 'UTC',
        confirmedAt: '2026-07-20T00:00:00.000Z',
        maskedEmail: null,
      },
    })).toEqual({ kind: 'paused' });
    expect(derive({
      preference: {
        enabled: true,
        pending: false,
        paused: true,
        requiresConfirmation: false,
        chartId: CURRENT,
        timezone: 'UTC',
        confirmedAt: '2026-07-20T00:00:00.000Z',
        maskedEmail: null,
      },
    })).toBeNull();
  });

  it.each([
    {
      ...emptyPreference,
      pending: true,
      chartId: CURRENT,
      timezone: null,
      maskedEmail: 'f…@example.com',
    },
    { ...emptyPreference, chartId: CURRENT },
    {
      ...emptyPreference,
      enabled: true,
      chartId: CURRENT,
      timezone: 'UTC',
      confirmedAt: null,
    },
  ])('rejects an impossible preference payload', (preference) => {
    expect(derive({ preference })).toBeNull();
  });

  it('shows the Sun alternative only in states one through four', () => {
    const states = [
      { kind: 'device-only' },
      { kind: 'signed-in-unsynced' },
      { kind: 'synced-eligible', chartId: CURRENT },
      { kind: 'pending', chartId: CURRENT, timezone: 'UTC', maskedEmail: 'f…@example.com' },
      { kind: 'active', chartId: CURRENT },
      { kind: 'paused' },
    ] as const;
    expect(states.map(postChartStateShowsSunCapture)).toEqual([
      true, true, true, true, false, false,
    ]);
  });
});
