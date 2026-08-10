import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const distRoot = resolve(process.cwd(), 'dist');

function htmlFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

describe.skipIf(!existsSync(distRoot))('built client UI payloads', () => {
  it('inlines CSS only on the latency-sensitive Phase 1 entry pages', () => {
    const criticalPaths = [
      'today/index.html',
      ...[
        'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
        'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
      ].map((sign) => `horoscopes/${sign}/index.html`),
    ];

    for (const path of criticalPaths) {
      const html = readFileSync(join(distRoot, path), 'utf8');
      expect(html, path).toContain('<style data-zdx-critical=');
      expect(html, path).not.toMatch(/<link\b[^>]*\brel=["']stylesheet["']/i);
      expect(html, path).not.toContain('data-inline-critical-css');
    }

    const tomorrow = readFileSync(
      join(distRoot, 'horoscopes', 'aries', 'tomorrow', 'index.html'),
      'utf8',
    );
    expect(tomorrow).toMatch(/<link\b[^>]*\brel=["']stylesheet["']/i);
    expect(tomorrow).not.toContain('<style data-zdx-critical=');
  });

  it('installs one locale catalog before every island that uses shared UI copy', () => {
    const hydratedPages = htmlFiles(distRoot)
      .map((path) => ({ path, html: readFileSync(path, 'utf8') }))
      .filter(({ html }) => html.includes('<astro-island'));

    expect(hydratedPages.length).toBeGreaterThan(0);
    for (const { path, html } of hydratedPages) {
      const installs = html.match(/globalThis\.__ZDX_UI__/g) ?? [];
      const relativePath = relative(distRoot, path);
      const ownsItsCopy = relativePath === 'today/index.html'
        || /^horoscopes\/[^/]+\/index\.html$/.test(relativePath);
      if (html.includes('data-standalone-widget') || ownsItsCopy) {
        expect(installs, relative(distRoot, path)).toHaveLength(0);
        continue;
      }
      expect(installs, relative(distRoot, path)).toHaveLength(1);
    }
  });

  it('embeds the selected Portuguese catalog on a hydrated Portuguese page', () => {
    const html = readFileSync(join(distRoot, 'pt', 'birth-chart', 'index.html'), 'utf8');

    expect(html).toContain('globalThis.__ZDX_UI__');
    expect(html).toContain('"navCollect":"Terminal"');
    expect(html).toContain('"birthChart":"Mapa astral"');
  });

  it('embeds the selected French catalog on a hydrated French page', () => {
    const html = readFileSync(join(distRoot, 'fr', 'birth-chart', 'index.html'), 'utf8');

    expect(html).toContain('globalThis.__ZDX_UI__');
    expect(html).toContain('"navCollect":"Terminal"');
    expect(html).toContain('"birthChart":"Thème astral"');
  });

  it('embeds the selected Italian catalog on a hydrated Italian page', () => {
    const html = readFileSync(join(distRoot, 'it', 'birth-chart', 'index.html'), 'utf8');

    expect(html).toContain('globalThis.__ZDX_UI__');
    expect(html).toContain('"navCollect":"Terminal"');
    expect(html).toContain('"birthChart":"Tema natale"');
  });

  it.each(['aries/index.html', 'es/aries/index.html', 'pt/aries/index.html', 'fr/aries/index.html', 'it/aries/index.html'])(
    'keeps the zero-JS guide %s free of client catalog payloads',
    (path) => {
      const html = readFileSync(join(distRoot, path), 'utf8');

      expect(html).not.toContain('<astro-island');
      expect(html).not.toContain('globalThis.__ZDX_UI__');
    },
  );
});
