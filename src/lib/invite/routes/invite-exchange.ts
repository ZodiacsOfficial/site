import { queryValue } from '../api.js';
import { compatibilityInviteCreationEnabled } from '../config.js';
import { setInviteCapabilityCookie } from '../request.js';
import { exchangeCompatibilityInvite } from '../server.js';
import {
  compatibilityInviteTokenHash,
  createCompatibilityInviteSessionHandle,
} from '../token.js';

function redirect(res: any, location: string, cookie?: string): void {
  res.statusCode = 303;
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Location', location);
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (cookie) res.setHeader('Set-Cookie', cookie);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.end('');
}

function unavailable(res: any): void {
  redirect(res, '/compatibility/#invite=unavailable');
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end('');
    return;
  }
  if (!compatibilityInviteCreationEnabled(process.env)) {
    unavailable(res);
    return;
  }
  const rawToken = queryValue(req, 'token');
  const hash = compatibilityInviteTokenHash(rawToken);
  if (!hash) {
    unavailable(res);
    return;
  }
  try {
    const result = await exchangeCompatibilityInvite(hash);
    if (result.outcome !== 'ready') {
      unavailable(res);
      return;
    }
    const seconds = Math.max(0, Math.floor((Date.parse(result.expiresAt) - Date.now()) / 1000));
    const handle = createCompatibilityInviteSessionHandle();
    redirect(
      res,
      `/compatibility/#invite=${handle}`,
      setInviteCapabilityCookie(handle, rawToken, seconds),
    );
  } catch {
    unavailable(res);
  }
}
