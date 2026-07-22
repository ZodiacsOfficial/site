import { createEmailOptInToken } from './opt-in-token.js';
import {
  emailProviderName,
  environmentValue,
  hasEmailCaptureProvider,
  validLoopsFormEndpoint,
  type EmailProviderName,
} from './config.js';
import { dailyEmailFeatureEnabled } from './daily-config.js';
import { confirmDailySunContact } from './daily-resend.js';
import {
  deletePendingDailySunConfirmation,
  savePendingDailySunConfirmation,
  type DailySunStageOutcome,
} from './daily-sun-server.js';
import { createDailySunOptInToken, verifyDailySunOptInToken } from './daily-sun-token.js';
import type { ReleasedLocale as Locale } from '../i18n/core';
import { serverUiMessage } from '../i18n/ui/server.js';
import { signBySlug } from '../signs.js';
import { createRateLimitedResendRequest } from '../daily-email/resend-request.js';

type Environment = Record<string, unknown>;
type Fetch = typeof fetch;

export interface EmailSubscriptionResult {
  provider: EmailProviderName;
  pending: true;
  outcome?: DailySunStageOutcome;
}

export interface EmailSubscriptionAdapter {
  readonly provider: EmailProviderName;
  subscribe(email: string, sign?: string): Promise<EmailSubscriptionResult>;
  /** Resend uses a first-party confirmation token; native-DOI providers omit this. */
  confirm?(email: string, sign?: string, purpose?: 'weekly' | 'daily'): Promise<void>;
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
    const daily = dailyEmailFeatureEnabled(this.env) && this.locale === 'en';
    const token = daily
      ? createDailySunOptInToken({ email, sign: sign ?? '' }, secret)
      : createEmailOptInToken({ email, sign: sign ?? null, locale: this.locale }, secret);
    const dailyClaim = daily ? verifyDailySunOptInToken(token, secret) : null;
    if (daily && !dailyClaim) throw new Error('Daily sun confirmation token could not be verified.');
    const pending = daily
      ? await savePendingDailySunConfirmation(
        email,
        sign ?? '',
        token,
        dailyClaim!.expiresAt,
        this.env,
        this.fetcher,
      )
      : null;
    if (pending?.outcome === 'already_on'
      || pending?.outcome === 'cooldown'
      || pending?.outcome === 'in_flight') {
      return { provider: this.provider, pending: true, outcome: pending.outcome };
    }
    const confirmation = new URL('/api/email/confirm', baseUrl(this.env));
    confirmation.searchParams.set('token', token);

    // Text-only by design: no tracking pixels, remote images, or open signal.
    const body = daily
      ? [
        `Confirm that you want the free Zodiacs.org daily forecast for ${signBySlug(sign!).name}:`,
        '',
        `Confirm subscription: ${confirmation.toString()}`,
        '',
        'The link works for 48 hours. If you did not request this, ignore this email — nothing will be subscribed.',
      ].join('\n')
      : [
        serverUiMessage(this.locale, 'emailConfirmMessage'),
        '',
        confirmation.toString(),
        '',
        serverUiMessage(this.locale, 'emailConfirmIgnore'),
      ].join('\n');
    const request = createRateLimitedResendRequest(this.fetcher);
    try {
      const response = await request('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${environmentValue(this.env, 'RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: environmentValue(this.env, 'RESEND_FROM_EMAIL'),
          to: [email],
          subject: daily
            ? 'Confirm your Zodiacs.org daily forecast'
            : serverUiMessage(this.locale, 'emailConfirmSubject'),
          text: body,
        }),
      });
      if (!response.ok) throw providerError(this.provider, response.status);
    } catch (error) {
      if (pending) {
        try {
          await deletePendingDailySunConfirmation(
            pending.recipientHash,
            pending.confirmationTokenHash,
            this.env,
            this.fetcher,
          );
        } catch {
          // The undelivered token remains harmless and is replaced by the next request.
        }
      }
      throw error;
    }
    return {
      provider: this.provider,
      pending: true,
      ...(pending ? { outcome: pending.outcome } : {}),
    };
  }

  async confirm(email: string, sign?: string, purpose: 'weekly' | 'daily' = 'weekly'): Promise<void> {
    if (purpose === 'daily') {
      if (!sign) throw new Error('A sign is required for the daily horoscope.');
      await confirmDailySunContact(email, this.env, this.fetcher);
      return;
    }
    const signKey = environmentValue(this.env, 'RESEND_SIGN_PROPERTY') || 'sun_sign';
    const segment = environmentValue(this.env, 'RESEND_SEGMENT_ID');
    const properties = optionalSignProperty(sign, signKey);
    const response = await this.fetcher('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${environmentValue(this.env, 'RESEND_CONTACTS_API_KEY')}`,
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
