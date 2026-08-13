// Generates the twelve official token records (/registry/{sign}/index.html).
// The top-level /{sign}/ URLs belong to
// the astrology guides rendered by Astro.
//
//   node scripts/build-sign-pages.mjs
//
// Content comes from two sources:
//   - public/registry/zodiacs.registry.json (addresses, metadata — source of truth)
//   - scripts/sign-data.mjs                 (sign stories, history, key objects)
//
// The output is committed static HTML, consistent with how this site ships
// (no runtime build). Pages share the main site's design language: dark
// museum register in the Cosmic Void system: void surfaces, EB Garamond,
// ink hairlines, quiet mono labels.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  SIGN_PAGES, MARKET_PAIRS, CHANNELS, SIGN_ORDER,
  jupiterSwapUrl, dexscreenerUrl
} from './sign-data.mjs';
import {
  CONSTELLATIONS, HYG_ATTRIBUTION, validateConstellations
} from './constellation-data.mjs';
import { NAV_SIGNS, wingNavHtml, wingNavCss, wingNavScript } from './wing-nav.mjs';
import { brandIconLinkMarkup } from '../src/lib/brand-icons.mjs';
import { renderTradeRegion } from '../src/trade/entry.mjs';
import { EN } from '../src/strings/en.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

// The official token records live at /registry/ (301 from the old /collect/
// path via vercel.json).
const BASE = '/registry';
const signPath = (slug) => `${BASE}/${slug}/`;
const signUrl = (slug) => `https://zodiacs.org${signPath(slug)}`;

const registry = JSON.parse(
  await readFile(resolve(root, 'public/registry/zodiacs.registry.json'), 'utf8')
);

const constellationErrors = validateConstellations(SIGN_ORDER);
if (constellationErrors.length) {
  throw new Error(`Invalid constellation data:\n${constellationErrors.join('\n')}`);
}

const titleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const esc = (s) => String(s)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function assetFor(slug) {
  const asset = registry.assets.find((a) => a.sign === slug);
  if (!asset) throw new Error(`Registry missing sign: ${slug}`);
  return asset;
}

function repFor(asset, chain) {
  return asset.representations.find((r) => r.chain === chain);
}

function pageModel(slug) {
  const page = SIGN_PAGES[slug];
  const asset = assetFor(slug);
  const solana = repFor(asset, 'solana');
  const base = repFor(asset, 'base');
  const idx = SIGN_ORDER.indexOf(slug);
  const prev = SIGN_ORDER[(idx + 11) % 12];
  const next = SIGN_ORDER[(idx + 1) % 12];
  return {
    slug, page, asset, solana, base,
    name: asset.displayName,
    ticker: solana.symbol,
    order: idx + 1,
    prev: { slug: prev, name: assetFor(prev).displayName, lot: SIGN_PAGES[prev].lot },
    next: { slug: next, name: assetFor(next).displayName, lot: SIGN_PAGES[next].lot },
    // The sign's pastel — the panel tints itself with it, the same way the
    // rail's disc and the page's accents do.
    hue: NAV_SIGNS.find((s) => s.slug === slug)?.hue ?? null,
    constellation: CONSTELLATIONS[slug],
    pair: MARKET_PAIRS[slug] || null,
    jupiter: jupiterSwapUrl(solana.address),
    dexscreener: dexscreenerUrl(slug, solana.address)
  };
}

function renderConstellationSvg(m) {
  const width = 720;
  const height = 460;
  const pad = 58;
  const stars = m.constellation.stars.map((star) => ({ ...star }));
  const rawRa = stars.map((star) => star.ra);
  const wrapsZero = Math.max(...rawRa) - Math.min(...rawRa) > 12;
  const meanDec = stars.reduce((sum, star) => sum + star.dec, 0) / stars.length;
  const cosDec = Math.max(0.35, Math.cos(meanDec * Math.PI / 180));

  for (const star of stars) {
    const ra = wrapsZero && star.ra < 12 ? star.ra + 24 : star.ra;
    star.mapX = ra * 15 * cosDec;
    star.mapY = star.dec;
  }

  const xs = stars.map((star) => star.mapX);
  const ys = stars.map((star) => star.mapY);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const usedWidth = spanX * scale;
  const usedHeight = spanY * scale;

  for (const star of stars) {
    // Right ascension increases eastward; conventional sky maps place east to
    // the left, hence the deliberate horizontal reversal.
    star.x = width / 2 + usedWidth / 2 - (star.mapX - minX) * scale;
    star.y = height / 2 + usedHeight / 2 - (star.mapY - minY) * scale;
  }

  const byId = new Map(stars.map((star) => [star.id, star]));
  const focus = byId.get(m.constellation.focusId);
  const lines = m.constellation.edges.map(([from, to]) => {
    const a = byId.get(from);
    const b = byId.get(to);
    return `  <path d="M ${a.x.toFixed(2)} ${a.y.toFixed(2)} L ${b.x.toFixed(2)} ${b.y.toFixed(2)}"/>`;
  }).join('\n');
  const points = stars.map((star) => {
    const radius = Math.max(1.8, Math.min(5.8, 6.2 - star.mag));
    if (star.kind === 'open-cluster') {
      return `  <g class="cluster" transform="translate(${star.x.toFixed(2)} ${star.y.toFixed(2)})" aria-label="${esc(star.name)} open cluster"><circle r="10"/><circle class="cluster-dot" cx="-4" cy="-2" r="1.7"/><circle class="cluster-dot" cx="3" cy="-4" r="1.4"/><circle class="cluster-dot" cx="2" cy="4" r="1.5"/><circle class="cluster-dot" cx="-3" cy="5" r="1.1"/></g>`;
    }
    return `  <circle class="star${star.id === m.constellation.focusId ? ' focus' : ''}" cx="${star.x.toFixed(2)}" cy="${star.y.toFixed(2)}" r="${radius.toFixed(2)}"/>`;
  }).join('\n');
  const labelX = Math.min(width - 150, Math.max(22, focus.x + 16));
  const labelY = Math.min(height - 22, Math.max(34, focus.y - 14));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">
  <title id="title">${esc(m.name)} constellation map</title>
  <desc id="description">Brighter stars in ${esc(m.name)} plotted from HYG Database J2000 coordinates. ${esc(focus.name)} is highlighted. Guide lines are not official constellation boundaries.</desc>
  <metadata>HYG Database v4.0, CC BY-SA 4.0, source blob ${HYG_ATTRIBUTION.sourceBlob}. Guide segments authored by Zodiacs.org.</metadata>
  <defs>
    <radialGradient id="field" cx="50%" cy="46%" r="66%"><stop offset="0" stop-color="${m.hue}" stop-opacity=".08"/><stop offset="1" stop-color="#07080c" stop-opacity="0"/></radialGradient>
    <filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="720" height="460" rx="28" fill="#090b10"/>
  <rect width="720" height="460" rx="28" fill="url(#field)"/>
  <g fill="none" stroke="${m.hue}" stroke-opacity=".34" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">${lines}</g>
  <g fill="#eef1f7" fill-opacity=".86">${points}</g>
  <circle cx="${focus.x.toFixed(2)}" cy="${focus.y.toFixed(2)}" r="14" fill="none" stroke="${m.hue}" stroke-width="1.5" stroke-opacity=".9" filter="url(#glow)"/>
  <text x="${labelX.toFixed(2)}" y="${labelY.toFixed(2)}" fill="${m.hue}" font-family="ui-monospace, monospace" font-size="12" letter-spacing="1.5">${esc(focus.name.toUpperCase())}</text>
  <text x="24" y="430" fill="#8e96ab" font-family="ui-monospace, monospace" font-size="9" letter-spacing="2">J2000 · EAST LEFT · ${m.constellation.abbreviation.toUpperCase()}</text>
</svg>`;
}

function provenanceBeats(m) {
  const beats = [];
  if (m.page.provenancePrelude) beats.push(m.page.provenancePrelude);
  beats.push(
    { era: 'c. 1000 BC', place: 'Babylon',
      body: m.page.provenanceBabylon },
    { era: 'c. 450 BC', place: 'Babylon',
      body: 'Fixed as one of twelve equal signs when Babylonian astronomers divide the sun’s path into the first zodiac — the frame still in use today.' },
    { era: 'c. 270 BC', place: 'The Hellenistic world',
      body: m.page.provenanceGreece },
    { era: 'AD 150', place: 'Alexandria',
      body: 'Canonized in Ptolemy’s Almagest among the forty-eight classical constellations; carried through the Arabic observatories into medieval Europe.' },
    { era: 'AD 1515', place: 'Nuremberg',
      body: 'Engraved in Albrecht Dürer’s celestial planispheres, the first printed star charts of the Western sky.' },
    { era: 'Date pending provenance', place: 'Solana',
      body: `The Registry identifies one canonical SPL ${m.name} record. Its earliest deploy receipt and establishment year have not yet been published, so this date is not presented as verified.` },
    { era: 'Present', place: 'Solana · Base',
      body: 'One identity, two official representations: the native Solana origin and its bridged Base counterpart, publicly verifiable in the registry.' }
  );
  return beats;
}

function jsonLd(m) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Zodiacs.org', item: 'https://zodiacs.org/' },
          { '@type': 'ListItem', position: 2, name: 'Astrofolio', item: 'https://zodiacs.org/terminal/' },
          { '@type': 'ListItem', position: 3, name: 'Zodiacs Registry', item: 'https://zodiacs.org/registry/' },
          { '@type': 'ListItem', position: 4, name: m.name, item: signUrl(m.slug) }
        ]
      },
      {
        '@type': 'WebPage',
        '@id': `${signUrl(m.slug)}#page`,
        url: signUrl(m.slug),
        name: `${m.name} — Official ${m.ticker} Zodiac Token · Sign ${m.order} of 12`,
        description: `${m.name} is the transferable token for the ${m.name} sign. Verify its official addresses, market history, constellation, and collection artwork.`,
        inLanguage: 'en',
        isPartOf: { '@type': 'WebSite', name: 'Zodiacs.org', url: 'https://zodiacs.org/' },
        primaryImageOfPage: `https://zodiacs.org/assets/nuggets/${m.slug}.png`,
        about: {
          '@type': 'Thing',
          name: `${m.name} — official ${m.ticker} zodiac token`,
          alternateName: [m.ticker, `${m.name} token`],
          description: m.asset.metadata.shortBio,
          identifier: [
            { '@type': 'PropertyValue', propertyID: 'solana-mint', value: m.solana.address },
            { '@type': 'PropertyValue', propertyID: 'base-contract', value: m.base.address }
          ],
          sameAs: `https://zodiacs.org/registry/zodiacs.registry.json`
        }
      }
    ]
  };
}

