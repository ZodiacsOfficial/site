// Supplementary V7b: after selecting a place with ArrowDown+Enter, record the next
// two Tab stops and one Shift+Tab, appending to verification.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { withSite, freshContext, shot, waitForCalculator, OUT } from './harness.mjs';

const OUT_JSON = `${OUT}/verification.json`;
const results = JSON.parse(readFileSync(OUT_JSON, 'utf8')).filter((e) => e.id !== 'V7b');

await withSite(4602, async ({ BASE, browser }) => {
  const ctx = await freshContext(browser); const page = await ctx.newPage();
  const describe = () => page.evaluate(() => { const el = document.activeElement; return el ? { tag: el.tagName.toLowerCase(), id: el.id || null, className: (el.getAttribute('class') || '').slice(0, 60), ariaLabel: el.getAttribute('aria-label'), readOnly: el.readOnly ?? null } : null; });
  try {
    await page.goto(`${BASE}/birth-chart/`, { waitUntil: 'networkidle' });
    await waitForCalculator(page);
    await page.focus('#place');
    await page.keyboard.type('Lond');
    await page.waitForSelector('#place-list [role=option]:not([aria-disabled="true"])', { timeout: 30_000 });
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.place--selected #place', { timeout: 10_000 });
    await page.waitForTimeout(300);
    const afterEnter = await describe();
    await page.keyboard.press('Tab'); const tab1 = await describe();
    await page.keyboard.press('Tab'); const tab2 = await describe();
    await page.keyboard.press('Shift+Tab'); const shiftTab = await describe();
    await page.keyboard.press('Shift+Tab'); const shiftTab2 = await describe();
    const chipDom = await page.evaluate(() => document.querySelector('.place--selected')?.outerHTML.replace(/\s+/g, ' ').slice(0, 400));
    const s1 = await shot(page, 'v7b-tab-stops', { full: false });
    const passed = afterEnter?.id === 'place' && /place__chip-value/.test(afterEnter?.className || '') && tab2?.tag === 'select' && tab2?.id === 'house-system';
    results.push({ id: 'V7b', passed, observed: { activeAfterEnter: afterEnter, tab1, tab2, shiftTabFromTab2: shiftTab, shiftTabAgain: shiftTab2, chipDom }, screenshot: [s1] });
  } catch (error) {
    results.push({ id: 'V7b', passed: false, observed: { error: String(error?.stack || error).slice(0, 800) }, screenshot: null });
  }
  await ctx.close();
});
writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.find((e) => e.id === 'V7b'), null, 2));
