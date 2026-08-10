/**
 * Static, flag-off Registry Pro page.
 *
 * The page is intentionally useful without its terminal: it documents the
 * quote laboratory's boundary, source-separation controls, and the twelve
 * verified records. The builder always emits the disabled region; only the
 * build-time stamper may add the terminal host and runtime.
 */

import {
  NAV_SIGNS,
  wingNavCss,
  wingNavHtml,
  wingNavScript,
} from '../../scripts/wing-nav.mjs';
import { renderRegistryProRegion } from './entry.mjs';

export const REGISTRY_PRO_PAGE_CSS = String.raw`
    @font-face { font-family: 'EB Garamond'; src: url('/fonts/eb-garamond-latin-400-normal.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
    @font-face { font-family: 'EB Garamond'; src: url('/fonts/eb-garamond-latin-500-normal.woff2') format('woff2'); font-weight: 500; font-style: normal; font-display: swap; }
    @font-face { font-family: 'EB Garamond'; src: url('/fonts/eb-garamond-latin-400-italic.woff2') format('woff2'); font-weight: 400; font-style: italic; font-display: swap; }
    @font-face { font-family: 'JetBrains Mono'; src: url('/fonts/jetbrains-mono-latin-wght-normal.woff2') format('woff2-variations'); font-weight: 300 600; font-style: normal; font-display: swap; }

    :root {
      color-scheme: dark;
      --void: #060709;
      --surface: rgba(13,16,25,.94);
      --surface-2: rgba(17,21,31,.88);
      --ink: #eef1f7;
      --ink-2: #c6ccda;
      --ink-mute: #8a93a6;
      --hair: rgba(198,204,218,.10);
      --hair-2: rgba(198,204,218,.17);
      --serif: 'EB Garamond', Georgia, serif;
      --sans: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
      --mono: 'JetBrains Mono', ui-monospace, monospace;
      --ease-out: cubic-bezier(.23,1,.32,1);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      min-width: 320px;
      margin: 0;
      background:
        radial-gradient(circle at 18% -14%, rgba(174,143,201,.08), transparent 34rem),
        radial-gradient(circle at 86% 10%, rgba(182,212,228,.055), transparent 30rem),
        var(--void);
      color: var(--ink-2);
      font-family: var(--sans);
      font-size: 15px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    a { color: var(--ink); text-decoration-color: rgba(198,204,218,.34); text-underline-offset: .16em; }
    a:hover { text-decoration-color: currentColor; }
    .skip-link {
      position: absolute;
      top: 0;
      left: -9999px;
      z-index: 100;
      padding: 10px 16px;
      border-radius: 0 0 10px;
      background: var(--surface);
      color: var(--ink);
    }
    .skip-link:focus { left: 0; }
    .pro-shell { width: min(100% - 36px, 1400px); margin: 0 auto; padding: 118px 0 48px; }
    .registry-pro { margin-top: 28px; }
    .registry-pro__fallback {
      padding: 16px 18px;
      border: 1px solid var(--hair-2);
      border-radius: 14px;
      background: var(--surface);
      color: var(--ink-2);
    }
    .registry-pro__fallback strong { color: var(--ink); font-weight: 600; }
    .registry-pro__fallback p { margin: 4px 0 0; }

    .pro-hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(250px, 370px);
      gap: clamp(34px, 7vw, 110px);
      align-items: end;
      padding: clamp(16px, 3vw, 40px) 0 38px;
      border-bottom: 1px solid var(--hair);
    }
    .pro-hero__kicker,
    .pro-label {
      margin: 0;
      color: var(--ink-mute);
      font-family: var(--mono);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: .18em;
      line-height: 1.4;
      text-transform: uppercase;
    }
    .pro-hero h1 {
      max-width: 13ch;
      margin: 12px 0 17px;
      color: var(--ink);
      font-family: var(--serif);
      font-size: clamp(39px, 6.1vw, 73px);
      font-weight: 500;
      letter-spacing: -.018em;
      line-height: .98;
    }
    .pro-hero__lede { max-width: 68ch; margin: 0; color: var(--ink-2); font-size: clamp(15px, 1.4vw, 17px); }
    .pro-hero__state {
      position: relative;
      padding: 18px 18px 17px;
      overflow: hidden;
      border: 1px solid var(--hair-2);
      border-radius: 15px;
      background: linear-gradient(145deg, rgba(22,26,38,.94), var(--surface));
      box-shadow: inset 0 1px rgba(238,241,247,.045), 0 24px 70px -48px rgba(0,0,0,.9);
    }
    .pro-hero__state::before {
      position: absolute;
      inset: 0 auto 0 0;
      width: 2px;
      background: #b6d4e4;
      content: '';
      opacity: .72;
    }
    .pro-state-line { display: flex; justify-content: space-between; gap: 18px; align-items: baseline; }
    .pro-state-line + .pro-state-line { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--hair); }
    .pro-state-line dt { color: var(--ink-mute); font-family: var(--mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; }
    .pro-state-line dd { margin: 0; color: var(--ink); font-size: 12.5px; text-align: right; }

    .pro-section { margin-top: 46px; }
    .pro-section__head { display: flex; gap: 20px; justify-content: space-between; align-items: end; margin-bottom: 17px; }
    .pro-section h2,
    .pro-risk h2 {
      margin: 0;
      color: var(--ink);
      font-family: var(--serif);
      font-size: 27px;
      font-weight: 500;
      line-height: 1.1;
    }
    .pro-section__note { max-width: 66ch; margin: 0; color: var(--ink-mute); font-size: 13px; text-align: right; }

    .pro-controls { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); border: 1px solid var(--hair-2); border-radius: 16px; overflow: hidden; background: var(--surface); }
    .pro-control { min-width: 0; padding: 17px 16px 18px; }
    .pro-control + .pro-control { border-left: 1px solid var(--hair); }
    .pro-control__index { display: block; margin-bottom: 18px; color: var(--ink-mute); font-family: var(--mono); font-size: 9px; letter-spacing: .16em; }
    .pro-control h3 { margin: 0 0 7px; color: var(--ink); font-size: 13px; font-weight: 600; line-height: 1.3; }
    .pro-control p { margin: 0; color: var(--ink-mute); font-size: 12px; line-height: 1.55; }

    .pro-records { display: grid; grid-template-columns: repeat(12, minmax(70px, 1fr)); gap: 7px; margin: 0; padding: 0; list-style: none; }
    .pro-record {
      display: grid;
      min-height: 110px;
      padding: 12px 9px;
      border: 1px solid var(--hair);
      border-radius: 13px;
      background: var(--surface);
      color: var(--ink-2);
      text-align: center;
      text-decoration: none;
      transition: border-color 160ms var(--ease-out), background-color 160ms var(--ease-out), transform 140ms var(--ease-out);
    }
    .pro-record:active { transform: scale(.98); }
    .pro-record img { align-self: start; width: 36px; height: 36px; margin: 0 auto; border-radius: 50%; }
    .pro-record__name { align-self: end; overflow: hidden; color: var(--ink); font-size: 11.5px; font-weight: 550; text-overflow: ellipsis; }
    .pro-record__lot { color: var(--ink-mute); font-family: var(--mono); font-size: 8px; letter-spacing: .08em; text-transform: uppercase; }
    @media (hover: hover) and (pointer: fine) {
      .pro-record:hover {
        border-color: color-mix(in srgb, var(--sign) 42%, var(--hair));
        background: color-mix(in srgb, var(--sign) 5%, var(--surface));
      }
    }

    .pro-risk {
      display: grid;
      grid-template-columns: minmax(180px, .42fr) minmax(0, 1fr);
      gap: 28px;
      margin-top: 46px;
      padding: 21px 22px;
      border: 1px solid var(--hair-2);
      border-radius: 16px;
      background: var(--surface-2);
    }
    .pro-risk__copy { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
    .pro-risk p { margin: 0; color: var(--ink-2); font-size: 12.5px; line-height: 1.65; }
    .pro-foot { display: flex; flex-wrap: wrap; gap: 8px 18px; justify-content: space-between; margin-top: 38px; padding-top: 17px; border-top: 1px solid var(--hair); color: var(--ink-mute); font-size: 12px; }
    .pro-foot a { color: var(--ink-mute); }
    .pro-foot a:hover { color: var(--ink); }

    @media (max-width: 1100px) {
      .pro-controls { grid-template-columns: repeat(2, 1fr); }
      .pro-control + .pro-control { border-left: 0; }
      .pro-control:nth-child(even) { border-left: 1px solid var(--hair); }
      .pro-control:nth-child(n + 3) { border-top: 1px solid var(--hair); }
      .pro-records { grid-template-columns: repeat(6, minmax(80px, 1fr)); }
    }
    @media (max-width: 760px) {
      .pro-shell { width: min(100% - 28px, 1400px); padding-top: 96px; }
      .pro-hero { grid-template-columns: 1fr; gap: 27px; }
      .pro-section__head { display: block; }
      .pro-section__note { margin-top: 8px; text-align: left; }
      .pro-risk { grid-template-columns: 1fr; gap: 18px; }
      .pro-risk__copy { grid-template-columns: 1fr; gap: 13px; }
    }
    @media (max-width: 520px) {
      .pro-controls { grid-template-columns: 1fr; }
      .pro-control:nth-child(even) { border-left: 0; }
      .pro-control + .pro-control { border-top: 1px solid var(--hair); }
      .pro-records { grid-template-columns: repeat(3, minmax(78px, 1fr)); }
    }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      .pro-record { transition: none; }
    }
`;

