/**
 * Focused quick-access dialog drive. The full /ask/ acceptance story lives in
 * phase6-ask-drive.mjs; this checks the lazy modal in site navigation contexts.
 *
 *   npm run build
 *   node tests/assistant-drive.mjs
 */
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });
const sse = [
  'event: status\ndata: {"stage":"thinking"}\n\n',
  'event: answer.delta\ndata: {"text":"A square brings two functions into active tension."}\n\n',
  'event: guide.meta\ndata: {"capabilities":{"chart":false,"houses":false,"transits":false},"receipts":[{"label":"Aspect guide","factIds":[],"sourceIds":["aspects"],"sources":[{"id":"aspects","path":"/learn/aspects/","title":"The aspects"}]}],"followUps":[{"question":"How is a trine different?","requires":"none","factIds":[],"sourceIds":["aspects"]}]}\n\n',
  'event: done\ndata: {}\n\n',
].join('');

await withPreview({ port: 4405 }, async (baseURL) => {
  const browser = await chromium.launch({ executablePath: await findChromium(), args: STABLE_CHROMIUM_ARGS });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const requests = [];
    await page.route('**/api/assistant', async (route) => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse });
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${baseURL}/tools/`, { waitUntil: 'networkidle' });
    const opener = page.locator('.footer__assistant');
    await opener.click();
    const modal = page.locator('.zassistant--modal');
    await modal.waitFor({ state: 'visible', timeout: 15_000 });
    check('quick access opens the chart guide dialog', await modal.locator('.zassistant__title').textContent() === 'Ask Zodiacs — your chart guide');
    check('dialog has a polite conversation log', await modal.locator('.zassistant__log').getAttribute('aria-live') === 'polite');
    check('chart is not selected or attached by default', await modal.locator('.zassistant__chart-select').inputValue() === ''
      && await modal.locator('.zassistant__chart-chip').getAttribute('aria-pressed') === 'false');
    const firstStarter = modal.locator('.zassistant__starter').first();
    const prompt = await firstStarter.textContent();
    await firstStarter.click();
    check('starter prefill does not send', await modal.locator('textarea').inputValue() === prompt && requests.length === 0);
    await modal.locator('form button[type="submit"]').click();
    await modal.locator('.zassistant__source[href="/learn/aspects/"]').waitFor();
    check('modal sends the v2 request without chart context', requests[0].version === 2 && requests[0].chart === undefined);
    check('completed dialog turn enters sessionStorage', await page.evaluate(() => JSON.parse(sessionStorage.getItem('zodiacs.assistant.session.v2')).turns.length) === 1);
    await modal.locator('a[href]').last().focus();
    await page.keyboard.press('Tab');
    check('Tab wraps inside the modal focus trap', await modal.locator('.zassistant__close').evaluate((node) => document.activeElement === node));
    await page.keyboard.press('Escape');
    check('Escape closes and restores opener focus', !(await modal.isVisible())
      && await opener.evaluate((node) => document.activeElement === node));

    await page.goto(`${baseURL}/es/tools/`, { waitUntil: 'networkidle' });
    await page.locator('.footer__assistant').click();
    const spanish = page.locator('.zassistant--modal');
    await spanish.waitFor({ state: 'visible' });
    check('released locale copy and starters are localized', await spanish.locator('.zassistant__title').textContent() === 'Pregunta a Zodiacs — tu guía de la carta'
      && (await spanish.locator('.zassistant__starter').first().textContent()).startsWith('¿'));
    await page.keyboard.press('Escape');

    await page.goto(`${baseURL}/transits/`, { waitUntil: 'networkidle' });
    const contextual = page.locator('.ask-context__button');
    await contextual.click();
    const contextualModal = page.locator('.zassistant--modal');
    await contextualModal.waitFor({ state: 'visible' });
    check('Ask about this prefills but does not auto-send',
      await contextualModal.locator('textarea').inputValue() === 'Help me understand these transits.'
      && requests.length === 1);

    await page.keyboard.press('Escape');
    await page.goto(`${baseURL}/terminal/`, { waitUntil: 'networkidle' });
    check('Terminal keeps a shared Ask guide destination', await page.locator('.wnav a[href="/ask/"]').count() === 1);

    await page.goto(`${baseURL}/registry/`, { waitUntil: 'networkidle' });
    check('verification Registry keeps a shared Ask guide destination', await page.locator('.wnav a[href="/ask/"]').count() === 1);
    check('no runtime errors', errors.length === 0, errors.join(' | '));
    await context.close();
  } finally {
    await browser.close();
  }
});

const failures = results.filter((result) => !result.ok);
for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` · ${result.detail}` : ''}`);
console.log(failures.length ? `\n${failures.length} FAILURE${failures.length === 1 ? '' : 'S'}` : `\nALL ${results.length} CHECKS PASS`);
process.exit(failures.length ? 1 : 0);
