// Finding 5: Developer discoverability in header nav / footer; /developers/ H1 and engine example.
import { withSite, freshContext, shot, saveJson, text } from './harness.mjs';

const t = (el) => el.textContent.replace(/\s+/g, ' ').trim();

await withSite(4505, async ({ BASE, browser }) => {
  const evidence = { pages: {}, developers: {}, errors: [] };

  for (const path of ['/', '/birth-chart/']) {
    const key = path === '/' ? 'home' : 'birth-chart';
    evidence.pages[key] = {};
    // Desktop
    {
      const ctx = await freshContext(browser);
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
        const header = await page.evaluate(() => {
          const vis = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
          const t = (el) => el.textContent.replace(/\s+/g, ' ').trim();
          const nav = document.querySelector('nav[data-nav]');
          const items = [...nav.querySelectorAll('a, button')].filter(vis).map((el) => ({ tag: el.tagName.toLowerCase(), text: t(el), href: el.getAttribute('href'), ariaLabel: el.getAttribute('aria-label') }));
          const tools = [...document.querySelectorAll('#tools-menu a')].map((a) => ({ text: t(a), href: a.getAttribute('href') }));
          return { visibleItems: items, toolsMenu: tools, signsMenuCount: document.querySelectorAll('#signs-menu a').length };
        });
        const footer = await page.evaluate(() => {
          const t = (el) => el.textContent.replace(/\s+/g, ' ').trim();
          const groups = [...document.querySelectorAll('.zfooter__group')].map((g) => ({
            label: t(g.querySelector('.zfooter__label') || g),
            links: [...g.querySelectorAll('a')].map((a) => ({ text: t(a), href: a.getAttribute('href') })),
          }));
          const all = [...document.querySelectorAll('footer a')].map((a) => ({ text: t(a), href: a.getAttribute('href') }));
          return { groups, allFooterLinks: all };
        });
        const devMentions = await page.evaluate(() => {
          const t = (el) => el.textContent.replace(/\s+/g, ' ').trim();
          return [...document.querySelectorAll('header a, nav a, footer a')]
            .filter((a) => /developer/i.test(t(a)) || /\/developers\//.test(a.getAttribute('href') || ''))
            .map((a) => ({ text: t(a), href: a.getAttribute('href') }));
        });
        await page.locator('[data-tools-toggle]').click().catch(() => {});
        await page.waitForTimeout(400);
        const shotHeader = await shot(page, `f5-${key}-header-desktop`, { full: false });
        await page.keyboard.press('Escape').catch(() => {});
        await page.locator('footer').scrollIntoViewIfNeeded();
        const shotFooter = await shot(page, `f5-${key}-footer-desktop`, { full: false });
        evidence.pages[key].desktop = { header, footer, developerMentionsInHeaderOrFooter: devMentions, screenshots: [shotHeader, shotFooter] };
      } catch (error) { evidence.errors.push({ where: `${key}-desktop`, message: String(error?.stack || error) }); }
      await ctx.close();
    }
    // Mobile
    {
      const ctx = await freshContext(browser, { mobile: true });
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
        const burger = page.locator('[data-menu-toggle]');
        const burgerLabel = await burger.getAttribute('aria-label');
        await burger.click();
        await page.waitForTimeout(500);
        const menu = await page.evaluate(() => {
          const vis = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
          const t = (el) => el.textContent.replace(/\s+/g, ' ').trim();
          const m = document.querySelector('#mobile-menu');
          return {
            hidden: m?.hidden ?? null,
            expanded: document.querySelector('[data-menu-toggle]')?.getAttribute('aria-expanded'),
            groups: [...m.querySelectorAll('.mobile-menu__group')].map((g) => ({
              label: t(g.querySelector('.mobile-menu__label')),
              links: [...g.querySelectorAll('a')].filter(vis).map((a) => ({ text: t(a) || a.getAttribute('aria-label'), href: a.getAttribute('href') })),
            })),
            developerLinks: [...m.querySelectorAll('a')].filter((a) => /developer/i.test(t(a)) || /\/developers\//.test(a.getAttribute('href') || '')).map((a) => ({ text: t(a), href: a.getAttribute('href') })),
          };
        });
        const shotMenu = await shot(page, `f5-${key}-mobile-menu`, { full: true });
        evidence.pages[key].mobile = { burgerLabel, menu, screenshot: shotMenu };
      } catch (error) { evidence.errors.push({ where: `${key}-mobile`, message: String(error?.stack || error) }); }
      await ctx.close();
    }
  }

  // /developers/ status + H1 + example
  {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    try {
      const resp = await page.goto(`${BASE}/developers/`, { waitUntil: 'networkidle' });
      const status = resp?.status();
      const h1 = await text(page.locator('h1'));
      const kicker = await text(page.locator('main .kicker, .section .kicker').first());
      const paths = await page.evaluate(() => [...document.querySelectorAll('.dev-paths li')].map((li) => ({ status: li.querySelector('.dev-status')?.textContent.trim(), heading: li.querySelector('h2')?.textContent.trim(), href: li.querySelector('h2 a')?.getAttribute('href') })));
      const codeBlocks = await page.evaluate(() => [...document.querySelectorAll('pre')].map((pre) => ({ ariaLabel: pre.getAttribute('aria-label'), code: pre.textContent })));
      const textAll = await page.evaluate(() => document.body.innerText);
      const mentions = {
        noon: /\bnoon\b/i.test(textAll),
        twelve: /12:00/.test(textAll),
        timezone: /time ?zone|timezone/i.test(textAll),
        utc: /\bUTC\b/.test(textAll),
        engineLinks: await page.evaluate(() => [...document.querySelectorAll('a')].filter((a) => /engine|natal|examples|support/i.test(a.getAttribute('href') || '')).map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') }))),
      };
      const shotDev = await shot(page, 'f5-developers-desktop');
      evidence.developers.index = { status, h1, kicker, paths, codeBlocks, mentions, screenshot: shotDev };

      // Examples page (the natal example lives at /developers/examples/#natal)
      const resp2 = await page.goto(`${BASE}/developers/examples/#natal`, { waitUntil: 'networkidle' });
      const natal = await page.evaluate(() => {
        const h = document.querySelector('#natal');
        const paras = [];
        let el = h?.nextElementSibling;
        while (el && !/^H2$/.test(el.tagName)) { paras.push(el.textContent.replace(/\s+/g, ' ').trim()); el = el.nextElementSibling; }
        return { heading: h?.textContent.trim(), paragraphs: paras, setupCode: document.querySelector('pre[aria-label="Starter setup commands"]')?.textContent ?? null, preCount: document.querySelectorAll('pre').length };
      });
      const shotEx = await shot(page, 'f5-developers-examples-desktop');
      evidence.developers.examples = { status: resp2?.status(), h1: await text(page.locator('h1')), natal, screenshot: shotEx };

      // Support page: timezone note?
      const resp3 = await page.goto(`${BASE}/developers/support/`, { waitUntil: 'networkidle' });
      const supportTz = await page.evaluate(() => {
        const t = document.body.innerText;
        const lines = t.split('\n').filter((l) => /time ?zone|timezone|IANA|offset|local time|noon|12:00/i.test(l));
        return lines.slice(0, 20);
      });
      evidence.developers.support = { status: resp3?.status(), h1: await text(page.locator('h1')), timezoneLines: supportTz };
    } catch (error) { evidence.errors.push({ where: 'developers', message: String(error?.stack || error) }); }
    await ctx.close();
  }

  await saveJson('f5-evidence', evidence);
  console.log(JSON.stringify(evidence, null, 2));
});
