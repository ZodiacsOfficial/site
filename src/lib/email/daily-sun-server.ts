import { createHash } from 'node:crypto';
import { dailyRecipientHash } from '../daily-email/identity.js';
import { SIGN_SLUGS } from '../signs.js';
import { normalizeEmail } from './input.js';

type Environment = Record<string, unknown>;
type Fetch = typeof fetch;

const HASH = /^[0-9a-f]{64}$/;

export type DailySunConfirmationState = 'pending' | 'confirming' | 'confirmed' | 'revoked';

export interface DailySunPreference {
  recipientHash: string;
  sign: string;
  confirmationTokenHash: string | null;
  confirmationState: DailySunConfirmationState;
  confirmedAt: string | null;
}

export type DailySunStageOutcome = 'pending' | 'already_on' | 'already_pending';

function value(env: Environment, key: string): string {
  const candidate = env[key];
  return typeof candidate === 'string' ? candidate.trim() : '';
}

function supabaseOrigin(env: Environment): string {
  const url = new URL(value(env, 'PUBLIC_SUPABASE_URL'));
  if (url.protocol !== 'https:') throw new Error('Supabase URL must use HTTPS.');
  return url.origin;
}

function serviceHeaders(env: Environment, prefer?: string): Record<string, string> {
  const serviceKey = value(env, 'SUPABASE_SERVICE_ROLE_KEY');
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

function parsePreference(value: unknown): DailySunPreference | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as {
    recipient_hash?: unknown;
    sign?: unknown;
    confirmation_token_hash?: unknown;
    confirmation_state?: unknown;
    confirmed_at?: unknown;
  };
  const tokenHash = row.confirmation_token_hash === null
    || (typeof row.confirmation_token_hash === 'string' && HASH.test(row.confirmation_token_hash))
    ? row.confirmation_token_hash
    : undefined;
  const confirmedAt = row.confirmed_at === null || typeof row.confirmed_at === 'string'
    ? row.confirmed_at
    : undefined;
  const state = row.confirmation_state;
  return typeof row.recipient_hash === 'string'
    && HASH.test(row.recipient_hash)
    && typeof row.sign === 'string'
    && SIGN_SLUGS.includes(row.sign)
    && tokenHash !== undefined
    && confirmedAt !== undefined
    && (state === 'pending' || state === 'confirming' || state === 'confirmed' || state === 'revoked')
    ? {
      recipientHash: row.recipient_hash,
      sign: row.sign,
      confirmationTokenHash: tokenHash,
      confirmationState: state,
      confirmedAt,
    }
    : null;
}

function parseSinglePreference(value: unknown): DailySunPreference | null {
  return Array.isArray(value) && value.length === 1 ? parsePreference(value[0]) : null;
}

export function dailySunTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function dailySunRecipientHash(
  email: string,
  env: Environment = process.env,
): string {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error('Daily sun recipient is invalid.');
  return dailyRecipientHash(normalized, value(env, 'DAILY_EMAIL_RECIPIENT_HASH_SECRET'));
}

export async function getDailySunPreference(
  recipientHash: string,
  env: Environment = process.env,
  fetcher: Fetch = fetch,
): Promise<DailySunPreference | null> {
  if (!HASH.test(recipientHash)) return null;
  const query = new URLSearchParams({
    select: 'recipient_hash,sign,confirmation_token_hash,confirmation_state,confirmed_at',
    recipient_hash: `eq.${recipientHash}`,
    limit: '1',
  });
  const response = await fetcher(`${supabaseOrigin(env)}/rest/v1/daily_sun_preferences?${query}`, {
    headers: serviceHeaders(env),
  });
  if (!response.ok) throw new Error(`Daily sun preference lookup failed (${response.status})`);
  return parseSinglePreference(await response.json());
}

