import { afterEach, describe, expect, it, vi } from 'vitest';
import subscribeHandler from '../../../api/email/subscribe';
import confirmHandler from '../../../api/email/confirm';
import { hasEmailCaptureProvider } from './config';
import { createEmailSubscriptionAdapter } from './provider';
import { createEmailOptInToken, EMAIL_OPT_IN_TTL_MS, verifyEmailOptInToken } from './opt-in-token';
import { parseEmailSubscription } from './input';
import { emailStatusPage } from './server-page';

const ORIGINAL_ENV = { ...process.env };
const SECRET = 'test-secret-that-is-at-least-thirty-two-characters';

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

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
  accept: 'application/json',
};

describe('email capture configuration', () => {
  it('stays hidden without a fully configured provider', () => {
    expect(hasEmailCaptureProvider({})).toBe(false);
    expect(hasEmailCaptureProvider({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_test' })).toBe(false);
    expect(hasEmailCaptureProvider({
      EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 're_same',
      RESEND_CONTACTS_API_KEY: 're_same',
      RESEND_FROM_EMAIL: 'Zodiacs.org <hello@zodiacs.org>',
      EMAIL_CONFIRM_SECRET: SECRET,
    })).toBe(false);
    expect(hasEmailCaptureProvider({
      EMAIL_PROVIDER: 'loops',
      LOOPS_FORM_ENDPOINT: 'https://app.loops.so/api/newsletter-form/form_123',
    })).toBe(false);
  });

  it('requires Loops form double opt-in acknowledgement and blocks arbitrary endpoints', () => {
    expect(hasEmailCaptureProvider({
      EMAIL_PROVIDER: 'loops',
      LOOPS_FORM_ENDPOINT: 'https://app.loops.so/api/newsletter-form/form_123',
      LOOPS_DOUBLE_OPT_IN_CONFIRMED: '1',
    })).toBe(true);
    expect(hasEmailCaptureProvider({
      EMAIL_PROVIDER: 'loops',
      LOOPS_FORM_ENDPOINT: 'https://attacker.test/api/newsletter-form/form_123',
      LOOPS_DOUBLE_OPT_IN_CONFIRMED: '1',
    })).toBe(false);
  });
});

describe('email capture input', () => {
  it('normalizes only email, optional sign, and locale', () => {
    expect(parseEmailSubscription({
      email: ' Person@Example.COM ', sign: 'libra', locale: 'es',
      birthDate: '1990-01-01', birthTime: '12:00', birthplace: 'private',
    })).toEqual({
      email: 'person@example.com', sign: 'libra', locale: 'es', honeypot: false,
    });
  });

  it('rejects malformed email and non-canonical signs', () => {
    expect(parseEmailSubscription({ email: 'not-an-email', sign: '' })).toBeNull();
    expect(parseEmailSubscription({ email: 'person@example.com', sign: 'ophiuchus' })).toBeNull();
  });

  it('preserves every locale rail, including regional Portuguese input', () => {
    expect(parseEmailSubscription({ email: 'pt@example.com', locale: 'pt-BR' })?.locale).toBe('pt');
    expect(parseEmailSubscription({ email: 'fr@example.com', locale: 'fr' })?.locale).toBe('fr');
    expect(parseEmailSubscription({ email: 'it@example.com', locale: 'it' })?.locale).toBe('it');
  });
});

describe('Resend first-party confirmation token', () => {
  it('round-trips a pending claim and rejects tampering or expiry', () => {
    const now = Date.UTC(2026, 6, 15);
    const token = createEmailOptInToken({
      email: 'person@example.com', sign: 'libra', locale: 'en',
    }, SECRET, now);
    expect(verifyEmailOptInToken(token, SECRET, now + 1_000)).toMatchObject({
      email: 'person@example.com', sign: 'libra', locale: 'en',
      expiresAt: now + EMAIL_OPT_IN_TTL_MS,
    });
    expect(verifyEmailOptInToken(`${token}x`, SECRET, now)).toBeNull();
    expect(verifyEmailOptInToken(token, SECRET, now + EMAIL_OPT_IN_TTL_MS)).toBeNull();
  });

  it.each(['pt', 'fr', 'it'] as const)('round-trips the %s locale and renders its document language', (locale) => {
    const now = Date.UTC(2026, 6, 15);
    const token = createEmailOptInToken({
      email: `${locale}@example.com`, sign: null, locale,
    }, SECRET, now);
    expect(verifyEmailOptInToken(token, SECRET, now + 1_000)?.locale).toBe(locale);
    const page = emailStatusPage(locale, 'emailPendingTitle', 'emailPendingBody');
    expect(page).toContain(`<html lang="${locale === 'pt' ? 'pt-BR' : locale}">`);
  });
});

describe('Buttondown subscription adapter', () => {
  it('creates an unactivated, double-opt-in subscriber without a type override', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    const adapter = createEmailSubscriptionAdapter({
      EMAIL_PROVIDER: 'buttondown',
      BUTTONDOWN_API_KEY: 'buttondown-test-key',
    }, fetcher as unknown as typeof fetch);
    await expect(adapter?.subscribe('person@example.com', 'libra')).resolves.toEqual({
      provider: 'buttondown', pending: true,
    });
    const [, request] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(request.body))).toEqual({
      email_address: 'person@example.com',
      metadata: { sun_sign: 'libra' },
    });
    expect(JSON.parse(String(request.body))).not.toHaveProperty('type');
  });

  it('runs the same adapter through the public endpoint end to end', async () => {
    process.env.EMAIL_PROVIDER = 'buttondown';
    process.env.BUTTONDOWN_API_KEY = 'buttondown-test-key';
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal('fetch', fetcher);
    const response = responseRecorder();
    await subscribeHandler({
      method: 'POST',
      headers: SITE_HEADERS,
      body: {
        email: 'person@example.com', sign: 'aries', locale: 'en',
        birthDate: '1990-01-01', birthplace: 'must-not-cross-boundary',
      },
    }, response);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ ok: true, pending: true });
    const providerPayload = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(providerPayload).toEqual({
      email_address: 'person@example.com', metadata: { sun_sign: 'aries' },
    });
    expect(JSON.stringify(providerPayload)).not.toContain('birth');
  });
});

