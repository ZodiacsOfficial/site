/**
 * Anonymous participant identity for the Zodiac Games, modeled on the Guide
 * session (src/lib/guide-server/security.ts). The browser holds a signed,
 * content-free session cookie; the server stores only domain-separated
 * HMACs of it. No email, wallet, account id, or raw IP ever reaches the
 * Games tables — the join rate limit sees a coarsened IP-bucket HMAC only.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { accountRequestHeader } from '../account-api/request.js';

const SESSION_COOKIE = '__Host-zodiacs_games';
const SESSION_VERSION = 'v1';
const SESSION_BYTES = 24;
const SIGNATURE_BYTES = 32;

function base64Url(value: Buffer): string {
  return value.toString('base64url');
}

function hmac(secret: string, domain: string, value: string): Buffer {
  return createHmac('sha256', secret).update(domain).update('\0').update(value).digest();
}

export function validGamesSecret(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= 32
    && value.length <= 1_024
    && /^[\x21-\x7e]+$/u.test(value);
}

function parseCookies(req: any): Map<string, string> {
  const parsed = new Map<string, string>();
  const raw = accountRequestHeader(req, 'cookie');
  if (!raw || Buffer.byteLength(raw, 'utf8') > 8_192) return parsed;
  for (const part of raw.split(';')) {
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name && value && !parsed.has(name)) parsed.set(name, value);
  }
  return parsed;
}

function sessionSignature(secret: string, sessionId: string): string {
  return base64Url(hmac(secret, 'zodiacs.games.session.v1', sessionId));
}

function verifySessionCookie(secret: string, value: string): string | null {
  const [version, sessionId, signature, extra] = value.split('.');
  if (extra !== undefined || version !== SESSION_VERSION
    || !/^[A-Za-z0-9_-]{32}$/u.test(sessionId ?? '')
    || !/^[A-Za-z0-9_-]{43}$/u.test(signature ?? '')) return null;
  const expected = sessionSignature(secret, sessionId!);
  const actualBuffer = Buffer.from(signature!, 'base64url');
  const expectedBuffer = Buffer.from(expected, 'base64url');
  return actualBuffer.length === SIGNATURE_BYTES
    && expectedBuffer.length === SIGNATURE_BYTES
    && timingSafeEqual(actualBuffer, expectedBuffer)
    ? sessionId!
    : null;
}

/** Coarsens IPv6 addresses to a household/mobile-network-sized /64 bucket. */
function joinIpBucket(rawIp: string): string {
  const ip = rawIp.trim().toLowerCase();
  if (!ip) return 'unknown';
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/u.exec(ip);
  if (mapped) return mapped[1]!;
  if (!ip.includes(':')) return ip;
  const address = ip.split('%', 1)[0]!;
  const [head = '', tail = ''] = address.split('::');
  const headParts = head.split(':').filter(Boolean);
  const tailParts = tail.split(':').filter(Boolean);
  const hextets = address.includes('::')
    ? [...headParts, ...Array(Math.max(0, 8 - headParts.length - tailParts.length)).fill('0'), ...tailParts]
    : headParts;
  const network = hextets.slice(0, 4).map((hextet) => hextet.replace(/^0+(?=.)/u, ''));
  while (network.length < 4) network.push('0');
  return `${network.join(':')}::/64`;
}

function requestIpBucket(req: any): string {
  // Vercel overwrites this header at its trusted edge. Only the first value
  // is used; no address is retained after the HMAC is computed.
  const forwarded = accountRequestHeader(req, 'x-forwarded-for').split(',', 1)[0]?.trim();
  if (forwarded) return joinIpBucket(forwarded);
  const direct = accountRequestHeader(req, 'x-real-ip').trim();
  if (direct) return joinIpBucket(direct);
  return joinIpBucket(typeof req.socket?.remoteAddress === 'string' ? req.socket.remoteAddress : 'unknown');
}

export interface GamesAnonymousPrincipal {
  participantHash: string;
  bucketHash: string;
  setCookie: string | null;
}

/**
 * Returns the request's Games principal. With `mint` false (check-ins), a
 * missing or invalid cookie resolves to null instead of a fresh identity —
 * a browser that never joined has nothing to check in.
 */
export function gamesAnonymousPrincipal(
  req: any,
  secretValue: unknown,
  mint: boolean,
  random: (bytes: number) => Buffer = randomBytes,
): GamesAnonymousPrincipal | null {
  if (!validGamesSecret(secretValue)) return null;
  const current = parseCookies(req).get(SESSION_COOKIE);
  const verified = current ? verifySessionCookie(secretValue, current) : null;
  if (!verified && !mint) return null;
  const sessionId = verified ?? base64Url(random(SESSION_BYTES));
  if (!/^[A-Za-z0-9_-]{32}$/u.test(sessionId)) return null;
  const cookieValue = `${SESSION_VERSION}.${sessionId}.${sessionSignature(secretValue, sessionId)}`;
  return {
    participantHash: hmac(secretValue, 'zodiacs.games.participant.v1', sessionId).toString('hex'),
    bucketHash: hmac(secretValue, 'zodiacs.games.join-bucket.v1', requestIpBucket(req)).toString('hex'),
    setCookie: verified
      ? null
      : `${SESSION_COOKIE}=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000`,
  };
}
