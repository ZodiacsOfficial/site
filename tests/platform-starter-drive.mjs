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
const engineHash = createHash('sha256').update(await readFile(join(consumer, 'vendor/zodiacs-engine-0.1.1-rc.1.tgz'))).digest('hex');
assert.equal(engineHash, 'f95c887deedb55f64b185ed4dd406b580b6d3287656ab5ec0557215fc02e5d17');
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
const parse = async (page) => ({ receipt: JSON.parse(await page.locator('#receipt').textContent()), result: JSON.parse(await page.locator('#result').textContent()) });
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
      && initial.receipt.engine.version === '0.1.1-rc.1' && initial.receipt.engine.artifactSHA256 === engineHash);
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
      let reachedFrame = false;
      let reachedFallback = false;
      for (let index = 0; index < 6; index += 1) {
        await page.keyboard.press('Tab');
        const focus = await page.evaluate(() => ({ tag: document.activeElement.tagName, href: document.activeElement.href ?? null }));
        if (focus.tag === 'IFRAME') reachedFrame ||= await attribution.evaluate((a) => a === document.activeElement);
        if (focus.href === 'https://zodiacs.org/today/') { reachedFallback = true; break; }
      }
      check(`widget-${width}-${theme}: Tab reaches inside-frame branding and fallback`, reachedFrame && reachedFallback);
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
  await run('script-blocked', () => driveScriptBlocked(browser, baseURL));
  for (const width of [390, 1280]) await run(`widget-${width}`, () => driveWidget(browser, baseURL, width));
  await run('widget-blocked', () => driveBlockedWidget(browser, baseURL));
} catch (error) { fatal.push({ label: 'setup', message: error.stack ?? String(error) }); }
finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  const evidence = { type: 'internal archive-consumer browser acceptance; not external adoption', startedAt,
    completedAt: new Date().toISOString(), consumer, starterArchive, starterArchiveHash, candidate, engineHash, node: process.version,
    results, fatal, localRuns, widgetRuns };
  await writeFile(join(outDir, 'browser.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ checks: results.length, passed: results.filter((r) => r.ok).length, failures: fatal,
    widgetDates: widgetRuns.flatMap((run) => run.variants ?? []).map(({ displayedDate, observedAt, isCurrentUTCDate }) => ({ displayedDate, observedAt, isCurrentUTCDate })), outDir }, null, 2));
  if (fatal.length || results.some((r) => !r.ok)) process.exitCode = 1;
}
