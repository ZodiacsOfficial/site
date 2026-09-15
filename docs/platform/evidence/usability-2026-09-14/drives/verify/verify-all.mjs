// Re-verification of the fixes against the rebuilt dist/. One sequential preview
// (Astro 7 allows a single preview instance); fresh context per check; all
// non-loopback requests aborted. Writes verification.json incrementally.
import { readFileSync, writeFileSync } from 'node:fs';
import { withSite, freshContext, shot, text, computeChart, pickPlace, waitForCalculator, OUT } from './harness.mjs';

const results = [];
const OUT_JSON = `${OUT}/verification.json`;
function record(id, passed, observed, screenshot = null) {
  results.push({ id, passed, observed, screenshot });
  writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${id}`);
}
async function guarded(id, fn) {
  try { await fn(); } catch (error) {
    record(id, false, { error: String(error?.stack || error).slice(0, 1200) });
  }
}

const formState = (page) => page.evaluate(() => {
  const chip = document.querySelector('.place--selected #place');
  const act = document.activeElement;
  return {
    date: document.querySelector('#birth-date')?.value ?? null,
    time: document.querySelector('#birth-time')?.value ?? null,
    timeDisabled: document.querySelector('#birth-time')?.disabled ?? null,
    unknownTimeChecked: document.querySelector('form.calc__form .field__toggle input[type=checkbox]')?.checked ?? null,
    placeChip: chip ? chip.value : null,
    placeInput: document.querySelector('#place')?.value ?? null,
    hash: location.hash,
    search: location.search,
    href: location.href,
    activeElement: act ? { tag: act.tagName.toLowerCase(), id: act.id || null, className: (act.getAttribute('class') || '').slice(0, 60), readOnly: act.readOnly ?? null } : null,
    computed: !!document.querySelector('.calc__three'),
  };
});

async function waitForPrefill(page, expectDate) {
  await waitForCalculator(page);
  await page.waitForFunction((d) => document.querySelector('#birth-date')?.value === d, expectDate, { timeout: 15_000 }).catch(() => {});
  const immediate = await formState(page);
  await page.waitForTimeout(1500);
  const settled = await formState(page);
  return { immediate, settled };
}

await withSite(4601, async ({ BASE, browser }) => {
  // ---------- V1a ----------
  await guarded('V1a', async () => {
    const ctx = await freshContext(browser); const page = await ctx.newPage();
    await page.goto(`${BASE}/moon-phase/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#mp-date');
    await page.fill('#mp-date', '2000-01-01');
    await page.click('button.calc__submit');
    await page.waitForSelector('.calc__result', { timeout: 60_000 });
    const link = page.locator('.calc__result [data-birth-chart-handoff]');
    const href = await link.getAttribute('href');
    const linkText = await text(link);
    const s1 = await shot(page, 'v1a-moon-phase-result', { full: false });
    await link.click();
    await page.waitForURL(/\/birth-chart\//, { timeout: 30_000 });
    const hashOnArrival = await page.evaluate(() => location.hash);
    const { immediate, settled } = await waitForPrefill(page, '2000-01-01');
    const s2 = await shot(page, 'v1a-birth-chart-prefilled', { full: false });
    const passed = typeof href === 'string' && href.endsWith('#date=2000-01-01&time=unknown')
      && settled.date === '2000-01-01' && settled.unknownTimeChecked === true && settled.hash === ''
      && immediate.activeElement?.id === 'place';
    record('V1a', passed, { linkText, href, hashOnArrival, afterHydration: immediate, settled }, [s1, s2]);
    await ctx.close();
  });

  // ---------- V1b ----------
  await guarded('V1b', async () => {
    const ctx = await freshContext(browser); const page = await ctx.newPage();
    await page.goto(`${BASE}/moon-phase/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#mp-date');
    await page.fill('#mp-date', '2000-01-01');
    await page.fill('#mp-time', '08:30');
    const picked = await pickPlace(page, 'mp-place', 'London');
    await page.click('button.calc__submit');
    await page.waitForSelector('.calc__result', { timeout: 60_000 });
    const link = page.locator('.calc__result [data-birth-chart-handoff]');
    const href = await link.getAttribute('href');
    const s1 = await shot(page, 'v1b-moon-phase-result', { full: false });
    await link.click();
    await page.waitForURL(/\/birth-chart\//, { timeout: 30_000 });
    const hashOnArrival = await page.evaluate(() => location.hash);
    const { immediate, settled } = await waitForPrefill(page, '2000-01-01');
    // a details codec hand-off may auto-compute; give it a moment and re-read
    await page.waitForTimeout(2500);
    const final = await formState(page);
    const s2 = await shot(page, 'v1b-birth-chart-prefilled', { full: false });
    const passed = typeof href === 'string' && href.includes('#c=')
      && final.date === '2000-01-01' && final.time === '08:30' && /London/.test(final.placeChip || '') && final.hash === '';
    record('V1b', passed, { picked, href: href?.replace(/#c=[^&]+/, '#c=<token>'), hrefContainsC: href?.includes('#c='), hashOnArrival: hashOnArrival.replace(/#c=[^&]+/, '#c=<token>'), afterHydration: immediate, settled, final }, [s1, s2]);
    await ctx.close();
  });

  // ---------- V1c ----------
  await guarded('V1c', async () => {
    const ctx = await freshContext(browser); const page = await ctx.newPage();
    await page.goto(`${BASE}/moon-sign/`, { waitUntil: 'networkidle' });
    await waitForCalculator(page);
    await page.fill('#birth-date', '2000-01-01');
    await page.locator('form.calc__form .field__toggle input[type=checkbox]').check();
    const picked = await pickPlace(page, 'place', 'London');
    await page.click('form.calc__form button[type=submit]');
    await page.waitForSelector('.calc__result', { timeout: 90_000 });
    await page.waitForTimeout(1000);
    const link = page.locator('.calc__result [data-birth-chart-handoff]');
    const count = await link.count();
    const href = count ? await link.getAttribute('href') : null;
    const linkText = count ? await text(link) : null;
    const s1 = await shot(page, 'v1c-moon-sign-result', { full: false });
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await page.waitForURL(/\/birth-chart\//, { timeout: 30_000 });
    const hashOnArrival = await page.evaluate(() => location.hash);
    const { immediate, settled } = await waitForPrefill(page, '2000-01-01');
    await page.waitForTimeout(2500);
    const final = await formState(page);
    const s2 = await shot(page, 'v1c-birth-chart-prefilled', { full: false });
    const passed = typeof href === 'string' && href.includes('#c=')
      && final.date === '2000-01-01' && final.unknownTimeChecked === true && /London/.test(final.placeChip || '');
    record('V1c', passed, { picked, linkText, href: href?.replace(/#c=[^&]+/, '#c=<token>'), hrefContainsC: href?.includes('#c='), hashOnArrival: hashOnArrival.replace(/#c=[^&]+/, '#c=<token>'), afterHydration: immediate, settled, final }, [s1, s2]);
    await ctx.close();
  });

  // ---------- V2 ----------
  await guarded('V2', async () => {
    const ctx = await freshContext(browser); const page = await ctx.newPage();
    const faq = async (path, q) => {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
      const item = page.locator('.faq__item', { hasText: q }).first();
      return { question: await text(item.locator('summary')), answer: await text(item.locator('p')) };
    };
    const home = await faq('/', "What if I don't know my birth time?");
    const bc = await faq('/birth-chart/', 'Do I need my exact birth time?');
    const ms = await faq('/moon-sign/', 'Do I need my birth time to find my moon sign?');
    const banned = /changed signs|may have changed|one of those days/i;
    const answers = [home.answer, bc.answer, ms.answer];
    await page.goto(`${BASE}/birth-chart/`, { waitUntil: 'networkidle' });
    await computeChart(page, { date: '2000-01-01', timeUnknown: true, place: 'London' });
    const notices = await page.locator('.notice[role=status]').evaluateAll((els) => els.map((el) => el.textContent.replace(/\s+/g, ' ').trim()));
    const s1 = await shot(page, 'v2-unknown-time-notice', { full: false });
    const passed = answers.every((a) => a && !banned.test(a)) && notices.some((n) => /unverified/.test(n));
    record('V2', passed, { homeFaq: home, birthChartFaq: bc, moonSignFaq: ms, bannedPhraseHits: answers.map((a) => a?.match(banned)?.[0] ?? null), unknownTimeNotices: notices }, [s1]);
    await ctx.close();
  });

  // ---------- V3 + V4 (shared state) ----------
  await guarded('V3', async () => {
    const ctx = await freshContext(browser); const page = await ctx.newPage();
    // preference only first
    await page.goto(`${BASE}/profile/?sun=leo`, { waitUntil: 'networkidle' });
    await page.waitForSelector('aside[data-sun-sign-preference]', { timeout: 15_000 });
    const readCard = () => page.evaluate(() => {
      const a = document.querySelector('aside[data-sun-sign-preference]');
      const t = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
      return a ? { mode: a.getAttribute('data-sun-sign-preference'), kicker: t(a.querySelector('.kicker')), strong: t(a.querySelector('strong')), p: t(a.querySelector('p')), ctaTexts: [...a.querySelectorAll('a, button')].map(t) } : null;
    });
    const cardPrefOnly = await readCard();
    const s0 = await shot(page, 'v3-profile-pref-only', { full: false });
    // save a chart
    await page.goto(`${BASE}/birth-chart/`, { waitUntil: 'networkidle' });
    await computeChart(page, { date: '1990-06-15', time: '14:30', place: 'London' });
    const saveBtn = page.locator('[data-save-chart]').first();
    await saveBtn.scrollIntoViewIfNeeded();
    await saveBtn.click();
    if (await page.locator('[data-save-prompt]').count()) await page.locator('[data-save-prompt] button[type=submit]').click();
    await page.waitForFunction(() => /Saved/.test(document.querySelector('[data-save-chart]')?.textContent || ''), null, { timeout: 15_000 });
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('zodiacs.profile.v1') || 'null')?.charts.map((c) => ({ name: c.name, relationship: c.relationship })));
    // today
    await page.goto(`${BASE}/today/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-today-chart-source]', { timeout: 20_000 });
    const today = await page.evaluate(() => {
      const t = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
      return { state: document.querySelector('[data-today-state]')?.getAttribute('data-today-state'), heading: t(document.querySelector('.today-reading--resolved h2')), source: t(document.querySelector('[data-today-chart-source]')), sourceLink: document.querySelector('[data-today-chart-source] a')?.getAttribute('href') ?? null };
    });
    const s1 = await shot(page, 'v3-today-with-chart', { full: false });
    // profile with chart
    await page.goto(`${BASE}/profile/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('aside[data-sun-sign-preference]', { timeout: 15_000 });
    await page.waitForTimeout(1500);
    const cardWithChart = await readCard();
    const s2 = await shot(page, 'v3-profile-with-chart', { full: false });
    const passedV3 = /marked as yours/.test(today.source || '') && /Leo/.test(today.source || '') && /Gemini/.test(today.source || '')
      && cardWithChart && cardWithChart.mode === 'secondary' && !cardWithChart.ctaTexts.some((c) => /Get your free birth chart/.test(c || ''))
      && cardPrefOnly && cardPrefOnly.mode === 'primary' && cardPrefOnly.ctaTexts.some((c) => /Get your free birth chart/.test(c || ''));
    record('V3', passedV3, { storedCharts: stored, today, sunSignCardWithChart: cardWithChart, sunSignCardPreferenceOnly: cardPrefOnly }, [s0, s1, s2]);

    // V4 on the same profile page
    await guarded('V4', async () => {
      const v4 = await page.evaluate(() => {
        const t = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
        const top = (el) => el ? Math.round(el.getBoundingClientRect().top + scrollY) : null;
        const empty = document.querySelector('.living-chart__empty');
        const count = document.querySelector('.pf-count');
        return { livingChartEmpty: t(empty), livingChartEmptyTop: top(empty), pfCount: t(count), pfCountTop: top(count), exportButtons: document.querySelectorAll('[data-living-chart-export]').length };
      });
      const s3 = await shot(page, 'v4-profile-one-chart', { full: true });
      const passed = /No moments saved yet/.test(v4.livingChartEmpty || '') && /export/i.test(v4.livingChartEmpty || '') && v4.pfCount === '1 birth chart saved.';
      record('V4', passed, v4, [s3]);
    });
    await ctx.close();
  });

  // ---------- V5 ----------
  await guarded('V5', async () => {
    const out = {};
    for (const path of ['/', '/birth-chart/']) {
      const ctx = await freshContext(browser); const page = await ctx.newPage();
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
      const footer = await page.evaluate(() => {
        const t = (el) => el.textContent.replace(/\s+/g, ' ').trim();
        const links = [...document.querySelectorAll('footer a')].filter((a) => /^Developers/.test(t(a)) || a.getAttribute('href') === '/developers/');
        return links.map((a) => {
          const group = a.closest('nav, .zfooter__group, .zfooter__utilities, div');
          const label = group?.querySelector('.zfooter__label')?.textContent.trim() ?? group?.getAttribute('aria-label') ?? null;
          return { text: t(a), href: a.getAttribute('href'), groupLabel: label, groupClass: group?.getAttribute('class') ?? null };
        });
      });
      await page.locator('footer').scrollIntoViewIfNeeded();
      const s1 = await shot(page, `v5-footer-${path === '/' ? 'home' : 'birth-chart'}`, { full: false });
      await ctx.close();
      const mctx = await freshContext(browser, { mobile: true }); const mpage = await mctx.newPage();
      await mpage.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
      await mpage.locator('[data-menu-toggle]').click();
      await mpage.waitForTimeout(500);
      const menu = await mpage.evaluate(() => {
        const t = (el) => el.textContent.replace(/\s+/g, ' ').trim();
        const groups = [...document.querySelectorAll('#mobile-menu .mobile-menu__group')].map((g) => ({ label: t(g.querySelector('.mobile-menu__label')), links: [...g.querySelectorAll('a')].map((a) => ({ text: t(a), href: a.getAttribute('href') })) }));
        return groups;
      });
      const s2 = await shot(mpage, `v5-mobile-menu-${path === '/' ? 'home' : 'birth-chart'}`, { full: true });
      await mctx.close();
      const site = menu.find((g) => g.label === 'The site');
      out[path] = { footerDeveloperLinks: footer, mobileSiteGroup: site, screenshots: [s1, s2] };
    }
    const ctx = await freshContext(browser); const page = await ctx.newPage();
    const resp = await page.goto(`${BASE}/developers/examples/`, { waitUntil: 'networkidle' });
    const ex = await page.evaluate(() => {
      const body = document.body.innerText;
      const links = [...document.querySelectorAll('a[href="/developers/support/#engine-candidate"]')].map((a) => a.textContent.trim());
      const para = [...document.querySelectorAll('p')].find((p) => /resolveBirth/.test(p.textContent))?.textContent.replace(/\s+/g, ' ').trim() ?? null;
      return { status: null, mentionsResolveBirth: /resolveBirth/.test(body), supportLinks: links, paragraph: para };
    });
    ex.status = resp?.status();
    const s3 = await shot(page, 'v5-developers-examples', { full: false });
    await ctx.close();
    const passed = ['/', '/birth-chart/'].every((p) => out[p].footerDeveloperLinks.some((l) => /^Developers/.test(l.text) && l.href === '/developers/') && out[p].mobileSiteGroup?.links.some((l) => /^Developers/.test(l.text) && l.href === '/developers/'))
      && ex.mentionsResolveBirth && ex.supportLinks.length > 0;
    record('V5', passed, { ...out, examples: { ...ex, screenshot: s3 } }, [out['/'].screenshots, out['/birth-chart/'].screenshots, s3].flat());
  });

  // ---------- V6 ----------
  await guarded('V6', async () => {
    const tops = {};
    const shots = [];
    for (const mobile of [false, true]) {
      const tag = mobile ? '390' : '1280';
      const ctx = await freshContext(browser, { mobile }); const page = await ctx.newPage();
      await page.goto(`${BASE}/birth-chart/`, { waitUntil: 'networkidle' });
      await computeChart(page, { date: '1990-06-15', time: '14:30', place: 'London' });
      await page.waitForSelector('[data-approach-read]', { timeout: 30_000 });
      await page.waitForTimeout(2000);
      tops[tag] = await page.evaluate(() => {
        const top = (sel) => { const el = document.querySelector(sel); return el ? Math.round(el.getBoundingClientRect().top + scrollY) : null; };
        return { bigThree: top('.calc__three'), wheel: top('.calc__wheel'), approach: top('[data-approach-read]'), communication: top('[data-communication-read], .calc__communication'), registryBridge: top('[data-registry-bridge]'), actions: top('.calc__actions'), detail: top('.calc__detail') };
      });
      const el = page.locator('[data-registry-bridge]');
      if (await el.count()) await el.scrollIntoViewIfNeeded();
      shots.push(await shot(page, `v6-registry-bridge-${tag}`, { full: false }));
      shots.push(await shot(page, `v6-result-order-${tag}`, { full: true }));
      await ctx.close();
    }
    const ok = (t) => t.registryBridge != null && t.approach != null && t.wheel != null && t.actions != null && t.registryBridge > t.approach && t.registryBridge > t.wheel && t.registryBridge < t.actions;
    record('V6', ok(tops['1280']) && ok(tops['390']), tops, shots);
  });

  // ---------- V7 ----------
  await guarded('V7', async () => {
    const ctx = await freshContext(browser); const page = await ctx.newPage();
    await page.goto(`${BASE}/birth-chart/`, { waitUntil: 'networkidle' });
    await waitForCalculator(page);
    await page.focus('#place');
    await page.keyboard.type('Lond');
    await page.waitForSelector('#place-list [role=option]:not([aria-disabled="true"])', { timeout: 30_000 });
    await page.keyboard.press('ArrowDown');
    const highlighted = await page.evaluate(() => document.querySelector('#place-list [aria-selected="true"]')?.textContent.replace(/\s+/g, ' ').trim());
    await page.keyboard.press('Enter');
    await page.waitForSelector('.place--selected #place', { timeout: 10_000 });
    await page.waitForTimeout(300);
    const describe = () => page.evaluate(() => { const el = document.activeElement; return el ? { tag: el.tagName.toLowerCase(), id: el.id || null, className: (el.getAttribute('class') || '').slice(0, 60), readOnly: el.readOnly ?? null, value: (el.value || '').slice(0, 60) } : null; });
    const afterEnter = await describe();
    await page.keyboard.press('Tab');
    const afterTab = await describe();
    const s1 = await shot(page, 'v7-place-chip-focus', { full: false });
    const passed = afterEnter?.id === 'place' && /place__chip-value/.test(afterEnter?.className || '') && afterTab?.tag === 'select' && afterTab?.id === 'house-system';
    record('V7', passed, { highlightedBeforeEnter: highlighted, activeAfterEnter: afterEnter, activeAfterTab: afterTab }, [s1]);
    await ctx.close();
  });
});

// ---------- VOICE ----------
await guarded('VOICE', async () => {
  const { execSync } = await import('node:child_process');
  const run = (cmd) => { try { return execSync(cmd, { encoding: 'utf8' }).trim(); } catch (e) { return (e.stdout || '').trim(); } };
  const srcHits = run(`grep -rn -i -E "\\bproperly\\b|shows its work|like a human" src --include=*.ts --include=*.tsx --include=*.astro | grep -v "\\.test\\." || true`);
  const distPages = ['index.html', 'birth-chart/index.html', 'moon-sign/index.html', 'moon-phase/index.html', 'today/index.html', 'profile/index.html', 'developers/index.html', 'developers/examples/index.html', 'developers/support/index.html'];
  const distHits = {};
  for (const p of distPages) {
    const html = readFileSync(`dist/${p}`, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
    const m = html.match(/[^.]{0,60}(\bproperly\b|shows its work|like a human)[^.]{0,60}/gi);
    if (m) distHits[p] = m.map((s) => s.replace(/\s+/g, ' ').trim());
  }
  record('VOICE', srcHits === '' && Object.keys(distHits).length === 0, { srcHits: srcHits || '(none)', distHits });
});

console.log(JSON.stringify(results, null, 2));