export async function savePendingDailySunConfirmation(
  email: string,
  sign: string,
  token: string,
  env: Environment = process.env,
  fetcher: Fetch = fetch,
): Promise<{
  recipientHash: string;
  confirmationTokenHash: string;
  outcome: DailySunStageOutcome;
}> {
  if (!SIGN_SLUGS.includes(sign)) throw new Error('A valid sign is required for daily email.');
  const recipientHash = dailySunRecipientHash(email, env);
  const confirmationTokenHash = dailySunTokenHash(token);
  const response = await fetcher(
    `${supabaseOrigin(env)}/rest/v1/rpc/stage_daily_sun_confirmation`,
    {
      method: 'POST',
      headers: serviceHeaders(env),
      body: JSON.stringify({
        candidate_recipient_hash: recipientHash,
        candidate_sign: sign,
        candidate_token_hash: confirmationTokenHash,
      }),
    },
  );
  if (!response.ok) throw new Error(`Daily sun confirmation request write failed (${response.status})`);
  const outcome = await response.json() as unknown;
  if (outcome !== 'pending' && outcome !== 'already_on' && outcome !== 'already_pending') {
    throw new Error('Daily sun confirmation request returned an invalid state.');
  }
  return { recipientHash, confirmationTokenHash, outcome };
}

export async function deletePendingDailySunConfirmation(
  recipientHash: string,
  confirmationTokenHash: string,
  env: Environment = process.env,
  fetcher: Fetch = fetch,
): Promise<void> {
  if (!HASH.test(recipientHash) || !HASH.test(confirmationTokenHash)) return;
  const query = new URLSearchParams({
    recipient_hash: `eq.${recipientHash}`,
    confirmation_token_hash: `eq.${confirmationTokenHash}`,
    confirmation_state: 'eq.pending',
  });
  const response = await fetcher(
    `${supabaseOrigin(env)}/rest/v1/daily_sun_preferences?${query}`,
    { method: 'DELETE', headers: serviceHeaders(env, 'return=minimal') },
  );
  if (!response.ok) throw new Error(`Pending daily sun confirmation deletion failed (${response.status})`);
}

export async function isCurrentPendingDailySunConfirmation(
  email: string,
  sign: string,
  token: string,
  env: Environment = process.env,
  fetcher: Fetch = fetch,
): Promise<boolean> {
  const preference = await getDailySunPreference(dailySunRecipientHash(email, env), env, fetcher);
  return Boolean(preference
    && preference.sign === sign
    && preference.confirmationState === 'pending'
    && preference.confirmationTokenHash === dailySunTokenHash(token));
}

async function transitionDailySunConfirmation(
  email: string,
  sign: string,
  token: string,
  from: DailySunConfirmationState,
  update: Record<string, unknown>,
  env: Environment,
  fetcher: Fetch,
): Promise<boolean> {
  if (!SIGN_SLUGS.includes(sign)) return false;
  const recipientHash = dailySunRecipientHash(email, env);
  const confirmationTokenHash = dailySunTokenHash(token);
  const query = new URLSearchParams({
    recipient_hash: `eq.${recipientHash}`,
    sign: `eq.${sign}`,
    confirmation_token_hash: `eq.${confirmationTokenHash}`,
    confirmation_state: `eq.${from}`,
  });
  const response = await fetcher(
    `${supabaseOrigin(env)}/rest/v1/daily_sun_preferences?${query}`,
    {
      method: 'PATCH',
      headers: serviceHeaders(env, 'return=representation'),
      body: JSON.stringify(update),
    },
  );
  if (!response.ok) throw new Error(`Daily sun confirmation transition failed (${response.status})`);
  return parseSinglePreference(await response.json()) !== null;
}

export async function claimPendingDailySunConfirmation(
  email: string,
  sign: string,
  token: string,
  env: Environment = process.env,
  fetcher: Fetch = fetch,
): Promise<boolean> {
  return transitionDailySunConfirmation(
    email,
    sign,
    token,
    'pending',
    { confirmation_state: 'confirming' },
    env,
    fetcher,
  );
}

export async function completeClaimedDailySunConfirmation(
  email: string,
  sign: string,
  token: string,
  env: Environment = process.env,
  fetcher: Fetch = fetch,
): Promise<boolean> {
  return transitionDailySunConfirmation(
    email,
    sign,
    token,
    'confirming',
    {
      confirmation_token_hash: null,
      confirmation_state: 'confirmed',
      confirmed_at: new Date().toISOString(),
    },
    env,
    fetcher,
  );
}

export async function releaseClaimedDailySunConfirmation(
  email: string,
  sign: string,
  token: string,
  env: Environment = process.env,
  fetcher: Fetch = fetch,
): Promise<boolean> {
  return transitionDailySunConfirmation(
    email,
    sign,
    token,
    'confirming',
    { confirmation_state: 'pending' },
    env,
    fetcher,
  );
}
