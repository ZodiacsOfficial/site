import { createHmac, timingSafeEqual } from 'node:crypto';
import { SIGN_SLUGS } from '../signs.js';
import { LOCALES, type Locale } from '../i18n/core.js';

const TOKEN_CONTEXT = 'zodiacs-email-capture-v1';
export const EMAIL_OPT_IN_TTL_MS = 48 * 60 * 60 * 1_000;

export interface EmailOptInClaim {
  email: string;
  sign: string | null;
  locale: Locale;
  expiresAt: number;
}

interface SerializedClaim {
  e: string;
  s: string | null;
  l: Locale;
  x: number;
}

function signature(payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${TOKEN_CONTEXT}:${payload}`)
    .digest('base64url');
}

export function createEmailOptInToken(
  claim: Omit<EmailOptInClaim, 'expiresAt'>,
  secret: string,
  now = Date.now(),
): string {
  const payload = Buffer.from(JSON.stringify({
    e: claim.email,
    s: claim.sign,
    l: claim.locale,
    x: now + EMAIL_OPT_IN_TTL_MS,
  } satisfies SerializedClaim)).toString('base64url');
  return `${payload}.${signature(payload, secret)}`;
}

function equalSignature(a: string, b: string): boolean {
  const left = Buffer.from(a, 'base64url');
  const right = Buffer.from(b, 'base64url');
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyEmailOptInToken(
  token: string,
  secret: string,
  now = Date.now(),
): EmailOptInClaim | null {
  const [payload, given, extra] = token.split('.');
  if (!payload || !given || extra || !equalSignature(given, signature(payload, secret))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<SerializedClaim>;
    if (typeof parsed.e !== 'string'
      || (parsed.s !== null && (typeof parsed.s !== 'string' || !SIGN_SLUGS.includes(parsed.s)))
      || typeof parsed.l !== 'string'
      || !LOCALES.includes(parsed.l as Locale)
      || typeof parsed.x !== 'number'
      || !Number.isFinite(parsed.x)
      || parsed.x <= now) return null;
    return { email: parsed.e, sign: parsed.s, locale: parsed.l as Locale, expiresAt: parsed.x };
  } catch {
    return null;
  }
}
