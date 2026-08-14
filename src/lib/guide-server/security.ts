import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { accountRequestHeader } from '../account-api/request.js';

const SESSION_COOKIE = '__Host-zodiacs_guide';
const SESSION_VERSION = 'v1';
const SESSION_BYTES = 24;
const SIGNATURE_BYTES = 32;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function base64Url(value: Buffer): string {
  return value.toString('base64url');
}

function hmac(secret: string, domain: string, value: string): Buffer {
  return createHmac('sha256', secret).update(domain).update('\0').update(value).digest();
}

function validSecret(value: unknown): value is string {
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
  return base64Url(hmac(secret, 'zodiacs.guide.session.v1', sessionId));
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

export interface GuideAnonymousPrincipal {
  principalHash: string;
  quotaHash: string;
  sessionId: string;
  setCookie: string | null;
}

/**
 * Derives the globally stable, content-free key used to deduplicate one
 * logical Guide operation across serverless instances. Raw protocol IDs never
 * enter durable quota storage, and changing the server secret intentionally
 * ends the old replay-key continuity window.
 */
export function guideOperationHash(
  secretValue: unknown,
  conversationId: string,
  operationId: string,
): string | null {
  if (!validSecret(secretValue)
    || !UUID.test(conversationId)
    || !UUID.test(operationId)) return null;
  return hmac(
    secretValue,
    'zodiacs.guide.operation.v1',
    `${conversationId}\0${operationId}`,
  ).toString('hex');
}

/** Coarsens IPv6 addresses to a household/mobile-network-sized /64 bucket. */
function quotaIpBucket(rawIp: string): string {
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
  // Vercel overwrites this header at its trusted edge. Only the first value is
  // used; no address is retained after the domain-separated HMAC is computed.
  const forwarded = accountRequestHeader(req, 'x-forwarded-for').split(',', 1)[0]?.trim();
  if (forwarded) return quotaIpBucket(forwarded);
  const direct = accountRequestHeader(req, 'x-real-ip').trim();
  if (direct) return quotaIpBucket(direct);
  return quotaIpBucket(typeof req.socket?.remoteAddress === 'string' ? req.socket.remoteAddress : 'unknown');
}

/**
 * Returns an opaque, authenticated browser-session principal. The server stores
 * only its domain-separated HMAC quota bucket; neither the cookie nor IP is
 * persisted with conversation content.
 */
export function guideAnonymousPrincipal(
  req: any,
  secretValue: unknown,
  random: (bytes: number) => Buffer = randomBytes,
): GuideAnonymousPrincipal | null {
  if (!validSecret(secretValue)) return null;
  const current = parseCookies(req).get(SESSION_COOKIE);
  const verified = current ? verifySessionCookie(secretValue, current) : null;
  const sessionId = verified ?? base64Url(random(SESSION_BYTES));
  if (!/^[A-Za-z0-9_-]{32}$/u.test(sessionId)) return null;
  const cookieValue = `${SESSION_VERSION}.${sessionId}.${sessionSignature(secretValue, sessionId)}`;
  return {
    sessionId,
    principalHash: hmac(secretValue, 'zodiacs.guide.session-principal.v1', sessionId).toString('hex'),
    quotaHash: hmac(
      secretValue,
      'zodiacs.guide.quota-principal.v1',
      requestIpBucket(req),
    ).toString('hex'),
    setCookie: verified
      ? null
      : `${SESSION_COOKIE}=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Strict`,
  };
}
