import { waitUntil } from '@vercel/functions';
import { createEmailSubscriptionAdapter } from '../../src/lib/email/provider.js';
import { parseEmailSubscription } from '../../src/lib/email/input.js';
import { isAllowedEmailCaptureRequest, requestHeader } from '../../src/lib/email/request.js';
import { emailStatusPage } from '../../src/lib/email/server-page.js';
import { dailyEmailFeatureEnabled, hasDailySunEmailProvider } from '../../src/lib/email/daily-config.js';
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
    // A filled hidden field is treated as a successful no-op. Only the email
    // and optional self-declared sign ever cross the provider boundary.
    if (!input.honeypot) await adapter.subscribe(input.email, input.sign);
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
