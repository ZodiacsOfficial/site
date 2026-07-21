import { createHash, timingSafeEqual } from 'node:crypto';
import { environmentValue } from './config.js';
import { normalizeEmail } from './input.js';

type Environment = Record<string, unknown>;

export const DAILY_EMAIL_ADMIN_BOOTSTRAP_ADDRESS = 'admin@zodiacs.org';

/**
 * This is an operational canary switch, not a public feature flag. Requiring
 * all three values keeps the route and its confirmation exception fail-closed.
 */
export function dailyEmailAdminBootstrapConfigured(
  env: Environment = process.env,
): boolean {
  return environmentValue(env, 'DAILY_EMAIL_ADMIN_BOOTSTRAP_ENABLED') === '1'
    && normalizeEmail(environmentValue(env, 'DAILY_EMAIL_ADMIN_BOOTSTRAP_EMAIL'))
      === DAILY_EMAIL_ADMIN_BOOTSTRAP_ADDRESS
    && environmentValue(env, 'DAILY_EMAIL_ADMIN_BOOTSTRAP_SECRET').length >= 32;
}

export function isDailyEmailAdminBootstrapAddress(
  email: string,
  env: Environment = process.env,
): boolean {
  return dailyEmailAdminBootstrapConfigured(env)
    && normalizeEmail(email) === DAILY_EMAIL_ADMIN_BOOTSTRAP_ADDRESS;
}

/** Constant-time bearer comparison without leaking the configured length. */
export function hasDailyEmailAdminBootstrapBearer(
  authorization: string,
  env: Environment = process.env,
): boolean {
  if (!dailyEmailAdminBootstrapConfigured(env) || !authorization.startsWith('Bearer ')) {
    return false;
  }
  const candidate = authorization.slice('Bearer '.length);
  if (!candidate) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(
    digest(candidate),
    digest(environmentValue(env, 'DAILY_EMAIL_ADMIN_BOOTSTRAP_SECRET')),
  );
}

/**
 * Opts only this server-side operation into the already-tested daily adapter.
 * It never mutates process.env, so public capture rendering remains off.
 */
export function dailyEmailAdminBootstrapEnvironment(
  env: Environment = process.env,
): Environment | null {
  if (!dailyEmailAdminBootstrapConfigured(env)) return null;
  return {
    ...env,
    DAILY_EMAIL_ENABLED: '1',
    EMAIL_PROVIDER: 'resend',
  };
}
