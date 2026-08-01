import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('consumer return-path hierarchy', () => {
  it('makes Today the primary header destination and keeps Registry in the footer', async () => {
    const [nav, footer] = await Promise.all([
      source('src/components/SiteNav.astro'),
      source('src/components/SiteFooter.astro'),
    ]);
    expect(nav).toContain('class="nav__chip"');
    expect(nav).toContain('href="/today/"');
    expect(nav).toContain("t(locale, 'navToday')");
    expect(nav).not.toContain('href="/registry/"');
    expect(footer).toContain('href="/registry/"');
    expect(footer).toContain('FOOTER_COPY[locale].more');
  });

  it('keeps ordinary chart results free of Registry cross-sells', async () => {
    const calculator = await source('src/islands/ChartCalculator.tsx');
    expect(calculator).toContain('data-save-for-today');
    expect(calculator).not.toMatch(/registryAuraChartLink|data-registry-aura-chart-link/);
    expect(calculator).not.toContain('href={`/registry/');
    expect(calculator).not.toContain('calc__record');
  });

  it('documents the consumer hierarchy before the collector/developer wing', async () => {
    const [short, full] = await Promise.all([
      source('public/llms.txt'),
      source('public/llms-full.txt'),
    ]);
    for (const copy of [short, full]) {
      expect(copy.indexOf('https://zodiacs.org/today/')).toBeGreaterThan(-1);
      expect(copy.indexOf('https://zodiacs.org/today/'))
        .toBeLessThan(copy.indexOf('https://zodiacs.org/registry/'));
    }
  });
});
