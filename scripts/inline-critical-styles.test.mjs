import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { htmlFiles, inlineCriticalStyles } from './inline-critical-styles.mjs';

const temporaryRoots = [];

async function fixture(styles = {}) {
  const root = await mkdtemp(join(tmpdir(), 'zdx-inline-css-'));
  temporaryRoots.push(root);
  await mkdir(join(root, '_astro'));
  for (const [name, css] of Object.entries(styles)) {
    await writeFile(join(root, '_astro', name), css);
  }
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })));
});

describe('inlineCriticalStyles', () => {
  it('ignores transient build directories and tolerates a vanished directory', async () => {
    const root = await fixture();
    await mkdir(join(root, '.prerender'));
    await writeFile(join(root, '.prerender', 'staging.html'), 'transient');
    await writeFile(join(root, 'visible.html'), 'deployable');

    expect(await htmlFiles(root)).toEqual([join(root, 'visible.html')]);
    expect(await htmlFiles(join(root, 'already-removed'))).toEqual([]);
  });

  it('preserves cascade order and leaves an unmarked page byte-identical', async () => {
    const root = await fixture({
      'base.css': ':root{--ink:#fff}',
      'route.css': '.hero{color:var(--ink)}',
    });
    const marked = '<html data-inline-critical-css><head>'
      + '<link rel="stylesheet" href="/_astro/base.css">'
      + '<link rel="stylesheet" href="/_astro/route.css">'
      + '</head><body></body></html>';
    const result = await inlineCriticalStyles(marked, root);

    expect(result.stylesheets).toBe(2);
    expect(result.html).not.toContain('data-inline-critical-css');
    expect(result.html.indexOf('--ink:#fff')).toBeLessThan(result.html.indexOf('.hero{'));

    const unmarked = '<html><head></head><body>untouched</body></html>';
    expect((await inlineCriticalStyles(unmarked, root)).html).toBe(unmarked);
  });

  it('defers noncritical tool styles without inline handlers or a no-JS gap', async () => {
    const root = await fixture({
      'Base.hash.css': ':root{--ink:#fff}',
      'calculator.hash.css': '.calc{color:var(--ink)}',
      'explorer.hash.css': '.explorer{display:grid}',
      'ChartCalculator.hash.css': '.reading{display:block}',
    });
    const marked = '<html data-inline-critical-css><head>'
      + '<link rel="stylesheet" href="/_astro/Base.hash.css">'
      + '<link rel="stylesheet" href="/_astro/calculator.hash.css">'
      + '<link rel="stylesheet" href="/_astro/explorer.hash.css">'
      + '<link rel="stylesheet" href="/_astro/ChartCalculator.hash.css">'
      + '</head><body></body></html>';
    const result = await inlineCriticalStyles(marked, root, { deferNonBase: true });

    expect(result.stylesheets).toBe(1);
    expect(result.html).toContain('<style data-zdx-critical="Base.hash.css">');
    expect(result.html.match(/<template data-zdx-deferred-style>/g)).toHaveLength(3);
    expect(result.html.match(/<noscript><link rel="stylesheet"/g)).toHaveLength(3);
    expect(result.html).toContain('data-zdx-deferred-style-loader');
    expect(result.html).toContain("window.addEventListener('load', schedule");
    expect(result.html).not.toMatch(/\bonload=/i);
    expect(result.html).not.toContain('data-inline-critical-css');
  });

  it.each([
    ['relative URL', '.x{background:url(../image.png)}', 'relative CSS URL'],
    ['CSS import', '@import "/other.css";', '@import is not safe'],
    ['style terminator', '.x{} </style><script>', 'unsafe style terminator'],
  ])('rejects %s before relocating CSS', async (_label, css, message) => {
    const root = await fixture({ 'unsafe.css': css });
    const html = '<html data-inline-critical-css><head>'
      + '<link rel="stylesheet" href="/_astro/unsafe.css">'
      + '</head></html>';

    await expect(inlineCriticalStyles(html, root)).rejects.toThrow(message);
  });

  it('rejects stylesheet paths outside the build asset directory', async () => {
    const root = await fixture();
    const html = '<html data-inline-critical-css><head>'
      + '<link rel="stylesheet" href="/../escape.css">'
      + '</head></html>';

    await expect(inlineCriticalStyles(html, root)).rejects.toThrow(
      'refusing non-build stylesheet',
    );
  });
});
