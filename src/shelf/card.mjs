// The records card — and, since the owner's round-two direction, the shop
// window. A drawn-forward sculpture shows its price and a route to acquire it,
// above the registry facts it always showed.
//
// Everything the reader can select, copy, or tab to lives in the DOM — the
// canvas next to it is decoration. Addresses are read from the registry file
// itself at the moment a figure is drawn out, never from a copy baked into
// this page, so the gallery can only ever show what the registry says now.
// The acquisition route is built from that same live answer: no verified
// mint, no buy button.

const REGISTRY_URL = '/registry/zodiacs.registry.json';

/** Mirrors WSOL_MINT in scripts/sign-data.mjs — the sol side of the route. */
const WSOL_MINT = 'So11111111111111111111111111111111111111112';

const DEX_API = 'https://api.dexscreener.com/latest/dex/pairs/';

// A request that hangs is a failure too. Without a deadline the card sits on
// "Reading the registry…" for as long as the other end holds the socket open,
// which reads as broken where the honest unavailable state reads as offline.
const REGISTRY_DEADLINE = 12000;
const MARKET_DEADLINE = 8000;

/** fetch with a deadline. AbortController rather than AbortSignal.timeout,
 *  which the bundle's Safari 15 target does not have. */
function fetchWithin(url, ms, init) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...init, signal: controller.signal })
    .finally(() => window.clearTimeout(timer));
}

let pending = null;

function registry() {
  if (!pending) {
    pending = fetchWithin(REGISTRY_URL, REGISTRY_DEADLINE, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`registry ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        // Offline is an honest failure, not an old answer. Drop the promise so
        // the next open tries the network again.
        pending = null;
        throw error;
      });
  }
  return pending;
}

// One quote per pair per visit; a failed fetch is forgotten so reopening the
// figure asks again. Same memo discipline as the registry above.
const quotes = new Map();

function memoQuote(key, request) {
  if (!quotes.has(key)) {
    quotes.set(key, request().catch((error) => {
      quotes.delete(key);
      throw error;
    }));
  }
  return quotes.get(key);
}

function marketQuote(market) {
  const url = DEX_API
    + `${encodeURIComponent(market.chainId)}/${encodeURIComponent(market.pairId)}`;
  return memoQuote(`${market.chainId}:${market.pairId}`, () => fetchWithin(url, MARKET_DEADLINE)
    .then((response) => {
      if (!response.ok) throw new Error(`market ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      const pair = payload && payload.pairs && payload.pairs[0];
      if (!pair) throw new Error('market: pair not indexed');
      return pair;
    }));
}

/**
 * A sign with no pinned pair (cancer, sagittarius) is quoted by its mint
 * instead — the same DexScreener token endpoint the hub's Market snapshot
 * uses — taking the deepest pool as the quote. The mint comes from the live
 * registry answer, so this route exists only for a verified record.
 */
