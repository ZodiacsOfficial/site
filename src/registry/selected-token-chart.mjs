/**
 * Selected-token market-history lane for the Registry landing placard.
 *
 * This module intentionally knows nothing about the other eleven signs. A
 * caller supplies one canonical token address and one pool, on demand. The
 * browser build is a small ESM split point; it does not import the Exchange
 * terminal, chart renderer, tape, depth ladder, or trade runtime.
 */

import {
  GECKO_SITE_URL,
  createCoolOff,
  createRateBudget,
  fetchHourlyOhlcvWindow,
} from '../exchange/gecko.mjs';

export const SELECTED_TOKEN_CACHE_TTL_MS = 5 * 60_000;
export const SELECTED_TOKEN_LIVE_HOURS = 24;
export const SELECTED_TOKEN_MINIMUM_TREND_POINTS = 8;

const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function isoInstant(value, fallback = null) {
  const instant = new Date(value);
  return Number.isFinite(instant.getTime()) ? instant.toISOString() : fallback;
}

function utcDateSlot(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(String(value ?? ''))) return null;
  const instant = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(instant) ? instant : null;
}

function formatUtc(timestampMs) {
  const date = new Date(timestampMs);
  if (!Number.isFinite(date.getTime())) return 'an unknown time';
  return date.toLocaleString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });
}

function formatPriceUsd(value) {
  const number = positiveNumber(value);
  if (number === null) return 'an unavailable price';
  const maximumFractionDigits = number < 0.0001 ? 12 : number < 0.01 ? 8 : 4;
  return `$${number.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  })}`;
}

function percentChange(first, last) {
  if (!(first > 0) || !Number.isFinite(last)) return null;
  return ((last / first) - 1) * 100;
}

function describeChange(value) {
  if (!Number.isFinite(value)) return 'The interval change is unavailable.';
  if (Math.abs(value) < 0.005) return 'The endpoint price was unchanged.';
  const direction = value > 0 ? 'rose' : 'fell';
  return `The endpoint price ${direction} by ${Math.abs(value).toFixed(2)}%.`;
}

function abortError() {
  if (typeof DOMException === 'function') return new DOMException('Aborted', 'AbortError');
  return Object.assign(new Error('Aborted'), { name: 'AbortError' });
}

function defaultConnection() {
  if (typeof navigator === 'undefined') return null;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
}

function defaultStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

/** A constrained connection skips the third-party request, not the archive fallback. */
export function selectedTokenNetworkSkipReason(connection) {
  if (connection?.saveData) return 'save_data';
  if (/(^|-)2g$/u.test(String(connection?.effectiveType ?? '').toLowerCase())) {
    return 'constrained_connection';
  }
  return null;
}

/**
 * Keep only the 24 hourly slots immediately before the current open hour.
 * GeckoTerminal omits intervals with no swaps; no carry-forward values are
 * inserted here, so gaps remain observable in `points`.
 */
export function normalizeClosedHourlyPrices(candles, {
  nowMs = Date.now(),
  pool = null,
} = {}) {
  const clock = Number(nowMs);
  if (!Number.isFinite(clock) || clock <= 0) throw new TypeError('nowMs must be a valid instant');
  const windowEndMs = Math.floor(clock / HOUR_MS) * HOUR_MS;
  const windowStartMs = windowEndMs - (SELECTED_TOKEN_LIVE_HOURS * HOUR_MS);
  const bySlot = new Map();

  for (const candle of Array.isArray(candles) ? candles : []) {
    const timestampSeconds = Number(candle?.ts);
    const priceUsd = positiveNumber(candle?.c);
    if (!Number.isSafeInteger(timestampSeconds) || priceUsd === null) continue;
    const slotMs = timestampSeconds * 1000;
    if (slotMs % HOUR_MS !== 0) continue;
    if (slotMs < windowStartMs || slotMs >= windowEndMs) continue;
    bySlot.set(slotMs, {
      timestampMs: slotMs,
      slotMs,
      at: new Date(slotMs).toISOString(),
      priceUsd,
      pool,
    });
  }

  const points = [...bySlot.values()].sort((left, right) => left.slotMs - right.slotMs);
  return {
    source: 'geckoterminal-hourly',
    sourceLabel: 'GeckoTerminal',
    sourceAttributionUrl: GECKO_SITE_URL,
    timeframe: '1h',
    intervalMs: HOUR_MS,
    expectedPointCount: SELECTED_TOKEN_LIVE_HOURS,
    windowStartMs,
    windowEndMs,
    points,
  };
}