function render(m) {
  const p = m.page;
  const meta = m.asset.metadata;
  const beats = provenanceBeats(m);
  const focusObject = m.constellation.stars.find((star) => star.id === m.constellation.focusId);
  const focusKind = focusObject.kind === 'open-cluster' ? 'open cluster' : 'principal star';
  const ogImageAlt = `${m.name} — official Zodiac token, sign ${m.order} of 12 in the Zodiacs.org Registry.`;
  const specRows = [
    ['Position', `${m.order} of 12`, true],
    ['Dates', p.datesDisplay, true],
    ['Element', titleCase(meta.element)],
    ['Modality', titleCase(meta.modality)],
    ['Ruler', meta.rulingPlanet],
    ['Archetype', meta.archetype],
    [m.constellation.stars.find((star) => star.id === m.constellation.focusId)?.kind === 'open-cluster' ? 'Principal object' : 'Principal star', `${p.principalStar.name} — ${p.principalStar.note}`],
    ['Early name', p.babylonianRecord],
    ['Networks', 'Original SPL token on Solana · Official ERC-20 counterpart on Base'],
    ['Official set', `One ${m.name} identity in the twelve-sign Registry`]
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="zodiacs-registry-trade-enabled" content="0" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#060709" />
  <meta name="color-scheme" content="dark" />
  <title>${esc(m.name)} — Official ${esc(m.ticker)} Zodiac Token · Sign ${m.order} of 12 | Zodiacs.org</title>
  <meta name="description" content="${esc(`${m.name} is the transferable token for the ${m.name} sign. Verify its official addresses, market history, constellation, and collection artwork.`)}" />
  <link rel="canonical" href="${signUrl(m.slug)}" />
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
        payload.r = null;
        if (payload.p && payload.p.url) delete payload.p.url;
        return payload;
      }
    });
  </script>
  <script async src="https://plausible.io/js/pa-HwF2IBb5Sw8eboNPSOgHv.js"></script>

  <meta property="og:site_name" content="Zodiacs" />
  <meta property="og:title" content="${esc(m.name)} · Official ${esc(m.ticker)} Token — Zodiacs" />
  <meta property="og:description" content="${esc(`The official ${m.name} zodiac token: verified addresses, market history, constellation, and collection artwork.`)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${signUrl(m.slug)}" />
  <meta property="og:image" content="https://zodiacs.org/assets/og/v2/registry/${m.slug}.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${esc(ogImageAlt)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(m.name)} · Official ${esc(m.ticker)} Token — Zodiacs" />
  <meta name="twitter:description" content="${esc(`The official ${m.name} zodiac token: verified addresses, market history, constellation, and collection artwork.`)}" />
  <meta name="twitter:image" content="https://zodiacs.org/assets/og/v2/registry/${m.slug}.png" />
  <meta name="twitter:image:alt" content="${esc(ogImageAlt)}" />

  ${brandIconLinkMarkup()}

  <style>
    /* Self-hosted faces — same files the rest of the site uses. */
    @font-face { font-family: 'EB Garamond'; src: url('/fonts/eb-garamond-latin-400-normal.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
    @font-face { font-family: 'EB Garamond'; src: url('/fonts/eb-garamond-latin-500-normal.woff2') format('woff2'); font-weight: 500; font-style: normal; font-display: swap; }
    @font-face { font-family: 'EB Garamond'; src: url('/fonts/eb-garamond-latin-400-italic.woff2') format('woff2'); font-weight: 400; font-style: italic; font-display: swap; }
    @font-face { font-family: 'JetBrains Mono'; src: url('/fonts/jetbrains-mono-latin-wght-normal.woff2') format('woff2-variations'); font-weight: 300 600; font-style: normal; font-display: swap; }
  </style>

  <script type="application/ld+json">
${JSON.stringify(jsonLd(m), null, 2)}
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
      --vermilion: #D4603F;
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
    .label--gold { color: var(--gold); }

    /* ── Unified site nav (Part AA) — shared wing nav module (wing-nav.mjs) ── */
    ${wingNavCss()}

    /* ── Page shell ── */
    .pg {
      max-width: 1140px; margin: 0 auto; position: relative; z-index: var(--z-base);
      padding: 0 20px; overflow-x: clip;
    }

    /* ── Lot header ── */
    .lot { padding: calc(94px + env(safe-area-inset-top)) 0 36px; position: relative; }
    .lot__crumbs {
      display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
      margin: 0 0 24px; padding: 0; list-style: none;
      color: var(--ink-mute); font-family: var(--mono); font-size: 8.5px;
      letter-spacing: 0.14em; text-transform: uppercase;
    }
    .lot__crumbs li { display: inline-flex; align-items: center; min-height: 44px; }
    .lot__crumbs li + li::before { content: "/"; margin-right: 6px; color: var(--hair-3); }
    .lot__crumbs a { min-height: 44px; display: inline-flex; align-items: center; color: var(--ink-dim); text-underline-offset: 4px; }
    .lot__crumbs a:hover { color: var(--ink); }
    .lot__eyebrow {
      display: flex; align-items: center; gap: 10px; width: 100%;
      margin-bottom: 28px;
      font-family: var(--display); font-weight: 500; font-size: 9px;
      letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold);
    }
    .lot__eyebrow::after {
      content: ""; flex: 1 1 auto; height: 1px;
      background: linear-gradient(90deg, var(--hair-2), transparent);
    }
    .lot__eyebrow .g { color: var(--ink-dim); }
    .lot__title {
      margin: 0 0 14px;
      font-family: var(--serif); font-weight: 400;
      font-size: clamp(56px, 11vw, 124px);
      line-height: 0.92; letter-spacing: -0.012em; color: var(--ink);
      text-wrap: balance;
    }
    .lot__title-icon {
      display: inline-block;
      width: 0.76em;
      height: 0.76em;
      margin-left: 0.08em;
      vertical-align: -0.08em;
      line-height: 0;
      filter: drop-shadow(0 8px 22px rgba(0,0,0,0.34));
    }
    .lot__title-icon img { display: block; width: 100%; height: 100%; border-radius: 50%; }
    .lot__epithet {
      margin: 0 0 10px; max-width: 30ch;
      font-family: var(--serif); font-style: italic;
      font-size: clamp(19px, 3vw, 26px); line-height: 1.35; color: var(--gold-bright);
      text-wrap: pretty;
    }
    .lot__intro {
      margin: 20px 0 0; max-width: 62ch;
      font-family: var(--serif); font-size: clamp(17px, 2.2vw, 20px);
      line-height: 1.55; color: var(--ink-2); text-wrap: pretty;
    }
    .lot__meta {
      display: grid; gap: 12px; align-items: center;
      margin-top: 22px; padding-top: 14px;
      border-top: 1px solid var(--hair);
    }
    .lot__dates {
      font-family: var(--mono); font-size: 10.5px;
      letter-spacing: 0.26em; text-transform: uppercase; color: var(--ink-dim);
    }
    .lot__next {
      display: inline-grid; grid-template-columns: 28px auto auto; align-items: center; gap: 9px;
      min-height: 44px; justify-self: start; padding: 4px 0;
      color: var(--ink-2);
      font-family: var(--display); font-weight: 500; font-size: 10px;
      letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none;
      transition: color 160ms cubic-bezier(0.23,1,0.32,1), transform 120ms cubic-bezier(0.23,1,0.32,1);
    }
    .lot__next picture { display: block; width: 28px; height: 28px; }
    .lot__next img { width: 100%; height: 100%; border-radius: 50%; }
    .lot__next strong { color: var(--gold-bright); font-weight: 500; }
    .lot__next > span:last-child { transition: transform 160ms cubic-bezier(0.23,1,0.32,1); }
    .lot__next:active { transform: scale(0.97); }
    @media (hover: hover) and (pointer: fine) {
      .lot__next:hover { color: var(--ink); }
      .lot__next:hover > span:last-child { transform: translateX(3px); }
    }
    @media (min-width: 700px) {
      .lot__meta { grid-template-columns: minmax(0, 1fr) auto; gap: 24px; }
      .lot__next { justify-self: end; }
    }

    /* ── Editorial split ── */
    .split { display: grid; grid-template-columns: 1fr; gap: 40px; padding-bottom: 24px; }
    @media (min-width: 960px) {
      .split { grid-template-columns: 0.92fr 1.08fr; gap: 56px; align-items: start; }
      .split__figure { position: sticky; top: 86px; }
    }
    .figure__gallery {
      display: inline-flex; align-items: center; gap: 7px; min-height: 44px; margin-top: 8px;
      font-family: var(--display); font-size: 12px; letter-spacing: 0.04em;
      color: var(--ink-dim); text-decoration: none;
      border-bottom: 1px solid var(--hair-2); padding-bottom: 2px;
      transition: color 200ms ease, border-color 200ms ease;
    }
    .figure__gallery:hover { color: var(--gold-bright); border-color: var(--gold); }

    /* Museum plinth card */
    .card {
      position: relative;
      background:
        radial-gradient(120% 60% at 50% 0%, rgba(198,204,218,0.06), transparent 55%),
        linear-gradient(180deg, var(--surface-2) 0%, var(--surface) 100%);
      border: 1px solid var(--hair-3);
      box-shadow:
        inset 0 1px 0 rgba(238,241,247,0.14), inset 0 -1px 0 rgba(0,0,0,0.5),
        0 18px 40px -22px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.4);
    }
    .card__inner { padding: 18px; border: 1px solid var(--hair); margin: 8px; }
    .card__corner { position: absolute; width: 10px; height: 10px; border-color: var(--gold); border-style: solid; opacity: 0.55; }
    .card__corner--tl { top: 4px; left: 4px; border-width: 1px 0 0 1px; }
    .card__corner--tr { top: 4px; right: 4px; border-width: 1px 1px 0 0; }
    .card__corner--bl { bottom: 4px; left: 4px; border-width: 0 0 1px 1px; }
    .card__corner--br { bottom: 4px; right: 4px; border-width: 0 1px 1px 0; }
    .card__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .stage {
      position: relative; height: clamp(340px, 44vw, 460px);
      display: flex; align-items: flex-end; justify-content: center;
      padding: 12px 0 28px; isolation: isolate; overflow: hidden;
    }
    .stage::before {
      content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 42%;
      background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.10) 60%, rgba(0,0,0,0.22) 100%);
      pointer-events: none; z-index: 0;
    }
    .stage::after {
      content: ""; position: absolute; left: 14%; right: 14%; bottom: 20px; height: 1px;
      background: linear-gradient(90deg, transparent 0%, rgba(198,204,218,0.55) 22%, rgba(198,204,218,0.55) 78%, transparent 100%);
      pointer-events: none; z-index: 0;
    }
    .stage img {
      position: relative; z-index: 1; width: auto; height: auto;
      max-width: 86%; max-height: 100%; object-fit: contain;
      filter: drop-shadow(0 6px 10px rgba(20,14,6,0.55)) drop-shadow(0 2px 4px rgba(36,26,12,0.65));
    }
    .card__caption {
      margin-top: 4px; text-align: center;
      font-family: var(--mono); font-size: 9.5px;
      letter-spacing: 0.24em; text-transform: uppercase; color: var(--ink-mute);
    }
    .card__caption .g { color: var(--gold); }

    /* ── Section frame ── */
    .sec { padding: 56px 0 8px; }
    .sec__head { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .sec__head .line { flex: 1; height: 1px; background: var(--hair); }
    .sec__title {
      margin: 0; font-family: var(--mono); font-weight: 400; font-size: 10.5px;
      letter-spacing: 0.26em; text-transform: uppercase; color: var(--gold);
    }

    /* Token fact rows */
    .rows { border-top: 1px solid var(--hair); }
    .row {
      display: flex; justify-content: space-between; align-items: baseline;
      gap: 16px; padding: 11px 0; border-bottom: 1px solid var(--hair);
    }
    .row .k {
      flex: 0 0 auto; font-family: var(--mono); font-size: 10px;
      letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-dim);
    }
    .row .v { font-family: var(--serif); font-style: italic; font-size: 16.5px; color: var(--ink); text-align: right; }
    .row .v.mono { font-family: var(--mono); font-style: normal; font-size: 12px; color: var(--ink-2); letter-spacing: 0.04em; }

    /* Sign story */
    .note { max-width: 62ch; }
    .note__lede {
      margin: 0 0 26px;
      font-family: var(--serif); font-size: clamp(19px, 2.6vw, 23px);
      line-height: 1.5; color: var(--ink); text-wrap: pretty;
    }
    .note__lede::first-letter {
      font-size: 3.1em; float: left; line-height: 0.8;
      padding: 6px 12px 0 0; color: var(--gold-bright); font-style: italic;
    }
    .note p {
      margin: 0 0 20px;
      font-family: var(--serif); font-size: 16.5px; line-height: 1.62;
      color: var(--ink-2); text-wrap: pretty;
    }

    /* Why this record matters — an open editorial grid, not a card wall. */
    .value {
      display: grid; grid-template-columns: 1fr;
      border-top: 1px solid var(--hair);
    }
    .value__item { padding: 18px 0 20px; border-bottom: 1px solid var(--hair); }
    .value__k {
      display: block; margin-bottom: 8px;
      font-family: var(--mono); font-size: 9px; letter-spacing: 0.2em;
      text-transform: uppercase; color: var(--gold);
    }
    .value__v {
      margin: 0; max-width: 48ch;
      font-family: var(--serif); font-size: 15.5px; line-height: 1.55; color: var(--ink-2);
    }
    @media (min-width: 700px) {
      .value { grid-template-columns: 1fr 1fr; column-gap: 32px; }
    }

    /* Constellation record */
    .constellation {
      display: grid; gap: 26px; align-items: center;
    }
    .constellation__map {
      position: relative; padding: 7px;
      background: rgba(198,204,218,0.025);
      border: 1px solid var(--hair-2); border-radius: 30px;
      box-shadow: inset 0 1px 0 rgba(238,241,247,0.08);
    }
    .constellation__map img { width: 100%; height: auto; border-radius: 23px; }
    .constellation__copy { max-width: 54ch; }
    .constellation__lede {
      margin: 0 0 18px; font-family: var(--serif); font-size: clamp(20px, 2.8vw, 27px);
      line-height: 1.35; color: var(--ink); text-wrap: pretty;
    }
    .constellation__body {
      margin: 0 0 18px; font-family: var(--serif); font-size: 15.5px;
      line-height: 1.58; color: var(--ink-2); text-wrap: pretty;
    }
    .constellation__source {
      margin: 0; font-family: var(--mono); font-size: 8.5px;
      line-height: 1.75; letter-spacing: 0.11em; color: var(--ink-mute);
    }
    .constellation__source a { color: var(--ink-dim); text-underline-offset: 3px; }
    @media (min-width: 820px) {
      .constellation { grid-template-columns: minmax(0, 1.28fr) minmax(260px, 0.72fr); gap: 48px; }
    }

    /* Provenance timeline */
    .prov { position: relative; padding-left: 26px; }
    .prov::before {
      content: ""; position: absolute; left: 4px; top: 8px; bottom: 8px; width: 1px;
      background: linear-gradient(180deg, transparent, var(--hair-3) 8%, var(--hair-3) 92%, transparent);
    }
    .prov__item { position: relative; padding: 0 0 26px; }
    .prov__item:last-child { padding-bottom: 4px; }
    .prov__item::before {
      content: ""; position: absolute; left: -26px; top: 7px;
      width: 9px; height: 9px; border-radius: 50%;
      background: var(--bg); border: 1px solid var(--gold);
      box-shadow: 0 0 10px rgba(198,204,218,0.35);
    }
    .prov__era {
      display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px;
      font-family: var(--mono); font-size: 10px;
      letter-spacing: 0.22em; text-transform: uppercase; color: var(--gold);
    }
    .prov__era .place { color: var(--ink-mute); }
    .prov__body {
      margin: 0; max-width: 56ch;
      font-family: var(--serif); font-size: 15.5px; line-height: 1.58; color: var(--ink-2);
    }

    /* Record (addresses) */
    .rec {
      border: 1px solid var(--hair-2);
      background: linear-gradient(180deg, rgba(198,204,218,0.03), transparent 40%), var(--surface);
      padding: 22px 20px 20px;
    }
    .rec__row {
      display: flex; justify-content: space-between; align-items: center;
      gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--hair); flex-wrap: wrap;
    }
    .rec__row:last-of-type { border-bottom: 0; }
    .rec__k {
      font-family: var(--mono); font-size: 9.5px;
      letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-mute);
    }
    .rec__k .net { color: var(--ink-dim); }
    .rec__links { display: flex; flex-wrap: wrap; gap: 10px 18px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--hair); }
    .rec__link {
      display: inline-flex; align-items: center; min-height: 44px;
      font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.16em;
      text-transform: uppercase; color: var(--gold); text-decoration: none;
      border-bottom: 1px solid rgba(198,204,218,0.32); padding-bottom: 2px;
      transition: color 280ms var(--ease), border-bottom-color 280ms var(--ease);
    }
    .rec__link:hover { color: var(--gold-bright); border-bottom-color: var(--gold); }

    .copychip {
      display: inline-flex; align-items: center; gap: 8px;
      min-height: 44px; padding: 7px 11px; border: 1px solid var(--hair-2);
      background: rgba(198,204,218,0.04); color: var(--ink-2);
      cursor: pointer; font-family: var(--mono); font-size: 11.5px; letter-spacing: 0.04em;
      transition: border-color 280ms var(--ease), color 280ms var(--ease), transform 220ms var(--ease);
    }
    .copychip:hover { border-color: var(--hair-3); color: var(--ink); }
    .copychip:active { transform: scale(0.97); }
    .copychip__icon { color: var(--gold); font-size: 12px; line-height: 1; }
    .copychip.is-copied { border-color: rgba(95,160,140,0.55); color: var(--live); }
    .copychip.is-copied .copychip__icon { color: var(--live); }

    /* Market panel */
    .market {
      position: relative; border: 1px solid var(--hair);
      background: linear-gradient(180deg, rgba(198,204,218,0.025), transparent 62%), rgba(14,10,7,0.52);
    }
    .market::after {
      content: ""; position: absolute; top: 0; right: 0; width: 10px; height: 10px;
      border-top: 1px solid var(--hair-3); border-right: 1px solid var(--hair-3); opacity: 0.7;
    }
    .market__head {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;
      padding: 15px 16px 13px; border-bottom: 1px solid var(--hair);
    }
    .market__label {
      display: block; margin-bottom: 6px;
      font-family: var(--mono); font-size: 9px; letter-spacing: 0.24em;
      text-transform: uppercase; color: var(--ink-dim);
    }
    .market__copy { margin: 0; font-family: var(--serif); font-size: 13.5px; line-height: 1.45; color: var(--ink-dim); }
    .market__source {
      flex: 0 0 auto; margin-top: 1px;
      font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.2em;
      text-transform: uppercase; color: var(--ink-mute); text-decoration: none;
      border-bottom: 1px solid transparent;
    }
    .market__source:hover { color: var(--gold-bright); border-bottom-color: var(--hair-3); }
    .market__grid { display: grid; grid-template-columns: 1fr 1fr; }
    @media (min-width: 640px) { .market__grid { grid-template-columns: repeat(4, 1fr); } }
    .market__cell { min-height: 72px; padding: 13px 14px 12px; border-bottom: 1px solid var(--hair); border-right: 1px solid var(--hair); }
    .market__cell:nth-child(2n) { border-right: 0; }
    @media (min-width: 640px) {
      .market__cell:nth-child(2n) { border-right: 1px solid var(--hair); }
      .market__cell:nth-child(4n) { border-right: 0; }
    }
    .market__k { margin-bottom: 7px; font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-mute); }
    .market__v { font-family: var(--serif); font-style: italic; font-size: 15px; line-height: 1.15; color: var(--ink-2); }
    .market__v--mono { font-family: var(--mono); font-style: normal; font-size: 11.5px; letter-spacing: 0.03em; }
    .market__v--up { color: var(--gold-bright); }
    .market__v--down { color: var(--vermilion); }
    .market__state { margin: 0; padding: 15px 16px 16px; font-family: var(--serif); font-style: italic; font-size: 13.5px; color: var(--ink-mute); }
    .market__state::before { content: "—"; margin-right: 8px; font-style: normal; }

    .market__chart { padding: 18px 16px 14px; border-bottom: 1px solid var(--hair); }
    .market__chart-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 18px; margin-bottom: 13px;
    }
    .market__chart-title { margin: 0 0 5px; font-family: var(--serif); font-size: 19px; font-weight: 400; color: var(--ink); }
    .market__chart-note { margin: 0; font-family: var(--mono); font-size: 8.5px; line-height: 1.6; letter-spacing: 0.12em; color: var(--ink-mute); }
    .market__ranges { display: inline-flex; gap: 4px; flex: 0 0 auto; }
    .market__range {
      min-width: 44px; min-height: 44px; padding: 0 11px;
      border: 1px solid var(--hair-2); border-radius: 999px;
      font-family: var(--mono); font-size: 9px; letter-spacing: 0.08em; color: var(--ink-dim);
      transition: color 280ms var(--ease), border-color 280ms var(--ease), background 280ms var(--ease), transform 180ms var(--ease);
    }
    .market__range[aria-pressed="true"] { color: var(--ink); border-color: var(--gold); background: rgba(198,204,218,0.09); }
    .market__range:disabled { opacity: 0.32; cursor: not-allowed; }
    .market__range:not(:disabled):active { transform: scale(0.96); }
    .market__svg { display: block; width: 100%; min-height: 176px; overflow: visible; }
    .market__chart-empty {
      min-height: 150px; display: grid; place-items: center; text-align: center;
      font-family: var(--serif); font-style: italic; font-size: 15px; color: var(--ink-mute);
    }
    .market__foot {
      display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px 18px;
      padding: 12px 16px 14px; font-family: var(--mono); font-size: 8.5px;
      line-height: 1.6; letter-spacing: 0.11em; color: var(--ink-mute);
    }
    @media (max-width: 520px) {
      .market__head, .market__chart-head { flex-direction: column; }
      .market__source { min-height: 32px; display: inline-flex; align-items: center; }
    }

    .research-links { display: grid; grid-template-columns: 1fr; gap: 1px; background: var(--hair); border: 1px solid var(--hair); }
    .research-links a {
      display: grid; grid-template-columns: 32px 1fr auto; align-items: center; gap: 13px;
      min-height: 70px; padding: 13px 16px; background: var(--bg); text-decoration: none;
      transition: background 320ms var(--ease), color 320ms var(--ease);
    }
    .research-links a:hover { background: rgba(198,204,218,0.05); }
    .research-links__glyph { color: var(--gold); font-family: var(--serif); font-style: italic; font-size: 22px; }
    .research-links strong { display: block; margin-bottom: 4px; font-family: var(--serif); font-size: 16px; font-weight: 400; color: var(--ink); }
    .research-links small { display: block; font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.11em; color: var(--ink-mute); }
    .research-links__arr { color: var(--gold); }
    @media (min-width: 700px) { .research-links { grid-template-columns: 1fr 1fr; } }

    /* Get the token */
    .acq__copy {
      margin: 0 0 22px; max-width: 52ch;
      font-family: var(--serif); font-size: 16px; line-height: 1.58; color: var(--ink-2);
    }
    .acq__cta { display: flex; flex-direction: column; gap: 12px; }
    @media (min-width: 560px) { .acq__cta { flex-direction: row; } .acq__cta .btn { flex: 1; } }
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
    .acq__note {
      margin: 18px 0 0; font-family: var(--mono); font-size: 9.5px;
      letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-mute);
      max-width: 60ch; line-height: 1.8;
    }
    .acq__note a { color: var(--ink-dim); text-decoration: none; border-bottom: 1px solid rgba(198,204,218,0.22); }
    .acq__note a:hover { color: var(--gold-bright); border-bottom-color: var(--gold); }
    .acq__related {
      display: inline-flex; align-items: center; gap: 7px; min-height: 44px; margin-top: 14px;
      font-family: var(--serif); font-size: 13.5px; color: var(--ink-mute);
      text-decoration: none; border-bottom: 1px solid var(--hair-2); padding-bottom: 2px;
      transition: color 320ms var(--ease), border-color 320ms var(--ease);
    }
    .acq__related:hover { color: var(--ink-2); border-color: var(--gold); }

    /* Next lot / strip */
    .nextlot { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--hair); border: 1px solid var(--hair); }
    .nextlot a {
      display: flex; flex-direction: column; gap: 10px;
      background: var(--bg); padding: 20px 18px 22px; text-decoration: none;
      transition: background 320ms var(--ease);
    }
    .nextlot a:hover { background: rgba(198,204,218,0.05); }
    .nextlot .dir { font-family: var(--mono); font-size: 9px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--ink-mute); }
    .nextlot .nm { font-family: var(--serif); font-style: italic; font-size: 24px; color: var(--ink); line-height: 1; }
    .nextlot .lt { font-family: var(--display); font-weight: 500; font-size: 9px; letter-spacing: 0.16em; color: var(--gold); text-transform: uppercase; }
    .nextlot a:last-child { text-align: right; align-items: flex-end; }

    .strip {
      display: flex; align-items: center; justify-content: center; flex-wrap: wrap;
      gap: 10px; padding: 26px 0 4px;
    }
    .strip a {
      display: grid; place-items: center; width: 44px; height: 44px;
      border-radius: 50%; border: 1px solid transparent;
      transition: border-color 320ms var(--ease), transform 220ms var(--ease);
    }
    .strip a:hover { border-color: var(--hair-2); transform: translateY(-1px); }
    .strip a.is-current { border-color: var(--gold); }
    .strip img { width: 20px; height: 20px; object-fit: contain; opacity: 0.62; }
    .strip a.is-current img, .strip a:hover img { opacity: 1; }

    /* Footer */
    .ftr {
      margin-top: 64px; padding: 36px 0 56px; border-top: 1px solid var(--hair);
      font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.22em;
      text-transform: uppercase; color: var(--ink-mute);
    }
    .ftr__row { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; }
    .ftr__row + .ftr__row { margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--hair); }
    .ftr .mark { color: var(--ink-2); letter-spacing: 0.14em; font-family: var(--display); font-weight: 400; text-transform: none; font-size: 11.5px; }
    .ftr .mark .g { color: var(--gold); }
    .ftr__links { display: inline-flex; flex-wrap: wrap; gap: 12px 16px; }
    .ftr__links a,
    .ftr__links .assistant-link { color: var(--ink-dim); text-decoration: none; transition: color 320ms var(--ease); }
    .ftr__links a:hover,
    .ftr__links .assistant-link:hover { color: var(--gold); }
    .assistant-link {
      appearance: none; border: 0; padding: 0; background: transparent;
      font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer;
    }
    .assistant-link:focus-visible { outline: 1px solid var(--gold); outline-offset: 4px; }

    /* Reveal */
    .reveal {
      opacity: 0; transform: translateY(18px); filter: blur(6px);
      transition: opacity 900ms var(--ease), transform 900ms var(--ease), filter 900ms var(--ease);
      will-change: opacity, transform, filter;
    }
    .reveal.is-in { opacity: 1; transform: translateY(0); filter: blur(0); }
    @media (prefers-reduced-motion: reduce) {
      .reveal { transition: none !important; opacity: 1 !important; transform: none !important; filter: none !important; }
      .lot__next { transition: none; }
      .lot__next:active { transform: none; }
    }
  </style>
