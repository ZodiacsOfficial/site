import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit } from '@vercel/firewall';

const { waitUntilTasks } = vi.hoisted(() => ({
  waitUntilTasks: [] as Promise<unknown>[],
}));

vi.mock('@vercel/functions', () => ({
  waitUntil(task: Promise<unknown>) {
    waitUntilTasks.push(task);
  },
}));

vi.mock('@vercel/firewall', () => ({ checkRateLimit: vi.fn() }));

import subscribeHandler from '../../../api/email/subscribe';
import confirmHandler from '../../../api/email/_confirm';
import unsubscribeHandler from '../../../api/email/_unsubscribe';
import { createDailyUnsubscribeToken } from './daily-unsubscribe-token';
import { dailySunRecipientHash, dailySunTokenHash } from './daily-sun-server';

const ORIGINAL_ENV = { ...process.env };
const SECRET = 'test-secret-that-is-at-least-thirty-two-characters';
const CONTACT_ID = 'contact_12345678';
const ATTEMPT_ID = '110e8400-e29b-41d4-a716-446655440000';
const DAILY_SEGMENT = 'segment_daily_sun';

interface ActiveRow {
  recipient_hash: string;
  sign: string;
  confirmed_at: string;
  confirmed_by_attempt_id: string;
}

interface RequestRow {
  recipient_hash: string;
  requested_sign: string;
  confirmation_token_hash: string;
  request_kind: 'subscribe' | 'sign_change';
  confirmation_state: 'pending' | 'confirming';
  attempt_id: string | null;
  claimed_at: number | null;
  expires_at: number;
}

beforeEach(() => {
  vi.mocked(checkRateLimit).mockResolvedValue({ rateLimited: false } as never);
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  waitUntilTasks.splice(0);
  vi.unstubAllGlobals();
  vi.mocked(checkRateLimit).mockReset();
});

async function flushWaitUntil(): Promise<void> {
  while (waitUntilTasks.length > 0) {
    await Promise.all(waitUntilTasks.splice(0));
  }
}

