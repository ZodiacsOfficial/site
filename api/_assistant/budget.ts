/** A hung PostgREST call must not hold a serverless invocation indefinitely. */
const QUOTA_TIMEOUT_MS = 5_000;

export const VISITOR_DAILY_LIMIT_DEFAULT = 10;
export const DAILY_BUDGET_MICROUSD_DEFAULT = 3_000_000;
export const MONTHLY_BUDGET_MICROUSD_DEFAULT = 100_000_000;
/**
 * Hard per-request reservation ceiling. The handler derives a tighter bound
 * from the UTF-8 byte length of the exact serialized Responses request; since
 * token count cannot exceed byte count, pricing every byte as both uncached
 * input and a conservatively additional cache write plus all 900 output
 * tokens is conservative. Requests above this ceiling do not call the
 * provider.
 */
export const RESERVATION_MICROUSD_DEFAULT = 300_000;

export type BudgetDenyReason = 'visitor_limit' | 'daily_budget' | 'monthly_budget';

export interface BudgetConfig {
  visitorDailyLimit: number;
  dailyLimitMicrousd: number;
  monthlyLimitMicrousd: number;
  reservationMicrousd: number;
}

export interface BudgetReservation {
  allowed: boolean;
  reason: 'ok' | BudgetDenyReason;
  reservationId: string;
  visitor: number;
  dailyReservedMicrousd: number;
  monthlyReservedMicrousd: number;
}

export interface OpenAIUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_write_tokens?: number;
  input_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
  output_tokens_details?: { reasoning_tokens?: number };
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function cappedPositiveInteger(value: string | undefined, fallback: number, ceiling: number): number {
  return Math.min(positiveInteger(value, fallback), ceiling);
}

export function budgetConfig(env: NodeJS.ProcessEnv): BudgetConfig {
  const requestedDailyLimitMicrousd = cappedPositiveInteger(
    env.ASSISTANT_DAILY_BUDGET_MICROUSD,
    DAILY_BUDGET_MICROUSD_DEFAULT,
    DAILY_BUDGET_MICROUSD_DEFAULT,
  );
  const monthlyLimitMicrousd = cappedPositiveInteger(
    env.ASSISTANT_MONTHLY_BUDGET_MICROUSD,
    MONTHLY_BUDGET_MICROUSD_DEFAULT,
    MONTHLY_BUDGET_MICROUSD_DEFAULT,
  );
  // Operator overrides are emergency brakes, never a way to raise the launch
  // ceilings. If a monthly brake is lower than the requested daily brake,
  // lower the daily value too so the SQL contract remains internally valid.
  const dailyLimitMicrousd = Math.min(requestedDailyLimitMicrousd, monthlyLimitMicrousd);
  return {
    visitorDailyLimit: cappedPositiveInteger(
      env.ASSISTANT_VISITOR_DAILY_LIMIT,
      VISITOR_DAILY_LIMIT_DEFAULT,
      VISITOR_DAILY_LIMIT_DEFAULT,
    ),
    dailyLimitMicrousd,
    monthlyLimitMicrousd,
    reservationMicrousd: Math.min(
      positiveInteger(env.ASSISTANT_RESERVATION_MICROUSD, RESERVATION_MICROUSD_DEFAULT),
      dailyLimitMicrousd,
      monthlyLimitMicrousd,
    ),
  };
}

function count(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

/** Compatibility scalar parser retained for operational tests and old RPC diagnostics. */
export function parseQuotaCount(payload: unknown): number | null {
  const direct = count(payload);
  if (direct !== null) return direct;
  if (Array.isArray(payload)) return payload.length === 1 ? parseQuotaCount(payload[0]) : null;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['assistant_quota_bump', 'count', 'today_count']) {
      if (key in record) return parseQuotaCount(record[key]);
    }
  }
  return null;
}

export function parseQuotaResult(payload: unknown): { visitor: number; global: number } | null {
  const record = Array.isArray(payload) && payload.length === 1 ? payload[0] : payload;
  if (!record || typeof record !== 'object') return null;
  const visitor = parseQuotaCount((record as Record<string, unknown>).visitor);
  const global = parseQuotaCount((record as Record<string, unknown>).global);
  return visitor === null || global === null ? null : { visitor, global };
}

export function parseBudgetReservation(payload: unknown, reservationId: string): BudgetReservation | null {
  const value = Array.isArray(payload) && payload.length === 1 ? payload[0] : payload;
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.allowed !== 'boolean') return null;
  const reason = record.reason;
  if (reason !== 'ok' && reason !== 'visitor_limit' && reason !== 'daily_budget' && reason !== 'monthly_budget') {
    return null;
  }
  const visitor = count(record.visitor);
  const daily = count(record.daily_reserved_microusd);
  const monthly = count(record.monthly_reserved_microusd);
  if (visitor === null || daily === null || monthly === null) return null;
  if (record.allowed !== (reason === 'ok')) return null;
  return {
    allowed: record.allowed,
    reason,
    reservationId,
    visitor,
    dailyReservedMicrousd: daily,
    monthlyReservedMicrousd: monthly,
  };
}

function supabaseHeaders(serviceKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: serviceKey,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };
  // sb_secret_* keys are opaque and must not be parsed as Bearer JWTs.
  if (!serviceKey.startsWith('sb_secret_')) headers.Authorization = `Bearer ${serviceKey}`;
  return headers;
}

