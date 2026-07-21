import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = new URL('../', import.meta.url);
const source = async (relativePath: string): Promise<string> => readFile(
  fileURLToPath(new URL(relativePath, root)),
  'utf8',
);

const MOTION_SOURCES = [
  'styles/base.css',
  'styles/prose.css',
  'styles/evidence-disclosure.css',
  'components/SiteNav.astro',
  'components/SiteFooter.astro',
  'components/EmailCapture.astro',
  'components/HoroscopeProgramPage.astro',
  'pages/today/index.astro',
  'pages/horoscopes/index.astro',
] as const;

const ALLOWED_MOTION_PROPERTIES = new Set(['none', 'opacity', 'transform']);

function keyframeBlocks(css: string): string[] {
  const blocks: string[] = [];
  let cursor = 0;
  while (cursor < css.length) {
    const start = css.indexOf('@keyframes', cursor);
    if (start === -1) break;
    const open = css.indexOf('{', start);
    if (open === -1) break;
    let depth = 1;
    let end = open + 1;
    while (end < css.length && depth > 0) {
      if (css[end] === '{') depth += 1;
      if (css[end] === '}') depth -= 1;
      end += 1;
    }
    blocks.push(css.slice(open + 1, end - 1));
    cursor = end;
  }
  return blocks;
}

describe('Phase 1 layout and motion contract', () => {
  it('animates only transform and opacity on every Phase 1 surface dependency', async () => {
    for (const relativePath of MOTION_SOURCES) {
      const css = await source(relativePath);
      const transitions = [...css.matchAll(/\btransition\s*:\s*([^;{}]+);/gu)];
      for (const transition of transitions) {
        const properties = transition[1]
          .split(',')
          .map((part) => part.trim().match(/^([a-z-]+)/iu)?.[1])
          .filter((property): property is string => Boolean(property));
        expect(properties, `${relativePath}: ${transition[0]}`).not.toHaveLength(0);
        expect(
          properties.every((property) => ALLOWED_MOTION_PROPERTIES.has(property)),
          `${relativePath}: ${transition[0]}`,
        ).toBe(true);
      }

      for (const block of keyframeBlocks(css)) {
        const properties = [...block.matchAll(/(?:^|[;{])\s*([a-z-]+)\s*:/gmu)]
          .map((match) => match[1]);
        expect(properties, `${relativePath}: keyframes must contain declarations`).not.toHaveLength(0);
        expect(
          properties.every((property) => ALLOWED_MOTION_PROPERTIES.has(property)),
          `${relativePath}: @keyframes uses ${properties.join(', ')}`,
        ).toBe(true);
      }

      if (/\banimation\s*:/u.test(css)) {
        expect(css, `${relativePath}: animated motion needs a static fallback`)
          .toContain('prefers-reduced-motion: reduce');
      }
    }
  });

  it('keeps hydration-only Today copy and streak geometry in the server layout', async () => {
    const [fallback, brief, page] = await Promise.all([
      source('islands/today/SunSignFallback.tsx'),
      source('islands/today/TodayBrief.tsx'),
      source('pages/today/index.astro'),
    ]);

    expect(fallback).toContain("class={`today-fallback__status${noChartConfirmed || comparisonUnavailable ? ' is-visible' : ''}`}");
    expect(brief).toContain('data-ready={streak !== null');
    expect(brief).toContain("streak > 999 ? '999+' : (streak ?? 1)");
    expect(page).toContain('grid-template-columns: minmax(4ch, auto) 29px;');
    expect(page).toContain('.today-fallback__status.is-visible { visibility: visible; }');
  });

  it('scopes saved-chart reservations to unresolved fallback nodes', async () => {
    const [today, program] = await Promise.all([
      source('pages/today/index.astro'),
      source('components/HoroscopeProgramPage.astro'),
    ]);
    expect(today).toMatch(/\.today-reading__body\s*\{[^}]*display:\s*grid;[^}]*min-height:\s*300px;/u);
    expect(today).not.toContain('.today-returning-chart-placeholder { min-height:');
    expect(today).not.toContain(':root[data-today-saved-chart] .today-reading { min-height:');
    expect(program).toMatch(/\.program :global\(\.dfy__body\)\s*\{[^}]*display:\s*grid;[^}]*height:\s*260px;/u);
    expect(program).toContain('.program :global(.dfy__body) { height: 292px; }');
    expect(program).not.toMatch(/\.program :global\(\.dfy\)\s*\{[^}]*\b(?:min-)?height\s*:/u);
    expect(program).not.toContain(':global(.dfy--placeholder) { min-height:');
    expect(program).not.toContain(':global(:root[data-dfy-saved-chart]) .program :global(.dfy) {\n    min-height:');
  });

  it('reserves both picture and image geometry for every shared pastel sign icon', async () => {
    const [icon, program] = await Promise.all([
      source('components/SignIcon.astro'),
      source('components/HoroscopeProgramPage.astro'),
    ]);
    expect(icon).toContain('height: auto;');
    expect(icon).toContain('aspect-ratio: 1;');
    expect(icon).toContain('.sign-icon img { display: block; width: 100%; height: auto; aspect-ratio: 1;');
    expect(icon).toContain('fetchpriority={fetchPriority}');
    expect(program).toContain('fetchPriority="high"');
    expect(program).toContain("webpOnly={surface === 'today'}");
    expect(program).toContain("decoding={surface === 'today' ? 'sync' : 'async'}");
  });

  it('loads the below-reading personalization bundle only when its saved-chart fallback is visible', async () => {
    const daily = await source('pages/horoscopes/[sign]/index.astro');
    expect(daily).toContain('<DailyForYou slot="enhancement" client:visible');
    expect(daily).not.toContain('<DailyForYou slot="enhancement" client:load');
    expect(daily).not.toContain('<DailyForYou slot="enhancement" client:idle');
  });

  it('does not permit a late webfont swap after first paint', async () => {
    const tokens = await source('styles/tokens.css');
    const fontFaces = (tokens.match(/@font-face\s*\{[^}]+\}/gu) ?? [])
      .filter((face) => face.includes("url('/fonts/"));
    const phase1FontFaces = fontFaces.filter((face) => face.includes(' Phase1'));
    const establishedFontFaces = fontFaces.filter((face) => !face.includes(' Phase1'));
    expect(phase1FontFaces).toHaveLength(6);
    expect(establishedFontFaces).toHaveLength(6);
    for (const face of phase1FontFaces) {
      expect(face).toContain('font-display: optional;');
    }
    for (const face of establishedFontFaces) {
      expect(face).toContain('font-display: swap;');
    }

    const [base, today, hub, program] = await Promise.all([
      source('layouts/Base.astro'),
      source('pages/today/index.astro'),
      source('pages/horoscopes/index.astro'),
      source('components/HoroscopeProgramPage.astro'),
    ]);
    expect(base).toContain('data-stable-typography={props.stableTypography');
    for (const phase1Surface of [today, hub, program]) {
      expect(phase1Surface).toMatch(/<Base\s+[\s\S]*?stableTypography/u);
    }
  });

  it('does not attach generic scroll reveals to the Phase 1 reader templates', async () => {
    const [program, hub] = await Promise.all([
      source('components/HoroscopeProgramPage.astro'),
      source('pages/horoscopes/index.astro'),
    ]);
    expect(program).not.toMatch(/class="[^"]*\breveal\b/u);
    expect(hub).not.toMatch(/class="[^"]*\breveal\b/u);
  });
});
