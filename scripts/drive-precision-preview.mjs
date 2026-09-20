/**
 * Drive the developer preview in real browsers, against the built site.
 *
 *   node scripts/drive-precision-preview.mjs [--pack /path/to/pack.zeph]
 *                                            [--port 8799] [--out <file>]
 *                                            [--browsers chromium,firefox,webkit]
 *
 * Serves `dist/` locally and exercises the route. `--pack` is optional: the
 * synthetic fixture path is the one a person with no data actually gets,
 * and it is driven either way. When a pack is given, the broken-pack cases
 * are derived from it into a temporary directory and deleted afterwards.
 *
 * EVERY request the page makes is recorded, same-origin included. "No
 * off-origin traffic" is not the same as "nothing leaked": an analytics
 * beacon to your own domain is still a beacon.
 */
import { chromium, firefox, webkit } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
// node:fs's readFile is callback-based; the promise one lives here.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);
const PACK = args.get('pack') ?? null;
const PORT = Number(args.get('port') ?? 8799);
const OUT = args.get('out') ?? 'docs/platform/evidence/precision-2026-09-20/raw/preview-browser-run.json';
const WANT = (args.get('browsers') ?? 'chromium,firefox,webkit').split(',');
const ROOT = new URL('../dist/', import.meta.url).pathname;
const BASE = `http://127.0.0.1:${PORT}`;
const URL_ = `${BASE}/developers/precision-preview/`;

/**
 * Where the builds are in THIS environment. Playwright's own
 * `executablePath()` points at versions matching the pinned
 * playwright-core, which are not what is installed here, so the pinned
 * paths win when they exist.
 *
 * On another machine -- the Mac this hands off to -- they will not exist,
 * and `executablePath()` after `npx playwright install` is right. So: the
 * pinned path if it is there, else whatever Playwright itself resolves.
 */
const PINNED = {
  chromium: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  firefox: '/opt/pw-browsers/firefox-1532/firefox/firefox',
  webkit: null,
};
const LAUNCHERS = { chromium, firefox, webkit };
function resolveExecutable(name) {
  const pinned = PINNED[name];
  if (pinned && existsSync(pinned)) return { path: pinned, from: 'pinned' };
  try {
    const p = LAUNCHERS[name]?.executablePath();
    if (p && existsSync(p)) return { path: p, from: 'playwright' };
    return { path: null, from: 'playwright', why: `playwright resolves ${name} to ${p ?? 'nothing'}, which does not exist. Run: npx playwright install ${name}` };
  } catch (error) {
    return { path: null, from: 'playwright', why: String(error?.message ?? error).split('\n')[0] };
  }
}
const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };

const server = createServer(async (req, res) => {
  const rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let file = join(ROOT, rel);
  if (rel.endsWith('/')) file = join(file, 'index.html');
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

// ---------------------------------------------------------------- fixtures
const dir = mkdtempSync(join(tmpdir(), 'preview-fixtures-'));
const fixtures = {};
if (PACK && existsSync(PACK)) {
  const reseal = (b) => { b.set(createHash('sha256').update(b.subarray(0, b.byteLength - 32)).digest(), b.byteLength - 32); return b; };
  const original = new Uint8Array(readFileSync(PACK).buffer);
  const put = (name, bytes) => { const p = join(dir, name); writeFileSync(p, Buffer.from(bytes)); fixtures[name] = p; };
  put('valid.zeph', original);
  { const b = original.slice(); b[Math.floor(b.byteLength / 2)] ^= 1; put('altered.zeph', b); }
  { const b = original.slice(); b.set(new TextEncoder().encode('ZODEPH01'), 0); put('v1.zeph', reseal(b)); }
  put('truncated.zeph', original.slice(0, Math.floor(original.byteLength * 0.6)));
  put('not-a-pack.zeph', new TextEncoder().encode('this is a text file and not an ephemeris pack, long enough to be read'));
}

const report = { url: URL_, pack: PACK ? { bytes: readFileSync(PACK).length } : null, browsers: {} };

for (const name of WANT) {
  const launcher = LAUNCHERS[name];
  const resolved = launcher ? resolveExecutable(name) : { path: null, why: `${name} is not a Playwright browser` };
  if (!resolved.path) {
    report.browsers[name] = { attempted: true, ran: false, why: resolved.why ?? `no ${name} build is installed in this environment` };
    console.log(`${name}: NOT RUN — ${report.browsers[name].why}`);
    continue;
  }
  const browser = await launcher.launch({ executablePath: resolved.path });
  try {
    report.browsers[name] = { executable: resolved, ...await run(name, browser) };
    console.log(`${name} ${report.browsers[name].version}: ${report.browsers[name].verdict}`);
    if (report.browsers[name].problems?.length) for (const p of report.browsers[name].problems) console.log(`   - ${p}`);
  } finally {
    await browser.close();
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
rmSync(dir, { recursive: true, force: true });
server.close();
console.log(`\nwrote ${OUT}`);
const ok = Object.values(report.browsers).some((b) => b.ran) && Object.values(report.browsers).every((b) => !b.ran || b.verdict === 'pass');
process.exit(ok ? 0 : 1);

async function run(name, browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const requests = [];
  const errors = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  const out = { attempted: true, ran: true, version: browser.version(), steps: {} };
  const ask = (m) => page.evaluate((x) => window.__precisionPreview.ask(x), m);
  const stateOf = () => page.textContent('#pp-pack-state');
  // Wait on the panel's settled MARKER, never on its text: the previous
  // step's message still matches the next step's regex, so a text wait
  // walks on while the page is mid-flight.
  const settled = (id, ms = 30000) =>
    page.waitForFunction((x) => document.getElementById(x)?.dataset.state === 'settled', id, { timeout: ms });
  // Stamp the panel busy from HERE, before triggering the action. Without
  // it the settled wait can match the state the PREVIOUS step left behind
  // and read a panel that has not started working yet -- which is how a
  // pack that loaded perfectly well got recorded as "did not load", its
  // state line captured mid-read.
  const arm = (...ids) => page.evaluate((xs) => {
    for (const x of xs) { const el = document.getElementById(x); if (el) el.dataset.state = 'busy'; }
  }, ids);
  const valueOf = (id) => page.inputValue(`#${id}`);
  // The date boxes are refitted to whatever is loaded. Reading them back
  // is the only way to stay inside coverage for a fixture that spans two
  // years and a pack that spans three centuries.
  const window_ = async () => ({ fromIso: await valueOf('pp-from'), toIso: await valueOf('pp-to'), body: await page.inputValue('#pp-body') });
  const bodiesLoaded = () => page.$$eval('#pp-info dt', (dts) => {
    const dt = dts.find((d) => d.textContent === 'bodies');
    return dt ? dt.nextElementSibling.textContent.split(', ').filter(Boolean).length : 0;
  });

  await page.goto(URL_, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__precisionPreview), null, { timeout: 20000 });

  // 1. Nothing loaded: every calculation refused.
  out.steps.beforeAnyData = {
    places: (await ask({ type: 'places', iso: '2024-06-15T12:00:00Z' })).refused,
    search: (await ask({ type: 'search', mode: 'empirical', body: 'Mars', targetDeg: 100, fromIso: '2024-01-01T00:00:00Z', toIso: '2024-12-31T00:00:00Z', epsilonDeg: 1 / 3600 })).refused,
    computeDisabled: await page.isDisabled('#pp-places'),
  };

  // 2. The synthetic fixture: what someone with no data actually gets.
  await arm('pp-pack-state');
  await page.click('#pp-synthetic-btn');
  await settled('pp-pack-state');
  out.steps.synthetic = {
    state: await stateOf(),
    labelVisible: await page.isVisible('#pp-synthetic'),
    infoRows: await page.$$eval('#pp-info dt', (n) => n.length),
    bodyCount: await bodiesLoaded(),
    authenticityStated: (await page.textContent('#pp-info')).includes('not established'),
    // The fixture spans about two years around J2000; the boxes must have
    // moved off their 2024 defaults or the first click is out of coverage.
    instantRefitted: (await valueOf('pp-instant')) !== '2024-06-15T12:00:00Z',
  };

  await arm('pp-places-state');
  await page.click('#pp-places');
  await settled('pp-places-state');
  out.steps.syntheticPlaces = {
    rows: await page.$$eval('#pp-places-out tr', (n) => Math.max(0, n.length - 1)),
    // What the runtime advertises is what it must produce -- not a fixed
    // ten. A pack that carries eight bodies must show eight rows.
    expectedRows: out.steps.synthetic.bodyCount,
    stateSaysSynthetic: (await page.textContent('#pp-places-state')).includes('synthetic'),
  };

  // 3. Both search modes on the fixture, and what each claims.
  for (const [label, mode] of [['empirical', 'empirical'], ['geometric', 'geometric']]) {
    await page.check(`input[name="pp-mode"][value="${mode}"]`);
    await page.fill('#pp-target', '100');
    await page.fill('#pp-rate', '20');
    await arm('pp-search-state');
    await page.click('#pp-search');
    await settled('pp-search-state', 120000);
    const state = await page.textContent('#pp-search-state');
    // A refusal empties the claim list. Reading {} as "claimed nothing"
    // would score a refusal as an honest result; it is a different
    // outcome and is recorded as one.
    const refused = /^refused:/.test(state);
    const claim = refused ? null : await page.$$eval('#pp-search-out .pp-claim dt', (dts) => Object.fromEntries(dts.map((dt) => [dt.textContent, dt.nextElementSibling.textContent])));
    out.steps[`${label}Search`] = {
      state, refused, claim,
      explain: refused ? null : await page.textContent('.pp-explain').catch(() => null),
      events: refused ? null : await page.$$eval('#pp-search-out table tr', (n) => Math.max(0, n.length - 1)),
    };
  }

  // 4. Refusals, with data loaded.
  out.steps.refusals = {};
  const w = await window_();
  for (const [label, msg] of [
    ['malformed instant', { type: 'places', iso: 'yesterday' }],
    ['before coverage', { type: 'places', iso: '1500-01-01T00:00:00Z' }],
    ['after coverage', { type: 'places', iso: '2400-01-01T00:00:00Z' }],
    ['unknown request', { type: 'teleport' }],
    // In coverage, so the refusal can only be the rate ceiling. With the
    // hardcoded 2024 window it was refused for being out of coverage and
    // the ceiling was never exercised at all.
    ['rate past the ceiling', { type: 'search', mode: 'empirical', body: w.body, targetDeg: 100, ...w, epsilonDeg: 1 / 3600, maxRateDegPerDay: 0.0001 }],
  ]) {
    const r = await ask(msg);
    // A precondition can be rejected two ways, and both count. The
    // transport says ok:false with a code; the search contract says
    // ok:true with execution.status 'refused' and a reason, because a
    // refusal that carries unresolved intervals and diagnostics cannot be
    // thrown. What must NOT happen is a finished run reporting zero
    // events as though the declared ceiling held.
    const v = r.verdict;
    out.steps.refusals[label] = !r.ok
      ? { how: 'transport', refused: r.refused }
      : v && v.execution.status !== 'finished'
        ? { how: 'in-contract', refused: v.execution.status, reason: v.execution.reason ?? null, established: v.completeness.established }
        : 'ANSWERED — a defect';
  }

  // 5. Broken packs, each for its own reason, replacing working data.
  if (Object.keys(fixtures).length) {
    out.steps.brokenPacks = {};
    for (const [label, file] of [['altered', 'altered.zeph'], ['v1 container', 'v1.zeph'], ['truncated', 'truncated.zeph'], ['not a pack', 'not-a-pack.zeph']]) {
      await arm('pp-pack-state');
      await page.setInputFiles('#pp-file', fixtures[file]);
      await settled('pp-pack-state');
      const after = await ask({ type: 'places', iso: await valueOf('pp-instant') });
      out.steps.brokenPacks[label] = { state: (await stateOf()).replace(/^refused: /, ''), stillAnswering: after.ok === true, thenRefused: after.refused };
    }
    // 6. A real pack, and recovery after the bad ones.
    await arm('pp-pack-state');
    await page.setInputFiles('#pp-file', fixtures['valid.zeph']);
    await settled('pp-pack-state', 60000);
    out.steps.realPack = { state: await stateOf(), syntheticLabelHidden: !(await page.isVisible('#pp-synthetic')) };
    await arm('pp-places-state');
    await page.click('#pp-places');
    await settled('pp-places-state');
    out.steps.realPack.rows = await page.$$eval('#pp-places-out tr', (n) => Math.max(0, n.length - 1));
    out.steps.realPack.expectedRows = await bodiesLoaded();
    out.steps.realPack.stateSaysApparent = (await page.textContent('#pp-places-state')).includes('apparent');
  }

  // 7. A superseded reply must never reach the interface. Both clicks in
  //    one synchronous task, so the first reply lands while the second is
  //    outstanding; counting DOM writes distinguishes dropped from
  //    overwritten.
  await page.evaluate(() => {
    window.__writes = 0;
    new MutationObserver(() => { window.__writes += 1; }).observe(document.getElementById('pp-places-out'), { childList: true, subtree: true });
  });
  // Two instants inside whatever is loaded now. A hardcoded 2024 pair was
  // refused out of coverage, which writes to the panel too and made the
  // count meaningless.
  const span = await window_();
  const third = (k) => new Date(Date.parse(span.fromIso) + (Date.parse(span.toIso) - Date.parse(span.fromIso)) * k)
    .toISOString().replace(/\.\d+Z$/, 'Z');
  await page.evaluate(([a, b]) => {
    document.getElementById('pp-instant').value = a;
    document.getElementById('pp-places').click();
    document.getElementById('pp-instant').value = b;
    document.getElementById('pp-places').click();
  }, [third(1 / 3), third(2 / 3)]);
  await page.waitForTimeout(2500);
  out.steps.superseded = { domWrites: await page.evaluate(() => window.__writes) };

  // 8. Cancellation.
  await page.check('input[name="pp-mode"][value="empirical"]');
  // The window stays as the page refitted it; overwriting it with 2024
  // only bought an out-of-coverage refusal, which cancels nothing.
  const started = page.click('#pp-search');
  await page.click('#pp-cancel');
  await started.catch(() => {});
  await page.waitForTimeout(800);
  out.steps.cancel = { state: await page.textContent('#pp-search-state') };

  // 9. Dispose, then everything refuses again.
  const lastInstant = await valueOf('pp-instant');
  await page.click('#pp-unload');
  await page.waitForFunction(() => /disposed/.test(document.getElementById('pp-pack-state').textContent), null, { timeout: 20000 });
  out.steps.dispose = {
    state: await stateOf(),
    // The instant that worked a moment ago: the refusal must be no-pack,
    // not an incidental out-of-coverage.
    places: (await ask({ type: 'places', iso: lastInstant })).refused,
    computeDisabled: await page.isDisabled('#pp-places'),
  };

  // 10. Keyboard: reach and operate the primary control without a mouse.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__precisionPreview), null, { timeout: 20000 });
  let hops = 0;
  let reached = false;
  await page.keyboard.press('Tab');
  for (; hops < 60; hops += 1) {
    if (await page.evaluate(() => document.activeElement?.id === 'pp-synthetic-btn')) { reached = true; break; }
    await page.keyboard.press('Tab');
  }
  if (reached) {
    await arm('pp-pack-state');
    await page.keyboard.press('Enter');
    await settled('pp-pack-state');
  }
  out.steps.keyboard = { reachedInTabs: reached ? hops + 1 : null, activatedByEnter: reached ? await stateOf() : null };

  // 11. Mobile layout: no horizontal scroll at phone width.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  out.steps.mobile = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    horizontalScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
  }));

  // 12. Everything the page asked the network for, and everything it kept.
  out.steps.network = {
    all: [...new Set(requests)].map((u) => u.replace(BASE, '')),
    offOrigin: requests.filter((u) => !u.startsWith(BASE)),
    beaconLike: requests.filter((u) => /insight|analytic|beacon|collect|track|plausible|sentry/i.test(u)),
    // Same-origin and inherited: the footer's loader fetches the assistant
    // shell half a second after load on every other page, and the widget it
    // mounts can send typed text to the server. On this route it must not
    // be there at all.
    assistant: requests.filter((u) => /assistant-ui|guide-avatar/i.test(u)),
    // Recorded separately because the footer is shared and the check must
    // name what it actually proves: the shell is the part that can talk to
    // the server, the avatar is an image beside a button.
    assistantRuntime: requests.filter((u) => /assistant-ui/i.test(u)),
    serviceWorker: requests.filter((u) => /\/sw\.js/i.test(u)),
  };
  out.steps.persistence = await page.evaluate(async () => {
    const dbs = typeof indexedDB?.databases === 'function' ? await indexedDB.databases() : 'not-enumerable';
    return {
      localStorage: localStorage.length,
      sessionStorage: sessionStorage.length,
      cookies: document.cookie,
      indexedDB: Array.isArray(dbs) ? dbs.map((d) => d.name) : dbs,
    };
  });
  out.errors = errors;
  await context.close();

  out.verdict = verdictOf(out, Object.keys(fixtures).length > 0);
  return out;
}

