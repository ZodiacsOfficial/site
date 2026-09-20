/**
 * Drives the demonstration against the REAL runtime, in real browsers.
 *
 *   node serve.mjs 8791 &
 *   node drive-alpha.mjs --pack /path/to/pack.zeph [--url http://127.0.0.1:8791/]
 *                        [--browsers chromium,firefox,webkit] [--out ../raw/demo-alpha-run.json]
 *
 * The pack path is required and is never defaulted to a path from an earlier
 * session. Broken fixtures are derived from it into a temporary directory at
 * run time and deleted afterwards; nothing derived from a kernel is written
 * into the repository.
 *
 * Order matters and is not cosmetic: a VALID pack is loaded and shown to
 * produce a real answer BEFORE any date or coverage failure is tested, so
 * that "it refused" cannot be an artefact of having no pack at all.
 */
import { chromium, firefox, webkit } from 'playwright-core';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { openPackFile, CORRECTED } from '../../../../../examples/precision-alpha/src/node.mjs';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);
const PACK = args.get('pack');
const URL_ = args.get('url') ?? 'http://127.0.0.1:8791/';
const OUT = args.get('out') ?? new URL('../raw/demo-alpha-run.json', import.meta.url).pathname;
const WANT = (args.get('browsers') ?? 'chromium,firefox,webkit').split(',');

if (!PACK) {
  console.error('--pack <path> is required: this driver needs a real pack, and will not guess where one is.');
  process.exit(2);
}

// ---------------------------------------------------------------- fixtures
const dir = mkdtempSync(join(tmpdir(), 'demo-fixtures-'));
const reseal = (b) => { b.set(createHash('sha256').update(b.subarray(0, b.byteLength - 32)).digest(), b.byteLength - 32); return b; };
const original = new Uint8Array(readFileSync(PACK).buffer);

const fixtures = {};
const write = (name, bytes) => { const p = join(dir, name); writeFileSync(p, Buffer.from(bytes)); fixtures[name] = p; return p; };
write('valid.zeph', original);
{
  const b = original.slice();
  b[Math.floor(b.byteLength / 2)] ^= 0x01;              // payload bit flip, seal left stale
  write('payload-flipped.zeph', b);
}
{
  const b = original.slice();
  const dv = new DataView(b.buffer);
  const hl = dv.getUint32(8, true);
  const text = new TextDecoder().decode(b.subarray(16, 16 + hl));
  // Edit a header NUMBER without changing the header's length, and re-seal
  // the payload the way a v1 digest would have: the point is that v2's
  // trailer still catches it.
  const edited = text.replace(/"intervalSec":(\d+)/, (m, n) => `"intervalSec":${String(Number(n) + 1).padStart(String(n).length, '0')}`);
  if (edited.length === text.length && edited !== text) {
    b.set(new TextEncoder().encode(edited), 16);
    write('header-edited.zeph', b);                      // trailer deliberately NOT recomputed
  }
}
{
  const b = original.slice();
  b.set(new TextEncoder().encode('ZODEPH01'), 0);
  write('v1.zeph', reseal(b));
}
write('truncated.zeph', original.slice(0, Math.floor(original.byteLength * 0.6)));
write('not-a-pack.zeph', new TextEncoder().encode('this is a text file, not an ephemeris pack, and it is long enough to be read'));

// ------------------------------------------------- the Node side of A4
const TT_MINUS_UTC_SEC = 69.184;
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const TT_DAYS = [-18262.0, -5000.25, 0.5, 1234.75, 8765.5, 9000.125, 12345.875];
const node = await openPackFile(fixtures['valid.zeph']);
const nodeRows = [];
for (const tt of TT_DAYS) for (const b of BODIES) {
  const r = node.apparent(b, tt, CORRECTED);
  nodeRows.push({ body: b, ttDays: tt, lon: r.lon, lat: r.lat, distKm: r.distKm, isSystemBarycentre: r.isSystemBarycentre });
}
const nodeSearch = node.search({
  kind: 'longitude', body: 'Sun', targetDeg: 0, fromTtDays: 8800, toTtDays: 8860, epsilonDeg: 1 / 3600,
});
const nodeDigest = node.integrity.computedDigest;
node.dispose();

// ---------------------------------------------------------------- driving
/**
 * The browsers installed here are an older build than this playwright-core
 * expects, so each launcher is pointed at the executable that actually
 * exists rather than the one the version pin would look for. A browser with
 * no executable is recorded as attempted-and-not-run, with the reason, not
 * quietly skipped.
 */
