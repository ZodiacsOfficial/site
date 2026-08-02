/**
 * Ask Zodiacs v2 browser drive. Uses a mocked named-SSE endpoint and verifies
 * the inline /ask/ guide, modal quick access, chart consent, session-only
 * persistence, metadata rendering, stable errors, aborts, and mobile layout.
 *
 *   npm run build
 *   npm run test:phase6:ask
 */
import { setTimeout as wait } from 'node:timers/promises';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });
const bodies = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node', 'South Node'];
const chart = ({ id, name, updatedAt, timeKnown = true, offset = 0 }) => ({
  id, name,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt,
  birth: {
    date: '1988-11-02', time: timeKnown ? '06:20' : null, timeKnown,
    place: { name: 'Lisbon', admin1: '', country: 'PT', lat: 38.72, lon: -9.14, tz: 'Europe/Lisbon' },
  },
  summary: {
    engineVersion: '0.1.0', utcISO: '1988-11-02T06:20:00.000Z', houseSystem: 'whole',
    bodies: bodies.map((body, index) => ({ body, lon: (12.5 + index * 27 + offset) % 360, retrograde: body === 'Mercury' })),
    angles: timeKnown ? { asc: (218 + offset) % 360, mc: (128 + offset) % 360 } : null,
    flags: timeKnown ? [] : ['no-time'],
  },
});
const profile = {
  version: 1,
  settings: { houseSystem: 'whole' },
  charts: [
    chart({ id: '11111111-1111-4111-8111-111111111111', name: 'First chart', updatedAt: '2026-07-20T00:00:00.000Z' }),
    chart({ id: '22222222-2222-4222-8222-222222222222', name: 'No-time chart', updatedAt: '2026-07-21T00:00:00.000Z', timeKnown: false, offset: 14 }),
  ],
};

const guideMeta = {
  capabilities: { chart: true, houses: true, transits: true },
  receipts: [{
    label: 'A calculated chart pattern', factIds: ['chart:body:sun'], sourceIds: ['learn-aspects'],
    sources: [{ id: 'learn-aspects', path: '/learn/aspects/', title: 'The aspects', heading: 'Reading aspects' }],
  }],
  followUps: [
    { question: 'How can I work with this pattern?', requires: 'chart', factIds: ['chart:body:sun'], sourceIds: [] },
    { question: 'What is the longer lesson here?', requires: 'none', factIds: [], sourceIds: ['learn-aspects'] },
  ],
};
const event = (name, data) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
const v2Sse = (answer, meta = guideMeta) => [
  event('status', { stage: 'thinking' }),
  event('answer.delta', { text: answer }),
  event('guide.meta', meta),
  event('done', {}),
].join('');

