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

function cssRule(source, selector) {
  const start = source.indexOf(selector);
  expect(start, `${selector} exists`).toBeGreaterThanOrEqual(0);
  const open = source.indexOf('{', start);
  const close = source.indexOf('}', open);
  return source.slice(start, close + 1);
}

describe('registry pastel polish', () => {
  it('uses canonical sign discs and gold sculpture derivatives in the Lit Vitrine', async () => {
    const source = await read('src/app.jsx');
    expect(source).toContain('srcSet={`/assets/zodiac-icons/48/${item.asset.sign}.avif`}');
    expect(source).toContain('src={`/assets/zodiac-icons/48/${item.asset.sign}.webp`}');
    expect(source).toContain('src={`/assets/sculptures/512/${layer.slug}.webp`}');
    expect(source).toContain('srcSet={`/assets/sculptures/512/${layer.slug}.webp 512w, /assets/sculptures/1024/${layer.slug}.webp 1024w`}');
    expect(source).toContain('alt={layer.current ? `${item.name} gold sculpture` : \'\'}');
  });

  it('keeps every selector disc pastel and reserves the selected hue for the ring, atmosphere, and movement', async () => {
    const [css, html] = await Promise.all([
      read('src/terminal/split-styles.css'),
      read('public/terminal/index.html'),
    ]);
    const lit = css.slice(css.indexOf('/* Astrofolio · Lit Vitrine'));
    expect(lit).toContain('color-mix(in srgb, var(--active-sign) 13%, transparent)');
    expect(lit).toContain('0 0 0 4px var(--sign);');
    expect(lit).toContain('color: var(--active-sign);');
    const hydratedDisc = cssRule(lit, '.consumer-registry .vitrine-disc img {');
    expect(hydratedDisc).toContain('width: 42px;');
    expect(hydratedDisc).toContain('height: 42px;');
    expect(hydratedDisc).toContain('margin: 4px auto;');
    expect(hydratedDisc).toContain('opacity: .86;');
    expect(hydratedDisc).toContain('filter: none;');
    expect(hydratedDisc).not.toContain('grayscale');
    expect(lit).toContain('.consumer-registry .vitrine-disc picture > source { display: none; }');
    expect(lit).toContain('.consumer-registry .vitrine-disc.is-active img { opacity: 1; }');
    expect(html).toContain('<span class="static-vitrine__disc"><img src="/assets/zodiac-icons/48/leo.webp"');
    expect(html).toContain('.static-vitrine__rail label:has(.static-vitrine__choice:checked) .static-vitrine__disc {');
    expect(html).toContain('0 0 0 4px var(--disc);');
    expect(cssRule(html, '.static-vitrine__rail img {')).toContain('filter: none;');
    expect(lit).not.toContain('var(--gold)');
    expect(lit).not.toContain('var(--gold-bright)');
    expect(lit).not.toContain('var(--gold-deep)');
  });

  it('keeps the warm halo behind the sculpture and neutral UI chrome', async () => {
    const css = await read('src/terminal/split-styles.css');
    const halo = cssRule(css, '.consumer-registry .vitrine-stage::before {');
    const primary = cssRule(css, '.consumer-registry .vitrine-placard__actions .btn--primary {');
    const buttons = cssRule(css, '.consumer-registry .vitrine-placard__actions .btn {');
    expect(halo).toContain('radial-gradient');
    expect(halo).toContain('rgba(215, 173, 105, .15)');
    expect(primary).toContain('background: var(--ink);');
    expect(primary).toContain('color: var(--bg);');
    expect(buttons).toContain('background: transparent;');
    expect(buttons).not.toMatch(/--active-sign|--sign|215, 173, 105/u);
  });

  it('pins the Lit Vitrine typography roles and removes consumer mono-caps labels', async () => {
    const css = await read('src/terminal/split-styles.css');
    const lit = css.slice(css.indexOf('/* Astrofolio · Lit Vitrine'));
    expect(cssRule(lit, '.consumer-registry .terminal-consumer-hero__kicker {')).toContain('font: italic 500');
    expect(cssRule(lit, '.consumer-registry .terminal-consumer-hero h1 {')).toContain('var(--serif)');
    expect(cssRule(lit, '.consumer-registry .vitrine-placard__identity h2 {')).toContain('var(--serif)');
    expect(cssRule(lit, '.consumer-registry .consumer-section-head h2,')).toContain('var(--serif)');
    expect(cssRule(lit, '.consumer-registry .vitrine-price__figure {')).toContain('var(--mono)');
    expect(cssRule(lit, '.consumer-registry .vitrine-price__figure {')).toContain('font-variant-numeric: tabular-nums;');
    expect(cssRule(lit, '.consumer-registry .vitrine-disc {')).toContain('var(--sans)');
    expect(lit).toContain('.consumer-registry .consumer-section-head__eyebrow { display: none; }');
    expect(lit).toContain('letter-spacing: 0;');
    expect(lit).toContain('text-transform: none;');
  });

  it('pins opacity-only crossfades, stable stage geometry, and quiet entrances', async () => {
    const css = await read('src/terminal/split-styles.css');
    const lit = css.slice(css.indexOf('/* Astrofolio · Lit Vitrine'));
    const stageLayer = cssRule(lit, '.consumer-registry .vitrine-stage__layer {');
    const placardLayer = cssRule(lit, '.consumer-registry .vitrine-placard__layer {');
    const reveal = cssRule(lit, '.consumer-registry .reveal {');
    const stage = cssRule(lit, '.consumer-registry .vitrine-stage {');
    expect(stageLayer).toContain('position: absolute;');
    expect(stageLayer).toContain('transition: opacity 180ms linear;');
    expect(stageLayer).not.toMatch(/transition:[^;]*(?:transform|filter)/u);
    expect(placardLayer).toContain('position: absolute;');
    expect(placardLayer).toContain('transition: opacity 180ms linear;');
    expect(placardLayer).not.toMatch(/transition:[^;]*(?:transform|filter)/u);
    expect(reveal).toContain('transition: opacity 240ms linear !important;');
    expect(reveal).toContain('transform: none !important;');
    expect(reveal).toContain('filter: none !important;');
    expect(stage).toContain('width: min(100%, calc(var(--vitrine-stage-height, 520px) * 1.2));');
    expect(stage).toContain('height: auto;');
    expect(stage).toContain('aspect-ratio: 6 / 5;');
    expect(lit).toContain('aspect-ratio: 4 / 5;');
    expect(lit).toContain('scroll-snap-type: x mandatory;');
    expect(lit).toContain('transition: none;');
  });

  it('pins the 0.98 press response and disables all consumer motion on request', async () => {
    const css = await read('src/terminal/split-styles.css');
    const lit = css.slice(css.indexOf('/* Astrofolio · Lit Vitrine'));
    expect(lit).toContain('transition: transform 80ms ease, border-color 120ms linear, background-color 120ms linear;');
    expect(lit).toContain('.consumer-registry .vitrine-placard__actions .btn:active { transform: scale(.98); }');
    expect(lit).toContain('.consumer-registry .vrf__submit:active,');
    expect(lit).toContain('.consumer-registry .vrf__example:active { transform: scale(.98); }');
    const reduced = lit.slice(lit.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('animation: none !important;');
    expect(reduced).toContain('transition: none !important;');
    expect(reduced).toContain('.consumer-registry .reveal { opacity: 1; }');
    expect(reduced).toContain('.consumer-registry .vitrine-placard__actions .btn:active,');
    expect(reduced).toContain('.consumer-registry .vrf__example:active { transform: none; }');
  });

  it('limits the unfolding composition to three major hairlines and no dashboard boxes', async () => {
    const [source, css] = await Promise.all([
      read('src/app.jsx'),
      read('src/terminal/split-styles.css'),
    ]);
    expect(source.match(/data-vitrine-rule/gu)).toHaveLength(3);
    expect(css).toContain('.consumer-registry > [data-vitrine-rule]::before {');
    expect(css).toContain('height: 1px;');
    const sections = cssRule(css, '.consumer-registry > .consumer-buy,');
    expect(sections).toContain('border: 0;');
    expect(sections).toContain('background: transparent;');
    expect(sections).toContain('box-shadow: none;');
    expect(css).toContain('--gold: var(--ink-2);');
    expect(css).toContain('--gold-bright: var(--ink);');
    expect(css).toContain('.consumer-registry .astrofolio-vitrine::after { content: none; }');
    expect(css).toContain('outline-color: var(--ink-2);');
    expect(css).not.toContain('outline-color: var(--active-sign');
    expect(css).toContain('grid-template-columns: none;');
    expect(css).toContain('isolation: auto;');
    expect(css).toContain('.consumer-registry .consumer-closing__registry:hover .consumer-closing__arrow { transform: none; }');
    expect(css).toContain('.consumer-registry .ftr .mark .g { color: var(--ink-2); }');
    expect(css).toContain('.consumer-registry .consumer-thesis__link:hover .consumer-thesis__visual img { transform: none; }');
  });

  it('keeps the committed collection flag off and its generator slots inert', async () => {
    const html = await read('public/terminal/index.html');
    expect(html).toContain('<meta name="zodiacs-registry-collection-enabled" content="0" />');
    expect(html).toContain('<div hidden aria-hidden="true"><!-- registry-collection-hero:slot --></div>');
    expect(html).toContain('<div hidden aria-hidden="true"><!-- registry-collection-entry:slot --></div>');
  });

  it('keeps the wing nav on the shared compact and desktop geometry contract', async () => {
    const [wingNav, registry, thesis, sdk, source, siteNav] = await Promise.all([
      read('scripts/wing-nav.mjs'),
      read('public/terminal/index.html'),
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
    expect(thesis).toContain('<a class="wnav__chip" href="/terminal/">Astrofolio</a>');
    expect(thesis).toContain('<span>Astrofolio</span><small>Your sign’s sculpture, official token, and buying guide</small>');
    expect(thesis).not.toContain('<a class="wnav__chip" href="/terminal/">Terminal</a>');
    expect(siteNav).toContain('.mobile-menu__tool:last-child { border-bottom: 0; }');
    expect(source).toContain('<span className="wnav__sep">·</span><span className="wnav__dim">org</span>');
    expect(source).toContain('<span className="wnav-menu__label">Tools</span>');
    expect(source).toContain('wnav-menu__registry');
    expect(source).toContain('className="wnav-menu__tool"');
  });

  it('paints technical market direction after generic values and includes a flat state', async () => {
    const [source, registry] = await Promise.all([
      read('src/app.jsx'),
      read('public/terminal/index.html'),
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

  it.each(signs)('renders the %s token record in plain language with market and constellation context', async (slug, name) => {
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
    expect(html).toContain(`<span class="lot__eyebrow">Official Zodiac Token <span class="g">·</span> Sign`);
    expect(html).toContain(`${name} is the transferable token for the ${name} sign. The gold sculpture is its collection artwork—not a physical sculpture or a one-of-one NFT.`);
    for (const heading of [
      'Token facts',
      `What ${name} represents`,
      `The story behind ${name}`,
      'Official addresses',
      `Get ${name}`,
      'Explore all 12',
    ]) expect(html).toContain(heading);
    for (const retired of ['Museum label', 'Catalogue note', '>Provenance<', '>Acquisition<']) {
      expect(html).not.toContain(retired);
    }
    expect(html).toContain(`src="/assets/constellations/${slug}.svg"`);
    expect(html).toContain('HYG Database v4.0');
    expect(html).toContain('CC BY-SA 4.0');
    expect(html).toContain('they are not official IAU boundaries');
    expect(html).toContain('data-market-chart');
    expect(html).toContain('Open live chart');
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