const LOTS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function recordGrid() {
  return NAV_SIGNS.map((sign, index) => `
          <li>
            <a class="pro-record" href="/registry/${sign.slug}/" style="--sign:${sign.hue}">
              <img src="/assets/zodiac-icons/128/${sign.slug}.webp" width="36" height="36" alt="" loading="lazy" decoding="async" />
              <span class="pro-record__name">${sign.name}</span>
              <span class="pro-record__lot">Lot ${LOTS[index]}</span>
            </a>
          </li>`).join('');
}

export function renderRegistryProPage() {
  const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#060709" />
  <meta name="zodiacs-registry-pro-enabled" content="0" />
  <meta name="zodiacs-registry-pro-chat-enabled" content="0" />
  <title>Registry Pro — Quote Laboratory · Zodiacs.org</title>
  <meta name="description" content="A quote-only research laboratory for comparing independent venue routes across the twelve verified Zodiac records." />
  <link rel="canonical" href="https://zodiacs.org/registry/pro/" />
  <meta name="robots" content="noindex" />
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
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Registry Pro — Quote Laboratory" />
  <meta property="og:description" content="A quote-only research surface for the twelve verified Zodiac records." />
  <meta property="og:image" content="https://zodiacs.org/assets/og/v2/registry.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="https://zodiacs.org/registry/pro/" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="https://zodiacs.org/assets/og/v2/registry.png" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Zodiacs.org", "item": "https://zodiacs.org/" },
      { "@type": "ListItem", "position": 2, "name": "Registry", "item": "https://zodiacs.org/registry/" },
      { "@type": "ListItem", "position": 3, "name": "Quote laboratory", "item": "https://zodiacs.org/registry/pro/" }
    ]
  }
  </script>
  <link rel="icon" type="image/svg+xml" sizes="any" href="/assets/app-icons/v3/favicon.svg" />
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/app-icons/v3/favicon-16.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/app-icons/v3/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="96x96" href="/assets/app-icons/v3/favicon-96.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/app-icons/v3/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <style>${REGISTRY_PRO_PAGE_CSS}</style>
  <style>${wingNavCss()}</style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  ${wingNavHtml()}

  <div class="pro-shell">
    <main id="main" tabindex="-1">
      <section class="pro-hero" aria-labelledby="registry-pro-title">
        <div>
          <p class="pro-hero__kicker">The collector’s wing · controlled research</p>
          <h1 id="registry-pro-title">Registry Pro — Quote Laboratory</h1>
          <p class="pro-hero__lede">
            A professional quote-comparison surface for the Twelve. It separates
            indexed market context from provider responses and reports exact atomic
            amounts without constructing, signing, submitting, or settling a transaction.
          </p>
        </div>
        <dl class="pro-hero__state" aria-label="Operating boundary">
          <div class="pro-state-line"><dt>Mode</dt><dd>Quote-only research</dd></div>
          <div class="pro-state-line"><dt>Execution</dt><dd>Unavailable by design</dd></div>
          <div class="pro-state-line"><dt>Custody</dt><dd>None</dd></div>
          <div class="pro-state-line"><dt>Public index</dt><dd>Excluded</dd></div>
        </dl>
      </section>

      ${renderRegistryProRegion({ enabled: false })}

      <section class="pro-section" aria-labelledby="registry-pro-controls">
        <div class="pro-section__head">
          <h2 id="registry-pro-controls">Control surface</h2>
          <p class="pro-section__note">The laboratory compares observations. A displayed quote is not an order, recommendation, or promise of execution.</p>
        </div>
        <div class="pro-controls">
          <article class="pro-control"><span class="pro-control__index">01</span><h3>Verified universe</h3><p>Only Solana mints read from the public Zodiac Registry enter a comparison.</p></article>
          <article class="pro-control"><span class="pro-control__index">02</span><h3>Source separation</h3><p>Reference-market context and provider-returned routes remain distinctly labeled.</p></article>
          <article class="pro-control"><span class="pro-control__index">03</span><h3>Exact quantities</h3><p>Atomic values stay integer-exact; display rounding never changes the request.</p></article>
          <article class="pro-control"><span class="pro-control__index">04</span><h3>Freshness limits</h3><p>Expired observations are marked stale and cannot be presented as current.</p></article>
          <article class="pro-control"><span class="pro-control__index">05</span><h3>Partial failure</h3><p>One unavailable provider does not disguise or overwrite another provider’s result.</p></article>
        </div>
      </section>

      <section class="pro-section" aria-labelledby="registry-pro-records">
        <div class="pro-section__head">
          <h2 id="registry-pro-records">Verified markets</h2>
          <p class="pro-section__note">Each record remains the authoritative source for its official mint and provenance.</p>
        </div>
        <ul class="pro-records">${recordGrid()}
        </ul>
      </section>

      <section class="pro-risk" aria-labelledby="registry-pro-risk">
        <div>
          <p class="pro-label">Pinned risk notice</p>
          <h2 id="registry-pro-risk">Before relying on a quote</h2>
        </div>
        <div class="pro-risk__copy">
          <p>Zodiac assets are thinly traded, may have severe price impact, and can lose all market value. Indexed prices and venue responses are independent third-party observations, may be delayed or unavailable, and are not valuations or recommendations.</p>
          <p>This laboratory has no execution capability. It does not connect a wallet, build a transaction, take custody, route an order, or receive compensation. Provider quotes are non-executable, can change before a later trade, and must be checked against the official Registry mint. On-chain transactions elsewhere are irreversible. Any future execution surface requires a separate owner decision. <a href="/disclosure/">Disclosure</a> · <a href="/terms/">Terms</a> · <a href="/privacy/">Privacy</a>.</p>
        </div>
      </section>

      <footer class="pro-foot">
        <span>Zodiacs.org · Registry Pro working label · Quote laboratory</span>
        <span><a href="/registry/">Registry</a> · <a href="/disclosure/#origin">Origin receipts — 5 Jul 2024</a></span>
      </footer>
    </main>
  </div>
  <script>${wingNavScript()}</script>
</body>
</html>`;
  return page.replace(/[ \t]+$/gmu, '');
}
