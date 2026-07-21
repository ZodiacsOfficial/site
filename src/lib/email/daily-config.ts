import { emailProviderName, environmentValue, hasEmailCaptureProvider } from './config.js';
import { parseDailySunSegmentId } from './daily-segment-id.js';

type Environment = Record<string, unknown>;

export function dailyEmailFeatureEnabled(env: Environment = process.env): boolean {
  return environmentValue(env, 'DAILY_EMAIL_ENABLED') === '1';
}

export function hasDailySunStateAccess(env: Environment = process.env): boolean {
  return environmentValue(env, 'PUBLIC_SUPABASE_URL') !== ''
    && environmentValue(env, 'SUPABASE_SERVICE_ROLE_KEY') !== '';
}

export function dailySunSegmentId(env: Environment = process.env): string | null {
  return parseDailySunSegmentId(
    environmentValue(env, 'RESEND_DAILY_SEGMENT_ID'),
    environmentValue(env, 'RESEND_SEGMENT_ID'),
  );
}

/** The public sun-sign flow can only appear when its complete server contract exists. */
export function hasDailySunEmailProvider(env: Environment = process.env): boolean {
  return dailyEmailFeatureEnabled(env)
    && emailProviderName(env) === 'resend'
    && hasEmailCaptureProvider(env)
    && environmentValue(env, 'DAILY_EMAIL_UNSUBSCRIBE_SECRET').length >= 32
    && environmentValue(env, 'DAILY_EMAIL_RECIPIENT_HASH_SECRET').length >= 32
    && hasDailySunStateAccess(env)
    && dailySunSegmentId(env) !== null;
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
  return environmentValue(env, 'DAILY_EMAIL_UNSUBSCRIBE_SECRET').length >= 32
    && environmentValue(env, 'DAILY_EMAIL_RECIPIENT_HASH_SECRET').length >= 32
    && hasDailySunStateAccess(env);
}
