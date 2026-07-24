import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { INVITE_TOKEN_RE } from './validate.js';

export const INVITE_SESSION_HANDLE_RE = /^[A-Za-z0-9_-]{22}$/u;

export function createCompatibilityInviteToken(): string {
  const token = randomBytes(32).toString('base64url');
  if (!INVITE_TOKEN_RE.test(token)) {
    throw new Error('The invitation token generator returned an invalid value.');
  }
  return token;
}

export function createCompatibilityInviteSessionHandle(): string {
  const handle = randomBytes(16).toString('base64url');
  if (!INVITE_SESSION_HANDLE_RE.test(handle)) {
    throw new Error('The invitation session generator returned an invalid value.');
  }
  return handle;
}

export function validCompatibilityInviteSessionHandle(handle: string): boolean {
  return INVITE_SESSION_HANDLE_RE.test(handle);
}

export function compatibilityInviteTokenHash(token: string): string | null {
  return INVITE_TOKEN_RE.test(token)
    ? createHash('sha256').update(token, 'utf8').digest('hex')
    : null;
}

export function constantTimeSecretMatch(candidate: string, expected: string): boolean {
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
