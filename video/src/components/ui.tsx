/**
 * Small shared pieces: headlines in the site's type, screenshot panels in
 * the site's shell/tile styling, sign chips echoing the calculator's
 * Big Three cards.
 */
import React from 'react';
import { Img, staticFile } from 'remotion';
import { FONT, HAIR, INK, SIGN_HUES, VOID } from '../theme';
import { ICON_URI } from '../icon-data';

export const Headline: React.FC<{
  children: React.ReactNode;
  size?: number;
  color?: string;
  align?: 'left' | 'center';
  style?: React.CSSProperties;
}> = ({ children, size = 66, color = INK.i0, align = 'center', style }) => (
  <div
    style={{
      fontFamily: FONT.serif,
      fontWeight: 500,
      fontSize: size,
      lineHeight: 1.12,
      color,
      textAlign: align,
      letterSpacing: '0.005em',
      ...style,
    }}
  >
    {children}
  </div>
);

/** Sentence-case serif-italic kicker — the site's .kicker. */
export const Kicker: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 30, style }) => (
  <div
    style={{
      fontFamily: FONT.serif,
      fontStyle: 'italic',
      fontWeight: 400,
      fontSize: size,
      color: INK.i2,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Mono: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({ children, size = 26, color = INK.i2, style }) => (
  <div
    style={{
      fontFamily: FONT.mono,
      fontWeight: 400,
      fontSize: size,
      color,
      letterSpacing: '0.02em',
      ...style,
    }}
  >
    {children}
  </div>
);

/** A real-UI screenshot in the site's tile dressing. */
export const Shot: React.FC<{
  src: string;
  width: number;
  radius?: number;
  style?: React.CSSProperties;
}> = ({ src, width, radius = 22, style }) => (
  <div
    style={{
      width,
      borderRadius: radius,
      border: `1px solid ${HAIR.h2}`,
      background: VOID.v2,
      overflow: 'hidden',
      boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
      ...style,
    }}
  >
    <Img src={staticFile(src)} style={{ width: '100%', display: 'block' }} />
  </div>
);

/** SUN / MOON / RISING chip — real placement, pastel disc, mono degree. */
export const PlacementChip: React.FC<{
  role: string;
  sign: string;
  signName: string;
  degree: string;
  width: number;
}> = ({ role, sign, signName, degree, width }) => (
  <div
    style={{
      width,
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: '20px 24px',
      borderRadius: 18,
      border: `1px solid ${HAIR.h2}`,
      background: VOID.v2,
    }}
  >
    <img src={ICON_URI[sign]} width={64} height={64} style={{ display: 'block' }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: FONT.mono, fontSize: 20, letterSpacing: '0.18em', color: INK.i3 }}>
        {role}
      </span>
      <span style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 40, color: INK.i0, lineHeight: 1 }}>
        {signName}
      </span>
      <span style={{ fontFamily: FONT.mono, fontSize: 22, color: INK.i2 }}>{degree}</span>
    </div>
  </div>
);