const INSTALLED = {
  chromium: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  firefox: '/opt/pw-browsers/firefox-1532/firefox/firefox',
  webkit: null,
};
const LAUNCHERS = { chromium, firefox, webkit };
const report = { url: URL_, pack: { bytes: original.byteLength, digest: nodeDigest }, node: { ttDays: TT_DAYS, bodies: BODIES }, browsers: {} };

for (const name of WANT) {
  const launcher = LAUNCHERS[name];
  if (!launcher) { report.browsers[name] = { attempted: true, ran: false, why: 'no such browser in playwright-core' }; continue; }
  let browser;
  try {
    const executablePath = INSTALLED[name];
    if (executablePath === null) throw new Error(`no ${name} build is installed in this environment`);
    if (!existsSync(executablePath)) throw new Error(`no ${name} executable at the expected path`);
    browser = await launcher.launch({ executablePath });
  } catch (error) {
    report.browsers[name] = { attempted: true, ran: false, why: String(error.message ?? error).split('\n')[0] };
    console.log(`${name}: NOT RUN — ${report.browsers[name].why}`);
    continue;
  }
  try {
    report.browsers[name] = await run(name, browser);
    console.log(`${name} ${report.browsers[name].version}: ${report.browsers[name].verdict}`);
  } finally {
    await browser.close();
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
rmSync(dir, { recursive: true, force: true });
console.log(`\nwrote ${OUT}`);
const ok = Object.values(report.browsers).some((b) => b.ran) && Object.values(report.browsers).every((b) => !b.ran || b.verdict === 'pass');
process.exit(ok ? 0 : 1);

async function run(name, browser) {
  const page = await browser.newPage();
  const offOrigin = [];
  const failedRequests = [];
  const errors = [];
  page.on('request', (r) => { if (!r.url().startsWith(URL_)) offOrigin.push(r.url()); });
  page.on('response', (r) => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  const out = { attempted: true, ran: true, version: browser.version(), steps: {} };
  const ask = (msg) => page.evaluate((m) => window.__demo.ask(m), msg);
  const loadPack = async (path) => {
    await page.setInputFiles('#pack', path);
    await page.waitForFunction(() => !/^reading /.test(document.getElementById('pack-state').textContent), null, { timeout: 30000 });
    return page.textContent('#pack-state');
  };

  await page.goto(URL_, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__demo), null, { timeout: 15000 });

  // 0. No pack. Recorded, and explicitly NOT evidence that the later
  //    validations work: they are tested below with a real pack loaded.
  out.steps.beforeAnyPack = { refusal: (await ask({ type: 'compare', iso: '2020-06-15T12:00:00Z' })).refused };

  // 1. A valid pack, and a real answer from it. Everything after this point
  //    happens with a working runtime in the page.
  out.steps.load = { state: await loadPack(fixtures['valid.zeph']) };
  const info = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#pack-info dt')].map((dt, i) => [dt.textContent, document.querySelectorAll('#pack-info dd')[i].textContent])));
  out.steps.load.info = info;
  out.steps.load.digestMatchesNode = JSON.stringify(info).includes(nodeDigest);
  out.steps.load.authenticityStated = JSON.stringify(info).includes('not established');

  await page.fill('#iso', '2020-06-15T12:00:00Z');
  await page.click('#run');
  await page.waitForFunction(() => /ms/.test(document.getElementById('compare-state').textContent), null, { timeout: 30000 });
  out.steps.calculate = {
    state: await page.textContent('#compare-state'),
    rows: await page.$$eval('#compare-out table tr', (trs) => trs.slice(1).map((tr) => [...tr.children].map((td) => td.textContent))),
  };

  // 2. A4: the same instants, bit for bit against the Node run.
  const browserRows = (await ask({ type: 'at-tt-days', bodies: BODIES, ttDays: TT_DAYS })).rows;
  let identical = 0;
  const mismatches = [];
  for (let i = 0; i < nodeRows.length; i += 1) {
    const n = nodeRows[i]; const b = browserRows[i];
    if (n.body === b.body && n.ttDays === b.ttDays && n.lon === b.lon && n.lat === b.lat && n.distKm === b.distKm) identical += 1;
    else mismatches.push({ node: n, browser: b });
  }
  out.steps.crossEnvironment = { compared: nodeRows.length, identical, mismatches: mismatches.slice(0, 5) };

  // 3. The search, in the browser, against the Node verdict.
  const bs = (await ask({ type: 'search', spec: { kind: 'longitude', body: 'Sun', targetDeg: 0, fromTtDays: 8800, toTtDays: 8860, epsilonDeg: 1 / 3600 } })).verdict;
  out.steps.search = {
    contract: bs.contract,
    status: bs.execution.status,
    established: bs.completeness.established,
    support: bs.completeness.support,
    eventsFound: bs.eventCount.found,
    conditionalTotal: bs.eventCount.conditionalTotal,
    allIntervalsAccountedFor: bs.accounting.allIntervalsAccountedFor,
    matchesNode: bs.contract === nodeSearch.contract
      && bs.execution.status === nodeSearch.execution.status
      && bs.completeness.support === nodeSearch.completeness.support
      && bs.completeness.established === nodeSearch.completeness.established
      && bs.eventCount.found === nodeSearch.eventCount.found
      && bs.events.length === nodeSearch.events.length
      && bs.events.every((c, i) => c.ttDays === nodeSearch.events[i].ttDays),
  };

  // 4. Each failure for its OWN reason, with the valid pack still loaded.
  out.steps.refusals = {};
  for (const [label, msg] of [
    ['malformed instant', { type: 'compare', iso: 'yesterday' }],
    ['before coverage', { type: 'compare', iso: '1600-01-01T00:00:00Z' }],
    ['after coverage', { type: 'compare', iso: '2400-01-01T00:00:00Z' }],
    ['inside coverage, inside the light-time margin', { type: 'compare', iso: '1849-12-26T01:00:00Z' }],
    ['unknown request', { type: 'teleport' }],
    ['unknown body', { type: 'at-tt-days', bodies: ['Nibiru'], ttDays: [0] }],
    ['search with no declared allowance', { type: 'search', spec: { kind: 'longitude', body: 'Sun', targetDeg: 0, fromTtDays: 8800, toTtDays: 8860 } }],
  ]) {
    const r = await ask(msg);
    out.steps.refusals[label] = r.ok ? 'ANSWERED — a defect' : `${r.refused}`;
  }

  // 5. Broken packs, each for its own reason, replacing a working one.
  out.steps.brokenPacks = {};
  for (const [label, file] of [
    ['payload bit flipped', 'payload-flipped.zeph'],
    ['header number edited', 'header-edited.zeph'],
    ['v1 container', 'v1.zeph'],
    ['truncated', 'truncated.zeph'],
    ['not a pack at all', 'not-a-pack.zeph'],
  ]) {
    if (!fixtures[file]) { out.steps.brokenPacks[label] = 'fixture-not-built'; continue; }
    const state = await loadPack(fixtures[file]);
    // A failed replacement must not leave the previous pack quietly in use.
    const after = await ask({ type: 'compare', iso: '2020-06-15T12:00:00Z' });
    out.steps.brokenPacks[label] = { state: state.replace(/^refused: /, ''), stillAnswering: after.ok === true, thenRefused: after.refused };
  }

  // 6. Recovery: a good pack after a bad one.
  out.steps.recovery = { state: await loadPack(fixtures['valid.zeph']) };
  await page.click('#run');
  await page.waitForFunction(() => /ms/.test(document.getElementById('compare-state').textContent), null, { timeout: 30000 });
  out.steps.recovery.answersAgain = /ms/.test(await page.textContent('#compare-state'));

  // 7. A superseded reply must never reach the interface. Two comparisons
  //    are started back to back; the worker answers in order, so the first
  //    reply lands while the second is outstanding. Counting DOM writes is
  //    what distinguishes "dropped" from "overwritten".
  await page.evaluate(() => {
    window.__writes = 0;
    new MutationObserver(() => { window.__writes += 1; }).observe(document.getElementById('compare-out'), { childList: true, subtree: true });
  });
  // Both clicks happen in ONE synchronous task, so the second request is
  // posted before the first can be answered. Driving them as two separate
  // Playwright actions does not race at all -- the round trip between them
  // is longer than a comparison takes -- and a test that never creates the
  // race cannot say anything about it.
  await page.evaluate(() => {
    document.getElementById('iso').value = '2001-03-04T05:06:07Z';
    document.getElementById('run').click();
    document.getElementById('iso').value = '2011-07-08T09:10:11Z';
    document.getElementById('run').click();
  });
  await page.waitForFunction(() => /ms/.test(document.getElementById('compare-state').textContent), null, { timeout: 30000 });
  await page.waitForTimeout(500);
  const second = await ask({ type: 'compare', iso: '2011-07-08T09:10:11Z' });
  const shown = await page.$$eval('#compare-out table tr', (trs) => trs.slice(1).map((tr) => tr.children[2].textContent));
  out.steps.superseded = {
    domWrites: await page.evaluate(() => window.__writes),
    showsTheLatestRequest: shown[0] === second.rows[0].precision.toFixed(6),
  };

  // 8. Cancellation, and a responsive main thread while work is running.
  await page.click('#bench');
  await page.waitForFunction(() => /…/.test(document.getElementById('bench-state').textContent), null, { timeout: 30000 });
  const t0 = Date.now();
  await page.click('#cancel');
  const clickMs = Date.now() - t0;
  await page.waitForFunction(() => /cancelled|charts of/.test(document.getElementById('bench-state').textContent), null, { timeout: 60000 });
  out.steps.cancel = { clickAcceptedMs: clickMs, state: await page.textContent('#bench-state') };

  // 9. Dispose, then a reload, then a pack again.
  out.steps.dispose = await ask({ type: 'unload-pack' });
  out.steps.disposeThenRefuses = (await ask({ type: 'compare', iso: '2020-06-15T12:00:00Z' })).refused;
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__demo), null, { timeout: 15000 });
  out.steps.afterReload = { state: await loadPack(fixtures['valid.zeph']) };

  // 10. Nothing left behind, nothing off origin.
  out.steps.persistence = await page.evaluate(async () => {
    const dbs = typeof indexedDB?.databases === 'function' ? await indexedDB.databases() : 'not-enumerable';
    return {
      localStorage: localStorage.length,
      sessionStorage: sessionStorage.length,
      cookies: document.cookie,
      indexedDB: Array.isArray(dbs) ? dbs.map((d) => d.name) : dbs,
    };
  });
  out.steps.network = { offOrigin, failedRequests };
  out.errors = errors;

  out.verdict = verdictOf(out);
  return out;
}