describe('Resend and Loops subscription adapters', () => {
  it('sends a text-only Resend confirmation before creating any contact', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const adapter = createEmailSubscriptionAdapter({
      EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 're_sending_test',
      RESEND_CONTACTS_API_KEY: 're_contacts_test',
      RESEND_FROM_EMAIL: 'Zodiacs.org <hello@zodiacs.org>',
      EMAIL_CONFIRM_SECRET: SECRET,
      EMAIL_CONFIRM_BASE_URL: 'https://zodiacs.org',
    }, fetcher as unknown as typeof fetch, 'en');
    await adapter?.subscribe('person@example.com', 'taurus');
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.resend.com/emails');
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get('authorization'))
      .toBe('Bearer re_sending_test');
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({
      to: ['person@example.com'],
      subject: 'Confirm your Zodiacs.org weekly forecast',
    });
    expect(body.text).toContain('https://zodiacs.org/api/email/confirm?token=');
    expect(body).not.toHaveProperty('html');
    expect(fetcher.mock.calls.map((call) => call[0])).not.toContain('https://api.resend.com/contacts');
  });

  it('uses the Loops form endpoint so provider double opt-in applies', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const endpoint = 'https://app.loops.so/api/newsletter-form/form_123';
    const adapter = createEmailSubscriptionAdapter({
      EMAIL_PROVIDER: 'loops',
      LOOPS_FORM_ENDPOINT: endpoint,
      LOOPS_DOUBLE_OPT_IN_CONFIRMED: '1',
      LOOPS_MAILING_LIST_ID: 'list_public',
    }, fetcher as unknown as typeof fetch);
    await adapter?.subscribe('person@example.com', 'cancer');
    expect(fetcher.mock.calls[0]?.[0]).toBe(endpoint);
    const body = new URLSearchParams(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(Object.fromEntries(body)).toEqual({
      email: 'person@example.com',
      sunSign: 'cancer',
      mailingLists: 'list_public',
    });
  });
});

describe('Resend confirmation endpoint', () => {
  it('makes GET read-only and creates the contact only after POST confirmation', async () => {
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 're_sending_test';
    process.env.RESEND_CONTACTS_API_KEY = 're_contacts_test';
    process.env.RESEND_FROM_EMAIL = 'Zodiacs.org <hello@zodiacs.org>';
    process.env.EMAIL_CONFIRM_SECRET = SECRET;
    const token = createEmailOptInToken({
      email: 'person@example.com', sign: 'pisces', locale: 'en',
    }, SECRET);
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal('fetch', fetcher);

    const getResponse = responseRecorder();
    await confirmHandler({ method: 'GET', query: { token } }, getResponse);
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body).toContain('method="post"');
    expect(getResponse.body).toContain('/assets/zodiac-icons/48/aries.webp');
    expect(getResponse.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(fetcher).not.toHaveBeenCalled();

    const postResponse = responseRecorder();
    await confirmHandler({
      method: 'POST', body: new URLSearchParams({ token }).toString(),
    }, postResponse);
    expect(postResponse.statusCode).toBe(200);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.resend.com/contacts');
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get('authorization'))
      .toBe('Bearer re_contacts_test');
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      email: 'person@example.com',
      unsubscribed: false,
      properties: { sun_sign: 'pisces' },
    });
  });
});
