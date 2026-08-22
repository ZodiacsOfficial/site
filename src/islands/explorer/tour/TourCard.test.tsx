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
