// Generates /archive/ — the dated record of moments, press, and origin —
// plus its feeds (archive/feed.json, archive/rss.xml).
//
//   node scripts/build-archive.mjs
//
// Content comes from two sources:
//   - scripts/archive-data.mjs          (entries, press kit — quotes verbatim)
//   - registry/zodiacs.registry.json    (mint-proof validation, sign names)
//
// The output is committed static HTML, consistent with how this site ships
// (no runtime build). The page shares the catalogue design language: dark
// museum register in the Cosmic Void system: void surfaces, EB Garamond,
// ink hairlines, quiet mono labels.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ARCHIVE_META, ENTRY_TYPES, ARCHIVE_ENTRIES, PRESS_KIT } from './archive-data.mjs';
import { CHANNELS } from './sign-data.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const registry = JSON.parse(
  await readFile(resolve(root, 'public/registry/zodiacs.registry.json'), 'utf8')
);

const esc = (s) => String(s)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const escAttr = (s) => esc(s).replaceAll('"', '&quot;');

function assetFor(slug) {
  const asset = registry.assets.find((a) => a.sign === slug);
  if (!asset) throw new Error(`Registry missing sign: ${slug}`);
  return asset;
}

function solanaMintFor(slug) {
  const rep = assetFor(slug).representations.find((r) => r.chain === 'solana');
  if (!rep) throw new Error(`Registry missing Solana representation: ${slug}`);
  return rep.address;
}

// ---- Validation (the build fails rather than shipping a wrong record) ----
{
  const ids = new Set();
  for (const entry of ARCHIVE_ENTRIES) {
    if (!/^[a-z0-9-]+$/.test(entry.id)) throw new Error(`Bad entry id: ${entry.id}`);
    if (ids.has(entry.id)) throw new Error(`Duplicate entry id: ${entry.id}`);
    ids.add(entry.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || Number.isNaN(Date.parse(entry.date))) {
      throw new Error(`Bad date on ${entry.id}: ${entry.date}`);
    }
    if (!ENTRY_TYPES.includes(entry.type)) {
      throw new Error(`Unknown type on ${entry.id}: ${entry.type}`);
    }
    for (const slug of entry.signs || []) assetFor(slug);
    if (entry.mintProof) {
      const official = solanaMintFor(entry.mintProof.sign);
      if (official !== entry.mintProof.address) {
        throw new Error(
          `mintProof mismatch on ${entry.id}: data says ${entry.mintProof.address}, ` +
          `registry says ${official}`
        );
      }
    }
  }
}

const entries = [...ARCHIVE_ENTRIES].sort((a, b) => b.date.localeCompare(a.date));

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

