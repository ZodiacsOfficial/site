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

    expect(source).toContain('src="/assets/zodiac-icons/48/${s.asset.sign}.webp"');
    expect(source).toContain('src={`/assets/zodiac-icons/48/${item.asset.sign}.webp`}');
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

    // The disc rail walks with the arrow keys and keeps a roving tabstop,
    // the contract the pastel grid it replaced always had.
    expect(source).toContain("return currentSeason()?.sign.ticker ?? SIGNS[0].ticker");
    expect(source).toContain("new URLSearchParams(window.location.search).get('sign')");
    expect(source).toContain('ArrowRight: activeIndex + 1,');
    expect(source).toContain('ArrowLeft: activeIndex - 1,');
    expect(source).toContain('End: SIGNS.length - 1');
    expect(source).toContain('tabIndex={isActive ? 0 : -1}');
    expect(source).toContain('Drag to browse · Choose a sign to open.');
    expect(source).not.toContain('SELECTOR_CYCLE_MS');
    expect(source).not.toContain('Auto-rotating · tap to pin');
    expect(source).not.toContain('Scroll or drag to explore');
    expect(bundle).not.toContain('Auto-rotating');
    expect(bundle).not.toContain('Scroll or drag');
    // The stage rail paints from inert placeholder discs until the scene
    // bundle swaps in the live ticks; the ranked board remains a card list.
    expect(registry).toContain('.rail__tick--placeholder');
    expect(registry).toContain('.market-board__rows');
    expect(registry).toContain('.market-tape__track');
  });

  it('keeps the display-only market tape moving until reduced motion requests native flow', async () => {
    const [source, registry] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);
    const tapeSource = source.slice(
      source.indexOf('function MarketTape('),
      source.indexOf('function SeasonNow('),
    );
    const tapeRules = registry.slice(
      registry.indexOf('.market-tape {'),
      registry.indexOf('.consumer-market {'),
    );
    const materialPass = registry.indexOf('Registry material pass');
    const reducedStart = registry.lastIndexOf('@media (prefers-reduced-motion: reduce)', materialPass);
    const reducedRules = registry.slice(reducedStart, materialPass);

    expect(tapeSource).toContain("{renderItems('primary')}");
    expect(tapeSource).toContain("{renderItems('echo')}");
    expect(tapeSource).not.toContain('<button');
    expect(tapeSource).not.toContain('<a ');
    expect(tapeRules).toContain('animation: registry-market-loop');
    expect(tapeRules).not.toContain('button.market-tape__item');
    expect(tapeRules).not.toContain('.market-tape:hover');
    expect(tapeRules).not.toContain('.market-tape:focus-within');
    expect(tapeRules).not.toContain('.market-tape:active');
    expect(tapeRules).toMatch(/\.market-tape\[data-paused\] \.market-tape__track \{\s*animation-play-state: paused;/u);
    expect(reducedRules).toContain('.market-tape__viewport { overflow-x: auto;');
    expect(reducedRules).toContain('.market-tape__track { animation: none; will-change: auto; }');
    expect(reducedRules).toContain(".market-tape__group[aria-hidden='true'] { display: none; }");
  });

  it('opens on the plate and keeps the optional Cabinet in the purpose section', async () => {
    const [source, registry] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);

    // The film and large editorial title card are retired: the gallery itself
    // is the opening scene, led by the compact season instrument.
    expect(source).not.toContain('function CineHero(');
    expect(source).not.toContain('className="cine__frame"');
    const stage = source.slice(
      source.indexOf('function GalleryBand('),
      source.indexOf('function ConsumerExplorer('),
    );
    expect(stage).toContain('<SeasonNow season={season} />');
    expect(stage).not.toContain('className="stage-hero__head"');
    expect(stage).not.toContain('One official token for every sign. Browse the sculptures, watch the market, and verify the record.');
    expect(stage).not.toContain('Open the Cabinet');
    expect(source).toContain("return `/registry/${sign?.asset?.sign ?? 'aries'}/`;");
    // The no-JS shell keeps its own hero and its own browse anchor.
    expect(registry).toContain('href="#official-twelve" data-registry-browse');
    expect(source).toContain('id="thesis" className="consumer-purpose reveal"');
    expect(source).toContain('REGISTRY_AURA_ENABLED &&');
    expect(source).toContain('See occupied signs, material editions, and wheel coverage for any public wallet.');
    expect(source).toContain('Read why Zodiacs matter');
    expect(registry).toContain('registry-collection-hero:slot');
    expect(registry).not.toContain('cine__why');
    expect(registry).toContain('.cine__cta .btn--ghost::after { content: none; }');
  });

  it('turns market controls into restrained glass with accessible solid fallbacks', async () => {
    const [source, registry] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);
    const materialPass = registry.slice(registry.indexOf('Registry material pass'));
    const glassRule = materialPass.slice(
      materialPass.indexOf('.market-glass,'),
      materialPass.indexOf('.market-glass::before,'),
    );

    expect(source).toContain('className="market-glass"');
    expect(source).toContain('className="market-glass market-board__share-primary"');
    expect(source).toContain('className="market-glass market-board__social"');
    expect(source).toContain('className="market-row__record market-glass"');
    expect(source).not.toContain('className="market-row__view');
    expect(materialPass).toContain('.market-glass,');
    expect(glassRule).toContain('linear-gradient');
    expect(glassRule).toContain('box-shadow:');
    expect(glassRule).toContain('inset');
    expect(glassRule).toContain('backdrop-filter: none;');
    expect(materialPass).toContain('.market-glass::before,');
    expect(materialPass).toContain('.market-board__sort button,');
    expect(materialPass).toContain('min-height: 44px;');
    expect(materialPass).toContain('.market-board__socials { display: flex;');
    expect(materialPass).toContain('.market-board__social {');
    expect(materialPass).toContain('width: 44px;');
    // Repeated record links are painted glass, not twelve independent
    // backdrop blurs fighting the phone compositor.
    expect(materialPass).toMatch(/\.market-row__record \{[\s\S]*?backdrop-filter: none;/u);
    expect(materialPass).toMatch(/@media \(prefers-reduced-transparency: reduce\) \{[\s\S]*?background: #11141b;[\s\S]*?backdrop-filter: none;/u);
    expect(materialPass).toMatch(/@media \(prefers-contrast: more\) \{[\s\S]*?border-color: rgba\(238,241,247,\.55\);/u);
  });

  it('uses recognizable sign media and the Cabinet\'s canonical curator sample', async () => {
    const source = await read('src/app.jsx');
    const how = source.slice(
      source.indexOf('function ConsumerHowItWorks()'),
      source.indexOf('function ConsumerPurpose()'),
    );
    const purpose = source.slice(
      source.indexOf('function ConsumerPurpose()'),
      source.indexOf('function ConsumerFaq()'),
    );

    for (const marker of [
      "['aries', 'leo', 'pisces']",
      '/assets/zodiac-icons/48/leo.webp',
      '8Cd7…b8Qm',
      'Choose a sign',
      'Match the address',
      'Recognize it anywhere',
    ]) expect(how).toContain(marker);

    for (const [slug, finish, numeral, count] of [
      ['aries', 'crown', 'V', '×12'],
      ['cancer', 'pastel', 'I', null],
      ['leo', 'bronze', 'II', null],
      ['scorpio', 'silver', 'III', null],
      ['aquarius', 'gold', 'IV', '×3'],
    ]) {
      const countFragment = count ? `, count: '${count}'` : '';
      expect(purpose).toContain(`${slug}: { finish: '${finish}', numeral: '${numeral}'${countFragment} }`);
    }
    expect(purpose).toContain("edition?.finish === 'gold' || edition?.finish === 'crown'");
    expect(purpose).toContain('`/assets/cabinet-materials/gold/${item.asset.sign}`');
    expect(purpose).toContain('`/assets/zodiac-icons/128/${item.asset.sign}`');
    expect(purpose).toContain('data-cabinet-sample-finish={edition?.finish}');
    expect(purpose).toContain('className="consumer-cabinet__edition"');
    expect(purpose).toContain('className="consumer-cabinet__count"');
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
