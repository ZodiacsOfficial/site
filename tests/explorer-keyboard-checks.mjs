/** DOM and keyboard checks only; these do not claim screen-reader verification. */
import { mkdir } from 'node:fs/promises';

async function chooseWithKeys(page, id) {
  const picker = page.locator('[data-explorer-entity-picker]');
  const index = await picker.locator('option').evaluateAll((options, id) => options.findIndex((option) => option.value === id), id);
  if (index < 0) throw new Error(`Missing native chart option: ${id}`);
  await picker.focus();
  await picker.press('Home');
  for (let step = 0; step < index; step += 1) await picker.press('ArrowDown');
  await picker.press('Enter');
  await page.waitForFunction((id) => document.querySelector('[data-explorer-entity-picker]')?.value === id
    && new URLSearchParams(location.search).get('sel') === (id || null), id);
}

export async function runExplorerKeyboardChecks({ browser, baseURL, check, outDir, knownFragment, unknownFragment }) {
  if (outDir) await mkdir(outDir, { recursive: true });
  for (const locale of ['en', 'es', 'pt', 'fr', 'it', 'ru']) {
    const width = locale === 'en' ? 1440 : 390;
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const prefix = locale === 'en' ? '' : `/${locale}`;
      await page.goto(`${baseURL}${prefix}/birth-chart/${knownFragment}`, { waitUntil: 'domcontentloaded' });
      const picker = page.locator('[data-explorer-entity-picker]');
      await picker.waitFor({ state: 'visible', timeout: 30000 });
      const values = await picker.locator('option').evaluateAll((options) => options.map((option) => option.value));
      const semantic = await picker.evaluate((node) => ({
        label: [...node.labels].map((label) => label.textContent.trim()).join(' '),
        tag: node.tagName, disabled: node.disabled,
      }));
      check(`keyboard ${locale}: named native selector exposes every sign, house, body and angle`,
        semantic.tag === 'SELECT' && !semantic.disabled && semantic.label.length > 0
        && values.filter((id) => id.startsWith('sign:')).length === 12
        && values.filter((id) => id.startsWith('house:')).length === 12
        && ['asc', 'mc', 'dsc', 'ic'].every((angle) => values.includes(`angle:${angle}`))
        && ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'North Node']
          .every((body) => values.includes(`body:${body}`)), semantic.label);

      for (const id of ['sign:aries', 'house:12', 'angle:asc', 'body:Moon']) {
        await chooseWithKeys(page, id);
        const state = await page.evaluate(() => ({
          focused: document.activeElement?.hasAttribute('data-explorer-entity-picker'),
          title: document.querySelector('[data-inspector-heading]')?.textContent?.trim(),
          announced: document.querySelector('.calc__wheel .sr-only[role="status"]')?.textContent?.trim(),
          ring: getComputedStyle(document.querySelector('[data-explorer-entity-picker]')).outlineStyle,
        }));
        check(`keyboard ${locale}: ${id} updates the inspector, URL and live region while retaining focus`,
          state.focused && Boolean(state.title) && Boolean(state.announced) && state.ring !== 'none', JSON.stringify(state));
      }
      if (outDir) {
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        await page.locator('.calc__wheel').screenshot({ path: `${outDir}/entity-picker-${locale}-${width}.png`, animations: 'disabled' });
      }
      await chooseWithKeys(page, '');
      check(`keyboard ${locale}: the native empty option clears selection without losing focus`,
        await picker.evaluate((node) => document.activeElement === node && node.value === ''));

      // Chart handoffs are consumed on mount; a hash-only navigation would
      // leave the previous result mounted instead of opening this fixture.
      await page.goto('about:blank');
      await page.goto(`${baseURL}${prefix}/birth-chart/${unknownFragment}`, { waitUntil: 'domcontentloaded' });
      await picker.waitFor({ state: 'visible', timeout: 30000 });
      const unknownValues = await picker.locator('option').evaluateAll((options) => options.map((option) => option.value));
      check(`keyboard ${locale}: unknown-time controls retain all signs and omit unavailable houses/angles`,
        unknownValues.filter((id) => id.startsWith('sign:')).length === 12
        && !unknownValues.some((id) => id.startsWith('house:') || id.startsWith('angle:')));
      await chooseWithKeys(page, 'sign:pisces');
      check(`keyboard ${locale}: unknown-time sign selection remains available`, true);
    } finally {
      await context.close();
    }
  }

  const failureContext = await browser.newContext({ viewport: { width: 390, height: 1000 } });
  try {
    let blockedRequests = 0;
    await failureContext.route(/\/_astro\/ChartActionDock\.[^/]+\.js$/, async (route) => {
      blockedRequests += 1;
      await route.abort('failed');
    });
    const page = await failureContext.newPage();
    await page.goto(`${baseURL}/birth-chart/`, { waitUntil: 'networkidle' });
    check('keyboard controls: result module is not fetched while the form is idle', blockedRequests === 0);
    await page.goto('about:blank');
    await page.goto(`${baseURL}/birth-chart/${knownFragment}`, { waitUntil: 'domcontentloaded' });
    await page.locator('.calc__result').waitFor({ state: 'visible', timeout: 30000 });
    const retry = page.locator('[data-chart-controls-retry]');
    await retry.waitFor({ state: 'visible' });
    check('keyboard controls: failed module leaves the valid chart visible with explicit recovery',
      blockedRequests > 0 && await page.locator('.wheel--interactive').isVisible()
      && await page.locator('[data-chart-controls-state="error"]').getByRole('alert').isVisible()
      && await page.locator('.calc__form .calc__error').count() === 0);
    if (outDir) await page.locator('.calc__wheel').screenshot({ path: `${outDir}/entity-picker-recovery-390.png`, animations: 'disabled' });
    await failureContext.unroute(/\/_astro\/ChartActionDock\.[^/]+\.js$/);
    await retry.focus();
    await page.keyboard.press('Enter');
    // Let Preact commit the retry's pending state before accepting its outcome.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForFunction(() => document.querySelector('[data-explorer-entity-picker]')
      || document.querySelector('[data-chart-controls-state="error"]'));
    check('keyboard controls: retry never clears a successfully computed result', await page.locator('.calc__result').isVisible());
    if (await page.locator('[data-explorer-entity-picker]').count()) {
      await page.waitForFunction(() => document.activeElement?.hasAttribute('data-explorer-entity-picker'));
    } else {
      // Chromium can retain a rejected native import despite the application
      // promise being evicted. The fallback must offer an explicit reload,
      // explain its effect, and leave that choice with the reader.
      check('keyboard controls: a retained native failure offers honest explicit reload',
        await page.getByRole('button', { name: 'Reload page', exact: true }).isVisible()
        && (await page.locator('[data-chart-controls-state="error"]').textContent()).includes('Reloading clears unsaved entries.'));
      await page.waitForFunction(() => document.activeElement?.hasAttribute('data-chart-controls-retry'));
      const reload = page.getByRole('button', { name: 'Reload page', exact: true });
      await reload.focus();
      await Promise.all([page.waitForEvent('load'), reload.press('Enter')]);
      await page.waitForLoadState('networkidle');
      // The consumed handoff was removed from the URL for privacy. Reload
      // clears this unsaved chart, as warned; the reader must enter it again.
      check('keyboard controls: explicit reload clears the unsaved chart as warned',
        await page.locator('#birth-date').inputValue() === ''
        && await page.locator('.calc__result').count() === 0);
      await page.goto('about:blank');
      await page.goto(`${baseURL}/birth-chart/${knownFragment}`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-explorer-entity-picker]').waitFor({ state: 'visible', timeout: 30000 });
    }
    await chooseWithKeys(page, 'house:12');
    check('keyboard controls: keyboard recovery restores native selection and the chart', await page.locator('.calc__result').isVisible());
  } finally {
    await failureContext.close();
  }
}