function displayDate(entry) {
  if (entry.dateDisplay) return entry.dateDisplay;
  const [y, m, d] = entry.date.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

// ---- Rendering ------------------------------------------------------------

function renderQuote(entry, quote) {
  let text = esc(quote.text).replaceAll('\n', '<br />');
  if (entry.mintProof && quote.text.includes(entry.mintProof.address)) {
    text = text.replace(
      entry.mintProof.address,
      `<mark class="arc__mint">${entry.mintProof.address}</mark>`
    );
  }
  const cite = quote.sourceUrl
    ? ` <a class="arc__quote-src" href="${escAttr(quote.sourceUrl)}" rel="noopener noreferrer">View source ↗</a>`
    : '';
  const note = quote.note
    ? `\n          <p class="arc__quote-note">${esc(quote.note)}</p>`
    : '';
  return `        <figure class="arc__quote">
          <blockquote><p>${text}</p></blockquote>
          <figcaption>${esc(quote.attribution)}${cite}</figcaption>${note}
        </figure>`;
}

function renderProof(entry) {
  if (!entry.mintProof) return '';
  const sign = assetFor(entry.mintProof.sign);
  return `        <div class="arc__proof">
          <span class="arc__tick" aria-hidden="true">✓</span>
          <span class="arc__proof-text">Matches the official record</span>
          <a class="arc__proof-link" href="/collect/${entry.mintProof.sign}/">${esc(sign.displayName)} ↗</a>
          <a class="arc__proof-link" href="/registry/zodiacs.registry.json">Registry entry</a>
        </div>`;
}

function renderSigns(entry) {
  if (!entry.signs || !entry.signs.length) return '';
  const links = entry.signs.map((slug) =>
    `<a href="/collect/${slug}/" aria-label="${escAttr(assetFor(slug).displayName)}"><img src="/assets/icons/${slug}.png" alt="" loading="lazy" decoding="async" /></a>`
  ).join('');
  return `        <div class="arc__signs">${links}</div>`;
}

function renderSources(entry) {
  if (!entry.sources || !entry.sources.length) return '';
  const rows = entry.sources.map((s) => {
    const external = /^https?:/.test(s.url);
    return `          <a class="arc__src" href="${escAttr(s.url)}"${external ? ' rel="noopener noreferrer"' : ''}>${esc(s.label)}${external ? ' ↗' : ''}</a>`;
  }).join('\n');
  return `        <div class="arc__sources">\n${rows}\n        </div>`;
}

function renderEntry(entry) {
  const body = (entry.body || []).map((p) => `        <p class="arc__body">${esc(p)}</p>`).join('\n');
  const quotes = (entry.quotes || []).map((q) => renderQuote(entry, q)).join('\n');
  return `      <article class="arc reveal" id="${entry.id}">
        <div class="arc__rail">
          <span class="arc__date">${esc(displayDate(entry))}</span>
          <span class="arc__type arc__type--${entry.type}">${esc(entry.type)}</span>
        </div>
        <div class="arc__main">
        <h3 class="arc__title">${esc(entry.title)}</h3>
        <p class="arc__lede">${esc(entry.lede)}</p>
${[body, quotes, renderProof(entry), renderSigns(entry), renderSources(entry)].filter(Boolean).join('\n')}
        </div>
      </article>`;
}

function renderRecord() {
  const parts = [];
  let year = null;
  for (const entry of entries) {
    const y = entry.date.slice(0, 4);
    if (y !== year) {
      year = y;
      parts.push(`      <div class="arc-year" aria-hidden="true"><span>${y}</span></div>`);
    }
    parts.push(renderEntry(entry));
  }
  return parts.join('\n');
}

function renderPressKit() {
  const facts = PRESS_KIT.facts.map(([k, v]) =>
    `          <div class="row"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`
  ).join('\n');
  const assets = PRESS_KIT.assets.map((a) => {
    const external = /^https?:/.test(a.url);
    return `          <a class="rec__link" href="${escAttr(a.url)}"${external ? ' rel="noopener noreferrer"' : ''}>${esc(a.label)}${external ? ' ↗' : ''}</a>`;
  }).join('\n');
  return `      <p class="kit__boiler">${esc(PRESS_KIT.boilerplate)}</p>
        <div class="rows">
${facts}
        </div>
        <div class="rec__links kit__assets">
${assets}
        </div>
        <p class="kit__contact">${esc(PRESS_KIT.contact)}</p>`;
}

function jsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Zodiacs.org', item: 'https://zodiacs.org/' },
          { '@type': 'ListItem', position: 2, name: 'The Archive', item: ARCHIVE_META.url }
        ]
      },
      {
        '@type': 'CollectionPage',
        '@id': `${ARCHIVE_META.url}#page`,
        url: ARCHIVE_META.url,
        name: `${ARCHIVE_META.title} — ${ARCHIVE_META.tagline}`,
        description: ARCHIVE_META.description,
        inLanguage: 'en',
        isPartOf: { '@type': 'WebSite', name: 'Zodiacs.org', url: 'https://zodiacs.org/' },
        hasPart: entries.map((e) => ({
          '@type': 'Article',
          name: e.title,
          datePublished: e.date,
          url: `${ARCHIVE_META.url}#${e.id}`
        }))
      }
    ]
  };
}

function renderPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#060709" />
  <meta name="color-scheme" content="dark" />
  <title>The Archive · Zodiacs.org</title>
  <meta name="description" content="${escAttr(ARCHIVE_META.description)}" />
  <link rel="canonical" href="${ARCHIVE_META.url}" />
  <link rel="alternate" type="application/rss+xml" title="Zodiacs — The Archive" href="/archive/rss.xml" />
  <link rel="alternate" type="application/feed+json" title="Zodiacs — The Archive" href="/archive/feed.json" />

  <meta property="og:site_name" content="Zodiacs" />
  <meta property="og:title" content="The Archive — Zodiacs" />
  <meta property="og:description" content="${escAttr(ARCHIVE_META.description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${ARCHIVE_META.url}" />
  <meta property="og:image" content="https://zodiacs.org/assets/og/v2/share.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Zodiacs — twelve sculptural gold figures, native on Solana and bridged to Base." />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="The Archive — Zodiacs" />
  <meta name="twitter:description" content="${escAttr(ARCHIVE_META.description)}" />
  <meta name="twitter:image" content="https://zodiacs.org/assets/og/v2/share.png" />

  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23060709'/%3E%3Cg%3E%3Ccircle cx='32' cy='10' r='3.4' fill='%23DE8E79'/%3E%3Ccircle cx='43' cy='12.9' r='3.4' fill='%23B9D4BE'/%3E%3Ccircle cx='51.1' cy='21' r='3.4' fill='%23B29DD0'/%3E%3Ccircle cx='54' cy='32' r='3.4' fill='%23B6D4E4'/%3E%3Ccircle cx='51.1' cy='43' r='3.4' fill='%23E0A9B4'/%3E%3Ccircle cx='43' cy='51.1' r='3.4' fill='%23B7D9B0'/%3E%3Ccircle cx='32' cy='54' r='3.4' fill='%23D3A9DE'/%3E%3Ccircle cx='21' cy='51.1' r='3.4' fill='%23B9DCE8'/%3E%3Ccircle cx='12.9' cy='43' r='3.4' fill='%23E0B080'/%3E%3Ccircle cx='10' cy='32' r='3.4' fill='%23C0DEA8'/%3E%3Ccircle cx='12.9' cy='21' r='3.4' fill='%23AE8FC9'/%3E%3Ccircle cx='21' cy='12.9' r='3.4' fill='%23A9D4C4'/%3E%3C/g%3E%3C/svg%3E" />

  <style>
    /* Self-hosted faces — same files the rest of the site uses. */
    @font-face { font-family: 'EB Garamond'; src: url('/fonts/eb-garamond-latin-400-normal.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
    @font-face { font-family: 'EB Garamond'; src: url('/fonts/eb-garamond-latin-500-normal.woff2') format('woff2'); font-weight: 500; font-style: normal; font-display: swap; }
    @font-face { font-family: 'EB Garamond'; src: url('/fonts/eb-garamond-latin-400-italic.woff2') format('woff2'); font-weight: 400; font-style: italic; font-display: swap; }
    @font-face { font-family: 'JetBrains Mono'; src: url('/fonts/jetbrains-mono-latin-wght-normal.woff2') format('woff2-variations'); font-weight: 300 600; font-style: normal; font-display: swap; }
  </style>

  <script type="application/ld+json">
${JSON.stringify(jsonLd(), null, 2)}
  </script>

  <style>
    :root {
      --bg: #060709; --bg-2: #0A0C11;
      --surface: #0F121A; --surface-2: #151925;
      --hair: rgba(198,204,218,0.10); --hair-2: rgba(198,204,218,0.22); --hair-3: rgba(198,204,218,0.42);
      --gold: #C6CCDA; --gold-bright: #EEF1F7; --gold-deep: #8E96AB;
      --live: #C6CCDA;
      --ink: #EEF1F7; --ink-2: #C6CCDA; --ink-dim: #8E96AB; --ink-mute: #7A8397;
      --serif: 'EB Garamond', Georgia, Cambria, serif;
      --mono: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
      --display: 'EB Garamond', Georgia, serif;
      --ease: cubic-bezier(0.32, 0.72, 0, 1);
      --z-grain: 1; --z-base: 10; --z-nav: 40;
    }
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      background: var(--bg); color: var(--ink);
      font-family: var(--serif);
      -webkit-text-size-adjust: 100%; text-size-adjust: 100%;
      -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
    }
    html { scroll-behavior: smooth; scrollbar-color: rgba(198,204,218,0.14) #060709; scrollbar-width: thin; }
    @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
    body {
      min-height: 100dvh;
      background:
        radial-gradient(120% 60% at 50% -10%, rgba(198,204,218,0.05), transparent 62%),
        radial-gradient(120% 80% at 50% 110%, rgba(198,204,218,0.02), transparent 62%),
        var(--bg);
    }
    [id] { scroll-margin-top: 96px; }
    img, svg { display: block; max-width: 100%; }
    a { color: inherit; }
    button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
    :focus-visible {
      outline: 1px solid var(--gold); outline-offset: 3px;
      box-shadow: 0 0 0 4px rgba(198,204,218,0.12);
    }
    :focus:not(:focus-visible) { outline: 0; }
    .skip {
      position: absolute; left: -9999px; top: 0;
      background: var(--surface-2); color: var(--gold);
      padding: 10px 16px; font-family: var(--mono); font-size: 11px;
      letter-spacing: 0.22em; text-transform: uppercase;
      border: 1px solid var(--hair-3); z-index: 60;
    }
    .skip:focus { left: 12px; top: 12px; }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
    }

    .grain {
      position: fixed; inset: 0; pointer-events: none; z-index: var(--z-grain);
      opacity: 0.035; mix-blend-mode: overlay;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.88  0 0 0 0 0.90  0 0 0 0 0.96  0 0 0 0.85 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
    }
    .stars {
      position: fixed; inset: 0; pointer-events: none; z-index: var(--z-grain);
      opacity: 0.34; mix-blend-mode: screen;
      background-image:
        radial-gradient(1px 1px at 8% 12%, rgba(238,241,247,0.7), transparent 60%),
        radial-gradient(1px 1px at 22% 38%, rgba(198,204,218,0.6), transparent 60%),
        radial-gradient(1px 1px at 71% 8%, rgba(238,241,247,0.45), transparent 60%),
        radial-gradient(1px 1px at 88% 24%, rgba(198,204,218,0.55), transparent 60%),
        radial-gradient(1px 1px at 44% 62%, rgba(238,241,247,0.4), transparent 60%),
        radial-gradient(1px 1px at 92% 71%, rgba(238,241,247,0.5), transparent 60%);
      background-attachment: fixed;
    }

    .label {
      font-family: var(--display); font-weight: 500; font-size: 9.5px;
      letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-dim);
    }

    /* ── Floating pill header ── */
    .hdr-wrap {
      position: sticky; top: 12px; z-index: var(--z-nav);
      display: flex; justify-content: center; pointer-events: none;
      padding: max(0px, env(safe-area-inset-top)) 16px 0; margin-top: 14px;
    }
    .hdr {
      pointer-events: auto;
      display: inline-flex; align-items: center; gap: 16px;
      height: 48px; padding: 0 6px 0 18px;
      background: rgba(18,13,9,0.72);
      backdrop-filter: saturate(160%) blur(18px);
      -webkit-backdrop-filter: saturate(160%) blur(18px);
      border: 1px solid var(--hair-2);
      box-shadow:
        inset 0 1px 0 rgba(238,241,247,0.10), inset 0 -1px 0 rgba(0,0,0,0.4),
        0 8px 28px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.35);
    }
    .hdr a { text-decoration: none; }
    .hdr__mark {
      font-family: var(--display); font-weight: 400; font-size: 13px; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--ink); white-space: nowrap;
    }
    .hdr__mark .dim { color: var(--gold); font-weight: 500; }
    .hdr__mark .sep { color: var(--ink-mute); margin: 0 4px; }
    .hdr__nav {
      display: inline-flex; align-items: center; gap: 8px;
      font-family: var(--mono); font-size: 10px; letter-spacing: 0.24em;
      text-transform: uppercase; color: var(--ink-2);
      height: 36px; padding: 0 6px 0 14px;
      border-left: 1px solid var(--hair-2);
      transition: color 320ms var(--ease);
    }
    .hdr__nav:hover { color: var(--gold-bright); }
    .hdr__nav .chip {
      display: inline-grid; place-items: center; width: 26px; height: 26px;
      border: 1px solid var(--hair-2); background: rgba(198,204,218,0.05);
      color: var(--gold); font-size: 11px;
      transition: transform 420ms var(--ease), border-color 320ms var(--ease);
    }
    .hdr__nav:hover .chip { transform: translate(2px, -1px); border-color: var(--gold); }
    /* The pill must fit a 390px viewport; the second link yields on
       narrow screens (Thesis stays reachable from the page footer). */
    @media (max-width: 430px) {
      .hdr { gap: 12px; padding-left: 14px; }
      .hdr__nav + .hdr__nav { display: none; }
    }

    /* ── Page shell — a reading column ── */
    .pg {
      max-width: 920px; margin: 0 auto; position: relative; z-index: var(--z-base);
      padding: 0 20px; overflow-x: clip;
    }

    /* ── Archive hero ── */
    .lead { padding: 64px 0 30px; }
    .lead__eyebrow {
      display: inline-flex; align-items: center; gap: 10px;
      margin-bottom: 26px; padding: 6px 14px 6px 10px;
      background: rgba(198,204,218,0.05);
      border: 1px solid var(--hair-2); border-radius: 999px;
      font-family: var(--mono); font-size: 9.5px;
      letter-spacing: 0.26em; text-transform: uppercase; color: var(--gold);
    }
    .lead__eyebrow .g { color: var(--ink-dim); }
    .lead__title {
      margin: 0 0 16px;
      font-family: var(--serif); font-weight: 400;
      font-size: clamp(44px, 9vw, 88px);
      line-height: 0.96; letter-spacing: -0.012em; color: var(--ink);
      text-wrap: balance;
    }
    .lead__title .it { font-style: italic; color: var(--gold-bright); }
    .lead__lede {
      margin: 0 0 18px; max-width: 56ch;
      font-family: var(--serif); font-size: clamp(17px, 2.4vw, 20px);
      line-height: 1.5; color: var(--ink-2); text-wrap: pretty;
    }
    .lead__meta {
      display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 14px;
      font-family: var(--mono); font-size: 9.5px;
      letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-dim);
    }
    .lead__meta a {
      color: var(--gold); text-decoration: none;
      border-bottom: 1px solid rgba(198,204,218,0.32); padding-bottom: 2px;
      transition: color 280ms var(--ease), border-bottom-color 280ms var(--ease);
    }
    .lead__meta a:hover { color: var(--gold-bright); border-bottom-color: var(--gold); }

    /* ── Section frame ── */
    .sec { padding: 48px 0 8px; }
    .sec__head { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
    .sec__head .line { flex: 1; height: 1px; background: var(--hair); }
    .sec__title {
      margin: 0; font-family: var(--mono); font-weight: 400; font-size: 10.5px;
      letter-spacing: 0.26em; text-transform: uppercase; color: var(--gold);
    }

    /* ── Year rule ── */
    .arc-year {
      display: flex; align-items: center; gap: 14px;
      margin: 38px 0 26px;
    }
    .arc-year:first-child { margin-top: 0; }
    .arc-year span {
      font-family: var(--display); font-weight: 400; font-style: normal;
      letter-spacing: 0.06em;
      font-size: 21px; line-height: 1; color: var(--gold-deep);
    }
    .arc-year::after { content: ""; flex: 1; height: 1px; background: var(--hair); }

    /* ── Entry ── */
    .arc { padding: 0 0 40px; }
    .arc__rail {
      display: flex; align-items: baseline; gap: 12px;
      margin-bottom: 10px;
    }
    .arc__date {
      font-family: var(--mono); font-size: 10px;
      letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-dim);
    }
    .arc__type {
      padding: 3px 9px;
      border: 1px solid var(--hair-2);
      font-family: var(--mono); font-size: 8.5px;
      letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-mute);
    }
    .arc__type--moment { color: var(--gold); border-color: var(--hair-2); }
    .arc__type--coverage { color: var(--ink-dim); }
    .arc__type--origin { color: var(--gold-bright); border-color: var(--hair-3); }
    .arc__type--context { color: var(--ink-mute); }
    .arc__title {
      margin: 0 0 10px;
      font-family: var(--serif); font-weight: 400;
      font-size: clamp(26px, 4.4vw, 34px); line-height: 1.05;
      letter-spacing: -0.01em; color: var(--ink); text-wrap: balance;
    }
    .arc__lede {
      margin: 0 0 14px; max-width: 58ch;
      font-family: var(--serif); font-size: 17px; line-height: 1.52;
      color: var(--ink-2); text-wrap: pretty;
    }
    .arc__body {
      margin: 0 0 14px; max-width: 58ch;
      font-family: var(--serif); font-size: 15.5px; line-height: 1.6;
      color: var(--ink-dim); text-wrap: pretty;
    }

    /* Quote — hairline left rule, mono attribution */
    .arc__quote { margin: 18px 0; padding: 2px 0 2px 18px; border-left: 1px solid var(--hair-3); }
    .arc__quote blockquote { margin: 0; }
    .arc__quote blockquote p {
      margin: 0 0 8px; max-width: 52ch;
      font-family: var(--serif); font-style: italic;
      font-size: 17.5px; line-height: 1.5; color: var(--ink); text-wrap: pretty;
    }
    .arc__quote figcaption {
      font-family: var(--mono); font-size: 9px;
      letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-mute);
    }
    .arc__quote-src {
      margin-left: 10px; color: var(--gold); text-decoration: none;
      border-bottom: 1px solid rgba(198,204,218,0.32); padding-bottom: 1px;
      transition: color 280ms var(--ease), border-bottom-color 280ms var(--ease);
    }
    .arc__quote-src:hover { color: var(--gold-bright); border-bottom-color: var(--gold); }
    .arc__quote-note {
      margin: 8px 0 0; max-width: 52ch;
      font-family: var(--serif); font-size: 13.5px; line-height: 1.5;
      color: var(--ink-dim);
    }
    .arc__mint {
      background: rgba(198,204,218,0.12);
      color: var(--gold-bright);
      font-family: var(--mono); font-style: normal;
      font-size: 0.72em; letter-spacing: 0.02em;
      padding: 2px 6px;
      border: 1px solid var(--hair-2);
      overflow-wrap: anywhere;
    }

    /* Mint-proof chip — borrows the verifier's official treatment */
    .arc__proof {
      display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px;
      margin: 16px 0;
      padding: 13px 16px;
      border: 1px solid rgba(198,204,218,0.42);
      background:
        linear-gradient(180deg, rgba(198,204,218,0.05), transparent 70%),
        var(--surface);
    }
    .arc__tick {
      display: inline-grid; place-items: center;
      width: 22px; height: 22px; border-radius: 50%;
      border: 1px solid var(--gold); color: var(--gold-bright);
      font-size: 11px; flex: 0 0 auto;
    }
    .arc__proof-text {
      font-family: var(--mono); font-size: 9.5px;
      letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-2);
    }
    .arc__proof-link {
      font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.18em;
      text-transform: uppercase; color: var(--gold); text-decoration: none;
      border-bottom: 1px solid rgba(198,204,218,0.32); padding-bottom: 2px;
      transition: color 280ms var(--ease), border-bottom-color 280ms var(--ease);
    }
    .arc__proof-link:hover { color: var(--gold-bright); border-bottom-color: var(--gold); }

    .arc__signs { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
    .arc__signs a {
      display: grid; place-items: center; width: 36px; height: 36px;
      border-radius: 50%; border: 1px solid var(--hair);
      transition: border-color 320ms var(--ease), transform 220ms var(--ease);
    }
    .arc__signs a:hover { border-color: var(--hair-3); transform: translateY(-1px); }
    .arc__signs img { width: 18px; height: 18px; object-fit: contain; opacity: 0.72; }
    .arc__signs a:hover img { opacity: 1; }

    .arc__sources { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
    .arc__src {
      font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--ink-dim); text-decoration: none;
      border-bottom: 1px solid transparent; align-self: flex-start;
      padding-bottom: 2px; line-height: 1.7;
      transition: color 280ms var(--ease), border-bottom-color 280ms var(--ease);
    }
    .arc__src:hover { color: var(--gold-bright); border-bottom-color: var(--hair-3); }

    /* ── Press kit ── */
    .rows { border-top: 1px solid var(--hair); }
    .row {
      display: flex; justify-content: space-between; align-items: baseline;
      gap: 16px; padding: 11px 0; border-bottom: 1px solid var(--hair);
    }
    .row .k {
      flex: 0 0 auto; font-family: var(--mono); font-size: 10px;
      letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-dim);
    }
    .row .v { font-family: var(--serif); font-style: italic; font-size: 16px; color: var(--ink); text-align: right; }
    .kit__boiler {
      margin: 0 0 22px; max-width: 58ch;
      font-family: var(--serif); font-size: 17px; line-height: 1.55; color: var(--ink-2);
    }
    .rec__links { display: flex; flex-wrap: wrap; gap: 10px 18px; }
    .kit__assets { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--hair); }
    .rec__link {
      font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--gold); text-decoration: none;
      border-bottom: 1px solid rgba(198,204,218,0.32); padding-bottom: 2px;
      line-height: 1.8;
      transition: color 280ms var(--ease), border-bottom-color 280ms var(--ease);
    }
    .rec__link:hover { color: var(--gold-bright); border-bottom-color: var(--gold); }
    .kit__contact {
      margin: 22px 0 0; max-width: 58ch;
      font-family: var(--serif); font-size: 15px; line-height: 1.55; color: var(--ink-dim);
    }

    /* ── Return ── */
    .back { display: flex; flex-direction: column; gap: 12px; padding: 40px 0 0; }
    @media (min-width: 560px) { .back { flex-direction: row; } .back .btn { flex: 1; } }
    .btn {
      position: relative; display: inline-flex; align-items: center;
      justify-content: space-between; gap: 10px;
      height: 56px; padding: 0 8px 0 22px;
      font-family: var(--mono); font-size: 11px; letter-spacing: 0.26em;
      text-transform: uppercase; color: var(--ink);
      border: 1px solid var(--hair-3); text-decoration: none;
      box-shadow: inset 0 1px 0 rgba(238,241,247,0.12), inset 0 -1px 0 rgba(0,0,0,0.5);
      transition: border-color 420ms var(--ease), color 420ms var(--ease), transform 220ms var(--ease);
    }
    .btn:hover { border-color: var(--gold); color: var(--gold-bright); }
    .btn:active { transform: scale(0.985); }
    .btn--primary { color: var(--gold-bright); }
    .btn--primary::before {
      content: ""; position: absolute; inset: 4px;
      border: 1px solid var(--hair); pointer-events: none;
      transition: border-color 420ms var(--ease);
    }
    .btn--primary:hover::before { border-color: var(--hair-2); }
    .btn .arr {
      display: inline-grid; place-items: center; width: 40px; height: 40px;
      background: rgba(198,204,218,0.06); border: 1px solid var(--hair-2);
      color: var(--gold); font-size: 13px;
      transition: transform 420ms var(--ease), background 320ms var(--ease), border-color 320ms var(--ease);
    }
    .btn:hover .arr { transform: translate(3px, -1px); background: rgba(198,204,218,0.14); border-color: var(--gold); }

    /* ── Footer ── */
    .ftr {
      margin-top: 64px; padding: 36px 0 56px; border-top: 1px solid var(--hair);
      font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.22em;
      text-transform: uppercase; color: var(--ink-mute);
    }
    .ftr__row { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; }
    .ftr__row + .ftr__row { margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--hair); }
    .ftr .mark { color: var(--ink-2); letter-spacing: 0.18em; font-family: var(--serif); text-transform: none; font-size: 13px; }
    .ftr .mark .g { color: var(--gold); }
    .ftr__links { display: inline-flex; flex-wrap: wrap; gap: 12px 16px; }
    .ftr__links a { color: var(--ink-dim); text-decoration: none; transition: color 320ms var(--ease); }
    .ftr__links a:hover { color: var(--gold); }

    /* ── Reveal ── */
    .reveal {
      opacity: 0; transform: translateY(18px); filter: blur(6px);
      transition: opacity 900ms var(--ease), transform 900ms var(--ease), filter 900ms var(--ease);
      will-change: opacity, transform, filter;
    }
    .reveal.is-in { opacity: 1; transform: translateY(0); filter: blur(0); }
    @media (prefers-reduced-motion: reduce) {
      .reveal { transition: none !important; opacity: 1 !important; transform: none !important; filter: none !important; }
    }

    /* ── Desktop: date rail beside each entry ── */
    @media (min-width: 1020px) {
      .arc {
        display: grid;
        grid-template-columns: 168px minmax(0, 1fr);
        column-gap: 40px;
        align-items: start;
      }
      .arc__rail {
        flex-direction: column; align-items: flex-start; gap: 10px;
        margin-bottom: 0;
        position: sticky; top: 96px;
      }
      .lead { padding-top: 88px; }
    }
  </style>
