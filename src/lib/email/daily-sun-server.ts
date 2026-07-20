import { createHash } from 'node:crypto';
import { dailyRecipientHash } from '../daily-email/identity.js';
import { SIGN_SLUGS } from '../signs.js';
import { normalizeEmail } from './input.js';

type Environment = Record<string, unknown>;
type Fetch = typeof fetch;

const HASH = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class DailySunRpcStatusError extends Error {}

export interface DailySunPreference {
  recipientHash: string;
  sign: string;
  confirmedAt: string;
}

export type DailySunRequestKind = 'subscribe' | 'sign_change';
export type DailySunStageOutcome =
  | 'new_request'
  | 'replaced_request'
  | 'already_on'
  | 'sign_change_request'
  | 'sign_change_replaced'
  | 'cooldown'
  | 'in_flight';

export interface DailySunStageResult {
  recipientHash: string;
  confirmationTokenHash: string;
  outcome: DailySunStageOutcome;
  activeSign: string | null;
}

export interface DailySunConfirmationInspection {
  requestKind: DailySunRequestKind;
  activeSign: string | null;
  confirmationState: 'pending' | 'confirming';
}

export type DailySunClaimResult =
  | {
    outcome: 'claimed';
    requestKind: DailySunRequestKind;
    activeSign: string | null;
  }
  | { outcome: 'busy' | 'unavailable' };

export interface DailySunCompletionResult {
  outcome: 'completed' | 'gone' | 'superseded' | 'expired';
  activeSign: string | null;
}

export interface DailySunReleaseResult {
  outcome: 'released' | 'already_completed' | 'gone' | 'superseded';
  activeSign: string | null;
}

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

function isSign(candidate: unknown): candidate is string {
  return typeof candidate === 'string' && SIGN_SLUGS.includes(candidate);
}

function parseActivePreference(candidate: unknown): DailySunPreference | null {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const row = candidate as {
    recipient_hash?: unknown;
    sign?: unknown;
    confirmed_at?: unknown;
  };
  return typeof row.recipient_hash === 'string'
    && HASH.test(row.recipient_hash)
    && isSign(row.sign)
    && typeof row.confirmed_at === 'string'
    && Number.isFinite(Date.parse(row.confirmed_at))
    ? {
      recipientHash: row.recipient_hash,
      sign: row.sign,
      confirmedAt: row.confirmed_at,
    }
    : null;
}

function parseActiveSign(candidate: unknown): string | null | undefined {
  return candidate === null ? null : isSign(candidate) ? candidate : undefined;
}

