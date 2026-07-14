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
  it('installs one locale catalog before every Astro island hydrates', () => {
    const hydratedPages = htmlFiles(distRoot)
      .map((path) => ({ path, html: readFileSync(path, 'utf8') }))
      .filter(({ html }) => html.includes('<astro-island'));

    expect(hydratedPages.length).toBeGreaterThan(0);
    for (const { path, html } of hydratedPages) {
      const installs = html.match(/globalThis\.__ZDX_UI__/g) ?? [];
      expect(installs, relative(distRoot, path)).toHaveLength(1);
    }
  });

  it('embeds the selected Portuguese catalog on a hydrated Portuguese page', () => {
    const html = readFileSync(join(distRoot, 'pt', 'birth-chart', 'index.html'), 'utf8');

    expect(html).toContain('globalThis.__ZDX_UI__');
    expect(html).toContain('"navCollect":"Registro"');
    expect(html).toContain('"birthChart":"Mapa astral"');
  });

  it.each(['aries/index.html', 'es/aries/index.html', 'pt/aries/index.html'])(
    'keeps the zero-JS guide %s free of client catalog payloads',
    (path) => {
      const html = readFileSync(join(distRoot, path), 'utf8');

      expect(html).not.toContain('<astro-island');
      expect(html).not.toContain('globalThis.__ZDX_UI__');
    },
  );
});
