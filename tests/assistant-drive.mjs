/**
 * Lazy assistant drive with a fully mocked /api/assistant SSE endpoint.
 *
 *   npm run build
 *   OUT_DIR=/tmp/assistant node tests/assistant-drive.mjs
 */
import { mkdir } from 'node:fs/promises';
import { setTimeout as wait } from 'node:timers/promises';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const OUT = process.env.OUT_DIR ?? null;
const results = [];
const requests = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

if (OUT) await mkdir(OUT, { recursive: true });

const profile = {
  version: 1,
  settings: { houseSystem: 'whole' },
  charts: [{
    id: 'private-chart-id',
    name: 'Secret Person',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-07-12T00:00:00.000Z',
    birth: {
      date: '1990-04-17',
      time: '08:45',
      timeKnown: true,
      place: {
        name: 'Bangkok', admin1: '', country: 'TH',
        lat: 13.7563, lon: 100.5018, tz: 'Asia/Bangkok',
      },
    },
    summary: {
      engineVersion: '1.0.0',
      utcISO: '1990-04-17T01:45:00.000Z',
      houseSystem: 'whole',
      bodies: [
        { body: 'Sun', lon: 27.2, retrograde: false },
        { body: 'Moon', lon: 301.5, retrograde: false },
        { body: 'Mercury', lon: 45.25, retrograde: true },
      ],
      angles: { asc: 125, mc: 35 },
      flags: [],
    },
  }],
};

const contextualEvidence = {
  kind: 'transit',
  date: '2026-08-03',
  transitingBody: 'Saturn',
  aspect: 'trine',
  natalPoint: 'Moon',
  orb: 0.8,
};

const contextualQuestion = 'Why does this matter for me?';

function lastQuestion(body) {
  return body.messages.at(-1)?.content ?? '';
}

