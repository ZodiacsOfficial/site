import { createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN_CONTEXT = 'zodiacs-daily-chart-opt-in-v1';
export const DAILY_CHART_OPT_IN_TTL_MS = 48 * 60 * 60 * 1_000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RECIPIENT_HASH = /^[0-9a-f]{64}$/;

export interface DailyChartOptInClaim {
  userId: string;
  chartId: string;
  recipientHash: string;
  timezone: string;
  expiresAt: number;
}

interface SerializedClaim {
  u: string;
  c: string;
  h: string;
  z: string;
  x: number;
}

export function isIanaTimezone(value: unknown): value is string {
  if (typeof value !== 'string'
    || value.length === 0
    || value.length > 255
    || value.trim() !== value) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
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

export function createDailyChartOptInToken(
  claim: Omit<DailyChartOptInClaim, 'expiresAt'>,
  secret: string,
  now = Date.now(),
): string {
  if (secret.length < 32) throw new Error('Email confirmation secret must be at least 32 characters.');
  if (!UUID.test(claim.userId)
    || !UUID.test(claim.chartId)
    || !RECIPIENT_HASH.test(claim.recipientHash)
    || !isIanaTimezone(claim.timezone)) {
    throw new Error('Invalid daily chart opt-in claim.');
  }
  const payload = Buffer.from(JSON.stringify({
    u: claim.userId,
    c: claim.chartId,
    h: claim.recipientHash,
    z: claim.timezone,
    x: now + DAILY_CHART_OPT_IN_TTL_MS,
  } satisfies SerializedClaim)).toString('base64url');
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyDailyChartOptInToken(
  token: string,
  secret: string,
  now = Date.now(),
): DailyChartOptInClaim | null {
  if (secret.length < 32) return null;
  const [payload, given, extra] = token.split('.');
  if (!payload || !given || extra || !equalSignature(given, signature(payload, secret))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<SerializedClaim>;
    if (typeof parsed.u !== 'string'
      || !UUID.test(parsed.u)
      || typeof parsed.c !== 'string'
      || !UUID.test(parsed.c)
      || typeof parsed.h !== 'string'
      || !RECIPIENT_HASH.test(parsed.h)
      || !isIanaTimezone(parsed.z)
      || typeof parsed.x !== 'number'
      || !Number.isFinite(parsed.x)
      || parsed.x <= now) return null;
    return {
      userId: parsed.u,
      chartId: parsed.c,
      recipientHash: parsed.h,
      timezone: parsed.z,
      expiresAt: parsed.x,
    };
  } catch {
    return null;
  }
}
