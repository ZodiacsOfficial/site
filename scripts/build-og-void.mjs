/*
 * Generates the new wing's Open Graph share cards in the Cosmic Void
 * system — 1200×630 PNGs under public/assets/og/v2/:
 *
 *   share.png              site-wide default
 *   sign/{slug}.png        the 12 sign guides
 *   registry/{slug}.png    the 12 Registry lots (Nº / Lot convention)
 *   registry.png           Registry landing page
 *   thesis.png             Registry thesis
 *   disclosure.png         Registry disclosure
 *   tool/{key}.png         calculators + hubs
 *   pair/{a}-{b}.png       all 78 compatibility pairings
 *   horoscope/{slug}.png   one evergreen family card per sign, shared by
 *                          daily, weekly, monthly, topical, and yearly pages
 *   placements/{planet}.png  one per planet, shared by its 12 placement pages
 *   rising/{slug}.png      the 12 rising-sign profiles
 *   almanac/{slug}.png     the Almanac hub + published articles
 *
 * The legacy gilt cards at assets/og/*.png stay byte-identical — the
 * frozen originals remain available. This script never touches those files
 * or any HTML owned by the wing generators.
 *
 *   npm run data:og
 *   npm run data:og -- --only-horoscopes  # refresh the horoscope family
 *
 * Deterministic and offline: fonts and disc art are inlined as data:
 * URIs; Chromium comes from playwright-core (PLAYWRIGHT_MODULE and
 * CHROMIUM_PATH override module and binary).
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
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
const { OG_EN } = await import(pathToFileURL(resolve(root, 'src/strings/seo.en.mjs')).href);

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
  // The public 128px WebP tier is the canonical art primitive for every new
  // surface. It is deliberately scaled by the card rather than substituted
  // with a glyph, emoji, hue-only dot, or SDK packaging asset.
  DISCS[s.slug] = await b64(`public/assets/zodiac-icons/128/${s.slug}.webp`, 'image/webp');
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

/** The twelve canonical sign icons as the sign-less wheel mark. */
function wheelMark(diameter, dot) {
  const r = (diameter - dot) / 2;
  const c = diameter / 2;
  const dots = SIGNS.map((s, i) => {
    const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
    const x = c + r * Math.cos(a) - dot / 2;
    const y = c + r * Math.sin(a) - dot / 2;
    return `<img src="${DISCS[s.slug]}" width="${dot}" height="${dot}" alt=""
      style="position:absolute;left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${dot}px;height:${dot}px;border-radius:50%;display:block" />`;
  }).join('');
  return `<span style="position:relative;display:block;width:${diameter}px;height:${diameter}px">${dots}</span>`;
}

const nameSize = (name) => (name.length >= 10 ? 104 : name.length >= 8 ? 118 : 132);
const signName = (sign) => OG_EN.signNames[sign.slug] ?? sign.name;
const format = (template, values) => Object.entries(values).reduce(
  (copy, [name, value]) => copy.replaceAll(`{${name}}`, String(value)),
  template,
);

// ── Card renderers ────────────────────────────────────────────────────
function shareCard() {
  const body = `
  <div class="stage" style="flex-direction: column; justify-content: center; gap: 40px;">
    ${wheelMark(160, 15)}
    <div>
      <div class="display" style="font-size: 68px; max-width: 900px;">${OG_EN.share.title}</div>
      <div class="sub" style="font-size: 26px; color: ${MUTED};">${OG_EN.share.subtitle}</div>
    </div>
  </div>`;
  return shell(body, OG_EN.site, { centered: true });
}

/** The thesis page's own card — reference-document register, no consumer
 *  copy. Emitted alone via --only-thesis so the other cards stay put. */
