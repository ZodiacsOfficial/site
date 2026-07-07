/*
 * Generates the new wing's Open Graph share cards in the Cosmic Void
 * system — 1200×630 PNGs under public/assets/og/v2/:
 *
 *   share.png              site-wide default
 *   sign/{slug}.png        the 12 sign guides
 *   tool/{key}.png         calculators + hubs
 *   pair/{a}-{b}.png       all 78 compatibility pairings
 *   horoscope/{slug}.png   the 12 horoscope pages (month-free, evergreen)
 *   placements/{planet}.png  one per planet, shared by its 12 placement pages
 *   rising/{slug}.png      the 12 rising-sign profiles
 *
 * The legacy gilt cards at assets/og/*.png stay byte-identical — the
 * collector's wing still references them. This script never touches
 * them, the manifest, or anything the wing generators own.
 *
 *   npm run data:og
 *
 * Deterministic and offline: fonts and disc art are inlined as data:
 * URIs; Chromium comes from playwright-core (PLAYWRIGHT_MODULE and
 * CHROMIUM_PATH override module and binary).
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(root, 'public/assets/og/v2');

// Canonical sign data straight from the site's own table (signs.ts has
// no imports and only erasable TS, so Node's type stripping loads it).
const { SIGNS, ELEMENT_LABEL, MODALITY_LABEL } = await import(
  pathToFileURL(resolve(root, 'src/lib/signs.ts')).href
);

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core');
const executablePath =
  process.env.CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

// ── Inlined assets ────────────────────────────────────────────────────
const b64 = async (path, mime) =>
  `data:${mime};base64,${(await readFile(resolve(root, path))).toString('base64')}`;

const FONTS = {
  serif500: await b64('public/fonts/eb-garamond-latin-500-normal.woff2', 'font/woff2'),
  serifItalic: await b64('public/fonts/eb-garamond-latin-400-italic.woff2', 'font/woff2'),
  sans: await b64('public/fonts/instrument-sans-latin-wght-normal.woff2', 'font/woff2'),
  mono: await b64('public/fonts/jetbrains-mono-latin-wght-normal.woff2', 'font/woff2'),
};

const DISCS = {};
for (const s of SIGNS) {
  DISCS[s.slug] = await b64(`public/assets/sdk/zodiac-icons/circle/${s.slug}.png`, 'image/png');
}

// ── Shared chrome ─────────────────────────────────────────────────────
const INK = '#EEF1F7';
const INK2 = '#C6CCDA';
const MUTED = '#8E96AB';
const VOID = '#060709';
const HAIR = 'rgba(198, 204, 218, 0.10)';

function shell(body, footer, { centered = false } = {}) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face { font-family: 'EB Garamond'; font-weight: 500; src: url(${FONTS.serif500}) format('woff2'); }
  @font-face { font-family: 'EB Garamond'; font-weight: 400; font-style: italic; src: url(${FONTS.serifItalic}) format('woff2'); }
  @font-face { font-family: 'Instrument Sans'; font-weight: 100 900; src: url(${FONTS.sans}) format('woff2'); }
  @font-face { font-family: 'JetBrains Mono'; font-weight: 100 800; src: url(${FONTS.mono}) format('woff2'); }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    background: ${VOID};
    font-family: 'Instrument Sans', sans-serif;
    color: ${INK};
    position: relative;
    overflow: hidden;
  }
  .stage {
    position: absolute;
    inset: 0 88px 96px;
    display: flex;
    align-items: center;
    ${centered ? 'justify-content: center; text-align: center;' : 'justify-content: space-between;'}
    gap: 48px;
  }
  .rule { position: absolute; left: 88px; right: 88px; bottom: 84px; height: 1px; background: ${HAIR}; }
  .footer {
    position: absolute;
    left: 88px;
    right: 88px;
    bottom: 40px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 19px;
    letter-spacing: 0.06em;
    color: ${MUTED};
    ${centered ? 'text-align: center;' : ''}
  }
  .kicker {
    font-family: 'EB Garamond', serif;
    font-style: italic;
    font-weight: 400;
    font-size: 30px;
    color: ${INK2};
    display: block;
    margin-bottom: 14px;
  }
  .display {
    font-family: 'EB Garamond', serif;
    font-weight: 500;
    line-height: 1.04;
    letter-spacing: -0.005em;
    font-variant-numeric: oldstyle-figures;
  }
  .sub { font-size: 28px; color: ${INK2}; line-height: 1.45; margin-top: 18px; }
  .data {
    font-family: 'JetBrains Mono', monospace;
    font-size: 20px;
    letter-spacing: 0.04em;
    color: ${MUTED};
    margin-top: 22px;
  }
  .disc { border-radius: 50%; display: block; }
  .left { max-width: 660px; }
</style></head>
<body>
  ${body}
  <div class="rule"></div>
  <div class="footer">${footer}</div>
</body></html>`;
}

/** The twelve pastel discs as a small wheel — the sign-less brand mark. */
function wheelMark(diameter, dot) {
  const r = (diameter - dot) / 2;
  const c = diameter / 2;
  const dots = SIGNS.map((s, i) => {
    const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
    const x = c + r * Math.cos(a) - dot / 2;
    const y = c + r * Math.sin(a) - dot / 2;
    return `<span style="position:absolute;left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${dot}px;height:${dot}px;border-radius:50%;background:${s.hue}"></span>`;
  }).join('');
  return `<span style="position:relative;display:block;width:${diameter}px;height:${diameter}px">${dots}</span>`;
}

