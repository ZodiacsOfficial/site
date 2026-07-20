import { afterEach, describe, expect, it, vi } from 'vitest';
import subscribeHandler from '../../../api/email/subscribe';
import confirmHandler from '../../../api/email/confirm';
import unsubscribeHandler from '../../../api/email/unsubscribe';
import { createDailyUnsubscribeToken } from './daily-unsubscribe-token';
import { dailySunRecipientHash } from './daily-sun-server';

const ORIGINAL_ENV = { ...process.env };
const SECRET = 'test-secret-that-is-at-least-thirty-two-characters';
const CONTACT_ID = 'contact_12345678';
const SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
const SEGMENTS = Object.fromEntries(SIGNS.map((sign, index) => [sign, `segment_${index + 1}`]));

interface SunRow {
  recipient_hash: string;
  sign: string;
  confirmation_token_hash: string | null;
  confirmation_state: 'pending' | 'confirming' | 'confirmed' | 'revoked';
  confirmed_at: string | null;
}

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

function createHarness(initialRow: SunRow | null = null) {
  let row = initialRow ? { ...initialRow } : null;
  const confirmationEmails: Array<{ body: string }> = [];
  const databaseBodies: string[] = [];
  const segments = new Set<string>();
  let contactWrites = 0;
  let failNextContactWrite = false;

  const matches = (url: URL): boolean => {
    if (!row) return false;
    const fields: Array<[string, keyof SunRow]> = [
      ['recipient_hash', 'recipient_hash'],
      ['sign', 'sign'],
      ['confirmation_token_hash', 'confirmation_token_hash'],
      ['confirmation_state', 'confirmation_state'],
    ];
    return fields.every(([parameter, field]) => {
      const filter = url.searchParams.get(parameter);
      return !filter || filter === `eq.${row?.[field]}`;
    });
  };

  const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';

    if (url.hostname === 'project.supabase.co'
      && url.pathname === '/rest/v1/rpc/stage_daily_sun_confirmation'
      && method === 'POST') {
      const bodyText = String(init?.body);
      databaseBodies.push(bodyText);
      const body = JSON.parse(bodyText) as {
        candidate_recipient_hash: string;
        candidate_sign: string;
        candidate_token_hash: string;
      };
      if (row?.confirmation_state === 'confirmed') return json('already_on');
      if (row?.confirmation_state === 'confirming') return json('already_pending');
      row = {
        recipient_hash: body.candidate_recipient_hash,
        sign: body.candidate_sign,
        confirmation_token_hash: body.candidate_token_hash,
        confirmation_state: 'pending',
        confirmed_at: null,
      };
      return json('pending');
    }

    if (url.hostname === 'project.supabase.co'
      && url.pathname === '/rest/v1/rpc/revoke_daily_email_preference'
      && method === 'POST') {
      const bodyText = String(init?.body);
      databaseBodies.push(bodyText);
      const body = JSON.parse(bodyText) as {
        candidate_recipient_hash: string;
        candidate_tier: 'sun_sign' | 'chart';
        candidate_user_id: string | null;
      };
      if (body.candidate_tier === 'sun_sign'
        && body.candidate_user_id === null
        && row?.recipient_hash === body.candidate_recipient_hash) {
        row = {
          ...row,
          confirmation_token_hash: null,
          confirmation_state: 'revoked',
          confirmed_at: null,
        };
      }
      return json(null);
    }

    if (url.hostname === 'project.supabase.co'
      && url.pathname === '/rest/v1/daily_sun_preferences') {
      if (method === 'GET') return json(matches(url) && row ? [{ ...row }] : []);
      if (method === 'DELETE') {
        if (matches(url)) row = null;
        return json({});
      }
      if (method === 'PATCH') {
        const bodyText = String(init?.body);
        databaseBodies.push(bodyText);
        const body = JSON.parse(bodyText) as Partial<SunRow>;
        const changed = matches(url) && row;
        if (changed && row) row = { ...row, ...body };
        return init?.headers
          && String((init.headers as Record<string, string>).Prefer).includes('return=representation')
          ? json(changed && row ? [{ ...row }] : [])
          : json({});
      }
    }

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
      contactWrites += 1;
      if (failNextContactWrite) {
        failNextContactWrite = false;
        return json({}, 500);
      }
      return json({ id: CONTACT_ID }, 201);
    }

    if (url.pathname.endsWith('/segments') && method === 'GET') {
      return json({ data: [...segments].map((id) => ({ id })) });
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
    segments,
    get row() { return row; },
    get contactWrites() { return contactWrites; },
    failContactWrite() { failNextContactWrite = true; },
  };
}

async function requestSunLink(
  harness: ReturnType<typeof createHarness>,
  sign: string,
): Promise<string> {
  vi.stubGlobal('fetch', harness.fetcher);
  const response = responseRecorder();
  await subscribeHandler({
    method: 'POST',
    headers: SITE_HEADERS,
    body: { email: 'person@example.com', sign, locale: 'en' },
  }, response);
  expect(response.statusCode).toBe(200);
  return requestToken(harness.confirmationEmails.at(-1)?.body);
}

