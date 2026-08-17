/**
 * Anonymous identity for the Zodiac Games.
 *
 * The cookie is a 256-bit opaque bearer token: it contains no claims and
 * grants no account access. The database receives only a SHA-256 digest of
 * that token. A short-lived connection fingerprint is protected again with
 * a database-private key before it is stored for join throttling.
 */
import { createHash, randomBytes } from 'node:crypto';
import { accountRequestHeader } from '../lib/account-api/request.js';

const SESSION_COOKIE = '__Host-zodiacs_games';
const SESSION_VERSION = 'v1';
const SESSION_BYTES = 32;

function base64Url(value: Buffer): string {
  return value.toString('base64url');
}

function sha256(domain: string, value: string): string {
  return createHash('sha256').update(domain).update('\0').update(value).digest('hex');
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

function verifiedSessionCookie(value: string): string | null {
  const [version, sessionId, extra] = value.split('.');
  return extra === undefined
    && version === SESSION_VERSION
    && /^[A-Za-z0-9_-]{43}$/u.test(sessionId ?? '')
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
  // is used; the address is never stored by the Games.
  const forwarded = accountRequestHeader(req, 'x-forwarded-for').split(',', 1)[0]?.trim();
  if (forwarded) return joinIpBucket(forwarded);
  const direct = accountRequestHeader(req, 'x-real-ip').trim();
  if (direct) return joinIpBucket(direct);
  return joinIpBucket(typeof req.socket?.remoteAddress === 'string' ? req.socket.remoteAddress : 'unknown');
}

function utcDay(input: Date): string {
  return input.toISOString().slice(0, 10);
}

export interface GamesAnonymousPrincipal {
  participantHash: string;
  /** Daily one-way fingerprint; the RPC HMACs it with a DB-private key. */
  bucketHash: string;
  setCookie: string | null;
}

/**
 * Resolve the request's anonymous Games principal. With `mint` false, a
 * missing cookie resolves to null because that browser has not joined.
 */
export function gamesAnonymousPrincipal(
  req: any,
  mint: boolean,
  now: Date,
  random: (bytes: number) => Buffer = randomBytes,
): GamesAnonymousPrincipal | null {
  const current = parseCookies(req).get(SESSION_COOKIE);
  const verified = current ? verifiedSessionCookie(current) : null;
  if (!verified && !mint) return null;
  const sessionId = verified ?? base64Url(random(SESSION_BYTES));
  if (!/^[A-Za-z0-9_-]{43}$/u.test(sessionId)) return null;
  const cookieValue = `${SESSION_VERSION}.${sessionId}`;
  const bucket = `${utcDay(now)}\0${requestIpBucket(req)}`;
  return {
    participantHash: sha256('zodiacs.games.participant.v1', sessionId),
    bucketHash: sha256('zodiacs.games.join-bucket-fingerprint.v1', bucket),
    setCookie: verified
      ? null
      : `${SESSION_COOKIE}=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000`,
  };
}
