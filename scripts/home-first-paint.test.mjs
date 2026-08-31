import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fontRoot = resolve(repositoryRoot, 'public/assets/home');

/**
 * Reproducible fontTools coverage used by the route-owned font files:
 *
 * U+0020-007E,U+00A9,U+00B0,U+00B1,U+00B7,U+00D7,U+00E1,U+00E7,
 * U+00EA,U+00F1,U+2013-2014,U+2019,U+201C-201D,U+2022,U+2026,
 * U+2032,U+2191,U+2193,U+2212
 *
 * pyftsubset SOURCE --output-file=TARGET --flavor=woff2
 *   --unicodes=CODEPOINTS --layout-features=kern,liga --no-hinting
 *
 * The source Latin faces do not own the horizontal/external-link arrows used
 * on the page; those characters deliberately retain the established system
 * fallback instead of causing a second full-font download.
 */
const fontContract = [
  {
    file: 'eb-garamond-home-400-core.woff2',
    source: 'public/fonts/eb-garamond-latin-400-normal.woff2',
    sha256: '815a63e9dd8466897f1b84a1751975d0eb0ce9608aa34ff4321380914541d8ad',
  },
];

describe('homepage first-paint assets', () => {
  it.each(fontContract)('pins the deterministic $file subset', async ({ file, source, sha256 }) => {
    const [subset, full] = await Promise.all([
      readFile(resolve(fontRoot, file)),
      readFile(resolve(repositoryRoot, source)),
    ]);

    expect(subset.subarray(0, 4).toString('ascii')).toBe('wOF2');
    expect(subset.byteLength).toBeLessThan(full.byteLength);
    expect(createHash('sha256').update(subset).digest('hex')).toBe(sha256);
  });

  it('keeps one optional display face and avoids nonessential font downloads', async () => {
    const css = await readFile(resolve(repositoryRoot, 'src/home/home-first-paint.css'), 'utf8');

    expect(css.match(/font-display: optional;/g)).toHaveLength(1);
    expect(css).not.toContain('font-display: swap;');
    expect(css).not.toMatch(/'Instrument Sans',|'EB Garamond',|'JetBrains Mono',/);
    expect(css).not.toMatch(/instrument-sans-home|jetbrains-mono-home/u);
    for (const { file } of fontContract) expect(css).toContain(`/assets/home/${file}`);
  });

  it.skipIf(!existsSync(resolve(repositoryRoot, 'dist/index.html')))(
    'discovers the poster first and installs client copy after the hero',
    async () => {
      const html = await readFile(resolve(repositoryRoot, 'dist/index.html'), 'utf8');
      const posterHint = html.indexOf('href="/assets/hero/zodiacs-hero-poster-mobile.avif"');
      const criticalBase = html.indexOf('data-zdx-critical=');
      const hero = html.indexOf('<section class="hero');
      const catalog = html.indexOf('globalThis.__ZDX_UI__');
      const firstIsland = html.indexOf('<astro-island');

      expect(posterHint).toBeGreaterThanOrEqual(0);
      expect(posterHint).toBeLessThan(criticalBase);
      expect(hero).toBeGreaterThan(criticalBase);
      expect(catalog).toBeGreaterThan(hero);
      expect(catalog).toBeLessThan(firstIsland);
    },
  );
});
