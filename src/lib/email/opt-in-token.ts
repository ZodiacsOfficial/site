import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { SIGN_SLUGS } from '../signs.js';
import { RELEASED_LOCALES, type ReleasedLocale } from '../i18n/core.js';
import { normalizeEmail } from './input.js';

const TOKEN_CONTEXT = 'zodiacs-email-capture-v2';
const LEGACY_TOKEN_CONTEXT = 'zodiacs-email-capture-v1';
const TOKEN_VERSION = 'v2';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const IV_BASE64URL_CHARS = 16;
const TAG_BASE64URL_CHARS = 22;
const LEGACY_SIGNATURE_BYTES = 32;
const LEGACY_SIGNATURE_BASE64URL_CHARS = 43;
const MAX_ENCRYPTED_PAYLOAD_CHARS = 3_072;
const MAX_LEGACY_PAYLOAD_CHARS = 3_072;
const BASE64URL = /^[A-Za-z0-9_-]+$/u;
const EXPIRY_CLOCK_SKEW_MS = 5 * 60 * 1_000;
export const EMAIL_OPT_IN_TTL_MS = 48 * 60 * 60 * 1_000;
export const EMAIL_CONFIRMATION_TOKEN_MAX_CHARS = 4_096;
export const EMAIL_OPT_IN_LEGACY_ACCEPT_UNTIL_MS = Date.parse('2026-08-31T00:00:00.000Z');

export interface EmailOptInClaim {
  email: string;
  sign: string | null;
  locale: ReleasedLocale;
  expiresAt: number;
}

interface SerializedClaim {
  e: string;
  s: string | null;
  l: ReleasedLocale;
  x: number;
}

function encryptionKey(secret: string): Buffer {
  return createHash('sha256').update(TOKEN_CONTEXT).update('\0').update(secret).digest();
}

function legacySignature(payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${LEGACY_TOKEN_CONTEXT}:${payload}`)
    .digest('base64url');
}

function decodeCanonicalBase64Url(
  value: string,
  maximumChars: number,
  expectedBytes?: number,
): Buffer | null {
  if (value.length === 0
    || value.length > maximumChars
    || !BASE64URL.test(value)) return null;
  const decoded = Buffer.from(value, 'base64url');
  if ((expectedBytes !== undefined && decoded.length !== expectedBytes)
    || decoded.toString('base64url') !== value) return null;
  return decoded;
}

function equalSignature(given: string, expected: string): boolean {
  const left = decodeCanonicalBase64Url(
    given,
    LEGACY_SIGNATURE_BASE64URL_CHARS,
    LEGACY_SIGNATURE_BYTES,
  );
  const right = decodeCanonicalBase64Url(
    expected,
    LEGACY_SIGNATURE_BASE64URL_CHARS,
    LEGACY_SIGNATURE_BYTES,
  );
  return Boolean(left && right && timingSafeEqual(left, right));
}

function validatedClaim(parsed: Partial<SerializedClaim>, now: number): EmailOptInClaim | null {
  const email = normalizeEmail(parsed.e);
  if (!email
    || (parsed.s !== null && (typeof parsed.s !== 'string' || !SIGN_SLUGS.includes(parsed.s)))
    || typeof parsed.l !== 'string'
    || !RELEASED_LOCALES.includes(parsed.l as ReleasedLocale)
    || typeof parsed.x !== 'number'
    || !Number.isFinite(parsed.x)
    || parsed.x <= now
    || parsed.x > now + EMAIL_OPT_IN_TTL_MS + EXPIRY_CLOCK_SKEW_MS) return null;
  return {
    email,
    sign: parsed.s ?? null,
    locale: parsed.l as ReleasedLocale,
    expiresAt: parsed.x,
  };
}

export function createEmailOptInToken(
  claim: Omit<EmailOptInClaim, 'expiresAt'>,
  secret: string,
  now = Date.now(),
): string {
  const email = normalizeEmail(claim.email);
  if (secret.length < 32) throw new Error('Email confirmation secret must be at least 32 characters.');
  if (!email
    || (claim.sign !== null && !SIGN_SLUGS.includes(claim.sign))
    || !RELEASED_LOCALES.includes(claim.locale)
    || !Number.isFinite(now)) {
    throw new Error('Invalid weekly email opt-in claim.');
  }

  const payload = Buffer.from(JSON.stringify({
    e: email,
    s: claim.sign,
    l: claim.locale,
    x: now + EMAIL_OPT_IN_TTL_MS,
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

function verifyEncryptedToken(token: string, secret: string, now: number): EmailOptInClaim | null {
  const [version, encodedIv, encrypted, encodedTag, extra] = token.split('.');
  if (version !== TOKEN_VERSION || !encodedIv || !encrypted || !encodedTag || extra) return null;
  try {
    const iv = decodeCanonicalBase64Url(encodedIv, IV_BASE64URL_CHARS, IV_BYTES);
    const ciphertext = decodeCanonicalBase64Url(encrypted, MAX_ENCRYPTED_PAYLOAD_CHARS);
    const tag = decodeCanonicalBase64Url(encodedTag, TAG_BASE64URL_CHARS, TAG_BYTES);
    if (!iv || !ciphertext || !tag) return null;
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), iv);
    decipher.setAAD(Buffer.from(TOKEN_CONTEXT));
    decipher.setAuthTag(tag);
    const payload = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
    return validatedClaim(JSON.parse(payload) as Partial<SerializedClaim>, now);
  } catch {
    return null;
  }
}

/** Accepts the former signed payload for one 48-hour rollout window. */
function verifyLegacyToken(token: string, secret: string, now: number): EmailOptInClaim | null {
  const [payload, given, extra] = token.split('.');
  if (now >= EMAIL_OPT_IN_LEGACY_ACCEPT_UNTIL_MS || !payload || !given || extra) return null;
  const decodedPayload = decodeCanonicalBase64Url(payload, MAX_LEGACY_PAYLOAD_CHARS);
  if (!decodedPayload || !equalSignature(given, legacySignature(payload, secret))) return null;
  try {
    return validatedClaim(
      JSON.parse(decodedPayload.toString('utf8')) as Partial<SerializedClaim>,
      now,
    );
  } catch {
    return null;
  }
}

export function verifyEmailOptInToken(
  token: string,
  secret: string,
  now = Date.now(),
): EmailOptInClaim | null {
  if (token.length === 0
    || token.length > EMAIL_CONFIRMATION_TOKEN_MAX_CHARS
    || secret.length < 32
    || !Number.isFinite(now)) return null;
  return token.startsWith(`${TOKEN_VERSION}.`)
    ? verifyEncryptedToken(token, secret, now)
    : verifyLegacyToken(token, secret, now);
}
