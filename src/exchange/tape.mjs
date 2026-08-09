/**
 * The trades tape: the pool's recent buys and sells, newest first. Rendered
 * with textContent only, like every wing surface. Buys carry the sign's
 * pastel; sells stay in the muted ink — the site's palette has no red/green
 * pair and the tape does not introduce one.
 */

import { formatAge, formatPrice, formatTokenAmount, formatUsd } from './chart-model.mjs';

const MAX_ROWS = 40;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function createTape({ host, now = () => Date.now() }) {
  const table = el('table', 'zme-tape__table');
  const head = el('thead');
  const headRow = el('tr');
  for (const label of ['Age', 'Side', 'Amount', 'Price', 'Value']) {
    headRow.append(el('th', null, label));
  }
  head.append(headRow);
  const body = el('tbody');
  table.append(head, body);
  host.append(table);

  // Freshness is by trade id, not timestamp — two fills can share a block.
  let seenIds = null;

  return {
    set(trades, { symbol } = {}) {
      const rows = trades.slice(0, MAX_ROWS);
      const nowMs = now();
      const previous = seenIds;
      body.replaceChildren(...rows.map((trade) => {
        const row = el('tr', trade.side === 'buy' ? 'zme-tape__row--buy' : 'zme-tape__row--sell');
        if (previous && !previous.has(trade.id)) row.classList.add('is-fresh');
        row.append(
          el('td', null, formatAge(trade.ts, nowMs)),
          el('td', 'zme-tape__side', trade.side === 'buy' ? 'Buy' : 'Sell'),
          el('td', null, `${formatTokenAmount(trade.tokenAmount)}${symbol ? ` ${symbol}` : ''}`),
          el('td', null, formatPrice(trade.priceUsd)),
          el('td', null, trade.volumeUsd === null ? '—' : formatUsd(trade.volumeUsd)),
        );
        return row;
      }));
      seenIds = new Set(rows.map((trade) => trade.id));
    },
    clear() {
      body.replaceChildren();
      seenIds = null;
    },
    destroy() {
      table.remove();
    },
  };
}