function verdictOf(out, hadPack) {
  const s = out.steps;
  const p = [];
  if (s.beforeAnyData.places !== 'no-pack') p.push('a calculation before any data was not refused with no-pack');
  if (!s.beforeAnyData.computeDisabled) p.push('the compute control was enabled with nothing loaded');
  if (!/ready/.test(s.synthetic.state)) p.push('the synthetic fixture did not load');
  if (!s.synthetic.labelVisible) p.push('the synthetic fixture was not labelled as synthetic');
  if (!s.synthetic.authenticityStated) p.push('authenticity was not reported as unestablished');
  if (!s.synthetic.instantRefitted) p.push('the date fields were not refitted to the loaded coverage');
  if (s.syntheticPlaces.rows !== s.syntheticPlaces.expectedRows) {
    p.push(`the runtime advertises ${s.syntheticPlaces.expectedRows} bodies but produced ${s.syntheticPlaces.rows} rows`);
  }
  if (!s.syntheticPlaces.stateSaysSynthetic) p.push('synthetic places were not labelled synthetic');
  for (const label of ['empirical', 'geometric']) {
    const step = s[`${label}Search`];
    if (step.refused) { p.push(`the ${label} search was refused: ${step.state}`); continue; }
    if (label === 'empirical') {
      if (step.claim['completeness established'] !== 'false') p.push('the empirical search claimed established completeness');
      if (step.claim['exact total available'] !== 'false') p.push('the empirical search offered an exact total');
    } else if (step.claim['completeness established'] !== 'true') {
      p.push('the validated search did not establish completeness on the fixture');
    }
  }
  for (const [k, v] of Object.entries(s.refusals)) {
    if (typeof v === 'string') { p.push(`answered instead of refusing: ${k}`); continue; }
    if (v.established) p.push(`${k} was refused and still claimed established completeness`);
  }
  if (s.refusals['rate past the ceiling']?.how === 'in-contract'
      && !/rate/i.test(s.refusals['rate past the ceiling'].reason ?? '')) {
    p.push('the rate-ceiling refusal did not say the rate was the reason');
  }
  if (hadPack) {
    for (const [k, v] of Object.entries(s.brokenPacks)) if (v.stillAnswering) p.push(`a broken pack (${k}) left the runtime answering`);
    if (!/loaded and verified/.test(s.realPack.state)) p.push('a good pack after the bad ones did not load');
    if (s.realPack.syntheticLabelHidden !== true) p.push('the synthetic label survived onto a real pack');
    if (s.realPack.rows !== s.realPack.expectedRows) p.push(`the pack advertises ${s.realPack.expectedRows} bodies but produced ${s.realPack.rows} rows`);
    if (!s.realPack.stateSaysApparent) p.push('real places were not labelled apparent');
  }
  if (s.superseded.domWrites !== 1) p.push(`a superseded reply reached the interface (${s.superseded.domWrites} writes)`);
  if (!/cancel/i.test(s.cancel.state)) p.push('cancel did not report');
  if (s.dispose.places !== 'no-pack') p.push('after dispose a calculation was not refused');
  if (!s.dispose.computeDisabled) p.push('after dispose the compute control was still enabled');
  if (s.keyboard.reachedInTabs === null) p.push('the primary control could not be reached by keyboard');
  if (s.mobile.horizontalScroll) p.push(`the page scrolls horizontally at ${s.mobile.viewportWidth}px`);
  if (s.network.offOrigin.length) p.push(`off-origin requests: ${s.network.offOrigin.join(', ')}`);
  if (s.network.beaconLike.length) p.push(`beacon-like requests: ${s.network.beaconLike.join(', ')}`);
  if (s.network.assistant.length) p.push(`the assistant loaded on an isolated route: ${s.network.assistant.join(', ')}`);
  if (s.network.serviceWorker.length) p.push(`the service worker was fetched: ${s.network.serviceWorker.join(', ')}`);
  if (s.persistence.localStorage || s.persistence.sessionStorage || s.persistence.cookies) p.push('the page persisted something');
  if (Array.isArray(s.persistence.indexedDB) && s.persistence.indexedDB.length) p.push('the page created an IndexedDB database');
  if (out.errors.length) p.push(`page errors: ${out.errors.join(' | ')}`);
  out.problems = p;
  return p.length === 0 ? 'pass' : 'FAIL';
}
