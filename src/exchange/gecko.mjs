/**
 * GeckoTerminal client for the Exchange terminal's chart and tape.
 *
 * Read-only, keyless, and browser-direct: candles and recent trades for a
 * public pool address, nothing else. No site-added visitor identifier is
 * part of a request — the URL builders below take a pool and a timeframe and
 * are pinned by test to carry nothing more. Ordinary web-request metadata
 * still reaches the provider. The provider is named on the
 * privacy pages and credited beside the chart.
 *
 * Verified live 2026-08-09 against the Aries pool: OHLCV arrives newest-first
 * as [ts, o, h, l, c, v] in USD, and thin pools skip empty periods — sparse
 * candles are normal here, not a failure.
 */

export const GECKO_BASE_URL = 'https://api.geckoterminal.com/api/v2';
export const GECKO_SITE_URL = 'https://www.geckoterminal.com/';
export const GECKO_REQUEST_DEADLINE_MS = 12_000;

/** ~30 requests/min is IP-bound; leave room for other tabs and visitors behind one NAT. */
export const GECKO_BUDGET_PER_MINUTE = 12;
export const GECKO_BUDGET_STORAGE_KEY = 'zodiacs.exchange.gecko-budget.v1';
export const GECKO_COOLOFF_STORAGE_KEY = 'zodiacs.exchange.gecko-cooloff.v1';

export const EXCHANGE_ERROR_CODES = Object.freeze([
  'network',
  'rate_limited',
  'unavailable',
  'not_indexed',
]);

export class ExchangeDataError extends Error {
  constructor(code, message, { cause, retryAfterMs = null } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ExchangeDataError';
    this.code = code;
    this.retryAfterMs = Number.isFinite(retryAfterMs) && retryAfterMs >= 0
      ? retryAfterMs
      : null;
  }
}

function fail(code, message, options) {
  throw new ExchangeDataError(code, message, options);
}

/**
 * The chart's four timeframes, mapped to GeckoTerminal's path and aggregate.
 * Limits are sized to roughly two days / one week / one month / six months —
 * enough history to read, few enough points to draw plainly.
 */
export const TIMEFRAMES = Object.freeze({
  '15m': { path: 'minute', aggregate: 15, limit: 192 },
  '1h': { path: 'hour', aggregate: 1, limit: 168 },
  '4h': { path: 'hour', aggregate: 4, limit: 180 },
  '1d': { path: 'day', aggregate: 1, limit: 180 },
});

export function ohlcvUrl({ pool, timeframe, baseUrl = GECKO_BASE_URL }) {
  const spec = TIMEFRAMES[timeframe];
  if (!spec) fail('unavailable', `Unknown timeframe: ${timeframe}`);
  const url = new URL(
    `${baseUrl}/networks/solana/pools/${encodeURIComponent(pool)}/ohlcv/${spec.path}`,
  );
  url.searchParams.set('aggregate', String(spec.aggregate));
  url.searchParams.set('limit', String(spec.limit));
  return url.toString();
}

export function tradesUrl({ pool, baseUrl = GECKO_BASE_URL }) {
  return new URL(
    `${baseUrl}/networks/solana/pools/${encodeURIComponent(pool)}/trades`,
  ).toString();
}

/** Newest-first [ts, o, h, l, c, v] rows → ascending candles, malformed rows dropped. */
export function normalizeOhlcv(payload) {
  if (!payload?.data || typeof payload.data !== 'object') {
    fail('unavailable', 'The chart data was not readable.');
  }
  // An answer with no candle list is an empty market, not an outage.
  const list = payload.data.attributes?.ohlcv_list;
  if (list === undefined) return [];
  if (!Array.isArray(list)) fail('unavailable', 'The chart data was not readable.');
  const candles = [];
  for (const row of list) {
    if (!Array.isArray(row) || row.length < 6) continue;
    const [ts, o, h, l, c, v] = row.map(Number);
    if (![ts, o, h, l, c, v].every(Number.isFinite)) continue;
    if (ts <= 0 || o <= 0 || h <= 0 || l <= 0 || c <= 0 || v < 0) continue;
    candles.push({ ts, o, h, l, c, v });
  }
  candles.sort((a, b) => a.ts - b.ts);
  return candles;
}

