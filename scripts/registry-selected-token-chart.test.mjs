import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

import {
  ExchangeDataError,
  fetchHourlyOhlcvWindow,
  hourlyOhlcvWindowUrl,
} from '../src/exchange/gecko.mjs';
import {
  SELECTED_TOKEN_CACHE_TTL_MS,
  buildSelectedTokenChartModel,
  createSelectedTokenHistoryClient,
  normalizeClosedHourlyPrices,
  selectedTokenNetworkSkipReason,
} from '../src/registry/selected-token-chart.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NOW_MS = Date.parse('2026-08-10T12:34:00.000Z');
const LEO_MINT = 'LeoCanonicalMint111111111111111111111111111';
const PISCES_MINT = 'PiscesCanonicalMint111111111111111111111111';
const LEO_POOL = 'LeoPool111111111111111111111111111111111111';
const PISCES_POOL = 'PiscesPool11111111111111111111111111111111';

function candle(at, close = 1) {
  const ts = Date.parse(at) / 1000;
  return { ts, o: close, h: close, l: close, c: close, v: 1 };
}

function hourlyCandles(count = 8, { gapAfter = null, startHour = 1 } = {}) {
  const rows = [];
  let hour = startHour;
  for (let index = 0; index < count; index += 1) {
    rows.push(candle(`2026-08-10T${String(hour).padStart(2, '0')}:00:00.000Z`, 1 + index / 100));
    hour += gapAfter === index ? 2 : 1;
  }
  return rows;
}

function archive(count, { skipIndex = null } = {}) {
  const rows = [];
  let day = 1;
  for (let index = 0; index < count; index += 1) {
    if (skipIndex === index) day += 1;
    const date = `2026-08-${String(day).padStart(2, '0')}`;
    rows.push({
      date,
      observedAt: `${date}T12:00:00.000Z`,
      priceUsd: 0.00001 * (index + 1),
      deepestPool: { pairAddress: LEO_POOL },
    });
    day += 1;
  }
  return rows;
}

function coolOffStub(overrides = {}) {
  return {
    active: vi.fn(() => false),
    remainingMs: vi.fn(() => 0),
    token: vi.fn(() => 0),
    fail: vi.fn(),
    ok: vi.fn(() => true),
    ...overrides,
  };
}

function abortException() {
  return Object.assign(new Error('aborted'), { name: 'AbortError' });
}

describe('the narrow GeckoTerminal request', () => {
  it('pins one selected token and pool to 24 non-filled closed hourly results', () => {
    const beforeTimestamp = Math.floor(NOW_MS / 3_600_000) * 3600;
    const url = new URL(hourlyOhlcvWindowUrl({
      pool: LEO_POOL,
      token: LEO_MINT,
      beforeTimestamp,
    }));
    expect(url.pathname).toBe(`/api/v2/networks/solana/pools/${LEO_POOL}/ohlcv/hour`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      aggregate: '1',
      before_timestamp: String(beforeTimestamp),
      limit: '24',
      currency: 'usd',
      token: LEO_MINT,
      include_empty_intervals: 'false',
    });
    expect(url.toString()).not.toContain(PISCES_MINT);
    expect(url.toString()).not.toContain(PISCES_POOL);
  });

  it('reuses the shared provider parser and error taxonomy', async () => {
    let requestedUrl = '';
    const fetchImpl = vi.fn(async (url) => {
      requestedUrl = String(url);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: { attributes: { ohlcv_list: [[1786348800, 1, 2, 0.5, 1.5, 3]] } },
        }),
      };
    });
    const candles = await fetchHourlyOhlcvWindow({
      pool: LEO_POOL,
      token: LEO_MINT,
      beforeTimestamp: 1786352400,
      fetchImpl,
    });
    expect(candles).toEqual([{ ts: 1786348800, o: 1, h: 2, l: 0.5, c: 1.5, v: 3 }]);
    expect(requestedUrl).toContain(encodeURIComponent(LEO_MINT));

    const limited = async () => ({
      ok: false,
      status: 429,
      headers: { get: () => '30' },
      json: async () => ({}),
    });
    await expect(fetchHourlyOhlcvWindow({
      pool: LEO_POOL,
      token: LEO_MINT,
      beforeTimestamp: 1786352400,
      fetchImpl: limited,
    })).rejects.toMatchObject({ code: 'rate_limited', retryAfterMs: 30_000 });
  });
});