</head>
<body>
  <a href="#main" class="skip">Skip to content</a>
  <div class="stars" aria-hidden="true"></div>
  <div class="grain" aria-hidden="true"></div>

  <div class="hdr-wrap">
    <header class="hdr" role="banner">
      <a class="hdr__mark" href="/collect/"><span>Zodiacs</span><span class="sep">·</span><span class="dim">org</span></a>
      <a class="hdr__nav" href="/collect/#official-twelve"><span>The Twelve</span><span class="chip">↗</span></a>
      <a class="hdr__nav" href="/thesis/"><span>Thesis</span><span class="chip">→</span></a>
    </header>
  </div>

  <main class="pg" id="main">
    <section class="lead" aria-labelledby="arc-title">
      <span class="lead__eyebrow">The Archive <span class="g">·</span> Annals of the Twelve</span>
      <h1 class="lead__title" id="arc-title">What the record <span class="it">remembers.</span></h1>
      <p class="lead__lede">
        Dated moments, press, and origin records for the twelve Zodiacs.
        Quotes are verbatim; addresses are checked against the registry;
        entries stand even when their links do not.
      </p>
      <div class="lead__meta">
        <span>Since 2024</span>
        <span>·</span>
        <span>${entries.length} entries</span>
        <span>·</span>
        <a href="/archive/rss.xml">RSS</a>
        <a href="/archive/feed.json">JSON Feed</a>
      </div>
    </section>

    <section class="sec" aria-label="The record">
      <div class="sec__head"><h2 class="sec__title">The record</h2><span class="line"></span></div>
