/**
 * The Exchange terminal: one selected sign at a time, its chart, its tape,
 * its depth ladder, and the same trade panel the catalogue pages carry.
 *
 * The division of labour is the ratified one. Identity comes from the live
 * registry answer — no mint is baked into this bundle or the page. Prices
 * and history come from indexes (Dex Screener, GeckoTerminal), read-only and
 * keyless. Executable quotes and the trade itself belong to Jupiter, the
 * independent venue, through the existing trade bundle; the ladder's quotes
 * are taker-less, because an address leaves the browser only on an explicit
 * trade action, never to show a price.
 */

import { EXCHANGE_SIGNS } from './signs.mjs';
import { resolvePool } from './pools.mjs';
import {
  GECKO_SITE_URL,
  TIMEFRAMES,
  createRateBudget,
  fetchOhlcv,
  fetchTrades,
} from './gecko.mjs';
import { fetchBatchStats } from './stats.mjs';
import { LADDER_NOTIONALS, fetchLadder } from './depth.mjs';
import { createChart } from './chart.mjs';
import { createTape } from './tape.mjs';
import { formatPrice, formatUsd } from './chart-model.mjs';

const REGISTRY_URL = '/registry/zodiacs.registry.json';
const REGISTRY_DEADLINE = 12_000;
const STATS_EVERY_MS = 60_000;
const CHART_EVERY_MS = 60_000;
const TAPE_EVERY_MS = 20_000;
const LADDER_COOLDOWN_MS = 30_000;

/**
 * The one sentence the ladder is not allowed to lose. Pinned by test in this
 * source and in the built bundle.
 */
export const LADDER_CAPTION = 'These pools have no order book. Each rung is Jupiter’s own executable quote '
  + 'for that size — the price you would actually get, venue fee and price impact included.';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function stateNode(message) {
  return el('p', 'zme__state', message);
}

