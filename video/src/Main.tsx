/**
 * The composition. One 1080×1080 stage, centered in whichever canvas the
 * format dictates; the backdrop dial fills the full canvas and turns exactly
 * one revolution per loop. The natal wheel is a persistent layer that
 * match-moves between the hero spot and the natal spot — scenes dissolve
 * around it. Frame 0 is fully composed; frames 444–449 equal it again.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { VOID, INK } from './theme';
import { Wheel } from './components/Wheel';
import { BackdropDial, Wordmark } from './components/chrome';
import { Headline, Kicker } from './components/ui';
import { wheelAspects, wheelBodies, natal } from './data';
import { EndText, HoroPanel, NatalPanel, SkyPanel, SynPanel } from './scenes';
import { T, envelope, lerp, ramp, easeSoft } from './timeline';
import './fonts';

export type Format = 'square' | 'wide' | 'vertical';

const STAGE = 1080;

const HERO_WHEEL = { cx: 540, cy: 452, size: 650 };
const NATAL_WHEEL = { cx: 352, cy: 566, size: 606 };

/** Per-aspect draw progress + group opacity for the persistent wheel. */
const aspectState = (frame: number): { progress: number[]; opacity: number } => {
  const n = wheelAspects.length;
  if (frame < T.aspectFade[0]) {
    return { progress: Array(n).fill(1), opacity: 1 };
  }
  if (frame < T.aspectRedraw.start) {
    return { progress: Array(n).fill(1), opacity: ramp(frame, T.aspectFade, 'out') };
  }
  const { start, stagger, dur } = T.aspectRedraw;
  return {
    progress: wheelAspects.map((_, i) => {
      const t = (frame - (start + i * stagger)) / dur;
      const clamped = Math.max(0, Math.min(1, t));
      return easeSoft(clamped);
    }),
    opacity: 1,
  };
};

export const Main: React.FC<{ format: Format }> = ({ format }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const sx = (width - STAGE) / 2;
  const sy = (height - STAGE) / 2;

  // ── Persistent wheel: transform + visibility ──
  const move = easeSoft(
    Math.max(0, Math.min(1, (frame - T.wheelMove[0]) / (T.wheelMove[1] - T.wheelMove[0]))),
  );
  const back = ramp(frame, T.heroReturn, 'in');
  // After the natal scene the wheel hides; on return it is at the hero spot.
  const pos = back > 0
    ? HERO_WHEEL
    : {
      cx: lerp(HERO_WHEEL.cx, NATAL_WHEEL.cx, move),
      cy: lerp(HERO_WHEEL.cy, NATAL_WHEEL.cy, move),
      size: lerp(HERO_WHEEL.size, NATAL_WHEEL.size, move),
    };
  const wheelOpacity = Math.max(envelope(frame, { out: T.natalOut }), back);
  const { progress: aspectProgress, opacity: aspectOpacity } = aspectState(frame);

  // ── Scene envelopes ──
  const heroText = Math.max(envelope(frame, { out: T.heroOut }), back);
  const natalOp = envelope(frame, { in: T.natalIn, out: T.natalOut });
  const horoOp = envelope(frame, { in: T.horoIn, out: T.horoOut });
  const synOp = envelope(frame, { in: T.synIn, out: T.synOut });
  const skyOp = envelope(frame, { in: T.skyIn, out: T.skyOut });
  const endOp = ramp(frame, T.endIn, 'in');

  const box = pos.size * 1.1;

  return (
    <AbsoluteFill style={{ background: VOID.v0 }}>
      <BackdropDial cx={width / 2} cy={height / 2} r={Math.max(width, height) * 0.46} />

      <div style={{ position: 'absolute', left: sx, top: sy, width: STAGE, height: STAGE }}>
        {/* Persistent natal wheel (the real chart) */}
        {wheelOpacity > 0.001 && (
          <div
            style={{
              position: 'absolute',
              left: pos.cx - box / 2,
              top: pos.cy - box / 2,
              width: box,
              opacity: wheelOpacity,
            }}
          >
            <Wheel
              bodies={wheelBodies}
              asc={natal.angles.asc}
              mc={natal.angles.mc}
              cusps={natal.cusps}
              aspects={wheelAspects}
              size={pos.size}
              aspectProgress={aspectProgress}
              aspectOpacity={aspectOpacity}
            />
          </div>
        )}

        {/* Hero text — also the loop's landing composition */}
        {heroText > 0.001 && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: STAGE, opacity: heroText }}>
            <Kicker size={34} style={{ position: 'absolute', top: 70, left: 0, width: STAGE, textAlign: 'center' }}>
              A birth chart
            </Kicker>
            <Headline size={88} style={{ position: 'absolute', top: 806, left: 0, width: STAGE }}>
              Your whole chart. Free.
            </Headline>
          </div>
        )}

        {natalOp > 0.001 && (
          <div style={{ position: 'absolute', inset: 0, opacity: natalOp }}>
            <NatalPanel />
          </div>
        )}
        {horoOp > 0.001 && (
          <div style={{ position: 'absolute', inset: 0, opacity: horoOp }}>
            <HoroPanel />
          </div>
        )}
        {synOp > 0.001 && (
          <div style={{ position: 'absolute', inset: 0, opacity: synOp }}>
            <SynPanel />
          </div>
        )}
        {skyOp > 0.001 && (
          <div style={{ position: 'absolute', inset: 0, opacity: skyOp }}>
            <SkyPanel />
          </div>
        )}
        {endOp > 0.001 && (
          <div style={{ position: 'absolute', inset: 0, opacity: endOp }}>
            <EndText />
          </div>
        )}

        {/* Brand line — identical on every frame */}
        <Wordmark y={934} stage={STAGE} />
      </div>

      {/* Format guard: nothing else changes between square/wide/vertical */}
      {format === 'wide' || format === 'vertical' ? null : null}
    </AbsoluteFill>
  );
};

export const inkForDebug = INK.i0;
