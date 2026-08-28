import { createHash, randomBytes } from 'node:crypto';

const CAPABILITY = /^[A-Za-z0-9_-]{43}$/u;

/**
 * A random bearer capability, stored only as a SHA-256 digest in Supabase.
 * The raw value appears only in the recipient's unsubscribe URL.
 */
export function createDigestUnsubscribeCapability(): string {
  return randomBytes(32).toString('base64url');
}

export function isDigestUnsubscribeCapability(value: string): boolean {
  return CAPABILITY.test(value);
}

export function hashDigestUnsubscribeCapability(capability: string): string {
  if (!isDigestUnsubscribeCapability(capability)) {
    throw new Error('Invalid weekly digest unsubscribe capability.');
  }
  return createHash('sha256').update(capability).digest('hex');
}
