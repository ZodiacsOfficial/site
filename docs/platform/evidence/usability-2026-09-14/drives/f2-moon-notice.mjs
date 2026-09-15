// Finding 2: Homepage FAQ / birth-chart FAQ wording vs the actual unknown-time Moon notice.
import { withSite, freshContext, shot, saveJson, text, computeChart } from './harness.mjs';

const UNVERIFIED = 'The Moon’s possible signs across this birth date are unverified. Add a birth time for a result at that moment.';
const AMBIGUOUS = 'The Moon also changed signs that day — reading both neighbors is fair until you find the time.';

await withSite(4502, async ({ BASE, browser }) => {
  const evidence = { faq: {}, runs: [], errors: [] };

  // Homepage FAQ
  {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      const item = page.locator('.faq__item', { hasText: 'tells you if the Moon may have changed signs that day' }).first();
      const q = await text(item.locator('summary'));
      const a = await text(item.locator('p'));
      await item.locator('summary').click();
      await item.scrollIntoViewIfNeeded();
      evidence.faq.home = { question: q, answer: a, screenshot: await shot(page, 'f2-home-faq', { full: false }) };
    } catch (error) { evidence.errors.push({ where: 'home-faq', message: String(error?.stack || error) }); }
    await ctx.close();
  }

  // Birth-chart page FAQ
  {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/birth-chart/`, { waitUntil: 'networkidle' });
      const item = page.locator('.faq__item', { hasText: 'flags the uncertainty' }).first();
      const q = await text(item.locator('summary'));
      const a = await text(item.locator('p'));
      await item.locator('summary').click();
      await item.scrollIntoViewIfNeeded();
      evidence.faq.birthChart = { question: q, answer: a, screenshot: await shot(page, 'f2-birth-chart-faq', { full: false }) };
    } catch (error) { evidence.errors.push({ where: 'bc-faq', message: String(error?.stack || error) }); }
    await ctx.close();
  }

  // Unknown-time charts for consecutive synthetic dates (the Moon changes sign every ~2.5 days,
  // so one of these should hit an ambiguous day).
  for (const date of ['2000-01-01', '2000-01-02', '2000-01-03']) {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/birth-chart/`, { waitUntil: 'networkidle' });
      await computeChart(page, { date, timeUnknown: true, place: 'London' });
      const notices = await page.locator('.calc__result .notice, .calc__form ~ * .notice, [role=status].notice').evaluateAll((els) => els.map((el) => el.textContent.replace(/\s+/g, ' ').trim()));
      const allNotices = await page.locator('.notice').evaluateAll((els) => els.map((el) => ({ role: el.getAttribute('role'), text: el.textContent.replace(/\s+/g, ' ').trim() })));
      const body = await page.evaluate(() => document.body.innerText);
      const moonCard = await text(page.locator('.calc__three .three-card', { hasText: 'Moon' }).first());
      const moonUncertain = await page.locator('[data-moon-uncertain]').count();
      const approach = await text(page.locator('[data-approach-read]'));
      evidence.runs.push({
        date,
        notices: allNotices,
        moonCardText: moonCard,
        moonUncertainCards: moonUncertain,
        containsUnverifiedNotice: body.includes(UNVERIFIED),
        containsAmbiguousNotice: body.includes(AMBIGUOUS),
        containsPhrase_changedSigns: body.includes('changed signs'),
        containsPhrase_mayHaveChanged: body.includes('may have changed'),
        containsPhrase_flags: /flags the uncertainty/i.test(body),
        approachReadExcerpt: approach ? approach.slice(0, 400) : null,
        screenshot: await shot(page, `f2-unknown-time-${date}`),
        blocked: ctx.blocked.length,
      });
    } catch (error) {
      evidence.errors.push({ where: date, message: String(error?.stack || error) });
      await shot(page, `f2-error-${date}`).catch(() => {});
    }
    await ctx.close();
  }
  await saveJson('f2-evidence', evidence);
  console.log(JSON.stringify(evidence, null, 2));
});