function thesisCard() {
  const body = `
  <div class="stage" style="flex-direction: column; justify-content: center; gap: 40px;">
    ${wheelMark(160, 15)}
    <div>
      <span class="kicker">${OG_EN.thesis.kicker}</span>
      <div class="display" style="font-size: 76px; max-width: 980px;">${OG_EN.thesis.title}</div>
    </div>
  </div>`;
  return shell(body, OG_EN.thesis.footer, { centered: true });
}

function signCard(s) {
  const title = signName(s);
  const body = `
  <div class="stage">
    <div class="left">
      <span class="kicker">${OG_EN.signGuide.kicker}</span>
      <div class="display" style="font-size: ${nameSize(title)}px;">${title}</div>
      <div class="sub" style="max-width: 620px;">${s.essence}</div>
      <div class="data">${s.dates} · ${ELEMENT_LABEL[s.element]} · ${MODALITY_LABEL[s.modality]}</div>
    </div>
    <img class="disc" src="${DISCS[s.slug]}" width="360" height="360"
         style="box-shadow: 0 30px 90px ${s.hue}40;" />
  </div>`;
  return shell(body, `zodiacs.org/${s.slug}/`);
}

const LOTS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function registryLotCard(s, index) {
  const title = signName(s);
  const number = String(index + 1).padStart(2, '0');
  const lot = LOTS[index];
  const numberLine = OG_EN.registryLot.numberLine
    .replace('{number}', number)
    .replace('{lot}', lot);
  const body = `
  <div class="stage">
    <div class="left">
      <span class="kicker">${OG_EN.registryLot.kicker}</span>
      <div class="display" style="font-size: ${nameSize(title)}px;">${title}</div>
      <div class="data" style="font-size:24px;color:${INK2};">${numberLine}</div>
      <div class="sub" style="font-size:23px;color:${MUTED};max-width:640px;">${OG_EN.registryLot.subtitle}</div>
    </div>
    <img class="disc" src="${DISCS[s.slug]}" width="360" height="360"
         style="box-shadow: 0 30px 90px ${s.hue}40;" />
  </div>`;
  return shell(body, `zodiacs.org/registry/${s.slug}/`);
}

function registryCard() {
  const body = `
  <div class="stage">
    <div class="left">
      <span class="kicker">${OG_EN.registry.kicker}</span>
      <div class="display" style="font-size: 78px;max-width:680px;">${OG_EN.registry.title}</div>
      <div class="sub" style="font-size:25px;color:${MUTED};max-width:620px;">${OG_EN.registry.subtitle}</div>
      <div class="data">${OG_EN.registry.data}</div>
    </div>
    ${wheelMark(330, 38)}
  </div>`;
  return shell(body, 'zodiacs.org/registry/');
}

function disclosureCard() {
  const body = `
  <div class="stage">
    <div class="left">
      <span class="kicker">${OG_EN.disclosure.kicker}</span>
      <div class="display" style="font-size: 72px;max-width:720px;">${OG_EN.disclosure.title}</div>
      <div class="sub" style="font-size:25px;color:${MUTED};max-width:690px;">${OG_EN.disclosure.subtitle}</div>
    </div>
    ${wheelMark(280, 32)}
  </div>`;
  return shell(body, 'zodiacs.org/disclosure/');
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
  const aTitle = signName(a);
  const bTitle = signName(b);
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
    : `<div class="data">${format(OG_EN.compatibility.data, {
      aElement: ELEMENT_LABEL[a.element],
      bElement: ELEMENT_LABEL[b.element].toLowerCase(),
      aModality: MODALITY_LABEL[a.modality].toLowerCase(),
      bModality: MODALITY_LABEL[b.modality].toLowerCase(),
    })}</div>`;
  const body = `
  <div class="stage">
    <div class="left">
      <span class="kicker">${OG_EN.compatibility.kicker}</span>
      <div class="display" style="font-size: 72px; line-height: 1.08;">${format(OG_EN.compatibility.title, { a: aTitle, b: bTitle })}</div>
      ${dataLine}
    </div>
    ${discs}
  </div>`;
  return shell(body, `zodiacs.org/compatibility/${a.slug}-${b.slug}/`);
}