const nameSize = (name) => (name.length >= 10 ? 104 : name.length >= 8 ? 118 : 132);

// ── Card renderers ────────────────────────────────────────────────────
function shareCard() {
  const body = `
  <div class="stage" style="flex-direction: column; justify-content: center; gap: 40px;">
    ${wheelMark(160, 15)}
    <div>
      <div class="display" style="font-size: 68px; max-width: 900px;">Explore the stars behind your story.</div>
      <div class="sub" style="font-size: 26px; color: ${MUTED};">Free birth charts, sign guides, and astrology tools.</div>
    </div>
  </div>`;
  return shell(body, 'zodiacs.org', { centered: true });
}

function signCard(s) {
  const body = `
  <div class="stage">
    <div class="left">
      <span class="kicker">Sign guide</span>
      <div class="display" style="font-size: ${nameSize(s.name)}px;">${s.name}</div>
      <div class="sub" style="max-width: 620px;">${s.essence}</div>
      <div class="data">${s.dates} · ${ELEMENT_LABEL[s.element]} · ${MODALITY_LABEL[s.modality]}</div>
    </div>
    <img class="disc" src="${DISCS[s.slug]}" width="360" height="360"
         style="box-shadow: 0 30px 90px ${s.hue}40;" />
  </div>`;
  return shell(body, `zodiacs.org/${s.slug}/`);
}

function toolCard(t) {
  const body = `
  <div class="stage">
    <div class="left">
      <span class="kicker">${t.kicker}</span>
      <div class="display" style="font-size: 76px;">${t.title}</div>
      <div class="sub" style="font-size: 26px; color: ${MUTED}; max-width: 640px;">${t.sub}</div>
    </div>
    ${wheelMark(300, 26)}
  </div>`;
  return shell(body, `zodiacs.org${t.path}`);
}

function pairCard(a, b) {
  const same = a.slug === b.slug;
  const discs = same
    ? `<img class="disc" src="${DISCS[a.slug]}" width="320" height="320" style="box-shadow: 0 30px 90px ${a.hue}40;" />`
    : `<div style="display:flex;align-items:center;">
         <img class="disc" src="${DISCS[a.slug]}" width="300" height="300" />
         <img class="disc" src="${DISCS[b.slug]}" width="300" height="300"
              style="margin-left:-72px; box-shadow: 0 0 0 10px ${VOID};" />
       </div>`;
  const dataLine = same
    ? `<div class="sub" style="font-size: 24px; max-width: 560px;">${a.essence}</div>`
    : `<div class="data">${ELEMENT_LABEL[a.element]} and ${ELEMENT_LABEL[b.element].toLowerCase()} · ${MODALITY_LABEL[a.modality].toLowerCase()} and ${MODALITY_LABEL[b.modality].toLowerCase()}</div>`;
  const body = `
  <div class="stage">
    <div class="left">
      <span class="kicker">Compatibility</span>
      <div class="display" style="font-size: 72px; line-height: 1.08;">${a.name}<br/>and ${b.name}</div>
      ${dataLine}
    </div>
    ${discs}
  </div>`;
  return shell(body, `zodiacs.org/compatibility/${a.slug}-${b.slug}/`);
}