</head>
<body>
  <a href="#main" class="skip">Skip to content</a>
  <div class="stars" aria-hidden="true"></div>
  <div class="grain" aria-hidden="true"></div>

  ${wingNavHtml({ includeSearch: true })}

  <main class="pg" id="main">
    <section class="lot" aria-labelledby="lot-title">
      <nav aria-label="Breadcrumb"><ol class="lot__crumbs"><li><a href="/terminal/">Astrofolio</a></li><li><a href="/registry/">Zodiacs Registry</a></li><li aria-current="page">${esc(m.name)}</li></ol></nav>
      <span class="lot__eyebrow">Official Zodiac Token <span class="g">·</span> Sign ${m.order} of 12</span>
      <h1 class="lot__title" id="lot-title">${esc(m.name)} <picture class="lot__title-icon" aria-hidden="true"><source srcset="/assets/zodiac-icons/400/${m.slug}.avif" type="image/avif"/><img src="/assets/zodiac-icons/400/${m.slug}.webp" width="112" height="112" alt="" decoding="async" fetchpriority="high"/></picture></h1>
      <p class="lot__epithet">${esc(p.epithet)}</p>
      <p class="lot__intro">${esc(m.name)} is the transferable token for the ${esc(m.name)} sign. The gold sculpture is its collection artwork—not a physical sculpture or a one-of-one NFT.</p>
      <div class="lot__meta">
        <div class="lot__dates">${esc(p.datesDisplay)} · ${esc(titleCase(meta.element))} · ${esc(meta.rulingPlanet)}</div>
        <a class="lot__next" href="${signPath(m.next.slug)}" aria-label="Next record, ${esc(m.next.name)}">
          <picture aria-hidden="true"><source srcset="/assets/zodiac-icons/48/${m.next.slug}.avif" type="image/avif"/><img src="/assets/zodiac-icons/48/${m.next.slug}.webp" width="28" height="28" alt="" decoding="async"/></picture>
          <span>Next record <strong>· ${esc(m.next.name)}</strong></span><span aria-hidden="true">→</span>
        </a>
      </div>
    </section>

    <div class="split">
      <div class="split__figure">
        <figure class="card" style="margin:0">
          <span class="card__corner card__corner--tl"></span><span class="card__corner card__corner--tr"></span>
          <span class="card__corner card__corner--bl"></span><span class="card__corner card__corner--br"></span>
          <div class="card__inner">
            <div class="card__head">
              <span class="label">Sign ${String(m.order).padStart(2, '0')} / 12</span>
              <span class="label label--gold">Official record</span>
            </div>
            <div class="stage">
              <img src="/assets/nuggets/${m.slug}.png" alt="${esc(m.name)} — sculptural gold figure of the sign" decoding="async" fetchpriority="high" />
            </div>
            <figcaption class="card__caption">${esc(m.name)} <span class="g">·</span> ${esc(meta.archetype)}</figcaption>
          </div>
        </figure>
        <a class="figure__gallery" href="/terminal/?sign=${m.slug}">
          <span>View ${esc(m.name)} in Astrofolio</span><span aria-hidden="true">→</span>
        </a>
      </div>

      <div>
        <section class="sec reveal" style="padding-top:8px" aria-label="Token facts">
          <div class="sec__head"><h2 class="sec__title">Token facts</h2><span class="line"></span></div>
          <div class="rows">