function placementCard(planetKey, glyph) {
  const planet = OG_EN.planetNames[planetKey];
  const discsRow = SIGNS.map((s) =>
    `<img src="${DISCS[s.slug]}" width="26" height="26" alt="" style="display:inline-block;width:26px;height:26px;border-radius:50%;margin-right:10px;" />`,
  ).join('');
  const body = `
  <div class="stage">
    <div class="left">
      <span class="kicker">${OG_EN.placements.kicker}</span>
      <div class="display" style="font-size: 72px; line-height: 1.08;">${format(OG_EN.placements.title, { planet })}</div>
      <div class="sub" style="font-size: 26px; color: ${MUTED}; max-width: 620px;">${OG_EN.placements.subtitle.replace('{planet}', planet)}</div>
      <div style="margin-top: 26px; line-height: 0;">${discsRow}</div>
    </div>
    <span style="font-family: 'EB Garamond', serif; font-size: 220px; color: ${INK2}; opacity: 0.9; line-height: 1;">${glyph}</span>
  </div>`;
  return shell(body, 'zodiacs.org/learn/placements/');
}

function horoscopeCard(s) {
  const title = signName(s);
  const body = `
  <div class="stage">
    <div class="left">
      <span class="kicker">${OG_EN.horoscope.kicker}</span>
      <div class="display" style="font-size: ${nameSize(title)}px;">${title}</div>
      <div class="sub" style="font-size: 26px; color: ${MUTED};">${OG_EN.horoscope.subtitle}</div>
      <div class="data">${s.dates}</div>
    </div>
    <img class="disc" src="${DISCS[s.slug]}" width="340" height="340"
         style="box-shadow: 0 30px 90px ${s.hue}40;" />
  </div>`;
  return shell(body, `zodiacs.org/horoscopes/${s.slug}/`);
}

function risingCard(s) {
  const title = signName(s);
  const body = `
  <div class="stage">
    <div class="left">
      <span class="kicker">${OG_EN.rising.kicker}</span>
      <div class="display" style="font-size: 84px; line-height: 1.06;">${format(OG_EN.rising.title, { sign: title })}</div>
      <div class="sub" style="font-size: 26px; color: ${MUTED};">${OG_EN.rising.subtitle}</div>
      <div class="data">${OG_EN.rising.data}</div>
    </div>
    <img class="disc" src="${DISCS[s.slug]}" width="340" height="340"
         style="box-shadow: 0 30px 90px ${s.hue}40;" />
  </div>`;
  return shell(body, `zodiacs.org/rising-sign/${s.slug}/`);
}

function almanacCard({ title, sub, path, hub = false }) {
  const size = title.length > 40 ? 62 : title.length > 28 ? 68 : 76;
  const body = `
  <div class="stage">
    <div class="left" style="max-width: 720px;">
      <span class="kicker">${hub ? 'The sky, written down' : 'The Almanac'}</span>
      <div class="display" style="font-size: ${size}px;">${title}</div>
      <div class="sub" style="font-size: 25px; color: ${MUTED}; max-width: 700px;">${sub}</div>
    </div>
    ${wheelMark(250, 22)}
  </div>`;
  return shell(body, `zodiacs.org${path}`);
}

function frontmatterField(source, name) {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const raw = frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]?.trim();
  if (!raw) throw new Error(`Almanac entry missing ${name}`);
  return raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^['"]|['"]$/g, '');
}

function frontmatterBoolean(source, name) {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  return frontmatter.match(new RegExp(`^${name}:\\s*(true|false)\\s*$`, 'm'))?.[1] === 'true';
}