describe('durable daily sun confirmation state', () => {
  it('keeps only the newest resend link, keeps scanner GET read-only, and consumes success against replay', async () => {
    configure();
    const harness = createHarness();
    const oldToken = await requestSunLink(harness, 'aries');
    const currentToken = await requestSunLink(harness, 'libra');
    expect(currentToken).not.toBe(oldToken);
    expect(harness.confirmationEmails).toHaveLength(2);
    expect(harness.databaseBodies.every((body) => !body.includes('@'))).toBe(true);

    const snapshot = { ...harness.row! };
    const scanner = responseRecorder();
    await confirmHandler({ method: 'GET', query: { token: currentToken } }, scanner);
    expect(scanner.statusCode).toBe(200);
    expect(scanner.body).toContain('Confirm subscription');
    expect(harness.row).toEqual(snapshot);
    expect(harness.contactWrites).toBe(0);

    const stale = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token: oldToken } }, stale);
    expect(stale.statusCode).toBe(409);
    expect(harness.contactWrites).toBe(0);

    const confirmed = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token: currentToken } }, confirmed);
    expect(confirmed.statusCode).toBe(200);
    expect(harness.contactWrites).toBe(1);
    expect(harness.row).toMatchObject({
      sign: 'libra',
      confirmation_token_hash: null,
      confirmation_state: 'confirmed',
    });

    const replay = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token: currentToken } }, replay);
    expect(replay.statusCode).toBe(409);
    expect(harness.contactWrites).toBe(1);
  });

  it('lets exactly one concurrent confirmation claim reach the provider', async () => {
    configure();
    const harness = createHarness();
    const token = await requestSunLink(harness, 'libra');
    const first = responseRecorder();
    const second = responseRecorder();

    await Promise.all([
      confirmHandler({ method: 'POST', body: { token } }, first),
      confirmHandler({ method: 'POST', body: { token } }, second),
    ]);

    expect([first.statusCode, second.statusCode].sort()).toEqual([200, 409]);
    expect(harness.contactWrites).toBe(1);
    expect(harness.row?.confirmation_state).toBe('confirmed');
  });

  it('invalidates an outstanding link before unsubscribe touches the provider', async () => {
    configure();
    const harness = createHarness();
    const token = await requestSunLink(harness, 'aries');
    const recipientHash = dailySunRecipientHash('person@example.com');
    harness.segments.add(SEGMENTS.aries);
    const unsubscribeToken = createDailyUnsubscribeToken({
      kind: 'sun',
      contactId: CONTACT_ID,
      recipientHash,
    }, SECRET);

    const unsubscribed = responseRecorder();
    await unsubscribeHandler({ method: 'POST', query: { token: unsubscribeToken } }, unsubscribed);
    expect(unsubscribed.statusCode).toBe(200);
    expect(harness.row).toMatchObject({
      confirmation_token_hash: null,
      confirmation_state: 'revoked',
      confirmed_at: null,
    });
    expect(harness.segments.has(SEGMENTS.aries)).toBe(false);

    const stale = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token } }, stale);
    expect(stale.statusCode).toBe(409);
    expect(harness.contactWrites).toBe(0);
  });

  it('does not overwrite confirmed consent or send another DOI, deferring sign changes to managed UX', async () => {
    configure();
    const recipientHash = dailySunRecipientHash('person@example.com');
    const confirmedAt = '2026-07-20T00:00:00.000Z';
    const harness = createHarness({
      recipient_hash: recipientHash,
      sign: 'aries',
      confirmation_token_hash: null,
      confirmation_state: 'confirmed',
      confirmed_at: confirmedAt,
    });
    vi.stubGlobal('fetch', harness.fetcher);
    const response = responseRecorder();
    await subscribeHandler({
      method: 'POST',
      headers: SITE_HEADERS,
      body: { email: 'person@example.com', sign: 'libra', locale: 'en' },
    }, response);

    expect(response.statusCode).toBe(200);
    expect(harness.confirmationEmails).toHaveLength(0);
    expect(harness.row).toEqual({
      recipient_hash: recipientHash,
      sign: 'aries',
      confirmation_token_hash: null,
      confirmation_state: 'confirmed',
      confirmed_at: confirmedAt,
    });
  });

  it('releases a provider failure so the same current link can be retried', async () => {
    configure();
    const harness = createHarness();
    const token = await requestSunLink(harness, 'libra');
    harness.failContactWrite();
    const failed = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token } }, failed);
    expect(failed.statusCode).toBe(502);
    expect(harness.row?.confirmation_state).toBe('pending');

    const retried = responseRecorder();
    await confirmHandler({ method: 'POST', body: { token } }, retried);
    expect(retried.statusCode).toBe(200);
    expect(harness.row?.confirmation_state).toBe('confirmed');
  });
});