${specRows.map(([k, v, mono]) => `            <div class="row"><span class="k">${esc(k)}</span><span class="v${mono ? ' mono' : ''}">${esc(v)}</span></div>`).join('\n')}
          </div>
        </section>

        <section class="sec reveal" aria-label="What ${esc(m.name)} represents">
          <div class="sec__head"><h2 class="sec__title">What ${esc(m.name)} represents</h2><span class="line"></span></div>
          <div class="note">
            <p class="note__lede">${esc(p.lede)}</p>
${p.note.map((para) => `            <p>${esc(para)}</p>`).join('\n')}
          </div>
        </section>
      </div>
    </div>

    <section class="sec reveal" aria-labelledby="value-title">
      <div class="sec__head"><h2 class="sec__title" id="value-title">Why ${esc(m.name)} has a place in the set</h2><span class="line"></span></div>
      <div class="value">
        <div class="value__item"><span class="value__k">Verified identity</span><p class="value__v">The Registry connects ${esc(m.name)} to one original Solana mint and its official Base counterpart, so the token can be checked before it is viewed or acquired.</p></div>
        <div class="value__item"><span class="value__k">Comparable market context</span><p class="value__v">Price, market cap, FDV, liquidity, volume, and pool coverage use the same published method across all twelve signs.</p></div>
        <div class="value__item"><span class="value__k">A complete system</span><p class="value__v">${esc(m.name)} is one identity in a twelve-token set. Its place comes from the zodiac structure—not a promise that its market price will rise.</p></div>
        <div class="value__item"><span class="value__k">A distinct visual record</span><p class="value__v">The pastel sign, plotted constellation, seasonal dates, and gold sculpture make the token recognizable beyond its contract address.</p></div>
      </div>
    </section>

    <section class="sec reveal" id="constellation" aria-labelledby="constellation-title">
      <div class="sec__head"><h2 class="sec__title" id="constellation-title">The ${esc(m.name)} constellation</h2><span class="line"></span></div>
      <div class="constellation">
        <div class="constellation__map">
          <img src="/assets/constellations/${m.slug}.svg" width="720" height="460" loading="lazy" decoding="async" alt="Map of the brighter ${esc(m.name)} constellation stars, with ${esc(focusObject.name)} highlighted" />
        </div>
        <div class="constellation__copy">
          <p class="constellation__lede">${esc(focusObject.name)} is the ${esc(focusKind)} marked in ${esc(m.name)}’s pastel color.</p>
          <p class="constellation__body">The map plots J2000 right ascension and declination for the brighter stars in the constellation. Dot size reflects apparent brightness. The connecting lines help the figure read at a glance; they are not official IAU boundaries.</p>
          <p class="constellation__source">Star catalogue: <a href="${HYG_ATTRIBUTION.url}" rel="noopener noreferrer">${HYG_ATTRIBUTION.title}</a>, <a href="${HYG_ATTRIBUTION.licenseUrl}" rel="noopener noreferrer">${HYG_ATTRIBUTION.license}</a>.${focusObject.kind === 'open-cluster' ? ' Praesepe’s supplemental J2000 cluster centre is linked to <a href="https://simbad.cds.unistra.fr/simbad/sim-id?Ident=M44" rel="noopener noreferrer">SIMBAD M44</a>.' : ''} Guide segments authored by Zodiacs.org.</p>
        </div>
      </div>
    </section>

    <section class="sec reveal" id="provenance" aria-label="The story behind ${esc(m.name)}">
      <div class="sec__head"><h2 class="sec__title">The story behind ${esc(m.name)}</h2><span class="line"></span></div>
      <div class="prov">
