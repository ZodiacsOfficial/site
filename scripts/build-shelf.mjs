// Builds the Gallery — /registry/gallery/.
//
//   node scripts/build-shelf.mjs
//
// (The source folder and this script keep their original names; only the
// public surface is the Gallery. Renaming them is a follow-up, not a
// prerequisite.)
//
// Emits two artifacts, both committed:
//
//   public/registry/gallery/index.html  the page, register and all
//   public/assets/gallery.js            the bundled scene (src/shelf/*)
//
// The twelve records are read from registry/zodiacs.registry.json and
// scripts/sign-data.mjs, so this page cannot disagree with the catalogue it
// stands for. Addresses are NOT written here: the page fetches them from the
// registry file when a figure is drawn out, which keeps one answer on the site
// to what a sign's mint is. The sculptures' geometry and plates come from
// scripts/build-figure-assets.mjs.

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as esbuild from 'esbuild';

import { readFigures } from '../src/shelf/figures.mjs';
import { wingNavHtml, wingNavCss, wingNavScript } from './wing-nav.mjs';
import { CHANNELS, MARKET_PAIRS } from './sign-data.mjs';
import { EN } from '../src/strings/en.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const PAGE_DIR = resolve(root, 'public/registry/gallery');
const SCRIPT_OUT = resolve(root, 'public/assets/gallery.js');
const SCRIPT_SRC = resolve(root, 'src/shelf/main.mjs');
const URL_PATH = 'https://zodiacs.org/registry/gallery/';

const esc = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const figures = await readFigures();

// ---- the scene bundle --------------------------------------------------------

await esbuild.build({
  entryPoints: [SCRIPT_SRC],
  outfile: SCRIPT_OUT,
  bundle: true,
  format: 'iife',
  target: ['es2020', 'safari15'],
  minify: true,
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
  banner: {
    js: '/* Generated from src/shelf/ by scripts/build-shelf.mjs — do not edit directly. */',
  },
});

// ---- the page ----------------------------------------------------------------

const DESCRIPTION = 'The twelve Gold Sculptures of the Zodiacs registry, standing in a row. '
  + 'Draw one forward to turn it in the light, and read its classification, '
  + 'dates, and addresses on Solana and Base.';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Zodiacs.org', item: 'https://zodiacs.org/' },
        { '@type': 'ListItem', position: 2, name: 'The Registry', item: 'https://zodiacs.org/registry/' },
        { '@type': 'ListItem', position: 3, name: 'The Gallery', item: URL_PATH },
      ],
    },
    {
      '@type': 'WebPage',
      '@id': `${URL_PATH}#page`,
      url: URL_PATH,
      name: 'The Gallery · The Twelve — Zodiacs.org',
      description: DESCRIPTION,
      inLanguage: 'en',
      isPartOf: { '@id': 'https://zodiacs.org/#site' },
    },
    {
      '@type': 'ItemList',
      '@id': `${URL_PATH}#gallery`,
      name: 'The Twelve — Gold Sculptures in the gallery',
      numberOfItems: figures.length,
      itemListElement: figures.map((figure) => ({
        '@type': 'ListItem',
        position: figure.order,
        name: figure.name,
        url: `https://zodiacs.org/registry/${figure.slug}/`,
      })),
    },
  ],
};

// Only what the scene needs to letter a plinth and a hallmark, and what the
// card needs to describe the piece. No addresses.
const figureData = figures.map((figure) => ({
  slug: figure.slug,
  order: figure.order,
  lot: figure.lot,
  name: figure.name,
  glyph: figure.glyph,
  figure: figure.figure,
  epithet: figure.epithet,
  hue: figure.hue,
  element: figure.element,
  modality: figure.modality,
  ruler: figure.ruler,
  archetype: figure.archetype,
  dates: figure.dates,
  datesShort: figure.datesShort,
  star: figure.star,
  // The Dex Screener pair is venue routing, baked here exactly as the sign
  // pages bake it. Registry identity (mints) stays out of the page — the
  // card reads those live. Cancer and Sagittarius have no indexed pair and
  // show a quiet unavailable state instead.
  market: MARKET_PAIRS[figure.slug] ?? null,
}));

