/**
 * Persistent chrome: the rotating backdrop dial (the one element that turns
 * continuously through all 450 frames, exactly one revolution per loop) and
 * the brand wordmark (twelve-dot ring + mono zodiacs.org, per BrandMark.astro).
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT, HAIR, INK, SIGN_HUES, SIGN_ORDER } from '../theme';

/**
 * A faint zodiac dial behind everything: hairline ring, 60 minor ticks,
 * 12 pastel points. Rotates counterclockwise (zodiac direction) exactly
 * 360° across the composition, so frame 450 ≡ frame 0.
 */
export const BackdropDial: React.FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const angle = -(frame / durationInFrames) * 360;
  const ticks = Array.from({ length: 60 }, (_, i) => (i / 60) * 2 * Math.PI);
  return (
    <svg
      width={r * 2.6} height={r * 2.6}
      viewBox={`0 0 ${r * 2.6} ${r * 2.6}`}
      style={{
        position: 'absolute',
        left: cx - r * 1.3,
        top: cy - r * 1.3,
      }}
    >
      <g transform={`rotate(${angle} ${r * 1.3} ${r * 1.3})`}>
        <circle cx={r * 1.3} cy={r * 1.3} r={r} fill="none" stroke={HAIR.h1} strokeWidth={1} />
        <circle cx={r * 1.3} cy={r * 1.3} r={r * 1.16} fill="none" stroke="rgba(198,204,218,0.05)" strokeWidth={1} />
        {ticks.map((a, i) => {
          const major = i % 5 === 0;
          const r1 = r * (major ? 0.965 : 0.98);
          const x1 = r * 1.3 + r1 * Math.cos(a);
          const y1 = r * 1.3 + r1 * Math.sin(a);
          const x2 = r * 1.3 + r * Math.cos(a);
          const y2 = r * 1.3 + r * Math.sin(a);
          return (
            <line
              key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={major ? HAIR.h2 : HAIR.h1} strokeWidth={1}
            />
          );
        })}
        {SIGN_ORDER.map((slug, i) => {
          const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
          const x = r * 1.3 + r * 1.08 * Math.cos(a);
          const y = r * 1.3 + r * 1.08 * Math.sin(a);
          return <circle key={slug} cx={x} cy={y} r={3.2} fill={SIGN_HUES[slug]} opacity={0.5} />;
        })}
      </g>
    </svg>
  );
};

/** Twelve dots in a ring — the site favicon mark (BrandMark.astro geometry). */
export const BrandDots: React.FC<{ size: number; spin?: boolean }> = ({ size, spin = true }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const angle = spin ? (frame / durationInFrames) * 360 : 0;
  const C = 12;
  const R = 9;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
      <g transform={`rotate(${angle} 12 12)`}>
        {SIGN_ORDER.map((slug, i) => {
          const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
          return (
            <circle
              key={slug}
              cx={+(C + R * Math.cos(a)).toFixed(3)}
              cy={+(C + R * Math.sin(a)).toFixed(3)}
              r={1.9}
              fill={SIGN_HUES[slug]}
            />
          );
        })}
      </g>
    </svg>
  );
};

/** Bottom brand line: dots + mono wordmark. Identical on every frame. */
export const Wordmark: React.FC<{ y: number; stage: number }> = ({ y, stage }) => (
  <div
    style={{
      position: 'absolute',
      top: y,
      left: 0,
      width: stage,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
    }}
  >
    <BrandDots size={26} />
    <span
      style={{
        fontFamily: FONT.mono,
        fontSize: 26,
        fontWeight: 400,
        letterSpacing: '0.14em',
        color: INK.i1,
      }}
    >
      zodiacs.org
    </span>
  </div>
);