async function rpc(
  name: string,
  body: Record<string, unknown>,
  env: Environment,
  fetcher: Fetch,
): Promise<unknown> {
  const response = await fetcher(`${supabaseOrigin(env)}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: serviceHeaders(env),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new DailySunRpcStatusError(
      `Daily sun ${name.replaceAll('_', ' ')} failed (${response.status})`,
    );
  }
  return response.json();
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
    select: 'recipient_hash,sign,confirmed_at',
    recipient_hash: `eq.${recipientHash}`,
    limit: '1',
  });
  const response = await fetcher(`${supabaseOrigin(env)}/rest/v1/daily_sun_preferences?${query}`, {
    headers: serviceHeaders(env),
  });
  if (!response.ok) throw new Error(`Daily sun preference lookup failed (${response.status})`);
  const body = await response.json() as unknown;
  return Array.isArray(body) && body.length === 1 ? parseActivePreference(body[0]) : null;
}

export async function savePendingDailySunConfirmation(
  email: string,
  sign: string,
  token: string,
  expiresAt: number,
  env: Environment = process.env,
  fetcher: Fetch = fetch,
): Promise<DailySunStageResult> {
  if (!isSign(sign) || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error('A valid, unexpired sign request is required for daily email.');
  }
  const recipientHash = dailySunRecipientHash(email, env);
  const confirmationTokenHash = dailySunTokenHash(token);
  const result = await rpc('stage_daily_sun_confirmation', {
    candidate_recipient_hash: recipientHash,
    candidate_sign: sign,
    candidate_token_hash: confirmationTokenHash,
    candidate_expires_at: new Date(expiresAt).toISOString(),
  }, env, fetcher);
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Daily sun confirmation request returned an invalid state.');
  }
  const row = result as { outcome?: unknown; active_sign?: unknown };
  const outcomes: DailySunStageOutcome[] = [
    'new_request', 'replaced_request', 'already_on',
    'sign_change_request', 'sign_change_replaced', 'cooldown', 'in_flight',
  ];
  const activeSign = parseActiveSign(row.active_sign);
  if (typeof row.outcome !== 'string'
    || !outcomes.includes(row.outcome as DailySunStageOutcome)
    || activeSign === undefined) {
    throw new Error('Daily sun confirmation request returned an invalid state.');
  }
  return {
    recipientHash,
    confirmationTokenHash,
    outcome: row.outcome as DailySunStageOutcome,
    activeSign,
  };
}

export async function deletePendingDailySunConfirmation(
  recipientHash: string,
  confirmationTokenHash: string,
  env: Environment = process.env,
  fetcher: Fetch = fetch,
): Promise<boolean> {
  if (!HASH.test(recipientHash) || !HASH.test(confirmationTokenHash)) return false;
  const result = await rpc('cancel_daily_sun_confirmation', {
    candidate_recipient_hash: recipientHash,
    candidate_token_hash: confirmationTokenHash,
    require_sign_change: false,
  }, env, fetcher);
  if (typeof result !== 'boolean') throw new Error('Daily sun cancellation returned an invalid state.');
  return result;
}

export async function inspectDailySunConfirmation(
  email: string,
  sign: string,
  token: string,
  env: Environment = process.env,
  fetcher: Fetch = fetch,
): Promise<DailySunConfirmationInspection | null> {
  if (!isSign(sign)) return null;
  const result = await rpc('inspect_daily_sun_confirmation', {
    candidate_recipient_hash: dailySunRecipientHash(email, env),
    candidate_sign: sign,
    candidate_token_hash: dailySunTokenHash(token),
  }, env, fetcher);
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
  const row = result as {
    outcome?: unknown;
    request_kind?: unknown;
    active_sign?: unknown;
    confirmation_state?: unknown;
  };
  if (row.outcome === 'invalid') return null;
  const activeSign = parseActiveSign(row.active_sign);
  if (row.outcome !== 'valid'
    || (row.request_kind !== 'subscribe' && row.request_kind !== 'sign_change')
    || activeSign === undefined
    || (row.confirmation_state !== 'pending' && row.confirmation_state !== 'confirming')) {
    throw new Error('Daily sun inspection returned an invalid state.');
  }
  return {
    requestKind: row.request_kind,
    activeSign,
    confirmationState: row.confirmation_state,
  };
}

export async function claimPendingDailySunConfirmation(
  email: string,
  sign: string,
  token: string,
  attemptId: string,
  env: Environment = process.env,
  fetcher: Fetch = fetch,
): Promise<DailySunClaimResult> {
  if (!isSign(sign) || !UUID.test(attemptId)) return { outcome: 'unavailable' };
  const body = {
    candidate_recipient_hash: dailySunRecipientHash(email, env),
    candidate_sign: sign,
    candidate_token_hash: dailySunTokenHash(token),
    candidate_attempt_id: attemptId,
  };
  let result: unknown;
  try {
    result = await rpc('claim_daily_sun_confirmation', body, env, fetcher);
  } catch (error) {
    if (error instanceof DailySunRpcStatusError) throw error;
    // The same attempt id makes one retry safe when the first response was
    // lost after PostgreSQL committed the claim.
    result = await rpc('claim_daily_sun_confirmation', body, env, fetcher);
  }
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Daily sun claim returned an invalid state.');
  }
  const row = result as { outcome?: unknown; request_kind?: unknown; active_sign?: unknown };
  if (row.outcome === 'busy' || row.outcome === 'unavailable') return { outcome: row.outcome };
  const activeSign = parseActiveSign(row.active_sign);
  if (row.outcome !== 'claimed'
    || (row.request_kind !== 'subscribe' && row.request_kind !== 'sign_change')
    || activeSign === undefined) {
    throw new Error('Daily sun claim returned an invalid state.');
  }
  return { outcome: 'claimed', requestKind: row.request_kind, activeSign };
}

export async function completeClaimedDailySunConfirmation(
  email: string,
  token: string,
  attemptId: string,
  env: Environment = process.env,
  fetcher: Fetch = fetch,
): Promise<DailySunCompletionResult> {
  if (!UUID.test(attemptId)) return { outcome: 'gone', activeSign: null };
  const result = await rpc('complete_daily_sun_confirmation', {
    candidate_recipient_hash: dailySunRecipientHash(email, env),
    candidate_token_hash: dailySunTokenHash(token),
    candidate_attempt_id: attemptId,
  }, env, fetcher);
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Daily sun completion returned an invalid state.');
  }
  const row = result as { outcome?: unknown; active_sign?: unknown };
  const activeSign = parseActiveSign(row.active_sign);
  if ((row.outcome !== 'completed' && row.outcome !== 'gone'
      && row.outcome !== 'superseded' && row.outcome !== 'expired')
    || activeSign === undefined) {
    throw new Error('Daily sun completion returned an invalid state.');
  }
  return { outcome: row.outcome, activeSign };
}

export async function releaseClaimedDailySunConfirmation(
  email: string,
  token: string,
  attemptId: string,
  env: Environment = process.env,
  fetcher: Fetch = fetch,
): Promise<DailySunReleaseResult> {
  if (!UUID.test(attemptId)) return { outcome: 'gone', activeSign: null };
  const result = await rpc('release_daily_sun_confirmation', {
    candidate_recipient_hash: dailySunRecipientHash(email, env),
    candidate_token_hash: dailySunTokenHash(token),
    candidate_attempt_id: attemptId,
  }, env, fetcher);
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Daily sun release returned an invalid state.');
  }
  const row = result as { outcome?: unknown; active_sign?: unknown };
  const activeSign = parseActiveSign(row.active_sign);
  if ((row.outcome !== 'released' && row.outcome !== 'already_completed'
      && row.outcome !== 'gone' && row.outcome !== 'superseded')
    || activeSign === undefined) {
    throw new Error('Daily sun release returned an invalid state.');
  }
  return { outcome: row.outcome, activeSign };
}

export async function keepCurrentDailySunSign(
  email: string,
  token: string,
  env: Environment = process.env,
  fetcher: Fetch = fetch,
): Promise<boolean> {
  const result = await rpc('cancel_daily_sun_confirmation', {
    candidate_recipient_hash: dailySunRecipientHash(email, env),
    candidate_token_hash: dailySunTokenHash(token),
    require_sign_change: true,
  }, env, fetcher);
  if (typeof result !== 'boolean') throw new Error('Daily sun cancellation returned an invalid state.');
  return result;
}
