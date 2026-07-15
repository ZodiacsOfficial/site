import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const legacyIconPath = ['/assets', 'icons'].join('/') + '/';
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
    expect(source).toContain('src={`/assets/zodiac-icons/48/${slug}.webp`}');
    expect(source).toContain('src={`/assets/zodiac-icons/48/${h.sign.asset.sign}.webp`}');
    expect(source).not.toContain(legacyIconPath);
    expect(source).toContain('className="pulse__bar-k pulse__bar-k--sign"');
    expect(bundle).toContain('/assets/zodiac-icons/48/');
    expect(bundle).toContain('/assets/zodiac-icons/128/');
    expect(bundle).not.toContain(legacyIconPath);
    expect(registry).toContain('@media (prefers-reduced-transparency: reduce)');
    expect(registry).toContain('@media (prefers-contrast: more)');
  });

  it('routes both rendered hero variants to the thesis with the requested label', async () => {
    const [source, registry] = await Promise.all([
      read('src/app.jsx'),
      read('public/registry/index.html'),
    ]);

    expect(source).toContain('<a className="btn" href="/thesis/">');
    expect(source).toContain('<span>The Thesis</span>');
    expect(registry).toContain('<a class="btn" href="/thesis/"><span>The Thesis</span></a>');
  });

  it.each(signs)('renders the %s lot title with one decorative pastel disc', async (slug, name) => {
    const html = await read(`public/registry/${slug}/index.html`);
    const title = `<h1 class="lot__title" id="lot-title">${name} <picture class="lot__title-icon" aria-hidden="true">`;

    expect(html).toContain(title);
    expect(html).toContain(`srcset="/assets/zodiac-icons/400/${slug}.avif"`);
    expect(html).toContain(`src="/assets/zodiac-icons/400/${slug}.webp"`);
    expect(html).toContain('width="112" height="112" alt=""');
    expect(html.match(/\/assets\/zodiac-icons\/48\/[a-z-]+\.webp/g)).toHaveLength(12);
    expect(html).not.toContain(legacyIconPath);
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

  it('uses neutral silver-bright naming throughout the Registry wing', async () => {
    const paths = [
      'scripts/build-sign-pages.mjs',
      'scripts/build-archive.mjs',
      'public/assets/discovery.css',
      'public/registry/index.html',
      ...signs.map(([slug]) => `public/registry/${slug}/index.html`),
      'public/archive/index.html',
      'public/sdk/index.html',
      'public/thesis/index.html',
    ];
    const files = await Promise.all(paths.map(read));

    expect(files.every((file) => file.includes('--silver-bright'))).toBe(true);
    expect(files.every((file) => !file.includes('--gold-bright'))).toBe(true);
  });
});
