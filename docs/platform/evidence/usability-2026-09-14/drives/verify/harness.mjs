// Shared harness for the usability reproduction drives.
// Runs the built site (dist/) via `astro preview` on 127.0.0.1 and drives it
// with playwright-core. Every context blocks all non-127.0.0.1 requests.
process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??= '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { findChromium, STABLE_CHROMIUM_ARGS } from '../../../../../../tests/visual/browser.mjs';
import { startPreview } from '../../../../../../tests/visual/preview-server.mjs';

export const OUT = process.env.OUT_DIR ?? resolve(process.cwd(), 'tests/visual/artifacts/usability-2026-09-14/verify');
export const DESKTOP = { width: 1280, height: 900 };
export const MOBILE = { width: 390, height: 844 };

export async function withSite(port, fn) {
  await mkdir(OUT, { recursive: true });
  const preview = await startPreview({ port });
  const browser = await chromium.launch({
    executablePath: await findChromium(),
    args: STABLE_CHROMIUM_ARGS,
    headless: true,
  });
  try {
    return await fn({ BASE: preview.baseURL, browser });
  } finally {
    await browser.close().catch(() => {});
    await preview.stop();
  }
}

/** Fresh context (clean storage). All non-loopback requests are aborted and logged. */
export async function freshContext(browser, { mobile = false } = {}) {
  const context = await browser.newContext({
    viewport: mobile ? MOBILE : DESKTOP,
    deviceScaleFactor: 1,
    hasTouch: mobile,
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  });
  context.blocked = [];
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') {
      context.blocked.push(url.href);
      return route.abort();
    }
    return route.continue();
  });
  context.setDefaultTimeout(30_000);
  return context;
}

export async function shot(page, name, { full = true } = {}) {
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, fullPage: full });
  return path;
}

export async function saveJson(name, data) {
  const path = `${OUT}/${name}.json`;
  await writeFile(path, JSON.stringify(data, null, 2));
  return path;
}

export const text = async (locator) => (await locator.textContent().catch(() => null))?.replace(/\s+/g, ' ').trim() ?? null;

/** Wait for the calculator island to hydrate (its date input becomes interactive). */
export async function waitForCalculator(page) {
  await page.waitForSelector('form.calc__form #birth-date', { state: 'visible' });
  // client:idle island: wait until Preact has attached handlers (the toggle checkbox exists only after hydration)
  await page.waitForFunction(() => {
    const form = document.querySelector('form.calc__form');
    return !!form && !!form.querySelector('.field__toggle input[type=checkbox]');
  });
}

/** Pick a birthplace by typing into the combobox and clicking the first suggestion. */
export async function pickPlace(page, inputId, query) {
  const input = page.locator(`#${inputId}`);
  await input.click();
  await input.fill(query);
  const list = page.locator(`#${inputId}-list [role=option]:not([aria-disabled="true"])`);
  await list.first().waitFor({ state: 'visible', timeout: 30_000 });
  const label = await text(list.first());
  await list.first().click();
  await page.waitForSelector(`.place--selected #${inputId}`, { timeout: 10_000 });
  return label;
}

/** Fill and submit the /birth-chart/ form; resolves when the big-three cards render. */
export async function computeChart(page, { date, time, timeUnknown = false, place = 'London' }) {
  await waitForCalculator(page);
  await page.fill('#birth-date', date);
  if (timeUnknown) {
    const box = page.locator('form.calc__form .field__toggle input[type=checkbox]');
    if (!(await box.isChecked())) await box.check();
  } else {
    await page.fill('#birth-time', time);
  }
  const picked = await pickPlace(page, 'place', place);
  await page.click('form.calc__form button[type=submit]');
  await page.waitForSelector('.calc__three', { timeout: 90_000 });
  // let lazy reading modules settle
  await page.waitForTimeout(1500);
  return { picked };
}

export function describeActive(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      type: el.getAttribute('type'),
      ariaLabel: el.getAttribute('aria-label'),
      role: el.getAttribute('role'),
      className: (el.getAttribute('class') || '').slice(0, 80),
      tabindex: el.getAttribute('tabindex'),
      text: txt,
    };
  });
}
