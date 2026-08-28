import { SIGN_SLUGS } from '../signs.js';
import { normalizeLocale, type ReleasedLocale } from '../i18n/core.js';

export interface ParsedEmailSubscription {
  email: string;
  sign?: string;
  locale: ReleasedLocale;
  honeypot: boolean;
}

function parseBody(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input);
  } catch {
    return Object.fromEntries(new URLSearchParams(input));
  }
}

/** Conservative syntax check; the ESP remains the deliverability authority. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || /[\r\n]/.test(email)) return null;
  const at = email.lastIndexOf('@');
  if (at <= 0 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64
    || !domain.includes('.')
    || domain.startsWith('.')
    || domain.endsWith('.')
    || /\s/.test(email)) return null;
  return email;
}

export function parseEmailSubscription(input: unknown): ParsedEmailSubscription | null {
  const body = parseBody(input);
  if (!body || typeof body !== 'object') return null;
  const candidate = body as Record<string, unknown>;
  const email = normalizeEmail(candidate.email);
  if (!email) return null;
  const sign = typeof candidate.sign === 'string' && SIGN_SLUGS.includes(candidate.sign)
    ? candidate.sign
    : undefined;
  if (candidate.sign != null && candidate.sign !== '' && !sign) return null;
  return {
    email,
    sign,
    locale: normalizeLocale(typeof candidate.locale === 'string' ? candidate.locale : undefined),
    honeypot: typeof candidate.website === 'string' && candidate.website.trim() !== '',
  };
}