/**
 * Trades → the tape's rows, newest first. The official mint decides which
 * side of each trade is the Zodiac; a row whose addresses do not include the
 * mint contributes nothing rather than guessing.
 */
export function normalizeTrades(payload, mint) {
  const rows = payload?.data;
  if (!Array.isArray(rows)) fail('unavailable', 'The trade data was not readable.');
  const trades = [];
  for (const row of rows) {
    const a = row?.attributes;
    if (!a) continue;
    const ts = Date.parse(a.block_timestamp ?? '');
    if (!Number.isFinite(ts)) continue;
    let tokenAmount;
    let priceUsd;
    if (a.to_token_address === mint) {
      tokenAmount = Number(a.to_token_amount);
      priceUsd = Number(a.price_to_in_usd);
    } else if (a.from_token_address === mint) {
      tokenAmount = Number(a.from_token_amount);
      priceUsd = Number(a.price_from_in_usd);
    } else {
      continue;
    }
    const side = a.kind === 'buy' || a.kind === 'sell' ? a.kind : null;
    const volumeUsd = Number(a.volume_in_usd);
    if (!side || !Number.isFinite(tokenAmount) || tokenAmount <= 0) continue;
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) continue;
    trades.push({
      id: String(row.id ?? `${a.tx_hash}-${ts}`),
      ts,
      side,
      tokenAmount,
      priceUsd,
      volumeUsd: Number.isFinite(volumeUsd) ? volumeUsd : null,
      tx: typeof a.tx_hash === 'string' ? a.tx_hash : null,
    });
  }
  trades.sort((a, b) => b.ts - a.ts);
  return trades;
}

/**
 * A sliding-minute budget the terminal shares across chart and tape polling.
 * When the budget is spent the caller skips the cycle and tries again on the
 * next tick — a quiet gap in the tape beats a 429 storm.
 */
export function createRateBudget({
  limit = GECKO_BUDGET_PER_MINUTE,
  windowMs = 60_000,
  now = () => Date.now(),
  storage = null,
  storageKey = GECKO_BUDGET_STORAGE_KEY,
} = {}) {
  let memoryStamps = [];
  let storageUsable = Boolean(storage);

  function readStamps() {
    if (!storageUsable) return memoryStamps;
    try {
      const value = JSON.parse(storage.getItem(storageKey) ?? '[]');
      if (Array.isArray(value)) return value.filter(Number.isFinite);
    } catch {
      storageUsable = false;
    }
    return memoryStamps;
  }

  function writeStamps(stamps) {
    memoryStamps = stamps;
    if (!storageUsable) return;
    try {
      storage.setItem(storageKey, JSON.stringify(stamps));
    } catch {
      storageUsable = false;
    }
  }

  return {
    take() {
      const stamp = now();
      const cutoff = stamp - windowMs;
      const stamps = readStamps().filter((value) => value > cutoff && value <= stamp);
      if (stamps.length >= limit) {
        writeStamps(stamps);
        return false;
      }
      stamps.push(stamp);
      writeStamps(stamps);
      return true;
    },
  };
}

/** Retry-After accepts either delta-seconds or an HTTP date. */
export function parseRetryAfter(value, { now = () => Date.now(), maxMs = 120_000 } = {}) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim();
  const seconds = Number(text);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(Math.ceil(seconds * 1000), maxMs);
  }
  const date = Date.parse(text);
  if (!Number.isFinite(date)) return null;
  return Math.min(Math.max(0, date - now()), maxMs);
}