describe('closed-hour normalization and honest sparse models', () => {
  it('keeps real hourly positions, drops open/old/misaligned rows, and preserves holes', () => {
    const series = normalizeClosedHourlyPrices([
      candle('2026-08-09T11:00:00.000Z', 0.8), // outside the 24 closed hours
      candle('2026-08-09T12:00:00.000Z', 1),
      candle('2026-08-09T13:30:00.000Z', 99), // not an hourly boundary
      candle('2026-08-09T14:00:00.000Z', 1.2), // 13:00 remains a real gap
      candle('2026-08-10T12:00:00.000Z', 9), // current open hour
    ], { nowMs: NOW_MS, pool: LEO_POOL });
    expect(series.windowStartMs).toBe(Date.parse('2026-08-09T12:00:00.000Z'));
    expect(series.windowEndMs).toBe(Date.parse('2026-08-10T12:00:00.000Z'));
    expect(series.points.map((point) => point.at)).toEqual([
      '2026-08-09T12:00:00.000Z',
      '2026-08-09T14:00:00.000Z',
    ]);
  });

  it.each([
    [0, 'empty'],
    [1, 'single'],
    [2, 'comparison'],
    [7, 'comparison'],
  ])('uses the archive fallback without a line for %i priced observations', (count, mode) => {
    const model = buildSelectedTokenChartModel({
      token: LEO_MINT,
      label: 'Leo',
      pool: LEO_POOL,
      live: { status: 'unavailable', reason: 'provider' },
      archiveObservations: archive(count),
    });
    expect(model.source).toBe('registry-daily-archive');
    expect(model.mode).toBe(mode);
    expect(model.segments).toEqual([]);
    if (count > 1) expect(model.ariaLabel).toMatch(/trend line is withheld until 8/i);
  });

  it('creates a line only at eight points and keeps a missing archive day disconnected', () => {
    const model = buildSelectedTokenChartModel({
      token: LEO_MINT,
      label: 'Leo',
      pool: LEO_POOL,
      live: { status: 'network', reason: 'provider' },
      archiveObservations: archive(8, { skipIndex: 3 }),
    });
    expect(model.mode).toBe('line');
    expect(model.segments.map((segment) => segment.length)).toEqual([3, 5]);
    expect(model.coverage).toMatchObject({
      observedPointCount: 8,
      expectedPointCount: 9,
      missingPointCount: 1,
      missingRuns: 1,
    });
    expect(model.ariaLabel).toMatch(/1 expected interval is missing and remains unconnected/i);
  });

  it('keeps live time spacing and exposes useful accessible metadata', () => {
    const series = normalizeClosedHourlyPrices(hourlyCandles(8, { gapAfter: 2 }), {
      nowMs: NOW_MS,
      pool: LEO_POOL,
    });
    const model = buildSelectedTokenChartModel({
      token: LEO_MINT,
      label: 'Leo',
      pool: LEO_POOL,
      live: { status: 'ready', series },
      archiveObservations: archive(8),
    });
    expect(model.source).toBe('geckoterminal-hourly');
    expect(model.mode).toBe('line');
    expect(model.segments.map((segment) => segment.length)).toEqual([3, 5]);
    expect(model.points[3].timestampMs - model.points[2].timestampMs).toBe(2 * 3_600_000);
    expect(model.caption).toBe('8 of 24 closed hourly observations · GeckoTerminal');
    expect(model.ariaLabel).toMatch(/Leo closed hourly history has 8 observations/i);
    expect(model.ariaLabel).toMatch(/expected intervals are missing and remain unconnected/i);
    expect(model.sourceAttributionUrl).toBe('https://www.geckoterminal.com/');
  });

  it('exposes only contiguous observed runs for drawing and never bridges a missing hour', () => {
    const series = normalizeClosedHourlyPrices(hourlyCandles(8, { gapAfter: 2 }), {
      nowMs: NOW_MS,
      pool: LEO_POOL,
    });
    const model = buildSelectedTokenChartModel({
      token: LEO_MINT,
      label: 'Leo',
      pool: LEO_POOL,
      live: { status: 'ready', series },
    });
    const drawnPoints = model.segments.flat();
    const drawnIntervals = model.segments.flatMap((segment) => (
      segment.slice(1).map((point, index) => point.slotMs - segment[index].slotMs)
    ));

    expect(drawnPoints).toEqual(model.points);
    expect(drawnIntervals).toEqual(Array(6).fill(3_600_000));
    expect(model.segments[0].at(-1).slotMs).toBe(Date.parse('2026-08-10T03:00:00.000Z'));
    expect(model.segments[1][0].slotMs).toBe(Date.parse('2026-08-10T05:00:00.000Z'));
  });

  it('breaks a mature series when the selected pricing pool changes', () => {
    const rows = archive(8);
    rows[4].deepestPool.pairAddress = PISCES_POOL;
    rows[5].deepestPool.pairAddress = PISCES_POOL;
    rows[6].deepestPool.pairAddress = PISCES_POOL;
    rows[7].deepestPool.pairAddress = PISCES_POOL;
    const model = buildSelectedTokenChartModel({
      token: LEO_MINT,
      label: 'Leo',
      live: { status: 'unavailable' },
      archiveObservations: rows,
    });
    expect(model.segments.map((segment) => segment.length)).toEqual([4, 4]);
    expect(model.coverage.sourceChanges).toBe(1);
    expect(model.ariaLabel).toMatch(/pricing pool changed 1 time/i);
  });
});