function placementCard(planet, glyph) {
  const discsRow = SIGNS.map((s) =>
    `<span style="display:inline-block;width:26px;height:26px;border-radius:50%;background:${s.hue};margin-right:10px;"></span>`,
  ).join('');
  const body = `
  <div class="stage">
    <div class="left">
      <span class="kicker">Placements</span>
      <div class="display" style="font-size: 72px; line-height: 1.08;">${planet} through<br/>the signs</div>
      <div class="sub" style="font-size: 26px; color: ${MUTED}; max-width: 620px;">All twelve ${planet} placements, read closely.</div>
      <div style="margin-top: 26px; line-height: 0;">${discsRow}</div>
    </div>
    <span style="font-family: 'EB Garamond', serif; font-size: 220px; color: ${INK2}; opacity: 0.9; line-height: 1;">${glyph}</span>
  </div>`;
  return shell(body, 'zodiacs.org/learn/placements/');
}

function horoscopeCard(s) {
  const body = `
  <div class="stage">
    <div class="left">
      <span class="kicker">Monthly horoscope</span>
      <div class="display" style="font-size: ${nameSize(s.name)}px;">${s.name}</div>
      <div class="sub" style="font-size: 26px; color: ${MUTED};">Monthly horoscopes grounded in real moon phases, retrogrades, and major transits.</div>
      <div class="data">${s.dates}</div>
    </div>
    <img class="disc" src="${DISCS[s.slug]}" width="340" height="340"
         style="box-shadow: 0 30px 90px ${s.hue}40;" />
  </div>`;
  return shell(body, `zodiacs.org/horoscopes/${s.slug}/`);
}

function risingCard(s) {
  const body = `
  <div class="stage">
    <div class="left">
      <span class="kicker">Rising signs</span>
      <div class="display" style="font-size: 84px; line-height: 1.06;">${s.name}<br/>rising</div>
      <div class="sub" style="font-size: 26px; color: ${MUTED};">How the world first meets you — and the planet that steers your chart.</div>
      <div class="data">the ascendant changes sign about every two hours</div>
    </div>
    <img class="disc" src="${DISCS[s.slug]}" width="340" height="340"
         style="box-shadow: 0 30px 90px ${s.hue}40;" />
  </div>`;
  return shell(body, `zodiacs.org/rising-sign/${s.slug}/`);
}

