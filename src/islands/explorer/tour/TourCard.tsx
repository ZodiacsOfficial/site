/**
 * The tour card — the chapter's museum label. Reuses the Inspector's
 * `.insp .insp--card` chrome so the mobile sheet detents, the
 * `body:has(.insp--card)` page reservations, and the reduced-transparency
 * fallbacks all apply unmodified. Presentational only: navigation intent
 * comes back through callbacks.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState, type MutableRef } from 'preact/hooks';
import { tourFormat, tourText } from './copy';
import type { CatalogLocale as Locale } from '../../../lib/i18n';

interface Dot { label: string; active: boolean; complete: boolean }

interface Props {
  locale: Locale;
  variant: 'quick' | 'full';
  kicker: string;
  title: string;
  dotsLabel: string;
  exitLabel: string;
  finishLabel: string;
  nextLabel: string;
  paragraphs: ComponentChildren[];
  feature: ComponentChildren;
  dots: Dot[];
  onDot: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
  prevDisabled: boolean;
  isLast: boolean;
  shareLabel: string;
  shareStatusLabel: string;
  shareDisabled: boolean;
  onShare: () => void;
  onExit: () => void;
  headingRef: MutableRef<HTMLHeadingElement | null>;
}

export default function TourCard({
  locale, variant, kicker, title, dotsLabel, exitLabel, finishLabel, nextLabel, paragraphs, feature, dots,
  onDot, onPrev, onNext, onFinish, prevDisabled, isLast, onExit, headingRef,
  shareLabel, shareStatusLabel, shareDisabled, onShare,
}: Props) {
  // The four-step first reading opens expanded on phones so the lesson and
  // its navigation are immediately legible. Longer tours retain the peek.
  const [detent, setDetent] = useState<'half' | 'full'>(variant === 'quick' ? 'full' : 'half');
  const dragFrom = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // The mobile sheet itself scrolls. Start every chapter at its title rather
  // than carrying the previous chapter's scroll position forward.
  useEffect(() => {
    if (cardRef.current) cardRef.current.scrollTop = 0;
  }, [kicker, title]);

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

  return (
    <div
      ref={cardRef}
      class={`insp insp--card insp--${detent} tour tour--${variant}`}
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
        <div class="tour__head-actions">
          <button
            class="tour__share"
            type="button"
            onClick={onShare}
            disabled={shareDisabled}
            aria-label={shareLabel}
            data-tour-share
          >
            <span>{shareStatusLabel}</span>
            <span aria-hidden="true">↗</span>
          </button>
          <button class="insp__close" type="button" onClick={onExit} aria-label={exitLabel} data-tour-exit>×</button>
        </div>
      </div>
      <div class="insp__body" key={`${kicker}-${title}`}>
        <div class="tour__stage">
          {paragraphs.map((p, i) => <p class="insp__read" key={i}>{p}</p>)}
          {feature}
        </div>
      </div>
      <div class="tour__nav">
        <button class="btn btn--ghost tour__btn tour__btn--back" type="button" onClick={onPrev} disabled={prevDisabled} data-tour-prev>
          <span>{tourText(locale, 'prev')}</span>
        </button>
        <div class="tour__dots" role="group" aria-label={dotsLabel}>
          {dots.map((dot, i) => (
            <button
              key={i}
              class="tour__dot"
              type="button"
              aria-current={dot.active ? 'step' : undefined}
              aria-label={tourFormat(locale, 'dotAria', { title: dot.label, n: i + 1, total: dots.length })}
              data-complete={dot.complete ? 'true' : undefined}
              onClick={() => onDot(i)}
              data-tour-dot
            />
          ))}
        </div>
        <button class="btn btn--primary tour__btn tour__btn--next" type="button" onClick={isLast ? onFinish : onNext} data-tour-next>
          <span>{isLast ? finishLabel : nextLabel}</span>
          <span class="orb" aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
