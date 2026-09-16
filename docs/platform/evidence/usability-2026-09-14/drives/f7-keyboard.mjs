// Finding 7: keyboard smoke on /birth-chart/.
import { withSite, freshContext, shot, saveJson, text, waitForCalculator, describeActive } from './harness.mjs';

await withSite(4507, async ({ BASE, browser }) => {
  const evidence = { tabOrder: [], errors: [] };
  const ctx = await freshContext(browser);
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/birth-chart/`, { waitUntil: 'networkidle' });
    await waitForCalculator(page);
    // Start from the document start: reset focus to body, keep scroll at top.
    await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
    let reachedSubmit = false;
    for (let i = 0; i < 80; i += 1) {
      await page.keyboard.press('Tab');
      const active = await describeActive(page);
      evidence.tabOrder.push({ step: i + 1, ...active });
      if (active?.className?.includes('calc__submit') || (active?.tag === 'button' && active?.type === 'submit' && /chart/i.test(active.text))) { reachedSubmit = true; break; }
    }
    evidence.reachedSubmit = reachedSubmit;
    evidence.tabsToSubmit = evidence.tabOrder.length;

    // City autocomplete via keyboard
    await page.focus('#place');
    await page.keyboard.type('Lond');
    await page.waitForSelector('#place-list [role=option]:not([aria-disabled="true"])', { timeout: 30_000 });
    const options = await page.locator('#place-list [role=option]').evaluateAll((els) => els.map((el) => ({ id: el.id, text: el.textContent.replace(/\s+/g, ' ').trim(), selected: el.getAttribute('aria-selected') })));
    const beforeArrow = await page.evaluate(() => ({ activeDescendant: document.querySelector('#place')?.getAttribute('aria-activedescendant'), expanded: document.querySelector('#place')?.getAttribute('aria-expanded') }));
    await page.keyboard.press('ArrowDown');
    const afterArrow = await page.evaluate(() => ({ activeDescendant: document.querySelector('#place')?.getAttribute('aria-activedescendant'), selectedText: document.querySelector('#place-list [aria-selected="true"]')?.textContent.replace(/\s+/g, ' ').trim() }));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    const afterEnter = await page.evaluate(() => ({
      selected: !!document.querySelector('.place--selected'),
      chipValue: document.querySelector('.place--selected #place')?.value ?? null,
      inputValue: document.querySelector('#place')?.value ?? null,
      urlUnchanged: location.pathname,
      active: (() => { const el = document.activeElement; return el ? { tag: el.tagName.toLowerCase(), id: el.id || null, ariaLabel: el.getAttribute('aria-label'), className: (el.getAttribute('class') || '').slice(0, 60) } : null; })(),
    }));
    evidence.placeKeyboard = { options: options.slice(0, 5), beforeArrow, afterArrow, afterEnter, screenshot: await shot(page, 'f7-place-selected-desktop', { full: false }) };

    // Submit with Enter while the date is empty (time known, time empty too).
    await page.focus('#birth-time');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    const emptySubmit = await page.evaluate(() => ({
      active: (() => { const el = document.activeElement; return el ? { tag: el.tagName.toLowerCase(), id: el.id || null, type: el.getAttribute('type'), ariaInvalid: el.getAttribute('aria-invalid'), describedBy: el.getAttribute('aria-describedby') } : null; })(),
      alerts: [...document.querySelectorAll('[role=alert]')].map((el) => ({ id: el.id || null, text: el.textContent.replace(/\s+/g, ' ').trim(), className: el.getAttribute('class') })),
      dateValue: document.querySelector('#birth-date')?.value ?? null,
    }));
    evidence.emptySubmit = { ...emptySubmit, screenshot: await shot(page, 'f7-empty-submit-desktop', { full: false }) };

    // Also: Enter on the submit button itself with date still empty
    await page.focus('form.calc__form button[type=submit]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    evidence.emptySubmitViaButton = await page.evaluate(() => ({
      active: (() => { const el = document.activeElement; return el ? { tag: el.tagName.toLowerCase(), id: el.id || null } : null; })(),
      alerts: [...document.querySelectorAll('[role=alert]')].map((el) => el.textContent.replace(/\s+/g, ' ').trim()),
    }));

    // Fill valid inputs and submit with Enter from the time field.
    await page.fill('#birth-date', '1990-06-15');
    await page.fill('#birth-time', '14:30');
    await page.focus('#birth-time');
    const beforeResult = await describeActive(page);
    await page.keyboard.press('Enter');
    await page.waitForSelector('.calc__three', { timeout: 90_000 });
    await page.waitForTimeout(1500);
    const afterResult = await page.evaluate(() => {
      const el = document.activeElement;
      const heading = document.querySelector('.calc__result h2.sr-only, h2.sr-only[tabindex="-1"]');
      const resultTop = document.querySelector('.calc__three')?.getBoundingClientRect().top;
      return {
        active: el ? { tag: el.tagName.toLowerCase(), id: el.id || null, className: (el.getAttribute('class') || '').slice(0, 80), text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80), isBody: el === document.body } : null,
        resultHeading: heading ? { text: heading.textContent.trim(), tabindex: heading.getAttribute('tabindex'), isFocused: document.activeElement === heading, srOnly: heading.classList.contains('sr-only') } : null,
        resultRegion: (() => { const r = document.querySelector('.calc__result'); return r ? { tabindex: r.getAttribute('tabindex'), role: r.getAttribute('role'), ariaLabel: r.getAttribute('aria-label'), ariaLive: r.getAttribute('aria-live') } : null; })(),
        scrollY: Math.round(scrollY),
        resultTopInViewport: resultTop != null ? Math.round(resultTop) : null,
        statusTexts: [...document.querySelectorAll('[role=status]')].map((el) => el.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 8),
      };
    });
    evidence.resultFocus = { beforeResult, afterResult, screenshot: await shot(page, 'f7-after-result-desktop', { full: false }) };
    // Where does the next Tab go from the result?
    await page.keyboard.press('Tab');
    evidence.resultFocus.nextTab = await describeActive(page);
  } catch (error) {
    evidence.errors.push({ message: String(error?.stack || error) });
    await shot(page, 'f7-error').catch(() => {});
  }
  evidence.blocked = ctx.blocked;
  await ctx.close();
  await saveJson('f7-evidence', evidence);
  console.log(JSON.stringify(evidence, null, 2));
});