const almanacEntries = (await Promise.all(
  (await readdir(resolve(root, 'src/content/almanac')))
    .filter((file) => file.endsWith('.mdx'))
    .sort()
    .map(async (file) => {
      const source = await readFile(resolve(root, 'src/content/almanac', file), 'utf8');
      return {
        slug: file.replace(/\.mdx$/, ''),
        title: frontmatterField(source, 'title'),
        description: frontmatterField(source, 'description'),
        draft: frontmatterBoolean(source, 'draft'),
      };
    }),
)).filter((entry) => !entry.draft);

const TOOLS = OG_EN.tools;

// ── Render loop ───────────────────────────────────────────────────────
for (const dir of ['', 'sign', 'registry', 'tool', 'pair', 'horoscope', 'placements', 'rising', 'almanac', 'pin']) {
  await mkdir(resolve(OUT, dir), { recursive: true });
}

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const onlyHoroscopes = process.argv.includes('--only-horoscopes');

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

if (process.argv.includes('--only-almanac')) {
  console.log('Rendering Almanac OG cards…');
  await shoot(almanacCard({
    title: 'The Almanac',
    sub: "What's actually happening up there each month, and what the tradition makes of it.",
    path: '/almanac/',
    hub: true,
  }), 'almanac/index.png');
  for (const entry of almanacEntries) {
    await shoot(almanacCard({
      title: entry.title,
      sub: entry.description,
      path: `/almanac/${entry.slug}/`,
    }), `almanac/${entry.slug}.png`);
  }
  console.log(`Done: ${count} card(s), ${(total / 1024).toFixed(0)}KB.`);
  await browser.close();
  process.exit(0);
}

const PLANET_GLYPHS = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
};

console.log(onlyHoroscopes ? 'Rendering horoscope-family cards…' : 'Rendering Cosmic Void OG cards…');
if (onlyHoroscopes) {
  const horoscopeTool = TOOLS.find((tool) => tool.key === 'horoscopes');
  if (!horoscopeTool) throw new Error('Missing horoscopes tool-card copy');
  await shoot(toolCard(horoscopeTool), 'tool/horoscopes.png');
  for (const s of SIGNS) await shoot(horoscopeCard(s), `horoscope/${s.slug}.png`);
} else {
  await shoot(thesisCard(), 'thesis.png');
  if (process.argv.includes('--only-thesis')) {
    console.log(`Done: ${count} card(s), ${(total / 1024).toFixed(0)}KB.`);
    await browser.close();
    process.exit(0);
  }
  // Keep the established global fallback byte-stable unless a deliberate
  // fallback refresh is explicitly requested.
  if (process.argv.includes('--include-fallback')) await shoot(shareCard(), 'share.png');
  await shoot(almanacCard({
    title: 'The Almanac',
    sub: "What's actually happening up there each month, and what the tradition makes of it.",
    path: '/almanac/',
    hub: true,
  }), 'almanac/index.png');
  for (const entry of almanacEntries) {
    await shoot(almanacCard({
      title: entry.title,
      sub: entry.description,
      path: `/almanac/${entry.slug}/`,
    }), `almanac/${entry.slug}.png`);
  }
  for (const s of SIGNS) await shoot(signCard(s), `sign/${s.slug}.png`);
  for (let i = 0; i < SIGNS.length; i += 1) {
    await shoot(registryLotCard(SIGNS[i], i), `registry/${SIGNS[i].slug}.png`);
  }
  await shoot(registryCard(), 'registry.png');
  await shoot(disclosureCard(), 'disclosure.png');
  for (const t of TOOLS) await shoot(toolCard(t), `tool/${t.key}.png`);
  for (let i = 0; i < SIGNS.length; i += 1) {
    for (let j = i; j < SIGNS.length; j += 1) {
      await shoot(pairCard(SIGNS[i], SIGNS[j]), `pair/${SIGNS[i].slug}-${SIGNS[j].slug}.png`);
    }
  }
  for (const s of SIGNS) await shoot(horoscopeCard(s), `horoscope/${s.slug}.png`);
  for (const s of SIGNS) await shoot(risingCard(s), `rising/${s.slug}.png`);
  for (const [planetKey, glyph] of Object.entries(PLANET_GLYPHS)) {
    await shoot(placementCard(planetKey, glyph), `placements/${planetKey}.png`);
  }
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
  const title = signName(s);
  const body = `
  <div class="pstage">
    <span class="kicker">${OG_EN.pin.signGuide.kicker}</span>
    <img class="disc" src="${DISCS[s.slug]}" width="440" height="440" style="box-shadow: 0 44px 130px ${s.hue}45;" />
    <div>
      <div class="display" style="font-size: ${nameSize(title) + 22}px;">${title}</div>
      <div class="data" style="margin-top: 20px;">${s.dates} · ${ELEMENT_LABEL[s.element]} · ${MODALITY_LABEL[s.modality]}</div>
    </div>
    <div class="sub">${s.essence}</div>
  </div>`;
  return pinShell(body, `zodiacs.org/${s.slug}/`);
}