// Each row carries the sign's id, so /registry/gallery/#leo is a real
// fragment: without JavaScript it lands on Leo's line of the register,
// and the scene reads the same hash to stand in front of the sculpture.
const ledger = figures.map((figure) => `        <li class="ledger__row" id="${figure.slug}" style="--sign:${figure.hue}">
          <img class="ledger__plate" src="/assets/nuggets/thumb/${figure.slug}.png" alt="" width="72" height="72" loading="lazy" decoding="async" />
          <span class="ledger__lot">${esc(figure.lot)}</span>
          <a class="ledger__name" href="/registry/${figure.slug}/">${esc(figure.name)}</a>
          <span class="ledger__figure">${esc(figure.figure)}</span>
          <span class="ledger__class">${esc(figure.modality)} ${esc(figure.element.toLowerCase())} · ${esc(figure.ruler)}</span>
          <span class="ledger__dates">${esc(figure.dates)}</span>
        </li>`).join('\n');

const css = `
    :root {
      --bg: #060709; --bg-2: #0A0C11;
      --surface: rgba(10,12,17,0.82);
      --ink: #EEF1F7; --ink-2: #C6CCDA; --ink-mute: #8A93A6; --ink-dim: #6B7383;
      --hair: rgba(198,204,218,0.10); --hair-2: rgba(198,204,218,0.16);
      --serif: 'EB Garamond', Georgia, 'Times New Roman', serif;
      --sans: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
      --mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace;
      --ease: cubic-bezier(0.4, 0, 0.2, 1);
      --sign: #C6CCDA;
    }

    * { box-sizing: border-box; }
    html { -webkit-text-size-adjust: 100%; }
    body {
      margin: 0; background: var(--bg); color: var(--ink);
      font-family: var(--serif); font-size: 17px; line-height: 1.6;
      -webkit-font-smoothing: antialiased; overflow-x: hidden;
    }
    a { color: inherit; }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
    }

    ${wingNavCss()}

    /* ── The stage ──────────────────────────────────────────────────── */

    .stage {
      position: relative; display: flex; flex-direction: column;
      isolation: isolate; overflow: clip; padding-bottom: 30px;
    }
    .gallery-live .stage { min-height: 100svh; padding-bottom: 0; }
    /* No scene, no controls — the register below is the whole page. */
    html:not(.gallery-live) .stage__chrome,
    html:not(.gallery-live) .stage__mount,
    html:not(.gallery-live) .stage__scrim,
    html:not(.gallery-live) .stage__scrim-top { display: none; }
    .stage::before {
      content: ''; position: absolute; inset: 0; z-index: -2; pointer-events: none;
      background:
        radial-gradient(118% 74% at 50% 44%, rgba(30,37,53,0.62), transparent 72%),
        radial-gradient(1px 1px at 14% 22%, rgba(238,241,247,0.35), transparent 60%),
        radial-gradient(1px 1px at 78% 16%, rgba(238,241,247,0.28), transparent 60%),
        radial-gradient(1px 1px at 33% 78%, rgba(238,241,247,0.22), transparent 60%),
        radial-gradient(1px 1px at 88% 66%, rgba(238,241,247,0.30), transparent 60%),
        var(--bg);
    }
    .stage::after {
      content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none;
      background: radial-gradient(96% 70% at 50% 50%, transparent 52%, rgba(6,7,9,0.9) 100%);
    }
    /* Volumes scroll past the title on wide screens; the title keeps its
       contrast without a panel behind it. */
    .stage__scrim {
      position: absolute; inset: 0 auto 0 0; width: min(38%, 540px);
      z-index: 2; pointer-events: none; display: none;
      background: linear-gradient(to right, rgba(6,7,9,0.82) 0%, rgba(6,7,9,0.42) 46%, rgba(6,7,9,0) 100%);
      transition: opacity 420ms var(--ease);
    }
    @media (min-width: 900px) { .stage.is-ready .stage__scrim { display: block; } }
    .stage.is-open .stage__scrim { opacity: 0; }
    /* And a band across the top, so a tall figure passing behind the title
       dims before the lettering rather than fighting it. */
    .stage__scrim-top {
      position: absolute; inset: 0 0 auto 0; height: 240px;
      z-index: 2; pointer-events: none; opacity: 0;
      background: linear-gradient(to bottom,
        rgba(6,7,9,0.92) 0%, rgba(6,7,9,0.55) 55%, rgba(6,7,9,0) 100%);
      transition: opacity 700ms var(--ease);
    }
    .stage.is-ready .stage__scrim-top { opacity: 1; }
    .stage.is-open .stage__scrim-top { opacity: 0; }

    .stage__head {
      position: relative; z-index: 3; pointer-events: none;
      padding: calc(112px + env(safe-area-inset-top)) 26px 0;
      max-width: 560px;
      transition: opacity 420ms var(--ease);
    }
    .stage__head a { pointer-events: auto; }
    /* A figure drawn forward is the subject; the title steps back for it, and gets
       out of the way entirely where the card takes the lower screen. */
    .stage.is-open .stage__head { opacity: 0.12; }
    @media (max-width: 899.5px) { .stage.is-open .stage__head { opacity: 0; } }
    .kicker {
      margin: 0 0 10px; font-style: italic; font-size: 15px; color: var(--ink-mute);
    }
    .stage h1 {
      margin: 0; font-family: var(--serif); font-weight: 400;
      font-size: clamp(38px, 6.4vw, 62px); line-height: 1.02; letter-spacing: -0.012em;
    }
    .stage__lede {
      margin: 14px 0 0; max-width: 44ch; color: var(--ink-2); font-size: 17px;
    }

    .stage__mount {
      position: absolute; inset: 0; z-index: 1;
      touch-action: pan-y;
    }
    .stage__canvas { display: block; width: 100%; height: 100%; cursor: grab; }
    .stage__canvas:active { cursor: grabbing; }
    .is-open .stage__mount { touch-action: none; }

    /* The scene fades up once its faces are painted; until then the title
       card stands alone. */
    .stage__chrome, .stage__mount { opacity: 0; transition: opacity 700ms var(--ease); }
    .stage.is-ready .stage__chrome, .stage.is-ready .stage__mount { opacity: 1; }
    .stage:not(.is-ready) .stage__chrome { pointer-events: none; }

    .stage__chrome {
      position: relative; z-index: 3; margin-top: auto;
      display: flex; flex-direction: column; align-items: center; gap: 13px;
      padding: 26px 20px calc(24px + env(safe-area-inset-bottom));
    }
    /* The sculptures pass behind the controls, so the controls get a floor. */
    .stage__chrome::before {
      content: ''; position: absolute; inset: -70px 0 0; z-index: -1;
      pointer-events: none;
      background: linear-gradient(to bottom, rgba(6,7,9,0) 0%, rgba(6,7,9,0.72) 48%, rgba(6,7,9,0.94) 100%);
    }

    .rail {
      display: flex; align-items: center; gap: 2px; padding: 5px;
      border-radius: 999px; border: 1px solid var(--hair);
      background: rgba(10,12,17,0.6);
      backdrop-filter: saturate(140%) blur(16px);
      -webkit-backdrop-filter: saturate(140%) blur(16px);
      max-width: 100%; overflow-x: auto; scrollbar-width: none;
    }
    .rail::-webkit-scrollbar { display: none; }
    .rail__tick {
      flex: 0 0 auto; width: 33px; height: 33px; display: grid; place-items: center;
      border: 0; border-radius: 50%; background: none; cursor: pointer;
      color: var(--ink-dim); font-size: 15px; line-height: 1;
      transition: color 220ms var(--ease), background 220ms var(--ease), transform 220ms var(--ease);
    }
    .rail__tick:hover { color: var(--ink-2); background: rgba(198,204,218,0.07); }
    .rail__tick[aria-current='true'] {
      color: var(--sign); background: color-mix(in oklab, var(--sign) 16%, transparent);
      transform: scale(1.06);
    }
    .rail__tick:focus-visible { outline: 2px solid var(--sign); outline-offset: 2px; }
    .rail__glyph { display: block; }

    .stage__actions { display: flex; align-items: center; gap: 14px; }
    .stage__open {
      font-family: var(--sans); font-size: 14px; font-weight: 500;
      padding: 10px 20px; border-radius: 999px; cursor: pointer;
      color: var(--ink); background: rgba(198,204,218,0.09);
      border: 1px solid var(--hair-2);
      transition: background 220ms var(--ease), border-color 220ms var(--ease);
    }
    .stage__open:hover { background: rgba(198,204,218,0.15); border-color: rgba(198,204,218,0.28); }
    .stage__open:focus-visible { outline: 2px solid var(--ink-2); outline-offset: 2px; }

    .stage__hint {
      margin: 0; font-family: var(--sans); font-size: 12.5px; color: var(--ink-dim);
      text-align: center; max-width: 46ch;
    }
    .stage__scroll {
      font-family: var(--sans); font-size: 12px; color: var(--ink-dim);
      text-decoration: none; border-bottom: 1px solid var(--hair-2); padding-bottom: 2px;
    }
    .stage__scroll:hover { color: var(--ink-2); }

    /* ── The records card ───────────────────────────────────────────── */

    .card {
      position: absolute; z-index: 4; overflow-y: auto;
      background: var(--surface); border: 1px solid var(--hair-2);
      backdrop-filter: saturate(150%) blur(22px);
      -webkit-backdrop-filter: saturate(150%) blur(22px);
      box-shadow: 0 30px 80px -30px rgba(0,0,0,0.9);
      opacity: 0; transition: opacity 420ms var(--ease), transform 420ms var(--ease);
    }
    .card[hidden] { display: none; }
    .card.is-open { opacity: 1; transform: none; }
    @media (min-width: 900px) {
      .card {
        top: 50%; right: 34px; width: min(392px, 38vw);
        max-height: min(74svh, 640px); transform: translate(18px, -50%);
        border-radius: 20px; padding: 26px 26px 28px;
      }
      .card.is-open { transform: translate(0, -50%); }
    }
    @media (max-width: 899.5px) {
      .card {
        left: 12px; right: 12px; bottom: 12px; max-height: 58svh;
        transform: translateY(18px); border-radius: 20px; padding: 22px 20px 24px;
      }
    }

    .card__close {
      position: absolute; top: 14px; right: 14px; width: 32px; height: 32px;
      display: grid; place-items: center; border-radius: 50%; cursor: pointer;
      border: 1px solid var(--hair); background: rgba(198,204,218,0.05);
      color: var(--ink-2); font-family: var(--sans); font-size: 16px; line-height: 1;
      transition: background 200ms var(--ease), color 200ms var(--ease);
    }
    .card__close:hover { background: rgba(198,204,218,0.13); color: var(--ink); }
    .card__close:focus-visible { outline: 2px solid var(--sign); outline-offset: 2px; }

    .card__lot {
      margin: 0 0 10px; font-family: var(--mono); font-size: 10px;
      letter-spacing: 0.18em; text-transform: uppercase; color: var(--sign);
    }
    .card__name {
      margin: 0; font-weight: 400; font-size: clamp(30px, 4vw, 40px);
      line-height: 1.05; letter-spacing: -0.01em;
    }
    .card__figure {
      margin: 8px 0 0; font-style: italic; font-size: 16px; color: var(--ink-2);
    }

    /* ── The shop window ── */
    .card__market {
      margin: 18px 0 0; padding: 16px 0 0; border-top: 1px solid var(--hair);
    }
    .card__market-state { margin: 0; font-family: var(--mono); font-size: 11.5px; color: var(--ink-dim); }
    .card__price { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
    .card__price[hidden] { display: none; }
    .card__price-value {
      font-family: var(--serif); font-size: clamp(27px, 3vw, 33px);
      line-height: 1; color: var(--ink); font-variant-numeric: tabular-nums;
    }
    .card__price-change {
      font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.04em;
      padding: 3px 9px; border-radius: 999px; border: 1px solid var(--hair-2);
      color: var(--ink-mute);
    }
    .card__price-change--up {
      color: var(--ink);
      border-color: color-mix(in oklab, var(--sign) 55%, transparent);
      background: color-mix(in oklab, var(--sign) 14%, transparent);
    }
    .card__price-change--down { color: var(--ink-mute); }
    .card__cta { display: flex; align-items: center; gap: 12px; margin-top: 14px; flex-wrap: wrap; }
    .card__cta[hidden] { display: none; }
    .card__buy {
      flex: 1 1 auto; display: inline-flex; justify-content: center; align-items: center;
      gap: 8px; padding: 11px 18px; border-radius: 999px;
      background: rgba(238,241,247,0.10); border: 1px solid var(--hair-2);
      font-family: var(--sans); font-size: 14px; font-weight: 550; color: var(--ink);
      text-decoration: none;
      transition: background 220ms var(--ease), border-color 220ms var(--ease);
    }
    .card__buy:hover { background: rgba(238,241,247,0.16); border-color: rgba(198,204,218,0.32); }
    .card__buy:focus-visible { outline: 2px solid var(--sign); outline-offset: 2px; }
    .card__data {
      display: inline-flex; align-items: center; gap: 7px; padding: 4px 0;
      font-family: var(--sans); font-size: 13px; color: var(--ink-2);
      text-decoration: none; border-bottom: 1px solid var(--hair-2);
      transition: color 220ms var(--ease), border-color 220ms var(--ease);
    }
    .card__data:hover { color: var(--ink); border-color: var(--sign); }
    .card__data:focus-visible { outline: 2px solid var(--sign); outline-offset: 3px; }
    .card__market-grid {
      margin: 14px 0 0; display: grid; grid-template-columns: auto 1fr; gap: 8px 18px;
    }
    .card__market-grid[hidden] { display: none; }
    .card__market-grid dt {
      font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--ink-dim); align-self: center;
    }
    .card__market-grid dd {
      margin: 0; font-size: 15px; color: var(--ink-2); text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .card__risk {
      margin: 14px 0 0; font-family: var(--serif); font-style: italic;
      font-size: 11.5px; line-height: 1.55; color: var(--ink-dim);
    }
    .card__risk a { color: var(--ink-mute); }
    .card__risk a:hover { color: var(--ink-2); }

    .card__facts {
      margin: 20px 0 0; padding: 18px 0 0; border-top: 1px solid var(--hair);
      display: grid; grid-template-columns: auto 1fr; gap: 9px 18px;
    }
    .card__facts dt {
      font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--ink-dim); align-self: center;
    }
    .card__facts dd {
      margin: 0; font-size: 15.5px; color: var(--ink-2); text-align: right;
    }

    .card__records { margin: 20px 0 0; padding: 18px 0 0; border-top: 1px solid var(--hair); display: grid; gap: 10px; }
    .rec { display: grid; gap: 6px; }
    .rec__head { display: flex; align-items: baseline; gap: 8px; }
    .rec__chain {
      font-family: var(--sans); font-size: 13px; font-weight: 550; color: var(--ink);
    }
    .rec__role {
      font-family: var(--mono); font-size: 9px; letter-spacing: 0.1em;
      text-transform: uppercase; color: var(--ink-dim);
    }
    .rec__addr {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      width: 100%; padding: 9px 12px; cursor: pointer; text-align: left;
      border: 1px solid var(--hair); border-radius: 10px;
      background: rgba(198,204,218,0.04); color: var(--ink-2);
      font-family: var(--mono); font-size: 12px;
      transition: background 200ms var(--ease), border-color 200ms var(--ease);
    }
    .rec__addr:hover { background: rgba(198,204,218,0.09); border-color: var(--hair-2); }
    .rec__addr:focus-visible { outline: 2px solid var(--sign); outline-offset: 2px; }
    .rec__value { overflow: hidden; text-overflow: ellipsis; }
    .rec__copy { flex: 0 0 auto; font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-dim); }
    .rec__note { margin: 0; font-family: var(--mono); font-size: 11.5px; color: var(--ink-dim); }

    .card__entry {
      display: inline-flex; align-items: center; gap: 8px; margin-top: 20px;
      font-family: var(--sans); font-size: 14px; font-weight: 500; color: var(--ink);
      text-decoration: none; border-bottom: 1px solid var(--hair-2); padding-bottom: 3px;
      transition: border-color 220ms var(--ease);
    }
    .card__entry:hover { border-color: var(--sign); }
    .card__entry:focus-visible { outline: 2px solid var(--sign); outline-offset: 3px; }

    /* ── The register ───────────────────────────────────────────────── */

    .register { max-width: 1000px; margin: 0 auto; padding: 92px 26px 20px; }
    .register__head { max-width: 56ch; }
    .register h2 {
      margin: 0; font-weight: 400; font-size: clamp(28px, 4vw, 38px); line-height: 1.1;
    }
    .register__lede { margin: 12px 0 0; color: var(--ink-2); }

    .ledger { list-style: none; margin: 38px 0 0; padding: 0; }
    .ledger__row {
      scroll-margin-top: 96px;
      display: grid; align-items: center; gap: 2px 16px;
      grid-template-columns: 56px 34px 1fr;
      grid-template-areas: 'plate lot name' 'plate . figure' 'plate . class' 'plate . dates';
      padding: 16px 4px; border-top: 1px solid var(--hair);
    }
    .ledger__plate {
      grid-area: plate; width: 56px; height: 56px; object-fit: contain;
      align-self: center;
    }
    .ledger__row:last-child { border-bottom: 1px solid var(--hair); }
    .ledger__lot {
      grid-area: lot; font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em;
      color: var(--ink-dim);
    }
    .ledger__name {
      grid-area: name; font-size: 24px; text-decoration: none; color: var(--ink);
      border-bottom: 1px solid transparent; justify-self: start;
      transition: border-color 220ms var(--ease);
    }
    .ledger__name:hover { border-color: var(--sign); }
    .ledger__figure { grid-area: figure; font-style: italic; color: var(--ink-2); }
    .ledger__class {
      grid-area: class; font-family: var(--mono); font-size: 11px; color: var(--ink-mute);
    }
    .ledger__dates {
      grid-area: dates; font-family: var(--mono); font-size: 11px; color: var(--ink-dim);
    }
    @media (min-width: 760px) {
      .ledger__row {
        grid-template-columns: 64px 40px minmax(130px, 1fr) minmax(120px, 1fr) minmax(150px, 1fr) auto;
        grid-template-areas: 'plate lot name figure class dates';
        gap: 18px; padding: 12px 4px;
      }
      .ledger__plate { width: 64px; height: 64px; }
      .ledger__dates { text-align: right; }
    }

    /* ── Footer ─────────────────────────────────────────────────────── */

    .ftr {
      max-width: 1000px; margin: 70px auto 0; padding: 26px;
      border-top: 1px solid var(--hair);
      font-family: var(--sans); font-size: 12px; color: var(--ink-dim);
    }
    .ftr__row {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: 10px 18px; padding: 9px 0;
    }
    .ftr__links { display: flex; flex-wrap: wrap; gap: 8px 16px; }
    .ftr a { color: var(--ink-mute); text-decoration: none; }
    .ftr a:hover { color: var(--ink); }
    .ftr .mark {
      font-family: var(--serif); font-size: 13px; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--ink-2);
    }
    .ftr .mark span { color: var(--ink-dim); margin: 0 3px; }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.001ms !important; animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
      }
    }`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#060709" />
  <meta name="color-scheme" content="dark" />
  <script>
    /* The stage only reserves a viewport if there is something to draw in it.
       Settled here, before first paint, so a browser without WebGL — or
       without scripting — lays the register out straight away rather than
       shifting once the scene bundle arrives. */
    try {
      var probe = document.createElement('canvas');
      if (probe.getContext('webgl2') || probe.getContext('webgl')) {
        document.documentElement.classList.add('gallery-live');
      }
    } catch (e) {}
  </script>
  <title>The Gallery · The Twelve — Zodiacs.org</title>
  <meta name="description" content="${esc(DESCRIPTION)}" />
  <link rel="canonical" href="${URL_PATH}" />
  <script>
    window.plausible = window.plausible || function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };
    window.plausible.init = window.plausible.init || function (options) {
      window.plausible.o = options || {};
    };
    window.plausible.init({
      hashBasedRouting: false,
      transformRequest: function (payload) {
        var canonical = document.querySelector('link[rel="canonical"]');
        payload.u = canonical ? canonical.href : location.origin + location.pathname;
        if (payload.p && payload.p.url) delete payload.p.url;
        return payload;
      }
    });
  </script>
  <script async src="https://plausible.io/js/pa-HwF2IBb5Sw8eboNPSOgHv.js"></script>

  <meta property="og:site_name" content="Zodiacs" />
  <meta property="og:title" content="The Gallery · The Twelve — Zodiacs" />
  <meta property="og:description" content="${esc(DESCRIPTION)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${URL_PATH}" />
  <meta property="og:image" content="https://zodiacs.org/assets/og/v2/registry.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Zodiacs — the twelve Gold Sculptures of the official registry." />
  <meta property="og:locale" content="en_US" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="The Gallery · The Twelve — Zodiacs" />
  <meta name="twitter:description" content="${esc(DESCRIPTION)}" />
  <meta name="twitter:image" content="https://zodiacs.org/assets/og/v2/registry.png" />
  <meta name="twitter:image:alt" content="Zodiacs — the official registry of the Twelve." />

  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23060709'/%3E%3Cg%3E%3Ccircle cx='32' cy='10' r='3.4' fill='%23DE8E79'/%3E%3Ccircle cx='43' cy='12.9' r='3.4' fill='%23B9D4BE'/%3E%3Ccircle cx='51.1' cy='21' r='3.4' fill='%23B29DD0'/%3E%3Ccircle cx='54' cy='32' r='3.4' fill='%23B6D4E4'/%3E%3Ccircle cx='51.1' cy='43' r='3.4' fill='%23E0A9B4'/%3E%3Ccircle cx='43' cy='51.1' r='3.4' fill='%23B7D9B0'/%3E%3Ccircle cx='32' cy='54' r='3.4' fill='%23D3A9DE'/%3E%3Ccircle cx='21' cy='51.1' r='3.4' fill='%23B9DCE8'/%3E%3Ccircle cx='12.9' cy='43' r='3.4' fill='%23E0B080'/%3E%3Ccircle cx='10' cy='32' r='3.4' fill='%23C0DEA8'/%3E%3Ccircle cx='12.9' cy='21' r='3.4' fill='%23AE8FC9'/%3E%3Ccircle cx='21' cy='12.9' r='3.4' fill='%23A9D4C4'/%3E%3C/g%3E%3C/svg%3E" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/eb-garamond-latin-500-normal.woff2" />

  <style>
    /* Self-hosted faces — the same files the rest of the site uses. */
    @font-face { font-family: 'EB Garamond'; src: url('/fonts/eb-garamond-latin-400-normal.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
    @font-face { font-family: 'EB Garamond'; src: url('/fonts/eb-garamond-latin-500-normal.woff2') format('woff2'); font-weight: 500; font-style: normal; font-display: swap; }
    @font-face { font-family: 'EB Garamond'; src: url('/fonts/eb-garamond-latin-400-italic.woff2') format('woff2'); font-weight: 400; font-style: italic; font-display: swap; }
    @font-face { font-family: 'JetBrains Mono'; src: url('/fonts/jetbrains-mono-latin-wght-normal.woff2') format('woff2-variations'); font-weight: 300 600; font-style: normal; font-display: swap; }
  </style>

  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>

  <style>${css}
  </style>
</head>
<body>
  ${wingNavHtml({ includeSearch: true })}

  <main>
    <section class="stage" data-gallery-stage aria-labelledby="gallery-title">
      <div class="stage__mount" data-gallery-canvas></div>
      <div class="stage__scrim" aria-hidden="true"></div>
      <div class="stage__scrim-top" aria-hidden="true"></div>

      <header class="stage__head">
        <p class="kicker">Twelve gold sculptures, one to a sign.</p>
        <h1 id="gallery-title">The Gallery</h1>
        <p class="stage__lede">
          The Gold Sculptures of the Twelve, one to a sign. Draw one forward
          for its classification, its dates, and its addresses on Solana and
          Base.
        </p>
      </header>

      <div class="stage__chrome">
        <div class="rail" data-gallery-rail role="group" aria-label="The twelve sculptures"></div>
        <div class="stage__actions">
          <button class="stage__open" type="button" data-gallery-open>View Aries</button>
          <a class="stage__scroll" href="#register">The register ↓</a>
        </div>
        <p class="stage__hint">
          Drag or scroll to move along the row. Select a sculpture to draw it
          forward, then drag to turn it right around. Escape returns it.
        </p>
      </div>

      <aside class="card" data-gallery-card hidden aria-labelledby="card-name" aria-live="off">
        <button class="card__close" type="button" data-gallery-close aria-label="Return the sculpture">✕</button>
        <p class="card__lot" data-card-lot></p>
        <h2 class="card__name" id="card-name" data-card-name></h2>
        <p class="card__figure" data-card-figure></p>

        <div class="card__market">
          <p class="card__market-state" data-market-state>Loading market context.</p>
          <div class="card__price" data-market-price-row hidden>
            <span class="card__price-value" data-market-price></span>
            <span class="card__price-change" data-market-change></span>
          </div>
          <div class="card__cta" data-market-cta hidden>
            <a class="card__buy" data-market-jupiter rel="noopener noreferrer external nofollow">
              <span>Open Jupiter route</span><span aria-hidden="true">↗</span>
            </a>
            <a class="card__data" data-market-dexscreener rel="noopener noreferrer external nofollow">
              <span>View market data</span><span aria-hidden="true">↗</span>
            </a>
          </div>
          <dl class="card__market-grid" data-market-grid hidden></dl>
          <p class="card__risk">
            Independent third-party data, not a valuation or recommendation. It
            may be delayed or unavailable; prices and liquidity can change
            quickly, and a Zodiac can lose all market value. The route above
            opens an independent third-party venue; this Registry page does not
            request custody, signing, approvals, or transactions. Operator and
            economic-interest statements remain pending confirmation; see the
            <a href="/disclosure/">Disclosure</a>.
          </p>
        </div>

        <dl class="card__facts" data-card-facts></dl>
        <div class="card__records" data-card-records></div>
        <a class="card__entry" data-card-entry href="/registry/">
          <span>Open catalogue entry</span><span aria-hidden="true">→</span>
        </a>
      </aside>

      <p class="sr-only" role="status" aria-live="polite" data-gallery-live></p>
    </section>

    <section class="register" id="register">
      <div class="register__head">
        <h2>The register</h2>
        <p class="register__lede">
          The same twelve, as a list. Each entry opens the sign's catalogue
          record — lore and provenance, the native Solana mint, and the
          official Base representation.
        </p>
      </div>
      <ol class="ledger">
${ledger}
      </ol>
    </section>

    <footer class="ftr">
      <div class="ftr__row">
        <div class="mark">Zodiacs<span>·</span>org</div>
        <div>© MMXXVI</div>
      </div>
      <div class="ftr__row">
        <div class="ftr__links">
          <a href="/registry/">Registry</a>
          <a href="/registry/#verify">Verify</a>
          <a href="/thesis/">Thesis</a>
          <a href="/archive/">Archive</a>
          <a href="/sdk/">SDK</a>
          <a href="/disclosure/">${esc(EN['disclosure.linkLabel'])}</a>
          <a href="/privacy/">${esc(EN['disclosure.linkPrivacy'])}</a>
          <a href="/terms/">${esc(EN['disclosure.linkTerms'])}</a>
          <a href="/registry/zodiacs.registry.json">Record</a>
        </div>
        <div>Registry lookup/display tools: read-only</div>
      </div>
      <div class="ftr__row">
        <div class="ftr__links" aria-label="Official channels">
${CHANNELS.map((c) => `          <a href="${c.url}" rel="noopener noreferrer">${c.name}</a>`).join('\n')}
        </div>
        <div>Channels</div>
      </div>
    </footer>
  </main>

  <script type="application/json" id="gallery-figures">${JSON.stringify(figureData)}</script>
  <script defer src="/assets/gallery.js"></script>
  <script>${wingNavScript()}</script>
</body>
</html>
`;

await mkdir(PAGE_DIR, { recursive: true });
await writeFile(resolve(PAGE_DIR, 'index.html'), html, 'utf8');

process.stdout.write(
  `gallery: wrote registry/gallery/index.html and assets/gallery.js `
  + `(${figures.length} sculptures)\n`,
);
