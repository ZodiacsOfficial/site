import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const signs = [
  ['aries', 'Aries'],
  ['taurus', 'Taurus'],
  ['gemini', 'Gemini'],
  ['cancer', 'Cancer'],
  ['leo', 'Leo'],
  ['virgo', 'Virgo'],
  ['libra', 'Libra'],
  ['scorpio', 'Scorpio'],
  ['sagittarius', 'Sagittarius'],
  ['capricorn', 'Capricorn'],
  ['aquarius', 'Aquarius'],
  ['pisces', 'Pisces'],
];

const read = (path) => readFile(resolve(root, path), 'utf8');

describe('registry pastel polish', () => {
  it('uses the canonical pastel derivatives in the annotated registry surfaces', async () => {
    const [source, bundle, registry] = await Promise.all([
      read('src/app.jsx'),
      read('public/assets/app.js'),
      read('public/registry/index.html'),
    ]);

    expect(source).toContain('src={`/assets/zodiac-icons/48/${s.asset.sign}.webp`}');
    expect(source).toContain('src={`/assets/zodiac-icons/128/${sign.asset.sign}.webp`}');
    expect(source).toContain('src={`/assets/zodiac-icons/48/${r.slug}.webp`}');
    expect(source).toContain('className="pulse__bar-k pulse__bar-k--sign"');
    const standings = source.slice(
      source.indexOf('function StandingsSection()'),
      source.indexOf('// ---- Shelf viewer'),
    );
    expect(standings).toContain('srcSet={`/assets/zodiac-icons/48/${slug}.avif`}');
    expect(standings).toContain('src={`/assets/zodiac-icons/48/${slug}.webp`}');
    expect(standings).not.toContain('src={`/assets/icons/${slug}.png`}');
    expect(bundle).toContain('/assets/zodiac-icons/48/');
    expect(bundle).toContain('/assets/zodiac-icons/128/');
    expect(registry).toContain('@media (prefers-reduced-transparency: reduce)');
    expect(registry).toContain('@media (prefers-contrast: more)');
  });

  it('uses a complete user-controlled desktop index and honest mobile overflow cues', async () => {
    const [source, bundle, registry] = await Promise.all([
      read('src/app.jsx'),
      read('public/assets/app.js'),
      read('public/registry/index.html'),
    ]);

    expect(source).toContain('className="strip__name"');
    expect(source).toContain("() => currentSeason()?.sign.ticker ?? SIGNS[0].ticker");
    expect(source).toContain("if (event.key === 'ArrowDown') nextIndex = activeIndex + 6;");
    expect(source).toContain('Swipe or scroll to choose');
    expect(source).not.toContain('SELECTOR_CYCLE_MS');
    expect(source).not.toContain('Auto-rotating · tap to pin');
    expect(source).not.toContain('Scroll or drag to explore');
    expect(bundle).not.toContain('Auto-rotating');
    expect(bundle).not.toContain('Scroll or drag');
    expect(registry).toContain('grid-template-columns: repeat(6, minmax(0, 1fr));');
    expect(registry).toContain('.strip__viewport.can-scroll-left::before');
    expect(registry).toContain('.strip__viewport.can-scroll-right::after');
    expect(registry).toContain('.strip__sub { display: none; }');
  });

  it('keeps one explanatory hero action and one canonical thesis section', async () => {
    const [source, registry] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);

    const hero = source.slice(source.indexOf('function CineHero()'), source.indexOf('function Hero('));
    expect(hero).toContain('The official public record for the twelve Zodiacs—verify each sign and explore its story.');
    expect(hero.match(/className="btn btn--primary"/g)).toHaveLength(1);
    expect(hero).not.toContain('REGISTRY_AURA_HERO_COPY');
    expect(hero).not.toContain('cine__why');
    expect(source).not.toContain('<a className="reg__story-link" href="/thesis/">');
    expect(registry).not.toContain('<p><a href="/thesis/">Read the Registry thesis →</a></p>');
    expect(source).toContain('id="thesis" className="phil reveal"');
    expect(source).toContain('Read the full thesis — belief is the oldest asset');
    expect(registry).not.toContain('registry-aura-hero:cta');
    expect(registry).not.toContain('cine__why');
  });

  it('uses a full-row, plain-English Registry Aura feature band', async () => {
    const [source, registry] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);

    expect(source).toContain("t: 'Verify a Zodiac'");
    expect(source).toContain("t: 'Read a collection'");
    expect(source).toContain("t: 'Build with the record'");
    expect(source).toContain('className="idctx__card idctx__card--aura"');
    expect(source).toContain('Public collection');
    expect(source).toContain('Saved chart');
    expect(source).toContain('Today’s sky');
    expect(registry).toContain('.idctx__card--aura {');
    expect(registry).toContain('grid-column: 1 / -1;');
    expect(registry).toContain('.static-site__card--aura {');
  });

  it('paints market direction after generic values and includes an explicit flat state', async () => {
    const [source, registry] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);

    expect(source.match(/market__change--flat/g)?.length).toBeGreaterThanOrEqual(2);
    expect(registry).toContain('--market-up:     #A9D4C4;');
    expect(registry).toContain('--market-flat:   #8E96AB;');
    const valueRule = registry.indexOf('.standings__v {');
    const directionRule = registry.indexOf('.market__change--up {', valueRule);
    expect(valueRule).toBeGreaterThan(-1);
    expect(directionRule).toBeGreaterThan(valueRule);
    expect(registry.slice(directionRule)).toContain('.market__change--down { color: var(--vermilion); }');
    expect(registry.slice(directionRule)).toContain('.market__change--flat { color: var(--market-flat); }');
  });

  it.each(signs)('renders the %s lot title with one decorative pastel disc', async (slug, name) => {
    const html = await read(`public/registry/${slug}/index.html`);
    const title = `<h1 class="lot__title" id="lot-title">${name} <picture class="lot__title-icon" aria-hidden="true">`;

    expect(html).toContain(title);
    expect(html).toContain(`srcset="/assets/zodiac-icons/400/${slug}.avif"`);
    expect(html).toContain(`src="/assets/zodiac-icons/400/${slug}.webp"`);
    expect(html).toContain('width="112" height="112" alt=""');
    expect(html).not.toContain('class="lot__icon"');
    expect(html).not.toContain('<span class="glyph">');
  });

  it('adds one decorative pastel disc after every thesis sign name', async () => {
    const thesis = await read('public/thesis/index.html');

    for (const [slug, name] of signs) {
      expect(thesis).toContain(
        `<span class="disc-sign">${name}<img class="disc-sign__icon" src="/assets/zodiac-icons/48/${slug}.webp" width="18" height="18" alt=""`,
      );
    }
    expect(thesis.match(/class="disc-sign__icon"/g)).toHaveLength(12);
  });
});
