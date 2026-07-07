import { createClient } from '@supabase/supabase-js';
import { verifyDigestUnsubscribe } from '../src/lib/server/digest-unsubscribe';

function text(res: any, status: number, body: string): void {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(body);
}

function html(res: any, status: number, body: string): void {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(body);
}

function attr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const PAGE_STYLE = 'font-family:system-ui,-apple-system,sans-serif;padding:2rem;background:#0b0d12;color:#f3f0e8;line-height:1.5';

/**
 * Confirmation page shown on GET — no state change. A GET can be issued
 * by a mail scanner or link-preview bot prefetching the URL, so the
 * actual unsubscribe only happens on POST (the button below, or the
 * RFC 8058 one-click List-Unsubscribe-Post from the mail client).
 */
function confirmPage(action: string): string {
  return `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Unsubscribe</title>` +
    `<body style="${PAGE_STYLE}">` +
    `<h1>Turn off the weekly digest?</h1>` +
    `<p>You'll stop receiving the weekly Zodiacs.org sky email for your saved charts.</p>` +
    `<form method="POST" action="${attr(action)}">` +
    `<button type="submit" style="font:inherit;padding:0.6rem 1.1rem;border-radius:999px;border:1px solid #f3f0e8;background:#f3f0e8;color:#0b0d12;cursor:pointer">Confirm unsubscribe</button>` +
    `</form></body>`;
}

function donePage(): string {
  return `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Unsubscribed</title>` +
    `<body style="${PAGE_STYLE}"><h1>You are unsubscribed.</h1>` +
    `<p>Your weekly Zodiacs.org digest is off. You can turn it back on any time from your profile.</p></body>`;
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    text(res, 405, 'Method not allowed');
    return;
  }

  const userId = typeof req.query?.u === 'string' ? req.query.u : '';
  const signature = typeof req.query?.sig === 'string' ? req.query.sig : '';
  const url = process.env.PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.DIGEST_UNSUBSCRIBE_SECRET;

  if (!userId || !signature || !url || !serviceKey || !secret) {
    text(res, 400, 'Invalid unsubscribe link.');
    return;
  }

  if (!verifyDigestUnsubscribe(userId, signature, secret)) {
    text(res, 403, 'Invalid unsubscribe link.');
    return;
  }

  // GET never mutates — render a confirm page whose button POSTs back.
  if (req.method === 'GET') {
    const action = `/api/unsubscribe?u=${encodeURIComponent(userId)}&sig=${encodeURIComponent(signature)}`;
    html(res, 200, confirmPage(action));
    return;
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase
    .from('profiles')
    .update({ digest_opt_in: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    text(res, 500, 'Could not update your email preference.');
    return;
  }

  html(res, 200, donePage());
}