${beats.map((b) => `        <div class="prov__item">
          <div class="prov__era">${esc(b.era)} <span class="place">· ${esc(b.place)}</span></div>
          <p class="prov__body">${esc(b.body)}</p>
        </div>`).join('\n')}
      </div>
    </section>

    <section class="sec reveal" id="record" aria-label="Official addresses">
      <div class="sec__head"><h2 class="sec__title">Official addresses</h2><span class="line"></span></div>
      <div class="rec">
        <div class="rec__row">
          <span class="rec__k">Original <span class="net">· Solana SPL</span></span>
          <button type="button" class="copychip" data-copy="${esc(m.solana.address)}">
            <span class="copychip__text">${esc(m.solana.address.slice(0, 6))}…${esc(m.solana.address.slice(-4))}</span>
            <span class="copychip__icon" aria-hidden="true">⧉</span>
            <span class="sr-only">Copy Solana mint address</span>
          </button>
        </div>
        <div class="rec__row">
          <span class="rec__k">Counterpart <span class="net">· Base ERC-20 · Wormhole</span></span>
          <button type="button" class="copychip" data-copy="${esc(m.base.address)}">
            <span class="copychip__text">${esc(m.base.address.slice(0, 6))}…${esc(m.base.address.slice(-4))}</span>
            <span class="copychip__icon" aria-hidden="true">⧉</span>
            <span class="sr-only">Copy Base contract address</span>
          </button>
        </div>
        <div class="rec__links">
          <a class="rec__link" href="https://solscan.io/token/${esc(m.solana.address)}" rel="noopener noreferrer">Solscan ↗</a>
          <a class="rec__link" href="https://basescan.org/token/${esc(m.base.address)}" rel="noopener noreferrer">BaseScan ↗</a>
          <a class="rec__link" href="/registry/zodiacs.registry.json">Registry JSON</a>
          <a class="rec__link" href="/registry/#verify">Verify an address</a>
        </div>
      </div>
    </section>

    <section class="sec reveal" id="market" aria-label="Market context">
      <div class="sec__head"><h2 class="sec__title">Market context</h2><span class="line"></span></div>
      <aside class="market" data-market>
        <div class="market__head">
          <div>
            <span class="market__label">Registry market archive</span>
            <p class="market__copy">Daily observations indexed from exact-mint Solana pools. Independent third-party data, not a valuation or recommendation. It may be delayed or unavailable, and a Zodiac can lose all market value.</p>
          </div>
          <a class="market__source" data-market-live-link href="${esc(m.dexscreener)}" rel="noopener noreferrer">Open live chart ↗</a>
        </div>
        <p class="market__state" data-market-state>Loading market context.</p>
        <div class="market__chart" data-market-chart hidden>
          <div class="market__chart-head">
            <div><h3 class="market__chart-title">Price history</h3><p class="market__chart-note" data-market-chart-note></p></div>
            <div class="market__ranges" aria-label="Price chart range">
              <button class="market__range" type="button" data-market-range="7d" aria-pressed="false">7D</button>
              <button class="market__range" type="button" data-market-range="30d" aria-pressed="false">30D</button>
              <button class="market__range" type="button" data-market-range="all" aria-pressed="true">All</button>
            </div>
          </div>
          <div data-market-chart-canvas></div>
        </div>
        <div class="market__grid" data-market-grid hidden></div>
        <div class="market__foot" data-market-foot hidden></div>
      </aside>
    </section>

    <section class="sec reveal" aria-labelledby="research-title">
      <div class="sec__head"><h2 class="sec__title" id="research-title">${esc(m.name)} research</h2><span class="line"></span></div>
      <nav class="research-links" aria-label="Research related to ${esc(m.name)}">
        <a href="/terminal/research/?sign=${m.slug}&amp;type=daily"><span class="research-links__glyph" aria-hidden="true">☉</span><span><strong>Latest ${esc(m.name)} sky brief</strong><small>Sky fact · traditional reading · market observation</small></span><span class="research-links__arr" aria-hidden="true">→</span></a>
        <a href="/terminal/research/?sign=${m.slug}"><span class="research-links__glyph" aria-hidden="true">✦</span><span><strong>All ${esc(m.name)} research</strong><small>Calendar events, observation updates, and outside reporting</small></span><span class="research-links__arr" aria-hidden="true">→</span></a>
      </nav>
    </section>

    <section class="sec reveal" id="acquire" aria-label="Get ${esc(m.name)}">
      <div class="sec__head"><h2 class="sec__title">Get ${esc(m.name)}</h2><span class="line"></span></div>
      <p class="acq__copy">
        The links below open independent third-party services; they are not
        endorsements or recommendations, and Zodiacs.org does not sell or
        execute transactions. A service may request a wallet connection, token
        approval, signature, and an onchain transaction that cannot be reversed.
        Digital assets are speculative, may become illiquid, and can lose all
        market value. You could lose all money used to acquire a Zodiac. Verify
        the official mint, network, amount, and destination before continuing.
        Operator and economic-interest statements remain pending confirmation;
        see the <a href="/disclosure/">Disclosure</a>.
      </p>
      ${renderTradeRegion({ sign: m.slug, name: m.name, mint: m.solana.address, hue: m.hue, enabled: false })}
      <div class="acq__cta">
        <a class="btn" href="${esc(m.jupiter)}" rel="noopener noreferrer external nofollow">
          <span>Open Jupiter route</span><span class="arr">↗</span>
        </a>
        <a class="btn" href="${esc(m.dexscreener)}" rel="noopener noreferrer external nofollow">
          <span>View market data</span><span class="arr">↗</span>
        </a>
      </div>
      <a class="acq__related" href="https://astrofolio.xyz/" rel="noopener noreferrer">Related product: view ${esc(m.name)} in Astrofolio.xyz <span aria-hidden="true">↗</span></a>
      <p class="acq__note">
        Official mint: <a href="/registry/zodiacs.registry.json">${esc(m.solana.address.slice(0, 8))}…${esc(m.solana.address.slice(-6))}</a> ·
        This Registry page does not request custody, signing, approvals, or transactions.
      </p>
    </section>

    <section class="sec reveal" aria-label="Explore all 12">
      <div class="sec__head"><h2 class="sec__title">Explore all 12</h2><span class="line"></span></div>
      <nav class="nextlot" aria-label="Adjacent signs">
        <a href="${signPath(m.prev.slug)}">
          <span class="dir">← Previous</span>
          <span class="nm">${esc(m.prev.name)}</span>
          <span class="lt">Official sign ${SIGN_ORDER.indexOf(m.prev.slug) + 1} of 12</span>
        </a>
        <a href="${signPath(m.next.slug)}">
          <span class="dir">Next →</span>
          <span class="nm">${esc(m.next.name)}</span>
          <span class="lt">Official sign ${SIGN_ORDER.indexOf(m.next.slug) + 1} of 12</span>
        </a>
      </nav>
      <nav class="strip" aria-label="All twelve signs">
