import { createEmailSubscriptionAdapter } from '../../src/lib/email/provider';
import { parseEmailSubscription } from '../../src/lib/email/input';
import { isAllowedEmailCaptureRequest, requestHeader } from '../../src/lib/email/request';
import { emailStatusPage } from '../../src/lib/email/server-page';

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

export default async function handler(req: any, res: any): Promise<void> {
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

  const adapter = createEmailSubscriptionAdapter(process.env, fetch, input.locale);
  if (!adapter) {
    if (wantsJson(req)) sendJson(res, 503, { error: 'disabled' });
    else sendHtml(res, 503, emailStatusPage(input.locale, 'emailCaptureErrorTitle', 'emailCaptureError'));
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
