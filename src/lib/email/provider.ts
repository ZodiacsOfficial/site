import { createEmailOptInToken } from './opt-in-token';
import {
  emailProviderName,
  environmentValue,
  hasEmailCaptureProvider,
  validLoopsFormEndpoint,
  type EmailProviderName,
} from './config';
import type { Locale } from '../i18n/core';
import { serverUiMessage } from '../i18n/ui/server';

type Environment = Record<string, unknown>;
type Fetch = typeof fetch;

export interface EmailSubscriptionResult {
  provider: EmailProviderName;
  pending: true;
}

export interface EmailSubscriptionAdapter {
  readonly provider: EmailProviderName;
  subscribe(email: string, sign?: string): Promise<EmailSubscriptionResult>;
  /** Resend uses a first-party confirmation token; native-DOI providers omit this. */
  confirm?(email: string, sign?: string): Promise<void>;
}

function providerError(provider: EmailProviderName, status: number): Error {
  return new Error(`${provider} subscription request failed (${status})`);
}

function baseUrl(env: Environment): string {
  const configured = environmentValue(env, 'EMAIL_CONFIRM_BASE_URL') || 'https://zodiacs.org';
  const url = new URL(configured);
  if (url.protocol !== 'https:') throw new Error('EMAIL_CONFIRM_BASE_URL must use HTTPS.');
  return url.origin;
}

function optionalSignProperty(sign: string | undefined, key: string): Record<string, string> | undefined {
  return sign ? { [key]: sign } : undefined;
}

class ResendAdapter implements EmailSubscriptionAdapter {
  readonly provider = 'resend' as const;

  constructor(
    private readonly env: Environment,
    private readonly fetcher: Fetch,
    private readonly locale: Locale,
  ) {}

  async subscribe(email: string, sign?: string): Promise<EmailSubscriptionResult> {
    const secret = environmentValue(this.env, 'EMAIL_CONFIRM_SECRET');
    const token = createEmailOptInToken({ email, sign: sign ?? null, locale: this.locale }, secret);
    const confirmation = new URL('/api/email/confirm', baseUrl(this.env));
    confirmation.searchParams.set('token', token);

    // Text-only by design: no tracking pixels, remote images, or open signal.
    const body = [
      serverUiMessage(this.locale, 'emailConfirmMessage'),
      '',
      confirmation.toString(),
      '',
      serverUiMessage(this.locale, 'emailConfirmIgnore'),
    ].join('\n');
    const response = await this.fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${environmentValue(this.env, 'RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: environmentValue(this.env, 'RESEND_FROM_EMAIL'),
        to: [email],
        subject: serverUiMessage(this.locale, 'emailConfirmSubject'),
        text: body,
      }),
    });
    if (!response.ok) throw providerError(this.provider, response.status);
    return { provider: this.provider, pending: true };
  }

  async confirm(email: string, sign?: string): Promise<void> {
    const signKey = environmentValue(this.env, 'RESEND_SIGN_PROPERTY') || 'sun_sign';
    const segment = environmentValue(this.env, 'RESEND_SEGMENT_ID');
    const properties = optionalSignProperty(sign, signKey);
    const response = await this.fetcher('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${environmentValue(this.env, 'RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        unsubscribed: false,
        ...(properties ? { properties } : {}),
        ...(segment ? { segments: [{ id: segment }] } : {}),
      }),
    });
    // A replayed confirmation or an already-present contact is a safe no-op.
    // Never update an existing contact here: that could re-subscribe someone
    // who previously opted out.
    if (!response.ok && response.status !== 409) throw providerError(this.provider, response.status);
  }
}

class ButtondownAdapter implements EmailSubscriptionAdapter {
  readonly provider = 'buttondown' as const;

  constructor(private readonly env: Environment, private readonly fetcher: Fetch) {}

  async subscribe(email: string, sign?: string): Promise<EmailSubscriptionResult> {
    const response = await this.fetcher('https://api.buttondown.com/v1/subscribers', {
      method: 'POST',
      headers: {
        Authorization: `Token ${environmentValue(this.env, 'BUTTONDOWN_API_KEY')}`,
        'Content-Type': 'application/json',
        'X-API-Version': '2026-01-01',
      },
      // Omitting `type` is the double-opt-in contract: Buttondown creates an
      // `unactivated` subscriber and sends its confirmation email.
      body: JSON.stringify({
        email_address: email,
        ...(sign ? { metadata: { sun_sign: sign } } : {}),
      }),
    });
    // Buttondown rejects duplicates instead of overwriting their consent
    // history. Keep the public response neutral and do not attempt an update.
    if (!response.ok && response.status !== 400 && response.status !== 409) {
      throw providerError(this.provider, response.status);
    }
    return { provider: this.provider, pending: true };
  }
}

class LoopsAdapter implements EmailSubscriptionAdapter {
  readonly provider = 'loops' as const;

  constructor(private readonly env: Environment, private readonly fetcher: Fetch) {}

  async subscribe(email: string, sign?: string): Promise<EmailSubscriptionResult> {
    const endpoint = environmentValue(this.env, 'LOOPS_FORM_ENDPOINT');
    if (!validLoopsFormEndpoint(endpoint)) throw new Error('Invalid Loops form endpoint.');
    const signField = environmentValue(this.env, 'LOOPS_SIGN_PROPERTY') || 'sunSign';
    const list = environmentValue(this.env, 'LOOPS_MAILING_LIST_ID');
    const payload = new URLSearchParams({ email });
    if (sign) payload.set(signField, sign);
    if (list) payload.set('mailingLists', list);
    const response = await this.fetcher(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
    });
    if (!response.ok) throw providerError(this.provider, response.status);
    return { provider: this.provider, pending: true };
  }
}

export function createEmailSubscriptionAdapter(
  env: Environment = process.env,
  fetcher: Fetch = fetch,
  locale: Locale = 'en',
): EmailSubscriptionAdapter | null {
  if (!hasEmailCaptureProvider(env)) return null;
  switch (emailProviderName(env)) {
    case 'resend': return new ResendAdapter(env, fetcher, locale);
    case 'buttondown': return new ButtondownAdapter(env, fetcher);
    case 'loops': return new LoopsAdapter(env, fetcher);
    default: return null;
  }
}