${renderRecord()}
    </section>

    <section class="sec reveal" id="press-kit" aria-label="Press kit">
      <div class="sec__head"><h2 class="sec__title">Press kit</h2><span class="line"></span></div>
${renderPressKit()}
    </section>

    <nav class="back" aria-label="Return">
      <a class="btn btn--primary" href="/collect/">
        <span>The Registry</span><span class="arr">→</span>
      </a>
      <a class="btn" href="/thesis/">
        <span>Read the thesis</span><span class="arr">→</span>
      </a>
    </nav>

    <footer class="ftr">
      <div class="ftr__row">
        <div class="mark">Zodiacs<span class="g">·</span>org</div>
        <div>© MMXXVI</div>
      </div>
      <div class="ftr__row">
        <div class="ftr__links">
          <a href="/collect/#registry">Registry</a>
          <a href="/collect/#verify">Verify</a>
          <a href="/thesis/">Thesis</a>
          <a href="/sdk/">SDK</a>
          <a href="/registry/zodiacs.registry.json">Record</a>
        </div>
        <div>Read-only</div>
      </div>
      <div class="ftr__row">
        <div class="ftr__links" aria-label="Official channels">
${CHANNELS.map((c) => `          <a href="${c.url}" rel="noopener noreferrer">${c.name}</a>`).join('\n')}
        </div>
        <div>Channels</div>
      </div>
    </footer>
  </main>

  <script>
  (function () {
    'use strict';
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var reveals = document.querySelectorAll('.reveal');
    if (!reduced && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('is-in'); });
    }
  })();
  </script>
