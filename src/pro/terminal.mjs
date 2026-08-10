/**
 * Registry Pro's dark Phase-1 terminal.
 *
 * The browser may inspect public market data and request a sanitized quote
 * comparison from the same-origin gateway. It has no wallet adapter and no
 * prepare, sign, or submit state. That missing state is the safety boundary,
 * not an unfinished button.
 */

import { createChart } from '../exchange/chart.mjs';
import {
  createCoolOff,
  createRateBudget,
  ExchangeDataError,
  fetchOhlcv,
  fetchTrades,
} from '../exchange/gecko.mjs';
import { resolvePool } from '../exchange/pools.mjs';
import { fetchBatchStats } from '../exchange/stats.mjs';
import {
  formatAge,
  formatPrice,
  formatTokenAmount,
  formatUsd,
} from '../exchange/chart-model.mjs';
import { createReadOnlyTrollbox } from './chat/shell.mjs';
import { readRegistryMarkets } from './catalog.mjs';
import { ProQuoteError, atomicToDecimal, decimalToAtomic } from './execution/contracts.mjs';

const TIMEFRAMES = Object.freeze(['15m', '1h', '4h', '1d']);
const MARKET_DEADLINE_MS = 10_000;
const QUOTE_DEADLINE_MS = 15_000;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className, text, type = 'button') {
  const node = element('button', className, text);
  node.type = type;
  return node;
}

function withDeadline(parentSignal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const relay = () => controller.abort(parentSignal?.reason);
  if (parentSignal?.aborted) relay();
  else parentSignal?.addEventListener('abort', relay, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('Request timed out.', 'TimeoutError'));
  }, timeoutMs);
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup() {
      clearTimeout(timer);
      parentSignal?.removeEventListener('abort', relay);
    },
  };
}

