import { SIGN_SLUGS } from '../signs.js';
import { emailProviderName, environmentValue, hasEmailCaptureProvider } from './config.js';

type Environment = Record<string, unknown>;

export type DailySignSegments = Record<string, string>;

const SEGMENT_ID = /^[A-Za-z0-9_-]{6,128}$/;

export function dailyEmailFeatureEnabled(env: Environment = process.env): boolean {
  return environmentValue(env, 'DAILY_EMAIL_ENABLED') === '1';
}

export function hasDailySunStateAccess(env: Environment = process.env): boolean {
  return environmentValue(env, 'PUBLIC_SUPABASE_URL') !== ''
    && environmentValue(env, 'SUPABASE_SERVICE_ROLE_KEY') !== '';
}

export function parseDailySignSegments(env: Environment = process.env): DailySignSegments | null {
  const raw = environmentValue(env, 'RESEND_DAILY_SIGN_SEGMENTS_JSON');
  if (!raw) return null;
  try {
    const candidate = JSON.parse(raw) as unknown;
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
    const record = candidate as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length !== SIGN_SLUGS.length || keys.some((key) => !SIGN_SLUGS.includes(key))) return null;
    const entries = SIGN_SLUGS.map((sign) => [sign, record[sign]] as const);
    if (entries.some(([, id]) => typeof id !== 'string' || !SEGMENT_ID.test(id))) return null;
    const ids = entries.map(([, id]) => id as string);
    if (new Set(ids).size !== ids.length) return null;
    return Object.fromEntries(entries) as DailySignSegments;
  } catch {
    return null;
  }
}

/** The public sun-sign flow can only appear when its complete server contract exists. */
export function hasDailySunEmailProvider(env: Environment = process.env): boolean {
  return dailyEmailFeatureEnabled(env)
    && emailProviderName(env) === 'resend'
    && hasEmailCaptureProvider(env)
    && environmentValue(env, 'DAILY_EMAIL_UNSUBSCRIBE_SECRET').length >= 32
    && environmentValue(env, 'DAILY_EMAIL_RECIPIENT_HASH_SECRET').length >= 32
    && hasDailySunStateAccess(env)
    && parseDailySignSegments(env) !== null;
}

export function hasDailyChartPreferenceAccess(env: Environment = process.env): boolean {
  return hasDailySunStateAccess(env)
    && (environmentValue(env, 'PUBLIC_SUPABASE_PUBLISHABLE_KEY') !== ''
      || environmentValue(env, 'PUBLIC_SUPABASE_ANON_KEY') !== '');
}

/** Chart-tier endpoints additionally require server-only Supabase credentials. */
export function hasDailyChartEmailProvider(env: Environment = process.env): boolean {
  return hasDailySunEmailProvider(env) && hasDailyChartPreferenceAccess(env);
}

/** Permanent links remain usable when enrollment and delivery are disabled. */
export function hasDailyEmailRevocation(env: Environment = process.env): boolean {
  return emailProviderName(env) === 'resend'
    && environmentValue(env, 'RESEND_API_KEY') !== ''
    && environmentValue(env, 'DAILY_EMAIL_UNSUBSCRIBE_SECRET').length >= 32
    && environmentValue(env, 'DAILY_EMAIL_RECIPIENT_HASH_SECRET').length >= 32
    && parseDailySignSegments(env) !== null
    && hasDailySunStateAccess(env);
}
