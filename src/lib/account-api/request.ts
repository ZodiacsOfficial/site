import { Buffer } from 'node:buffer';

export type AccountApiAction =
  | 'export'
  | 'delete-prepare'
  | 'delete-status'
  | 'delete-finish'
  | 'cleanup-receipts'
  | 'bootstrap'
  | 'consent'
  | 'chart-put'
  | 'chart-delete'
  | 'pull'
  | 'chart-get';

export interface DeletionConfirmation {
  confirmation: 'DELETE';
  idempotencyKey: string;
}

export interface DeletionPrepareRequest {
  confirmation: 'DELETE';
  requestId: string;
  recoverySecret: string;
}

export interface DeletionReceiptProof {
  requestId: string;
  recoverySecret: string;
}

export interface VerifiedAccessClaims {
  sub: string;
  iss: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
  amr: Array<{ method: string; timestamp: number }>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const MAX_BEARER_BYTES = 16 * 1024;
const MAX_DELETE_BODY_BYTES = 128;
const MAX_DELETE_RECOVERY_BODY_BYTES = 512;
const RECENT_AUTH_MAX_AGE_SECONDS = 5 * 60;
const CLOCK_SKEW_SECONDS = 60;

function firstHeader(value: unknown): string {
  if (Array.isArray(value)) return value.length === 1 && typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}

export function accountRequestHeader(req: any, name: string): string {
  if (typeof req.get === 'function') {
    const value = req.get(name);
    if (typeof value === 'string') return value;
  }
  return firstHeader(req.headers?.[name.toLowerCase()]);
}

function singleForwardedValue(value: string): string {
  const values = value.split(',').map((part) => part.trim()).filter(Boolean);
  return values.length === 1 ? values[0] ?? '' : '';
}

function allowedHost(url: URL, env: Record<string, unknown>): boolean {
  const hostname = url.hostname.toLowerCase();
  if (url.protocol === 'https:') {
    return hostname === 'zodiacs.org'
      || hostname === 'www.zodiacs.org'
      || hostname.endsWith('.vercel.app');
  }
  return env.NODE_ENV !== 'production'
    && url.protocol === 'http:'
    && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]');
}

