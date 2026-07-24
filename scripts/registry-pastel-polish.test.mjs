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

  it('keeps one primary hero action plus one flag-gated Cabinet action and one canonical thesis section', async () => {
    const [source, registry] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);

    const hero = source.slice(source.indexOf('function CineHero('), source.indexOf('function Hero('));
    expect(hero).toContain('Meet the twelve signs through their symbols, stories, and living traditions.');
    expect(hero.match(/className="btn btn--primary"/g)).toHaveLength(1);
    expect(hero.match(/className="btn btn--ghost"/g)).toHaveLength(1);
    expect(hero).toContain('REGISTRY_AURA_ENABLED &&');
    expect(hero).toContain('REGISTRY_AURA_HERO_COPY.ariaLabel');
    expect(hero).toContain('data-registry-browse');
    expect(hero).not.toContain('cine__why');
    expect(source).toContain("return `/registry/${sign?.asset?.sign ?? 'aries'}/`;");
    expect(registry).toContain('href="/registry/aries/" data-registry-browse');
    expect(source).not.toContain('<a className="reg__story-link" href="/thesis/">');
    expect(registry).not.toContain('<p><a href="/thesis/">Read the Registry thesis →</a></p>');
    expect(source).toContain('id="thesis" className="phil reveal"');
    expect(source).toContain('Read the full thesis — belief is the oldest asset');
    expect(registry).toContain('registry-collection-hero:slot');
    expect(registry).not.toContain('cine__why');
    expect(registry).toContain('.cine__cta .btn--ghost::after { content: none; }');
  });

  it('keeps the wing nav on the shared compact and desktop geometry contract', async () => {
    const [wingNav, registry, thesis, sdk, source, siteNav] = await Promise.all([
      read('scripts/wing-nav.mjs'),
      read('public/registry/index.html'),
      read('public/thesis/index.html'),
      read('public/sdk/index.html'),
      read('src/app.jsx'),
      read('src/components/SiteNav.astro'),
    ]);

    for (const value of [wingNav, registry, thesis, sdk]) {
      expect(value).toContain('height: 52px; padding: 0 10px 0 20px;');
      expect(value).toContain('gap: 10px;');
      expect(value).toContain('@media (min-width: 820px) { .wnav { gap: 18px; } }');
      expect(value).toContain('rgba(198,204,218,0.16)');
      expect(value).toContain('width: 34px; height: 34px;');
      expect(value).toContain('width: 18px; height: 1.5px;');
      expect(value).toContain('position: absolute; top: 50%; left: 50%;');
      expect(value).toContain('translate(-50%, calc(-50% - 5px))');
      expect(value).toContain('translate(-50%, calc(-50% + 5px))');
      expect(value).toContain('transform 220ms cubic-bezier(0.77,0,0.175,1)');
      expect(value).toContain('letter-spacing: 0.08em;');
      expect(value).toContain('@media (min-width: 820px) { .wnav__chip { letter-spacing: 0.14em; } }');
      expect(value).toContain('@media (max-width: 819.5px) { .wnav__sep, .wnav__dim { display: none; } }');
      expect(value).toContain('padding-top: env(safe-area-inset-top);');
      expect(value).toContain('border: 1px solid rgba(198,204,218,0.16);');
      expect(value).toContain('border-left: 1px solid rgba(198,204,218,0.16);');
      expect(value).toContain('wnav-menu__registry');
      expect(value).toContain('wnav-menu__tools');
      expect(value).toContain('wnav-menu__tool');
      expect(value).toContain('background: rgba(6,7,9,0.88)');
      expect(value).toContain('padding: calc(96px + env(safe-area-inset-top)) 24px 40px;');
      expect(value).not.toContain('.wnav-menu > nav { max-width: 520px; margin: 0 auto; }');
      expect(value).not.toContain('@keyframes wnav-in');
    }
    for (const value of [wingNav, thesis, sdk]) expect(value).toContain('>Tools</span>');
    for (const [href, name] of [
      ['/birth-chart/', 'Birth chart'],
      ['/compatibility/', 'Compatibility'],
      ['/transits/', 'Transits'],
      ['/moon-sign/', 'Moon sign'],
      ['/rising-sign/', 'Rising sign'],
      ['/moon-phase/', 'Moon phase'],
      ['/saturn-return/', 'Saturn return'],
      ['/birthday/', 'Birthday'],
    ]) {
      expect(wingNav).toContain(`{ href: '${href}', name: '${name}', description:`);
      expect(source).toContain(`{ href: '${href}', name: '${name}', description:`);
      for (const output of [thesis, sdk]) {
        expect(output).toContain(`href="${href}" aria-label="${name}.`);
        expect(output).toContain(`>${name}</a>`);
      }
    }
    for (const output of [thesis, sdk]) {
      expect(output).toContain('class="wnav-menu__sign" style="--i:0;--sign:#DE8E79"');
      expect(output).toContain('class="wnav-menu__sign" style="--i:11;--sign:#A9D4C4"');
    }
    expect(siteNav).toContain('.mobile-menu__tool:last-child { border-bottom: 0; }');
    expect(source).toContain('<span className="wnav__sep">·</span><span className="wnav__dim">org</span>');
    expect(source).toContain('<span className="wnav-menu__label">Tools</span>');
    expect(source).toContain('wnav-menu__registry');
    expect(source).toContain('className="wnav-menu__tool"');
  });

  it('uses a full-row, plain-English Registry Collection feature band', async () => {
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
    const nextIndex = (signs.findIndex(([candidate]) => candidate === slug) + 1) % signs.length;
    const [nextSlug, nextName] = signs[nextIndex];

    expect(html).toContain(title);
    expect(html).toContain(`srcset="/assets/zodiac-icons/400/${slug}.avif"`);
    expect(html).toContain(`src="/assets/zodiac-icons/400/${slug}.webp"`);
    expect(html).toContain('width="112" height="112" alt=""');
    expect(html).not.toContain('class="lot__icon"');
    expect(html).not.toContain('<span class="glyph">');
    expect(html).toContain('padding: calc(94px + env(safe-area-inset-top)) 0 36px;');
    expect(html).toContain(`<span class="lot__eyebrow">Catalogue <span class="g">/</span> Lot`);
    expect(html).not.toContain(`of XII <span class="g">·</span> ${name.toUpperCase()}`);
    expect(html).toContain('class="lot__meta"');
    expect(html).toContain('min-height: 44px;');
    expect(html).toContain(`class="lot__next" href="/registry/${nextSlug}/" aria-label="Next record, ${nextName}"`);
    expect(html).toContain(`/assets/zodiac-icons/48/${nextSlug}.avif`);
    expect(html).toContain(`/assets/zodiac-icons/48/${nextSlug}.webp`);
    expect(html).toContain(`<span>Next record <strong>· ${nextName}</strong></span>`);
    expect(html).not.toContain('.lot__next { position: absolute;');
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
