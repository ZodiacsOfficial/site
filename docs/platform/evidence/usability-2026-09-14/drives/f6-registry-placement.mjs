// Finding 6: vertical order of major result blocks after computing a known-time chart.
import { withSite, freshContext, shot, saveJson, computeChart } from './harness.mjs';

await withSite(4506, async ({ BASE, browser }) => {
  const evidence = { viewports: {}, errors: [] };
  for (const mobile of [false, true]) {
    const tag = mobile ? 'mobile' : 'desktop';
    const ctx = await freshContext(browser, { mobile });
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/birth-chart/`, { waitUntil: 'networkidle' });
      await computeChart(page, { date: '1990-06-15', time: '14:30', place: 'London' });
      // give lazily-loaded reading modules time to land
      await page.waitForTimeout(3000);
      const blocks = await page.evaluate(() => {
        const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
        const box = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { top: Math.round(r.top + scrollY), height: Math.round(r.height), visible: r.height > 0 && getComputedStyle(el).display !== 'none' };
        };
        const firstHeading = (el) => t(el?.querySelector('h2, h3, .kicker, .mono--label, .calc__record-label, summary'));
        const defs = [
          ['form', 'form.calc__form'],
          ['notices (first)', '.calc__result > .notice, .notice[role=status]'],
          ['big-three cards (.calc__three)', '.calc__three'],
          ['first-reading prompt (.calc__first-reading)', '.calc__first-reading'],
          ['registry bridge ([data-registry-bridge])', '[data-registry-bridge]'],
          ['moon phase line (.calc__phase)', '.calc__phase'],
          ['chart wheel (.calc__wheel)', '.calc__wheel'],
          ['chart context (ChartContext)', '[data-chart-context], .calc__context, .chart-context'],
          ['approach read ([data-approach-read])', '[data-approach-read]'],
          ['communication read', '[data-communication-read], .calc__communication'],
          ['action dock ([data-chart-action-dock])', '[data-chart-action-dock]'],
          ['detail/planet table (.calc__detail)', '.calc__detail'],
          ['planet table (.calc__table)', '.calc__table'],
          ['aspects (.calc__aspects)', '.calc__aspects'],
        ];
        const blocks = defs.map(([name, sel]) => {
          const el = document.querySelector(sel);
          return { name, selector: sel, found: !!el, box: box(el), heading: firstHeading(el), text: t(el)?.slice(0, 160) ?? null };
        });
        const registry = document.querySelector('[data-registry-bridge]');
        const registryDetail = registry ? {
          label: t(registry.querySelector('.calc__record-label')),
          sun: t(registry.querySelector('.calc__record-sun')),
          copy: t(registry.querySelector('.calc__record-text')),
          link: { text: t(registry.querySelector('.calc__record-link')), href: registry.querySelector('.calc__record-link')?.getAttribute('href') },
          sign: registry.getAttribute('data-registry-bridge-sign'),
        } : null;
        const headings = [...document.querySelectorAll('.calc__result h2, .calc__result h3, [data-approach-read] h2, .calc__record-label')]
          .map((h) => ({ tag: h.tagName.toLowerCase(), text: t(h).slice(0, 100), top: Math.round(h.getBoundingClientRect().top + scrollY), srOnly: h.classList.contains('sr-only') }));
        const detailsOpen = document.querySelector('.calc__detail')?.open ?? null;
        return { blocks, registryDetail, headings, detailsOpen, pageHeight: document.documentElement.scrollHeight };
      });
      const shotPath = await shot(page, `f6-result-order-${tag}`);
      const bridgeShot = await (async () => {
        const el = page.locator('[data-registry-bridge]');
        if (!(await el.count())) return null;
        await el.scrollIntoViewIfNeeded();
        return shot(page, `f6-registry-bridge-${tag}`, { full: false });
      })();
      evidence.viewports[tag] = { ...blocks, screenshots: [shotPath, bridgeShot], blocked: ctx.blocked.length };
    } catch (error) {
      evidence.errors.push({ where: tag, message: String(error?.stack || error) });
      await shot(page, `f6-error-${tag}`).catch(() => {});
    }
    await ctx.close();
  }
  await saveJson('f6-evidence', evidence);
  console.log(JSON.stringify(evidence, null, 2));
});
