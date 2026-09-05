import { readFileSync } from 'node:fs';
import { createRef, h } from 'preact';
import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import TourCard from './TourCard';

function markup(shareDisabled: boolean, shareStatusLabel: string): string {
  return render(h(TourCard, {
    locale: 'en',
    variant: 'quick',
    kicker: 'Step 1 of 4',
    title: 'Start with the Sun',
    dotsLabel: 'Reading steps',
    exitLabel: 'Close reading',
    finishLabel: 'Finish',
    nextLabel: 'Next',
    paragraphs: [],
    feature: null,
    dots: [{ label: 'Sun', active: true, complete: false }],
    onDot: () => {},
    onPrev: () => {},
    onNext: () => {},
    onFinish: () => {},
    prevDisabled: true,
    isLast: false,
    shareLabel: 'Share this chart',
    shareStatusLabel,
    shareDisabled,
    onShare: () => {},
    onExit: () => {},
    headingRef: createRef<HTMLHeadingElement>(),
  }));
}

function shareButton(markupValue: string): string {
  const match = markupValue.match(/<button[^>]*data-tour-share[^>]*>/);
  if (!match) throw new Error('Tour share action missing');
  return match[0];
}

describe('TourCard share readiness', () => {
  it('keeps the tour action disabled while its prepared artifact is unavailable', () => {
    const output = markup(true, 'Rendering…');

    expect(shareButton(output)).toContain('disabled');
    expect(output).toContain('<span>Rendering…</span>');
    expect(shareButton(output)).toContain('aria-label="Share this chart"');
  });

  it('enables the same action once the prepared artifact is ready', () => {
    const output = markup(false, 'Share this chart');

    expect(shareButton(output)).not.toContain('disabled');
    expect(output).toContain('<span>Share this chart</span>');
  });
});


describe('mobile sheet reserves its controls from the floating Guide launcher', () => {
  it('removes the launcher from pointer and keyboard access only within the mobile sheet rule', () => {
    const css = readFileSync(new URL('../../../styles/explorer.css', import.meta.url), 'utf8');
    const selector = 'body:has(.insp--card) .zguide-launcher';
    const start = css.indexOf(selector);
    expect(start).toBeGreaterThan(0);
    const mediaStart = css.lastIndexOf('@media', start);
    expect(css.slice(mediaStart, start)).toMatch(/^@media \(max-width: 959\.5px\) \{/u);
    const rule = css.slice(start, css.indexOf('}', start) + 1);
    expect(rule).toContain('visibility: hidden;');
    expect(rule).toContain('pointer-events: none;');
    expect(rule).not.toMatch(/z-index|position|opacity/u);
    expect(css.split(selector)).toHaveLength(2);
    // Both Inspector and Tour expose this existing presence marker; dismissal
    // removes it, so the normal launcher rules regain control without JS state.
    expect(markup(false, 'Share this chart')).toContain('insp--card');
  });
});
