import { createHmac, timingSafeEqual } from 'node:crypto';

const SIGNING_CONTEXT = 'zodiacs-weekly-digest-unsubscribe';

export function signDigestUnsubscribe(userId: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${SIGNING_CONTEXT}:${userId}`)
    .digest('base64url');
}

export function verifyDigestUnsubscribe(userId: string, signature: string, secret: string): boolean {
  const expected = signDigestUnsubscribe(userId, secret);
  const given = Buffer.from(signature, 'base64url');
  const target = Buffer.from(expected, 'base64url');
  return given.length === target.length && timingSafeEqual(given, target);
}
