/** Browser acceptance for a separately extracted and built starter archive. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';

assert.ok(process.env.PLATFORM_STARTER_DIR, 'PLATFORM_STARTER_DIR must identify a freshly extracted, installed and built consumer');
assert.ok(process.env.PLATFORM_STARTER_EVIDENCE, 'PLATFORM_STARTER_EVIDENCE must identify the output directory');
const consumer = resolve(process.env.PLATFORM_STARTER_DIR);
const outDir = resolve(process.env.PLATFORM_STARTER_EVIDENCE);
await mkdir(outDir, { recursive: true });
const candidate = JSON.parse(await readFile(join(consumer, 'candidate.json'), 'utf8'));
const starterArchive = process.env.PLATFORM_STARTER_ARCHIVE ? resolve(process.env.PLATFORM_STARTER_ARCHIVE) : null;
const starterArchiveHash = starterArchive ? createHash('sha256').update(await readFile(starterArchive)).digest('hex') : null;
const engineHash = createHash('sha256').update(await readFile(join(consumer, `vendor/zodiacs-engine-${candidate.version}.tgz`))).digest('hex');
assert.equal(candidate.package, '@zodiacs/engine');
assert.match(candidate.version, /^\d+\.\d+\.\d+-rc\.\d+$/);
assert.equal(candidate.sha256, engineHash);
const { startServer } = await import(pathToFileURL(join(consumer, 'scripts/server.mjs')).href);
const results = [];
const localRuns = [];
const widgetRuns = [];
const startedAt = new Date().toISOString();
const contexts = new Set();
const check = (name, value, detail = null) => {
  results.push({ name, ok: Boolean(value), detail });
  assert.ok(value, `${name}${detail ? `: ${JSON.stringify(detail)}` : ''}`);
};
const capture = (page, name) => page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true, animations: 'disabled' });
const parse = async (page) => {
  const displayedReceipt = JSON.parse(await page.locator('#receipt').textContent());
  const result = JSON.parse(await page.locator('#result').textContent());
  if (await page.locator('body').getAttribute('data-example') !== 'natal') return { receipt: displayedReceipt, result };
  assert.equal(displayedReceipt.schema, 'zodiacs.calculation-receipt.draft-v1');
  // Compare the same semantic assertions across the natal draft receipt and
  // unchanged transit example metadata; retain the actual displayed schema too.
  const receipt = {
    engine: { version: displayedReceipt.engine.version,
      artifactSHA256: displayedReceipt.provenance?.artifact?.sha256 },
    birthUtc: displayedReceipt.instant,
    birthTimeKnown: displayedReceipt.timeKnown,
    submittedBirthInstant: displayedReceipt.sourceInstant,
    requestedHouseSystem: displayedReceipt.houses.requested,
    actualHouseSystem: displayedReceipt.houses.actual,
    flags: displayedReceipt.resultFlags,
  };
  return { receipt, displayedReceipt, result };
};
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  && [...document.querySelectorAll('input, select, button')].every((node) => {
    const rect = node.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth + 1;
  }));
const tick = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const storage = (page) => page.evaluate(async () => ({
  local: Object.keys(localStorage), session: Object.keys(sessionStorage),
  databases: await indexedDB.databases(), caches: await caches.keys(),
  serviceWorkers: (await navigator.serviceWorker.getRegistrations()).length,
}));

function observe(context) {
  const requests = [];
  const failures = [];
  const errors = [];
  context.on('request', (request) => requests.push({ url: request.url(), method: request.method(), type: request.resourceType(), hasBody: request.postData() !== null }));
  context.on('requestfailed', (request) => failures.push({ url: request.url(), failure: request.failure()?.errorText }));
  context.on('page', (page) => {
    page.on('pageerror', (error) => errors.push({ type: 'pageerror', message: error.message }));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push({ type: 'console', message: message.text(), url: message.location().url });
    });
  });
  return { requests, failures, errors };
}

async function localContext(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', timezoneId: 'UTC' });
  contexts.add(context);
  await context.addInitScript(() => {
    window.__starterNetworkAttempts = [];
    const record = (api, url) => window.__starterNetworkAttempts.push({ api, url: String(url) });
    const fetch = window.fetch;
    window.fetch = function (...args) { record('fetch', args[0]?.url ?? args[0]); return Reflect.apply(fetch, this, args); };
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (...args) { record('xhr', args[1]); return Reflect.apply(open, this, args); };
    const beacon = navigator.sendBeacon;
    navigator.sendBeacon = function (...args) { record('beacon', args[0]); return Reflect.apply(beacon, this, args); };
    for (const name of ['WebSocket', 'EventSource']) {
      const Original = window[name];
      window[name] = class extends Original { constructor(...args) { record(name, args[0]); super(...args); } };
    }
  });
  return context;
}

async function driveLocal(browser, baseURL, mode, width) {
  const label = `${mode}-${width}`;
  const context = await localContext(browser, width);
  const observed = observe(context);
  const page = await context.newPage();
  const run = { mode, width, ...observed, calculations: [] };
  localRuns.push(run);
  try {
    const url = `${baseURL}/${mode}.html`;
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    check(`${label}: initial page and bundle load`, response.status() === 200 && await page.locator('#calculate').isEnabled());
    check(`${label}: no form submission, named input or embedded third party`, await page.locator('form, input[name], iframe').count() === 0);
    check(`${label}: reduced motion and no horizontal overflow`, await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches) && await noOverflow(page));
    check(`${label}: initial assets are local GETs without query or body`, observed.requests.every((r) => r.method === 'GET' && !r.hasBody && new URL(r.url).origin === baseURL && !new URL(r.url).search), observed.requests);
    const countBefore = observed.requests.length;
    const calculate = async (name, keyboard = false) => {
      if (keyboard) await page.keyboard.press('Enter');
      else await page.locator('#calculate').click();
      await tick(page);
      check(`${label}: ${name} has no calculation error`, (await page.locator('#error').textContent()) === '');
      const data = await parse(page);
      run.calculations.push({ name, receipt: data.receipt, positionCount: (data.result.bodies ?? data.result.positions).length });
      return data;
    };
    await page.locator('#timeKnown').focus();
    for (const id of ['birthInstant', 'latitude', 'longitude', 'houseSystem', ...(mode === 'transits' ? ['transitInstant'] : []), 'calculate']) {
      await page.keyboard.press('Tab');
      check(`${label}: keyboard reaches ${id}`, await page.locator(`#${id}`).evaluate((node) => node === document.activeElement && node.matches(':focus-visible')));
    }
    const initial = await calculate('default via keyboard', true);
    check(`${label}: 12 positions and exact candidate provenance`, (initial.result.bodies ?? initial.result.positions).length === 12
      && initial.receipt.engine.version === candidate.version && initial.receipt.engine.artifactSHA256 === engineHash);
    check(`${label}: requested Placidus, actual whole sign and polar flag`, initial.receipt.requestedHouseSystem === 'placidus'
      && initial.receipt.actualHouseSystem === 'whole' && JSON.stringify(initial.receipt.flags) === '["polar-fallback"]');
    if (mode === 'natal') check(`${label}: independently specified corrected polar ASC`, Math.abs(initial.result.angles.asc - 23.871984112302016) < 1e-10);
    else check(`${label}: explicit transit instant and moving-to-natal aspects`, initial.receipt.transitUtc === '2026-09-07T12:00:00.000Z'
      && initial.result.aspects.length > 0 && initial.result.aspects.every((aspect) => aspect.a && aspect.b));
    check(`${label}: result fits viewport`, await noOverflow(page));
    await capture(page, `${label}-known`);

    await page.locator('#birthInstant').fill('2001-12-21T14:30:00+05:30');
    const offset = await calculate('equivalent explicit offset');
    check(`${label}: equivalent offset preserves identical results and submitted value`, JSON.stringify(offset.result) === JSON.stringify(initial.result)
      && offset.receipt.birthUtc === initial.receipt.birthUtc && offset.receipt.submittedBirthInstant === '2001-12-21T14:30:00+05:30');
    if (mode === 'transits') {
      await page.locator('#transitInstant').fill('2026-09-08T12:00:00Z');
      const changed = await calculate('changed transit instant');
      check(`${label}: changed transit changes positions`, JSON.stringify(changed.result.positions) !== JSON.stringify(initial.result.positions)
        && changed.receipt.transitUtc === '2026-09-08T12:00:00.000Z');
    }
    const invalid = async (id, value, name) => {
      const previous = await page.locator(`#${id}`).inputValue();
      await page.locator(`#${id}`).fill(value);
      await page.locator('#calculate').click();
      await tick(page);
      check(`${label}: ${name} clears stale output and reports an error`, Boolean((await page.locator('#error').textContent()).trim())
        && (await page.locator('#receipt').textContent()) === '' && (await page.locator('#result').textContent()) === '');
      await page.locator(`#${id}`).fill(previous);
      await calculate(`recovery after ${name}`);
    };
    await invalid('birthInstant', '2001-02-29T09:00:00Z', 'impossible date');
    await invalid(mode === 'transits' ? 'transitInstant' : 'birthInstant', '2026-09-07T12:00:00', 'missing offset');
    await invalid('latitude', '', 'empty coordinate');
    await invalid('longitude', 'Infinity', 'nonfinite coordinate');
    await invalid('birthInstant', '<img src=x onerror="window.__starterInjected=1">', 'HTML injection input');
    check(`${label}: injected input creates no HTML or script execution`, await page.locator('#result img, #receipt img, #error img').count() === 0
      && await page.evaluate(() => window.__starterInjected === undefined));

    await page.locator('#timeKnown').selectOption('unknown');
    const unknown = await calculate('unknown time');
    check(`${label}: unknown time is noon UTC without actual houses`, unknown.receipt.birthUtc === '2001-12-21T12:00:00.000Z'
      && unknown.receipt.birthTimeKnown === false && unknown.receipt.actualHouseSystem === null && JSON.stringify(unknown.receipt.flags) === '["no-time"]');
    if (mode === 'natal') check(`${label}: unknown time has null angles and houses`, unknown.result.angles === null && unknown.result.houses === null);
    await invalid('birthDate', '2001-02-29', 'unknown-time impossible date');
    await capture(page, `${label}-unknown`);

    await context.setOffline(true);
    if (mode === 'transits') await page.locator('#transitInstant').fill('2026-09-09T12:00:00Z');
    else await page.locator('#birthDate').fill('2001-12-22');
    const offline = await calculate('offline after load');
    check(`${label}: offline changed input produces a new result`, mode === 'transits'
      ? offline.receipt.transitUtc === '2026-09-09T12:00:00.000Z' && JSON.stringify(offline.result.positions) !== JSON.stringify(unknown.result.positions)
      : offline.receipt.birthUtc === '2001-12-22T12:00:00.000Z' && JSON.stringify(offline.result.bodies) !== JSON.stringify(unknown.result.bodies));
    run.networkAPIcalls = await page.evaluate(() => window.__starterNetworkAttempts);
    run.storage = await storage(page);
    run.cookies = await context.cookies();
    run.calculationRequestCount = observed.requests.length - countBefore;
    check(`${label}: all calculations attempt zero network requests`, run.calculationRequestCount === 0 && run.networkAPIcalls.length === 0, { requests: run.calculationRequestCount, apiCalls: run.networkAPIcalls });
    check(`${label}: inputs never enter storage, cookies or URL`, Object.values(run.storage).every((v) => Array.isArray(v) ? v.length === 0 : v === 0)
      && run.cookies.length === 0 && page.url() === url, { storage: run.storage, cookies: run.cookies, url: page.url() });
    check(`${label}: no page/console/request failures`, observed.errors.length === 0 && observed.failures.length === 0, observed);
    await capture(page, `${label}-offline`);
  } catch (error) {
    await capture(page, `${label}-failure`).catch(() => {});
    throw error;
  } finally {
    await context.close(); contexts.delete(context);
  }
}

async function driveScriptBlocked(browser, baseURL) {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
  contexts.add(context);
  const observed = observe(context);
  const page = await context.newPage();
  try {
    await page.goto(`${baseURL}/natal.html`, { waitUntil: 'networkidle' });
    const initial = observed.requests.length;
    await page.locator('#birthInstant').fill('2001-12-21T09:00:00Z');
    await page.locator('#birthInstant').press('Enter');
    check('script blocked: no birth submission or URL values', await page.locator('#calculate').isDisabled()
      && await page.locator('form, input[name]').count() === 0 && observed.requests.length === initial
      && page.url() === `${baseURL}/natal.html`);
    await capture(page, 'natal-390-script-blocked');
  } finally { await context.close(); contexts.delete(context); }
}

async function driveReceipts(browser, baseURL, width) {
  const label = `receipt-${width}`;
  const context = await localContext(browser, width);
  const observed = observe(context);
  const page = await context.newPage();
  const engineRoot = join(consumer, 'node_modules/@zodiacs/engine/dist');
  const { natalChart } = await import(pathToFileURL(join(engineRoot, 'index.js')).href);
  const { createNatalEnvelope, parseNatalEnvelope, serializeNatalEnvelope } = await import(pathToFileURL(join(engineRoot, 'receipt.js')).href);
  const sourceInstant = '2001-12-21T08:30:00-00:00';
  const unknown = createNatalEnvelope(natalChart({ utc: sourceInstant, timeKnown: false,
    latitude: 78.2232, longitude: 15.6267, houseSystem: 'placidus' }), { sourceInstant,
    extensions: { private: 'SYNTHETIC-PRIVATE-EXTENSION', html: '<img src=x onerror="window.__receiptInjection=1">' } });
  const encodedUnknown = serializeNatalEnvelope(unknown);
  try {
    await page.goto(`${baseURL}/natal.html`, { waitUntil: 'networkidle' });
    const before = observed.requests.length;
    await context.setOffline(true);
    await page.evaluate(() => {
      window.__receiptBlobs = { created: 0, revoked: 0 };
      const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
      URL.createObjectURL = function (...args) { window.__receiptBlobs.created++; return Reflect.apply(create, this, args); };
      URL.revokeObjectURL = function (...args) { window.__receiptBlobs.revoked++; return Reflect.apply(revoke, this, args); };
    });
    const display = async () => ({ receipt: JSON.parse(await page.locator('#receipt').textContent()), result: JSON.parse(await page.locator('#result').textContent()) });
    const select = (contents, name = 'synthetic-private-name.json') => page.locator('#importFile').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.isBuffer(contents) ? contents : Buffer.from(contents) });
    const importFile = async (contents) => {
      await select(contents);
      await page.locator('#importEnvelope').click();
      await page.waitForFunction(() => /Imported stored result|No imported result/.test(document.getElementById('status').textContent));
    };
    const download = async () => {
      const pending = page.waitForEvent('download');
      await page.locator('#exportEnvelope').click();
      const item = await pending;
      assert.equal(item.suggestedFilename(), 'zodiacs-natal-envelope-draft-v1.json');
      const stream = await item.createReadStream();
      assert(stream, 'The actual browser download must be readable');
      const chunks = [];
      for await (const bytes of stream) chunks.push(bytes);
      const parsed = parseNatalEnvelope(Buffer.concat(chunks).toString('utf8'));
      assert.equal(parsed.ok, true);
      return parsed.envelope;
    };
    check(`${label}: no export or diagnostic before a valid result`, await page.locator('#exportEnvelope').isDisabled() && await page.locator('#showDiagnostic').isDisabled());
    await page.locator('#calculate').click();
    const fresh = await download();
    check(`${label}: actual downloaded fresh receipt retains source and resolved dependency facts`, fresh.receipt.houses.requested === 'placidus'
      && fresh.receipt.houses.actual === 'whole' && fresh.receipt.provenance.artifact.sha256 === engineHash
      && fresh.receipt.provenance.source.commit === candidate.sourceCommit
      && fresh.receipt.provenance.ephemeris.version === candidate.ephemeris.version);
    const formBefore = await page.locator('fieldset').first().locator('input,select').evaluateAll((nodes) => nodes.map((node) => [node.id, node.value, node.disabled]));
    await importFile(encodedUnknown);
    const imported = await display();
    check(`${label}: imported unknown 08:30 stays a supplied reference`, imported.receipt.instant === '2001-12-21T08:30:00.000Z'
      && imported.receipt.sourceInstant === sourceInstant && imported.receipt.reference === 'supplied-instant'
      && imported.receipt.timeKnown === false && imported.result.angles === null && imported.result.houses === null);
    assert.deepEqual(await page.locator('fieldset').first().locator('input,select').evaluateAll((nodes) => nodes.map((node) => [node.id, node.value, node.disabled])), formBefore);
    check(`${label}: import leaves the birth form unchanged and labels claims`, (await page.locator('#status').textContent()).includes('unverified claims'));
    assert.deepEqual(await download(), unknown);
    check(`${label}: download round trip preserves precision and inert extensions`, true);
    check(`${label}: extensions create no display nodes, text or execution`, !(await page.locator('body').textContent()).includes('SYNTHETIC-PRIVATE-EXTENSION')
      && await page.locator('#receipt img,#result img,#diagnostic img').count() === 0 && await page.evaluate(() => window.__receiptInjection === undefined));
    await page.locator('#showDiagnostic').focus();
    await page.keyboard.press('Enter');
    const diagnostic = JSON.parse(await page.locator('#diagnostic').textContent());
    check(`${label}: keyboard diagnostic is fixed and excludes precise input`, diagnostic.status === 'redacted-not-anonymous'
      && Object.keys(diagnostic).sort().join(',') === 'houses,inputFlags,resultFlags,schema,status,timeKnown'
      && !JSON.stringify(diagnostic).includes('2001') && !JSON.stringify(diagnostic).includes('78.2232'));
    await capture(page, `${label}-imported`);
    await page.locator('#importFile').scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(outDir, `${label}-controls-viewport.png`), animations: 'disabled' });

    const otherVersion = structuredClone(fresh);
    otherVersion.receipt.engine.version = '999.0.0';
    otherVersion.receipt.provenance.artifact.packageVersion = '999.0.0';
    otherVersion.receipt.provenance.runtime = { name: '<img src=x onerror="window.__receiptInjection=1">' };
    await importFile(JSON.stringify(otherVersion));
    check(`${label}: imported version claims survive without recomputation or markup`, (await display()).receipt.engine.version === '999.0.0'
      && await page.locator('#receipt img').count() === 0 && await page.evaluate(() => window.__receiptInjection === undefined));
    assert.deepEqual(await download(), otherVersion);

    await page.evaluate(() => {
      window.__receiptFileReads = 0;
      const original = File.prototype.arrayBuffer;
      File.prototype.arrayBuffer = function (...args) { window.__receiptFileReads++; return Reflect.apply(original, this, args); };
    });
    const unknownSchema = { ...unknown, schema: 'SYNTHETIC-PRIVATE-VERSION' };
    const required = { ...unknown, requiredFeatures: ['SYNTHETIC-PRIVATE-FEATURE'] };
    for (const [name, bytes, code] of [
      ['oversize', ' '.repeat(65537), 'size_limit'],
      ['invalid UTF-8', Buffer.from([255]), 'invalid_file'],
      ['private malformed JSON', 'SYNTHETIC-PRIVATE-ERROR{', 'invalid_json'],
      ['duplicate keys', `{"schema":"foreign",${encodedUnknown.slice(1)}`, 'invalid_json'],
      ['unknown schema', JSON.stringify(unknownSchema), 'unsupported_version'],
      ['required feature', JSON.stringify(required), 'unsupported_feature'],
    ]) {
      await importFile(bytes);
      check(`${label}: ${name} clears stale output with a fixed error`, (await page.locator('#error').textContent()) === `Import rejected (${code}). No previous chart is active.`
        && await page.locator('#receipt').textContent() === '' && await page.locator('#result').textContent() === ''
        && await page.locator('#diagnostic').textContent() === '' && await page.locator('#exportEnvelope').isDisabled() && await page.locator('#showDiagnostic').isDisabled());
      if (name === 'oversize') check(`${label}: oversized native File is never read`, await page.evaluate(() => window.__receiptFileReads === 0));
    }

    const holdRead = async () => page.evaluate(() => {
      const original = File.prototype.arrayBuffer;
      File.prototype.arrayBuffer = function () {
        File.prototype.arrayBuffer = original;
        return new Promise((resolve) => { window.__releaseReceiptRead = () => original.call(this).then(resolve); });
      };
    });
    const release = async () => { await page.evaluate(() => window.__releaseReceiptRead()); await tick(page); };
    for (const scenario of ['new calculation', 'new selection', 'cancel', 'new import']) {
      await select(encodedUnknown); await holdRead(); await page.locator('#importEnvelope').click();
      await page.waitForFunction(() => typeof window.__releaseReceiptRead === 'function');
      if (scenario === 'new calculation') await page.locator('#calculate').click();
      else if (scenario === 'new selection') await select(JSON.stringify(fresh));
      else if (scenario === 'cancel') await page.locator('#importFile').dispatchEvent('cancel');
      else await importFile(JSON.stringify(fresh));
      await release();
      if (scenario === 'new calculation' || scenario === 'new import') check(`${label}: pending import cannot replace ${scenario}`, (await display()).receipt.instant === fresh.receipt.instant);
      else check(`${label}: pending import cannot restore a result after ${scenario}`, await page.locator('#receipt').textContent() === '' && await page.locator('#exportEnvelope').isDisabled());
      await page.evaluate(() => { delete window.__releaseReceiptRead; });
    }
    await page.waitForFunction(() => window.__receiptBlobs.created === window.__receiptBlobs.revoked);
    check(`${label}: every temporary download URL is revoked`, await page.evaluate(() => window.__receiptBlobs.created >= 3 && window.__receiptBlobs.created === window.__receiptBlobs.revoked));
    check(`${label}: controls reflow without horizontal overflow`, await noOverflow(page));
    check(`${label}: imports, exports and diagnostics make no network request`, observed.requests.length === before
      && (await page.evaluate(() => window.__starterNetworkAttempts)).length === 0);
    const stored = await storage(page);
    check(`${label}: no automatic storage, cookie, URL data or page error`, Object.values(stored).every((value) => Array.isArray(value) ? value.length === 0 : value === 0)
      && (await context.cookies()).length === 0 && page.url() === `${baseURL}/natal.html` && observed.errors.length === 0 && observed.failures.length === 0);
  } catch (error) {
    await capture(page, `${label}-failure`).catch(() => {}); throw error;
  } finally { await context.close(); contexts.delete(context); }
}

async function driveWidget(browser, baseURL, width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  contexts.add(context);
  const observed = observe(context);
  const page = await context.newPage();
  const run = { width, ...observed, variants: [] };
  widgetRuns.push(run);
  try {
    await page.goto(`${baseURL}/widget.html`, { waitUntil: 'networkidle' });
    check(`widget-${width}: no external request or frame before selection`, observed.requests.every((r) => new URL(r.url).origin === baseURL)
      && await page.locator('iframe').count() === 0, observed.requests);
    for (const [theme, accent] of [['dark', '#7B6DA8'], ['light', '#123456']]) {
      await page.locator('#theme').selectOption(theme);
      await page.locator('#accent').fill(accent);
      const responsePromise = page.waitForResponse((response) => response.url().startsWith('https://zodiacs.org/embed/sky/?') && response.request().resourceType() === 'document');
      await page.locator('#load-widget').click();
      const element = page.locator('iframe');
      await element.scrollIntoViewIfNeeded();
      const response = await responsePromise;
      const frame = await (await element.elementHandle()).contentFrame();
      await frame.waitForLoadState('networkidle');
      const attribution = frame.getByRole('link', { name: /Powered by Zodiacs.org/ });
      await attribution.waitFor({ state: 'visible', timeout: 25_000 });
      await attribution.scrollIntoViewIfNeeded();
      const state = await frame.evaluate(() => {
        const link = [...document.querySelectorAll('a')].find((a) => a.textContent.includes('Powered by Zodiacs.org'));
        const luminance = (color) => {
          const [r, g, b] = color.match(/[\d.]+/g).slice(0, 3).map((channel) => {
            const value = Number(channel) / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const a = luminance(getComputedStyle(link).color);
        const b = luminance(getComputedStyle(document.body).backgroundColor);
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--w-accent').trim();
        return { text: document.body.innerText, theme: document.documentElement.dataset.theme,
          accent, validAccent: CSS.supports('color', accent), contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
          overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      const displayedDate = state.text.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ?? null;
      const observedAt = new Date().toISOString();
      const variant = { theme, accent, status: response.status(), url: frame.url(), displayedDate,
        observedAt, currentUTCDate: observedAt.slice(0, 10), isCurrentUTCDate: displayedDate === observedAt.slice(0, 10), effectiveAccent: state.accent, contrast: state.contrast };
      run.variants.push(variant);
      const url = new URL(await element.getAttribute('src'));
      check(`widget-${width}-${theme}: live canonical frame and constrained settings`, response.status() === 200 && url.origin === 'https://zodiacs.org'
        && url.pathname === '/embed/sky/' && url.searchParams.get('theme') === theme && url.searchParams.get('accent') === accent
        && url.searchParams.size === 2 && state.theme === theme && state.validAccent && state.contrast >= 4.5,
      { variant, actualTheme: state.theme, validAccent: state.validAccent });
      check(`widget-${width}-${theme}: official sandbox and referrer policy`, await element.getAttribute('sandbox') === 'allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox'
        && await element.getAttribute('referrerpolicy') === 'strict-origin-when-cross-origin');
      check(`widget-${width}-${theme}: displayed date and intact reachable attribution`, Boolean(displayedDate)
        && new URL(await attribution.getAttribute('href')).origin === 'https://zodiacs.org'
        && await attribution.getAttribute('target') === '_blank' && (await attribution.getAttribute('rel')).includes('noopener'));
      check(`widget-${width}-${theme}: parent and frame have no horizontal overflow`, await noOverflow(page) && !state.overflow);
      const rect = await element.boundingBox();
      check(`widget-${width}-${theme}: frame fits responsive bounds`, rect.width <= 480 && rect.x >= 0 && rect.x + rect.width <= width + 1 && rect.height === 300, rect);
      await capture(page, `widget-${width}-${theme}`);
      await page.locator('#load-widget').focus();
      const focusTrace = [];
      variant.focusTrace = focusTrace;
      const sampleFocus = async (phase) => focusTrace.push({ phase,
        parent: await page.evaluate(() => ({ tag: document.activeElement.tagName, href: document.activeElement.href ?? null })),
        attribution: await attribution.evaluate((a) => ({ active: a === document.activeElement, documentFocused: document.hasFocus() })),
      });
      let reachedBoth = false;
      try {
        await page.keyboard.press('Tab');
        await sampleFocus('first-tab-immediate');
        // Cross-process iframe focus can settle after key dispatch returns.
        // Wait for the actual credit, without pressing extra Tab keys or
        // substituting a programmatic focus for keyboard accessibility.
        await page.waitForFunction((node) => node === document.activeElement, await element.elementHandle(), { timeout: 2500 });
        await frame.waitForFunction((node) => node === document.activeElement && document.hasFocus(), await attribution.elementHandle(), { timeout: 2500 });
        await sampleFocus('branding-settled');
        await page.keyboard.press('Tab');
        await page.waitForFunction(() => document.activeElement.href === 'https://zodiacs.org/today/', null, { timeout: 2500 });
        await sampleFocus('fallback-settled');
        reachedBoth = true;
      } catch {
        await sampleFocus('failed').catch(() => {});
      }
      check(`widget-${width}-${theme}: Tab reaches inside-frame branding and fallback`, reachedBoth, focusTrace);
    }
    const beforeInvalid = observed.requests.length;
    const previousSrc = await page.locator('iframe').getAttribute('src');
    await page.locator('#accent').fill('red');
    await page.locator('#load-widget').click();
    await tick(page);
    check(`widget-${width}: invalid accent requests no new frame`, Boolean((await page.locator('#error').textContent()).trim())
      && observed.requests.length === beforeInvalid && await page.locator('iframe').getAttribute('src') === previousSrc);
    check(`widget-${width}: no unexpected page/console/request failures`, observed.errors.length === 0 && observed.failures.length === 0, observed);
  } catch (error) {
    await capture(page, `widget-${width}-failure`).catch(() => {});
    throw error;
  } finally { await context.close(); contexts.delete(context); }
}

async function driveBlockedWidget(browser, baseURL) {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  contexts.add(context);
  const observed = observe(context);
  await context.route('https://zodiacs.org/embed/**', (route) => route.abort('blockedbyclient'));
  await context.route('https://zodiacs.org/today/', (route) => route.fulfill({ status: 200, contentType: 'text/plain', body: 'Synthetic fallback navigation reached the intended URL.' }));
  const page = await context.newPage();
  try {
    await page.goto(`${baseURL}/widget.html`, { waitUntil: 'networkidle' });
    const failed = page.waitForEvent('requestfailed', { predicate: (request) => request.url().startsWith('https://zodiacs.org/embed/sky/') });
    await page.locator('#load-widget').click();
    await page.locator('iframe').scrollIntoViewIfNeeded();
    await failed;
    const fallback = page.getByRole('link', { name: 'Open the sky on Zodiacs.org' });
    check('widget blocked: permanent fallback stays visible and safely targeted', await fallback.isVisible()
      && await fallback.getAttribute('href') === 'https://zodiacs.org/today/' && await fallback.getAttribute('rel') === 'noopener noreferrer');
    await capture(page, 'widget-390-blocked');
    const popupPromise = page.waitForEvent('popup');
    await fallback.click();
    const popup = await popupPromise;
    await popup.waitForURL('https://zodiacs.org/today/', { waitUntil: 'domcontentloaded' });
    check('widget blocked: fallback opens the intended URL (synthetic response)', popup.url() === 'https://zodiacs.org/today/'
      && (await popup.locator('body').textContent()).includes('Synthetic fallback navigation'));
    widgetRuns.push({ scenario: 'mocked blocked iframe and mocked fallback response', ...observed });
  } finally { await context.close(); contexts.delete(context); }
}

let server;
let browser;
const fatal = [];
try {
  server = await startServer(0);
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: await findChromium(), headless: true, args: STABLE_CHROMIUM_ARGS });
  const run = async (label, work) => {
    try { await work(); }
    catch (error) { fatal.push({ label, message: error.stack ?? String(error) }); console.error(`${label}: ${error.message}`); }
  };
  for (const width of [390, 1280]) for (const mode of ['natal', 'transits']) await run(`${mode}-${width}`, () => driveLocal(browser, baseURL, mode, width));
  for (const width of [320, 1280]) await run(`receipt-${width}`, () => driveReceipts(browser, baseURL, width));
  await run('script-blocked', () => driveScriptBlocked(browser, baseURL));
  for (const width of [390, 1280]) await run(`widget-${width}`, () => driveWidget(browser, baseURL, width));
  await run('widget-blocked', () => driveBlockedWidget(browser, baseURL));
} catch (error) { fatal.push({ label: 'setup', message: error.stack ?? String(error) }); }
finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  const evidence = { type: starterArchive ? 'internal archive-consumer browser acceptance; not external adoption' : 'pre-pack source browser check; no archive-consumer or external adoption claim', startedAt,
    completedAt: new Date().toISOString(), consumer, starterArchive, starterArchiveHash, candidate, engineHash, node: process.version,
    results, fatal, localRuns, widgetRuns };
  await writeFile(join(outDir, 'browser.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ checks: results.length, passed: results.filter((r) => r.ok).length, failures: fatal,
    widgetDates: widgetRuns.flatMap((run) => run.variants ?? []).map(({ displayedDate, observedAt, isCurrentUTCDate }) => ({ displayedDate, observedAt, isCurrentUTCDate })), outDir }, null, 2));
  if (fatal.length || results.some((r) => !r.ok)) process.exitCode = 1;
}
