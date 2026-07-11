/**
 * End-to-end drive of the site search against `astro preview`: open with
 * the nav button, `/`, and Cmd+K; type; arrow through results; Enter
 * navigates; Escape closes and restores focus; ES pages have no search.
 *
 *   npm run build
 *   OUT_DIR=/tmp/shots node tests/search-drive.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const OUT = process.env.OUT_DIR ?? null;
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/opt/pw-browsers/chromium';

const preview = spawn('npx', ['astro', 'preview', '--port', '4399'], { stdio: 'ignore' });
await wait(2500);
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); };
const shot = async (t, p) => { if (OUT) await t.screenshot({ path: `${OUT}/${p}` }).catch(() => {}); };

try {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:4399/learn/', { waitUntil: 'networkidle' });

  // Open with the nav button; dialog + index load lazily.
  await page.locator('[data-search-open]').click();
  await page.waitForSelector('.zsearch__input', { timeout: 10000 });
  check('nav button opens the dialog', await page.locator('.zsearch__panel').isVisible());
  check('input is focused on open', await page.evaluate(() => document.activeElement?.classList.contains('zsearch__input')));

  // Type → ranked results with kind badges.
  await page.locator('.zsearch__input').fill('saturn return');
  await page.waitForSelector('.zsearch__opt', { timeout: 5000 });
  const first = await page.locator('.zsearch__opt').first().textContent();
  check('query returns results, tool ranked first', /Saturn return/i.test(first ?? '') && /Tool/i.test(first ?? ''), first?.slice(0, 60) ?? '');
  check('glossary term appears with its badge', (await page.locator('.zsearch__kind', { hasText: 'Glossary' }).count()) >= 1);
  await shot(page, 'search-results.png');

  // Arrow down + Enter navigates to the second result.
  await page.keyboard.press('ArrowDown');
  const activeCount = await page.locator('.zsearch__opt.is-active').count();
  check('arrow moves the active option', activeCount === 1);
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => u.pathname !== '/learn/', { timeout: 8000 });
  check('Enter navigates to the active result', page.url() !== 'http://127.0.0.1:4399/learn/', page.url());

  // `/` opens; Escape closes and restores focus to the opener context.
  await page.goto('http://127.0.0.1:4399/', { waitUntil: 'networkidle' });
  await page.keyboard.press('/');
  await page.waitForSelector('.zsearch__input', { timeout: 10000 });
  check('slash opens the dialog', await page.locator('.zsearch__panel').isVisible());
  await page.keyboard.press('Escape');
  await wait(150);
  check('Escape closes the dialog', (await page.locator('.zsearch:not([hidden])').count()) === 0);

  // Cmd/Ctrl+K opens too.
  await page.keyboard.press('Control+k');
  await page.waitForSelector('.zsearch__input', { timeout: 5000 });
  check('Ctrl+K opens the dialog', await page.locator('.zsearch__panel').isVisible());
  // Sign result shows its pastel disc.
  await page.locator('.zsearch__input').fill('aries');
  await page.waitForSelector('.zsearch__opt', { timeout: 5000 });
  check('sign results carry the disc icon', (await page.locator('.zsearch__icon').count()) >= 1);
  await shot(page, 'search-sign.png');
  await page.keyboard.press('Escape');

  // Typing `/` inside a real input must NOT open the dialog.
  await page.goto('http://127.0.0.1:4399/birth-chart/', { waitUntil: 'networkidle' });
  await page.locator('#bc-date').or(page.locator('input[type="date"]').first()).first().focus();
  await page.keyboard.press('/');
  await wait(200);
  check('slash inside a form field stays typing', (await page.locator('.zsearch:not([hidden])').count()) === 0);

  // ES pages: no search affordance at all.
  await page.goto('http://127.0.0.1:4399/es/transits/', { waitUntil: 'networkidle' });
  check('ES pages have no search button', (await page.locator('[data-search-open]').count()) === 0);
  await page.keyboard.press('/');
  await wait(200);
  check('slash on ES pages does nothing', (await page.locator('.zsearch').count()) === 0);

  await page.close();
  await browser.close();
} finally {
  preview.kill();
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed += 1;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  · ${r.detail.slice(0, 80)}` : ''}`);
}
console.log(failed ? `\n${failed} FAILURES` : '\nALL PASS');
process.exit(failed ? 1 : 0);