const TOOLS = [
  { key: 'birth-chart', path: '/birth-chart/', kicker: 'Free calculator', title: 'Your birth chart', sub: 'Sun, moon, rising, houses, and aspects — computed on your device.' },
  { key: 'moon-sign', path: '/moon-sign/', kicker: 'Free calculator', title: 'Your moon sign', sub: 'How you feel and what soothes you — from your date, time, and place of birth.' },
  { key: 'rising-sign', path: '/rising-sign/', kicker: 'Free calculator', title: 'Your rising sign', sub: 'How people first read you — from your birth time and place.' },
  { key: 'moon-phase', path: '/moon-phase/', kicker: 'Free calculator', title: 'The moon, any night', sub: 'Tonight’s phase, and the moon of any date that matters to you.' },
  { key: 'saturn-return', path: '/saturn-return/', kicker: 'Free calculator', title: 'Your Saturn return', sub: 'The exact dates, every pass and retrograde loop included.' },
  { key: 'mercury-retrograde', path: '/mercury-retrograde/', kicker: 'The calendar', title: 'Mercury retrograde', sub: 'Every window through 2027, computed from the planet’s real motion.' },
  { key: 'compatibility', path: '/compatibility/', kicker: 'Compatibility', title: 'Two charts, compared', sub: 'Whole-chart synastry — plus guides to all 78 sign pairings.' },
  { key: 'horoscopes', path: '/horoscopes/', kicker: 'Monthly horoscopes', title: 'All twelve signs', sub: 'Grounded in real moon phases, retrogrades, and major transits.' },
  { key: 'learn', path: '/learn/', kicker: 'Learn astrology', title: 'Read your chart', sub: 'The signs, the planets, the houses, and the aspects, in plain language.' },
  { key: 'how-to-read-a-birth-chart', path: '/learn/how-to-read-a-birth-chart/', kicker: 'Learn astrology', title: 'How to read a birth chart', sub: 'Big three, planets room by room, the working aspects, then the weather — in order.' },
  { key: 'tools', path: '/tools/', kicker: 'Free astrology tools', title: 'Calculators, no signup', sub: 'Birth chart, compatibility, moon sign, and more — computed on your device.' },
  { key: 'transits', path: '/transits/', kicker: 'Free tracker', title: 'Your transits, today', sub: 'The current sky aspected to your birth chart, within 3° of exact.' },
  { key: 'eclipses', path: '/eclipses/', kicker: 'The calendar', title: 'Eclipses, dated', sub: 'Every solar and lunar eclipse through 2028, with exact peak times and signs.' },
  { key: 'full-moon-calendar', path: '/full-moon-calendar/', kicker: 'The calendar', title: 'Every full moon', sub: 'Exact instants through 2027, with each moon’s sign, degree, and name.' },
  { key: 'retrogrades', path: '/retrogrades/', kicker: 'The calendar', title: 'Every retrograde', sub: 'All eight planets, 2026–2027, computed station to station.' },
];

// ── Render loop ───────────────────────────────────────────────────────
for (const dir of ['', 'sign', 'tool', 'pair', 'horoscope', 'placements', 'rising', 'pin']) {
  await mkdir(resolve(OUT, dir), { recursive: true });
}

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

let total = 0;
let count = 0;

async function shoot(html, outPath) {
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120);
  const raw = await page.screenshot({ type: 'png' });
  const buf = await sharp(raw).png({ palette: true, compressionLevel: 9, effort: 8 }).toBuffer();
  await writeFile(resolve(OUT, outPath), buf);
  total += buf.length;
  count += 1;
  if (count % 20 === 0) console.log(`  …${count} cards, ${(total / 1024 / 1024).toFixed(1)}MB so far`);
}

console.log('Rendering Cosmic Void OG cards…');
await shoot(shareCard(), 'share.png');
for (const s of SIGNS) await shoot(signCard(s), `sign/${s.slug}.png`);
for (const t of TOOLS) await shoot(toolCard(t), `tool/${t.key}.png`);
for (let i = 0; i < SIGNS.length; i += 1) {
  for (let j = i; j < SIGNS.length; j += 1) {
    await shoot(pairCard(SIGNS[i], SIGNS[j]), `pair/${SIGNS[i].slug}-${SIGNS[j].slug}.png`);
  }
}
for (const s of SIGNS) await shoot(horoscopeCard(s), `horoscope/${s.slug}.png`);
for (const s of SIGNS) await shoot(risingCard(s), `rising/${s.slug}.png`);
const PLANET_GLYPHS = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};
for (const [planet, glyph] of Object.entries(PLANET_GLYPHS)) {
  await shoot(placementCard(planet, glyph), `placements/${planet.toLowerCase()}.png`);
}