describe('selected-only runtime, cache, and connection policy', () => {
  it('recognizes save-data and both 2g connection names', () => {
    expect(selectedTokenNetworkSkipReason({ saveData: true, effectiveType: '4g' })).toBe('save_data');
    expect(selectedTokenNetworkSkipReason({ saveData: false, effectiveType: '2g' })).toBe('constrained_connection');
    expect(selectedTokenNetworkSkipReason({ saveData: false, effectiveType: 'slow-2g' })).toBe('constrained_connection');
    expect(selectedTokenNetworkSkipReason({ saveData: false, effectiveType: '3g' })).toBeNull();
  });

  it.each([
    [{ saveData: true, effectiveType: '4g' }, 'save_data'],
    [{ saveData: false, effectiveType: 'slow-2g' }, 'constrained_connection'],
  ])('skips GeckoTerminal but retains the archive model on %o', async (connection, reason) => {
    const fetchHourly = vi.fn();
    const budget = { take: vi.fn(() => true) };
    const client = createSelectedTokenHistoryClient({
      fetchHourly,
      now: () => NOW_MS,
      getConnection: () => connection,
      budget,
      coolOff: coolOffStub(),
    });
    const result = await client.load({
      token: LEO_MINT,
      pool: LEO_POOL,
      label: 'Leo',
      archiveObservations: archive(2),
    });
    expect(result.live).toMatchObject({ status: 'skipped', reason });
    expect(result.model).toMatchObject({ source: 'registry-daily-archive', mode: 'comparison' });
    expect(fetchHourly).not.toHaveBeenCalled();
    expect(budget.take).not.toHaveBeenCalled();
  });

  it('requests only the selected token, caches it for five minutes, and never prefetches the rest', async () => {
    let clock = NOW_MS;
    const fetchHourly = vi.fn(async () => hourlyCandles(8));
    const client = createSelectedTokenHistoryClient({
      fetchHourly,
      now: () => clock,
      getConnection: () => ({ saveData: false, effectiveType: '4g' }),
      budget: { take: vi.fn(() => true) },
      coolOff: coolOffStub(),
    });

    const first = await client.load({ token: LEO_MINT, pool: LEO_POOL, label: 'Leo' });
    expect(first.live.cache).toBe('miss');
    expect(fetchHourly).toHaveBeenCalledTimes(1);
    expect(fetchHourly.mock.calls[0][0]).toMatchObject({
      token: LEO_MINT,
      pool: LEO_POOL,
      beforeTimestamp: Math.floor(NOW_MS / 3_600_000) * 3600,
      limit: 24,
    });

    clock += SELECTED_TOKEN_CACHE_TTL_MS - 1;
    const cached = await client.load({ token: LEO_MINT, pool: LEO_POOL, label: 'Leo' });
    expect(cached.live.cache).toBe('hit');
    expect(fetchHourly).toHaveBeenCalledTimes(1);

    await client.load({ token: PISCES_MINT, pool: PISCES_POOL, label: 'Pisces' });
    expect(fetchHourly).toHaveBeenCalledTimes(2);
    expect(fetchHourly.mock.calls.map(([request]) => request.token)).toEqual([LEO_MINT, PISCES_MINT]);

    clock += 2;
    await client.load({ token: LEO_MINT, pool: LEO_POOL, label: 'Leo' });
    expect(fetchHourly).toHaveBeenCalledTimes(3);
  });

  it('invalidates a cached token if its selected pool changes', async () => {
    const fetchHourly = vi.fn(async () => hourlyCandles(8));
    const client = createSelectedTokenHistoryClient({
      fetchHourly,
      now: () => NOW_MS,
      getConnection: () => null,
      budget: { take: () => true },
      coolOff: coolOffStub(),
    });
    await client.load({ token: LEO_MINT, pool: LEO_POOL });
    await client.load({ token: LEO_MINT, pool: PISCES_POOL });
    expect(fetchHourly).toHaveBeenCalledTimes(2);
  });
});

