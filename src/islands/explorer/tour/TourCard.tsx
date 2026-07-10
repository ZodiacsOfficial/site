/**
 * The tour card — the chapter's museum label. Reuses the Inspector's
 * `.insp .insp--card` chrome so the mobile sheet detents, the
 * `body:has(.insp--card)` page reservations, and the reduced-transparency
 * fallbacks all apply unmodified. Presentational only: navigation intent
 * comes back through callbacks.
 */
import type { ComponentChildren } from 'preact';
import { useRef, useState, type MutableRef } from 'preact/hooks';
import { tourFormat, tourText } from './copy';
import type { Locale } from '../../../lib/i18n';

interface Dot { label: string; active: boolean }

interface Props {
  locale: Locale;
  kicker: string;
  title: string;
  paragraphs: ComponentChildren[];
  feature: ComponentChildren;
  dots: Dot[];
  onDot: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  isLast: boolean;
  onExit: () => void;
  headingRef: MutableRef<HTMLHeadingElement | null>;
}

export default function TourCard({
  locale, kicker, title, paragraphs, feature, dots,
  onDot, onPrev, onNext, prevDisabled, isLast, onExit, headingRef,
}: Props) {
  const [detent, setDetent] = useState<'half' | 'full'>('half');
  const dragFrom = useRef<{ x: number; y: number } | null>(null);

  // Same drag grammar as the Inspector sheet, plus a horizontal axis:
  // a sideways swipe on the handle turns the page.
  const onHandlePointerDown = (e: PointerEvent) => {
    dragFrom.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onHandlePointerUp = (e: PointerEvent) => {
    if (!dragFrom.current) return;
    const dx = e.clientX - dragFrom.current.x;
    const dy = e.clientY - dragFrom.current.y;
    dragFrom.current = null;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 48) {
      if (dx < 0) onNext();
      else if (!prevDisabled) onPrev();
      return;
    }
    if (dy < -40) setDetent('full');
    else if (dy > 40) (detent === 'full' ? setDetent('half') : onExit());
  };

  // Roving-tabindex tablist over the chapter dots.
  const activeDot = dots.findIndex((d) => d.active);
  const onDotsKeyDown = (e: KeyboardEvent) => {
    let target = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
      target = Math.min(dots.length - 1, activeDot + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
      target = Math.max(0, activeDot - 1);
    } else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = dots.length - 1;
    if (target === -1 || target === activeDot) return;
    e.preventDefault();
    onDot(target);
    requestAnimationFrame(() => {
      (document.querySelector('.tour__dot[aria-selected="true"]') as HTMLElement | null)?.focus();
    });
  };

  return (
    <div
      class={`insp insp--card insp--${detent} tour`}
      data-explorer-inspector
      data-tour-card
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Escape') { e.stopPropagation(); onExit(); }
      }}
    >
      <div
        class="insp__handle"
        onPointerDown={onHandlePointerDown}
        onPointerUp={onHandlePointerUp}
        aria-hidden="true"
      />
      <div class="insp__head">
        <div class="tour__heading">
          <span class="mono--label tour__kicker" data-tour-kicker>{kicker}</span>
          <h3 class="insp__title" tabIndex={-1} ref={headingRef} data-tour-heading>{title}</h3>
        </div>
        <button class="insp__close" type="button" onClick={onExit} aria-label={tourText(locale, 'exitAria')} data-tour-exit>×</button>
      </div>
      <div class="insp__body">
        {paragraphs.map((p, i) => <p class="insp__read" key={i}>{p}</p>)}
        {feature}
      </div>
      <div class="tour__nav">
        <button class="btn btn--glass tour__btn" type="button" onClick={onPrev} disabled={prevDisabled} data-tour-prev>
          <span>{tourText(locale, 'prev')}</span>
        </button>
        <div class="tour__dots" role="tablist" aria-label={tourText(locale, 'dotsLabel')} onKeyDown={onDotsKeyDown}>
          {dots.map((dot, i) => (
            <button
              key={i}
              class="tour__dot"
              role="tab"
              type="button"
              aria-selected={dot.active}
              tabIndex={dot.active ? 0 : -1}
              aria-label={tourFormat(locale, 'dotAria', { title: dot.label, n: i + 1, total: dots.length })}
              onClick={() => onDot(i)}
              data-tour-dot
            />
          ))}
        </div>
        <button class="btn btn--glass tour__btn" type="button" onClick={isLast ? onExit : onNext} data-tour-next>
          <span>{isLast ? tourText(locale, 'finish') : tourText(locale, 'next')}</span>
        </button>
      </div>
    </div>
  );
}
