// Findings 3 + 4: Today vs Profile active chart naming, Sun-sign preference vs saved chart,
// Living Chart empty text vs saved-chart count ordering, export controls.
import { withSite, freshContext, shot, saveJson, text, computeChart, pickPlace } from './harness.mjs';

async function readToday(page) {
  await page.goto(page.url().includes('/today/') ? page.url() : page.url(), { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2500); // client:idle island + profile read
  return page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const t = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
    const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const readingHead = q('.today-reading--resolved .today-reading__head h2');
    return {
      url: location.href,
      state: q('[data-today-state]')?.getAttribute('data-today-state') ?? null,
      kicker: t(q('.today-hero .kicker')),
      h1: t(q('.today-hero h1')),
      intro: t(q('.today-hero p')),
      resolvedHeading: t(readingHead),
      resolvedHeadingAria: readingHead?.getAttribute('aria-label') ?? null,
      chartName: t(q('.today-reading__chart-name')),
      chartNameTitle: q('.today-reading__chart-name')?.getAttribute('title') ?? null,
      resolvedSub: t(q('.today-reading--resolved .today-reading__head p')),
      fallbackH2: t(q('.today-fallback__intro h2')),
      fallbackStatus: { text: t(q('.today-fallback__status')), visible: vis(q('.today-fallback__status')) },
      placeholderH2: { text: t(q('.today-returning-chart-placeholder h2')), visible: vis(q('.today-returning-chart-placeholder h2')) },
      activeSunReading: t(q('.today-sign-reading[data-today-sun-sign] .kicker')),
      activeSunSlug: q('.today-sign-reading[data-today-sun-sign]')?.getAttribute('data-today-sun-sign') ?? null,
      sunSignReadingTitle: t(q('.today-sign-reading[data-today-sun-sign] .today-sign-reading__title')),
      chooserHeading: t(q('[data-living-self-chart] h2')),
      chooserVisible: vis(q('[data-living-self-chart]')),
      allH2: [...document.querySelectorAll('main h2, .today-page h2')].filter(vis).map(t),
      allKickers: [...document.querySelectorAll('.today-page .kicker')].filter(vis).map(t),
      mentionsDemo: /\bdemo\b/i.test(document.body.innerText),
      htmlAttrs: {
        sunSign: document.documentElement.getAttribute('data-today-sun-sign'),
        savedChart: document.documentElement.hasAttribute('data-today-saved-chart'),
        chartSun: document.documentElement.getAttribute('data-today-chart-sun-sign'),
        needsSelf: document.documentElement.hasAttribute('data-living-chart-needs-self'),
      },
      storage: {
        sunSign: localStorage.getItem('zodiacs:today-sun-sign:v1'),
        profile: (() => { try { const p = JSON.parse(localStorage.getItem('zodiacs.profile.v1') || 'null'); return p ? p.charts.map((c) => ({ name: c.name, relationship: c.relationship, date: c.birth?.date })) : null; } catch { return 'unparseable'; } })(),
      },
    };
  });
}

async function readProfile(page) {
  await page.waitForTimeout(2000);
  return page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const t = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
    const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const top = (el) => el ? Math.round(el.getBoundingClientRect().top + scrollY) : null;
    const sunAside = q('.pf-sun-sign');
    const empty = q('.living-chart__empty');
    const countEl = [...document.querySelectorAll('p, span, div')].find((el) => /^\d+ charts? saved/.test(el.textContent.trim()) && el.children.length === 0) || null;
    const exportBtns = [...document.querySelectorAll('[data-living-chart-export]')];
    const dashboardH2 = q('.pfd h2, [class*="pfd"] h2');
    return {
      url: location.href,
      h1: t(q('h1')),
      sunPreference: sunAside ? { kicker: t(sunAside.querySelector('.kicker')), strong: t(sunAside.querySelector('strong')), p: t(sunAside.querySelector('p')), top: top(sunAside) } : null,
      livingChartEmpty: empty ? { text: t(empty), top: top(empty), visible: vis(empty) } : null,
      livingChartHeading: t(q('.living-chart h2, [class*="living-chart"] h2')),
      livingChartStatus: t(q('.living-chart__status')),
      savedCount: countEl ? { text: t(countEl), top: top(countEl), visible: vis(countEl) } : null,
      exportButtons: exportBtns.map((b) => ({ format: b.getAttribute('data-living-chart-export'), visible: vis(b), top: top(b) })),
      chartCards: [...document.querySelectorAll('.pf-book h2, .pf-chart h2, article h2')].map(t).filter(Boolean),
      dashboardHeadings: [...document.querySelectorAll('h2')].filter(vis).map((h) => ({ text: t(h), top: top(h) })),
      mentionsDemo: /\bdemo\b/i.test(document.body.innerText),
      storage: {
        sunSign: localStorage.getItem('zodiacs:today-sun-sign:v1'),
        profile: (() => { try { const p = JSON.parse(localStorage.getItem('zodiacs.profile.v1') || 'null'); return p ? p.charts.map((c) => ({ name: c.name, relationship: c.relationship, date: c.birth?.date })) : null; } catch { return 'unparseable'; } })(),
      },
    };
  });
}

