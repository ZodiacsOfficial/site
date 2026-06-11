/*
 * Generates the twelve per-sign Open Graph share cards
 * (assets/og/{sign}.png, 1200×630) by rendering an auction-catalogue
 * card in headless Chromium and screenshotting it. Also refreshes the
 * openGraph.signs entries in assets/manifest.json so
 * scripts/validate-assets.mjs can verify the files.
 *
 * Run from the repo root:
 *
 *   node scripts/build-og-cards.mjs
 *
 * Requires Playwright with a Chromium build. If playwright is not
 * resolvable from the repo, point PLAYWRIGHT_MODULE at its index.mjs.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SIGN_ORDER } from './sign-data.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registry = JSON.parse(await readFile(resolve(root, 'registry/zodiacs.registry.json'), 'utf8'));
const manifestPath = resolve(root, 'assets/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function formatDateRange(raw) {
  // "03-21 to 04-19" → "MAR 21 — APR 19"
  const m = raw.match(/^(\d{2})-(\d{2}) to (\d{2})-(\d{2})$/);
  if (!m) return raw.toUpperCase();
  return `${MONTHS[+m[1] - 1]} ${+m[2]} — ${MONTHS[+m[3] - 1]} ${+m[4]}`;
}

function nameSize(name) {
  if (name.length > 9) return 96;   // Sagittarius
  if (name.length > 7) return 118;  // Capricorn, Aquarius
  return 148;
}

function cardHtml(asset, port) {
  const m = asset.metadata;
  const name = asset.displayName;
  const lot = ROMAN[SIGN_ORDER.indexOf(asset.sign)];
  return `<!doctype html>
<html><head><meta charset="utf-8">
<base href="http://127.0.0.1:${port}/">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    position: relative;
    background:
      radial-gradient(90% 70% at 78% 18%, rgba(201,169,97,0.10), transparent 60%),
      radial-gradient(110% 60% at 20% 110%, rgba(201,169,97,0.05), transparent 60%),
      #050609;
    color: #DCD7C7;
    font-family: 'Cormorant Garamond', Georgia, serif;
  }
  .grain {
    position: absolute; inset: 0; opacity: 0.05; mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.85  0 0 0 0 0.5  0 0 0 0.85 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  }
  .frame {
    position: absolute; inset: 22px;
    border: 1px solid rgba(201,169,97,0.26);
  }
  .tick { position: absolute; width: 12px; height: 12px; border: 0 solid #C9A961; opacity: 0.7; }
  .tick--tl { top: 16px; left: 16px; border-width: 1px 0 0 1px; }
  .tick--tr { top: 16px; right: 16px; border-width: 1px 1px 0 0; }
  .tick--bl { bottom: 16px; left: 16px; border-width: 0 0 1px 1px; }
  .tick--br { bottom: 16px; right: 16px; border-width: 0 1px 1px 0; }
  .inner {
    position: absolute; inset: 22px;
    display: grid;
    grid-template-columns: 1fr 430px;
    padding: 48px 56px 44px 64px;
    column-gap: 24px;
  }
  .left { display: flex; flex-direction: column; min-width: 0; }
  .eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 15px; font-weight: 400;
    letter-spacing: 0.32em; text-transform: uppercase;
    color: #C9A961;
  }
  .eyebrow .dim { color: #8A8576; }
  .mid { margin: auto 0; padding-bottom: 26px; }
  .name {
    font-style: italic; font-weight: 300;
    font-size: ${nameSize(name)}px;
    line-height: 0.96;
    letter-spacing: -0.012em;
    color: #ECE7D8;
    white-space: nowrap;
  }
  .name .end { color: #C9A961; }
  .lotline {
    margin-top: 30px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 15px; letter-spacing: 0.22em; text-transform: uppercase;
    color: #BDB8A9;
    text-wrap: balance;
    line-height: 1.7;
  }
  .lotline b { font-weight: 400; color: #DEC07A; }
  .lotline .sep { color: #88826A; padding: 0 10px; }
  .dates {
    margin-top: 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px; letter-spacing: 0.3em; text-transform: uppercase;
    color: #8A8576;
  }
  .foot {
    display: flex; flex-direction: column; gap: 9px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px; letter-spacing: 0.24em; text-transform: uppercase;
    color: #8A8576;
    white-space: nowrap;
  }
  .foot .url { color: #DEC07A; }
  .stage {
    position: relative;
    display: flex; align-items: flex-end; justify-content: center;
    padding-bottom: 34px;
  }
  .stage::before {
    content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 40%;
    background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.16) 60%, rgba(0,0,0,0.3) 100%);
  }
  .stage::after {
    content: ""; position: absolute; left: 10%; right: 10%; bottom: 26px; height: 1px;
    background: linear-gradient(90deg, transparent 0%, rgba(201,169,97,0.6) 22%, rgba(201,169,97,0.6) 78%, transparent 100%);
  }
  .stage img {
    position: relative; z-index: 1;
    max-width: 100%; max-height: 470px;
    object-fit: contain;
    filter:
      drop-shadow(0 10px 18px rgba(20,14,6,0.6))
      drop-shadow(0 3px 6px rgba(36,26,12,0.7));
  }
</style></head>
<body>
  <div class="grain"></div>
  <div class="frame"></div>
  <span class="tick tick--tl"></span><span class="tick tick--tr"></span>
  <span class="tick tick--bl"></span><span class="tick tick--br"></span>
  <div class="inner">
    <div class="left">
      <div class="eyebrow">Zodiacs.org <span class="dim">— The Official Registry</span></div>
      <div class="mid">
        <div class="name">${name}<span class="end">.</span></div>
        <div class="lotline"><b>Lot ${lot} / XII</b><span class="sep">·</span>${m.element}<span class="sep">·</span>${m.modality}<span class="sep">·</span>${m.archetype}</div>
        <div class="dates">${formatDateRange(m.dateRange)}</div>
      </div>
      <div class="foot">
        <span>Native on Solana · Bridged to Base</span>
        <span class="url">zodiacs.org/${asset.sign}/</span>
      </div>
    </div>
    <div class="stage">
      <img src="/assets/nuggets/${asset.sign}.png" alt="">
    </div>
  </div>
</body></html>`;
}

const PORT = 8129;
const server = spawn('http-server', [root, '-p', String(PORT), '--silent'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1200));

const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] });
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  ignoreHTTPSErrors: true,
});

const ogSigns = {};
try {
  for (const slug of SIGN_ORDER) {
    const asset = registry.assets.find((a) => a.sign === slug);
    if (!asset) throw new Error(`registry missing sign: ${slug}`);
    await page.setContent(cardHtml(asset, PORT), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    const out = resolve(root, `assets/og/${slug}.png`);
    await page.screenshot({ path: out });
    const bytes = (await readFile(out)).byteLength;
    ogSigns[slug] = { path: `assets/og/${slug}.png`, width: 1200, height: 630, bytes };
    console.log(`assets/og/${slug}.png  ${bytes} bytes`);
  }
} finally {
  await browser.close();
  server.kill();
}

manifest.openGraph.signs = ogSigns;
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Updated ${manifestPath} (openGraph.signs, 12 entries).`);