</body>
</html>
`;
}

// ---- Feeds ----------------------------------------------------------------

function feedContentHtml(entry) {
  const parts = [`<p>${esc(entry.lede)}</p>`];
  for (const p of entry.body || []) parts.push(`<p>${esc(p)}</p>`);
  for (const q of entry.quotes || []) {
    parts.push(`<blockquote><p>${esc(q.text).replaceAll('\n', '<br />')}</p><p>${esc(q.attribution)}</p></blockquote>`);
  }
  return parts.join('');
}

function externalUrl(entry) {
  const fromQuote = (entry.quotes || []).find((q) => q.sourceUrl);
  if (fromQuote) return fromQuote.sourceUrl;
  const fromSource = (entry.sources || []).find((s) => /^https?:/.test(s.url));
  return fromSource ? fromSource.url : null;
}

function buildJsonFeed() {
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Zodiacs — The Archive',
    home_page_url: ARCHIVE_META.url,
    feed_url: 'https://zodiacs.org/archive/feed.json',
    description: ARCHIVE_META.description,
    language: 'en',
    items: entries.map((entry) => {
      const item = {
        id: `${ARCHIVE_META.url}#${entry.id}`,
        url: `${ARCHIVE_META.url}#${entry.id}`,
        title: entry.title,
        content_html: feedContentHtml(entry),
        content_text: entry.lede,
        date_published: `${entry.date}T12:00:00Z`
      };
      const ext = externalUrl(entry);
      if (ext) item.external_url = ext;
      return item;
    })
  };
}