async function rpc(
  fetchImpl: typeof fetch,
  supabaseUrl: string,
  serviceKey: string,
  routine: string,
  body: Record<string, unknown>,
): Promise<Response | null> {
  try {
    return await fetchImpl(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/${routine}`, {
      method: 'POST',
      headers: supabaseHeaders(serviceKey),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(QUOTA_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
}

/**
 * SQL contract for the migration owner:
 * assistant_budget_reserve_v1(visitor_hash text, reservation_id text,
 * reserved_microusd bigint, visitor_daily_limit int,
 * daily_limit_microusd bigint, monthly_limit_microusd bigint) -> json
 *
 * The function atomically increments the visitor count and reserves spend,
 * returning {allowed,reason,visitor,daily_reserved_microusd,
 * monthly_reserved_microusd}. A denied call must not create a reservation.
 */
export async function reserveAssistantBudget(
  fetchImpl: typeof fetch,
  supabaseUrl: string,
  serviceKey: string,
  visitorHash: string,
  reservationId: string,
  reservedMicrousd: number,
  config: BudgetConfig,
  log: (line: string) => void,
): Promise<BudgetReservation | null> {
  const response = await rpc(fetchImpl, supabaseUrl, serviceKey, 'assistant_budget_reserve_v1', {
    visitor_hash: visitorHash,
    reservation_id: reservationId,
    reserved_microusd: reservedMicrousd,
    visitor_daily_limit: config.visitorDailyLimit,
    daily_limit_microusd: config.dailyLimitMicrousd,
    monthly_limit_microusd: config.monthlyLimitMicrousd,
  });
  if (!response) {
    log('assistant_event stage=quota code=network_failure');
    return null;
  }
  if (!response.ok) {
    let code = 'unknown';
    try {
      const payload = await response.json() as Record<string, unknown>;
      if (typeof payload.code === 'string') code = payload.code;
    } catch {
      // Status and a bounded provider code are sufficient for a non-content log.
    }
    log(`assistant_event stage=quota code=rpc_failure status=${response.status} provider_code=${code}`);
    return null;
  }
  try {
    const parsed = parseBudgetReservation(await response.json(), reservationId);
    if (!parsed) log('assistant_event stage=quota code=invalid_result');
    return parsed;
  } catch {
    log('assistant_event stage=quota code=invalid_json');
    return null;
  }
}

/**
 * SQL contract: assistant_budget_settle_v1(reservation_id text,
 * actual_microusd bigint) -> boolean. It must be idempotent and may only
 * reduce or finalize the existing reservation, never create new spend.
 */
export async function settleAssistantBudget(
  fetchImpl: typeof fetch,
  supabaseUrl: string,
  serviceKey: string,
  reservationId: string,
  actualMicrousd: number,
  log: (line: string) => void,
): Promise<boolean> {
  const response = await rpc(fetchImpl, supabaseUrl, serviceKey, 'assistant_budget_settle_v1', {
    reservation_id: reservationId,
    actual_microusd: actualMicrousd,
  });
  if (!response?.ok) {
    log(`assistant_event stage=quota_settle code=rpc_failure status=${response?.status ?? 0}`);
    return false;
  }
  try {
    const payload: unknown = await response.json();
    const settled = payload === true || (Array.isArray(payload) && payload.length === 1 && payload[0] === true);
    if (!settled) log('assistant_event stage=quota_settle code=invalid_result');
    return settled;
  } catch {
    log('assistant_event stage=quota_settle code=invalid_json');
    return false;
  }
}

function nonNegativeFinite(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

/** GPT-5.6 Luna standard rates, expressed as microdollars per token. */
export function estimateLunaCostMicrousd(usage: OpenAIUsage): number {
  const input = nonNegativeFinite(usage.input_tokens);
  const cached = Math.min(input, nonNegativeFinite(usage.input_tokens_details?.cached_tokens));
  const uncached = input - cached;
  const output = nonNegativeFinite(usage.output_tokens);
  const cacheWrites = Math.max(
    nonNegativeFinite(usage.cache_write_tokens),
    nonNegativeFinite(usage.input_tokens_details?.cache_write_tokens),
  );
  // $0.20/M uncached input, $0.02/M cached input, $1.20/M output.
  // Cache writes are $0.25/M (1.25x). Treat a reported write count as
  // additional even if the provider also includes it in input_tokens; that
  // deliberately overcounts instead of risking an under-settlement.
  return Math.ceil((uncached * 0.2) + (cached * 0.02) + (cacheWrites * 0.25) + (output * 1.2));
}

export function requestCostUpperBoundMicrousd(serializedRequestBytes: number, maxOutputTokens: number): number {
  if (!Number.isSafeInteger(serializedRequestBytes) || serializedRequestBytes < 0) return Number.MAX_SAFE_INTEGER;
  if (!Number.isSafeInteger(maxOutputTokens) || maxOutputTokens < 0) return Number.MAX_SAFE_INTEGER;
  // Every UTF-8 byte is conservatively treated as both an uncached input
  // token ($0.20/M) and an additionally reported cache-write token ($0.25/M),
  // matching the deliberately overcounting settlement estimator above.
  // The route's bounded request stays far below Luna's 272K long-context
  // tier; fail closed rather than use this formula beyond that threshold.
  if (serializedRequestBytes > 272_000) return Number.MAX_SAFE_INTEGER;
  return Math.ceil((serializedRequestBytes * 0.45) + (maxOutputTokens * 1.2));
}

export function budgetAlertLevel(reservation: BudgetReservation, config: BudgetConfig): 0 | 70 | 90 | 100 {
  const ratio = Math.max(
    reservation.dailyReservedMicrousd / config.dailyLimitMicrousd,
    reservation.monthlyReservedMicrousd / config.monthlyLimitMicrousd,
  );
  if (ratio >= 1) return 100;
  if (ratio >= 0.9) return 90;
  if (ratio >= 0.7) return 70;
  return 0;
}