function configure(): void {
  Object.assign(process.env, {
    DAILY_EMAIL_ENABLED: '1',
    EMAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 're_sending_test',
    RESEND_CONTACTS_API_KEY: 're_contacts_test',
    RESEND_FROM_EMAIL: 'Zodiacs.org <hello@zodiacs.org>',
    EMAIL_CONFIRM_SECRET: SECRET,
    EMAIL_CONFIRM_BASE_URL: 'https://zodiacs.org',
    DAILY_EMAIL_UNSUBSCRIBE_SECRET: SECRET,
    DAILY_EMAIL_RECIPIENT_HASH_SECRET: SECRET,
    RESEND_DAILY_SEGMENT_ID: DAILY_SEGMENT,
    PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const SITE_HEADERS = {
  origin: 'https://zodiacs.org',
  host: 'zodiacs.org',
  accept: 'application/json',
};

function requestToken(emailBody: unknown): string {
  const body = JSON.parse(String(emailBody)) as { text?: unknown };
  const text = typeof body.text === 'string' ? body.text : '';
  const match = text.match(/\/api\/email\/confirm\?token=([A-Za-z0-9_.-]+)/u);
  if (!match?.[1]) throw new Error('Confirmation token missing from test email.');
  return match[1];
}

function confirmed(sign: string): ActiveRow {
  return {
    recipient_hash: dailySunRecipientHash('person@example.com'),
    sign,
    confirmed_at: '2026-07-20T00:00:00.000Z',
    confirmed_by_attempt_id: ATTEMPT_ID,
  };
}

function createHarness(initialActive: ActiveRow | null = null) {
  let active = initialActive ? { ...initialActive } : null;
  let request: RequestRow | null = null;
  const confirmationEmails: Array<{ body: string }> = [];
  const databaseBodies: string[] = [];
  const callOrder: string[] = [];
  const segments = new Set<string>();
  let contactWrites = 0;
  let failNextContactWrite = false;
  let nextAllowedAt: number | null = null;
  let providerLease: { attemptId: string; leaseId: string } | null = null;

  const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const rpc = url.hostname === 'project.supabase.co' && url.pathname.startsWith('/rest/v1/rpc/');
    const bodyText = method === 'POST' && init?.body ? String(init.body) : '';
    if (rpc) databaseBodies.push(bodyText);

    if (url.pathname === '/rest/v1/rpc/stage_daily_sun_confirmation' && method === 'POST') {
      callOrder.push('db:stage');
      const body = JSON.parse(bodyText) as {
        candidate_recipient_hash: string;
        candidate_sign: string;
        candidate_token_hash: string;
        candidate_expires_at: string;
      };
      if (nextAllowedAt !== null && nextAllowedAt > Date.now()) {
        return json({ outcome: 'cooldown', active_sign: active?.sign ?? null });
      }
      nextAllowedAt = Date.now() + 15 * 60_000;
      if (active?.sign === body.candidate_sign) {
        return json({ outcome: 'already_on', active_sign: active.sign });
      }
      if (request?.confirmation_state === 'confirming'
        && request.claimed_at !== null
        && request.claimed_at > Date.now() - 300_000) {
        return json({ outcome: 'in_flight', active_sign: active?.sign ?? null });
      }
      const existed = Boolean(request);
      const kind = active ? 'sign_change' : 'subscribe';
      request = {
        recipient_hash: body.candidate_recipient_hash,
        requested_sign: body.candidate_sign,
        confirmation_token_hash: body.candidate_token_hash,
        request_kind: kind,
        confirmation_state: 'pending',
        attempt_id: null,
        claimed_at: null,
        expires_at: Date.parse(body.candidate_expires_at),
      };
      return json({
        outcome: kind === 'subscribe'
          ? existed ? 'replaced_request' : 'new_request'
          : existed ? 'sign_change_replaced' : 'sign_change_request',
        active_sign: active?.sign ?? null,
      });
    }

    if (url.pathname === '/rest/v1/rpc/inspect_daily_sun_confirmation' && method === 'POST') {
      const body = JSON.parse(bodyText) as {
        candidate_recipient_hash: string;
        candidate_sign: string;
        candidate_token_hash: string;
      };
      const valid = request
        && request.recipient_hash === body.candidate_recipient_hash
        && request.requested_sign === body.candidate_sign
        && request.confirmation_token_hash === body.candidate_token_hash
        && request.expires_at > Date.now();
      return valid
        ? json({
          outcome: 'valid',
          request_kind: request!.request_kind,
          active_sign: active?.sign ?? null,
          confirmation_state: request!.confirmation_state,
        })
        : json({ outcome: 'invalid' });
    }

    if (url.pathname === '/rest/v1/rpc/claim_daily_sun_confirmation' && method === 'POST') {
      callOrder.push('db:claim');
      const body = JSON.parse(bodyText) as {
        candidate_recipient_hash: string;
        candidate_sign: string;
        candidate_token_hash: string;
        candidate_attempt_id: string;
      };
      const matches = request
        && request.recipient_hash === body.candidate_recipient_hash
        && request.requested_sign === body.candidate_sign
        && request.confirmation_token_hash === body.candidate_token_hash
        && request.expires_at > Date.now();
      if (!matches) return json({ outcome: 'unavailable' });
      if (request!.confirmation_state === 'confirming'
        && request!.claimed_at !== null
        && request!.claimed_at > Date.now() - 300_000
        && request!.attempt_id !== body.candidate_attempt_id) return json({ outcome: 'busy' });
      request = {
        ...request!,
        confirmation_state: 'confirming',
        attempt_id: body.candidate_attempt_id,
        claimed_at: Date.now(),
      };
      return json({
        outcome: 'claimed',
        request_kind: request.request_kind,
        active_sign: active?.sign ?? null,
      });
    }

    if (url.pathname === '/rest/v1/rpc/complete_daily_sun_confirmation' && method === 'POST') {
      callOrder.push('db:complete');
      const body = JSON.parse(bodyText) as {
        candidate_recipient_hash: string;
        candidate_token_hash: string;
        candidate_attempt_id: string;
      };
      if (active?.confirmed_by_attempt_id === body.candidate_attempt_id) {
        return json({ outcome: 'completed', active_sign: active.sign });
      }
      const matches = request
        && request.recipient_hash === body.candidate_recipient_hash
        && request.confirmation_token_hash === body.candidate_token_hash
        && request.confirmation_state === 'confirming'
        && request.attempt_id === body.candidate_attempt_id
        && request.claimed_at !== null
        && request.claimed_at > Date.now() - 300_000;
      if (!matches) {
        return json({
          outcome: request ? 'superseded' : 'gone',
          active_sign: active?.sign ?? null,
        });
      }
      active = {
        recipient_hash: request!.recipient_hash,
        sign: request!.requested_sign,
        confirmed_at: new Date().toISOString(),
        confirmed_by_attempt_id: body.candidate_attempt_id,
      };
      request = null;
      return json({ outcome: 'completed', active_sign: active.sign });
    }

    if (url.pathname === '/rest/v1/rpc/account_v2_begin_daily_sun_provider_mutation'
      && method === 'POST') {
      callOrder.push('db:provider-lease-begin');
      const body = JSON.parse(bodyText) as {
        candidate_recipient_hash: string;
        candidate_authority_attempt_id: string;
        candidate_lease_id: string;
      };
      if (!active
        || active.recipient_hash !== body.candidate_recipient_hash
        || active.confirmed_by_attempt_id !== body.candidate_authority_attempt_id) {
        return json({ outcome: 'unavailable' });
      }
      if (providerLease
        && (providerLease.attemptId !== body.candidate_authority_attempt_id
          || providerLease.leaseId !== body.candidate_lease_id)) {
        return json({ outcome: 'busy' });
      }
      providerLease = {
        attemptId: body.candidate_authority_attempt_id,
        leaseId: body.candidate_lease_id,
      };
      return json({ outcome: 'ready' });
    }

    if (url.pathname === '/rest/v1/rpc/account_v2_finish_daily_sun_provider_mutation'
      && method === 'POST') {
      callOrder.push('db:provider-lease-finish');
      const body = JSON.parse(bodyText) as {
        candidate_authority_attempt_id: string;
        candidate_lease_id: string;
      };
      const matches = providerLease?.attemptId === body.candidate_authority_attempt_id
        && providerLease.leaseId === body.candidate_lease_id;
      if (matches) providerLease = null;
      return json({ outcome: matches ? 'released' : 'not_found' });
    }

    if (url.pathname === '/rest/v1/rpc/release_daily_sun_confirmation' && method === 'POST') {
      const body = JSON.parse(bodyText) as {
        candidate_recipient_hash: string;
        candidate_token_hash: string;
        candidate_attempt_id: string;
      };
      const matches = request
        && request.recipient_hash === body.candidate_recipient_hash
        && request.confirmation_token_hash === body.candidate_token_hash
        && request.confirmation_state === 'confirming'
        && request.attempt_id === body.candidate_attempt_id;
      if (matches) request = {
        ...request!, confirmation_state: 'pending', attempt_id: null, claimed_at: null,
      };
      return json({
        outcome: matches ? 'released' : request ? 'superseded' : 'gone',
        active_sign: active?.sign ?? null,
      });
    }

    if (url.pathname === '/rest/v1/rpc/cancel_daily_sun_confirmation' && method === 'POST') {
      const body = JSON.parse(bodyText) as {
        candidate_recipient_hash: string;
        candidate_token_hash: string;
        require_sign_change: boolean;
      };
      const matches = request
        && request.recipient_hash === body.candidate_recipient_hash
        && request.confirmation_token_hash === body.candidate_token_hash
        && (!body.require_sign_change || request.request_kind === 'sign_change');
      if (matches) request = null;
      return json(Boolean(matches));
    }

    if (url.pathname === '/rest/v1/rpc/revoke_daily_email_preference' && method === 'POST') {
      const body = JSON.parse(bodyText) as {
        candidate_recipient_hash: string;
        candidate_tier: 'sun_sign' | 'chart';
        candidate_user_id: string | null;
      };
      if (body.candidate_tier === 'sun_sign' && body.candidate_user_id === null) {
        if (active?.recipient_hash === body.candidate_recipient_hash) active = null;
        if (request?.recipient_hash === body.candidate_recipient_hash) request = null;
        nextAllowedAt = null;
      }
      return json(null);
    }

    if (url.hostname === 'project.supabase.co'
      && url.pathname === '/rest/v1/daily_sun_preferences'
      && method === 'GET') return json(active ? [{ ...active }] : []);

    if (url.hostname === 'project.supabase.co'
      && url.pathname === '/rest/v1/daily_chart_preferences'
      && method === 'DELETE') return json({});

    if (url.href === 'https://api.resend.com/emails' && method === 'POST') {
      confirmationEmails.push({ body: String(init?.body) });
      return json({ id: `email_${confirmationEmails.length}` });
    }
    if (url.href === `https://api.resend.com/contacts/${CONTACT_ID}` && method === 'GET') {
      return json({ id: CONTACT_ID, email: 'person@example.com' });
    }
    if (url.href === 'https://api.resend.com/contacts' && method === 'POST') {
      callOrder.push('provider:contact');
      contactWrites += 1;
      if (failNextContactWrite) {
        failNextContactWrite = false;
        return json({}, 500);
      }
      return json({ id: CONTACT_ID }, 201);
    }
    const segmentMatch = url.pathname.match(/\/segments\/([^/]+)$/u);
    if (segmentMatch?.[1] && method === 'POST') {
      segments.add(decodeURIComponent(segmentMatch[1]));
      return json({});
    }
    if (segmentMatch?.[1] && method === 'DELETE') {
      segments.delete(decodeURIComponent(segmentMatch[1]));
      return json({});
    }
    throw new Error(`Unexpected request: ${method} ${url.href}`);
  });

  return {
    fetcher,
    confirmationEmails,
    databaseBodies,
    callOrder,
    segments,
    get active() { return active; },
    get request() { return request; },
    get contactWrites() { return contactWrites; },
    failContactWrite() { failNextContactWrite = true; },
    expireCooldown() { nextAllowedAt = Date.now() - 1; },
    makeLeaseStale() {
      if (!request) throw new Error('No request to lease.');
      request = {
        ...request,
        confirmation_state: 'confirming',
        attempt_id: ATTEMPT_ID,
        claimed_at: Date.now() - 301_000,
      };
    },
  };
}

async function requestSunLink(
  harness: ReturnType<typeof createHarness>,
  sign: string,
): Promise<{ token: string; responseBody: string }> {
  const emailsBefore = harness.confirmationEmails.length;
  const responseBody = await submitSunRequest(harness, sign);
  expect(harness.confirmationEmails).toHaveLength(emailsBefore + 1);
  return {
    token: requestToken(harness.confirmationEmails.at(-1)?.body),
    responseBody,
  };
}

async function submitSunRequest(
  harness: ReturnType<typeof createHarness>,
  sign: string,
): Promise<string> {
  vi.stubGlobal('fetch', harness.fetcher);
  const emailsBefore = harness.confirmationEmails.length;
  const response = responseRecorder();
  await subscribeHandler({
    method: 'POST',
    headers: SITE_HEADERS,
    body: { email: 'person@example.com', sign, locale: 'en' },
  }, response);
  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.body)).toEqual({ ok: true, pending: true });
  expect(waitUntilTasks).toHaveLength(1);
  expect(harness.confirmationEmails).toHaveLength(emailsBefore);
  await flushWaitUntil();
  return response.body;
}

