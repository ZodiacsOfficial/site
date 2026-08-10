/**
 * The trade panel's DOM. Builds its structure once and then updates the parts
 * that changed, rather than re-rendering — a full rewrite would drop the caret
 * out of the amount field on every keystroke.
 *
 * All wording comes from panel-model.mjs. Nothing here decides what to say.
 */

import { createTradePanel } from './panel.mjs';

const NS = 'tp';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function markSpan(markUrl, width) {
  const span = el('span', `${NS}__mark`);
  span.setAttribute('aria-hidden', 'true');
  span.style.width = `${width}px`;
  span.style.maskImage = `url(${markUrl})`;
  span.style.webkitMaskImage = `url(${markUrl})`;
  return span;
}

function externalLink(href, label) {
  const a = el('a', null, label);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer external nofollow';
  return a;
}

function stepHeading(number) {
  const head = el('div', `${NS}__step-head`);
  head.append(el('span', `${NS}__step-number`, String(number)), el('h3', `${NS}__step-title`));
  return head;
}

/**
 * @param {object} options
 * @param {HTMLElement} options.host   where the panel mounts
 * @param {object} options.sign        { name, slug, mint, hue, iconUrl }
 * @param {object} options.deps        fetchOrder / executeOrder / wallet
 * @param {object} [options.marks]     { coinbase, moonpay, ramp, applepay } data URIs
 */
