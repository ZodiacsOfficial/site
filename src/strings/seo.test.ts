import { describe, expect, it } from 'vitest';
import {
  BREADCRUMB_LABELS,
  OG_EN,
  ogAltForPath,
  ogImageForPath,
  ogSpecialForPath,
} from './seo.en.mjs';
import {
  breadcrumbLabelForLocale,
  ogAltForPathAndLocale,
  ogImageForPathAndLocale,
} from './seo';

describe('Astrofolio and Terminal SEO identity', () => {
  it('maps the consumer collection and expert routes to distinct copy', () => {
    expect(ogSpecialForPath('/terminal/')).toMatchObject({ key: 'astrofolio' });
    for (const path of [
      '/terminal/pro/',
      '/terminal/markets/',
      '/terminal/research/',
      '/terminal/research/sample-note/',
    ]) {
      expect(ogSpecialForPath(path), path).toMatchObject({ key: 'terminal' });
    }

    expect(ogAltForPath('/terminal/')).toContain('Astrofolio');
    expect(ogAltForPath('/terminal/pro/')).toContain('Terminal');
    expect(ogAltForPath('/terminal/')).not.toContain('—');
    expect(ogAltForPath('/terminal/pro/')).not.toContain('—');
    expect(ogAltForPath('/terminal/')).not.toContain('Zodiac Terminal');
    expect(ogAltForPath('/terminal/pro/')).not.toContain('Zodiac Terminal');
  });

  it('shares a neutral cache-stable image without sharing route-specific alt text', () => {
    expect(OG_EN.astrofolio.image).toBe('/assets/og/v5/the-twelve.png');
    expect(OG_EN.terminal.image).toBe(OG_EN.astrofolio.image);
    expect(ogImageForPath('/terminal/')).toBe(OG_EN.astrofolio.image);
    expect(ogImageForPath('/terminal/research/')).toBe(OG_EN.terminal.image);
    expect(OG_EN.wing.title).toBe('The Twelve');
    expect(OG_EN.wing.data).toBe('Astrofolio · Registry · Terminal');
  });

  it('localizes each route identity and its breadcrumb', () => {
    for (const locale of ['en', 'es', 'pt', 'fr', 'it', 'ru'] as const) {
      expect(ogImageForPathAndLocale('/terminal/', locale), locale)
        .toBe(OG_EN.astrofolio.image);
      expect(ogAltForPathAndLocale('/terminal/', locale), locale).toContain('Astrofolio');
      expect(ogAltForPathAndLocale('/terminal/pro/', locale), locale).toContain('Terminal');
      expect(breadcrumbLabelForLocale('terminal', locale), locale).toBe('Astrofolio');
      expect(breadcrumbLabelForLocale('markets', locale), locale).toContain('Terminal');
    }
    expect(BREADCRUMB_LABELS.terminal).toBe('Astrofolio');
    expect(BREADCRUMB_LABELS.markets).toBe('Terminal venue route');
  });
});
