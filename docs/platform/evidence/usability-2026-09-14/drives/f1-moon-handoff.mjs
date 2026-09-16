// Finding 1: Moon lookup -> birth chart handoff.
// /moon-phase/ mounts MoonPhaseTool (link "Get the birth chart for this date");
// /moon-sign/ mounts ChartCalculator mode="moon" (its own birth-chart link). Drive both.
import { withSite, freshContext, shot, saveJson, text, pickPlace, waitForCalculator } from './harness.mjs';

async function inspectBirthChartLanding(page) {
  await page.waitForURL(/\/birth-chart\//, { timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#birth-date');
  await page.waitForTimeout(2500); // let the client:idle island hydrate (it may prefill from a handoff)
  return page.evaluate(() => ({
    landedUrl: location.href,
    date: document.querySelector('#birth-date')?.value ?? null,
    time: document.querySelector('#birth-time')?.value ?? null,
    timeDisabled: document.querySelector('#birth-time')?.disabled ?? null,
    unknownTimeChecked: document.querySelector('form.calc__form .field__toggle input[type=checkbox]')?.checked ?? null,
    place: document.querySelector('#place')?.value ?? null,
    placeSelected: !!document.querySelector('.place--selected'),
    search: location.search,
    hash: location.hash,
    sessionStorageKeys: Object.keys(sessionStorage),
    localStorageKeys: Object.keys(localStorage),
    noticeTexts: [...document.querySelectorAll('.notice')].map((n) => n.textContent.replace(/\s+/g, ' ').trim()),
  }));
}

await withSite(4501, async ({ BASE, browser }) => {
  const evidence = { moonPhase: {}, moonSign: {}, errors: [] };

  // A. /moon-phase/ (MoonPhaseTool) — desktop + mobile
  for (const mobile of [false, true]) {
    const tag = mobile ? 'mobile' : 'desktop';
    const ctx = await freshContext(browser, { mobile });
    const page = await ctx.newPage();
    try {
      const resp = await page.goto(`${BASE}/moon-phase/`, { waitUntil: 'networkidle' });
      await page.waitForSelector('#mp-date', { timeout: 30_000 });
      const h1 = await text(page.locator('h1'));
      await page.fill('#mp-date', '2000-01-01');
      const timeVal = await page.inputValue('#mp-time');
      const placeVal = await page.inputValue('#mp-place').catch(() => null);
      await page.click('button.calc__submit');
      await page.waitForSelector('.calc__result', { timeout: 60_000 });
      const caption = await text(page.locator('.calc__result .notice'));
      const phase = await text(page.locator('.calc__result .mp__phase'));
      const signline = await text(page.locator('.calc__result .mp__signline'));
      const link = page.locator('.calc__result .calc__actions a');
      const linkText = await text(link);
      const linkHref = await link.getAttribute('href');
      const shot1 = await shot(page, `f1-moon-phase-result-${tag}`);
      await link.click();
      const after = await inspectBirthChartLanding(page);
      const shot2 = await shot(page, `f1-moon-phase-to-birth-chart-${tag}`);
      evidence.moonPhase[tag] = {
        status: resp?.status(), h1,
        moonForm: { dateEntered: '2000-01-01', timeFieldValue: timeVal, placeFieldValue: placeVal },
        moonResult: { phase, signline, caption },
        link: { text: linkText, href: linkHref },
        birthChartAfterClick: after,
        screenshots: [shot1, shot2],
        blockedRequests: ctx.blocked,
      };
    } catch (error) {
      evidence.errors.push({ where: `moon-phase-${tag}`, message: String(error?.stack || error) });
      await shot(page, `f1-error-moon-phase-${tag}`).catch(() => {});
    } finally { await ctx.close(); }
  }

  // B. /moon-sign/ (ChartCalculator mode="moon") — desktop only
  {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    try {
      const resp = await page.goto(`${BASE}/moon-sign/`, { waitUntil: 'networkidle' });
      await waitForCalculator(page);
      const h1 = await text(page.locator('h1'));
      const fieldIds = await page.evaluate(() => [...document.querySelectorAll('form.calc__form input, form.calc__form select, form.calc__form button')].map((el) => ({ tag: el.tagName.toLowerCase(), id: el.id || null, type: el.getAttribute('type'), text: el.tagName === 'BUTTON' ? el.textContent.trim() : null })));
      await page.fill('#birth-date', '2000-01-01');
      const box = page.locator('form.calc__form .field__toggle input[type=checkbox]');
      if (await box.count()) await box.check();
      const picked = await pickPlace(page, 'place', 'London');
      await page.click('form.calc__form button[type=submit]');
      await page.waitForSelector('.calc__result', { timeout: 90_000 });
      await page.waitForTimeout(1500);
      const notices = await page.locator('.calc__result .notice').evaluateAll((els) => els.map((el) => el.textContent.replace(/\s+/g, ' ').trim()));
      const links = await page.locator('.calc__result a').evaluateAll((els) => els.map((a) => ({ text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href') })));
      const bcLink = page.locator('.calc__result a[href$="/birth-chart/"]').first();
      const linkText = await text(bcLink);
      const linkHref = await bcLink.getAttribute('href');
      const shot1 = await shot(page, 'f1-moon-sign-result-desktop');
      await bcLink.scrollIntoViewIfNeeded();
      await bcLink.click();
      const after = await inspectBirthChartLanding(page);
      const shot2 = await shot(page, 'f1-moon-sign-to-birth-chart-desktop');
      evidence.moonSign.desktop = {
        status: resp?.status(), h1, fieldIds, picked, notices, resultLinks: links,
        link: { text: linkText, href: linkHref },
        birthChartAfterClick: after,
        screenshots: [shot1, shot2],
        blockedRequests: ctx.blocked,
      };
    } catch (error) {
      evidence.errors.push({ where: 'moon-sign-desktop', message: String(error?.stack || error) });
      await shot(page, 'f1-error-moon-sign-desktop').catch(() => {});
    } finally { await ctx.close(); }
  }

  await saveJson('f1-evidence', evidence);
  console.log(JSON.stringify(evidence, null, 2));
});
