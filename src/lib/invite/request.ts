import { requestHeader } from '../email/request.js';
import { validCompatibilityInviteSessionHandle } from './token.js';

const COOKIE_PREFIX = 'zodiacs_compat_invite_';
const MAX_JSON_BYTES = 1_024;

function first(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}

export function hasExactJsonContentType(req: any): boolean {
  const contentType = requestHeader(req, 'content-type').split(';', 1)[0]?.trim().toLowerCase();
  return contentType === 'application/json';
}

export function requestBodyWithinLimit(req: any): boolean {
  const length = Number.parseInt(requestHeader(req, 'content-length'), 10);
  if (Number.isFinite(length) && length > MAX_JSON_BYTES) return false;
  if (typeof req.body === 'string') return Buffer.byteLength(req.body, 'utf8') <= MAX_JSON_BYTES;
  try {
    return Buffer.byteLength(JSON.stringify(req.body ?? {}), 'utf8') <= MAX_JSON_BYTES;
  } catch {
    return false;
  }
}

export function requestCookie(req: any, name: string): string {
  const cookie = requestHeader(req, 'cookie');
  for (const part of cookie.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return '';
    }
  }
  return '';
}

export function inviteCapabilityCookie(req: any, handle: string): string {
  return validCompatibilityInviteSessionHandle(handle)
    ? requestCookie(req, `${COOKIE_PREFIX}${handle}`)
    : '';
}

export function inviteSessionHandle(req: any): string {
  const candidate = req.query?.session;
  return typeof candidate === 'string' && validCompatibilityInviteSessionHandle(candidate)
    ? candidate
    : '';
}

export function setInviteCapabilityCookie(
  handle: string,
  token: string,
  maxAgeSeconds: number,
): string {
  if (!validCompatibilityInviteSessionHandle(handle)) {
    throw new Error('Invitation session handle is invalid.');
  }
  const boundedAge = Math.max(0, Math.min(14 * 24 * 60 * 60, Math.floor(maxAgeSeconds)));
  return [
    `${COOKIE_PREFIX}${handle}=${encodeURIComponent(token)}`,
    'Path=/api/compatibility',
    `Max-Age=${boundedAge}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

export function clearInviteCapabilityCookie(handle: string): string {
  if (!validCompatibilityInviteSessionHandle(handle)) {
    throw new Error('Invitation session handle is invalid.');
  }
  return [
    `${COOKIE_PREFIX}${handle}=`,
    'Path=/api/compatibility',
    'Max-Age=0',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

export function bearer(req: any): string {
  const raw = first(req.headers?.authorization)
    || (typeof req.get === 'function' ? first(req.get('authorization')) : '');
  return /^Bearer\s+([^\s]+)$/iu.exec(raw.trim())?.[1] ?? '';
}

export const INVITE_COOKIE_PREFIX = COOKIE_PREFIX;
export const INVITE_JSON_MAX_BYTES = MAX_JSON_BYTES;