/** Registry daily observations normalized without interpolating null or missing dates. */
export function normalizeRegistryArchivePrices(observations) {
  const rows = Array.isArray(observations) ? observations : [];
  const slots = rows
    .map((observation) => utcDateSlot(observation?.date))
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  const windowStartMs = slots[0] ?? null;
  const lastSlotMs = slots.at(-1) ?? null;
  const windowEndMs = lastSlotMs === null ? null : lastSlotMs + DAY_MS;
  const expectedPointCount = windowStartMs === null || windowEndMs === null
    ? 0
    : Math.round((windowEndMs - windowStartMs) / DAY_MS);
  const bySlot = new Map();

  for (const observation of rows) {
    const slotMs = utcDateSlot(observation?.date);
    const priceUsd = positiveNumber(observation?.priceUsd);
    if (slotMs === null || priceUsd === null) continue;
    const fallbackAt = new Date(slotMs).toISOString();
    const at = isoInstant(observation?.observedAt, fallbackAt);
    bySlot.set(slotMs, {
      timestampMs: Date.parse(at),
      slotMs,
      at,
      priceUsd,
      pool: observation?.deepestPool?.pairAddress ?? observation?.pool ?? null,
      date: observation.date,
    });
  }

  const points = [...bySlot.values()].sort((left, right) => left.slotMs - right.slotMs);
  return {
    source: 'registry-daily-archive',
    sourceLabel: 'Registry daily archive',
    sourceAttributionUrl: null,
    timeframe: '1d',
    intervalMs: DAY_MS,
    expectedPointCount,
    windowStartMs,
    windowEndMs,
    points,
  };
}

function seriesCoverage(series) {
  const { points, intervalMs, windowStartMs, windowEndMs } = series;
  const segments = [];
  let active = [];
  let internalMissingIntervals = 0;
  let sourceChanges = 0;
  let missingRuns = 0;

  if (points.length && Number.isFinite(windowStartMs) && points[0].slotMs > windowStartMs) {
    missingRuns += 1;
  }
  for (const [index, point] of points.entries()) {
    const previous = points[index - 1] ?? null;
    const slotDifference = previous ? point.slotMs - previous.slotMs : intervalMs;
    const missing = previous && slotDifference > intervalMs
      ? Math.max(0, Math.round(slotDifference / intervalMs) - 1)
      : 0;
    const sourceChanged = Boolean(
      previous?.pool && point.pool && previous.pool !== point.pool,
    );
    const sequenceBreak = Boolean(previous && slotDifference !== intervalMs);
    if (sequenceBreak || sourceChanged) {
      if (active.length) segments.push(active);
      active = [];
      if (missing > 0) {
        internalMissingIntervals += missing;
        missingRuns += 1;
      }
      if (sourceChanged) sourceChanges += 1;
    }
    active.push(point);
  }
  if (active.length) segments.push(active);
  if (points.length && Number.isFinite(windowEndMs)
    && points.at(-1).slotMs < windowEndMs - intervalMs) {
    missingRuns += 1;
  }
  if (!points.length && series.expectedPointCount > 0) missingRuns = 1;

  return {
    observedPointCount: points.length,
    expectedPointCount: series.expectedPointCount,
    missingPointCount: Math.max(0, series.expectedPointCount - points.length),
    internalMissingIntervals,
    missingRuns,
    sourceChanges,
    segments,
  };
}

function liveFallbackSentence(live) {
  if (!live || live.status === 'not_requested') return '';
  if (live.status === 'skipped') {
    return live.reason === 'save_data'
      ? ' Live hourly prices were skipped because data saving is enabled.'
      : ' Live hourly prices were skipped on this constrained connection.';
  }
  if (live.status === 'rate_limited') return ' Live hourly prices are waiting for the provider rate limit.';
  if (live.status === 'not_indexed') return ' GeckoTerminal does not currently index this pool.';
  if (live.status === 'empty') return ' GeckoTerminal reported no closed hourly candles in this window.';
  if (live.status === 'network' || live.status === 'unavailable') {
    return ' Live hourly prices are temporarily unavailable.';
  }
  return '';
}