${SIGN_ORDER.map((s) => `        <a href="${signPath(s)}"${s === m.slug ? ' class="is-current" aria-current="page"' : ''} aria-label="${esc(assetFor(s).displayName)}"><img src="/assets/icons/${s}.png" alt="" loading="lazy" decoding="async" /></a>`).join('\n')}
      </nav>
    </section>

    <footer class="ftr">
      <div class="ftr__row">
        <div class="mark">Zodiacs<span class="g">·</span>org</div>
        <div>© MMXXVI</div>
      </div>
      <div class="ftr__row">
        <div class="ftr__links">
          <a href="/terminal/">Astrofolio</a>
          <a href="/registry/#verify">Verify</a>
          <a href="/thesis/">Thesis</a>
          <a href="/sdk/">SDK</a>
          <a href="/disclosure/">${esc(EN['disclosure.linkLabel'])}</a>
          <a href="/privacy/">${esc(EN['disclosure.linkPrivacy'])}</a>
          <a href="/terms/">${esc(EN['disclosure.linkTerms'])}</a>
          <a href="/registry/zodiacs.registry.json">Record</a>
          <button class="assistant-link" type="button" data-assistant-open aria-haspopup="dialog">Ask Zodiacs</button>
          <a href="https://astrofolio.xyz/" rel="noopener noreferrer">Astrofolio.xyz ↗</a>
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

  <script>
  (function () {
    var buttons = document.querySelectorAll('[data-assistant-open]');
    if (!buttons.length) return;
    var modulePromise;
    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        modulePromise = modulePromise || import('/assets/assistant-ui.js');
        modulePromise.then(function (mod) { mod.openAssistant('en', button); }).catch(function () {});
      });
    });
  })();
  </script>

  <script>
  (function () {
    var sign = ${JSON.stringify(m.slug)};

    function trackWingEvent(name) {
      if (typeof plausible === 'function') {
        window.plausible(name, { props: { sign: sign } });
      }
    }

    window.addEventListener('load', function () {
      trackWingEvent('wing_record_view');
    });

    document.addEventListener('click', function (event) {
      var target = event.target;
      var link = target && target.closest
        ? target.closest('#market a, #acquire .acq__cta a')
        : null;
      if (link) trackWingEvent('wing_acquisition_click');
    });
  })();
  </script>

  <script>
  (function () {
    'use strict';

    // Scroll reveal
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

    // Unified site nav (Part AA) — Signs dropdown + mobile burger (wing-nav.mjs)
    ${wingNavScript()}

    // Copy chips
    document.querySelectorAll('.copychip[data-copy]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var text = chip.getAttribute('data-copy');
        if (!navigator.clipboard || !navigator.clipboard.writeText) return;
        navigator.clipboard.writeText(text).then(function () {
          chip.classList.add('is-copied');
          var t = chip.querySelector('.copychip__text');
          var prior = t.textContent;
          t.textContent = 'Copied';
          setTimeout(function () {
            chip.classList.remove('is-copied');
            t.textContent = prior;
          }, 1400);
        });
      });
    });

    // Market context comes from the Registry-owned daily archive. The archive
    // preserves nulls and keeps market cap separate from FDV.
    var SIGN = ${JSON.stringify(m.slug)};
    var ACCENT = ${JSON.stringify(m.hue)};
    var ARCHIVE_URL = '/assets/data/registry-market-history.v1.json';
    var panel = document.querySelector('[data-market]');
    var stateEl = panel.querySelector('[data-market-state]');
    var gridEl = panel.querySelector('[data-market-grid]');
    var chartEl = panel.querySelector('[data-market-chart]');
    var chartCanvas = panel.querySelector('[data-market-chart-canvas]');
    var chartNote = panel.querySelector('[data-market-chart-note]');
    var footEl = panel.querySelector('[data-market-foot]');
    var liveLink = panel.querySelector('[data-market-live-link]');
    var rangeButtons = Array.from(panel.querySelectorAll('[data-market-range]'));
    var archiveSnapshots = [];

    function finiteNumber(v) {
      if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
      var n = Number(v);
      return isFinite(n) ? n : null;
    }
    function setUnavailable(message) {
      stateEl.textContent = message || 'Registry market archive unavailable.';
      stateEl.hidden = false;
      gridEl.hidden = true;
      chartEl.hidden = true;
      footEl.hidden = true;
    }

    function fmtPrice(v) {
      var n = finiteNumber(v);
      if (n === null) return '—';
      var d = Math.abs(n) < 0.0001 ? 8 : Math.abs(n) < 0.01 ? 6 : 4;
      return '$' + n.toFixed(d).replace(/0+$/, '').replace(/\\.$/, '');
    }
    function fmtCompact(v) {
      var n = finiteNumber(v);
      if (n === null) return '—';
      var a = Math.abs(n);
      if (a >= 1e9) return '$' + (n / 1e9).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'B';
      if (a >= 1e6) return '$' + (n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'M';
      if (a >= 1e3) return '$' + (n / 1e3).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'K';
      return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    function fmtPct(v) {
      var n = finiteNumber(v);
      if (n === null) return '—';
      return (n > 0 ? '+' : '') + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    }
    function fmtDate(v) {
      if (!v) return '—';
      var d = new Date(v);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    function fmtTimestamp(v) {
      if (!v) return 'Time unavailable';
      var d = new Date(v);
      if (isNaN(d.getTime())) return 'Time unavailable';
      return d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
      });
    }
    function make(tag, className, text) {
      var el = document.createElement(tag);
      if (className) el.className = className;
      if (text !== undefined) el.textContent = text;
      return el;
    }
    function latestAsset(snapshot) {
      var assets = snapshot && Array.isArray(snapshot.assets) ? snapshot.assets : [];
      return assets.find(function (asset) { return asset && asset.sign === SIGN; }) || null;
    }
    function marketCapRank(snapshot, asset) {
      var ranked = (snapshot.assets || []).filter(function (candidate) {
        return finiteNumber(candidate && candidate.marketCapUsd) !== null;
      }).slice().sort(function (a, b) {
        return finiteNumber(b.marketCapUsd) - finiteNumber(a.marketCapUsd);
      });
      var index = ranked.findIndex(function (candidate) { return candidate.sign === asset.sign; });
      return index < 0 ? '—' : (index + 1) + ' of ' + ranked.length;
    }

    function renderMetrics(snapshot, asset) {
      var change = finiteNumber(asset.change24hPct);
      var changeClass = change === null ? '' : (change > 0 ? ' market__v--up' : change < 0 ? ' market__v--down' : '');
      var cells = [
        ['Price USD', fmtPrice(asset.priceUsd), 'market__v--mono'],
        ['24H change', fmtPct(asset.change24hPct), 'market__v--mono' + changeClass],
        ['Market cap', fmtCompact(asset.marketCapUsd), ''],
        ['FDV', fmtCompact(asset.fdvUsd), ''],
        ['Indexed liquidity', fmtCompact(asset.liquidityUsd), ''],
        ['24H volume', fmtCompact(asset.volume24hUsd), ''],
        ['Indexed pools', finiteNumber(asset.indexedPoolCount) === null ? '—' : String(asset.indexedPoolCount), 'market__v--mono'],
        ['Market-cap rank', marketCapRank(snapshot, asset), 'market__v--mono']
      ];
      gridEl.replaceChildren();
      cells.forEach(function (cell) {
        var wrapper = make('div', 'market__cell');
        wrapper.append(make('div', 'market__k', cell[0]));
        wrapper.append(make('div', 'market__v ' + cell[2], cell[1]));
        gridEl.append(wrapper);
      });
      stateEl.hidden = true;
      gridEl.hidden = false;
      footEl.replaceChildren(
        make('span', '', 'Observed ' + fmtTimestamp(snapshot.source && snapshot.source.readAt)),
        make('span', '', 'Coverage ' + ((snapshot.coverage && snapshot.coverage.assetsWithIndexedPools) || 0) + ' / ' + ((snapshot.coverage && snapshot.coverage.canonicalAssetCount) || 12) + ' assets · exact-mint method')
      );
      footEl.hidden = false;

      var deepUrl = asset.deepestPool && asset.deepestPool.url;
      if (typeof deepUrl === 'string' && /^https:\\/\\/dexscreener\\.com\\//i.test(deepUrl)) liveLink.href = deepUrl;
    }

    function observationsForRange(range) {
      if (!archiveSnapshots.length || range === 'all') return archiveSnapshots;
      var lastDate = new Date(archiveSnapshots[archiveSnapshots.length - 1].date + 'T00:00:00Z');
      var days = range === '7d' ? 7 : 30;
      var floor = lastDate.getTime() - (days - 1) * 86400000;
      return archiveSnapshots.filter(function (observation) {
        return new Date(observation.date + 'T00:00:00Z').getTime() >= floor;
      });
    }

    function svgNode(tag, attrs) {
      var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
      Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
      return node;
    }

    function chartDescription(points) {
      var finite = points.filter(function (point) { return point.price !== null; });
      if (!finite.length) return 'Price history unavailable.';
      if (finite.length === 1) return 'One dated observation — ' + fmtDate(finite[0].date) + '.';
      return finite.length + ' dated observations · ' + fmtDate(finite[0].date) + '–' + fmtDate(finite[finite.length - 1].date) + '.';
    }

    function renderChart(range) {
      var points = observationsForRange(range);
      var finite = points.filter(function (point) { return point.price !== null; });
      chartCanvas.replaceChildren();
      chartNote.textContent = chartDescription(points);
      rangeButtons.forEach(function (button) {
        button.setAttribute('aria-pressed', button.getAttribute('data-market-range') === range ? 'true' : 'false');
      });
      if (!finite.length) {
        chartCanvas.append(make('div', 'market__chart-empty', 'No dated price observations are available for this token.'));
        return;
      }

      var w = 680;
      var h = 190;
      var px = 18;
      var py = 20;
      var times = finite.map(function (point) { return new Date(point.date + 'T00:00:00Z').getTime(); });
      var prices = finite.map(function (point) { return point.price; });
      var minT = Math.min.apply(null, times);
      var maxT = Math.max.apply(null, times);
      var minP = Math.min.apply(null, prices);
      var maxP = Math.max.apply(null, prices);
      var pPad = maxP === minP ? Math.max(Math.abs(maxP) * 0.08, 0.00000001) : (maxP - minP) * 0.12;
      minP -= pPad;
      maxP += pPad;
      function xFor(point) {
        if (maxT === minT) return w / 2;
        return px + (new Date(point.date + 'T00:00:00Z').getTime() - minT) / (maxT - minT) * (w - px * 2);
      }
      function yFor(point) {
        return py + (maxP - point.price) / (maxP - minP) * (h - py * 2);
      }

      var svg = svgNode('svg', {
        class: 'market__svg',
        viewBox: '0 0 ' + w + ' ' + h,
        role: 'img',
        'aria-label': chartDescription(points)
      });
      [0.25, 0.5, 0.75].forEach(function (ratio) {
        var y = py + (h - py * 2) * ratio;
        svg.append(svgNode('line', {
          x1: px, y1: y, x2: w - px, y2: y,
          stroke: 'rgba(198,204,218,0.12)', 'stroke-width': '1'
        }));
      });

      var segments = [];
      var active = [];
      points.forEach(function (point, index) {
        var previous = index ? points[index - 1] : null;
        var gap = previous
          ? new Date(point.date + 'T00:00:00Z').getTime() - new Date(previous.date + 'T00:00:00Z').getTime()
          : 0;
        if (point.price === null || gap > 1.5 * 86400000) {
          if (active.length) segments.push(active);
          active = point.price === null ? [] : [point];
        } else {
          active.push(point);
        }
      });
      if (active.length) segments.push(active);
      segments.forEach(function (segment) {
        if (segment.length < 2) return;
        var d = segment.map(function (point, index) {
          return (index ? 'L ' : 'M ') + xFor(point).toFixed(2) + ' ' + yFor(point).toFixed(2);
        }).join(' ');
        svg.append(svgNode('path', {
          d: d, fill: 'none', stroke: ACCENT, 'stroke-width': '3',
          'stroke-linecap': 'round', 'stroke-linejoin': 'round'
        }));
      });
      finite.forEach(function (point) {
        svg.append(svgNode('circle', {
          cx: xFor(point).toFixed(2), cy: yFor(point).toFixed(2),
          r: finite.length === 1 ? '5' : '3.5',
          fill: ACCENT, stroke: '#090b10', 'stroke-width': '2'
        }));
      });
      chartCanvas.append(svg);
    }

    function configureRanges() {
      ['7d', '30d'].forEach(function (range) {
        var button = panel.querySelector('[data-market-range="' + range + '"]');
        var required = range === '7d' ? 7 : 30;
        var available = observationsForRange(range).filter(function (point) { return point.price !== null; }).length;
        button.disabled = available < required;
        if (button.disabled) button.title = 'Available after ' + required + ' dated observations in this range';
      });
      rangeButtons.forEach(function (button) {
        button.addEventListener('click', function () {
          if (!button.disabled) renderChart(button.getAttribute('data-market-range'));
        });
      });
    }

    function renderArchive(archive) {
      if (!archive || archive.schema !== 'zodiacs.registry-market-history.v1' || !Array.isArray(archive.snapshots)) {
        setUnavailable('Registry market archive has an unsupported format.');
        return;
      }
      var snapshots = archive.snapshots.slice().sort(function (a, b) {
        return String(a.date).localeCompare(String(b.date));
      });
      if (!snapshots.length) {
        setUnavailable('No daily market snapshots have been published yet.');
        return;
      }
      var latest = snapshots[snapshots.length - 1];
      var asset = latestAsset(latest);
      if (!asset) {
        setUnavailable('This token is not present in the latest market snapshot.');
        return;
      }

      archiveSnapshots = snapshots.map(function (snapshot) {
        var snapshotAsset = latestAsset(snapshot);
        return {
          date: snapshot.date,
          price: snapshotAsset ? finiteNumber(snapshotAsset.priceUsd) : null
        };
      });
      renderMetrics(latest, asset);
      configureRanges();
      renderChart('all');
      chartEl.hidden = false;
    }

    function loadMarket() {
      fetch(ARCHIVE_URL, {
        cache: 'no-cache',
        headers: { accept: 'application/json' }
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }).then(renderArchive).catch(function () {
        setUnavailable('Registry market archive is temporarily unavailable.');
      });
    }

    if ('IntersectionObserver' in window) {
      var mio = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { mio.disconnect(); loadMarket(); }
      }, { rootMargin: '0px 0px 20% 0px' });
      mio.observe(panel);
    } else {
      loadMarket();
    }
  })();
  </script>