function tokenQuote(mint) {
  const url = `https://api.dexscreener.com/tokens/v1/solana/${encodeURIComponent(mint)}`;
  return memoQuote(`tokens:solana:${mint}`, () => fetchWithin(url, MARKET_DEADLINE)
    .then((response) => {
      if (!response.ok) throw new Error(`market ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      const pairs = Array.isArray(payload) ? payload : payload && payload.pairs;
      if (!Array.isArray(pairs)) throw new Error('market: malformed');
      let best = null;
      let bestLiquidity = -1;
      for (const pair of pairs) {
        if (!pair || !pair.pairAddress) continue;
        if (!pair.baseToken || pair.baseToken.address !== mint) continue;
        const liquidity = Number(pair.liquidity && pair.liquidity.usd) || 0;
        if (liquidity > bestLiquidity) {
          bestLiquidity = liquidity;
          best = pair;
        }
      }
      if (!best) throw new Error('market: token not indexed');
      return best;
    }));
}

// Formatters shared with the sign pages' market panel (build-sign-pages.mjs).
// Everything lands via textContent, so nothing here needs escaping.

function fmtPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const digits = Math.abs(n) < 0.0001 ? 8 : Math.abs(n) < 0.01 ? 6 : 4;
  return `$${n.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '')}`;
}

function fmtCompact(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toLocaleString(undefined, { maximumFractionDigits: 1 })}B`;
  if (a >= 1e6) return `$${(n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
  if (a >= 1e3) return `$${(n / 1e3).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function fmtPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function truncate(address) {
  return address.length > 16 ? `${address.slice(0, 6)}…${address.slice(-6)}` : address;
}

const CHAIN_LABELS = {
  solana: { name: 'Solana', role: 'Native · SPL' },
  base: { name: 'Base', role: 'Official representation · ERC-20' },
};

function recordRow(entry) {
  const meta = CHAIN_LABELS[entry.chain] ?? { name: entry.chain, role: entry.tokenStandard };
  const row = document.createElement('div');
  row.className = 'rec';

  const head = document.createElement('div');
  head.className = 'rec__head';
  const chain = document.createElement('span');
  chain.className = 'rec__chain';
  chain.textContent = meta.name;
  const role = document.createElement('span');
  role.className = 'rec__role';
  role.textContent = meta.role;
  head.append(chain, role);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'rec__addr';
  button.title = entry.address;
  const value = document.createElement('span');
  value.className = 'rec__value';
  value.textContent = truncate(entry.address);
  const state = document.createElement('span');
  state.className = 'rec__copy';
  state.textContent = 'Copy';
  button.append(value, state);
  button.setAttribute('aria-label', `Copy the ${meta.name} address, ${entry.address}`);

  let timer = 0;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(entry.address);
      state.textContent = 'Copied';
    } catch {
      state.textContent = 'Press ⌘C';
      const range = document.createRange();
      range.selectNodeContents(value);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      value.textContent = entry.address;
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      state.textContent = 'Copy';
      value.textContent = truncate(entry.address);
    }, 2200);
  });

  row.append(head, button);
  return row;
}

export function createCard(root, { onClose }) {
  const element = root.querySelector('[data-gallery-card]');
  const lot = element.querySelector('[data-card-lot]');
  const name = element.querySelector('[data-card-name]');
  const figure = element.querySelector('[data-card-figure]');
  const facts = element.querySelector('[data-card-facts]');
  const records = element.querySelector('[data-card-records]');
  const entry = element.querySelector('[data-card-entry]');
  const closer = element.querySelector('[data-gallery-close]');

  const marketState = element.querySelector('[data-market-state]');
  const priceRow = element.querySelector('[data-market-price-row]');
  const priceValue = element.querySelector('[data-market-price]');
  const priceChange = element.querySelector('[data-market-change]');
  const cta = element.querySelector('[data-market-cta]');
  const jupiter = element.querySelector('[data-market-jupiter]');
  const dexscreener = element.querySelector('[data-market-dexscreener]');
  const marketGrid = element.querySelector('[data-market-grid]');

  closer.addEventListener('click', () => onClose());

  let token = 0;

  function fact(term, description) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = description;
    facts.append(dt, dd);
  }

  function marketCell(term, description) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = description;
    marketGrid.append(dt, dd);
  }

  /** The native mint for a sign, from the live registry answer. */
  async function nativeMint(slug) {
    const data = await registry();
    const asset = data.assets.find((a) => a.sign === slug);
    const mint = asset && asset.native && asset.native.address;
    if (!mint) throw new Error('registry: sign not found');
    return mint;
  }

  async function fillMarket(record, mine) {
    try {
      // A pinned pair is the quote of record; without one the sign is quoted
      // by its mint. Either way the card shows live numbers whenever
      // DexScreener indexes the token at all.
      const pair = record.market
        ? await marketQuote(record.market)
        : await tokenQuote(await nativeMint(record.slug));
      if (mine !== token) return;

      priceValue.textContent = fmtPrice(pair.priceUsd);
      const change = Number(pair.priceChange && pair.priceChange.h24);
      priceChange.textContent = fmtPct(change);
      priceChange.classList.toggle('card__price-change--up', Number.isFinite(change) && change > 0);
      priceChange.classList.toggle('card__price-change--down', Number.isFinite(change) && change < 0);

      marketGrid.replaceChildren();
      marketCell('Liquidity', fmtCompact(pair.liquidity && pair.liquidity.usd));
      marketCell('Market cap', fmtCompact(pair.marketCap ?? pair.fdv));

      marketState.hidden = true;
      priceRow.hidden = false;
      marketGrid.hidden = false;
    } catch {
      if (mine !== token) return;
      marketState.textContent = 'Market context unavailable.';
    }
  }

  async function fillRecords(record, mine) {
    records.replaceChildren();
    const note = document.createElement('p');
    note.className = 'rec__note';
    note.textContent = 'Reading the registry…';
    records.append(note);
    try {
      const data = await registry();
      if (mine !== token) return;
      const asset = data.assets.find((a) => a.sign === record.slug);
      if (!asset) throw new Error('sign not in registry');
      // `representations` already carries the native mint alongside the
      // bridged one, so list each chain once, native first.
      const seen = new Map();
      for (const entryRecord of [asset.native, ...asset.representations]) {
        const identity = `${entryRecord.chain}:${entryRecord.address}`;
        if (!seen.has(identity)) seen.set(identity, entryRecord);
      }
      // The disc a wallet shows for this token, beside the addresses that
      // name it — the point where a holder checks they agree.
      const identity = document.createElement('div');
      identity.className = 'rec__token';
      const disc = document.createElement('img');
      disc.className = 'rec__disc';
      disc.src = `/assets/zodiac-icons/128/${record.slug}.webp`;
      disc.width = 40;
      disc.height = 40;
      disc.alt = '';
      disc.loading = 'lazy';
      disc.decoding = 'async';
      const note = document.createElement('span');
      note.className = 'rec__token-note';
      note.textContent = 'As it appears in wallets.';
      identity.append(disc, note);
      records.replaceChildren(identity, ...[...seen.values()].map(recordRow));

      // The route is offered only once the registry has answered — the mint
      // in the URL is the one the reader can verify two lines below.
      const mint = asset.native.address;
      jupiter.href = `https://jup.ag/swap/${WSOL_MINT}-${mint}`;
      jupiter.setAttribute('aria-label',
        `Open the Jupiter route for ${record.name} — independent third-party venue`);
      dexscreener.href = record.market
        ? `https://dexscreener.com/${record.market.chainId}/${record.market.pairId}`
        : `https://dexscreener.com/search?q=${mint}`;
      cta.hidden = false;
    } catch {
      if (mine !== token) return;
      note.textContent = 'Records unavailable offline.';
      records.replaceChildren(note);
    }
  }

  function open(record) {
    token += 1;
    element.style.setProperty('--sign', record.hue);
    lot.textContent = `Lot ${record.lot} of XII · Nº ${String(record.order).padStart(2, '0')} of 12`;
    name.textContent = record.name;
    figure.textContent = record.epithet;

    // The shop window resets with each figure; quotes and routes arrive as
    // their fetches resolve.
    marketState.hidden = false;
    marketState.textContent = 'Loading market context.';
    priceRow.hidden = true;
    priceChange.classList.remove('card__price-change--up', 'card__price-change--down');
    marketGrid.hidden = true;
    cta.hidden = true;
    jupiter.removeAttribute('href');
    dexscreener.removeAttribute('href');

    facts.replaceChildren();
    fact('Classification', `${record.modality} ${record.element.toLowerCase()}`);
    fact('Ruling planet', record.ruler);
    fact('Dates', record.dates);
    fact('Archetype', record.archetype);
    fact('Principal star', record.star);

    entry.href = `/registry/${record.slug}/`;
    entry.setAttribute('aria-label', `Open the ${record.name} catalogue entry`);

    element.hidden = false;
    // Let the attribute land before the transition class, or it does not run.
    requestAnimationFrame(() => element.classList.add('is-open'));
    void fillMarket(record, token);
    void fillRecords(record, token);
  }

  function close() {
    token += 1;
    const mine = token;
    element.classList.remove('is-open');
    // Let the card fade before it leaves the document — but only if nothing
    // reopened it in the meantime.
    window.setTimeout(() => {
      if (mine === token) element.hidden = true;
    }, 420);
  }

  return { open, close, element, closer };
}
