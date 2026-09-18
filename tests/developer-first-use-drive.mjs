/**
 * The three developer first-use paths, driven at two viewports in both browsers
 * this machine has.
 *
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=… npm run test:firstuse:browser
 *
 * These assertions exist because an inventory found each of them wrong: the hub
 * had no card for connecting an assistant and none for the comparison tool; the
 * MCP page put its prerequisites after the commands they are prerequisites for;
 * the comparison tool led with the preset whose entire result is that there is
 * no result; and the widgets page said birth details never leave the browser
 * without saying that loading the widget is itself a request to zodiacs.org.
 *
 * Every chart here is synthetic. Firefox is driven as well as Chromium because
 * the layout and focus assertions are the kind that differ between engines.
 */
import { chromium, firefox } from 'playwright-core';
import { withPreview } from './visual/preview-server.mjs';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';

const results = [];
const check = (n, ok, d) => { results.push({ n, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok || d === undefined ? '' : ` · ${JSON.stringify(d)}`}`); };
const CHROMIUM = await findChromium();

await withPreview({ port: Number(process.env.FIRST_USE_DRIVE_PORT ?? 4461) }, async (BASE) => {
  for (const [engineName, launch] of [
    ['chromium', () => chromium.launch({ executablePath: CHROMIUM, args: STABLE_CHROMIUM_ARGS })],
    ['firefox', () => firefox.launch({ executablePath: '/opt/pw-browsers/firefox-1532/firefox/firefox' })],
  ]) {
    let browser;
    try { browser = await launch(); } catch (e) { check(`${engineName}: launches`, false, e.message); continue; }
    for (const vp of [{ n: 'desktop', width: 1280, height: 900 }, { n: 'mobile', width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      const errs = []; const offOrigin = [];
      page.on('pageerror', (e) => errs.push(e.message));
      page.on('request', (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) offOrigin.push(r.url()); });
      const tag = `${engineName}/${vp.n}`;

      await page.goto(`${BASE}/developers/`, { waitUntil: 'networkidle' });
      const cards = await page.locator('.dev-paths > li h2 a').evaluateAll((a) => a.map((x) => ({ text: x.textContent.trim(), href: x.getAttribute('href') })));
      check(`${tag}: hub leads with the three jobs, then compare`,
        JSON.stringify(cards.map((c) => c.href)) === JSON.stringify(['/developers/examples/', '/widgets/', '/developers/mcp/', '/developers/compare/']), cards);
      check(`${tag}: no horizontal overflow on the hub`,
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      check(`${tag}: hub renders without page errors`, errs.length === 0, errs);

      await page.goto(`${BASE}/developers/mcp/`, { waitUntil: 'networkidle' });
      const order = await page.evaluate(() => {
        const t = document.body.innerText;
        return { prereq: t.indexOf('You need Node'), block: t.indexOf('set -eu'), privacy: t.indexOf('The calculation is local') };
      });
      check(`${tag}: prerequisites come before the command block`, order.prereq > -1 && order.prereq < order.block, order);
      check(`${tag}: the privacy distinction comes before both`, order.privacy > -1 && order.privacy < order.prereq, order);
      const body = await page.evaluate(() => document.body.innerText);
      check(`${tag}: the block compares the digest, and shows no bare shasum`,
        body.includes('createHash') && !/shasum\s+-a\s+256/.test(body));
      check(`${tag}: a synthetic request and its expected result are shown`,
        body.includes('1988-03-21T06:45:00Z') && body.includes('274.046910'));
      check(`${tag}: the accepted record format is named`, body.includes('zodiacs.natal-envelope.draft-v1'));
      check(`${tag}: the input range is not offered as a validated accuracy range`,
        body.includes('1800 to 2199') && /accepted input range/.test(body));

      await page.goto(`${BASE}/developers/compare/`, { waitUntil: 'networkidle' });
      const presets = await page.locator('[data-compare-preset]').evaluateAll((n) => n.map((x) => x.getAttribute('data-compare-preset')));
      check(`${tag}: the first preset demonstrates a cause`, presets[0] === 'house-system', presets);
      const cmp = await page.evaluate(() => document.body.innerText);
      check(`${tag}: the page says where records come from`, cmp.includes('zodiacs.natal-envelope.draft-v1'));
      check(`${tag}: it does not promise another program's export`, !/Two programs can calculate/.test(cmp));

      await page.goto(`${BASE}/widgets/`, { waitUntil: 'networkidle' });
      const w = await page.evaluate(() => document.body.innerText);
      check(`${tag}: widgets separate asset loading from birth details`,
        w.includes('never sent anywhere') && w.includes('request to zodiacs.org'));

      await page.keyboard.press('Tab');
      check(`${tag}: keyboard focus enters the page visibly`, await page.locator(':focus-visible').count() === 1);
      check(`${tag}: nothing left the origin`, offOrigin.length === 0, offOrigin.slice(0, 3));
      await page.close();
    }
    await browser.close();
  }
});
const bad = results.filter((r) => !r.ok);
console.log(bad.length ? `\n${bad.length} FAILURES` : `\nALL PASS (${results.length} checks)`);
process.exit(bad.length ? 1 : 0);
