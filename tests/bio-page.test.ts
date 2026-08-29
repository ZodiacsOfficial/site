import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { SIGNS } from '../src/lib/signs';

const source = await readFile(new URL('../src/pages/bio/index.astro', import.meta.url), 'utf8');

describe('/bio/ link contract', () => {
  it('keeps the two primary destinations', () => {
    expect(source).toContain("href: '/birth-chart/'");
    expect(source).toContain("href: '/astrofolio/'");
    expect(source).not.toContain("href: '/horoscopes/'");
    expect(source).toContain('Daily horoscopes');
    expect(source).toContain('Choose your sign.');
  });

  it('builds one daily horoscope link for every canonical sign', () => {
    expect(SIGNS).toHaveLength(12);
    expect(source).toContain('SIGNS.map((sign)');
    expect(source).toContain('class="tile bio-sign"');
    expect(source).toContain('href={`/horoscopes/${sign.slug}/`}');
  });

  it('uses the canonical shared shell, stays out of search, and bounds analytics', () => {
    expect(source).toContain('<Base\n  noindex\n  analyticsOnNoindex');
    expect(source).not.toContain('minimalChrome');
    expect(source).toContain("window.zodiacsAnalytics.track('bio_click'");
    expect(source).not.toMatch(/https?:\/\//u);
  });
});
