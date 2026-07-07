// Vercel serverless function (this repo builds to static Astro with no SSR
// adapter, so a per-request endpoint lives here as a zero-config function).
// Deliberately self-contained: only node:crypto (a builtin) and global fetch.
// It imports nothing from ../src and does NOT pull @supabase/supabase-js —
// both were import-time crash risks in the bundled function, and the DB
// write is a single PostgREST call the service role can make directly.
import { createHmac, timingSafeEqual } from 'node:crypto';

const SIGNING_CONTEXT = 'zodiacs-weekly-digest-unsubscribe';

function verify(userId: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(`${SIGNING_CONTEXT}:${userId}`).digest('base64url');
  const given = Buffer.from(signature, 'base64url');
  const target = Buffer.from(expected, 'base64url');
  return given.length === target.length && timingSafeEqual(given, target);
}

function send(res: any, status: number, type: string, body: string): void {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', `${type}; charset=utf-8`);
  res.end(body);
}

function attr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const STYLE = 'font-family:system-ui,-apple-system,sans-serif;padding:2rem;background:#0b0d12;color:#f3f0e8;line-height:1.5';

/** Shown on GET — no state change (mail scanners prefetch GET links). */
function confirmPage(action: string): string {
  return `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Unsubscribe</title>` +
    `<body style="${STYLE}"><h1>Turn off the weekly digest?</h1>` +
    `<p>You'll stop receiving the weekly Zodiacs.org sky email for your saved charts.</p>` +
    `<form method="POST" action="${attr(action)}">` +
    `<button type="submit" style="font:inherit;padding:0.6rem 1.1rem;border-radius:999px;border:1px solid #f3f0e8;background:#f3f0e8;color:#0b0d12;cursor:pointer">Confirm unsubscribe</button>` +
    `</form></body>`;
}

function donePage(): string {
  return `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Unsubscribed</title>` +
    `<body style="${STYLE}"><h1>You are unsubscribed.</h1>` +
    `<p>Your weekly Zodiacs.org digest is off. You can turn it back on any time from your profile.</p></body>`;
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    send(res, 405, 'text/plain', 'Method not allowed');
    return;
  }

  const userId = typeof req.query?.u === 'string' ? req.query.u : '';
  const signature = typeof req.query?.sig === 'string' ? req.query.sig : '';
  const url = process.env.PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.DIGEST_UNSUBSCRIBE_SECRET;

  if (!userId || !signature || !url || !serviceKey || !secret) {
    send(res, 400, 'text/plain', 'Invalid unsubscribe link.');
    return;
  }

  if (!verify(userId, signature, secret)) {
    send(res, 403, 'text/plain', 'Invalid unsubscribe link.');
    return;
  }

  // GET never mutates — render a confirm page whose button POSTs back.
  if (req.method === 'GET') {
    const action = `/api/unsubscribe?u=${encodeURIComponent(userId)}&sig=${encodeURIComponent(signature)}`;
    send(res, 200, 'text/html', confirmPage(action));
    return;
  }

  // POST performs the opt-out via PostgREST (service role bypasses RLS).
  const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`;
  let ok = false;
  try {
    const patch = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ digest_opt_in: false, updated_at: new Date().toISOString() }),
    });
    ok = patch.ok;
  } catch {
    ok = false;
  }

  if (!ok) {
    send(res, 500, 'text/plain', 'Could not update your email preference.');
    return;
  }

  send(res, 200, 'text/html', donePage());
}