await withPreview({ port: 4404 }, async (baseURL) => {
  const browser = await chromium.launch({
    executablePath: await findChromium(),
    args: STABLE_CHROMIUM_ARGS,
  });

  try {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
    await context.addInitScript((savedProfile) => {
      localStorage.setItem('zodiacs.profile.v1', JSON.stringify(savedProfile));
      window.__assistantAnalytics = [];
      window.zodiacsAnalytics = {
        track(...args) { window.__assistantAnalytics.push(args); },
      };
    }, profile);

    const page = await context.newPage();
    await page.route('**/assets/assistant-ui.css', async (route) => {
      await wait(250);
      await route.continue();
    });
    await page.route('**/api/assistant', async (route) => {
      const body = route.request().postDataJSON();
      requests.push(body);
      const question = lastQuestion(body);

      if (question.includes('[stop]')) {
        await wait(1_500);
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: 'data: {"t":"late"}\n\ndata: [DONE]\n\n',
        }).catch(() => {});
        return;
      }
      if (question.includes('[limit]')) {
        await route.fulfill({ status: 429, contentType: 'application/json', body: '{"error":"limit"}' });
        return;
      }
      if (question.includes('[disabled]')) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"disabled"}' });
        return;
      }
      if (question.includes('[unavailable]')) {
        await route.fulfill({ status: 502, contentType: 'application/json', body: '{"error":"unavailable"}' });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: [
          'data: {"t":"Read "}\n\n',
          'data: {"t":"/learn/aspects/ next."}\n\n',
          'data: [DONE]\n\n',
        ].join(''),
      });
    });

    await page.goto(`${baseURL}/tools/`, { waitUntil: 'networkidle' });
    const opener = page.locator('[data-assistant-open][data-assistant-locale="en"]').first();
    await opener.click();
    const dialog = page.locator('.zassistant__panel');
    const input = page.locator('.zassistant__input');
    const chart = page.locator('.zassistant__chart-chip');
    check('dialog waits for its lazy stylesheet before rendering', await page.locator('.zassistant').count() === 0);
    await dialog.waitFor({ state: 'visible' });

    check('lazy dialog opens and focuses its textarea', await input.evaluate((element) => document.activeElement === element));
    check('saved-chart chip defaults off', await chart.textContent() === 'Use my chart'
      && await chart.getAttribute('aria-pressed') === 'false');
    check(
      'reply region is polite',
      await page.locator('.zassistant__log').getAttribute('aria-live') === 'polite',
    );
    const closeControl = page.getByRole('button', { name: 'Close assistant' });
    const closeBox = await closeControl.boundingBox();
    check('visible close button has a 44px target', (closeBox?.width ?? 0) >= 44 && (closeBox?.height ?? 0) >= 44, JSON.stringify(closeBox));
    // The saved-chart chip sits between the input and close control in DOM
    // order, so two keyboard steps land on the close button and activate
    // :focus-visible as a real keyboard user would.
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    const focusStyle = await closeControl.evaluate((element) => {
      const style = getComputedStyle(element);
      return { style: style.outlineStyle, width: style.outlineWidth };
    });
    check('close control has a visible focus ring', focusStyle.style !== 'none' && focusStyle.width !== '0px', JSON.stringify(focusStyle));
    if (OUT) await dialog.screenshot({ path: `${OUT}/assistant-mobile-focus.png` });
    await page.keyboard.press('Shift+Tab');
    check('focus trap wraps from close to the last control', await input.evaluate((element) => document.activeElement === element));
    check(
      'privacy footer uses the approved copy',
      await page.locator('.zassistant__privacy').textContent()
        === "The assistant can be wrong. Answers are generated; astrology here is symbolic, not deterministic. Conversations aren't stored by us.",
    );

    await input.fill('What is a trine?');
    await input.press('Shift+Enter');
    await input.type('Give me a path.');
    await input.press('Enter');
    await page.locator('.zassistant__message--assistant').filter({ hasText: 'Read /learn/aspects/ next.' }).waitFor();
    check('Shift+Enter inserts a newline and Enter sends', lastQuestion(requests[0]) === 'What is a trine?\nGive me a path.');
    check('chart stays out of an ordinary request', !('chart' in requests[0]));
    check(
      'completed same-site paths become safe links',
      await page.locator('.zassistant__link[href="/learn/aspects/"]').textContent() === '/learn/aspects/',
    );
    if (OUT) await dialog.screenshot({ path: `${OUT}/assistant-mobile-stream.png` });

    await input.fill('What does my chart say?');
    await input.press('Enter');
    await page.getByRole('button', { name: 'Attach my chart' }).click();
    await page.locator('.zassistant__message--assistant').filter({ hasText: '/learn/aspects/' }).nth(1).waitFor();
    const heuristicRequest = requests[1];
    check('my-chart wording attaches the newest saved chart', typeof heuristicRequest.chart === 'string'
      && await chart.textContent() === 'Using my chart');
    check(
      'chart context has sign, degree, and house lines',
      /Sun: \d+°\d{2}′ [A-Z][a-z]+ · house \d+/.test(heuristicRequest.chart ?? ''),
      heuristicRequest.chart ?? '',
    );
    check(
      'chart request contains no saved PII',
      !/Secret Person|private-chart-id|1990-04-17|08:45|Bangkok|13\.7563|100\.5018|Asia\/Bangkok|1990-04-17T01:45/.test(JSON.stringify(heuristicRequest)),
    );

    await page.getByRole('button', { name: 'Close assistant' }).click();
    await opener.click();
    check('reopening resets chart attachment to off', await chart.textContent() === 'Use my chart'
      && await chart.getAttribute('aria-pressed') === 'false');
    await chart.click();
    await page.getByRole('button', { name: 'Attach my chart' }).click();
    await input.fill('What should I read next?');
    await input.press('Enter');
    await page.locator('.zassistant__message--assistant').filter({ hasText: '/learn/aspects/' }).nth(2).waitFor();
    check('tapping Use my chart attaches placements', typeof requests[2].chart === 'string');

    await page.getByRole('button', { name: 'Close assistant' }).click();
    const requestsBeforeContextOpen = requests.length;
    await page.evaluate(async ({ evidence, question }) => {
      const { openAssistant } = await import('/assets/assistant-ui.js');
      const from = document.querySelector('[data-assistant-open][data-assistant-locale="en"]');
      await openAssistant('en', from, {
        evidence,
        chartId: 'private-chart-id',
        suggestedQuestion: question,
      });
    }, { evidence: contextualEvidence, question: contextualQuestion });
    await dialog.waitFor({ state: 'visible' });
    const evidenceChip = page.locator('.zassistant__evidence-chip');
    const evidenceRemove = page.getByRole('button', { name: 'Remove chart evidence' });
    check(
      'contextual open makes no assistant request',
      requests.length === requestsBeforeContextOpen,
      `${requestsBeforeContextOpen} before / ${requests.length} after`,
    );
    check(
      'contextual open visibly discloses the exact evidence receipt',
      await evidenceChip.isVisible()
        && await evidenceChip.textContent()
          === 'Sent with your question; birth details stay private. Full placements send only while “Using my chart” is on: Saturn trine natal Moon · 0.8° orb · 2026-08-03Remove chart evidence',
      await evidenceChip.textContent() ?? '',
    );
    check('contextual question is only prefilled', await input.inputValue() === contextualQuestion);
    check('contextual evidence has a visible Remove control', await evidenceRemove.isVisible());

    await evidenceRemove.click();
    check(
      'Remove clears the unsent evidence and its generated prefill',
      await evidenceChip.isHidden() && await input.inputValue() === ''
        && requests.length === requestsBeforeContextOpen,
    );

    await page.evaluate(async ({ evidence, question }) => {
      const { openAssistant } = await import('/assets/assistant-ui.js');
      await openAssistant('en', null, {
        evidence,
        chartId: 'private-chart-id',
        suggestedQuestion: question,
      });
    }, { evidence: contextualEvidence, question: contextualQuestion });
    check('reopening contextual Ask still does not send', requests.length === requestsBeforeContextOpen);
    await input.press('Enter');
    await page.locator('.zassistant__message--assistant')
      .filter({ hasText: 'Read /learn/aspects/ next.' })
      .nth(3)
      .waitFor();
    const contextualRequest = requests[requestsBeforeContextOpen];
    const evidenceKeys = Object.keys(contextualRequest?.evidence ?? {}).sort();
    check(
      'Submit sends the exact closed six-field evidence receipt',
      JSON.stringify(contextualRequest?.evidence) === JSON.stringify(contextualEvidence)
        && JSON.stringify(evidenceKeys) === JSON.stringify([
          'aspect',
          'date',
          'kind',
          'natalPoint',
          'orb',
          'transitingBody',
        ]),
      JSON.stringify(contextualRequest),
    );
    check(
      'chartId and full chart context never enter the contextual request',
      !('chartId' in (contextualRequest ?? {}))
        && !('chart' in (contextualRequest ?? {}))
        && !JSON.stringify(contextualRequest).includes('private-chart-id'),
      JSON.stringify(contextualRequest),
    );
    check('successful answer clears contextual evidence', await evidenceChip.isHidden());

    const chartHandoff = page.locator('.zassistant__chart-link').last();
    const chartHandoffHref = await chartHandoff.getAttribute('href');
    const chartHandoffUrl = new URL(chartHandoffHref ?? '', baseURL);
    const fragmentParams = new URLSearchParams(chartHandoffUrl.hash.slice(1));
    check(
      'chart handoff keeps c and sel exclusively in the URL fragment',
      chartHandoffUrl.pathname === '/birth-chart/'
        && chartHandoffUrl.search === ''
        && [...fragmentParams.keys()].sort().join(',') === 'c,sel'
        && Boolean(fragmentParams.get('c'))
        && fragmentParams.get('sel') === 'body:Moon'
        && !chartHandoffHref?.includes('private-chart-id'),
      chartHandoffHref ?? '',
    );

    await input.fill('[limit]');
    await input.press('Enter');
    await page.locator('.zassistant__status').filter({
      hasText: "That's everything for today — the assistant caps out at 30 messages a day.",
    }).waitFor();
    check('429 renders approved friendly copy', true);

    await input.fill('[disabled]');
    await input.press('Enter');
    await page.locator('.zassistant__status').filter({ hasText: 'not available on this site' }).waitFor();
    check('disabled state is distinct', true);

    await input.fill('[unavailable]');
    await input.press('Enter');
    await page.locator('.zassistant__status').filter({ hasText: 'unavailable right now' }).waitFor();
    check('unavailable state is friendly', true);

    await input.fill('[stop]');
    await input.press('Enter');
    const stop = page.getByRole('button', { name: 'Stop' });
    await stop.waitFor({ state: 'visible' });
    await stop.click();
    await page.locator('.zassistant__status').filter({ hasText: 'Stopped.' }).waitFor();
    check('Stop aborts the active request', true);

    if (OUT) await dialog.screenshot({ path: `${OUT}/assistant-mobile-states.png` });

    await page.keyboard.press('Escape');
    check('Escape closes and restores the opener', !(await page.locator('.zassistant').isVisible())
      && await opener.evaluate((element) => document.activeElement === element));
    await opener.click();
    await page.locator('.zassistant').click({ position: { x: 4, y: 4 } });
    check('backdrop closes the dialog', !(await page.locator('.zassistant').isVisible()));

    const analytics = await page.evaluate(() => window.__assistantAnalytics);
    check(
      'assistant analytics use approved no-prop events only',
      analytics.every((args) => args.length === 1 && ['assistant_open', 'assistant_reply'].includes(args[0]))
        && analytics.some(([name]) => name === 'assistant_open')
        && analytics.some(([name]) => name === 'assistant_reply'),
      JSON.stringify(analytics),
    );

    await page.goto(`${baseURL}/es/tools/`, { waitUntil: 'networkidle' });
    await page.locator('[data-assistant-open][data-assistant-locale="es"]').first().click();
    await page.locator('.zassistant__panel').waitFor({ state: 'visible' });
    check('ES module-local strings render', await page.locator('.zassistant__title').textContent() === 'Pregúntale a Zodiacs'
      && await page.locator('.zassistant__chart-chip').textContent() === 'Usar mi carta');
    check(
      'ES privacy line is faithful',
      await page.locator('.zassistant__privacy').textContent()
        === 'El asistente puede equivocarse. Las respuestas son generadas; aquí la astrología es simbólica, no determinista. Nosotros no guardamos las conversaciones.',
    );
    await page.getByRole('button', { name: 'Cerrar asistente' }).click();

    for (const wingPath of ['/registry/', '/thesis/']) {
      await page.goto(`${baseURL}${wingPath}`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Ask Zodiacs' }).click();
      await page.locator('.zassistant__panel').waitFor({ state: 'visible' });
      const wingClose = page.getByRole('button', { name: 'Close assistant' });
      const box = await wingClose.boundingBox();
      const winsHitTest = box ? await page.evaluate(({ x, y }) => {
        return document.elementFromPoint(x, y)?.closest('.zassistant__close') !== null;
      }, { x: box.x + box.width / 2, y: box.y + box.height / 2 }) : false;
      check(`${wingPath} assistant paints and hits above wing navigation`, winsHitTest, JSON.stringify(box));
      await wingClose.click();
    }

    await context.close();
  } finally {
    await browser.close();
  }
});

let failed = 0;
for (const result of results) {
  if (!result.ok) failed += 1;
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` · ${result.detail}` : ''}`);
}
console.log(failed ? `\n${failed} FAILURE${failed === 1 ? '' : 'S'}` : `\nALL ${results.length} CHECKS PASS`);
process.exit(failed ? 1 : 0);
