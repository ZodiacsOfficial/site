import { waitUntil } from '@vercel/functions';
import { checkRateLimit } from '@vercel/firewall';
import { createEmailSubscriptionAdapter } from '../../src/lib/email/provider.js';
import { parseEmailSubscription } from '../../src/lib/email/input.js';
import { isAllowedEmailCaptureRequest, requestHeader } from '../../src/lib/email/request.js';
import { emailStatusPage } from '../../src/lib/email/server-page.js';
import { dailyEmailFeatureEnabled, hasDailySunEmailProvider } from '../../src/lib/email/daily-config.js';
import { hasStandaloneWeeklyEmailCapture } from '../../src/lib/email/config.js';
import { dailyEmailPage } from '../../src/lib/email/daily-page.js';
import confirmHandler from './_confirm.js';
import unsubscribeHandler from './_unsubscribe.js';

function sendJson(res: any, status: number, body: Record<string, string | boolean>): void {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function sendHtml(res: any, status: number, body: string): void {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(body);
}

function wantsJson(req: any): boolean {
  return requestHeader(req, 'accept').includes('application/json');
}

/** Uses Vercel's per-region firewall counters; the matching WAF rule must use this exported ID. */
export const EMAIL_SUBSCRIBE_RATE_LIMIT_ID = 'zodiacs-email-subscribe';

async function subscribeRateLimited(req: any): Promise<boolean> {
  try {
    const result = await checkRateLimit(EMAIL_SUBSCRIBE_RATE_LIMIT_ID, { headers: req.headers });
    // Unlike the Aura endpoint, an unprovisioned rule must never block
    // signups — the counter engages only once the WAF rule exists.
    return result?.rateLimited === true && result?.error !== 'not-found';
  } catch {
    return false;
  }
}

// The daily path holds a durable per-recipient confirmation claim; the weekly
// path has no store of its own (the daily claim is purpose-bound), so a
// per-instance recipient cooldown absorbs scripted same-address bursts and
// spares provider send quota. Cold starts reset it — the firewall counter
// above is the cross-instance line. Insertion order doubles as an LRU bound.
const WEEKLY_COOLDOWN_MS = 10 * 60_000;
const WEEKLY_COOLDOWN_MAX_ENTRIES = 5_000;
const weeklyCooldown = new Map<string, number>();

export function weeklyRecipientOnCooldown(email: string, now = Date.now()): boolean {
  const key = email.trim().toLowerCase();
  const last = weeklyCooldown.get(key);
  if (last !== undefined && now - last < WEEKLY_COOLDOWN_MS) return true;
  weeklyCooldown.delete(key);
  weeklyCooldown.set(key, now);
  if (weeklyCooldown.size > WEEKLY_COOLDOWN_MAX_ENTRIES) {
    const oldest = weeklyCooldown.keys().next().value;
    if (oldest !== undefined) weeklyCooldown.delete(oldest);
  }
  return false;
}

export async function handleEmailSubscribe(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'method' });
    return;
  }
  if (!isAllowedEmailCaptureRequest(req)) {
    sendJson(res, 403, { error: 'forbidden' });
    return;
  }
  if (await subscribeRateLimited(req)) {
    res.setHeader('Retry-After', '60');
    sendJson(res, 429, { error: 'rate_limited' });
    return;
  }

  const input = parseEmailSubscription(req.body);
  if (!input) {
    if (wantsJson(req)) sendJson(res, 400, { error: 'invalid' });
    else sendHtml(res, 400, emailStatusPage('en', 'emailCaptureErrorTitle', 'emailCaptureError'));
    return;
  }

  const daily = dailyEmailFeatureEnabled(process.env) && input.locale === 'en';
  if (daily && !input.sign) {
    if (wantsJson(req)) sendJson(res, 400, { error: 'sign_required' });
    else sendHtml(res, 400, dailyEmailPage('Choose your sign', 'A sign is needed for the daily horoscope.'));
    return;
  }

  if (daily && !hasDailySunEmailProvider(process.env)) {
    if (wantsJson(req)) sendJson(res, 503, { error: 'disabled' });
    else sendHtml(res, 503, dailyEmailPage('Not available yet', 'Daily email is not ready to join just yet.'));
    return;
  }

  if (!daily && !hasStandaloneWeeklyEmailCapture(process.env)) {
    if (wantsJson(req)) sendJson(res, 503, { error: 'disabled' });
    else sendHtml(res, 503, emailStatusPage(input.locale, 'emailCaptureErrorTitle', 'emailCaptureError'));
    return;
  }

  const adapter = createEmailSubscriptionAdapter(process.env, fetch, input.locale);
  if (!adapter) {
    if (wantsJson(req)) sendJson(res, 503, { error: 'disabled' });
    else sendHtml(res, 503, emailStatusPage(input.locale, 'emailCaptureErrorTitle', 'emailCaptureError'));
    return;
  }

  // Daily DOI dispatch continues inside the Vercel request lifecycle without
  // delaying the public response. This keeps active, pending, throttled, and
  // new addresses indistinguishable at the HTTP boundary. The durable
  // recipient cooldown prevents background requests from becoming an email
  // flooding or token-churn path.
  if (daily) {
    if (!input.honeypot) {
      waitUntil(adapter.subscribe(input.email, input.sign).then(
        () => undefined,
        () => undefined,
      ));
    }
    if (wantsJson(req)) sendJson(res, 200, { ok: true, pending: true });
    else sendHtml(res, 200, dailyEmailPage(
      'You’re set.',
      'If confirmation or a change is needed, check your inbox. Nothing changes until you confirm it.',
    ));
    return;
  }

  try {
    // A filled hidden field is treated as a successful no-op, and so is a
    // recipient inside the weekly cooldown window — throttled, new, and
    // known addresses stay indistinguishable at the HTTP boundary. Only the
    // email and optional self-declared sign ever cross the provider boundary.
    if (!input.honeypot && !weeklyRecipientOnCooldown(input.email)) {
      await adapter.subscribe(input.email, input.sign);
    }
    if (wantsJson(req)) sendJson(res, 200, { ok: true, pending: true });
    else sendHtml(res, 200, emailStatusPage(input.locale, 'emailPendingTitle', 'emailPendingBody'));
  } catch {
    if (wantsJson(req)) sendJson(res, 502, { error: 'unavailable' });
    else sendHtml(res, 502, emailStatusPage(input.locale, 'emailCaptureErrorTitle', 'emailCaptureError'));
  }
}

export function emailLifecycleRoute(req: any): 'subscribe' | 'confirm' | 'unsubscribe' | 'invalid' {
  const route = req?.query?.__zodiacs_email_route;
  if (route === undefined) return 'subscribe';
  if (route === 'confirm' || route === 'unsubscribe') return route;
  return 'invalid';
}

export default async function handler(req: any, res: any): Promise<void> {
  const route = emailLifecycleRoute(req);
  if (route === 'confirm') {
    await confirmHandler(req, res);
    return;
  }
  if (route === 'unsubscribe') {
    await unsubscribeHandler(req, res);
    return;
  }
  if (route === 'invalid') {
    sendJson(res, 404, { error: 'route' });
    return;
  }
  await handleEmailSubscribe(req, res);
}
