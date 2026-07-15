import { createEmailSubscriptionAdapter } from '../../src/lib/email/provider';
import { hasEmailCaptureProvider } from '../../src/lib/email/config';
import { verifyEmailOptInToken } from '../../src/lib/email/opt-in-token';
import { requestHeader } from '../../src/lib/email/request';
import { emailStatusPage } from '../../src/lib/email/server-page';
import type { Locale } from '../../src/lib/i18n/core';

function sendJson(res: any, status: number, body: Record<string, string | boolean>): void {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function send(res: any, status: number, body: string): void {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(body);
}

function tokenFromBody(body: unknown): string {
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as { token?: unknown };
      if (typeof parsed.token === 'string') return parsed.token;
    } catch {
      return new URLSearchParams(body).get('token') ?? '';
    }
  }
  if (body && typeof body === 'object' && typeof (body as { token?: unknown }).token === 'string') {
    return (body as { token: string }).token;
  }
  return '';
}

function wantsJson(req: any): boolean {
  return requestHeader(req, 'accept').includes('application/json');
}

function sendUnavailable(req: any, res: any, locale: Locale): void {
  if (wantsJson(req)) sendJson(res, 503, { error: 'disabled' });
  else send(res, 503, emailStatusPage(locale, 'emailCaptureErrorTitle', 'emailCaptureError'));
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    send(res, 405, emailStatusPage('en', 'emailConfirmInvalidTitle', 'emailConfirmInvalidBody'));
    return;
  }
  const token = req.method === 'GET'
    ? (typeof req.query?.token === 'string' ? req.query.token : '')
    : tokenFromBody(req.body);
  const secret = process.env.EMAIL_CONFIRM_SECRET ?? '';
  const claim = secret ? verifyEmailOptInToken(token, secret) : null;
  if (!hasEmailCaptureProvider(process.env)) {
    sendUnavailable(req, res, claim?.locale ?? 'en');
    return;
  }
  if (!claim) {
    send(res, 400, emailStatusPage('en', 'emailConfirmInvalidTitle', 'emailConfirmInvalidBody'));
    return;
  }

  // GET never changes state: link scanners can safely inspect it. The human
  // confirms with the POST button rendered below.
  if (req.method === 'GET') {
    send(res, 200, emailStatusPage(claim.locale, 'emailConfirmTitle', 'emailConfirmBody', { token }));
    return;
  }

  const adapter = createEmailSubscriptionAdapter(process.env);
  if (!adapter?.confirm) {
    send(res, 503, emailStatusPage(claim.locale, 'emailCaptureErrorTitle', 'emailCaptureError'));
    return;
  }
  try {
    await adapter.confirm(claim.email, claim.sign ?? undefined);
    send(res, 200, emailStatusPage(claim.locale, 'emailConfirmedTitle', 'emailConfirmedBody'));
  } catch {
    send(res, 502, emailStatusPage(claim.locale, 'emailCaptureErrorTitle', 'emailCaptureError'));
  }
}
