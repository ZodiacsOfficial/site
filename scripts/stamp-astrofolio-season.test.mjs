import { describe, expect, it } from 'vitest';
import { stampAstrofolioSeason } from './stamp-astrofolio-season.mjs';

describe('Astrofolio build-season stamp', () => {
  it('selects one seasonal identity package across icons, manifest, lockup, and share card', () => {
    const source = [
      '<link rel="icon" href="/assets/astrofolio/v1/leo/favicon.svg" />',
      '<link rel="manifest" href="/assets/astrofolio/v1/leo/astrofolio.webmanifest" />',
      '<meta property="og:image" content="https://zodiacs.org/assets/astrofolio/v1/leo/og-1200x630.png" />',
      '<img src="/assets/astrofolio/v1/leo/icon-192.png" alt="">',
      '<img src="/assets/astrofolio/v2/zodiac-ring-192.png" alt="">',
      '<strong data-astrofolio-season-name style="--season-hue:#E0A9B4">Leo</strong> Season',
      '<input class="static-vitrine__choice" type="radio" id="astrofolio-leo" checked>',
      '<input class="static-vitrine__choice" type="radio" id="astrofolio-virgo">',
      '<input class="static-vitrine__choice" type="radio" id="astrofolio-libra">',
    ].join('\n');
    const stamped = stampAstrofolioSeason(source, 'virgo');
    expect(stamped).not.toContain('/leo/');
    expect(stamped.match(/\/assets\/astrofolio\/v2\/virgo\//gu)).toHaveLength(4);
    expect(stamped).toContain('/assets/astrofolio/v2/zodiac-ring-192.png');
    expect(stamped).toContain('style="--season-hue:#B7D9B0">Virgo</strong> Season');
    expect(stamped).not.toContain('id="astrofolio-leo" checked');
    expect(stamped).toContain('id="astrofolio-virgo" checked');

    const restamped = stampAstrofolioSeason(stamped, 'libra');
    expect(restamped).not.toContain('/virgo/');
    expect(restamped.match(/\/assets\/astrofolio\/v2\/libra\//gu)).toHaveLength(4);
    expect(restamped).toContain('style="--season-hue:#D3A9DE">Libra</strong> Season');
    expect(restamped).not.toContain('id="astrofolio-virgo" checked');
    expect(restamped).toContain('id="astrofolio-libra" checked');
  });

  it('refuses an unrelated page rather than claiming a successful stamp', () => {
    expect(() => stampAstrofolioSeason('<h1>Terminal</h1>', 'leo')).toThrow('could not find');
  });
});
