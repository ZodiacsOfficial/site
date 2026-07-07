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

  if (req.method === 'POST') {
    text(res, 200, '');
    return;
  }

  html(res, 200, '<!doctype html><meta charset="utf-8"><title>Unsubscribed</title><body style="font-family:system-ui,sans-serif;padding:2rem;background:#0b0d12;color:#f3f0e8"><h1>You are unsubscribed.</h1><p>Your weekly Zodiacs.org digest is off.</p></body>');
}
