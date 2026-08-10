// Deliberately self-contained: only node:crypto and global fetch. Keeping the
// weekly implementation below an underscore directory lets Vercel package it
// with the shared email entrypoint without creating another public function.
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
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(body);
}

function attr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const SIGN_SLUGS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const;

function iconWheel(): string {
  return `<div class="signs" aria-hidden="true">${SIGN_SLUGS.map((sign) => (
    `<img src="/assets/zodiac-icons/48/${sign}.webp" width="28" height="28" alt="" loading="lazy" decoding="async">`
  )).join('')}</div>`;
}

function weeklyDigestPage(
  title: string,
  body: string,
  action:
    | { kind: 'form'; action: string; label: string }
    | { kind: 'link'; href: string; label: string },
): string {
  const actionMarkup = action.kind === 'form'
    ? `<form method="POST" action="${attr(action.action)}"><button type="submit">${attr(action.label)}</button></form>`
    : `<p class="return"><a href="${attr(action.href)}">${attr(action.label)}</a></p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>${attr(title)}</title><style>@font-face{font-family:'Instrument Sans';src:url('/fonts/instrument-sans-latin-wght-normal.woff2') format('woff2-variations');font-weight:400 700;font-display:swap}@font-face{font-family:'EB Garamond';src:url('/fonts/eb-garamond-latin-500-normal.woff2') format('woff2');font-weight:500;font-display:swap}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#060709;color:#EEF1F7;font:16px/1.6 'Instrument Sans',system-ui,sans-serif}.card{width:min(560px,calc(100% - 40px));box-sizing:border-box;padding:clamp(28px,7vw,56px);border:1px solid rgba(198,204,218,.16);border-radius:22px;background:#0F121A;text-align:center}.signs{display:flex;flex-wrap:wrap;justify-content:center;gap:5px;margin:0 auto 24px;max-width:220px}.signs img{border-radius:50%}h1{margin:0 0 12px;font:500 clamp(2rem,7vw,3rem)/1.05 'EB Garamond',Georgia,serif}p{margin:0;color:#C6CCDA}form,.return{margin-top:24px}button,a{font:600 14px/1 'Instrument Sans',system-ui,sans-serif}button{padding:12px 18px;border:1px solid #C6CCDA;border-radius:999px;background:#EEF1F7;color:#060709;cursor:pointer}a{color:#EEF1F7}</style></head><body><main class="card">${iconWheel()}<h1>${attr(title)}</h1><p>${attr(body)}</p>${actionMarkup}</main></body></html>`;
}

function confirmPage(action: string): string {
  return weeklyDigestPage(
    'Unsubscribe?',
    'This stops the weekly digest for this address. One click, effective immediately.',
    { kind: 'form', action, label: 'Confirm unsubscribe' },
  );
}

function donePage(): string {
  return weeklyDigestPage(
    'Done — you’re unsubscribed.',
    'No more weekly digest. If you change your mind, restart it from your profile.',
    { kind: 'link', href: '/profile/#weekly-digest', label: 'Restart the weekly digest' },
  );
}

export default async function weeklyUnsubscribeHandler(req: any, res: any): Promise<void> {
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

  if (req.method === 'GET') {
    const action = `/api/unsubscribe?u=${encodeURIComponent(userId)}&sig=${encodeURIComponent(signature)}`;
    send(res, 200, 'text/html', confirmPage(action));
    return;
  }

  const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`;
  let ok = false;
  try {
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ digest_opt_in: false, updated_at: new Date().toISOString() }),
    });
    ok = response.ok;
  } catch {
    ok = false;
  }

  if (!ok) {
    send(res, 500, 'text/plain', 'Could not update your email preference.');
    return;
  }

  send(res, 200, 'text/html', donePage());
}
