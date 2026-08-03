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

  const meet = el('div', 'meet');
  meet.innerHTML = '<i></i><span aria-hidden="true">↓</span><i></i>';

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
  const warning = el('p', 'warn');
  warning.hidden = true;

  const payq = el('p', 'lab payq', 'How are you paying?');
  const methods = el('div', 'payseg');
  methods.setAttribute('role', 'group');
  methods.setAttribute('aria-label', 'How are you paying');

  const action = el('div', 'action');
  const go = el('button', 'tp__go');
  go.type = 'button';
  const walletHint = el('p', 'nowallet');
  const routes = el('div', 'routes');
  const errorBox = el('p', 'err');
  errorBox.hidden = true;
  const after = el('ul', 'after');
  after.hidden = true;
  const note = el('p', 'note');

  body.append(payLab, payBox, payHint, presets, meet, quoteRegion, facts, warning,
    payq, methods, action, errorBox, after, note);
  root.append(head, body);
  host.replaceChildren(root);

  // onChange is read out of deps when the controller is built, so it is routed
  // through a holder that paint() fills in once it exists.
  let paintFn = () => {};
  const controller = createTradePanel({
    sign,
    deps: { ...deps, onChange: (view) => paintFn(view) },
  });

  // ── painting ───────────────────────────────────────────────────────────
  let lastPresets = null;
  let lastMethods = null;

  function paint(view) {
    name.textContent = view.heading;
    sub.textContent = view.subheading;
    venue.textContent = view.venue;
    payLab.textContent = view.payLabel;
    unit.textContent = view.payUnit;
    payHint.textContent = view.payHint;
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
    }

    if (lastMethods !== view.methods) {
      methods.replaceChildren(...view.methods.map((m) => {
        const b = el('button', null, m.label);
        b.type = 'button';
        b.dataset.method = m.id;
        return b;
      }));
      lastMethods = view.methods;
    }
    for (const b of methods.children) {
      b.setAttribute('aria-pressed', String(b.dataset.method === view.payMethod));
    }

    quoteRegion.hidden = !view.showQuote && view.state !== 'quoting';
    getLab.textContent = view.getLabel || '';
    out.textContent = view.showQuote ? view.receive : '';
    outUnit.textContent = view.showQuote ? view.receiveUnit : '';
    worth.textContent = view.showQuote ? view.receiveWorth : '';
    out.classList.toggle('is-waiting', view.state === 'quoting');

    facts.replaceChildren(...(view.facts || []).map((text, i) => {
      const s = el('span', 'fact', text);
      if (i === 1 && view.impactBand === 'severe') s.classList.add('severe');
      return s;
    }));

    warning.hidden = !view.warning;
    warning.textContent = view.warning || '';

    errorBox.hidden = !view.error;
    errorBox.textContent = view.error || '';

    after.hidden = !view.after;
    if (view.after) after.replaceChildren(...view.after.map((t) => el('li', null, t)));

    note.textContent = view.note;

    const cardPath = view.payMethod === 'card';
    action.replaceChildren();
    if (view.showAction && !view.error) {
      if (cardPath) {
        action.append(buildRoutes(view, marks));
      } else {
        go.textContent = view.actionLabel;
        go.disabled = Boolean(view.actionDisabled);
        walletHint.textContent = view.walletHint || '';
        action.append(go, walletHint);
      }
    }
    payq.hidden = !view.showAction || Boolean(view.error);
    methods.hidden = payq.hidden;
  }

  function buildRoutes(view, marks) {
    routes.replaceChildren();
    const first = el('div', 'route route--first');
    first.append(
      el('p', 'route__k', view.quickRoute.kicker),
      el('p', 'route__t', view.quickRoute.title),
      el('p', 'route__d', view.quickRoute.body),
    );
    const open = externalLink(view.quickRoute.href, 'Open fomo ↗');
    open.className = 'route__go';
    first.append(open);

    const second = el('div', 'route');
    second.append(el('p', 'route__k', 'Or buy USDC first, then swap here'));
    const list = el('ul', 'ramps');
    for (const ramp of view.onRamps) {
      const li = el('li');
      const key = ramp.name.split(' ')[0].toLowerCase();
      const link = externalLink(ramp.href, '');
      link.setAttribute('aria-label', ramp.name);
      const hasMark = Boolean(marks[key]);
      if (hasMark) link.append(markSpan(marks[key], ramp.wordmark ? 84 : 21));
      // A wordmark carries the name itself, but only if its mark actually
      // arrived — otherwise the link would render empty.
      if (!ramp.wordmark || !hasMark) link.append(document.createTextNode(ramp.name));
      link.append(el('span', 'go', '↗'));
      li.append(link);
      if (ramp.applePay && marks.applepay) {
        const badge = el('span', 'ap');
        const m = markSpan(marks.applepay, 34);
        m.setAttribute('role', 'img');
        m.setAttribute('aria-label', 'Apple Pay');
        m.removeAttribute('aria-hidden');
        badge.append(m);
        li.append(badge);
      }
      li.append(el('span', null, ramp.note));
      list.append(li);
    }
    second.append(list);
    routes.append(first, second);
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

  return {
    controller,
    destroy() {
      input.removeEventListener('input', onInput);
      presets.removeEventListener('click', onPresets);
      methods.removeEventListener('click', onMethods);
      go.removeEventListener('click', onGo);
      controller.destroy();
      host.replaceChildren();
    },
  };
}
