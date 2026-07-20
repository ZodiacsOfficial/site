import { createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN_CONTEXT = 'zodiacs-daily-email-unsubscribe-v1';

export type DailyUnsubscribeClaim =
  | { kind: 'sun'; contactId: string; recipientHash: string }
  | { kind: 'chart'; userId: string; recipientHash: string; contactId?: string };

interface SerializedClaim {
  k: 's' | 'c';
  i: string;
  h: string;
  r?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTACT_ID = /^[A-Za-z0-9_-]{8,128}$/;
const RECIPIENT_HASH = /^[0-9a-f]{64}$/;

function serialize(claim: DailyUnsubscribeClaim): SerializedClaim {
  return claim.kind === 'sun'
    ? { k: 's', i: claim.contactId, h: claim.recipientHash }
    : { k: 'c', i: claim.userId, h: claim.recipientHash, ...(claim.contactId ? { r: claim.contactId } : {}) };
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

export function createDailyUnsubscribeToken(
  claim: DailyUnsubscribeClaim,
  secret: string,
): string {
  if (secret.length < 32) throw new Error('Daily email unsubscribe secret must be at least 32 characters.');
  const serialized = serialize(claim);
  if ((serialized.k === 's' && !CONTACT_ID.test(serialized.i))
    || (serialized.k === 'c' && !UUID.test(serialized.i))
    || !RECIPIENT_HASH.test(serialized.h)
    || (serialized.r !== undefined && !CONTACT_ID.test(serialized.r))) {
    throw new Error('Invalid daily email unsubscribe subject.');
  }
  const payload = Buffer.from(JSON.stringify(serialized)).toString('base64url');
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyDailyUnsubscribeToken(
  token: string,
  secret: string,
): DailyUnsubscribeClaim | null {
  if (secret.length < 32) return null;
  const [payload, given, extra] = token.split('.');
  if (!payload || !given || extra || !equalSignature(given, signature(payload, secret))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<SerializedClaim>;
    if (typeof parsed.h !== 'string' || !RECIPIENT_HASH.test(parsed.h)) return null;
    if (parsed.k === 's'
      && typeof parsed.i === 'string'
      && CONTACT_ID.test(parsed.i)
      && parsed.r === undefined) {
      return { kind: 'sun', contactId: parsed.i, recipientHash: parsed.h };
    }
    if (parsed.k === 'c'
      && typeof parsed.i === 'string'
      && UUID.test(parsed.i)
      && (parsed.r === undefined || (typeof parsed.r === 'string' && CONTACT_ID.test(parsed.r)))) {
      return {
        kind: 'chart',
        userId: parsed.i,
        recipientHash: parsed.h,
        ...(parsed.r ? { contactId: parsed.r } : {}),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function dailyUnsubscribeUrl(
  baseUrl: string,
  claim: DailyUnsubscribeClaim,
  secret: string,
): string {
  const origin = new URL(baseUrl);
  if (origin.protocol !== 'https:') throw new Error('Daily email base URL must use HTTPS.');
  const url = new URL('/api/email/unsubscribe', origin.origin);
  url.searchParams.set('token', createDailyUnsubscribeToken(claim, secret));
  return url.toString();
}
