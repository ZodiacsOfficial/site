import { createHmac, timingSafeEqual } from 'node:crypto';
import { SIGN_SLUGS } from '../signs.js';
import { normalizeEmail } from './input.js';

const TOKEN_CONTEXT = 'zodiacs-daily-sun-opt-in-v1';
export const DAILY_SUN_OPT_IN_TTL_MS = 48 * 60 * 60 * 1_000;

export interface DailySunOptInClaim {
  email: string;
  sign: string;
  expiresAt: number;
}

interface SerializedClaim {
  e: string;
  s: string;
  x: number;
}

function signature(payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${TOKEN_CONTEXT}:${payload}`)
    .digest('base64url');
}

function equalSignature(left: string, right: string): boolean {
  const a = Buffer.from(left, 'base64url');
  const b = Buffer.from(right, 'base64url');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createDailySunOptInToken(
  claim: Omit<DailySunOptInClaim, 'expiresAt'>,
  secret: string,
  now = Date.now(),
): string {
  const email = normalizeEmail(claim.email);
  if (secret.length < 32) throw new Error('Email confirmation secret must be at least 32 characters.');
  if (!email || !SIGN_SLUGS.includes(claim.sign)) throw new Error('Invalid daily sun opt-in claim.');
  const payload = Buffer.from(JSON.stringify({
    e: email,
    s: claim.sign,
    x: now + DAILY_SUN_OPT_IN_TTL_MS,
  } satisfies SerializedClaim)).toString('base64url');
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyDailySunOptInToken(
  token: string,
  secret: string,
  now = Date.now(),
): DailySunOptInClaim | null {
  if (secret.length < 32) return null;
  const [payload, given, extra] = token.split('.');
  if (!payload || !given || extra || !equalSignature(given, signature(payload, secret))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<SerializedClaim>;
    const email = normalizeEmail(parsed.e);
    if (!email
      || typeof parsed.s !== 'string'
      || !SIGN_SLUGS.includes(parsed.s)
      || typeof parsed.x !== 'number'
      || !Number.isFinite(parsed.x)
      || parsed.x <= now) return null;
    return { email, sign: parsed.s, expiresAt: parsed.x };
  } catch {
    return null;
  }
}