function verdictOf(out) {
  const s = out.steps;
  const problems = [];
  if (!s.load.state.startsWith('loaded')) problems.push('the valid pack did not load');
  if (!s.load.digestMatchesNode) problems.push('the digest shown does not match the Node one');
  if (!s.load.authenticityStated) problems.push('authenticity was not reported as unestablished');
  if (s.calculate.rows.length !== 10) problems.push('the comparison did not produce ten bodies');
  if (s.crossEnvironment.identical !== s.crossEnvironment.compared) problems.push(`${s.crossEnvironment.compared - s.crossEnvironment.identical} cross-environment mismatches`);
  if (!s.search.matchesNode) problems.push('the browser search disagreed with the Node search');
  for (const [k, v] of Object.entries(s.refusals)) if (String(v).includes('ANSWERED')) problems.push(`answered instead of refusing: ${k}`);
  for (const [k, v] of Object.entries(s.brokenPacks)) {
    if (v === 'fixture-not-built') { problems.push(`fixture missing: ${k}`); continue; }
    if (v.stillAnswering) problems.push(`a broken pack (${k}) left the runtime answering`);
  }
  if (!s.recovery.answersAgain) problems.push('a good pack after a bad one did not work');
  if (s.superseded.domWrites !== 1) problems.push(`a superseded reply reached the interface (${s.superseded.domWrites} writes)`);
  if (!s.superseded.showsTheLatestRequest) problems.push('the interface does not show the latest request');
  if (!/cancelled/.test(s.cancel.state)) problems.push('cancel did not stop the run');
  if (s.cancel.clickAcceptedMs > 2000) problems.push(`the main thread took ${s.cancel.clickAcceptedMs} ms to accept a click`);
  if (s.disposeThenRefuses !== 'no-pack') problems.push('after dispose the runtime did not refuse');
  if (!s.afterReload.state.startsWith('loaded')) problems.push('a pack could not be loaded after a reload');
  if (s.persistence.localStorage || s.persistence.sessionStorage || s.persistence.cookies) problems.push('the page persisted something');
  if (Array.isArray(s.persistence.indexedDB) && s.persistence.indexedDB.length) problems.push('the page created an IndexedDB database');
  if (s.network.offOrigin.length) problems.push(`off-origin requests: ${s.network.offOrigin.join(', ')}`);
  if (out.errors.length) problems.push(`page errors: ${out.errors.join(' | ')}`);
  out.problems = problems;
  return problems.length === 0 ? 'pass' : 'FAIL';
}
