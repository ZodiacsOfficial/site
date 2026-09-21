/**
 * Record a real session on the developer preview: video and stills.
 *
 *   node scripts/record-precision-preview.mjs [--pack /path/to/pack.zeph]
 *                                             [--out docs/.../recording]
 *
 * Nothing here is staged. It serves the built `dist/`, drives the page the
 * way a person would, and records what the browser actually renders. If a
 * step fails, the failure is in the recording -- that is the point of
 * recording it rather than describing it.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync, rmSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);
const PACK = args.get('pack') ?? null;
const PORT = Number(args.get('port') ?? 8821);
const OUT = args.get('out') ?? 'docs/platform/evidence/precision-2026-09-20/recording';
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ROOT = new URL('../dist/', import.meta.url).pathname;
const BASE = `http://127.0.0.1:${PORT}`;
const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };

const server = createServer(async (req, res) => {
  const rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let file = join(ROOT, rel);
  if (rel.endsWith('/')) file = join(file, 'index.html');
  try {
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file));
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EXE });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  recordVideo: { dir: join(OUT, 'video-raw'), size: { width: 1280, height: 900 } },
});
const page = await context.newPage();
const shots = [];
const beat = async (name, ms = 900) => {
  await page.waitForTimeout(ms);
  const file = `${String(shots.length + 1).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: join(OUT, file), fullPage: false });
  shots.push({ file, state: await page.textContent('#pp-pack-state') });
  console.log(`  ${file}`);
};
const settled = (id, ms = 60000) =>
  page.waitForFunction((x) => document.getElementById(x)?.dataset.state === 'settled', id, { timeout: ms });
const arm = (...ids) => page.evaluate((xs) => {
  for (const x of xs) { const el = document.getElementById(x); if (el) el.dataset.state = 'busy'; }
}, ids);

await page.goto(`${BASE}/developers/precision-preview/`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => Boolean(window.__precisionPreview), null, { timeout: 20000 });
await beat('nothing-loaded', 1600);

await arm('pp-pack-state');
await page.click('#pp-synthetic-btn');
await settled('pp-pack-state');
await beat('synthetic-fixture', 1400);

await arm('pp-places-state');
await page.click('#pp-places');
await settled('pp-places-state');
await beat('synthetic-places');

if (PACK && existsSync(PACK)) {
  await arm('pp-pack-state');
  await page.setInputFiles('#pp-file', PACK);
  await settled('pp-pack-state');
  await beat('pack-verified', 1400);

  await arm('pp-places-state');
  await page.click('#pp-places');
  await settled('pp-places-state');
  await beat('apparent-places');
}

// Both modes on the same request, so the difference in what each CLAIMS is
// the thing on screen rather than a sentence about it.
for (const [mode, name] of [['empirical', 'empirical-conditional'], ['geometric', 'geometric-proven']]) {
  await page.check(`input[name="pp-mode"][value="${mode}"]`);
  await page.fill('#pp-target', '100');
  await arm('pp-search-state');
  await page.click('#pp-search');
  await settled('pp-search-state', 120000);
  await page.locator('#pp-search-out').scrollIntoViewIfNeeded();
  await beat(name, 1600);
}

await page.click('#pp-unload');
await page.waitForFunction(() => /disposed/.test(document.getElementById('pp-pack-state').textContent), null, { timeout: 20000 });
await beat('disposed', 1200);

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
await page.screenshot({ path: join(OUT, `${String(shots.length + 1).padStart(2, '0')}-phone.png`), fullPage: true });
shots.push({ file: `${String(shots.length + 1).padStart(2, '0')}-phone.png`, state: 'phone width, full page' });

await context.close();
await browser.close();
server.close();

// Playwright names the video after the page's internal id; give it a name.
const raw = join(OUT, 'video-raw');
const found = readdirSync(raw).filter((f) => f.endsWith('.webm'));
if (found.length === 1) { renameSync(join(raw, found[0]), join(OUT, 'session.webm')); rmSync(raw, { recursive: true, force: true }); }

writeFileSync(join(OUT, 'README.md'), `# Recording of the developer preview

Recorded ${new Date().toISOString().slice(0, 10)} by \`scripts/record-precision-preview.mjs\`
against the built \`dist/\`, in Chromium. Nothing is staged or re-shot: the
script drives the page and the browser renders what it renders.

- \`session.webm\` — the whole session, unedited.
${shots.map((s) => `- \`${s.file}\` — ${s.state}`).join('\n')}

${PACK && existsSync(PACK) ? 'A real pack was loaded from disk in this run; it is not committed here and is not distributable.' : 'No pack was available: the synthetic-fixture path only.'}
`);
console.log(`\nwrote ${OUT}`);
