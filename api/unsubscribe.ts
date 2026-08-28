// Vercel serverless function (this repo builds to static Astro with no SSR
// adapter, so a per-request endpoint lives here as a zero-config function).
// Deliberately self-contained: the only database operation is a narrowly
// granted SECURITY DEFINER RPC. Vercel receives the already-public Supabase
// browser key, never the database-wide service role or a signing secret.
const TOKEN = /^[A-Za-z0-9_-]{43}$/u;
const UNSUBSCRIBE_RPC_TIMEOUT_MS = 5_000;

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

/** Shown on GET — no state change (mail scanners prefetch GET links). */
function confirmPage(action: string): string {
  return weeklyDigestPage(
    'Unsubscribe?',
    'This turns off the weekly digest preference for this address now. A message already in flight may still arrive.',
    { kind: 'form', action, label: 'Confirm unsubscribe' },
  );
}

function donePage(): string {
  // The existing weekly preference restarts from the authenticated profile;
  // unlike the two daily lists, it does not send a fresh confirmation email.
  return weeklyDigestPage(
    'Done — you’re unsubscribed.',
    'Your weekly digest preference is off. A message already in flight may still arrive. You can restart it from your profile.',
    { kind: 'link', href: '/profile/#weekly-digest', label: 'Restart the weekly digest' },
  );
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    send(res, 405, 'text/plain', 'Method not allowed');
    return;
  }

  const token = typeof req.query?.token === 'string' ? req.query.token : '';
  const url = process.env.PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!TOKEN.test(token)) {
    send(res, 400, 'text/plain', 'Invalid unsubscribe link.');
    return;
  }

  if (!url || !publishableKey) {
    send(res, 503, 'text/plain', 'Unsubscribe is temporarily unavailable.');
    return;
  }

  // GET never mutates — render a confirm page whose button POSTs back.
  if (req.method === 'GET') {
    const action = `/api/unsubscribe?token=${encodeURIComponent(token)}`;
    send(res, 200, 'text/html', confirmPage(action));
    return;
  }

  // POST presents the bearer capability to a function that can only turn the
  // weekly preference off. The public key cannot read token rows or profiles.
  const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/rpc/weekly_digest_unsubscribe_v1`;
  let outcome: 'success' | 'invalid' | 'unavailable' = 'unavailable';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ candidate_token: token }),
      signal: AbortSignal.timeout(UNSUBSCRIBE_RPC_TIMEOUT_MS),
    });
    if (response.ok) {
      outcome = await response.json() === true ? 'success' : 'invalid';
    }
  } catch {
    outcome = 'unavailable';
  }

  if (outcome === 'invalid') {
    send(res, 400, 'text/plain', 'Invalid or expired unsubscribe link.');
    return;
  }
  if (outcome === 'unavailable') {
    send(res, 503, 'text/plain', 'Unsubscribe is temporarily unavailable.');
    return;
  }

  send(res, 200, 'text/html', donePage());
}
