import { readFile } from 'node:fs/promises';
import { h } from 'preact';
import render from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import ChartCompare from './ChartCompare';

const page = await readFile(new URL('../pages/developers/compare/index.astro', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles/chart-compare.css', import.meta.url), 'utf8');
const island = await readFile(new URL('./ChartCompare.tsx', import.meta.url), 'utf8');

describe('the chart-difference tool before it hydrates', () => {
  const markup = render(h(ChartCompare, {}));

  it('states the local-only promise in the server-rendered shell', () => {
    expect(markup).toContain('nothing is uploaded, nothing is kept');
  });

  it('offers the file inputs without JavaScript having run', () => {
    expect(markup).toContain('data-compare-file="left"');
    expect(markup).toContain('data-compare-file="right"');
  });

  it('carries a live region so a comparison is announced, not only drawn', () => {
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('data-compare-live');
  });

  it('warns that a full record carries birth details', () => {
    expect(markup).toContain('A full record contains birth details');
  });
});

describe('the page around it', () => {
  it('is a consumer surface: no market, token or acquisition language', () => {
    const lowered = page.toLowerCase();
    for (const banned of ['token', 'market', 'wallet', 'mint', 'buy', 'price', 'astrofolio']) {
      expect(lowered).not.toContain(banned);
    }
  });

  it('names the engine version from the candidate record rather than a literal', () => {
    expect(page).toContain('{candidate.version}');
    expect(page).not.toMatch(/engine <code>0\.\d/u);
  });

  it('does not promise general third-party compatibility', () => {
    expect(page).toContain('There is no claim of');
    expect(page).toContain('general third-party compatibility');
  });

  it('says redaction is not anonymity', () => {
    expect(page).toContain('safer to share — not anonymous');
  });

  it('loads its own stylesheet instead of borrowing the calculator page classes', () => {
    expect(page).toContain("import '../../../styles/chart-compare.css'");
    // These classes live in page-scoped <style> blocks elsewhere, so they
    // carry no styling on this route.
    expect(island).not.toContain('pf-chart__action');
    expect(island).not.toContain('pf-loading');
    expect(island).not.toContain('calc__error');
  });
});

describe('the stylesheet', () => {
  it('keeps every control at a 44px tap target', () => {
    expect(styles).toMatch(/\.cmp__btn\s*\{[^}]*min-height:\s*44px/su);
    expect(styles).toMatch(/file-selector-button\s*\{[^}]*min-height:\s*44px/su);
  });

  it('lets the fieldsets shrink below their intrinsic width on a phone', () => {
    // A fieldset defaults to min-inline-size: min-content, which the file input
    // pushes past a 360px viewport and scrolls the whole page sideways.
    expect(styles).toMatch(/\.cmp__presets,\s*\.cmp__files\s*\{[^}]*min-inline-size:\s*0/su);
  });

  it('labels the stacked cells once the header row is hidden', () => {
    expect(styles).toContain('content: attr(data-label)');
  });
});
