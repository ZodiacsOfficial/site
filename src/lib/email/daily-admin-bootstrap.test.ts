import { afterEach, describe, expect, it, vi } from 'vitest';
import adminBootstrapHandler from '../../../api/email/admin-bootstrap';
import confirmHandler from '../../../api/email/confirm';
import { dailyRecipientHash } from '../daily-email/identity';
import { createDailySunOptInToken, verifyDailySunOptInToken } from './daily-sun-token';

const ORIGINAL_ENV = { ...process.env };
const ADMIN_EMAIL = 'admin@zodiacs.org';
const EMAIL_SECRET = 'email-secret-that-is-at-least-thirty-two-characters';
const BOOTSTRAP_SECRET = 'bootstrap-secret-that-is-at-least-thirty-two-characters';
const DAILY_SEGMENT = 'segment_daily_admin_canary';
const CONTACT_ID = 'contact_admin_canary';

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

function configureBootstrap(): void {
  Object.assign(process.env, {
    RESEND_API_KEY: 're_sending_test',
    RESEND_CONTACTS_API_KEY: 're_contacts_test',
    RESEND_FROM_EMAIL: 'Zodiacs.org <hello@zodiacs.org>',
    EMAIL_CONFIRM_SECRET: EMAIL_SECRET,
    EMAIL_CONFIRM_BASE_URL: 'https://zodiacs.org',
    DAILY_EMAIL_UNSUBSCRIBE_SECRET: EMAIL_SECRET,
    DAILY_EMAIL_RECIPIENT_HASH_SECRET: EMAIL_SECRET,
    RESEND_DAILY_SEGMENT_ID: DAILY_SEGMENT,
    PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service_test',
    DAILY_EMAIL_ADMIN_BOOTSTRAP_ENABLED: '1',
    DAILY_EMAIL_ADMIN_BOOTSTRAP_EMAIL: ADMIN_EMAIL,
    DAILY_EMAIL_ADMIN_BOOTSTRAP_SECRET: BOOTSTRAP_SECRET,
  });
  delete process.env.DAILY_EMAIL_ENABLED;
  delete process.env.EMAIL_PROVIDER;
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function bootstrapRequest(body: Record<string, unknown>, authorization = `Bearer ${BOOTSTRAP_SECRET}`) {
  return {
    method: 'POST',
    headers: { authorization },
    body,
  };
}

describe('admin-only daily email bootstrap', () => {
  it('fails closed when its server-only configuration is incomplete', async () => {
    configureBootstrap();
    delete process.env.DAILY_EMAIL_ADMIN_BOOTSTRAP_SECRET;
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();

    await adminBootstrapHandler(bootstrapRequest({
      email: ADMIN_EMAIL,
      sign: 'libra',
      locale: 'en',
    }), response);

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({ error: 'not_found' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects a missing or incorrect bearer before parsing or provider access', async () => {
    configureBootstrap();
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);

    for (const authorization of ['', 'Bearer wrong-secret']) {
      const response = responseRecorder();
      await adminBootstrapHandler(bootstrapRequest({
        email: ADMIN_EMAIL,
        sign: 'libra',
        locale: 'en',
      }, authorization), response);
      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body)).toEqual({ error: 'unauthorized' });
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects every address except the fixed admin mailbox', async () => {
    configureBootstrap();
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();

    await adminBootstrapHandler(bootstrapRequest({
      email: 'reader@example.com',
      sign: 'libra',
      locale: 'en',
    }), response);

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body)).toEqual({ error: 'forbidden' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('stages and sends admin DOI while the public daily flag remains off', async () => {
    configureBootstrap();
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/rest/v1/rpc/stage_daily_sun_confirmation')) {
        return json({ outcome: 'new_request', active_sign: null });
      }
      if (url === 'https://api.resend.com/emails' && init?.method === 'POST') {
        return json({ id: 'email_admin_doi' });
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();

    await adminBootstrapHandler(bootstrapRequest({
      email: ADMIN_EMAIL,
      sign: 'libra',
      locale: 'en',
    }), response);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ ok: true, pending: true });
    expect(process.env.DAILY_EMAIL_ENABLED).toBeUndefined();
    expect(process.env.EMAIL_PROVIDER).toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(2);

    const stageRequest = fetcher.mock.calls.find(([url]) => (
      String(url).endsWith('/rest/v1/rpc/stage_daily_sun_confirmation')
    ));
    expect(JSON.parse(String(stageRequest?.[1]?.body))).toMatchObject({
      candidate_sign: 'libra',
    });
    expect(String(stageRequest?.[1]?.body)).not.toContain(ADMIN_EMAIL);

    const emailRequest = fetcher.mock.calls.find(([url]) => String(url) === 'https://api.resend.com/emails');
    const emailBody = JSON.parse(String(emailRequest?.[1]?.body));
    expect(emailBody.to).toEqual([ADMIN_EMAIL]);
    expect(emailBody.subject).toBe('Confirm your Zodiacs.org daily forecast');
    const confirmationUrl = emailBody.text.match(/https:\/\/zodiacs\.org\/api\/email\/confirm\?token=\S+/u)?.[0];
    expect(confirmationUrl).toBeTruthy();
    const token = new URL(confirmationUrl!).searchParams.get('token') ?? '';
    expect(verifyDailySunOptInToken(token, EMAIL_SECRET)).toMatchObject({
      email: ADMIN_EMAIL,
      sign: 'libra',
    });
  });

  it('keeps the admin token scanner-safe on GET and confirms it on POST while public daily is off', async () => {
    configureBootstrap();
    const token = createDailySunOptInToken({ email: ADMIN_EMAIL, sign: 'libra' }, EMAIL_SECRET);
    const recipientHash = dailyRecipientHash(ADMIN_EMAIL, EMAIL_SECRET);
    let state: 'pending' | 'confirming' | 'confirmed' = 'pending';
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/rest/v1/rpc/inspect_daily_sun_confirmation')) {
        return json(state === 'pending' ? {
          outcome: 'valid',
          request_kind: 'subscribe',
          active_sign: null,
          confirmation_state: 'pending',
        } : { outcome: 'invalid' });
      }
      if (url.endsWith('/rest/v1/rpc/claim_daily_sun_confirmation')) {
        state = 'confirming';
        return json({ outcome: 'claimed', request_kind: 'subscribe', active_sign: null });
      }
      if (url.endsWith('/rest/v1/rpc/complete_daily_sun_confirmation')) {
        state = 'confirmed';
        return json({ outcome: 'completed', active_sign: 'libra' });
      }
      if (url.includes('/rest/v1/daily_sun_preferences?') && !init?.method) {
        return json(state === 'confirmed' ? [{
          recipient_hash: recipientHash,
          sign: 'libra',
          confirmed_at: '2026-07-21T12:00:00.000Z',
        }] : []);
      }
      if (url === 'https://api.resend.com/contacts' && init?.method === 'POST') {
        return json({ id: CONTACT_ID }, 201);
      }
      if (url.endsWith(`/${CONTACT_ID}/segments/${DAILY_SEGMENT}`) && init?.method === 'POST') {
        return json({});
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetcher);

    const getResponse = responseRecorder();
    await confirmHandler({ method: 'GET', query: { token } }, getResponse);
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body).toContain('Confirm subscription');
    expect(state).toBe('pending');
    expect(fetcher).toHaveBeenCalledOnce();

    const postResponse = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token } }, postResponse);
    expect(postResponse.statusCode).toBe(200);
    expect(postResponse.body).toContain('Subscription confirmed.');
    expect(state).toBe('confirmed');
    expect(process.env.DAILY_EMAIL_ENABLED).toBeUndefined();
    expect(process.env.EMAIL_PROVIDER).toBeUndefined();
    expect(fetcher.mock.calls.filter(([url]) => String(url).startsWith('https://api.resend.com')))
      .toHaveLength(2);
  });

  it('does not let a non-admin daily token use the public-off confirm exception', async () => {
    configureBootstrap();
    const token = createDailySunOptInToken({ email: 'reader@example.com', sign: 'libra' }, EMAIL_SECRET);
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();

    await confirmHandler({ method: 'GET', query: { token } }, response);

    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('Confirm subscription');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
