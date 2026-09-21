/**
 * Records the whole vertical path as a video, in a real browser.
 *
 *   node serve.mjs 8791 &
 *   node record.mjs --pack /path/to/pack.zeph [--out ../raw/demo-recording]
 *
 * clean page -> load a verified pack -> calculate -> search -> refuse for a
 * real reason -> cancel -> replace with a broken pack -> recover -> dispose.
 *
 * Playwright's own video capture, so this is what the page actually did,
 * not a reconstruction. If capture is unavailable the script says so and
 * exits non-zero rather than writing a file that is not a recording.
 */
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync, rmSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);
const PACK = args.get('pack');
const URL_ = args.get('url') ?? 'http://127.0.0.1:8791/';
const OUT = args.get('out') ?? new URL('../raw/demo-recording', import.meta.url).pathname;
const EXE = args.get('chromium') ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

if (!PACK || !existsSync(PACK)) {
  console.error('--pack <path> is required and must exist. This records a real run, so it needs a real pack.');
  process.exit(2);
}
if (!existsSync(EXE)) {
  console.error(`no chromium at ${EXE}; pass --chromium <path>. Capture is unavailable, and nothing was written.`);
  process.exit(3);
}
mkdirSync(OUT, { recursive: true });
// A previous attempt's video must not be mistaken for this one's.
for (const f of existsSync(OUT) ? readdirSync(OUT) : []) {
  if (f.endsWith('.webm')) rmSync(join(OUT, f), { force: true });
}

/** A broken copy, made here and thrown away with the temp dir. */
const broken = join(OUT, 'broken.zeph');
{
  const b = new Uint8Array(readFileSync(PACK).buffer);
  b[Math.floor(b.byteLength / 2)] ^= 0x01;
  writeFileSync(broken, Buffer.from(b));
}

const browser = await chromium.launch({ executablePath: EXE });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  recordVideo: { dir: OUT, size: { width: 1280, height: 900 } },
});
const page = await context.newPage();
const beat = (ms = 1400) => page.waitForTimeout(ms);
const say = (text) => page.evaluate((t) => {
  let el = document.getElementById('narration');
  if (!el) {
    el = document.createElement('div');
    el.id = 'narration';
    el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;padding:12px 18px;background:#11141d;border-top:1px solid #232838;color:#e7e9ee;font:15px/1.5 ui-sans-serif,system-ui,sans-serif;z-index:9999';
    document.body.append(el);
  }
  el.textContent = t;
}, text);

const steps = [];
const step = async (label, fn) => { await say(label); steps.push(label); await beat(700); await fn(); await beat(); };