// ── Pinterest pins — 1000×1500, the 2:3 ratio pins want ──────────────
function pinShell(body, footer) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face { font-family: 'EB Garamond'; font-weight: 500; src: url(${FONTS.serif500}) format('woff2'); }
  @font-face { font-family: 'EB Garamond'; font-weight: 400; font-style: italic; src: url(${FONTS.serifItalic}) format('woff2'); }
  @font-face { font-family: 'Instrument Sans'; font-weight: 100 900; src: url(${FONTS.sans}) format('woff2'); }
  @font-face { font-family: 'JetBrains Mono'; font-weight: 100 800; src: url(${FONTS.mono}) format('woff2'); }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1000px; height: 1500px; }
  body { background: ${VOID}; font-family: 'Instrument Sans', sans-serif; color: ${INK}; position: relative; overflow: hidden; }
  .pstage { position: absolute; inset: 110px 84px 150px; display: flex; flex-direction: column; align-items: center; text-align: center; justify-content: center; gap: 44px; }
  .prule { position: absolute; left: 84px; right: 84px; bottom: 128px; height: 1px; background: ${HAIR}; }
  .pfooter { position: absolute; left: 84px; right: 84px; bottom: 68px; font-family: 'JetBrains Mono', monospace; font-size: 22px; letter-spacing: 0.06em; color: ${MUTED}; text-align: center; }
  .kicker { font-family: 'EB Garamond', serif; font-style: italic; font-weight: 400; font-size: 36px; color: ${INK2}; display: block; margin-bottom: 6px; }
  .display { font-family: 'EB Garamond', serif; font-weight: 500; line-height: 1.02; letter-spacing: -0.005em; font-variant-numeric: oldstyle-figures; }
  .sub { font-size: 32px; color: ${INK2}; line-height: 1.5; max-width: 720px; }
  .data { font-family: 'JetBrains Mono', monospace; font-size: 24px; letter-spacing: 0.05em; color: ${MUTED}; }
  .disc { border-radius: 50%; display: block; }
</style></head>
<body>
  ${body}
  <div class="prule"></div>
  <div class="pfooter">${footer}</div>
</body></html>`;
}

function pinSign(s) {
  const body = `
  <div class="pstage">
    <span class="kicker">Sign guide</span>
    <img class="disc" src="${DISCS[s.slug]}" width="440" height="440" style="box-shadow: 0 44px 130px ${s.hue}45;" />
    <div>
      <div class="display" style="font-size: ${nameSize(s.name) + 22}px;">${s.name}</div>
      <div class="data" style="margin-top: 20px;">${s.dates} · ${ELEMENT_LABEL[s.element]} · ${MODALITY_LABEL[s.modality]}</div>
    </div>
    <div class="sub">${s.essence}</div>
  </div>`;
  return pinShell(body, `zodiacs.org/${s.slug}/`);
}

function pinHoroscope(s) {
  const body = `
  <div class="pstage">
    <span class="kicker">Monthly horoscope</span>
    <img class="disc" src="${DISCS[s.slug]}" width="400" height="400" style="box-shadow: 0 44px 130px ${s.hue}45;" />
    <div>
      <div class="display" style="font-size: ${nameSize(s.name) + 8}px;">${s.name}, this month</div>
      <div class="data" style="margin-top: 20px;">${s.dates}</div>
    </div>
    <div class="sub">Grounded in the real sky: moon phases, retrogrades, and major transits, each with its date.</div>
  </div>`;
  return pinShell(body, `zodiacs.org/horoscopes/${s.slug}/`);
}

function pinHowTo() {
  const steps = [
    '1 · The big three',
    '2 · Planets, room by room',
    '3 · The working aspects',
    '4 · The chart’s weather',
  ]
    .map((t) => `<div class="data" style="font-size: 28px; color: ${INK2};">${t}</div>`)
    .join('');
  const body = `
  <div class="pstage" style="gap: 52px;">
    <span class="kicker">Learn astrology</span>
    ${wheelMark(300, 26)}
    <div class="display" style="font-size: 96px; max-width: 800px;">How to read a birth chart.</div>
    <div style="display: grid; gap: 18px;">${steps}</div>
  </div>`;
  return pinShell(body, 'zodiacs.org/learn/how-to-read-a-birth-chart/');
}

await page.setViewportSize({ width: 1000, height: 1500 });
for (const s of SIGNS) await shoot(pinSign(s), `pin/${s.slug}.png`);
for (const s of SIGNS) await shoot(pinHoroscope(s), `pin/horoscope-${s.slug}.png`);
await shoot(pinHowTo(), 'pin/how-to-read-a-birth-chart.png');

await browser.close();

const mb = total / 1024 / 1024;
console.log(`Done — ${count} cards, ${mb.toFixed(2)}MB → public/assets/og/v2/`);
if (mb > 10) {
  console.error('ABORT: v2 card set exceeds the 10MB budget — tighten the palette (colors: 128) and rerun.');
  process.exit(1);
}