/** Requires the browser source origin, proxy protocol, and request host to be identical. */
export function isExactAccountOrigin(
  req: any,
  env: Record<string, unknown> = process.env,
): boolean {
  const secFetchSite = accountRequestHeader(req, 'sec-fetch-site').trim().toLowerCase();
  if (secFetchSite && secFetchSite !== 'same-origin') return false;

  const origin = accountRequestHeader(req, 'origin').trim();
  const referer = accountRequestHeader(req, 'referer').trim();
  const source = origin || referer;
  if (!source || source === 'null') return false;

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return false;
  }
  if (sourceUrl.username || sourceUrl.password) return false;

  const rawHost = accountRequestHeader(req, 'x-forwarded-host')
    || accountRequestHeader(req, 'host');
  const host = singleForwardedValue(rawHost).toLowerCase();
  const forwardedProtocol = accountRequestHeader(req, 'x-forwarded-proto');
  const protocol = forwardedProtocol
    ? singleForwardedValue(forwardedProtocol).toLowerCase()
    : sourceUrl.protocol.slice(0, -1).toLowerCase();
  if (!host || (protocol !== 'https' && protocol !== 'http')) return false;

  let requestUrl: URL;
  try {
    requestUrl = new URL(`${protocol}://${host}`);
  } catch {
    return false;
  }
  if (!allowedHost(requestUrl, env) || sourceUrl.origin !== requestUrl.origin) return false;

  if (origin && referer) {
    try {
      if (new URL(referer).origin !== sourceUrl.origin) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export function strictBearerToken(req: any): string | null {
  const authorization = accountRequestHeader(req, 'authorization');
  if (!authorization || Buffer.byteLength(authorization, 'utf8') > MAX_BEARER_BYTES) return null;
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(authorization);
  return match?.[1] && JWT.test(match[1]) ? match[1] : null;
}

export function accountApiAction(req: any): AccountApiAction | null {
  const query = req.query;
  if (!query || typeof query !== 'object' || Array.isArray(query)) return null;
  const keys = Object.keys(query);
  if (keys.length !== 1 || keys[0] !== 'action') return null;
  return [
    'export',
    'delete-prepare',
    'delete-status',
    'delete-finish',
    'cleanup-receipts',
    'bootstrap',
    'consent',
    'chart-put',
    'chart-delete',
    'pull',
    'chart-get',
  ].includes(query.action)
    ? query.action as AccountApiAction
    : null;
}

export function hasNoRequestBody(req: any): boolean {
  const length = accountRequestHeader(req, 'content-length').trim();
  if (length && length !== '0') return false;
  return req.body === undefined || req.body === null || req.body === '';
}

function bodyByteLength(body: unknown): number {
  if (typeof body === 'string') return Buffer.byteLength(body, 'utf8');
  try {
    return Buffer.byteLength(JSON.stringify(body), 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function parseDeletionConfirmation(req: any): DeletionConfirmation | null {
  const mediaType = accountRequestHeader(req, 'content-type')
    .split(';', 1)[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== 'application/json') return null;

  const rawLength = accountRequestHeader(req, 'content-length').trim();
  if (rawLength) {
    if (!/^\d{1,4}$/.test(rawLength)) return null;
    const length = Number.parseInt(rawLength, 10);
    if (length < 1 || length > MAX_DELETE_BODY_BYTES) return null;
  }
  if (bodyByteLength(req.body) > MAX_DELETE_BODY_BYTES) return null;

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  if (Object.keys(body).length !== 1 || !Object.prototype.hasOwnProperty.call(body, 'confirmation')) {
    return null;
  }
  if ((body as { confirmation?: unknown }).confirmation !== 'DELETE') return null;

  const idempotencyKey = accountRequestHeader(req, 'idempotency-key').trim();
  return UUID.test(idempotencyKey)
    ? { confirmation: 'DELETE', idempotencyKey: idempotencyKey.toLowerCase() }
    : null;
}

function parseBoundedJsonRecord(req: any, maximumBytes: number): Record<string, unknown> | null {
  const mediaType = accountRequestHeader(req, 'content-type')
    .split(';', 1)[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== 'application/json') return null;
  const rawLength = accountRequestHeader(req, 'content-length').trim();
  if (rawLength) {
    if (!/^\d{1,4}$/u.test(rawLength)) return null;
    const length = Number(rawLength);
    if (length < 1 || length > maximumBytes) return null;
  }
  if (bodyByteLength(req.body) > maximumBytes) return null;
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body) as unknown;
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' && !Array.isArray(body)
    ? body as Record<string, unknown>
    : null;
}

function canonicalRecoverySecret(input: unknown): string | null {
  if (typeof input !== 'string' || !/^[A-Za-z0-9_-]{43}$/u.test(input)) return null;
  const decoded = Buffer.from(input, 'base64url');
  return decoded.byteLength === 32 && decoded.toString('base64url') === input ? input : null;
}

export function parseDeletionPrepareRequest(req: any): DeletionPrepareRequest | null {
  const body = parseBoundedJsonRecord(req, MAX_DELETE_RECOVERY_BODY_BYTES);
  if (!body
    || Object.keys(body).sort().join(',') !== 'confirmation,recoverySecret,requestId'
    || body.confirmation !== 'DELETE'
    || !isAccountUuid(body.requestId)) return null;
  const recoverySecret = canonicalRecoverySecret(body.recoverySecret);
  return recoverySecret
    ? { confirmation: 'DELETE', requestId: body.requestId.toLowerCase(), recoverySecret }
    : null;
}

export function parseDeletionReceiptProof(req: any): DeletionReceiptProof | null {
  const body = parseBoundedJsonRecord(req, MAX_DELETE_RECOVERY_BODY_BYTES);
  if (!body
    || Object.keys(body).sort().join(',') !== 'recoverySecret,requestId'
    || !isAccountUuid(body.requestId)) return null;
  const recoverySecret = canonicalRecoverySecret(body.recoverySecret);
  return recoverySecret
    ? { requestId: body.requestId.toLowerCase(), recoverySecret }
    : null;
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const segments = token.split('.');
  if (segments.length !== 3 || !segments[1]) return null;
  try {
    const decoded = Buffer.from(segments[1], 'base64url');
    if (decoded.byteLength < 2 || decoded.byteLength > 32 * 1024) return null;
    const value = JSON.parse(decoded.toString('utf8')) as unknown;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function authenticatedAudience(value: unknown): boolean {
  return value === 'authenticated'
    || (Array.isArray(value) && value.includes('authenticated'));
}

export function verifiedAccessClaims(
  token: string,
  expectedUserId: string,
  expectedIssuer: string,
  nowMs: number = Date.now(),
): VerifiedAccessClaims | null {
  const payload = parseJwtPayload(token);
  if (!payload
    || payload.sub !== expectedUserId
    || payload.iss !== expectedIssuer
    || payload.role !== 'authenticated'
    || !authenticatedAudience(payload.aud)
    || payload.is_anonymous !== false
    || typeof payload.session_id !== 'string'
    || !UUID.test(payload.session_id)
    || !Number.isInteger(payload.iat)
    || !Number.isInteger(payload.exp)
    || !Array.isArray(payload.amr)
    || payload.amr.length < 1
    || payload.amr.length > 16) {
    return null;
  }

  const nowSeconds = Math.floor(nowMs / 1_000);
  const issuedAt = payload.iat as number;
  const expiresAt = payload.exp as number;
  if (issuedAt > nowSeconds + CLOCK_SKEW_SECONDS || expiresAt <= nowSeconds) return null;
  if (payload.nbf !== undefined
    && (!Number.isInteger(payload.nbf) || (payload.nbf as number) > nowSeconds + CLOCK_SKEW_SECONDS)) {
    return null;
  }

  const amr: Array<{ method: string; timestamp: number }> = [];
  for (const value of payload.amr) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const entry = value as { method?: unknown; timestamp?: unknown };
    if (typeof entry.method !== 'string'
      || entry.method.length < 1
      || entry.method.length > 64
      || /[\s\u0000-\u001f\u007f]/u.test(entry.method)
      || !Number.isInteger(entry.timestamp)) {
      return null;
    }
    amr.push({ method: entry.method, timestamp: entry.timestamp as number });
  }

  return {
    sub: payload.sub as string,
    iss: payload.iss as string,
    sessionId: payload.session_id as string,
    issuedAt,
    expiresAt,
    amr,
  };
}

export function hasRecentNonRefreshAuthentication(
  claims: VerifiedAccessClaims,
  nowMs: number = Date.now(),
): boolean {
  const nowSeconds = Math.floor(nowMs / 1_000);
  return claims.amr.some(({ method, timestamp }) => method !== 'token_refresh'
    && method !== 'anonymous'
    && timestamp <= nowSeconds + CLOCK_SKEW_SECONDS
    && timestamp >= nowSeconds - RECENT_AUTH_MAX_AGE_SECONDS);
}

export function isAccountUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}