export function mountTradePanel({ host, sign, deps, marks = {} }) {
  const root = el('div', NS);
  root.style.setProperty('--tp-sign', sign.hue);

  // ── head ───────────────────────────────────────────────────────────────
  const head = el('div', `${NS}__head`);
  if (sign.iconUrl) {
    const disc = document.createElement('img');
    disc.className = `${NS}__disc`;
    disc.src = sign.iconUrl;
    disc.alt = '';
    disc.width = 34; disc.height = 34;
    head.append(disc);
  }
  const who = el('span', `${NS}__who`);
  const name = el('span', `${NS}__name`);
  const sub = el('span', `${NS}__sub`);
  who.append(name, sub);
  const venue = el('span', `${NS}__venue`);
  head.append(who, venue);

  // ── body ───────────────────────────────────────────────────────────────
  const body = el('div', `${NS}__body`);
  const assetNote = el('p', `${NS}__asset-note`);
  const flow = el('div', `${NS}__flow`);

  const payLab = el('span', 'lab');
  const payBox = el('div', 'pay');
  const input = document.createElement('input');
  input.className = 'pay__input';
  input.inputMode = 'decimal';
  input.spellcheck = false;
  input.setAttribute('aria-label', 'Amount in US dollars');
  const unit = el('span', 'unit');
  payBox.append(input, unit);
  const payHint = el('p', 'sub');

  const presets = el('div', 'amts');
  presets.setAttribute('role', 'group');
  presets.setAttribute('aria-label', 'Choose an amount');

  const getLab = el('span', 'lab');
  const getRow = el('div', 'get');
  const out = el('span', 'out');
  const outUnit = el('span', 'unit');
  getRow.append(out, outUnit);
  const worth = el('p', 'usd');
  // The quote is what changes under the visitor; announce it, politely.
  const quoteRegion = el('div', 'quote');
  quoteRegion.setAttribute('aria-live', 'polite');
  quoteRegion.append(getLab, getRow, worth);

  const facts = el('div', 'facts');
  const details = el('dl', 'details');
  const warning = el('p', 'warn');
  warning.hidden = true;
  const reviewNotice = el('p', 'review-notice');
  reviewNotice.hidden = true;

  const methods = el('div', 'payseg');
  methods.setAttribute('role', 'group');
  methods.setAttribute('aria-label', 'How are you paying');
  const routeHint = el('p', 'route-hint');

  const action = el('div', 'action');
  const actionIntro = el('p', 'action-intro');
  const go = el('button', 'tp__go');
  go.type = 'button';
  const walletHint = el('p', 'nowallet');
  const routes = el('div', 'routes');
  const errorBox = el('p', 'err');
  errorBox.hidden = true;
  const after = el('ul', 'after');
  after.hidden = true;
  const note = el('p', 'note');

  const spendStep = el('section', `${NS}__step ${NS}__step--spend`);
  const spendHead = stepHeading(1);
  spendStep.append(spendHead, payLab, payBox, payHint, presets);

  const routeStep = el('section', `${NS}__step ${NS}__step--route`);
  const routeHead = stepHeading(2);
  routeStep.append(routeHead, methods, routeHint);

  const quoteStep = el('section', `${NS}__step ${NS}__step--quote`);
  const quoteHead = stepHeading(3);
  quoteStep.append(quoteHead, quoteRegion, facts, details, warning, reviewNotice);

  const actionStep = el('section', `${NS}__step ${NS}__step--action`);
  const actionHead = stepHeading(4);
  actionStep.append(actionHead, actionIntro, action);

  flow.append(spendStep, routeStep, quoteStep, actionStep, errorBox);
  const complete = el('div', `${NS}__complete`);
  complete.hidden = true;
  complete.append(el('p', `${NS}__complete-kicker`, 'Swap complete'), after);
  body.append(assetNote, flow, complete, note);
  root.append(head, body);
  host.replaceChildren(root);

  // onChange is read out of deps when the controller is built, so it is routed
  // through a holder that paint() fills in once it exists.
  let paintFn = () => {};
  const controller = createTradePanel({
    sign,
    deps: {
      ...deps,
      onChange: (view, state) => {
        paintFn(view);
        try {
          deps.onStateChange?.(view, state);
        } catch {
          // Operating telemetry is never allowed to alter a quote outcome.
        }
      },
    },
  });

  // ── painting ───────────────────────────────────────────────────────────
  let lastPresets = null;
  let lastMethods = null;
  let actionMode = null;
  const detailRows = new Map();
  let quoteAgeValue = null;

  function reconcileDetails(items = []) {
    const present = new Set();
    for (const [index, item] of items.entries()) {
      const key = item.label;
      present.add(key);
      let row = detailRows.get(key);
      if (!row) {
        const wrap = el('div', 'detail');
        const term = el('dt');
        const value = el('dd');
        wrap.append(term, value);
        row = { wrap, term, value, link: null };
        detailRows.set(key, row);
      }

      row.term.textContent = item.label;
      if (item.href) {
        if (!row.link) {
          row.link = externalLink(item.href, item.value);
          row.value.replaceChildren(row.link);
        }
        row.link.href = item.href;
        row.link.textContent = item.value;
        if (item.title) {
          row.link.title = item.title;
          row.link.setAttribute('aria-label', `${item.label}: ${item.title}`);
        } else {
          row.link.removeAttribute('title');
          row.link.removeAttribute('aria-label');
        }
      } else {
        if (row.link) {
          row.value.replaceChildren();
          row.link = null;
        }
        row.value.textContent = item.value;
      }

      const position = details.children[index] ?? null;
      if (position !== row.wrap) details.insertBefore(row.wrap, position);
    }

    for (const [key, row] of detailRows) {
      if (present.has(key)) continue;
      row.wrap.remove();
      detailRows.delete(key);
    }
    quoteAgeValue = detailRows.get('Quote age')?.value ?? null;
  }

  function paint(view) {
    root.dataset.state = view.state;
    name.textContent = view.heading;
    sub.textContent = view.subheading;
    venue.textContent = view.venue;
    payLab.textContent = view.payLabel;
    unit.textContent = view.payUnit;
    payHint.textContent = view.payHint;
    assetNote.textContent = view.assetNote;
    spendHead.querySelector(`.${NS}__step-title`).textContent = view.spendTitle;
    routeHead.querySelector(`.${NS}__step-title`).textContent = view.routeTitle;
    quoteHead.querySelector(`.${NS}__step-title`).textContent = view.quoteTitle;
    actionHead.querySelector(`.${NS}__step-title`).textContent = view.actionTitle;
    routeHint.textContent = view.routeHint;
    actionIntro.textContent = view.actionIntro;
    const locked = view.state === 'signing';
    input.disabled = locked;
    // Never clobber what someone is mid-way through typing.
    if (document.activeElement !== input) input.value = view.amount;

    if (lastPresets !== view.presets) {
      presets.replaceChildren(...view.presets.map((amount) => {
        const b = el('button', null, `$${amount}`);
        b.type = 'button';
        b.dataset.amount = amount;
        return b;
      }));
      lastPresets = view.presets;
    }
    for (const b of presets.children) {
      b.setAttribute('aria-pressed', String(b.dataset.amount === view.amount));
      b.disabled = locked;
    }

    const methodKey = view.methods.map((method) => `${method.id}:${method.label}`).join('|');
    if (lastMethods !== methodKey) {
      methods.replaceChildren(...view.methods.map((m) => {
        const b = el('button');
        b.type = 'button';
        b.dataset.method = m.id;
        b.append(el('span', 'payseg__eyebrow', m.eyebrow), el('span', 'payseg__label', m.label));
        return b;
      }));
      lastMethods = methodKey;
    }
    for (const b of methods.children) {
      b.setAttribute('aria-pressed', String(b.dataset.method === view.payMethod));
      b.disabled = locked;
    }

    quoteStep.hidden = !view.showQuote && view.state !== 'quoting';
    quoteRegion.hidden = !view.showQuote && view.state !== 'quoting';
    getLab.textContent = view.getLabel || '';
    out.textContent = view.showQuote ? view.receive : view.state === 'quoting' ? 'Finding price…' : '';
    outUnit.textContent = view.showQuote ? view.receiveUnit : '';
    worth.textContent = view.showQuote ? view.receiveWorth : '';
    out.classList.toggle('is-waiting', view.state === 'quoting');

    facts.replaceChildren(...(view.facts || []).map((text, i) => {
      const s = el('span', 'fact', text);
      if (i === 1 && view.impactBand === 'severe') s.classList.add('severe');
      return s;
    }));

    reconcileDetails(view.details);

    warning.hidden = !view.warning;
    warning.textContent = view.warning || '';
    reviewNotice.hidden = !view.reviewNotice;
    reviewNotice.textContent = view.reviewNotice || '';

    errorBox.hidden = !view.error;
    errorBox.textContent = view.error || '';

    after.hidden = !view.after;
    if (view.after) after.replaceChildren(...view.after.map((t) => el('li', null, t)));

    note.textContent = view.note;

    const nextActionMode = !view.showAction || view.error
      ? 'hidden'
      : view.payMethod === 'card' ? 'card' : 'usdc';
    if (nextActionMode !== actionMode) {
      action.replaceChildren();
      if (nextActionMode === 'card') {
        action.append(buildPayWays(view, marks));
      } else if (nextActionMode === 'usdc') {
        action.append(go, walletHint);
      }
      actionMode = nextActionMode;
    }
    if (nextActionMode === 'usdc') {
      go.textContent = view.actionLabel;
      go.disabled = Boolean(view.actionDisabled);
      walletHint.textContent = view.walletHint || '';
    }
    actionStep.hidden = nextActionMode === 'hidden';
    routeStep.hidden = view.state === 'done';
    spendStep.hidden = view.state === 'done';
    flow.hidden = view.state === 'done';
    complete.hidden = !view.after;
  }

  /**
   * One scannable list: mark, name, what the company does. No headline route,
   * no paragraphs — the marks do the recognising, and every row is the same
   * shape so the eye can compare them.
   */
  function buildPayWays(view, marks) {
    routes.replaceChildren();
    const list = el('ul', 'ramps');
    for (const way of view.payWays) {
      const li = el('li');
      const link = externalLink(way.href, '');
      link.className = 'ramp';
      link.setAttribute('aria-label', `${way.name} — opens in a new tab`);

      const badge = el('span', 'ramp__who');
      // The mark identifies the company; the name is always there too, so a
      // mark that failed to load never leaves an unreadable row.
      if (marks[way.mark]) badge.append(markSpan(marks[way.mark], 22));
      badge.append(el('span', 'ramp__name', way.name));
      if (way.applePay && marks.applepay) {
        const ap = markSpan(marks.applepay, 36);
        ap.className = 'tp__mark ap';
        ap.setAttribute('role', 'img');
        ap.setAttribute('aria-label', 'Apple Pay');
        ap.removeAttribute('aria-hidden');
        badge.append(ap);
      }

      link.append(badge, el('span', 'ramp__note', way.note), el('span', 'go', '↗'));
      li.append(link);
      list.append(li);
    }
    routes.append(list);
    return routes;
  }

  // ── events ─────────────────────────────────────────────────────────────
  const onInput = () => controller.setAmount(input.value);
  const onPresets = (e) => {
    const b = e.target.closest('[data-amount]');
    if (b) controller.setAmount(b.dataset.amount);
  };
  const onMethods = (e) => {
    const b = e.target.closest('[data-method]');
    if (b) controller.setPayMethod(b.dataset.method);
  };
  const onGo = () => controller.review();

  input.addEventListener('input', onInput);
  presets.addEventListener('click', onPresets);
  methods.addEventListener('click', onMethods);
  go.addEventListener('click', onGo);

  paintFn = paint;
  paint(controller.view());
  controller.refreshQuote();
  const ageClock = window.setInterval(() => {
    if (!controller.state.quote || !quoteAgeValue) return;
    const age = controller.view().details?.find((item) => item.label === 'Quote age');
    if (age) quoteAgeValue.textContent = age.value;
  }, 10_000);

  return {
    controller,
    destroy() {
      input.removeEventListener('input', onInput);
      presets.removeEventListener('click', onPresets);
      methods.removeEventListener('click', onMethods);
      go.removeEventListener('click', onGo);
      window.clearInterval(ageClock);
      controller.destroy();
      host.replaceChildren();
    },
  };
}
