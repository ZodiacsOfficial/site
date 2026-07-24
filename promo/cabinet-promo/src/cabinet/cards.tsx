import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { GRAIN, INK_1, INK_2, MONO, SERIF, VOID } from '../theme';
import { LEAF, LEAF_BRIGHT } from './palette';

const SLOW = Easing.bezier(0.32, 0.72, 0, 1);

/** Void ground: grain and a vignette that keeps the eye centre-frame. */
export const Ground: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: VOID }}>
    <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.05 }} />
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse 92% 72% at 50% 48%, transparent 52%, rgba(0,0,0,0.6))',
      }}
    />
  </AbsoluteFill>
);

/**
 * A serif line laid over the stage rather than cut to.
 *
 * The film never goes to a full-screen title card until the end: on a muted
 * autoplaying timeline, every frame that is only text is a frame the viewer
 * can leave on.
 */
export const Line: React.FC<{
  text: string;
  from: number;
  until: number;
  size: number;
  align?: 'center' | 'bottom';
  italic?: boolean;
  tint?: string;
  /** The factual half, stacked beneath the claim and timed a beat later. */
  rule?: string;
  ruleFrom?: number;
}> = ({ text, from, until, size, align = 'bottom', italic = false, tint = '#EEF1F7', rule, ruleFrom }) => {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [from, from + 9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  const outP = interpolate(frame, [until - 9, until], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ruleP = interpolate(frame, [ruleFrom ?? from, (ruleFrom ?? from) + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  if (frame < from || frame > until) return null;
  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: align === 'center' ? 'center' : 'flex-end',
        paddingBottom: align === 'center' ? 0 : '6%',
        paddingLeft: '8%',
        paddingRight: '8%',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.42 }}>
        <span
          style={{
            fontFamily: SERIF,
            fontWeight: 500,
            fontStyle: italic ? 'italic' : 'normal',
            fontSize: size,
            lineHeight: 1.1,
            textAlign: 'center',
            color: tint,
            opacity: inP * outP,
            translate: `0px ${(1 - inP) * size * 0.14}px`,
          }}
        >
          {text}
        </span>
        {rule && (
          <span
            style={{
              fontFamily: MONO,
              fontSize: size * 0.34,
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              textAlign: 'center',
              color: INK_2,
              opacity: ruleP * outP,
            }}
          >
            {rule}
          </span>
        )}
      </div>
    </AbsoluteFill>
  );
};

/** A full-screen impact flash, warm rather than white. */
export const Flash: React.FC<{ from: number; peak?: number }> = ({ from, peak = 0.34 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - from, [0, 2, 14], [0, peak, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (frame < from) return null;
  return <AbsoluteFill style={{ backgroundColor: 'rgb(255, 236, 186)', opacity }} />;
};

/**
 * One rung of the ladder, captioned beneath the case rather than cut to.
 *
 * Numeral, name, and threshold in one line of mono, because the seats above
 * are already carrying the picture — this only has to name what is lit.
 */
export const Rung: React.FC<{
  numeral: string;
  name: string;
  range: string;
  from: number;
  until: number;
  size: number;
  gilt?: boolean;
}> = ({ numeral, name, range, from, until, size, gilt = false }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + 8, until - 8, until], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  if (frame < from || frame > until) return null;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '7%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: size * 1.1,
          opacity: p,
          translate: `0px ${(1 - p) * size * 0.5}px`,
        }}
      >
        <span
          style={{
            fontFamily: SERIF,
            fontWeight: 500,
            fontSize: size * 1.9,
            lineHeight: 1,
            color: gilt ? LEAF_BRIGHT : INK_1,
          }}
        >
          {numeral}
        </span>
        <span
          style={{
            fontFamily: SERIF,
            fontWeight: 500,
            fontSize: size * 1.5,
            color: gilt ? LEAF_BRIGHT : '#EEF1F7',
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: size * 0.86,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: gilt ? LEAF : INK_2,
          }}
        >
          {range}
        </span>
      </div>
    </AbsoluteFill>
  );
};

/** The close: one instruction, one address, one wordmark. */
export const Cta: React.FC<{ from: number; until: number }> = ({ from, until }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const local = frame - from;
  const inP = interpolate(local, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  const outP = interpolate(local, [until - from - 8, until - from], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (frame < from) return null;
  const unit = Math.min(width, height);
  return (
    <AbsoluteFill
      style={{ backgroundColor: VOID, alignItems: 'center', justifyContent: 'center', opacity: outP }}
    >
      <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.05 }} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: unit * 0.03,
          textAlign: 'center',
          opacity: inP,
          scale: String(0.975 + inP * 0.025),
        }}
      >
        <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: unit * 0.088, color: '#EEF1F7' }}>
          Open your cabinet.
        </span>
        <span
          style={{
            width: unit * 0.2,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${LEAF}, transparent)`,
            margin: `${unit * 0.012}px 0`,
          }}
        />
        <span
          style={{
            fontFamily: MONO,
            fontSize: unit * 0.034,
            letterSpacing: '0.1em',
            color: INK_1,
          }}
        >
          zodiacs.org/registry/collection
        </span>
        <span
          style={{
            marginTop: unit * 0.035,
            fontFamily: SERIF,
            fontWeight: 500,
            fontSize: unit * 0.038,
            letterSpacing: '0.04em',
            color: INK_2,
          }}
        >
          Zodiacs·org
        </span>
      </div>
    </AbsoluteFill>
  );
};
