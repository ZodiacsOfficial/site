/** Local-day uncertainty checks in the existing Explorer browser drive. */
import { mkdir } from 'node:fs/promises';

const TIMEOUT = 30_000;
const CANDIDATES = 'Aquarius / Pisces';
const boundaryFragment = `#c=1.${Buffer.from(JSON.stringify({
  d: '1990-01-01', z: 'Europe/London', la: 51.5074, lo: -0.1278, p: 'London',
})).toString('base64url')}`;

async function waitForResult(page) {
  await page.locator('.reading-path').waitFor({ state: 'visible', timeout: TIMEOUT });
  await page.waitForFunction(() => document.querySelector('.calc__form')?.getAttribute('aria-busy') === 'false', null, { timeout: TIMEOUT });
}

async function recompute(page, date, known) {
  await page.locator('#birth-date').fill(date);
  await page.locator('.field__toggle input[type="checkbox"]').setChecked(!known);
  if (known) await page.locator('#birth-time').fill('12:00');
  await page.locator('.calc__form button[type="submit"]').click();
  await waitForResult(page);
}

export async function runExplorerMoonChecks({ browser, baseURL, check, outDir }) {
  if (outDir) await mkdir(outDir, { recursive: true });
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      globalThis.__moonPositionsLink = null;
      Object.defineProperty(Navigator.prototype, 'clipboard', {
        configurable: true,
        get: () => ({ writeText: async (value) => { globalThis.__moonPositionsLink = value; } }),
      });
    });
    try {
      const page = await context.newPage();
      await page.goto(`${baseURL}/birth-chart/${boundaryFragment}`, { waitUntil: 'domcontentloaded' });
      await waitForResult(page);
      const hero = page.locator('.calc__three [data-moon-uncertain]');
      const heroText = await hero.innerText();
      const readingMoon = page.locator('.reading-path__big-three [data-moon-uncertain]');
      const links = await page.locator('.reading-path__placement-link').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')).sort());
      check(`Moon ${width}: London boundary keeps both candidates in hero, story and links`,
        heroText.includes(CANDIDATES) && heroText.includes('Needs a birth time')
        && (await readingMoon.innerText()).includes(CANDIDATES)
        && JSON.stringify(links) === JSON.stringify(['/learn/placements/moon-in-aquarius/', '/learn/placements/moon-in-pisces/'])
        && await hero.locator('.three-card__deg').count() === 0, heroText);
      check(`Moon ${width}: uncertain body is excluded from definitive balance and aspect readings`,
        (await page.locator('.reading-path').innerText()).includes('The Moon is left out of these totals')
        && (await page.locator('.reading-path').innerText()).includes('Moon aspects need a birth time'));

      if (outDir) {
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        await page.locator('.calc__three').screenshot({ path: `${outDir}/moon-boundary-hero-${width}.png`, animations: 'disabled' });
        await page.locator('.reading-path__big-three').screenshot({ path: `${outDir}/moon-boundary-story-${width}.png`, animations: 'disabled' });
      }

      await page.locator('.reading-path__show[aria-label="Show on chart: Moon at the reference time"]').first().click();
      await page.waitForFunction(() => document.querySelector('.insp__body [data-moon-uncertain]')?.textContent?.includes('Aquarius / Pisces'), null, { timeout: TIMEOUT });
      const inspectorText = await page.locator('.insp__body').innerText();
      const announcement = await page.locator('.calc__wheel .sr-only[role="status"]').innerText();
      check(`Moon ${width}: selecting reference Moon preserves uncertainty in inspector and announcement`,
        inspectorText.includes(CANDIDATES) && !inspectorText.includes('How the sign shapes it')
        && announcement.includes(CANDIDATES) && announcement.includes('Needs a birth time'), announcement);

      await page.locator('[data-explorer-entity-picker]').selectOption('');
      await page.locator('[data-first-reading-start]').click();
      await page.locator('[data-tour-card]').waitFor({ state: 'visible', timeout: TIMEOUT });
      check(`Moon ${width}: quick tour retains both possible identities`,
        (await page.locator('[data-tour-card]').innerText()).includes(CANDIDATES));
      await page.locator('[data-tour-exit]').click();
      await page.locator('[data-first-reading-dismiss]').click();
      await page.locator('[data-tour-start]').click();
      await page.locator('[data-tour-card]').waitFor({ state: 'visible', timeout: TIMEOUT });
      const bigThreeIndex = await page.locator('[data-tour-dot]').evaluateAll((nodes) => nodes.findIndex((node) => /big three/i.test(node.getAttribute('aria-label') ?? '')));
      if (bigThreeIndex < 0) throw new Error('Full tour is missing the Big Three chapter');
      await page.locator('[data-tour-dot]').nth(bigThreeIndex).click();
      await page.locator('[data-tour-next]').click();
      await page.waitForFunction(() => document.querySelector('.tour__sub-receipt')?.textContent?.trim().startsWith('Moon'), null, { timeout: TIMEOUT });
      const tourReceipt = await page.locator('.tour__sub-receipt').innerText();
      check(`Moon ${width}: full tour Moon receipt retains candidates without a reference degree`,
        tourReceipt.includes(CANDIDATES) && tourReceipt.includes('Needs a birth time') && !tourReceipt.includes('°'), tourReceipt);
      await page.locator('[data-tour-exit]').click();

      await page.locator('[data-chart-more] > summary').click();
      await page.locator('[data-share-options]').click();
      await page.locator('[data-share-dialog]').waitFor({ state: 'visible', timeout: TIMEOUT });
      await page.locator('[data-share-dialog] [data-positions-link]').click();
      await page.waitForFunction(() => typeof globalThis.__moonPositionsLink === 'string', null, { timeout: TIMEOUT });
      const positionsUrl = await page.evaluate(() => globalThis.__moonPositionsLink);
      const token = new URLSearchParams(new URL(positionsUrl).hash.slice(1)).get('p');
      if (!token?.startsWith('2.')) throw new Error('Expected the existing v2 positions contract');
      const wire = JSON.parse(Buffer.from(token.slice(2), 'base64url').toString('utf8'));
      check(`Moon ${width}: positions link omits time precision and candidate metadata`,
        JSON.stringify(Object.keys(wire).sort()) === JSON.stringify(['b', 'h', 'v']) && wire.b.length === 12);
      const receiver = await context.newPage();
      await receiver.goto(positionsUrl, { waitUntil: 'domcontentloaded' });
      const received = receiver.locator('[data-positions-only]');
      await received.waitFor({ state: 'visible', timeout: TIMEOUT });
      const receivedText = await received.innerText();
      const moonRow = received.locator('tbody tr').filter({ has: receiver.locator('td:first-child', { hasText: /^Moon$/ }) });
      check(`Moon ${width}: positions receiver keeps Moon unresolved without inventing a boundary`,
        (await received.locator('[data-moon-uncertain]').innerText()).includes('Needs a birth time')
        && (await moonRow.locator('td').nth(2).innerText()) === 'Needs a birth time'
        && !receivedText.includes(CANDIDATES) && !receivedText.includes('The Moon also changed signs that day')
        && await receiver.locator('#birth-time').inputValue() === '');
      await receiver.close();

      if (width === 1440) {
        await page.locator('[data-share-dialog]').press('Escape');
        await recompute(page, '1990-01-01', true);
        const knownMoon = await page.locator('.calc__three .three-card').nth(1).innerText();
        check('Moon: recalculating with a known noon time clears the boundary state',
          knownMoon.includes('Pisces') && !knownMoon.includes('Aquarius')
          && await page.locator('.calc__three [data-moon-uncertain]').count() === 0
          && await page.locator('[data-explorer-entity-picker] option[value="angle:asc"]').count() === 1, knownMoon);
        await recompute(page, '1990-01-02', false);
        const stableMoon = await page.locator('.calc__three .three-card').nth(1).innerText();
        check('Moon: a stable unknown-time date keeps Pisces while omitting unavailable angles',
          stableMoon.includes('Pisces') && !stableMoon.includes('Aquarius')
          && await page.locator('.calc__three [data-moon-uncertain]').count() === 0
          && await page.locator('[data-explorer-entity-picker] option[value="angle:asc"]').count() === 0, stableMoon);
      }
    } finally {
      await context.close();
    }
  }
}