describe('rate, provider, and cancellation behavior', () => {
  it('uses archive fallback without calling the provider when the shared budget is spent', async () => {
    const fetchHourly = vi.fn();
    const client = createSelectedTokenHistoryClient({
      fetchHourly,
      now: () => NOW_MS,
      getConnection: () => null,
      budget: { take: vi.fn(() => false) },
      coolOff: coolOffStub(),
    });
    const result = await client.load({
      token: LEO_MINT,
      pool: LEO_POOL,
      archiveObservations: archive(2),
    });
    expect(result.live).toMatchObject({ status: 'rate_limited', reason: 'budget' });
    expect(result.model.mode).toBe('comparison');
    expect(fetchHourly).not.toHaveBeenCalled();
  });

  it('honours a shared provider cool-off before spending budget', async () => {
    const budget = { take: vi.fn(() => true) };
    const client = createSelectedTokenHistoryClient({
      fetchHourly: vi.fn(),
      now: () => NOW_MS,
      getConnection: () => null,
      budget,
      coolOff: coolOffStub({
        active: vi.fn(() => true),
        remainingMs: vi.fn(() => 12_000),
      }),
    });
    const result = await client.load({ token: LEO_MINT, pool: LEO_POOL });
    expect(result.live).toMatchObject({
      status: 'rate_limited', reason: 'cool_off', retryAfterMs: 12_000,
    });
    expect(budget.take).not.toHaveBeenCalled();
  });

  it.each([
    ['not_indexed', 'not_indexed'],
    ['network', 'network'],
    ['unavailable', 'unavailable'],
  ])('normalizes a provider %s failure and retains archive fallback', async (code, status) => {
    const client = createSelectedTokenHistoryClient({
      fetchHourly: async () => { throw new ExchangeDataError(code, code); },
      now: () => NOW_MS,
      getConnection: () => null,
      budget: { take: () => true },
      coolOff: coolOffStub(),
    });
    const result = await client.load({
      token: LEO_MINT,
      pool: LEO_POOL,
      archiveObservations: archive(1),
    });
    expect(result.live.status).toBe(status);
    expect(result.model.mode).toBe('single');
  });

  it('opens shared cool-off on provider 429 and carries Retry-After', async () => {
    const coolOff = coolOffStub();
    const client = createSelectedTokenHistoryClient({
      fetchHourly: async () => {
        throw new ExchangeDataError('rate_limited', 'later', { retryAfterMs: 45_000 });
      },
      now: () => NOW_MS,
      getConnection: () => null,
      budget: { take: () => true },
      coolOff,
    });
    const result = await client.load({ token: LEO_MINT, pool: LEO_POOL });
    expect(result.live).toMatchObject({ status: 'rate_limited', retryAfterMs: 45_000 });
    expect(coolOff.fail).toHaveBeenCalledWith(45_000);
  });

  it('aborts and rejects a stale answer when selection changes', async () => {
    let resolveLeo;
    let leoSignal;
    const fetchHourly = vi.fn(({ token, signal }) => {
      if (token === LEO_MINT) {
        leoSignal = signal;
        return new Promise((resolve) => { resolveLeo = resolve; });
      }
      return Promise.resolve(hourlyCandles(8));
    });
    const client = createSelectedTokenHistoryClient({
      fetchHourly,
      now: () => NOW_MS,
      getConnection: () => null,
      budget: { take: () => true },
      coolOff: coolOffStub(),
    });
    const leo = client.load({ token: LEO_MINT, pool: LEO_POOL });
    const leoRejected = expect(leo).rejects.toMatchObject({ name: 'AbortError' });
    await Promise.resolve();
    const pisces = client.load({ token: PISCES_MINT, pool: PISCES_POOL });
    expect(leoSignal.aborted).toBe(true);
    resolveLeo(hourlyCandles(8)); // even a dependency that ignores abort stays stale
    await expect(pisces).resolves.toMatchObject({ model: { token: PISCES_MINT } });
    await leoRejected;
  });

  it('passes an external AbortSignal through without turning it into provider failure', async () => {
    const fetchHourly = ({ signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(abortException()), { once: true });
    });
    const client = createSelectedTokenHistoryClient({
      fetchHourly,
      now: () => NOW_MS,
      getConnection: () => null,
      budget: { take: () => true },
      coolOff: coolOffStub(),
    });
    const controller = new AbortController();
    const request = client.load({ token: LEO_MINT, pool: LEO_POOL, signal: controller.signal });
    const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejected;
  });
});