function fetchWithin(url, deadline) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deadline);
  return fetch(url, { cache: 'no-store', signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

/**
 * The registry is the one answer to what a sign's mint is. No verified
 * record, no panel and no ladder — the chart and tape stay index-only.
 */
async function readRegistry() {
  const response = await fetchWithin(REGISTRY_URL, REGISTRY_DEADLINE);
  if (!response.ok) throw new Error(`registry ${response.status}`);
  const payload = await response.json();
  const records = new Map();
  for (const asset of payload?.assets ?? []) {
    const native = asset?.native;
    if (native?.chain !== 'solana' || !native?.address) continue;
    records.set(asset.sign, { mint: native.address, symbol: native.symbol ?? '' });
  }
  if (records.size !== EXCHANGE_SIGNS.length) throw new Error('registry: incomplete');
  return records;
}

/** The trade panel's runtime, fetched at most once and only when wanted. */
let tradeBundleReady = null;
function loadTradeBundle() {
  if (tradeBundleReady) return tradeBundleReady;
  tradeBundleReady = new Promise((resolve) => {
    if (window.zodiacsTrade) { resolve(window.zodiacsTrade); return; }
    const script = document.createElement('script');
    script.src = '/assets/trade.js';
    script.defer = true;
    script.addEventListener('load', () => resolve(window.zodiacsTrade ?? null), { once: true });
    script.addEventListener('error', () => resolve(null), { once: true });
    document.body.appendChild(script);
  });
  return tradeBundleReady;
}

export function createTerminal({ host }) {
  const budget = createRateBudget();

  // ── skeleton ────────────────────────────────────────────────────────────
  const grid = el('div', 'zme__grid');

  const rail = el('section', 'zme__card zme__rail');
  rail.setAttribute('aria-label', 'The twelve records');
  const railList = el('ul', 'zme__rail-list');
  rail.append(railList);

  const center = el('div', 'zme__center');
  center.style.minWidth = '0';
  center.style.display = 'flex';
  center.style.flexDirection = 'column';
  center.style.gap = '14px';

  const chartCard = el('section', 'zme__card');
  const chartHead = el('div', 'zme__card-head');
  const chartTitle = el('h2', 'zme__card-title', '—');
  const frames = el('div', 'zme__frames');
  frames.setAttribute('role', 'group');
  frames.setAttribute('aria-label', 'Chart timeframe');
  chartHead.append(chartTitle, frames);
  const readout = el('p', 'zme__readout');
  const canvasBox = el('div', 'zme__canvas-box');
  const canvas = el('canvas', 'zme__canvas');
  canvasBox.append(canvas);
  const chartState = stateNode('');
  chartState.hidden = true;
  const chartFoot = el('div', 'zme__chart-foot');
  const chartNote = el('span', null, 'Independent third-party data, not a valuation or recommendation.');
  const attribution = el('a', null, 'Chart data by GeckoTerminal');
  attribution.href = GECKO_SITE_URL;
  attribution.target = '_blank';
  attribution.rel = 'noopener noreferrer external nofollow';
  chartFoot.append(chartNote, attribution);
  chartCard.append(chartHead, readout, canvasBox, chartState, chartFoot);

  const tapeCard = el('section', 'zme__card');
  const tapeHead = el('div', 'zme__card-head');
  tapeHead.append(
    el('h2', 'zme__card-title', 'Recent trades'),
    el('span', 'zme__card-note', 'pool trades · newest first'),
  );
  const tapeScroll = el('div', 'zme-tape__scroll');
  const tapeState = stateNode('');
  tapeState.hidden = true;
  tapeCard.append(tapeHead, tapeScroll, tapeState);

  center.append(chartCard, tapeCard);

  const desk = el('div', 'zme__desk');
  const panelCard = el('section', 'zme__card');
  const panelHost = el('div', 'zme__panel-host');
  panelCard.append(panelHost);

  const ladderCard = el('section', 'zme__card');
  const ladderHead = el('div', 'zme__card-head');
  const ladderTitle = el('h2', 'zme__card-title', 'Depth');
  const ladderRefresh = el('button', 'zme__ladder-refresh', 'Refresh');
  ladderRefresh.type = 'button';
  ladderHead.append(ladderTitle, ladderRefresh);
  const ladderNote = el('span', 'zme__card-note', 'modelled from venue quotes');
  const ladderTable = el('table', 'zme__ladder-table');
  const ladderTableHead = el('thead');
  const ladderHeadRow = el('tr');
  const sideTh = el('th', 'zme__ladder-side', 'Side');
  for (const label of [null, 'Size', 'Price', 'vs best']) {
    ladderHeadRow.append(label === null ? sideTh : el('th', null, label));
  }
  ladderTableHead.append(ladderHeadRow);
  const ladderBody = el('tbody');
  ladderTable.append(ladderTableHead, ladderBody);
  const ladderState = stateNode('');
  ladderState.hidden = true;
  const ladderCaption = el('p', 'zme__ladder-caption', LADDER_CAPTION);
  ladderCard.append(ladderHead, ladderNote, ladderTable, ladderState, ladderCaption);

  const statsCard = el('section', 'zme__card');
  const statsHead = el('div', 'zme__card-head');
  statsHead.append(
    el('h2', 'zme__card-title', 'Market'),
    el('span', 'zme__card-note', 'Dex Screener · indexed'),
  );
  const statsGrid = el('div', 'zme__stats');
  const stat = (label) => {
    const box = el('div', 'zme__stat');
    const value = el('span', 'zme__stat-value', '—');
    box.append(el('span', 'zme__stat-label', label), value);
    statsGrid.append(box);
    return value;
  };
  const statPrice = stat('Price');
  const statChange = stat('24h');
  const statLiquidity = stat('Indexed liquidity');
  statsCard.append(statsHead, statsGrid);

  desk.append(panelCard, ladderCard, statsCard);
  grid.append(rail, center, desk);
  host.append(grid);

  // ── state ───────────────────────────────────────────────────────────────
  let records = null;           // Map slug → { mint, symbol }
  let batchRows = [];
  let stats = {};
  let selected = null;
  let timeframe = '1h';
  let selectionAbort = null;
  let panel = null;
  let chartTimer = null;
  let tapeTimer = null;
  let statsTimer = null;
  let ladderBusyUntil = 0;
  let destroyed = false;

  const chart = createChart({ canvas, readout });
  const tape = createTape({ host: tapeScroll });

  const railRows = new Map();
  for (const sign of EXCHANGE_SIGNS) {
    const item = el('li');
    const button = el('button', 'zme__rail-item');
    button.type = 'button';
    button.style.setProperty('--sign', sign.hue);
    button.setAttribute('aria-pressed', 'false');
    const picture = document.createElement('picture');
    const source = document.createElement('source');
    source.srcset = `/assets/zodiac-icons/128/${sign.slug}.avif`;
    source.type = 'image/avif';
    const img = document.createElement('img');
    img.className = 'zme__rail-disc';
    img.src = `/assets/zodiac-icons/128/${sign.slug}.webp`;
    img.width = 30;
    img.height = 30;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    picture.append(source, img);
    const name = el('span', 'zme__rail-name', sign.name);
    const quote = el('span', 'zme__rail-quote');
    const price = el('span', 'zme__rail-price', '—');
    const change = el('span', 'zme__rail-change', '');
    quote.append(price, change);
    button.append(picture, name, quote);
    button.addEventListener('click', () => select(sign.slug));
    item.append(button);
    railList.append(item);
    railRows.set(sign.slug, { button, price, change });
  }

  const frameButtons = new Map();
  for (const key of Object.keys(TIMEFRAMES)) {
    const button = el('button', 'zme__frame', key);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(key === timeframe));
    button.addEventListener('click', () => {
      if (key === timeframe) return;
      timeframe = key;
      for (const [frameKey, frameButton] of frameButtons) {
        frameButton.setAttribute('aria-pressed', String(frameKey === timeframe));
      }
      restartChart();
    });
    frames.append(button);
    frameButtons.set(key, button);
  }

  // ── helpers ─────────────────────────────────────────────────────────────
  const signFor = (slug) => EXCHANGE_SIGNS.find((sign) => sign.slug === slug) ?? null;
  const recordFor = (slug) => records?.get(slug) ?? null;
  const statsFor = (slug) => {
    const record = recordFor(slug);
    return record ? stats[record.mint] ?? null : null;
  };

  function showState(node, message) {
    node.textContent = message;
    node.hidden = !message;
  }

  function fillRail() {
    for (const sign of EXCHANGE_SIGNS) {
      const row = railRows.get(sign.slug);
      const quote = statsFor(sign.slug);
      if (!quote?.priceUsd) {
        row.price.textContent = '—';
        row.change.textContent = '';
        continue;
      }
      row.price.textContent = formatPrice(quote.priceUsd);
      if (quote.change24hPct === null) {
        row.change.textContent = '';
      } else {
        const up = quote.change24hPct > 0;
        row.change.textContent = `${up ? '+' : ''}${quote.change24hPct.toFixed(2)}%`;
        row.change.classList.toggle('zme__rail-change--up', up);
      }
    }
  }

  function fillStats() {
    const quote = selected ? statsFor(selected) : null;
    statPrice.textContent = quote?.priceUsd ? formatPrice(quote.priceUsd) : '—';
    statChange.textContent = quote?.change24hPct === null || quote?.change24hPct === undefined
      ? '—'
      : `${quote.change24hPct > 0 ? '+' : ''}${quote.change24hPct.toFixed(2)}%`;
    statLiquidity.textContent = quote?.liquidityUsd ? formatUsd(quote.liquidityUsd) : '—';
  }

  async function refreshStats() {
    if (!records) return;
    // Its own deadline: a stalled index request must never hold anything
    // else up — the rail just keeps its last numbers.
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), 10_000);
    try {
      const mints = [...records.values()].map((record) => record.mint);
      const result = await fetchBatchStats({ mints, signal: deadline.signal });
      stats = result.stats;
      batchRows = result.rows;
      fillRail();
      fillStats();
    } catch {
      // The rail keeps its last numbers; the panel and ladder are unaffected.
    } finally {
      clearTimeout(timer);
    }
  }

  function poolForSelection() {
    const record = recordFor(selected);
    if (!record) return null;
    return resolvePool({ slug: selected, mint: record.mint, rows: batchRows });
  }

  // ── chart + tape ────────────────────────────────────────────────────────
  async function loadChart(signal) {
    const sign = signFor(selected);
    const pool = poolForSelection();
    if (!pool) {
      chart.clear();
      showState(chartState, 'No indexed pool to chart. The trade panel still quotes the venue directly.');
      return;
    }
    if (!budget.take()) return;
    try {
      const candles = await fetchOhlcv({ pool, timeframe, signal });
      if (signal.aborted) return;
      if (!candles.length) {
        chart.clear();
        showState(chartState, 'No trades in this window yet.');
        return;
      }
      showState(chartState, '');
      chart.set({ candles, timeframe, hue: sign?.hue });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      chart.clear();
      showState(chartState, error?.code === 'rate_limited'
        ? 'The chart service is rate limiting requests. It will retry shortly.'
        : 'Chart unavailable. The trade panel still quotes the venue directly.');
    }
  }

  async function loadTape(signal) {
    const record = recordFor(selected);
    const pool = poolForSelection();
    if (!record || !pool) {
      tape.clear();
      showState(tapeState, 'No indexed pool to read trades from.');
      return;
    }
    if (!budget.take()) return;
    try {
      const trades = await fetchTrades({ pool, mint: record.mint, signal });
      if (signal.aborted) return;
      if (!trades.length) {
        tape.clear();
        showState(tapeState, 'No recent trades in this pool.');
        return;
      }
      showState(tapeState, '');
      tape.set(trades, { symbol: record.symbol });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      tape.clear();
      showState(tapeState, error?.code === 'rate_limited'
        ? 'The trade feed is rate limiting requests. It will retry shortly.'
        : 'Trade feed unavailable.');
    }
  }

  function stopTimers() {
    clearInterval(chartTimer);
    clearInterval(tapeTimer);
    chartTimer = null;
    tapeTimer = null;
  }

  function startTimers() {
    stopTimers();
    if (!selectionAbort) return;
    const { signal } = selectionAbort;
    chartTimer = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      loadChart(signal);
    }, CHART_EVERY_MS);
    tapeTimer = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      loadTape(signal);
    }, TAPE_EVERY_MS);
  }

  function restartChart() {
    if (!selectionAbort) return;
    showState(chartState, '');
    loadChart(selectionAbort.signal);
  }

  // ── ladder ──────────────────────────────────────────────────────────────
  function renderLadder(sides) {
    ladderBody.replaceChildren();
    for (const { side, rungs } of sides) {
      for (const rung of rungs) {
        const row = el('tr', side === 'buy' ? 'zme__ladder-row--buy' : 'zme__ladder-row--sell');
        const cells = [
          el('td', 'zme__ladder-side', side === 'buy' ? 'Buy' : 'Sell'),
          el('td', null, `$${rung.notional}`),
        ];
        if (rung.error) {
          const message = rung.error === 'no_route' ? 'no route' : 'unavailable';
          const spanned = el('td', null, message);
          spanned.colSpan = 2;
          cells.push(spanned);
        } else {
          cells.push(
            el('td', null, formatPrice(rung.price)),
            el('td', null, rung.impactBps === null ? '—' : `${(rung.impactBps / 100).toFixed(2)}%`),
          );
        }
        row.append(...cells);
        ladderBody.append(row);
      }
    }
  }

  async function refreshLadder() {
    const record = recordFor(selected);
    if (!record || !selectionAbort) return;
    const now = Date.now();
    if (now < ladderBusyUntil) return;
    ladderBusyUntil = now + LADDER_COOLDOWN_MS;
    ladderRefresh.disabled = true;
    const { signal } = selectionAbort;
    showState(ladderState, '');
    try {
      const quote = statsFor(selected);
      const buys = await fetchLadder({ mint: record.mint, side: 'buy', signal });
      const sells = quote?.priceUsd
        ? await fetchLadder({
          mint: record.mint, side: 'sell', midPriceUsd: quote.priceUsd, signal,
        })
        : { side: 'sell', rungs: LADDER_NOTIONALS.map((notional) => ({ notional, error: 'unavailable' })) };
      if (signal.aborted) return;
      renderLadder([buys, sells]);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        ladderBody.replaceChildren();
        showState(ladderState, 'Venue quotes unavailable just now.');
      }
    } finally {
      setTimeout(() => {
        if (!destroyed) ladderRefresh.disabled = false;
      }, Math.max(0, ladderBusyUntil - Date.now()));
    }
  }
  ladderRefresh.addEventListener('click', () => refreshLadder());

  // ── the trade panel ─────────────────────────────────────────────────────
  function mountPanel() {
    const sign = signFor(selected);
    const record = recordFor(selected);
    panel?.destroy?.();
    panel = null;
    panelHost.replaceChildren();
    if (!sign || !record) {
      panelHost.append(stateNode('The registry could not be read, so there is nothing to trade against.'));
      return;
    }
    const mySelection = selected;
    loadTradeBundle().then((trade) => {
      if (destroyed || mySelection !== selected || !trade) {
        if (!trade && !destroyed && mySelection === selected) {
          panelHost.append(stateNode('The trade panel could not load. The record page lists the venue route directly.'));
        }
        return;
      }
      panel = trade.mount(panelHost, {
        name: sign.name,
        slug: sign.slug,
        mint: record.mint,
        hue: sign.hue,
        iconUrl: `/assets/zodiac-icons/128/${sign.slug}.webp`,
      });
    });
  }

  // ── selection ───────────────────────────────────────────────────────────
  function select(slug) {
    if (slug === selected) return;
    selected = slug;
    selectionAbort?.abort();
    selectionAbort = new AbortController();
    ladderBusyUntil = 0;
    ladderRefresh.disabled = false;
    ladderBody.replaceChildren();
    showState(ladderState, '');

    const sign = signFor(slug);
    grid.style.setProperty('--sign', sign?.hue ?? '#C6CCDA');
    for (const [rowSlug, row] of railRows) {
      row.button.setAttribute('aria-pressed', String(rowSlug === slug));
    }
    const record = recordFor(slug);
    chartTitle.textContent = record?.symbol ? `${record.symbol} / USD` : sign?.name ?? '—';

    chart.clear();
    tape.clear();
    showState(chartState, 'Reading the chart…');
    showState(tapeState, 'Reading recent trades…');
    fillStats();
    mountPanel();

    const { signal } = selectionAbort;
    loadChart(signal);
    loadTape(signal);
    startTimers();
    refreshLadder();
  }

  function onVisibility() {
    if (document.visibilityState !== 'visible' || !selectionAbort) return;
    const { signal } = selectionAbort;
    loadChart(signal);
    loadTape(signal);
    refreshStats();
  }
  document.addEventListener('visibilitychange', onVisibility);

  // ── boot ────────────────────────────────────────────────────────────────
  showState(chartState, 'Reading the registry…');
  showState(tapeState, '');
  readRegistry()
    .then((result) => {
      if (destroyed) return;
      records = result;
      // The room opens on the first record at once; the rail's quotes fill
      // in whenever the index answers. Nothing waits on the stats call.
      select('aries');
      refreshStats();
      statsTimer = setInterval(() => {
        if (document.visibilityState === 'hidden') return;
        refreshStats();
      }, STATS_EVERY_MS);
    })
    .catch(() => {
      if (destroyed) return;
      showState(chartState, 'The registry could not be read. Nothing verified, nothing shown — try again shortly.');
      panelHost.append(stateNode('The registry could not be read, so there is nothing to trade against.'));
    });

  return {
    select,
    destroy() {
      destroyed = true;
      selectionAbort?.abort();
      stopTimers();
      clearInterval(statsTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      panel?.destroy?.();
      chart.destroy();
      tape.destroy();
      grid.remove();
    },
  };
}