function accessibleSummary({ label, mode, series, coverage, first, last, netChangePct, live }) {
  const unit = series.timeframe === '1h' ? 'closed hourly' : 'Registry archive';
  const fallback = series.source === 'registry-daily-archive' ? liveFallbackSentence(live) : '';
  if (mode === 'empty') {
    return `${label} price history has no usable observations.${fallback}`;
  }
  if (mode === 'single') {
    return `${label} ${unit} history has one observation: ${formatPriceUsd(first.priceUsd)} at ${formatUtc(first.timestampMs)}. A trend line requires ${SELECTED_TOKEN_MINIMUM_TREND_POINTS} observations.${fallback}`;
  }
  const interval = `from ${formatPriceUsd(first.priceUsd)} at ${formatUtc(first.timestampMs)} to ${formatPriceUsd(last.priceUsd)} at ${formatUtc(last.timestampMs)}`;
  const gaps = coverage.missingPointCount > 0
    ? coverage.missingPointCount === 1
      ? ' 1 expected interval is missing and remains unconnected.'
      : ` ${coverage.missingPointCount} expected intervals are missing and remain unconnected.`
    : '';
  const sourceChange = coverage.sourceChanges > 0
    ? ` The pricing pool changed ${coverage.sourceChanges} time${coverage.sourceChanges === 1 ? '' : 's'}, so continuity is broken there.`
    : '';
  const line = mode === 'comparison'
    ? ` A trend line is withheld until ${SELECTED_TOKEN_MINIMUM_TREND_POINTS} observations are available.`
    : '';
  return `${label} ${unit} history has ${coverage.observedPointCount} observations ${interval}. ${describeChange(netChangePct)}${gaps}${sourceChange}${line}${fallback}`;
}

/**
 * Select live closed-hour observations when available, otherwise the existing
 * Registry archive. Fewer than eight points stay a textual endpoint
 * comparison; eight or more expose timestamped, gap-preserving segments.
 */
export function buildSelectedTokenChartModel({
  token,
  label = token,
  pool = null,
  live = null,
  archiveObservations = [],
} = {}) {
  const liveSeries = live?.status === 'ready' && live?.series?.points?.length
    ? live.series
    : null;
  const series = liveSeries ?? normalizeRegistryArchivePrices(archiveObservations);
  const coverage = seriesCoverage(series);
  const points = series.points;
  const first = points[0] ?? null;
  const last = points.at(-1) ?? null;
  const netChangePct = first && last && first !== last
    ? percentChange(first.priceUsd, last.priceUsd)
    : null;
  const mode = points.length === 0
    ? 'empty'
    : points.length === 1
      ? 'single'
      : points.length < SELECTED_TOKEN_MINIMUM_TREND_POINTS
        ? 'comparison'
        : 'line';
  const sourceNotice = liveSeries
    ? '24-hour reference-pool prices from GeckoTerminal.'
    : `Registry archive fallback.${liveFallbackSentence(live)}`.trim();
  const caption = series.timeframe === '1h'
    ? `${coverage.observedPointCount} of ${coverage.expectedPointCount} closed hourly observations · GeckoTerminal`
    : `${coverage.observedPointCount} Registry archive observation${coverage.observedPointCount === 1 ? '' : 's'}`;

  return {
    status: points.length ? 'ready' : 'empty',
    mode,
    token,
    label,
    pool,
    source: series.source,
    sourceLabel: series.sourceLabel,
    sourceAttributionUrl: series.sourceAttributionUrl,
    sourceNotice,
    timeframe: series.timeframe,
    intervalMs: series.intervalMs,
    windowStartMs: series.windowStartMs,
    windowEndMs: series.windowEndMs,
    points,
    segments: mode === 'line' ? coverage.segments : [],
    first,
    last,
    netChangePct,
    direction: netChangePct === null || Math.abs(netChangePct) < 0.005
      ? 'flat'
      : netChangePct > 0 ? 'up' : 'down',
    coverage: {
      observedPointCount: coverage.observedPointCount,
      expectedPointCount: coverage.expectedPointCount,
      missingPointCount: coverage.missingPointCount,
      missingRuns: coverage.missingRuns,
      sourceChanges: coverage.sourceChanges,
    },
    caption,
    ariaLabel: accessibleSummary({
      label, mode, series, coverage, first, last, netChangePct, live,
    }),
    liveStatus: live?.status ?? 'not_requested',
    liveReason: live?.reason ?? null,
  };
}

function providerFailure(error, token, pool) {
  const status = ['network', 'rate_limited', 'unavailable', 'not_indexed'].includes(error?.code)
    ? error.code
    : 'unavailable';
  return {
    status,
    reason: 'provider',
    token,
    pool,
    cache: 'miss',
    retryAfterMs: Number.isFinite(error?.retryAfterMs) ? error.retryAfterMs : null,
    series: null,
  };
}

