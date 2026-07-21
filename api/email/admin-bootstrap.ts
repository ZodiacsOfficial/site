import { createEmailSubscriptionAdapter } from '../../src/lib/email/provider.js';
import { parseEmailSubscription } from '../../src/lib/email/input.js';
import { requestHeader } from '../../src/lib/email/request.js';
import { hasDailySunEmailProvider } from '../../src/lib/email/daily-config.js';
import {
  dailyEmailAdminBootstrapEnvironment,
  hasDailyEmailAdminBootstrapBearer,
  isDailyEmailAdminBootstrapAddress,
} from '../../src/lib/email/daily-admin-bootstrap.js';

function sendJson(res: any, status: number, body: Record<string, string | boolean>): void {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(JSON.stringify(body));
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'method' });
    return;
  }

  const bootstrapEnv = dailyEmailAdminBootstrapEnvironment(process.env);
  if (!bootstrapEnv) {
    sendJson(res, 404, { error: 'not_found' });
    return;
  }
  if (!hasDailyEmailAdminBootstrapBearer(requestHeader(req, 'authorization'), process.env)) {
    sendJson(res, 401, { error: 'unauthorized' });
    return;
  }

  const input = parseEmailSubscription(req.body);
  if (!input || input.locale !== 'en' || !input.sign || input.honeypot) {
    sendJson(res, 400, { error: 'invalid' });
    return;
  }
  if (!isDailyEmailAdminBootstrapAddress(input.email, process.env)) {
    sendJson(res, 403, { error: 'forbidden' });
    return;
  }
  if (!hasDailySunEmailProvider(bootstrapEnv)) {
    sendJson(res, 503, { error: 'disabled' });
    return;
  }

  const adapter = createEmailSubscriptionAdapter(bootstrapEnv, fetch, 'en');
  if (!adapter) {
    sendJson(res, 503, { error: 'disabled' });
    return;
  }

  try {
    await adapter.subscribe(input.email, input.sign);
    sendJson(res, 200, { ok: true, pending: true });
  } catch {
    sendJson(res, 502, { error: 'unavailable' });
  }
}