try {
  await page.goto(URL_, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__demo), null, { timeout: 15000 });
  await beat(1200);

  await step('1 · No pack yet. Precision output is refused, not guessed.', async () => {
    const r = await page.evaluate(() => window.__demo.ask({ type: 'compare', iso: '2020-06-15T12:00:00Z' }));
    await say(`1 · No pack yet → refused: ${r.refused}`);
  });

  await step('2 · Load a pack from disk. It is verified before it will answer anything.', async () => {
    await page.setInputFiles('#pack', PACK);
    await page.waitForFunction(() => /^loaded /.test(document.getElementById('pack-state').textContent), null, { timeout: 30000 });
  });

  await step('3 · The same instant, both backends, with the difference in arcseconds.', async () => {
    await page.fill('#iso', '2020-06-15T12:00:00Z');
    await page.click('#run');
    await page.waitForFunction(() => /ms/.test(document.getElementById('compare-state').textContent), null, { timeout: 30000 });
    await beat(2200);
  });

  await step('4 · A bounded search: the Sun reaching 0°, March 2024.', async () => {
    const r = await page.evaluate(() => window.__demo.ask({
      type: 'search',
      spec: { kind: 'longitude', body: 'Sun', targetDeg: 0, fromTtDays: 8800, toTtDays: 8860, epsilonDeg: 1 / 3600 },
    }));
    const v = r.verdict;
    const when = new Date((v.events[0].ttDays + 10957.5) * 86400000).toISOString();
    await say(`4 · ${v.execution.status}; ${v.eventCount.found} event; completeness established: ${v.completeness.established}; support "${v.completeness.support}" → ${when}`);
    await beat(2600);
  });

  await step('5 · Each refusal for its own reason, with the pack still loaded.', async () => {
    await page.click('#refusals');
    await page.waitForSelector('#refusal-out table tr:nth-child(6)', { timeout: 30000 });
    await beat(2400);
  });

  await step('6 · Cancel means cancel: the page stays responsive and the run stops.', async () => {
    // The run can finish before a click lands -- it is only a few hundred
    // milliseconds once both backends are warm -- so this tries a few times
    // and, if the run is simply too quick to interrupt here, says that
    // instead of narrating a cancellation that did not happen.
    let cancelled = false;
    for (let attempt = 0; attempt < 3 && !cancelled; attempt += 1) {
      await page.click('#bench');
      await page.waitForFunction(() => /…/.test(document.getElementById('bench-state').textContent), null, { timeout: 30000 });
      try {
        await page.click('#cancel', { timeout: 1500 });
      } catch {
        await page.waitForFunction(() => !/…/.test(document.getElementById('bench-state').textContent), null, { timeout: 60000 });
        continue;
      }
      await page.waitForFunction(() => /cancelled|charts of/.test(document.getElementById('bench-state').textContent), null, { timeout: 60000 });
      cancelled = /cancelled/.test(await page.textContent('#bench-state'));
    }
    await say(cancelled
      ? `6 · Cancelled mid-run → ${await page.textContent('#bench-state')}`
      : `6 · The run finished before a click could land, so there was nothing to cancel → ${await page.textContent('#bench-state')}`);
    await beat(2200);
  });

  await step('7 · A corrupted pack is refused, and does not leave the old one quietly in use.', async () => {
    await page.setInputFiles('#pack', broken);
    await page.waitForFunction(() => /refused/.test(document.getElementById('pack-state').textContent), null, { timeout: 30000 });
    const r = await page.evaluate(() => window.__demo.ask({ type: 'compare', iso: '2020-06-15T12:00:00Z' }));
    await say(`7 · Corrupt pack refused → and precision now refuses: ${r.refused}`);
  });

  await step('8 · A good pack afterwards works again.', async () => {
    await page.setInputFiles('#pack', PACK);
    await page.waitForFunction(() => /^loaded /.test(document.getElementById('pack-state').textContent), null, { timeout: 30000 });
    await page.click('#run');
    await page.waitForFunction(() => /ms/.test(document.getElementById('compare-state').textContent), null, { timeout: 30000 });
  });

  await step('9 · Dispose. The runtime releases the pack and refuses afterwards.', async () => {
    await page.evaluate(() => window.__demo.ask({ type: 'unload-pack' }));
    const r = await page.evaluate(() => window.__demo.ask({ type: 'compare', iso: '2020-06-15T12:00:00Z' }));
    await say(`9 · Disposed → refused: ${r.refused}`);
    await beat(1800);
  });
} finally {
  await context.close();          // the video is only flushed on close
  await browser.close();
}

rmSync(broken, { force: true });          // a pack derivative; not left behind

const videos = readdirSync(OUT).filter((f) => f.endsWith('.webm')).map((f) => ({ f, ...statSync(join(OUT, f)) }));
if (videos.length === 0) {
  console.error('capture produced no file: this environment cannot record. The script is the deliverable in that case, and it ran to the end.');
  process.exit(4);
}
const newest = videos.sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
const named = 'vertical-path.webm';
renameSync(join(OUT, newest.f), join(OUT, named));
const bytes = readFileSync(join(OUT, named));
console.log(`recorded ${named}, ${bytes.byteLength} bytes`);
console.log(`sha256 ${createHash('sha256').update(bytes).digest('hex')}`);
console.log(`steps: ${steps.length}`);
for (const s of steps) console.log(`  ${s}`);