/**
 * One selected-token request lane. A subsequent load aborts and invalidates
 * the previous one, so a late response can never be handed to a new sign.
 */
export function createSelectedTokenHistoryClient({
  fetchHourly = fetchHourlyOhlcvWindow,
  now = () => Date.now(),
  getConnection = defaultConnection,
  storage,
  budget,
  coolOff,
  cacheTtlMs = SELECTED_TOKEN_CACHE_TTL_MS,
} = {}) {
  const sharedStorage = storage === undefined ? defaultStorage() : storage;
  const rateBudget = budget ?? createRateBudget({ storage: sharedStorage, now });
  const providerCoolOff = coolOff ?? createCoolOff({ storage: sharedStorage, now });
  const cache = new Map();
  let active = null;
  let revision = 0;

  function cancel() {
    revision += 1;
    active?.controller.abort();
    active?.detach?.();
    active = null;
  }

  function clearCache(token = null) {
    if (token === null) cache.clear();
    else cache.delete(String(token));
  }

  async function load({
    token,
    pool,
    label = token,
    archiveObservations = [],
    signal,
  } = {}) {
    if (typeof token !== 'string' || !token.trim()) throw new TypeError('token is required');
    if (typeof pool !== 'string' || !pool.trim()) throw new TypeError('pool is required');
    cancel();
    const requestRevision = ++revision;
    const controller = new AbortController();
    const relayAbort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener('abort', relayAbort, { once: true });
    const request = {
      controller,
      detach: () => signal?.removeEventListener('abort', relayAbort),
    };
    active = request;

    const assertCurrent = () => {
      if (controller.signal.aborted || requestRevision !== revision || active !== request) {
        throw abortError();
      }
    };

    try {
      assertCurrent();
      const skipReason = selectedTokenNetworkSkipReason(getConnection?.());
      let live;

      if (skipReason) {
        live = {
          status: 'skipped', reason: skipReason, token, pool,
          cache: 'miss', retryAfterMs: null, series: null,
        };
      } else {
        const clock = Number(now());
        const cached = cache.get(token);
        if (cached && cached.pool === pool && cached.expiresAt > clock) {
          live = { ...cached.live, cache: 'hit' };
        } else {
          if (cached) cache.delete(token);
          if (providerCoolOff.active()) {
            live = {
              status: 'rate_limited', reason: 'cool_off', token, pool,
              cache: 'miss', retryAfterMs: providerCoolOff.remainingMs(), series: null,
            };
          } else if (!rateBudget.take()) {
            live = {
              status: 'rate_limited', reason: 'budget', token, pool,
              cache: 'miss', retryAfterMs: null, series: null,
            };
          } else {
            const closedBeforeTimestamp = Math.floor(clock / HOUR_MS) * (HOUR_MS / 1000);
            const coolOffToken = providerCoolOff.token();
            try {
              const candles = await fetchHourly({
                token,
                pool,
                beforeTimestamp: closedBeforeTimestamp,
                limit: SELECTED_TOKEN_LIVE_HOURS,
                signal: controller.signal,
              });
              assertCurrent();
              providerCoolOff.ok(coolOffToken);
              const series = normalizeClosedHourlyPrices(candles, { nowMs: clock, pool });
              live = {
                status: series.points.length ? 'ready' : 'empty',
                reason: null,
                token,
                pool,
                cache: 'miss',
                retryAfterMs: null,
                fetchedAt: new Date(clock).toISOString(),
                series,
              };
              const completedAt = Number(now());
              cache.set(token, {
                pool,
                expiresAt: completedAt + cacheTtlMs,
                live,
              });
            } catch (error) {
              if (controller.signal.aborted || error?.name === 'AbortError') throw error;
              if (error?.code === 'rate_limited') providerCoolOff.fail(error.retryAfterMs);
              assertCurrent();
              live = providerFailure(error, token, pool);
            }
          }
        }
      }

      assertCurrent();
      return {
        live,
        model: buildSelectedTokenChartModel({
          token, label, pool, live, archiveObservations,
        }),
      };
    } finally {
      request.detach();
      if (active === request) active = null;
    }
  }

  return {
    load,
    cancel,
    clearCache,
    destroy() {
      cancel();
      cache.clear();
    },
  };
}