function buildRss() {
  const items = entries.map((entry) => `    <item>
      <title>${esc(entry.title)}</title>
      <link>${ARCHIVE_META.url}#${entry.id}</link>
      <guid isPermaLink="true">${ARCHIVE_META.url}#${entry.id}</guid>
      <pubDate>${new Date(`${entry.date}T12:00:00Z`).toUTCString()}</pubDate>
      <description>${esc(entry.lede)}</description>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Zodiacs — The Archive</title>
    <link>${ARCHIVE_META.url}</link>
    <atom:link href="https://zodiacs.org/archive/rss.xml" rel="self" type="application/rss+xml" />
    <description>${esc(ARCHIVE_META.description)}</description>
    <language>en</language>
    <lastBuildDate>${new Date(`${entries[0].date}T12:00:00Z`).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

// ---- Write ----------------------------------------------------------------

const outDir = resolve(root, 'public/archive');
await mkdir(outDir, { recursive: true });

const html = renderPage();
await writeFile(resolve(outDir, 'index.html'), html, 'utf8');
console.log(`Wrote /archive/index.html (${html.length} bytes)`);

const feed = JSON.stringify(buildJsonFeed(), null, 2) + '\n';
await writeFile(resolve(outDir, 'feed.json'), feed, 'utf8');
console.log(`Wrote /archive/feed.json (${feed.length} bytes)`);

const rss = buildRss();
await writeFile(resolve(outDir, 'rss.xml'), rss, 'utf8');
console.log(`Wrote /archive/rss.xml (${rss.length} bytes)`);

console.log(`Done — ${entries.length} entries.`);