function pinHoroscope(s) {
  const title = signName(s);
  const body = `
  <div class="pstage">
    <span class="kicker">${OG_EN.pin.horoscope.kicker}</span>
    <img class="disc" src="${DISCS[s.slug]}" width="400" height="400" style="box-shadow: 0 44px 130px ${s.hue}45;" />
    <div>
      <div class="display" style="font-size: ${nameSize(title) + 8}px;">${format(OG_EN.pin.horoscope.title, { sign: title })}</div>
      <div class="data" style="margin-top: 20px;">${s.dates}</div>
    </div>
    <div class="sub">${OG_EN.pin.horoscope.subtitle}</div>
  </div>`;
  return pinShell(body, `zodiacs.org/horoscopes/${s.slug}/`);
}

function pinHowTo() {
  const steps = Object.values(OG_EN.pin.howTo.steps)
    .map((t) => `<div class="data" style="font-size: 28px; color: ${INK2};">${t}</div>`)
    .join('');
  const body = `
  <div class="pstage" style="gap: 52px;">
    <span class="kicker">${OG_EN.pin.howTo.kicker}</span>
    ${wheelMark(300, 26)}
    <div class="display" style="font-size: 96px; max-width: 800px;">${OG_EN.pin.howTo.title}</div>
    <div style="display: grid; gap: 18px;">${steps}</div>
  </div>`;
  return pinShell(body, 'zodiacs.org/learn/how-to-read-a-birth-chart/');
}

await page.setViewportSize({ width: 1000, height: 1500 });
if (!onlyHoroscopes) {
  for (const s of SIGNS) await shoot(pinSign(s), `pin/${s.slug}.png`);
}
for (const s of SIGNS) await shoot(pinHoroscope(s), `pin/horoscope-${s.slug}.png`);
if (!onlyHoroscopes) await shoot(pinHowTo(), 'pin/how-to-read-a-birth-chart.png');

const requiredCards = [
  ...SIGNS.map((s) => `sign/${s.slug}.png`),
  ...SIGNS.map((s) => `registry/${s.slug}.png`),
  ...SIGNS.map((s) => `horoscope/${s.slug}.png`),
  ...TOOLS.map((tool) => `tool/${tool.key}.png`),
  'registry.png',
  'thesis.png',
  'disclosure.png',
].sort();
await writeFile(resolve(OUT, 'manifest.json'), `${JSON.stringify({
  schema: 'zodiacs.og-cards.v1',
  locale: 'en',
  width: 1200,
  height: 630,
  iconSource: '/assets/zodiac-icons/128/{sign}.webp',
  fallback: '/assets/og/v2/share.png',
  requiredCards,
}, null, 2)}\n`);

await browser.close();

const mb = total / 1024 / 1024;
console.log(`Done — ${count} cards, ${mb.toFixed(2)}MB → public/assets/og/v2/`);
if (mb > 10) {
  console.error('ABORT: v2 card set exceeds the 10MB budget — tighten the palette (colors: 128) and rerun.');
  process.exit(1);
}
