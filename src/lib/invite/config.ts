type Environment = Record<string, unknown>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function value(env: Environment, key: string): string {
  const candidate = env[key];
  return typeof candidate === 'string' ? candidate.trim() : '';
}

export function hasCompatibilityInviteContract(
  env: Environment = process.env,
): boolean {
  const url = value(env, 'PUBLIC_SUPABASE_URL');
  const serviceKey = value(env, 'SUPABASE_SERVICE_ROLE_KEY');
  try {
    return new URL(url).protocol === 'https:' && serviceKey.length >= 16;
  } catch {
    return false;
  }
}

export function compatibilityInviteCreationEnabled(
  env: Environment = process.env,
): boolean {
  return value(env, 'COMPAT_INVITES_ENABLED') === '1'
    && hasCompatibilityInviteContract(env);
}

export function compatibilityInviteUserAllowed(
  userId: string,
  env: Environment = process.env,
): boolean {
  if (!UUID.test(userId)) return false;
  // Public creation is a separate, deliberate server-side authorization.
  // Authentication and owned synchronized-chart checks remain independent
  // requirements in the creation route.
  if (value(env, 'COMPAT_INVITES_PUBLIC_ENABLED') === '1') return true;
  const configured = value(env, 'COMPAT_INVITE_TEST_USER_IDS');
  // Canary mode remains fail-closed. The allowlist can stay configured after
  // public launch so turning the public authorization off restores the exact
  // reviewed private-canary boundary.
  if (!configured) return false;
  const allowlist = configured
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => UUID.test(entry));
  return allowlist.includes(userId.toLowerCase());
}

export function compatibilityInviteBaseUrl(
  env: Environment = process.env,
): string {
  const configured = value(env, 'COMPAT_INVITE_BASE_URL') || 'https://zodiacs.org';
  const url = new URL(configured);
  if (url.protocol !== 'https:') throw new Error('COMPAT_INVITE_BASE_URL must use HTTPS.');
  return url.origin;
}

export function compatibilityInviteSweepSecret(
  env: Environment = process.env,
): string {
  const secret = value(env, 'COMPAT_INVITE_SWEEP_SECRET');
  return secret.length >= 32 ? secret : '';
}
