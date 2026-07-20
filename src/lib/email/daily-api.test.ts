import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import chartPreferenceHandler from '../../../api/email/chart-preference';
import confirmHandler from '../../../api/email/confirm';
import unsubscribeHandler from '../../../api/email/unsubscribe';
import { createDailyChartOptInToken } from './daily-chart-token';
import { createDailyUnsubscribeToken } from './daily-unsubscribe-token';
import { createEmailOptInToken } from './opt-in-token';
import { createDailySunOptInToken } from './daily-sun-token';
import { dailyRecipientHash } from '../daily-email/identity';

const ORIGINAL_ENV = { ...process.env };
const SECRET = 'test-secret-that-is-at-least-thirty-two-characters';
const USER_ID = '110e8400-e29b-41d4-a716-446655440000';
const CHART_ID = '220e8400-e29b-41d4-a716-446655440000';
const CONTACT_ID = 'contact_12345678';
const RECIPIENT_HASH = dailyRecipientHash('person@example.com', SECRET);
const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
const SEGMENTS = Object.fromEntries(SIGNS.map((sign, index) => [sign, `segment_${index + 1}`]));

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

function configure(): void {
  Object.assign(process.env, {
    DAILY_EMAIL_ENABLED: '1',
    EMAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 're_test',
    RESEND_FROM_EMAIL: 'Zodiacs.org <hello@zodiacs.org>',
    EMAIL_CONFIRM_SECRET: SECRET,
    EMAIL_CONFIRM_BASE_URL: 'https://zodiacs.org',
    DAILY_EMAIL_UNSUBSCRIBE_SECRET: SECRET,
    DAILY_EMAIL_RECIPIENT_HASH_SECRET: SECRET,
    RESEND_DAILY_SIGN_SEGMENTS_JSON: JSON.stringify(SEGMENTS),
    PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    SUPABASE_SERVICE_ROLE_KEY: 'service_test',
  });
}

function responseRecorder() {
  return {
    statusCode: 0,
    headers: new Map<string, string>(),
    body: '',
    setHeader(name: string, value: string) { this.headers.set(name, value); },
    end(value: string) { this.body = value; },
  };
}

