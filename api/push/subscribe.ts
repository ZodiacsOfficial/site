// Vercel serverless function. Keep this endpoint self-contained: subscription
// records go straight to PostgREST with the server-only service-role key.

const MAX_ENDPOINT_LENGTH = 2_048;
const MAX_KEY_LENGTH = 512;

export interface PushSubscriptionInput {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
  lang?: string;
}

function firstHeader(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}

function requestHeader(req: any, name: string): string {
  if (typeof req.get === 'function') {
    const value = req.get(name);
    if (typeof value === 'string') return value;
  }
  return firstHeader(req.headers?.[name.toLowerCase()]);
}

function hostname(value: string): string {
  const first = value.split(',')[0]?.trim().toLowerCase() ?? '';
  if (!first) return '';
  try {
    return new URL(first.includes('://') ? first : `https://${first}`).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** Allow only the production site or the Vercel preview serving this request. */
export function isAllowedSiteRequest(req: any): boolean {
  const source = requestHeader(req, 'origin') || requestHeader(req, 'referer');
  if (!source) return false;

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return false;
  }
  if (sourceUrl.protocol !== 'https:') return false;

  const sourceHost = sourceUrl.hostname.toLowerCase();
  const requestHost = hostname(requestHeader(req, 'x-forwarded-host') || requestHeader(req, 'host'));
  if (!requestHost || sourceHost !== requestHost) return false;
  return sourceHost === 'zodiacs.org'
    || sourceHost === 'www.zodiacs.org'
    || sourceHost.endsWith('.vercel.app');
}

function parseBody(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function validEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ENDPOINT_LENGTH) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function validKey(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= MAX_KEY_LENGTH
    && /^[A-Za-z0-9_-]+={0,2}$/.test(value);
}

export function parseSubscription(input: unknown): Required<PushSubscriptionInput> | null {
  const body = parseBody(input);
  if (!body || typeof body !== 'object') return null;
  const candidate = body as PushSubscriptionInput;
  if (!validEndpoint(candidate.endpoint)
    || !validKey(candidate.keys?.p256dh)
    || !validKey(candidate.keys?.auth)) return null;
  const lang = candidate.lang === 'es' ? 'es' : 'en';
  return {
    endpoint: candidate.endpoint,
    keys: { p256dh: candidate.keys.p256dh, auth: candidate.keys.auth },
    lang,
  };
}

export function parseUnsubscribe(input: unknown): string | null {
  const body = parseBody(input);
  if (!body || typeof body !== 'object') return null;
  const endpoint = (body as { endpoint?: unknown }).endpoint;
  return validEndpoint(endpoint) ? endpoint : null;
}

function sendJson(res: any, status: number, body: Record<string, string | boolean>): void {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function serviceHeaders(serviceKey: string, prefer: string): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: prefer,
  };
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE');
    sendJson(res, 405, { error: 'method' });
    return;
  }
  if (!isAllowedSiteRequest(req)) {
    sendJson(res, 403, { error: 'forbidden' });
    return;
  }
  if (process.env.PUSH_ENABLED !== '1') {
    sendJson(res, 503, { error: 'disabled' });
    return;
  }

  const url = process.env.PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    sendJson(res, 503, { error: 'unavailable' });
    return;
  }

  try {
    if (req.method === 'POST') {
      const subscription = parseSubscription(req.body);
      if (!subscription) {
        sendJson(res, 400, { error: 'invalid' });
        return;
      }
      const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/push_subscriptions?on_conflict=endpoint`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: serviceHeaders(serviceKey, 'resolution=merge-duplicates,return=minimal'),
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          lang: subscription.lang,
        }),
      });
      if (!response.ok) throw new Error(`PostgREST ${response.status}`);
      sendJson(res, 200, { ok: true });
      return;
    }

    const pushEndpoint = parseUnsubscribe(req.body);
    if (!pushEndpoint) {
      sendJson(res, 400, { error: 'invalid' });
      return;
    }
    const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(pushEndpoint)}`;
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: serviceHeaders(serviceKey, 'return=minimal'),
    });
    if (!response.ok) throw new Error(`PostgREST ${response.status}`);
    sendJson(res, 200, { ok: true });
  } catch {
    sendJson(res, 502, { error: 'unavailable' });
  }
}