describe('the lazy browser asset', () => {
  it('stays a small ESM lane without the Exchange terminal or trade runtime', async () => {
    const [source, bundle, workflow, delivery] = await Promise.all([
      readFile(resolve(root, 'src/registry/selected-token-chart.mjs'), 'utf8'),
      readFile(resolve(root, 'public/assets/registry-token-chart.js'), 'utf8'),
      readFile(resolve(root, '.github/workflows/site-check.yml'), 'utf8'),
      readFile(resolve(root, 'vercel.json'), 'utf8').then(JSON.parse),
    ]);
    expect(source).toContain("from '../exchange/gecko.mjs'");
    expect(source).not.toMatch(/from ['"]\.\.\/exchange\/(?:terminal|chart|tape|depth|browser)\.mjs/iu);
    expect(source).not.toMatch(/from ['"]\.\.\/trade\//iu);
    expect(Buffer.byteLength(bundle)).toBeLessThan(20_000);
    expect(bundle).not.toMatch(/Recent trades|Jupiter|createTerminal/iu);
    expect(bundle).toMatch(/export\{/u);
    expect(workflow).toContain('node scripts/build-registry-token-chart.mjs');
    const rule = delivery.headers.find(({ source: path }) => path === '/assets/registry-token-chart.js');
    expect(rule?.headers).toContainEqual({
      key: 'Cache-Control',
      value: 'public, max-age=0, must-revalidate',
    });
  });
});
