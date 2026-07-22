import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const source = await readFile(new URL('../src/pages/ru/index.astro', import.meta.url), 'utf8');
const footerSource = await readFile(new URL('../src/components/SiteFooter.astro', import.meta.url), 'utf8');
const navSource = await readFile(new URL('../src/components/SiteNav.astro', import.meta.url), 'utf8');

describe('hidden Russian homepage hero media contract', () => {
  it('keeps the poster as LCP and every video source detached initially', () => {
    expect(source).toContain('poster="/assets/hero/zodiacs-hero-poster.avif"');
    expect(source).toContain('preload="none"');
    expect(source).toContain('data-src="/assets/hero/zodiacs-hero-av1.mp4"');
    expect(source).toContain('data-src="/assets/hero/zodiacs-hero.mp4"');
    expect(source).not.toMatch(/<(?:video|source)[^>]*\ssrc="\/assets\/hero\/zodiacs-hero/);
  });

  it('attaches playback only through interaction and respects constrained modes', () => {
    expect(source).toContain("['pointerdown', 'touchstart', 'keydown']");
    expect(source).toContain('connection.saveData');
    expect(source).toContain("['slow-2g', '2g']");
    expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(source).not.toContain('compactViewport');
  });

  it('pauses offscreen and returns failed playback to the moving poster', () => {
    expect(source).toContain("new IntersectionObserver");
    expect(source).toContain("v.dataset.heroPlayback = 'poster-fallback'");
    expect(source).toContain("v.dataset.heroVisible = String(visible)");
    expect(source).toContain(".hero-ru__video[data-hero-visible='false'] { animation-play-state: paused; }");
    expect(source).toContain('@keyframes hero-poster-drift');
  });
});

describe('hidden Russian deferred-product safeguards', () => {
  it('never mounts the English-backed email signup on a Russian route', () => {
    expect(footerSource).toContain("locale !== 'ru' && !isRegistryWing && !suppressFooterEmailCapture");
  });

  it('labels English-only navigation and removes the deferred birthday tool', () => {
    expect(navSource).toContain("'nav__link--deferred': locale === 'ru'");
    expect(navSource).toContain('— пока по-английски');
    expect(navSource).toContain("NAV_TOOLS.filter((tool) => tool.href !== '/birthday/')");
    expect(navSource).toContain("locale === 'ru' ? null : locale === 'en'");
  });
});
