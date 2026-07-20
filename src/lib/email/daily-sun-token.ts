import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { SIGN_SLUGS } from '../signs.js';
import { normalizeEmail } from './input.js';

const TOKEN_CONTEXT = 'zodiacs-daily-sun-opt-in-v2';
const TOKEN_VERSION = 'v2';
const IV_BYTES = 12;
const TAG_BYTES = 16;
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

function encryptionKey(secret: string): Buffer {
  return createHash('sha256').update(TOKEN_CONTEXT).update('\0').update(secret).digest();
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
  } satisfies SerializedClaim));
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv);
  cipher.setAAD(Buffer.from(TOKEN_CONTEXT));
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    TOKEN_VERSION,
    iv.toString('base64url'),
    encrypted.toString('base64url'),
    tag.toString('base64url'),
  ].join('.');
}

export function verifyDailySunOptInToken(
  token: string,
  secret: string,
  now = Date.now(),
): DailySunOptInClaim | null {
  if (secret.length < 32) return null;
  const [version, encodedIv, encrypted, encodedTag, extra] = token.split('.');
  if (version !== TOKEN_VERSION || !encodedIv || !encrypted || !encodedTag || extra) return null;
  try {
    const iv = Buffer.from(encodedIv, 'base64url');
    const tag = Buffer.from(encodedTag, 'base64url');
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null;
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), iv);
    decipher.setAAD(Buffer.from(TOKEN_CONTEXT));
    decipher.setAuthTag(tag);
    const payload = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
    const parsed = JSON.parse(payload) as Partial<SerializedClaim>;
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