describe('durable daily sun confirmation state', () => {
  it('dispatches in waitUntil, suppresses duplicate token churn, and safely repairs a replay', async () => {
    configure();
    const harness = createHarness();
    const first = await requestSunLink(harness, 'aries');
    const requestSnapshot = { ...harness.request! };
    const throttledBody = await submitSunRequest(harness, 'libra');
    expect(throttledBody).toBe(first.responseBody);
    expect(harness.confirmationEmails).toHaveLength(1);
    expect(harness.request).toEqual(requestSnapshot);

    harness.expireCooldown();
    const currentToken = (await requestSunLink(harness, 'libra')).token;
    expect(currentToken).not.toBe(first.token);
    expect(harness.confirmationEmails).toHaveLength(2);
    expect(harness.databaseBodies.every((body) => !body.includes('@'))).toBe(true);

    const snapshot = JSON.stringify(harness.request);
    const scanner = responseRecorder();
    await confirmHandler({ method: 'GET', query: { token: currentToken } }, scanner);
    expect(scanner.statusCode).toBe(200);
    expect(scanner.body).toContain('Confirm subscription');
    expect(JSON.stringify(harness.request)).toBe(snapshot);
    expect(harness.contactWrites).toBe(0);

    const stale = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token: first.token } }, stale);
    expect(stale.statusCode).toBe(409);
    expect(harness.contactWrites).toBe(0);

    const accepted = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token: currentToken } }, accepted);
    expect(accepted.statusCode).toBe(200);
    expect(harness.active?.sign).toBe('libra');
    expect(harness.request).toBeNull();
    expect(harness.contactWrites).toBe(1);

    const replay = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token: currentToken } }, replay);
    expect(replay.statusCode).toBe(200);
    expect(harness.contactWrites).toBe(2);
    expect(harness.active?.sign).toBe('libra');
    expect(harness.request).toBeNull();
  });

  it('lets exactly one concurrent confirmation claim reach the provider', async () => {
    configure();
    const harness = createHarness();
    const { token } = await requestSunLink(harness, 'libra');
    const first = responseRecorder();
    const second = responseRecorder();
    await Promise.all([
      confirmHandler({ method: 'POST', body: { token } }, first),
      confirmHandler({ method: 'POST', body: { token } }, second),
    ]);
    expect([first.statusCode, second.statusCode].sort()).toEqual([200, 409]);
    expect(harness.contactWrites).toBe(1);
    expect(harness.active?.sign).toBe('libra');
  });

  it('makes unsubscribe invalidate active consent and every outstanding request before provider cleanup', async () => {
    configure();
    const harness = createHarness(confirmed('aries'));
    const { token } = await requestSunLink(harness, 'libra');
    harness.segments.add(DAILY_SEGMENT);
    const unsubscribeToken = createDailyUnsubscribeToken({
      kind: 'sun',
      contactId: CONTACT_ID,
      recipientHash: dailySunRecipientHash('person@example.com'),
    }, SECRET);

    const unsubscribed = responseRecorder();
    await unsubscribeHandler({ method: 'POST', query: { token: unsubscribeToken } }, unsubscribed);
    expect(unsubscribed.statusCode).toBe(200);
    expect(harness.active).toBeNull();
    expect(harness.request).toBeNull();
    expect(harness.segments.has(DAILY_SEGMENT)).toBe(false);

    const stale = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token } }, stale);
    expect(stale.statusCode).toBe(409);
  });

  it('preserves the active sign until a signed switch is confirmed', async () => {
    configure();
    const harness = createHarness(confirmed('aries'));
    harness.segments.add(DAILY_SEGMENT);
    const { token } = await requestSunLink(harness, 'libra');
    expect(harness.active?.sign).toBe('aries');
    expect(harness.request).toMatchObject({ requested_sign: 'libra', request_kind: 'sign_change' });

    const scanner = responseRecorder();
    await confirmHandler({ method: 'GET', query: { token } }, scanner);
    expect(scanner.statusCode).toBe(200);
    expect(scanner.body).toContain('already gets the daily as Aries. Switch it to Libra?');
    expect(scanner.body).toContain('Switch to Libra');
    expect(scanner.body).toContain('Keep Aries');
    expect(scanner.body.match(/method="post"/gu)).toHaveLength(2);
    expect(harness.active?.sign).toBe('aries');

    const switched = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token, decision: 'switch' } }, switched);
    expect(switched.statusCode).toBe(200);
    expect(harness.active?.sign).toBe('libra');
    expect(harness.request).toBeNull();
    expect(harness.segments).toEqual(new Set([DAILY_SEGMENT]));
  });

  it('keeps the old sign through a signed POST without touching the provider', async () => {
    configure();
    const harness = createHarness(confirmed('aries'));
    const { token } = await requestSunLink(harness, 'libra');
    const kept = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token, decision: 'keep' } }, kept);
    expect(kept.statusCode).toBe(200);
    expect(harness.active?.sign).toBe('aries');
    expect(harness.request).toBeNull();
    expect(harness.contactWrites).toBe(0);
  });

  it('does not let an unauthenticated same-sign submit cancel a pending switch', async () => {
    configure();
    const harness = createHarness(confirmed('aries'));
    const { token } = await requestSunLink(harness, 'libra');
    const requestSnapshot = { ...harness.request! };
    const emailsBefore = harness.confirmationEmails.length;
    const response = responseRecorder();
    await subscribeHandler({
      method: 'POST', headers: SITE_HEADERS,
      body: { email: 'person@example.com', sign: 'aries', locale: 'en' },
    }, response);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ ok: true, pending: true });
    expect(waitUntilTasks).toHaveLength(1);
    await flushWaitUntil();
    expect(harness.confirmationEmails).toHaveLength(emailsBefore);
    expect(harness.request).toEqual(requestSnapshot);
    expect(harness.request?.confirmation_token_hash).toBe(dailySunTokenHash(token));
  });

  it('keeps no-JS success truthful and indistinguishable across new and already-active addresses', async () => {
    configure();
    const request = {
      method: 'POST',
      headers: { origin: 'https://zodiacs.org', host: 'zodiacs.org' },
      body: { email: 'person@example.com', sign: 'aries', locale: 'en' },
    };
    const freshHarness = createHarness();
    vi.stubGlobal('fetch', freshHarness.fetcher);
    const fresh = responseRecorder();
    await subscribeHandler(request, fresh);
    expect(waitUntilTasks).toHaveLength(1);
    await flushWaitUntil();

    const activeHarness = createHarness(confirmed('aries'));
    vi.stubGlobal('fetch', activeHarness.fetcher);
    const alreadyActive = responseRecorder();
    await subscribeHandler(request, alreadyActive);
    expect(waitUntilTasks).toHaveLength(1);
    await flushWaitUntil();

    expect(fresh.statusCode).toBe(200);
    expect(alreadyActive.statusCode).toBe(200);
    expect(fresh.body).toBe(alreadyActive.body);
    expect(fresh.body).toContain('If confirmation or a change is needed, check your inbox.');
    expect(freshHarness.confirmationEmails).toHaveLength(1);
    expect(activeHarness.confirmationEmails).toHaveLength(0);
  });

  it('commits consent before provider reconciliation and repairs a transient provider failure', async () => {
    configure();
    const harness = createHarness();
    const { token } = await requestSunLink(harness, 'libra');
    harness.failContactWrite();
    const response = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token } }, response);
    expect(response.statusCode).toBe(200);
    expect(harness.active?.sign).toBe('libra');
    expect(harness.request).toBeNull();
    expect(harness.contactWrites).toBe(2);
    const completion = harness.callOrder.indexOf('db:complete');
    const leaseBegin = harness.callOrder.indexOf('db:provider-lease-begin');
    const firstProviderWrite = harness.callOrder.indexOf('provider:contact');
    const leaseFinish = harness.callOrder.indexOf('db:provider-lease-finish');
    expect(completion).toBeGreaterThan(-1);
    expect(leaseBegin).toBeGreaterThan(completion);
    expect(firstProviderWrite).toBeGreaterThan(completion);
    expect(firstProviderWrite).toBeGreaterThan(leaseBegin);
    expect(leaseFinish).toBeGreaterThan(firstProviderWrite);
  });

  it('reclaims a stale confirming lease without accepting the old owner', async () => {
    configure();
    const harness = createHarness();
    const { token } = await requestSunLink(harness, 'libra');
    harness.makeLeaseStale();
    const response = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token } }, response);
    expect(response.statusCode).toBe(200);
    expect(harness.active?.sign).toBe('libra');
    expect(harness.active?.confirmed_by_attempt_id).not.toBe(ATTEMPT_ID);
  });
});