await withPreview({ port: 4406 }, async (baseURL) => {
  const browser = await chromium.launch({ executablePath: await findChromium(), args: STABLE_CHROMIUM_ARGS });
  try {
    const noJs = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const noJsPage = await noJs.newPage();
    await noJsPage.goto(`${baseURL}/ask/`, { waitUntil: 'domcontentloaded' });
    check('no-JS /ask/ keeps its guide heading', await noJsPage.locator('h1').textContent() === 'Your chart guide, not an oracle.');
    check('no-JS /ask/ explains the JavaScript requirement', (await noJsPage.locator('.ask__nojs').textContent() ?? '').includes('JavaScript'));
    check('no-JS /ask/ keeps source routes', await noJsPage.locator('.ask__routes a[href="/learn/"]').count() === 1);
    check('no-JS /ask/ has no horizontal overflow', await noJsPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await noJs.close();

    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript((saved) => localStorage.setItem('zodiacs.profile.v1', JSON.stringify(saved)), profile);
    const page = await context.newPage();
    const requests = [];
    let mode = 'ok';
    await page.route('**/api/assistant', async (route) => {
      const body = route.request().postDataJSON();
      requests.push(body);
      if (mode === 'visitor_limit') {
        await route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'visitor_limit' }) });
        return;
      }
      if (mode === 'provider_unavailable') {
        await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'provider_unavailable' }) });
        return;
      }
      if (mode === 'slow') {
        await wait(4_000);
        await route.fulfill({ status: 200, contentType: 'text/event-stream', body: v2Sse('This should arrive too late.') });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: v2Sse(body.chart ? 'Your attached chart shows a clear pattern.' : 'Start with the Sun, Moon, and Rising as three different functions.'),
      });
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${baseURL}/ask/`, { waitUntil: 'networkidle' });
    const inline = page.locator('.zassistant--embedded');
    await inline.waitFor({ timeout: 15_000 });
    check('/ask/ mounts the full guide inline', await inline.locator('.zassistant__title').textContent() === 'Ask Zodiacs — your chart guide');
    check('starter prompts cost no request', requests.length === 0);
    const starter = inline.locator('.zassistant__starter').first();
    const starterText = await starter.textContent();
    await starter.click();
    check('starter only prefills the composer', await inline.locator('textarea').inputValue() === starterText && requests.length === 0);

    const selector = inline.locator('.zassistant__chart-select');
    const attach = inline.locator('.zassistant__chart-chip');
    check('chart selection and attachment both default off', await selector.inputValue() === ''
      && await attach.getAttribute('aria-pressed') === 'false' && await attach.isDisabled());
    check('multi-chart picker lists both local names', await selector.locator('option').count() === 3);

    await selector.selectOption('11111111-1111-4111-8111-111111111111');
    check('choosing a chart still sends nothing', requests.length === 0 && await attach.getAttribute('aria-pressed') === 'false');
    await attach.click();
    const exactPreview = inline.locator('.zassistant__consent-preview');
    await exactPreview.waitFor();
    const previewObject = JSON.parse(await exactPreview.textContent());
    check('consent previews the exact v2 chart object', typeof previewObject.positionsToken === 'string'
      && Array.isArray(previewObject.retrogradeBodies));
    check('exact chart preview contains no saved PII', !/First chart|11111111|1988-11-02|06:20|Lisbon|38\.72|-9\.14|Europe\/Lisbon/.test(JSON.stringify(previewObject)));
    check('opening the chart preview sends nothing', requests.length === 0);
    await inline.locator('.zassistant__consent-confirm').click();
    check('confirmation enables attachment without auto-send', await attach.getAttribute('aria-pressed') === 'true' && requests.length === 0);
    check('chart consent returns keyboard focus to the attachment control',
      await attach.evaluate((node) => document.activeElement === node));

    const input = inline.locator('textarea');
    await input.fill('What pattern matters most?');
    await inline.locator('form button[type="submit"]').click();
    await inline.locator('.zassistant__guide-meta').waitFor({ timeout: 15_000 });
    const sent = requests.at(-1);
    check('client sends the strict v2 request', sent.version === 2 && sent.locale === 'en'
      && sent.pagePath === '/ask/' && sent.messages.at(-1).role === 'user');
    check('request chart is byte-equivalent to confirmed preview', JSON.stringify(sent.chart) === JSON.stringify(previewObject));
    check('validated receipt creates the only source link', await inline.locator('.zassistant__source[href="/learn/aspects/"]').count() === 1);
    const followUp = inline.locator('.zassistant__follow-up').first();
    const followUpText = await followUp.textContent();
    await followUp.click();
    check('follow-up only prefills', (await input.inputValue()) === followUpText.replace(/ ↗$/, '') && requests.length === 1);
    await inline.locator('form button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.zassistant--embedded .zassistant__guide-meta').length === 2);
    const secondRequest = requests.at(-1);
    check('second turn preserves one complete pair before the new user message', secondRequest.messages.length === 3
      && secondRequest.messages.map((message) => message.role).join(',') === 'user,assistant,user');
    const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('zodiacs.assistant.session.v2')));
    check('completed visible turns persist in sessionStorage', stored.turns.length === 2
      && stored.turns[0].question === 'What pattern matters most?');
    check('assistant conversation never uses localStorage', await page.evaluate(() => !Object.keys(localStorage).some((key) => key.includes('assistant'))));

    await selector.selectOption('22222222-2222-4222-8222-222222222222');
    check('switching chart revokes attachment', await attach.getAttribute('aria-pressed') === 'false');
    check('unknown-time starter omits Rising', !(await inline.locator('.zassistant__starter').first().textContent()).includes('Rising'));
    await attach.click();
    const noTimePreview = JSON.parse(await inline.locator('.zassistant__consent-preview').textContent());
    check('unknown-time payload omits cusps', !Object.hasOwn(noTimePreview, 'cusps'));
    await inline.locator('.zassistant__consent-cancel').click();
    check('declining chart consent returns keyboard focus to the attachment control',
      await attach.evaluate((node) => document.activeElement === node));

    mode = 'visitor_limit';
    await input.fill('One more question');
    await inline.locator('form button[type="submit"]').click();
    await inline.locator('.zassistant__status').filter({ hasText: 'limit of 10 questions' }).waitFor();
    check('stable visitor limit is actionable', true);
    const afterLimit = await page.evaluate(() => JSON.parse(sessionStorage.getItem('zodiacs.assistant.session.v2')).turns.length);
    check('failed answer is never persisted', afterLimit === 2);

    mode = 'slow';
    await input.fill('A slow question');
    await inline.locator('form button[type="submit"]').click();
    await inline.locator('.zassistant__stop').click();
    await inline.locator('.zassistant__status').filter({ hasText: 'partial answer was not saved' }).waitFor();
    check('stopped answer is never persisted', await page.evaluate(() => JSON.parse(sessionStorage.getItem('zodiacs.assistant.session.v2')).turns.length) === 2);

    const footerOpener = page.locator('.footer__assistant');
    await footerOpener.click();
    await page.waitForFunction(() => document.activeElement?.matches('.zassistant--embedded textarea'));
    check('quick access on /ask/ focuses the one embedded session instead of opening stale state',
      await page.locator('.zassistant--modal:visible').count() === 0
      && await input.evaluate((node) => document.activeElement === node));
    check('no page errors across client states', errors.length === 0, errors.join(' | '));
    await context.close();

    const localized = [
      ['es', 'Pregunta a Zodiacs — tu guía de la carta', 'Tu guía de la carta, no un oráculo.', 'Privacidad'],
      ['pt', 'Pergunte ao Zodiacs — seu guia do mapa', 'Seu guia do mapa, não um oráculo.', 'Privacidade'],
      ['fr', 'Demander à Zodiacs — votre guide du thème', 'Votre guide du thème, pas un oracle.', 'Confidentialité'],
      ['it', 'Chiedi a Zodiacs — la tua guida al tema', 'La tua guida al tema, non un oracolo.', 'Privacy'],
    ];
    for (const [locale, title, heading, privacyLabel] of localized) {
      const translated = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const translatedPage = await translated.newPage();
      await translatedPage.goto(`${baseURL}/${locale}/ask/`, { waitUntil: 'networkidle' });
      const translatedGuide = translatedPage.locator('.zassistant--embedded');
      await translatedGuide.waitFor({ timeout: 15_000 });
      check(`/${locale}/ask/ has localized static and interactive copy`,
        await translatedPage.locator('h1').textContent() === heading
        && await translatedGuide.locator('.zassistant__title').textContent() === title);
      check(`/${locale}/ask/ mobile nav stays in locale`,
        await translatedPage.locator(`.mobile-menu__link[href="/${locale}/ask/"]`).count() === 1);
      check(`/${locale}/ask/ starter is localized`,
        (await translatedGuide.locator('.zassistant__starter').first().textContent()) !== 'Where should I begin with astrology?');
      check(`/${locale}/ask/ privacy link is localized`,
        (await translatedGuide.locator('.zassistant__privacy a').textContent())?.trim() === privacyLabel);
      await translated.close();
    }

    for (const width of [360, 390, 781, 1280]) {
      const sized = await browser.newContext({ viewport: { width, height: 900 } });
      const sizedPage = await sized.newPage();
      await sizedPage.goto(`${baseURL}/ask/`, { waitUntil: 'networkidle' });
      await sizedPage.locator('.zassistant--embedded').waitFor({ timeout: 15_000 });
      check(`/ask/@${width} has no horizontal overflow`, await sizedPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await sized.close();
    }

    const shortMobile = await browser.newContext({ viewport: { width: 360, height: 640 } });
    const shortMobilePage = await shortMobile.newPage();
    await shortMobilePage.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
    await shortMobilePage.locator('.footer__assistant').click();
    const shortModal = shortMobilePage.locator('.zassistant--modal');
    await shortModal.waitFor({ state: 'visible', timeout: 15_000 });
    await shortModal.locator('.zassistant__memory > summary').click();
    const modalScroll = await shortModal.locator('.zassistant__panel').evaluate((panel) => {
      panel.scrollTop = panel.scrollHeight;
      const privacy = panel.querySelector('.zassistant__privacy')?.getBoundingClientRect();
      return {
        overflowY: getComputedStyle(panel).overflowY,
        scrollTop: panel.scrollTop,
        privacyBottom: privacy?.bottom ?? Number.POSITIVE_INFINITY,
      };
    });
    check('short mobile dialog keeps expanded memory and privacy controls reachable',
      modalScroll.overflowY === 'auto'
      && modalScroll.scrollTop > 0
      && modalScroll.privacyBottom <= 640 + 1);
    await shortMobile.close();
  } finally {
    await browser.close();
  }
});

const failures = results.filter((result) => !result.ok);
for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
if (failures.length) {
  console.error(`phase6-ask-drive: FAIL — ${failures.length}/${results.length}`);
  process.exit(1);
}
console.log(`phase6-ask-drive: PASS — ${results.length}/${results.length} checks`);
