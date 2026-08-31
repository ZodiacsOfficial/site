export const WEEKLY_DIGEST_PUBLIC_FLAG = 'PUBLIC_WEEKLY_DIGEST_ENABLED';

export interface WeeklyDigestPublicEnv {
  PUBLIC_WEEKLY_DIGEST_ENABLED?: string;
}

/**
 * The digest opt-in checkbox must not promise a send that never happens.
 * Delivery is gated separately (GitHub `vars.DIGEST_ENABLED` on the weekly
 * workflow), so the signup surface renders only after the owner also turns
 * this public flag on in the site build — flip the two together.
 */
export function weeklyDigestSignupEnabled(
  env: WeeklyDigestPublicEnv = {
    PUBLIC_WEEKLY_DIGEST_ENABLED: import.meta.env.PUBLIC_WEEKLY_DIGEST_ENABLED,
  },
): boolean {
  return env.PUBLIC_WEEKLY_DIGEST_ENABLED === '1';
}