async function saveCurrentChart(page) {
  const btn = page.locator('[data-chart-action-dock] [data-save-chart], [data-save-chart]').first();
  await btn.scrollIntoViewIfNeeded();
  const before = await text(btn);
  await btn.click();
  await page.waitForTimeout(800);
  const promptOpen = await page.locator('[data-save-prompt]').count();
  let promptDetail = null;
  if (promptOpen) {
    const input = page.locator('#chart-save-name');
    promptDetail = { label: await text(page.locator('label[for="chart-save-name"]')), prefill: await input.inputValue() };
    await page.locator('[data-save-prompt] button[type=submit]').click();
  }
  await page.waitForFunction(() => /Saved/.test(document.querySelector('[data-save-chart]')?.textContent || ''), null, { timeout: 15_000 }).catch(() => {});
  const after = await text(btn);
  return { before, promptOpen: promptOpen > 0, promptDetail, after };
}

await withSite(4503, async ({ BASE, browser }) => {
  const evidence = { a_fresh: {}, b_pref_plus_chart: {}, c_pref_only: {}, d_two_self_charts: {}, e_self_plus_other: {}, f4: {}, errors: [] };

  // (a) fresh, nothing saved
  for (const mobile of [false, true]) {
    const tag = mobile ? 'mobile' : 'desktop';
    const ctx = await freshContext(browser, { mobile });
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/today/`, { waitUntil: 'networkidle' });
      const today = await readToday(page);
      today.screenshot = await shot(page, `f3a-today-fresh-${tag}`);
      await page.goto(`${BASE}/profile/`, { waitUntil: 'networkidle' });
      const profile = await readProfile(page);
      profile.screenshot = await shot(page, `f3a-profile-fresh-${tag}`);
      evidence.a_fresh[tag] = { today, profile };
    } catch (error) { evidence.errors.push({ where: `a-${tag}`, message: String(error?.stack || error) }); }
    await ctx.close();
  }

  // (b) Sun-sign preference (Leo) + one saved known-time chart, then (d) second self chart
  {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/profile/?sun=leo`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.pf-sun-sign', { timeout: 15_000 });
      const prefOnly = await readProfile(page);
      prefOnly.screenshot = await shot(page, 'f3b-profile-pref-only-desktop');
      evidence.b_pref_plus_chart.profileAfterPreference = prefOnly;

      await page.goto(`${BASE}/birth-chart/`, { waitUntil: 'networkidle' });
      const computed = await computeChart(page, { date: '1990-06-15', time: '14:30', place: 'London' });
      const save = await saveCurrentChart(page);
      evidence.b_pref_plus_chart.save = { ...save, place: computed.picked, screenshot: await shot(page, 'f3b-birth-chart-saved-desktop', { full: false }) };

      await page.goto(`${BASE}/today/`, { waitUntil: 'networkidle' });
      const today = await readToday(page);
      today.screenshot = await shot(page, 'f3b-today-pref-plus-chart-desktop');
      evidence.b_pref_plus_chart.today = today;

      await page.goto(`${BASE}/profile/`, { waitUntil: 'networkidle' });
      const profile = await readProfile(page);
      profile.screenshot = await shot(page, 'f3b-profile-pref-plus-chart-desktop');
      evidence.b_pref_plus_chart.profile = profile;
      evidence.f4.desktop = {
        livingChartEmpty: profile.livingChartEmpty,
        savedCount: profile.savedCount,
        exportButtons: profile.exportButtons,
        headings: profile.dashboardHeadings,
        screenshot: profile.screenshot,
      };
      // mobile view of the same state (F3/F4)
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${BASE}/today/`, { waitUntil: 'networkidle' });
      const todayM = await readToday(page);
      todayM.screenshot = await shot(page, 'f3b-today-pref-plus-chart-mobile');
      evidence.b_pref_plus_chart.todayMobile = todayM;
      await page.goto(`${BASE}/profile/`, { waitUntil: 'networkidle' });
      const profileM = await readProfile(page);
      profileM.screenshot = await shot(page, 'f3b-profile-pref-plus-chart-mobile');
      evidence.f4.mobile = { livingChartEmpty: profileM.livingChartEmpty, savedCount: profileM.savedCount, exportButtons: profileM.exportButtons, screenshot: profileM.screenshot };
      await page.setViewportSize({ width: 1280, height: 900 });

      // (d) second chart via the normal (self) flow
      await page.goto(`${BASE}/birth-chart/`, { waitUntil: 'networkidle' });
      await computeChart(page, { date: '1985-03-02', time: '09:15', place: 'Paris' });
      const save2 = await saveCurrentChart(page);
      evidence.d_two_self_charts.save = save2;
      await page.goto(`${BASE}/today/`, { waitUntil: 'networkidle' });
      const today2 = await readToday(page);
      today2.screenshot = await shot(page, 'f3d-today-two-self-charts-desktop');
      evidence.d_two_self_charts.today = today2;
      await page.goto(`${BASE}/profile/`, { waitUntil: 'networkidle' });
      const profile2 = await readProfile(page);
      profile2.screenshot = await shot(page, 'f3d-profile-two-self-charts-desktop');
      evidence.d_two_self_charts.profile = profile2;
    } catch (error) {
      evidence.errors.push({ where: 'b/d', message: String(error?.stack || error) });
      await shot(page, 'f3-error-bd').catch(() => {});
    }
    await ctx.close();
  }

  // (c) Sun-sign preference only, no saved chart
  {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/profile/?sun=leo`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.pf-sun-sign', { timeout: 15_000 });
      await page.goto(`${BASE}/today/`, { waitUntil: 'networkidle' });
      const today = await readToday(page);
      today.screenshot = await shot(page, 'f3c-today-pref-only-desktop');
      evidence.c_pref_only.today = today;
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload({ waitUntil: 'networkidle' });
      const todayM = await readToday(page);
      todayM.screenshot = await shot(page, 'f3c-today-pref-only-mobile');
      evidence.c_pref_only.todayMobile = todayM;
    } catch (error) { evidence.errors.push({ where: 'c', message: String(error?.stack || error) }); }
    await ctx.close();
  }

  // (e) one self chart + one "other person" chart via /birth-chart/someone-else/
  {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/birth-chart/`, { waitUntil: 'networkidle' });
      await computeChart(page, { date: '1990-06-15', time: '14:30', place: 'London' });
      await saveCurrentChart(page);
      await page.goto(`${BASE}/birth-chart/someone-else/`, { waitUntil: 'networkidle' });
      await page.waitForSelector('#other-chart-name');
      await page.fill('#other-chart-name', 'Other person');
      await page.fill('#other-birth-date', '1985-03-02');
      await page.fill('#other-birth-time', '09:15');
      await pickPlace(page, 'other-birth-place', 'Paris');
      const consent = page.locator('form.other-chart__panel input[type=checkbox]');
      const consentCount = await consent.count();
      const consentLabels = [];
      for (let i = 0; i < consentCount; i += 1) {
        consentLabels.push(await text(page.locator('form.other-chart__panel label').filter({ has: consent.nth(i) })));
        if (!(await consent.nth(i).isChecked())) await consent.nth(i).check();
      }
      const submitText = await text(page.locator('form.other-chart__panel button[type=submit]'));
      await page.click('form.other-chart__panel button[type=submit]');
      await page.waitForURL(/\/birth-chart\/#/, { timeout: 30_000 });
      const landed = page.url();
      await page.waitForSelector('.calc__three', { timeout: 90_000 });
      await page.waitForTimeout(1500);
      const subjectNotice = await text(page.locator('[data-chart-subject]').first());
      const save = await saveCurrentChart(page);
      evidence.e_self_plus_other.otherFlow = { consentLabels, submitText, landed: landed.replace(/#p=[^&]+/, '#p=<token>'), subjectNotice, save, screenshot: await shot(page, 'f3e-birth-chart-other-saved-desktop', { full: false }) };
      await page.goto(`${BASE}/today/`, { waitUntil: 'networkidle' });
      const today = await readToday(page);
      today.screenshot = await shot(page, 'f3e-today-self-plus-other-desktop');
      evidence.e_self_plus_other.today = today;
      await page.goto(`${BASE}/profile/`, { waitUntil: 'networkidle' });
      const profile = await readProfile(page);
      profile.screenshot = await shot(page, 'f3e-profile-self-plus-other-desktop');
      evidence.e_self_plus_other.profile = profile;
    } catch (error) {
      evidence.errors.push({ where: 'e', message: String(error?.stack || error) });
      await shot(page, 'f3-error-e').catch(() => {});
    }
    await ctx.close();
  }

  await saveJson('f34-evidence', evidence);
  console.log(JSON.stringify(evidence, null, 2));
});
