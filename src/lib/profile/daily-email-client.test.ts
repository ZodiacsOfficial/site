import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DailyChartPreferenceError,
  browserTimezoneChoices,
  deleteDailyChartPreference,
  getDailyChartPreference,
  maskDailyEmail,
  pauseDailyChartPreferenceForDeletion,
  resendDailyChartPreference,
  rememberDailyChartSelection,
  rememberedDailyChartSelection,
  setDailyChartPreference,
} from './daily-email-client';

const chartId = '42e29142-c015-4c09-820e-0f3de11f6f98';

afterEach(() => vi.unstubAllGlobals());

describe('daily chart preference client', () => {
  it('authenticates the read without putting the token in the URL', async () => {
    const fetcher = vi.fn(async (
      _input: Parameters<typeof fetch>[0],
      _init?: Parameters<typeof fetch>[1],
    ) => new Response(JSON.stringify({
      enabled: true,
      chartId,
      timezone: 'Europe/Lisbon',
      confirmedAt: '2026-07-20T08:00:00.000Z',
    }), { status: 200 }));

    await expect(getDailyChartPreference('browser-jwt', fetcher as unknown as typeof fetch)).resolves.toMatchObject({
      enabled: true,
      chartId,
    });
    expect(fetcher).toHaveBeenCalledWith('/api/email/chart-preference', expect.objectContaining({
      method: 'GET',
      credentials: 'same-origin',
      headers: expect.objectContaining({ Authorization: 'Bearer browser-jwt' }),
    }));
  });

  it('sends only the selected synced chart and timezone in the mutation body', async () => {
    const fetcher = vi.fn(async (
      _input: Parameters<typeof fetch>[0],
      _init?: Parameters<typeof fetch>[1],
    ) => new Response(JSON.stringify({
      ok: true,
      pending: true,
      requestId: 'receipt',
    }), { status: 200 }));

    await expect(setDailyChartPreference('browser-jwt', {
      chartId,
      timezone: 'UTC',
    }, fetcher as unknown as typeof fetch)).resolves.toEqual({ ok: true, pending: true, requestId: 'receipt' });
    const [, init] = fetcher.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({ chartId, timezone: 'UTC' });
    expect(String(init?.body)).not.toContain('browser-jwt');
  });

  it('resends the server-owned pending request without accepting a chart choice', async () => {
    const fetcher = vi.fn(async (
      _input: Parameters<typeof fetch>[0],
      _init?: Parameters<typeof fetch>[1],
    ) => new Response(JSON.stringify({
        ok: true,
        pending: true,
        requestId: 'replacement',
      }), { status: 200 }));

    await expect(resendDailyChartPreference(
      'browser-jwt',
      fetcher as unknown as typeof fetch,
    )).resolves.toEqual({ ok: true, pending: true, requestId: 'replacement' });
    const [, init] = fetcher.mock.calls[0];
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ action: 'resend' });
    expect(String(init?.body)).not.toContain(chartId);
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer browser-jwt' });
  });

  it('recognizes persisted pending and paused server states', async () => {
    const pending = vi.fn(async () => new Response(JSON.stringify({
      enabled: false,
      pending: true,
      paused: false,
      chartId,
      timezone: 'UTC',
      confirmedAt: null,
      maskedEmail: 'f…@example.com',
    }), { status: 200 }));
    const paused = vi.fn(async () => new Response(JSON.stringify({
      enabled: true,
      pending: false,
      paused: true,
      chartId: null,
      timezone: 'Europe/Lisbon',
      confirmedAt: '2026-07-20T08:00:00.000Z',
      maskedEmail: 'f…@example.com',
    }), { status: 200 }));

    await expect(getDailyChartPreference('token', pending as unknown as typeof fetch)).resolves.toMatchObject({
      pending: true,
      chartId,
      maskedEmail: 'f…@example.com',
    });
    await expect(getDailyChartPreference('token', paused as unknown as typeof fetch)).resolves.toMatchObject({
      enabled: true,
      paused: true,
      chartId: null,
    });
  });

  it('keeps a changed Auth address out of the active state until it confirms', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      enabled: false,
      pending: false,
      paused: false,
      requiresConfirmation: true,
      chartId,
      timezone: 'UTC',
      confirmedAt: '2026-07-20T08:00:00.000Z',
      maskedEmail: null,
    }), { status: 200 }));
    await expect(getDailyChartPreference(
      'token',
      fetcher as unknown as typeof fetch,
    )).resolves.toMatchObject({
      enabled: false,
      requiresConfirmation: true,
      chartId,
    });
  });

  it('parses a deleted-chart pause after the account email changes', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      enabled: false,
      pending: false,
      paused: true,
      requiresConfirmation: true,
      chartId: null,
      timezone: 'UTC',
      confirmedAt: '2026-07-20T08:00:00.000Z',
      maskedEmail: null,
    }), { status: 200 }));

    await expect(getDailyChartPreference(
      'token',
      fetcher as unknown as typeof fetch,
    )).resolves.toEqual({
      enabled: false,
      pending: false,
      paused: true,
      requiresConfirmation: true,
      chartId: null,
      timezone: 'UTC',
      confirmedAt: '2026-07-20T08:00:00.000Z',
      maskedEmail: null,
    });
  });

  it('uses the authenticated first-party endpoint for one-click profile opt-out', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
    }));
    await expect(deleteDailyChartPreference('browser-jwt', fetcher as unknown as typeof fetch)).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledWith('/api/email/chart-preference', expect.objectContaining({
      method: 'DELETE',
      headers: expect.objectContaining({ Authorization: 'Bearer browser-jwt' }),
    }));
  });

  it('pauses the selected preference before a synced chart is deleted locally', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      ok: true, paused: true, cancelled: false, selectedChartId: null,
    }), {
      status: 200,
    }));
    await expect(pauseDailyChartPreferenceForDeletion(
      'browser-jwt',
      chartId,
      fetcher as unknown as typeof fetch,
    )).resolves.toEqual({ outcome: 'paused', selectedChartId: null });
    expect(fetcher).toHaveBeenCalledWith('/api/email/chart-preference', expect.objectContaining({
      method: 'PATCH',
      headers: expect.objectContaining({ Authorization: 'Bearer browser-jwt' }),
      body: JSON.stringify({ chartId }),
    }));
  });

  it('returns the current server selection when another device changed charts', async () => {
    const replacementId = '52e29142-c015-4c09-820e-0f3de11f6f98';
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      paused: false,
      cancelled: false,
      selectedChartId: replacementId,
    }), { status: 200 }));
    await expect(pauseDailyChartPreferenceForDeletion(
      'browser-jwt',
      chartId,
      fetcher as unknown as typeof fetch,
    )).resolves.toEqual({ outcome: 'not-selected', selectedChartId: replacementId });
  });

  it('remembers only a valid selected chart id across sign-out and feature-off states', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    });
    rememberDailyChartSelection(chartId);
    expect(rememberedDailyChartSelection()).toBe(chartId);
    rememberDailyChartSelection('not-a-chart-id');
    expect(rememberedDailyChartSelection()).toBeNull();
  });

  it('rejects malformed success payloads and non-success responses', async () => {
    const malformed = vi.fn(async () => new Response('{}', { status: 200 }));
    const unavailable = vi.fn(async () => new Response('{}', { status: 503 }));
    await expect(getDailyChartPreference('token', malformed as unknown as typeof fetch)).rejects.toBeInstanceOf(DailyChartPreferenceError);
    await expect(getDailyChartPreference('token', unavailable as unknown as typeof fetch)).rejects.toMatchObject({ status: 503 });
  });
});

describe('daily preference presentation helpers', () => {
  it('masks addresses without retaining the local part', () => {
    expect(maskDailyEmail('frida.kahlo@example.com')).toBe('f…@example.com');
    expect(maskDailyEmail('')).toBe('…');
  });

  it('keeps UTC first and accepts only valid IANA choices', () => {
    const choices = browserTimezoneChoices(['Europe/Lisbon', 'not/a-zone']);
    expect(choices[0]).toBe('UTC');
    expect(choices).toContain('Europe/Lisbon');
    expect(choices).not.toContain('not/a-zone');
    expect(new Set(choices).size).toBe(choices.length);
  });
});