const SITE_HEADERS = {
  origin: 'https://zodiacs.org',
  host: 'zodiacs.org',
  authorization: 'Bearer user_access_token',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('daily sun confirmation', () => {
  it('keeps GET read-only and assigns exactly one sign segment after POST', async () => {
    configure();
    const token = createDailySunOptInToken({ email: 'person@example.com', sign: 'libra' }, SECRET);
    let requestState: 'pending' | 'confirming' | 'confirmed' = 'pending';
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/rest/v1/rpc/inspect_daily_sun_confirmation')) {
        return json(requestState === 'pending'
          ? {
            outcome: 'valid', request_kind: 'subscribe', active_sign: null,
            confirmation_state: 'pending',
          }
          : { outcome: 'invalid' });
      }
      if (url.endsWith('/rest/v1/rpc/claim_daily_sun_confirmation')) {
        if (requestState !== 'pending') return json({ outcome: 'unavailable' });
        requestState = 'confirming';
        return json({ outcome: 'claimed', request_kind: 'subscribe', active_sign: null });
      }
      if (url.endsWith('/rest/v1/rpc/complete_daily_sun_confirmation')) {
        requestState = 'confirmed';
        return json({ outcome: 'completed', active_sign: 'libra' });
      }
      if (url.includes('/rest/v1/daily_sun_preferences?') && !init?.method) {
        return json(requestState === 'confirmed' ? [{
          recipient_hash: RECIPIENT_HASH,
          sign: 'libra',
          confirmed_at: '2026-07-20T12:00:00.000Z',
        }] : []);
      }
      if (url === 'https://api.resend.com/contacts' && init?.method === 'POST') {
        return json({ id: CONTACT_ID }, 201);
      }
      if (url.endsWith(`/${CONTACT_ID}/segments`) && !init?.method) {
        return json({ data: [{ id: SEGMENTS.aries }] });
      }
      if (url.includes('/segments/')) return json({}, 200);
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);

    const getResponse = responseRecorder();
    await confirmHandler({ method: 'GET', query: { token } }, getResponse);
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body).toContain('Confirm subscription');
    expect(fetcher).toHaveBeenCalledOnce();
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('/rpc/inspect_daily_sun_confirmation');
    expect(requestState).toBe('pending');

    const postResponse = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token } }, postResponse);
    expect(postResponse.statusCode).toBe(200);
    expect(fetcher.mock.calls.filter(([url]) => String(url).startsWith('https://api.resend.com')))
      .toHaveLength(4);
    expect(requestState).toBe('confirmed');
    const segmentCalls = fetcher.mock.calls.filter(([url]) => String(url).includes('/segments/'));
    expect(segmentCalls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(1);
    expect(segmentCalls.filter(([, init]) => init?.method === 'POST').map(([url]) => String(url)))
      .toEqual([`https://api.resend.com/contacts/${CONTACT_ID}/segments/${SEGMENTS.libra}`]);
    const completionIndex = fetcher.mock.calls.findIndex(([url]) => (
      String(url).endsWith('/rest/v1/rpc/complete_daily_sun_confirmation')
    ));
    const authorityIndices = fetcher.mock.calls
      .map(([url], index) => String(url).includes('/rest/v1/daily_sun_preferences?') ? index : -1)
      .filter((index) => index >= 0);
    const firstProviderIndex = fetcher.mock.calls.findIndex(([url]) => (
      String(url).startsWith('https://api.resend.com')
    ));
    const lastProviderIndex = fetcher.mock.calls.reduce((last, [url], index) => (
      String(url).startsWith('https://api.resend.com') ? index : last
    ), -1);
    expect(authorityIndices).toHaveLength(2);
    expect(completionIndex).toBeLessThan(authorityIndices[0]!);
    expect(authorityIndices[0]!).toBeLessThan(firstProviderIndex);
    expect(lastProviderIndex).toBeLessThan(authorityIndices[1]!);
  });

  it('honors a Resend 429 before applying the serialized sign change', async () => {
    configure();
    const token = createDailySunOptInToken({ email: 'person@example.com', sign: 'libra' }, SECRET);
    let requestState: 'pending' | 'confirming' | 'confirmed' = 'pending';
    let segmentLookups = 0;
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/rest/v1/rpc/claim_daily_sun_confirmation')) {
        requestState = 'confirming';
        return json({ outcome: 'claimed', request_kind: 'subscribe', active_sign: null });
      }
      if (url.endsWith('/rest/v1/rpc/complete_daily_sun_confirmation')) {
        requestState = 'confirmed';
        return json({ outcome: 'completed', active_sign: 'libra' });
      }
      if (url.includes('/rest/v1/daily_sun_preferences?') && !init?.method) {
        return json(requestState === 'confirmed' ? [{
          recipient_hash: RECIPIENT_HASH,
          sign: 'libra',
          confirmed_at: '2026-07-20T12:00:00.000Z',
        }] : []);
      }
      if (url === 'https://api.resend.com/contacts' && init?.method === 'POST') {
        return json({ id: CONTACT_ID }, 201);
      }
      if (url.endsWith(`/${CONTACT_ID}/segments`) && !init?.method) {
        segmentLookups += 1;
        return segmentLookups === 1
          ? new Response('', { status: 429, headers: { 'retry-after': '0' } })
          : json({ data: [{ id: SEGMENTS.aries }] });
      }
      if (url.includes('/segments/')) return json({}, 200);
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token } }, response);
    expect(response.statusCode).toBe(200);
    expect(segmentLookups).toBe(2);
    expect(requestState).toBe('confirmed');
    const mutations = fetcher.mock.calls
      .filter(([url, init]) => String(url).startsWith('https://api.resend.com')
        && (init?.method === 'DELETE' || init?.method === 'POST'))
      .slice(1)
      .map(([url, init]) => `${init?.method} ${String(url)}`);
    expect(mutations).toEqual([
      `DELETE https://api.resend.com/contacts/${CONTACT_ID}/segments/${SEGMENTS.aries}`,
      `POST https://api.resend.com/contacts/${CONTACT_ID}/segments/${SEGMENTS.libra}`,
    ]);
  });

  it('does not let a superseded worker mutate provider routing', async () => {
    configure();
    const token = createDailySunOptInToken({ email: 'person@example.com', sign: 'libra' }, SECRET);
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/rest/v1/rpc/claim_daily_sun_confirmation')) {
        return json({ outcome: 'claimed', request_kind: 'sign_change', active_sign: 'aries' });
      }
      if (url.endsWith('/rest/v1/rpc/complete_daily_sun_confirmation')) {
        return json({ outcome: 'superseded', active_sign: 'aries' });
      }
      if (url.startsWith('https://api.resend.com')) return json({}, 200);
      throw new Error(`Unexpected request: GET ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);

    const response = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token, decision: 'switch' } }, response);

    expect(response.statusCode).toBe(409);
    expect(response.body).toContain('A newer request or unsubscribe replaced it');
    expect(fetcher.mock.calls.filter(([url]) => String(url).startsWith('https://api.resend.com')))
      .toHaveLength(0);
    expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
      'https://project.supabase.co/rest/v1/rpc/claim_daily_sun_confirmation',
      'https://project.supabase.co/rest/v1/rpc/complete_daily_sun_confirmation',
    ]);
  });

  it('never upgrades a pending weekly token into daily consent', async () => {
    configure();
    const token = createEmailOptInToken({
      email: 'person@example.com', sign: 'libra', locale: 'en',
    }, SECRET);
    const fetcher = vi.fn().mockResolvedValue(json({ id: CONTACT_ID }, 201));
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token } }, response);
    expect(response.statusCode).toBe(200);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.resend.com/contacts');
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toMatchObject({
      email: 'person@example.com',
      properties: { sun_sign: 'libra' },
    });
  });
});

describe('daily chart preference', () => {
  it('authenticates, verifies chart ownership, stores only a pending token hash, and sends DOI', async () => {
    configure();
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/v1/user')) return json({ id: USER_ID, email: 'person@example.com' });
      if (url.includes('/rest/v1/charts?')) {
        return json([{ id: CHART_ID, payload: { name: 'My chart' } }]);
      }
      if (url.includes('/rest/v1/daily_chart_preferences?') && !init?.method) return json([]);
      if (url.includes('/rest/v1/daily_chart_preferences?') && init?.method === 'POST') return json({}, 201);
      if (url === 'https://api.resend.com/emails' && init?.method === 'POST') return json({ id: 'email_1' }, 200);
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();
    await chartPreferenceHandler({
      method: 'POST',
      headers: SITE_HEADERS,
      body: { chartId: CHART_ID, timezone: 'America/New_York' },
    }, response);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({ ok: true, pending: true });
    const pendingWrite = fetcher.mock.calls.find(([url, init]) => (
      String(url).includes('daily_chart_preferences') && init?.method === 'POST'
    ));
    const pendingBody = JSON.parse(String(pendingWrite?.[1]?.body));
    expect(pendingBody).toMatchObject({
      user_id: USER_ID,
      chart_id: CHART_ID,
      recipient_hash: RECIPIENT_HASH,
      timezone: 'America/New_York',
      confirmed_at: null,
    });
    expect(pendingBody.confirmation_token_hash).toMatch(/^[0-9a-f]{64}$/u);
    expect(String(pendingWrite?.[1]?.body)).not.toContain('@');
    const emailRequest = fetcher.mock.calls.find(([url]) => String(url) === 'https://api.resend.com/emails');
    const emailBody = JSON.parse(String(emailRequest?.[1]?.body));
    expect(emailBody.to).toEqual(['person@example.com']);
    expect(emailBody.subject).toBe('Confirm your Zodiacs.org personal daily brief');
    expect(emailBody.text).toContain('personal daily brief for My chart');
    expect(emailBody.text).toContain('/api/email/confirm?token=');
    expect(emailBody).not.toHaveProperty('html');
  });

  it('applies chart and timezone changes immediately after chart-tier consent is confirmed', async () => {
    configure();
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/v1/user')) return json({ id: USER_ID, email: 'person@example.com' });
      if (url.includes('/rest/v1/charts?')) {
        return json([{ id: CHART_ID, payload: { name: 'My chart' } }]);
      }
      if (url.includes('/rest/v1/daily_chart_preferences?') && !init?.method) {
        return json([{
          chart_id: null,
          recipient_hash: RECIPIENT_HASH,
          confirmation_token_hash: null,
          timezone: 'UTC',
          confirmed_at: '2026-07-01T00:00:00.000Z',
        }]);
      }
      if (url.includes('/rest/v1/daily_chart_preferences?') && init?.method === 'POST') {
        return json({}, 201);
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();
    await chartPreferenceHandler({
      method: 'POST',
      headers: SITE_HEADERS,
      body: { chartId: CHART_ID, timezone: 'Asia/Bangkok' },
    }, response);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      ok: true,
      pending: false,
      preference: { chartId: CHART_ID, timezone: 'Asia/Bangkok', paused: false },
    });
    expect(fetcher.mock.calls.some(([url]) => String(url) === 'https://api.resend.com/emails')).toBe(false);
  });

  it('requires fresh confirmation instead of carrying chart consent to a changed account email', async () => {
    configure();
    const nextHash = dailyRecipientHash('new-address@example.com', SECRET);
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/v1/user')) {
        return json({ id: USER_ID, email: 'new-address@example.com' });
      }
      if (url.includes('/rest/v1/charts?')) {
        return json([{ id: CHART_ID, payload: { name: 'My chart' } }]);
      }
      if (url.includes('/rest/v1/daily_chart_preferences?') && !init?.method) {
        return json([{
          chart_id: CHART_ID,
          recipient_hash: RECIPIENT_HASH,
          confirmation_token_hash: null,
          timezone: 'UTC',
          confirmed_at: '2026-07-01T00:00:00.000Z',
        }]);
      }
      if (url.includes('/rest/v1/daily_chart_preferences?') && init?.method === 'POST') {
        return json({}, 201);
      }
      if (url === 'https://api.resend.com/emails' && init?.method === 'POST') {
        return json({ id: 'email_changed_address' });
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();
    await chartPreferenceHandler({
      method: 'POST',
      headers: SITE_HEADERS,
      body: { chartId: CHART_ID, timezone: 'Asia/Bangkok' },
    }, response);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({ ok: true, pending: true });
    const preferenceWrite = fetcher.mock.calls.find(([url, init]) => (
      String(url).includes('/daily_chart_preferences?') && init?.method === 'POST'
    ));
    expect(JSON.parse(String(preferenceWrite?.[1]?.body))).toMatchObject({
      recipient_hash: nextHash,
      confirmed_at: null,
      confirmation_token_hash: expect.stringMatching(/^[0-9a-f]{64}$/u),
    });
    const confirmationEmail = fetcher.mock.calls.find(([url]) => (
      String(url) === 'https://api.resend.com/emails'
    ));
    expect(JSON.parse(String(confirmationEmail?.[1]?.body))).toMatchObject({
      to: ['new-address@example.com'],
    });
  });

  it('keeps authenticated preference revocation available while sending is off', async () => {
    configure();
    process.env.DAILY_EMAIL_ENABLED = '0';
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/v1/user')) return json({ id: USER_ID, email: 'person@example.com' });
      if (url.includes('/rest/v1/daily_chart_preferences?') && init?.method === 'DELETE') return json({}, 200);
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();
    await chartPreferenceHandler({ method: 'DELETE', headers: SITE_HEADERS }, response);
    expect(response.statusCode).toBe(200);
    expect(fetcher.mock.calls.some(([url, init]) => (
      String(url).includes('/daily_chart_preferences?user_id=eq.') && init?.method === 'DELETE'
    ))).toBe(true);
  });

  it('invalidates a pending confirmation link when the profile request is cancelled', async () => {
    configure();
    const token = createDailyChartOptInToken({
      userId: USER_ID,
      chartId: CHART_ID,
      recipientHash: RECIPIENT_HASH,
      timezone: 'UTC',
    }, SECRET);
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/v1/user')) return json({ id: USER_ID, email: 'person@example.com' });
      if (url.includes('/rest/v1/daily_chart_preferences?') && init?.method === 'DELETE') {
        return json({}, 200);
      }
      if (url.includes('/rest/v1/daily_chart_preferences?') && !init?.method) return json([]);
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);

    const cancelled = responseRecorder();
    await chartPreferenceHandler({ method: 'DELETE', headers: SITE_HEADERS }, cancelled);
    expect(cancelled.statusCode).toBe(200);

    const confirmation = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token } }, confirmation);
    expect(confirmation.statusCode).toBe(409);
    expect(confirmation.body).toContain('This link is not valid.');
    expect(fetcher.mock.calls.some(([url]) => String(url).includes('/rest/v1/charts?'))).toBe(false);
  });

  it('revalidates ownership before confirmation and then stores only the selection', async () => {
    configure();
    const token = createDailyChartOptInToken({
      userId: USER_ID, chartId: CHART_ID, recipientHash: RECIPIENT_HASH, timezone: 'Asia/Bangkok',
    }, SECRET);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/rest/v1/daily_chart_preferences?') && !init?.method) {
        return json([{
          chart_id: CHART_ID,
          recipient_hash: RECIPIENT_HASH,
          confirmation_token_hash: tokenHash,
          timezone: 'Asia/Bangkok',
          confirmed_at: null,
        }]);
      }
      if (url.includes('/rest/v1/charts?')) return json([{ id: CHART_ID }]);
      if (url.includes(`/auth/v1/admin/users/${USER_ID}`)) {
        return json({ id: USER_ID, email: 'person@example.com' });
      }
      if (url.includes('/rest/v1/daily_chart_preferences?') && init?.method === 'PATCH') return json([{}]);
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token } }, response);
    expect(response.statusCode).toBe(200);
    const write = fetcher.mock.calls.find(([url, init]) => (
      String(url).includes('/daily_chart_preferences?') && init?.method === 'PATCH'
    ));
    expect(JSON.parse(String(write?.[1]?.body))).toMatchObject({
      confirmation_token_hash: null,
      confirmed_at: expect.any(String),
    });
    expect(String(write?.[0])).toContain(`confirmation_token_hash=eq.${tokenHash}`);
    expect(String(write?.[0])).toContain(`chart_id=eq.${CHART_ID}`);
    expect(String(write?.[1]?.body)).not.toContain('@');
  });

  it('does not revive chart consent when cancellation wins the confirmation race', async () => {
    configure();
    const token = createDailyChartOptInToken({
      userId: USER_ID, chartId: CHART_ID, recipientHash: RECIPIENT_HASH, timezone: 'UTC',
    }, SECRET);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/rest/v1/daily_chart_preferences?') && !init?.method) {
        return json([{
          chart_id: CHART_ID,
          recipient_hash: RECIPIENT_HASH,
          confirmation_token_hash: tokenHash,
          timezone: 'UTC',
          confirmed_at: null,
        }]);
      }
      if (url.includes('/rest/v1/charts?')) return json([{ id: CHART_ID }]);
      if (url.includes(`/auth/v1/admin/users/${USER_ID}`)) {
        return json({ id: USER_ID, email: 'person@example.com' });
      }
      if (url.includes('/rest/v1/daily_chart_preferences?') && init?.method === 'PATCH') {
        return json([]);
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token } }, response);
    expect(response.statusCode).toBe(409);
    expect(response.body).toContain('This link is not valid.');
  });

  it('pauses a selected confirmed chart before local deletion can proceed', async () => {
    configure();
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/v1/user')) return json({ id: USER_ID, email: 'person@example.com' });
      if (url.endsWith('/rest/v1/rpc/pause_or_cancel_daily_chart_for_deletion')
        && init?.method === 'POST') {
        return json({ outcome: 'paused', selected_chart_id: null });
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();
    await chartPreferenceHandler({
      method: 'PATCH',
      headers: SITE_HEADERS,
      body: { chartId: CHART_ID },
    }, response);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      ok: true, paused: true, cancelled: false, selectedChartId: null,
    });
    const pause = fetcher.mock.calls.find(([url]) => (
      String(url).endsWith('/rest/v1/rpc/pause_or_cancel_daily_chart_for_deletion')
    ));
    expect(JSON.parse(String(pause?.[1]?.body))).toEqual({
      candidate_user_id: USER_ID,
      candidate_chart_id: CHART_ID,
    });
  });

  it('atomically cancels a pending chart request before local deletion', async () => {
    configure();
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/v1/user')) return json({ id: USER_ID, email: 'person@example.com' });
      if (url.endsWith('/rest/v1/rpc/pause_or_cancel_daily_chart_for_deletion')
        && init?.method === 'POST') {
        return json({ outcome: 'cancelled', selected_chart_id: null });
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();
    await chartPreferenceHandler({
      method: 'PATCH',
      headers: SITE_HEADERS,
      body: { chartId: CHART_ID },
    }, response);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      ok: true, paused: false, cancelled: true, selectedChartId: null,
    });
  });
});

describe('daily unsubscribe', () => {
  it('keeps GET scanner-safe and revokes only the Sun tier on POST', async () => {
    configure();
    const token = createDailyUnsubscribeToken({
      kind: 'sun', contactId: CONTACT_ID, recipientHash: RECIPIENT_HASH,
    }, SECRET);
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith(`/contacts/${CONTACT_ID}`) && !init?.method) {
        return json({ id: CONTACT_ID, email: 'person@example.com' });
      }
      if (url.endsWith(`/${CONTACT_ID}/segments`) && !init?.method) {
        return json({ data: [
          { id: SEGMENTS.aries },
          { id: SEGMENTS.libra },
          { id: 'unrelated_weekly_segment' },
        ] });
      }
      return json({}, 200);
    });
    vi.stubGlobal('fetch', fetcher);

    const getResponse = responseRecorder();
    await unsubscribeHandler({ method: 'GET', query: { token } }, getResponse);
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body).toContain('Confirm unsubscribe');
    expect(getResponse.body).toContain('p…@example.com');
    expect(getResponse.body).toContain('This stops the sun-sign daily');
    expect(getResponse.body).not.toContain('other daily tier');
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]?.[1]?.method).toBeUndefined();
    fetcher.mockClear();

    process.env.DAILY_EMAIL_ENABLED = '0';
    const postResponse = responseRecorder();
    await unsubscribeHandler({ method: 'POST', query: { token } }, postResponse);
    expect(postResponse.statusCode).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(5);
    const deleted = fetcher.mock.calls
      .filter(([, init]) => init?.method === 'DELETE')
      .map(([url]) => String(url));
    expect(deleted).toContain(`https://api.resend.com/contacts/${CONTACT_ID}/segments/${SEGMENTS.aries}`);
    expect(deleted).toContain(`https://api.resend.com/contacts/${CONTACT_ID}/segments/${SEGMENTS.libra}`);
    expect(deleted.some((url) => url.includes('unrelated_weekly_segment'))).toBe(false);
    const revoked = fetcher.mock.calls.find(([url, init]) => (
      String(url).endsWith('/rest/v1/rpc/revoke_daily_email_preference') && init?.method === 'POST'
    ));
    expect(JSON.parse(String(revoked?.[1]?.body))).toEqual({
      candidate_recipient_hash: RECIPIENT_HASH,
      candidate_tier: 'sun_sign',
      candidate_user_id: null,
    });
    expect(postResponse.body).toContain('No more sun-sign daily.');
  });

  it('uses a chart link to revoke only the personal tier', async () => {
    configure();
    const token = createDailyUnsubscribeToken({
      kind: 'chart',
      userId: USER_ID,
      recipientHash: RECIPIENT_HASH,
    }, SECRET);
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith(`/${CONTACT_ID}/segments`) && !init?.method) {
        return json({ data: [{ id: SEGMENTS.libra }] });
      }
      return json({}, 200);
    });
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();
    await unsubscribeHandler({ method: 'POST', query: { token } }, response);
    expect(response.statusCode).toBe(200);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]?.[0]).toContain('/rest/v1/rpc/revoke_daily_email_preference');
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      candidate_recipient_hash: RECIPIENT_HASH,
      candidate_tier: 'chart',
      candidate_user_id: USER_ID,
    });
    expect(fetcher.mock.calls.some(([url]) => String(url).startsWith('https://api.resend.com'))).toBe(false);
    expect(fetcher.mock.calls.some(([url]) => String(url).includes('/auth/v1/admin/users/'))).toBe(false);
    expect(response.body).toContain('No more personal daily brief.');
    expect(response.body).toContain('/profile/#daily-brief');
  });

  it('never exposes or unsubscribes a changed account email through an old chart link', async () => {
    configure();
    const token = createDailyUnsubscribeToken({
      kind: 'chart', userId: USER_ID, recipientHash: RECIPIENT_HASH,
    }, SECRET);
    const fetcher = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      const url = String(input);
      if (url.includes(`/auth/v1/admin/users/${USER_ID}`)) {
        return json({ id: USER_ID, email: 'new-address@example.com' });
      }
      return json({}, 200);
    });
    vi.stubGlobal('fetch', fetcher);

    const getResponse = responseRecorder();
    await unsubscribeHandler({ method: 'GET', query: { token } }, getResponse);
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body).toContain('this address');
    expect(getResponse.body).not.toContain('new-address');
    fetcher.mockClear();

    const postResponse = responseRecorder();
    await unsubscribeHandler({ method: 'POST', query: { token } }, postResponse);
    expect(postResponse.statusCode).toBe(200);
    expect(fetcher.mock.calls.some(([url]) => String(url).startsWith('https://api.resend.com'))).toBe(false);
    expect(fetcher.mock.calls.some(([url, init]) => (
      String(url).endsWith('/rest/v1/rpc/revoke_daily_email_preference') && init?.method === 'POST'
    ))).toBe(true);
    const revoke = fetcher.mock.calls.find(([url]) => (
      String(url).endsWith('/rest/v1/rpc/revoke_daily_email_preference')
    ));
    expect(JSON.parse(String(revoke?.[1]?.body))).toMatchObject({
      candidate_tier: 'chart',
      candidate_user_id: USER_ID,
    });
  });

  it('keeps the Sun revocation authoritative when provider cleanup is unavailable', async () => {
    configure();
    const token = createDailyUnsubscribeToken({
      kind: 'sun', contactId: CONTACT_ID, recipientHash: RECIPIENT_HASH,
    }, SECRET);
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/rest/v1/rpc/revoke_daily_email_preference') && init?.method === 'POST') {
        return json(null, 200);
      }
      if (url.endsWith(`/${CONTACT_ID}/segments`) && !init?.method) {
        return json({ error: 'unavailable' }, 503);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();
    await unsubscribeHandler({ method: 'POST', query: { token } }, response);
    expect(response.statusCode).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[0]).toContain('/rest/v1/rpc/revoke_daily_email_preference');
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toMatchObject({
      candidate_tier: 'sun_sign',
      candidate_user_id: null,
    });
    expect(response.body).toContain('Done');
  });

  it('revokes a valid list while enrollment and provider configuration are disabled', async () => {
    configure();
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_DAILY_SIGN_SEGMENTS_JSON;
    process.env.DAILY_EMAIL_ENABLED = '0';
    const token = createDailyUnsubscribeToken({
      kind: 'chart', userId: USER_ID, recipientHash: RECIPIENT_HASH,
    }, SECRET);
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/rest/v1/rpc/revoke_daily_email_preference') && init?.method === 'POST') {
        return json(null, 200);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();
    await unsubscribeHandler({ method: 'POST', query: { token } }, response);
    expect(response.statusCode).toBe(200);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(response.body).toContain('No more personal daily brief.');
  });

  it('does not reveal or clean a recycled Sun provider contact', async () => {
    configure();
    const token = createDailyUnsubscribeToken({
      kind: 'sun', contactId: CONTACT_ID, recipientHash: RECIPIENT_HASH,
    }, SECRET);
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith(`/contacts/${CONTACT_ID}`) && !init?.method) {
        return json({ id: CONTACT_ID, email: 'someone-else@example.com' });
      }
      if (url.endsWith('/rest/v1/rpc/revoke_daily_email_preference') && init?.method === 'POST') {
        return json(null, 200);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);

    const getResponse = responseRecorder();
    await unsubscribeHandler({ method: 'GET', query: { token } }, getResponse);
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body).toContain('this address');
    expect(getResponse.body).not.toContain('someone-else');
    fetcher.mockClear();

    const postResponse = responseRecorder();
    await unsubscribeHandler({ method: 'POST', query: { token } }, postResponse);
    expect(postResponse.statusCode).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith(`/${CONTACT_ID}/segments`))).toBe(false);
  });
});