async function getJson(url, {
  fetchImpl = globalThis.fetch,
  signal,
  deadlineMs = GECKO_REQUEST_DEADLINE_MS,
} = {}) {
  const request = new AbortController();
  let timedOut = false;
  const relayAbort = () => request.abort();
  if (signal?.aborted) relayAbort();
  else signal?.addEventListener('abort', relayAbort, { once: true });
  const deadline = setTimeout(() => {
    timedOut = true;
    request.abort();
  }, deadlineMs);

  try {
    let response;
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        signal: request.signal,
        headers: { accept: 'application/json' },
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      if (timedOut) fail('network', 'The chart service timed out.', { cause: error });
      if (error?.name === 'AbortError') throw error;
      fail('network', 'The chart service could not be reached just now.', { cause: error });
    }
    if (response.status === 429) {
      fail('rate_limited', 'The chart service is rate limiting requests.', {
        retryAfterMs: parseRetryAfter(response.headers?.get?.('retry-after') ?? null),
      });
    }
    if (response.status === 404) {
      fail('not_indexed', 'This pool is not indexed by the chart service.');
    }
    if (!response.ok) fail('unavailable', 'The chart service did not answer.');
    try {
      return await response.json();
    } catch (error) {
      // A body read can also be what the abort or deadline interrupts.
      if (signal?.aborted) throw error;
      if (timedOut) fail('network', 'The chart service timed out.', { cause: error });
      if (error?.name === 'AbortError') throw error;
      fail('unavailable', 'The chart service did not return a readable answer.', { cause: error });
    }
  } finally {
    clearTimeout(deadline);
    signal?.removeEventListener('abort', relayAbort);
  }
  return undefined;
}

/**
 * Exponential cool-off for provider pushback. A 429 opens a pause that
 * doubles with each consecutive one and clears on the next success — the
 * "backoff on 429" half of the rate discipline; the sliding budget above is
 * the other half.
 */
export function createCoolOff({
  baseMs = 10_000,
  maxMs = 120_000,
  now = () => Date.now(),
  storage = null,
  storageKey = GECKO_COOLOFF_STORAGE_KEY,
} = {}) {
  let memory = { until: 0, step: 0, revision: 0 };
  let storageUsable = Boolean(storage);

  function readState() {
    if (!storageUsable) return memory;
    try {
      const value = JSON.parse(storage.getItem(storageKey) ?? 'null');
      if (value && [value.until, value.step, value.revision].every(Number.isFinite)) {
        memory = value;
      }
    } catch {
      storageUsable = false;
    }
    return memory;
  }

  function writeState(state) {
    memory = state;
    if (!storageUsable) return;
    try {
      storage.setItem(storageKey, JSON.stringify(state));
    } catch {
      storageUsable = false;
    }
  }

  return {
    active() { return now() < readState().until; },
    remainingMs() { return Math.max(0, readState().until - now()); },
    token() { return readState().revision; },
    fail(retryAfterMs = null) {
      const state = readState();
      const exponential = Math.min(baseMs * 2 ** state.step, maxMs);
      const providerDelay = Number.isFinite(retryAfterMs)
        ? Math.min(Math.max(0, retryAfterMs), maxMs)
        : 0;
      const proposedUntil = now() + Math.max(exponential, providerDelay);
      writeState({
        until: Math.max(state.until, proposedUntil),
        step: state.step + 1,
        revision: state.revision + 1,
      });
    },
    ok(token = null) {
      // A success that began before a sibling 429 must not erase its pause.
      const state = readState();
      if (token !== null && token !== state.revision) return false;
      writeState({ until: 0, step: 0, revision: state.revision + 1 });
      return true;
    },
  };
}

export async function fetchOhlcv({ pool, timeframe, baseUrl, fetchImpl, signal, deadlineMs }) {
  const payload = await getJson(ohlcvUrl({ pool, timeframe, baseUrl }), {
    fetchImpl, signal, deadlineMs,
  });
  return normalizeOhlcv(payload);
}

export async function fetchTrades({ pool, mint, baseUrl, fetchImpl, signal, deadlineMs }) {
  const payload = await getJson(tradesUrl({ pool, baseUrl }), {
    fetchImpl, signal, deadlineMs,
  });
  return normalizeTrades(payload, mint);
}
