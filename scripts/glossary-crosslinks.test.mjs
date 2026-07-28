import { readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GLOSSARY } from '../src/data/glossary.ts';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targetPattern = /\/learn\/glossary\/#([a-z0-9]+(?:-[a-z0-9]+)*)/g;
const targetPresence = /\/learn\/glossary\/#/;
// This guard covers explicit prose links. AstroTerm disclosures resolve their
// own glossary destinations through the context-help data tests.
const ASTRO_LINK_COUNTS = new Map(Object.entries({
  'src/pages/baby-zodiac/index.astro': 5,
  'src/pages/birth-chart/index.astro': 5,
  'src/pages/birth-chart/three-dimensions/index.astro': 1,
  'src/pages/birthday/index.astro': 5,
  'src/pages/compatibility/index.astro': 2,
  'src/pages/eclipses/index.astro': 3,
  'src/pages/events/index.astro': 5,
  'src/pages/full-moon-calendar/index.astro': 5,
  'src/pages/learn/aspects/index.astro': 5,
  'src/pages/learn/houses/index.astro': 5,
  'src/pages/learn/how-to-read-a-birth-chart.astro': 4,
  'src/pages/learn/placements/index.astro': 1,
  'src/pages/learn/planets/index.astro': 5,
  'src/pages/learn/zodiac-dates/index.astro': 5,
  'src/pages/mercury-retrograde/index.astro': 5,
  'src/pages/moon-phase/index.astro': 5,
  'src/pages/moon-sign/index.astro': 5,
  'src/pages/retrogrades/index.astro': 5,
  'src/pages/rising-sign/index.astro': 5,
  'src/pages/saturn-return/index.astro': 5,
  'src/pages/transits/index.astro': 5,
}));

async function sourceFiles(dir) {
  const output = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) output.push(...await sourceFiles(path));
    else if (['.astro', '.mdx'].includes(extname(entry.name))) output.push(path);
  }
  return output;
}

describe('glossary crosslinks', () => {
  it('stay bounded, English-only, and anchored to real glossary terms', async () => {
    const glossarySlugs = new Set(GLOSSARY.map((entry) => entry.slug));
    const files = [
      ...await sourceFiles(resolve(repo, 'src/pages')),
      ...await sourceFiles(resolve(repo, 'src/content/guides')),
      ...await sourceFiles(resolve(repo, 'src/content/learn')),
    ];
    const linkedFiles = [];
    let linkCount = 0;

    for (const file of files) {
      const source = await readFile(file, 'utf8');
      const links = [...source.matchAll(targetPattern)];
      if (!links.length) continue;

      const path = relative(repo, file).replaceAll('\\', '/');
      linkedFiles.push(path);
      linkCount += links.length;
      expect(path, 'Spanish source must stay untouched').not.toMatch(/(^|\/)es\//);
      expect(links.length, `${path} exceeds the per-page link cap`).toBeLessThanOrEqual(5);
      // A page must never link its own topic back to the glossary — the
      // glossary entry's CTA points right back here, a dead-end loop.
      const own = path.match(
        /^src\/content\/(?:guides|learn\/(?:aspects|houses|planets))\/([a-z0-9-]+)\.mdx$/,
      )?.[1];
      if (own) {
        for (const match of links) {
          expect(match[1], `${path} links its own topic to the glossary`).not.toBe(own);
        }
      }
      if (path.startsWith('src/content/guides/')) {
        expect(links.length, `${path} should link two guide terms`).toBe(2);
      } else if (path.startsWith('src/content/learn/')) {
        expect(path).toMatch(/^src\/content\/learn\/placements\/[^/]+\.mdx$/);
        expect(links.length, `${path} should link one detail term`).toBe(1);
      } else {
        expect(ASTRO_LINK_COUNTS.has(path), `${path} is outside the approved page set`).toBe(true);
        expect(links.length, `${path} link count drifted`).toBe(ASTRO_LINK_COUNTS.get(path));
      }
      for (const match of links) {
        expect(glossarySlugs.has(match[1]), `${path} → ${match[1]}`).toBe(true);
      }

      if (path.endsWith('.astro') && source.startsWith('---')) {
        const frontmatterEnd = source.indexOf('\n---', 3);
        expect(source.slice(0, frontmatterEnd), `${path} links structured data`).not.toMatch(targetPresence);
      }
      if (path.endsWith('.mdx')) {
        expect(source, `${path} links a heading`).not.toMatch(
          /^\s*#{1,6}[^\n]*\/learn\/glossary\/#/m,
        );
        const fencedCode = source.match(/```[\s\S]*?```/g) ?? [];
        for (const block of fencedCode) {
          expect(block, `${path} links fenced code`).not.toMatch(targetPresence);
        }
        expect(source, `${path} nests a glossary link in another Markdown link`).not.toMatch(
          /\[[^\]]*\[[^\]]+\]\(\/learn\/glossary\/#.+?\)[^\]]*\]\([^)]+\)/,
        );
      }
      for (const tag of [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'button', 'caption', 'figcaption', 'code', 'pre', 'noscript', 'script',
      ]) {
        const blocks = source.match(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi')) ?? [];
        for (const block of blocks) {
          expect(block, `${path} links inside <${tag}>`).not.toMatch(targetPresence);
        }
      }
      const monoBlocks = source.match(
        /<([a-z][\w-]*)\b[^>]*class=(["'])[^"']*\bmono\b[^"']*\2[^>]*>[\s\S]*?<\/\1>/gi,
      ) ?? [];
      for (const block of monoBlocks) {
        expect(block, `${path} links inside mono content`).not.toMatch(targetPresence);
      }
      if (path.endsWith('.astro')) {
        expect(source, `${path} nests a glossary anchor in another anchor`).not.toMatch(
          /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<a\b[^>]*href=["']\/learn\/glossary\/#/i,
        );
      }
    }

    expect(linkedFiles).toHaveLength(153);
    expect(linkCount).toBe(235);
  });
});