</body>
</html>
`;
}

const constellationDir = resolve(root, 'public', 'assets', 'constellations');
await mkdir(constellationDir, { recursive: true });

for (const slug of SIGN_ORDER) {
  const m = pageModel(slug);
  const html = render(m);
  const dir = resolve(root, 'public', 'registry', slug);
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, 'index.html'), html, 'utf8');
  await writeFile(resolve(constellationDir, `${slug}.svg`), renderConstellationSvg(m), 'utf8');
  console.log(`Wrote /registry/${slug}/index.html (${html.length} bytes)`);
}
await writeFile(
  resolve(constellationDir, 'ATTRIBUTION.txt'),
  `Zodiacs.org constellation maps

Star positions and apparent magnitudes are derived from HYG Database v4.0:
${HYG_ATTRIBUTION.url}
Source file: hyg/CURRENT/hygdata_v40.csv.gz
Source blob: ${HYG_ATTRIBUTION.sourceBlob}
License: ${HYG_ATTRIBUTION.license} — ${HYG_ATTRIBUTION.licenseUrl}

The plotted subset is committed in scripts/constellation-data.mjs. Guide
segments were authored by Zodiacs.org as a visual aid; they are not official
IAU constellation boundaries. Praesepe is an open cluster rather than a HYG
star; its supplemental J2000 centre is attributed in the Cancer record to
SIMBAD M44: https://simbad.cds.unistra.fr/simbad/sim-id?Ident=M44
`,
  'utf8'
);
console.log('Done — 12 official token records and constellation maps.');
