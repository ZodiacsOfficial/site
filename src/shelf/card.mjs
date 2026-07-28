// The records card.
//
// Everything the reader can select, copy, or tab to lives in the DOM — the
// canvas next to it is decoration. Addresses are read from the registry file
// itself at the moment a volume is opened, never from a copy baked into this
// page, so the shelf can only ever show what the registry currently says.

const REGISTRY_URL = '/registry/zodiacs.registry.json';

let pending = null;

function registry() {
  if (!pending) {
    pending = fetch(REGISTRY_URL, { cache: 'no-store' })
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
  const element = root.querySelector('[data-shelf-card]');
  const lot = element.querySelector('[data-card-lot]');
  const name = element.querySelector('[data-card-name]');
  const figure = element.querySelector('[data-card-figure]');
  const facts = element.querySelector('[data-card-facts]');
  const records = element.querySelector('[data-card-records]');
  const entry = element.querySelector('[data-card-entry]');
  const closer = element.querySelector('[data-shelf-close]');

  closer.addEventListener('click', () => onClose());

  let token = 0;

  function fact(term, description) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = description;
    facts.append(dt, dd);
  }

  async function fillRecords(volume, mine) {
    records.replaceChildren();
    const note = document.createElement('p');
    note.className = 'rec__note';
    note.textContent = 'Reading the registry…';
    records.append(note);
    try {
      const data = await registry();
      if (mine !== token) return;
      const asset = data.assets.find((a) => a.sign === volume.slug);
      if (!asset) throw new Error('sign not in registry');
      // `representations` already carries the native mint alongside the
      // bridged one, so list each chain once, native first.
      const seen = new Map();
      for (const entry of [asset.native, ...asset.representations]) {
        const identity = `${entry.chain}:${entry.address}`;
        if (!seen.has(identity)) seen.set(identity, entry);
      }
      records.replaceChildren(...[...seen.values()].map(recordRow));
    } catch {
      if (mine !== token) return;
      note.textContent = 'Records unavailable offline.';
      records.replaceChildren(note);
    }
  }

  function open(volume) {
    token += 1;
    element.style.setProperty('--sign', volume.hue);
    lot.textContent = `Lot ${volume.lot} of XII · Nº ${String(volume.order).padStart(2, '0')} of 12`;
    name.textContent = volume.name;
    figure.textContent = volume.epithet;

    facts.replaceChildren();
    fact('Classification', `${volume.modality} ${volume.element.toLowerCase()}`);
    fact('Ruling planet', volume.ruler);
    fact('Dates', volume.dates);
    fact('Archetype', volume.archetype);
    fact('Principal star', volume.star);

    entry.href = `/registry/${volume.slug}/`;
    entry.setAttribute('aria-label', `Open the ${volume.name} catalogue entry`);

    element.hidden = false;
    // Let the attribute land before the transition class, or it does not run.
    requestAnimationFrame(() => element.classList.add('is-open'));
    void fillRecords(volume, token);
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