function percent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`;
}

function compactPrice(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? `$${formatPrice(number)}` : '—';
}

function routeLabel(route) {
  return Array.isArray(route) && route.length ? route.join(' · ') : 'Route not disclosed';
}

function timestampLabel(value, fallback) {
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed)
    ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(parsed)
    : fallback;
}

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function quoteFailureCopy(code) {
  return ({
    rate_limited: 'Provider budget is cooling down.',
    no_route: 'No route for this exact size.',
    stale: 'The quote expired before it could be shown.',
    schema_changed: 'Provider answer failed validation.',
    network: 'Provider did not answer before the deadline.',
    unavailable: 'Provider is unavailable.',
  })[code] ?? 'Quote unavailable.';
}

function marketFailureCopy(error) {
  if (error instanceof ExchangeDataError) {
    if (error.code === 'rate_limited') return 'Provider rate limit — waiting before another read.';
    if (error.code === 'not_indexed') return 'This reference pool is not indexed.';
  }
  return 'Market data is unavailable just now.';
}

function createMarketButton(market, onSelect) {
  const control = button('rp-market');
  control.dataset.sign = market.slug;
  control.setAttribute('aria-pressed', 'false');
  const glyph = element('span', 'rp-market__glyph', market.glyph);
  glyph.setAttribute('aria-hidden', 'true');
  const label = element('span', 'rp-market__label');
  label.append(
    element('span', 'rp-market__name', market.name),
    element('span', 'rp-market__symbol', market.symbol),
  );
  const figures = element('span', 'rp-market__figures');
  figures.append(
    element('span', 'rp-market__price', 'Indexing…'),
    element('span', 'rp-market__change', '24h —'),
  );
  control.append(glyph, label, figures);
  control.style.setProperty('--sign-hue', market.hue);
  control.addEventListener('click', () => onSelect(market.slug));
  return control;
}

function createTape(host) {
  const table = element('table', 'rp-tape__table');
  const caption = element('caption', 'sr-only', 'Recent canonical-pool trades');
  const head = element('thead');
  const row = element('tr');
  for (const text of ['Age', 'Side', 'Amount', 'Price', 'Value']) row.append(element('th', null, text));
  head.append(row);
  const body = element('tbody');
  table.append(caption, head, body);
  host.append(table);
  return {
    set(trades, market, now = Date.now()) {
      body.replaceChildren(...trades.slice(0, 24).map((trade) => {
        const item = element('tr', `rp-tape__row rp-tape__row--${trade.side}`);
        item.append(
          element('td', null, formatAge(trade.ts, now)),
          element('td', 'rp-tape__side', trade.side === 'buy' ? 'Buy' : 'Sell'),
          element('td', null, `${formatTokenAmount(trade.tokenAmount)} ${market.symbol}`),
          element('td', null, `$${formatPrice(trade.priceUsd)}`),
          element('td', null, trade.volumeUsd === null ? '—' : formatUsd(trade.volumeUsd)),
        );
        return item;
      }));
    },
    clear() { body.replaceChildren(); },
  };
}

function createCandleTable(host) {
  const table = element('table', 'rp-chart-data__table');
  const head = element('thead');
  const heading = element('tr');
  for (const text of ['UTC', 'Open', 'High', 'Low', 'Close', 'Volume']) {
    heading.append(element('th', null, text));
  }
  head.append(heading);
  const body = element('tbody');
  table.append(head, body);
  host.append(table);
  return {
    set(candles) {
      body.replaceChildren(...candles.map((candle) => {
        const row = element('tr');
        row.append(
          element('td', null, new Date(candle.ts * 1000).toISOString()),
          element('td', null, formatPrice(candle.o)),
          element('td', null, formatPrice(candle.h)),
          element('td', null, formatPrice(candle.l)),
          element('td', null, formatPrice(candle.c)),
          element('td', null, formatPrice(candle.v)),
        );
        return row;
      }));
    },
    clear() { body.replaceChildren(); },
  };
}

function providerQuoteCard(result, comparison, market, side) {
  const card = element('article', 'rp-quote');
  const provider = result.provider === 'jupiter'
    ? 'Swap V2 Meta-Aggregator · Ultra mode'
    : 'Raydium';
  const heading = element('div', 'rp-quote__head');
  heading.append(element('strong', null, provider));
  if (comparison.highestQuotedOutputProvider === result.provider && result.status === 'ready') {
    heading.append(element('span', 'rp-badge', 'Highest quoted output'));
  }
  card.append(heading);
  if (result.status !== 'ready') {
    card.classList.add('is-unavailable');
    card.append(element('p', 'rp-quote__meta', quoteFailureCopy(result.error)));
    return card;
  }
  const quote = result.quote;
  const outputSymbol = side === 'buy' ? market.symbol : 'USDC';
  const minimum = quote.minimumOutput === null
    ? 'Minimum not reported'
    : `Minimum ${atomicToDecimal(quote.minimumOutput, 6)} ${outputSymbol}`;
  const fee = quote.feeBps === null
    ? 'Fee not separately reported'
    : `Reported fee ${quote.feeBps} bps`;
  const slippage = result.provider === 'jupiter'
    ? `Jupiter RTSE ${quote.slippageBps} bps`
    : `Selected Raydium guard ${quote.slippageBps} bps`;
  card.append(
    element('div', 'rp-quote__amount', `${atomicToDecimal(quote.outputAmount, 6)} ${outputSymbol}`),
    element('p', 'rp-quote__meta', [
      minimum,
      slippage,
      `Impact ${quote.priceImpactPct ?? 'not reported'}%`,
      fee,
    ].join(' · ')),
    element('p', 'rp-quote__route', routeLabel(quote.route)),
    element(
      'p',
      'rp-quote__meta',
      `Observed ${timestampLabel(quote.observedAt, 'unknown')} · ${quote.expiresAt
        ? `expires ${timestampLabel(quote.expiresAt, 'soon')}`
        : '15-second local freshness limit'}`,
    ),
  );
  return card;
}

function renderTerminalShell(host) {
  const root = element('div', 'rp');
  const topbar = element('header', 'rp__topbar');
  const topCopy = element('div');
  topCopy.append(
    element('p', 'rp__eyebrow', 'Registry Pro · Phase 1'),
    element('h2', 'rp__title', 'Quote laboratory'),
  );
  const badges = element('div', 'rp__badges');
  badges.append(
    element('span', 'rp-badge is-ready', 'Read-only'),
    element('span', 'rp-badge', 'No wallet'),
    element('span', 'rp-badge', 'No submission'),
  );
  topbar.append(topCopy, badges);

  const loading = element('p', 'rp-status is-waiting', 'Reading the twelve official Registry markets…');
  loading.setAttribute('role', 'status');
  const rail = element('div', 'rp__rail');
  rail.setAttribute('role', 'group');
  rail.setAttribute('aria-label', 'Zodiac markets');

  const workspace = element('div', 'rp__workspace');
  const marketColumn = element('div', 'rp__market-column');
  const chartPanel = element('section', 'rp-panel rp-chart');
  const chartHead = element('header', 'rp-panel__head');
  const chartTitle = element('h3', 'rp-panel__title', 'Reference-pool chart');
  const chartMeta = element('p', 'rp-panel__meta', 'Canonical pool · GeckoTerminal index');
  const titleGroup = element('div');
  titleGroup.append(chartTitle, chartMeta);
  const toolbar = element('div', 'rp-chart__toolbar');
  const timeframes = element('div', 'rp-timeframes');
  timeframes.setAttribute('role', 'group');
  timeframes.setAttribute('aria-label', 'Chart timeframe');
  const refreshMarket = button('rp-button rp-button--quiet', 'Refresh market data');
  refreshMarket.setAttribute('aria-label', 'Refresh chart and recent trades');
  toolbar.append(timeframes, refreshMarket);
  chartHead.append(titleGroup, toolbar);
  const readout = element('p', 'rp-chart__readout');
  readout.id = 'rp-chart-readout';
  const chartWrap = element('div', 'rp-chart__canvas');
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Candlestick chart');
  canvas.setAttribute('aria-describedby', 'rp-chart-readout rp-chart-state');
  canvas.textContent = 'Candlestick chart. The same values are available in the candle data table.';
  const chartState = element('p', 'rp-chart__state is-waiting', 'Waiting for a reference pool…');
  chartState.id = 'rp-chart-state';
  chartState.setAttribute('role', 'status');
  chartWrap.append(canvas, chartState);
  const candleDetails = element('details', 'rp-chart-data');
  candleDetails.append(element('summary', null, 'Candle data table'));
  const candleTableHost = element('div', 'rp-chart-data__scroll');
  candleTableHost.tabIndex = 0;
  candleTableHost.setAttribute('role', 'region');
  candleTableHost.setAttribute('aria-label', 'Candlestick values table');
  candleDetails.append(candleTableHost);
  chartPanel.append(chartHead, chartWrap, readout, candleDetails);

  const stats = element('section', 'rp-stats');
  const statNodes = new Map();
  for (const [key, label] of [['price', 'Indexed price'], ['change', '24h change'], ['liquidity', 'Indexed liquidity']]) {
    const item = element('div', 'rp-stat');
    const valueNode = element('strong', null, '—');
    item.append(element('span', null, label), valueNode);
    stats.append(item);
    statNodes.set(key, valueNode);
  }

  const tapePanel = element('section', 'rp-panel rp-tape');
  const tapeHead = element('header', 'rp-panel__head');
  const tapeTitleGroup = element('div');
  tapeTitleGroup.append(
    element('h3', 'rp-panel__title', 'Recent pool trades'),
    element('p', 'rp-panel__meta', 'Canonical pool only · not a consolidated tape'),
  );
  tapeHead.append(tapeTitleGroup);
  const tapeState = element('p', 'rp-status is-waiting', 'Waiting for a reference pool…');
  tapeState.setAttribute('role', 'status');
  const tapeHost = element('div', 'rp-tape__scroll');
  tapeHost.tabIndex = 0;
  tapeHost.setAttribute('role', 'region');
  tapeHost.setAttribute('aria-label', 'Recent canonical-pool trades table');
  tapePanel.append(tapeHead, tapeState, tapeHost);
  marketColumn.append(chartPanel, stats, tapePanel);

  const sideColumn = element('div', 'rp__side-column');
  const ticket = element('section', 'rp-panel rp-ticket');
  const ticketHead = element('header', 'rp-panel__head');
  const ticketHeading = element('div');
  ticketHeading.append(
    element('p', 'rp__eyebrow', 'Provider-neutral'),
    element('h3', 'rp-panel__title', 'Compare exact-input quotes'),
  );
  ticketHead.append(ticketHeading, element('span', 'rp-badge', 'Indicative'));
  const form = element('form', 'rp-ticket__form');
  const sides = element('div', 'rp-ticket__sides');
  sides.setAttribute('role', 'group');
  sides.setAttribute('aria-label', 'Quote side');
  const buy = button('rp-button is-selected', 'Buy');
  buy.setAttribute('aria-pressed', 'true');
  const sell = button('rp-button', 'Sell');
  sell.setAttribute('aria-pressed', 'false');
  sides.append(buy, sell);
  const amountLabel = element('label', 'rp-ticket__field');
  const amountText = element('span', null, 'You quote');
  const inputRow = element('span', 'rp-ticket__input');
  const amount = document.createElement('input');
  amount.name = 'amount';
  amount.type = 'text';
  amount.inputMode = 'decimal';
  amount.autocomplete = 'off';
  amount.value = '25';
  amount.setAttribute('aria-describedby', 'rp-quote-boundary');
  const amountUnit = element('span', null, 'USDC');
  inputRow.append(amount, amountUnit);
  amountLabel.append(amountText, inputRow);
  const slippageLabel = element('label', 'rp-ticket__field');
  slippageLabel.append(element('span', null, 'Raydium slippage guard'));
  const slippage = element('select', 'rp-ticket__select');
  slippage.name = 'slippageBps';
  slippage.setAttribute('aria-describedby', 'rp-slippage-boundary');
  for (const [value, text] of [['25', '0.25%'], ['50', '0.50%'], ['100', '1.00%']]) {
    const option = element('option', null, text);
    option.value = value;
    if (value === '50') option.selected = true;
    slippage.append(option);
  }
  slippageLabel.append(slippage);
  const slippageBoundary = element(
    'p',
    'rp-ticket__help',
    'Raydium applies this fixed guard. Jupiter sets and reports its RTSE threshold independently.',
  );
  slippageBoundary.id = 'rp-slippage-boundary';
  const submit = button('rp-ticket__button', 'Compare quotes', 'submit');
  const status = element('p', 'rp-ticket__status', 'Quotes run only when you ask. No wallet address is accepted.');
  status.id = 'rp-quote-boundary';
  status.setAttribute('role', 'status');
  const quoteHost = element('div', 'rp-ticket__quotes');
  form.append(sides, amountLabel, slippageLabel, slippageBoundary, submit, status, quoteHost);
  const attribution = element(
    'p',
    'rp-ticket__attribution',
    'Powered by Jupiter · Swap V2 Meta-Aggregator · Ultra mode',
  );
  const callout = element('div', 'rp-callout');
  callout.append(
    element('strong', null, 'Observation, not execution.'),
    element('p', null, 'Each provider answer is an expiring, quote-only snapshot. No transaction, request handle, wallet address, signature, or submission path reaches this page.'),
  );
  ticket.append(ticketHead, attribution, form, callout);

  const chatHost = element('section', 'rp-panel rp-chat');
  sideColumn.append(ticket, chatHost);
  workspace.append(marketColumn, sideColumn);
  const footnote = element('p', 'rp-footnote', 'Reference-pool charts and aggregate-provider quotes answer different questions. Thin pools can move sharply; a later execution quote may differ.');
  root.append(topbar, loading, rail, workspace, footnote);
  host.replaceChildren(root);

  return {
    root, loading, rail, workspace, chartTitle, timeframes, refreshMarket,
    readout, canvas, chartState, candleTableHost, statNodes, tapeState, tapeHost,
    form, buy, sell, amount, amountText, amountUnit, slippage, submit, status, quoteHost, chatHost,
  };
}

export function createProTerminal({
  host,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  storage = browserStorage(),
  registryReader = readRegistryMarkets,
  statsReader = fetchBatchStats,
  candleReader = fetchOhlcv,
  tradesReader = fetchTrades,
  chatFactory = createReadOnlyTrollbox,
  chatEnabled = false,
} = {}) {
  if (!host) throw new TypeError('Registry Pro requires a host.');
  const ui = renderTerminalShell(host);
  const chart = createChart({ canvas: ui.canvas, readout: ui.readout });
  const candleTable = createCandleTable(ui.candleTableHost);
  const tape = createTape(ui.tapeHost);
  ui.chatHost.hidden = !chatEnabled;
  const chat = chatEnabled ? chatFactory({ host: ui.chatHost }) : null;
  const budget = createRateBudget({ storage, now });
  const coolOff = createCoolOff({ storage, now });
  let markets = new Map();
  let stats = {};
  let providerRows = [];
  let selected = 'aries';
  let side = 'buy';
  let timeframe = '1h';
  let chartGeneration = 0;
  let tapeGeneration = 0;
  let quoteGeneration = 0;
  let chartAbort = null;
  let tapeAbort = null;
  let quoteAbort = null;
  let quoteExpiryTimer = null;
  let destroyed = false;

  function currentMarket() { return markets.get(selected); }

  function updateSelectedControls() {
    for (const control of ui.rail.querySelectorAll('.rp-market')) {
      const active = control.dataset.sign === selected;
      control.classList.toggle('is-selected', active);
      control.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    for (const control of ui.timeframes.querySelectorAll('.rp-timeframe')) {
      const active = control.dataset.timeframe === timeframe;
      control.classList.toggle('is-selected', active);
      control.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  function updateMarketStats() {
    const market = currentMarket();
    const value = market ? stats[market.mint] : null;
    ui.statNodes.get('price').textContent = compactPrice(value?.priceUsd);
    ui.statNodes.get('change').textContent = percent(value?.change24hPct);
    ui.statNodes.get('liquidity').textContent = Number.isFinite(value?.liquidityUsd)
      ? formatUsd(value.liquidityUsd)
      : '—';
  }

  function updateRailStats() {
    for (const control of ui.rail.querySelectorAll('.rp-market')) {
      const market = markets.get(control.dataset.sign);
      const value = market ? stats[market.mint] : null;
      control.querySelector('.rp-market__price').textContent = compactPrice(value?.priceUsd);
      control.querySelector('.rp-market__change').textContent = `24h ${percent(value?.change24hPct)}`;
    }
    updateMarketStats();
  }

  function renderTimeframes() {
    ui.timeframes.replaceChildren(...TIMEFRAMES.map((value) => {
      const control = button('rp-timeframe', value);
      control.dataset.timeframe = value;
      control.setAttribute('aria-pressed', value === timeframe ? 'true' : 'false');
      control.addEventListener('click', () => {
        if (timeframe === value) return;
        timeframe = value;
        const market = currentMarket();
        if (market) {
          ui.canvas.setAttribute('aria-label', `${market.name} / USDC ${timeframe} candlestick chart`);
        }
        updateSelectedControls();
        loadMarketData({ tapeToo: false });
      });
      return control;
    }));
  }

  function renderRail() {
    ui.rail.replaceChildren(...[...markets.values()].map((market) => createMarketButton(market, selectMarket)));
    updateSelectedControls();
    updateRailStats();
  }

  function resetQuotes(message = 'Quotes run only when you ask. No wallet address is accepted.') {
    quoteGeneration += 1;
    quoteAbort?.abort();
    quoteAbort = null;
    clearTimeout(quoteExpiryTimer);
    quoteExpiryTimer = null;
    ui.quoteHost.replaceChildren();
    ui.status.textContent = message;
    ui.status.className = 'rp-ticket__status';
    ui.submit.removeAttribute('aria-disabled');
    ui.submit.removeAttribute('aria-busy');
  }

  function selectMarket(slug) {
    if (!markets.has(slug) || selected === slug) return;
    selected = slug;
    const market = currentMarket();
    ui.chartTitle.textContent = `${market.name} / USDC`;
    ui.canvas.setAttribute('aria-label', `${market.name} / USDC ${timeframe} candlestick chart`);
    ui.amountUnit.textContent = side === 'buy' ? 'USDC' : market.symbol;
    updateSelectedControls();
    updateMarketStats();
    resetQuotes('Market changed. Request a new comparison when ready.');
    loadMarketData({ tapeToo: true });
  }

  function setSide(next) {
    if (side === next) return;
    side = next;
    const market = currentMarket();
    ui.buy.classList.toggle('is-selected', side === 'buy');
    ui.sell.classList.toggle('is-selected', side === 'sell');
    ui.buy.setAttribute('aria-pressed', side === 'buy' ? 'true' : 'false');
    ui.sell.setAttribute('aria-pressed', side === 'sell' ? 'true' : 'false');
    ui.amountUnit.textContent = side === 'buy' ? 'USDC' : (market?.symbol ?? 'token');
    resetQuotes('Side changed. Request a new comparison when ready.');
  }

  async function marketRequest(reader, params, generation, currentGeneration, stateNode, render) {
    if (coolOff.active()) {
      stateNode.textContent = `Provider cooling down for ${Math.ceil(coolOff.remainingMs() / 1000)} seconds.`;
      stateNode.className = stateNode === ui.chartState ? 'rp-chart__state is-waiting' : 'rp-status is-waiting';
      return;
    }
    if (!budget.take()) {
      stateNode.textContent = 'Shared market-data budget is resting. Try again in a minute.';
      stateNode.className = stateNode === ui.chartState ? 'rp-chart__state is-waiting' : 'rp-status is-waiting';
      return;
    }
    const token = coolOff.token();
    try {
      const value = await reader(params);
      if (destroyed || generation !== currentGeneration()) return;
      coolOff.ok(token);
      render(value);
    } catch (error) {
      if (error instanceof ExchangeDataError && error.code === 'rate_limited') coolOff.fail(error.retryAfterMs);
      if (error?.name === 'AbortError' || destroyed || generation !== currentGeneration()) return;
      stateNode.textContent = marketFailureCopy(error);
      stateNode.className = stateNode === ui.chartState ? 'rp-chart__state is-unavailable' : 'rp-status is-unavailable';
    }
  }

  function loadMarketData({ tapeToo = true } = {}) {
    const market = currentMarket();
    if (!market) return;
    const pool = resolvePool({ slug: market.slug, mint: market.mint, rows: providerRows });
    chartGeneration += 1;
    const nextChartGeneration = chartGeneration;
    chartAbort?.abort();
    chartAbort = new AbortController();
    let nextTapeGeneration = tapeGeneration;
    if (tapeToo) {
      tapeGeneration += 1;
      nextTapeGeneration = tapeGeneration;
      tapeAbort?.abort();
      tapeAbort = new AbortController();
    }
    chart.clear();
    candleTable.clear();
    if (tapeToo) tape.clear();
    if (!pool) {
      ui.chartState.textContent = 'No indexed reference pool is available for this market.';
      ui.chartState.className = 'rp-chart__state is-unavailable';
      if (tapeToo) {
        ui.tapeState.textContent = 'Recent pool trades are not indexed.';
        ui.tapeState.className = 'rp-status is-unavailable';
      }
      return;
    }
    ui.chartState.textContent = 'Reading candles…';
    ui.chartState.className = 'rp-chart__state is-waiting';
    marketRequest(candleReader, {
      pool, timeframe, fetchImpl, signal: chartAbort.signal,
    }, nextChartGeneration, () => chartGeneration, ui.chartState, (candles) => {
      chart.set({ candles, timeframe, hue: market.hue });
      candleTable.set(candles);
      ui.chartState.textContent = candles.length ? `${candles.length} indexed candles` : 'No candles in this interval.';
      ui.chartState.className = candles.length ? 'rp-chart__state is-ready' : 'rp-chart__state is-unavailable';
    });
    if (!tapeToo) return;
    ui.tapeState.textContent = 'Reading recent pool trades…';
    ui.tapeState.className = 'rp-status is-waiting';
    marketRequest(tradesReader, {
      pool, mint: market.mint, fetchImpl, signal: tapeAbort.signal,
    }, nextTapeGeneration, () => tapeGeneration, ui.tapeState, (trades) => {
      tape.set(trades, market, now());
      ui.tapeState.textContent = trades.length ? `${trades.length} recent indexed trades` : 'No recent indexed trades.';
      ui.tapeState.className = trades.length ? 'rp-status is-ready' : 'rp-status is-unavailable';
    });
  }

  async function refreshStats() {
    const controller = new AbortController();
    const bounded = withDeadline(controller.signal, MARKET_DEADLINE_MS);
    try {
      const answer = await statsReader({
        mints: [...markets.values()].map((market) => market.mint),
        fetchImpl,
        signal: bounded.signal,
      });
      if (destroyed) return;
      stats = answer.stats;
      providerRows = answer.rows;
      updateRailStats();
    } catch {
      if (!destroyed) ui.loading.textContent = 'Registry identity is ready; indexed summary data is temporarily unavailable.';
    } finally {
      bounded.cleanup();
    }
  }

  async function requestQuotes(event) {
    event.preventDefault();
    if (ui.submit.getAttribute('aria-disabled') === 'true') return;
    const market = currentMarket();
    if (!market) return;
    let atomic;
    try {
      atomic = decimalToAtomic(ui.amount.value, 6);
    } catch (error) {
      ui.status.textContent = error instanceof ProQuoteError ? error.message : 'Enter a valid amount.';
      ui.status.className = 'rp-ticket__status is-unavailable';
      return;
    }
    quoteGeneration += 1;
    const generation = quoteGeneration;
    quoteAbort?.abort();
    quoteAbort = new AbortController();
    const bounded = withDeadline(quoteAbort.signal, QUOTE_DEADLINE_MS);
    ui.submit.setAttribute('aria-disabled', 'true');
    ui.submit.setAttribute('aria-busy', 'true');
    ui.quoteHost.replaceChildren();
    ui.status.textContent = 'Comparing independent provider snapshots…';
    ui.status.className = 'rp-ticket__status is-waiting';
    try {
      const response = await fetchImpl('/api/registry-pro-quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        signal: bounded.signal,
        body: JSON.stringify({
          sign: market.slug,
          side,
          amount: atomic,
          slippageBps: Number(ui.slippage.value),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (destroyed || generation !== quoteGeneration) return;
      const comparisonResponse = response.ok
        || (response.status === 503 && payload?.status === 'unavailable');
      if (!comparisonResponse || !payload || !Array.isArray(payload.results)
          || payload.sign !== market.slug || payload.side !== side
          || !['complete', 'partial', 'unavailable'].includes(payload.status)) {
        const copy = response.status === 404
          ? 'The server-side quote pilot is disabled.'
          : response.status === 429
            ? 'The quote budget is cooling down.'
            : 'The quote comparison is unavailable.';
        throw new ProQuoteError(payload?.error ?? 'unavailable', copy);
      }
      ui.quoteHost.replaceChildren(...payload.results.map((result) => (
        providerQuoteCard(result, payload, market, side)
      )));
      ui.status.textContent = payload.status === 'complete'
        ? 'Both provider snapshots passed the quote-only contract.'
        : payload.status === 'partial'
          ? 'Partial coverage: one provider passed the quote-only contract.'
          : 'Neither provider has a current quote. Their independent failure states are shown below.';
      ui.status.className = payload.status === 'unavailable'
        ? 'rp-ticket__status is-unavailable'
        : 'rp-ticket__status is-ready';
      const expiries = payload.results
        .filter((result) => result.status === 'ready')
        .map((result) => {
          const observed = Date.parse(String(result.quote?.observedAt ?? payload.observedAt ?? ''));
          const explicit = Date.parse(String(result.quote?.expiresAt ?? ''));
          return Number.isFinite(explicit) ? explicit : observed + 15_000;
        })
        .filter(Number.isFinite);
      if (expiries.length) {
        clearTimeout(quoteExpiryTimer);
        quoteExpiryTimer = setTimeout(() => {
          if (!destroyed && generation === quoteGeneration) {
            resetQuotes('Provider snapshots expired. Request a fresh comparison.');
          }
        }, Math.max(0, Math.min(...expiries) - now()));
      }
    } catch (error) {
      if (destroyed || generation !== quoteGeneration || quoteAbort?.signal.aborted) return;
      ui.status.textContent = error instanceof ProQuoteError
        ? error.message
        : bounded.timedOut()
          ? 'The quote comparison timed out.'
          : 'The quote comparison is unavailable.';
      ui.status.className = 'rp-ticket__status is-unavailable';
    } finally {
      bounded.cleanup();
      if (generation === quoteGeneration) {
        ui.submit.removeAttribute('aria-disabled');
        ui.submit.removeAttribute('aria-busy');
        quoteAbort = null;
      }
    }
  }

  async function boot() {
    const registryDeadline = withDeadline(null, MARKET_DEADLINE_MS);
    try {
      markets = await registryReader({ fetchImpl, signal: registryDeadline.signal });
      if (destroyed) return;
      renderTimeframes();
      renderRail();
      const market = currentMarket();
      ui.chartTitle.textContent = `${market.name} / USDC`;
      ui.canvas.setAttribute('aria-label', `${market.name} / USDC ${timeframe} candlestick chart`);
      ui.loading.textContent = 'Official Registry identity loaded. Provider observations remain independent.';
      ui.loading.className = 'rp-status is-ready';
      await refreshStats();
      if (!destroyed) loadMarketData({ tapeToo: true });
    } catch {
      ui.loading.textContent = 'The official Registry could not be validated. Quotes remain closed.';
      ui.loading.className = 'rp-status is-unavailable';
      ui.workspace.hidden = true;
    } finally {
      registryDeadline.cleanup();
    }
  }

  ui.buy.addEventListener('click', () => setSide('buy'));
  ui.sell.addEventListener('click', () => setSide('sell'));
  ui.amount.addEventListener('input', () => resetQuotes('Amount changed. Request a new comparison when ready.'));
  ui.slippage.addEventListener('change', () => resetQuotes('Raydium guard changed. Request a new comparison when ready.'));
  ui.form.addEventListener('submit', requestQuotes);
  ui.refreshMarket.addEventListener('click', async () => {
    await refreshStats();
    if (!destroyed) loadMarketData({ tapeToo: true });
  });
  const ready = boot();

  return {
    ready,
    destroy() {
      destroyed = true;
      chartGeneration += 1;
      tapeGeneration += 1;
      quoteGeneration += 1;
      chartAbort?.abort();
      tapeAbort?.abort();
      quoteAbort?.abort();
      clearTimeout(quoteExpiryTimer);
      chart.destroy();
      chat?.destroy?.();
      host.replaceChildren();
    },
  };
}
