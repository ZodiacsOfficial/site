import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { GRAIN, INK_1, INK_2, MONO, SERIF, VOID } from '../theme';
import { LEAF, LEAF_BRIGHT } from './leaf';

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

/** A mono rule: the factual half of the frame, never the emotional half. */
export const Rule: React.FC<{
  text: string;
  from: number;
  until: number;
  size: number;
  tint?: string;
}> = ({ text, from, until, size, tint = INK_2 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + 10, until - 10, until], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (frame < from || frame > until) return null;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '4%' }}>
      <span
        style={{
          fontFamily: MONO,
          fontSize: size,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: tint,
          opacity: p,
          textAlign: 'center',
          padding: '0 6%',
        }}
      >
        {text}
      </span>
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
 * The price of entry, stamped.
 *
 * This is the frame built to be screenshotted: one number, one qualifier,
 * nothing else competing for the eye.
 */
export const AmountCard: React.FC<{ from: number; until: number; amount: number }> = ({
  from,
  until,
  amount,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const local = frame - from;
  const span = until - from;
  const inP = interpolate(local, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  const outP = interpolate(local, [span - 8, span], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (frame < from || frame > until) return null;
  const unit = Math.min(width, height);
  return (
    <AbsoluteFill
      style={{
        backgroundColor: VOID,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: outP,
      }}
    >
      <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.05 }} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 50%, rgba(200,150,60,${0.16 * inP}), transparent 70%)`,
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: unit * 0.035,
          opacity: inP,
          scale: String(0.97 + inP * 0.03),
        }}
      >
        <span
          style={{
            fontFamily: SERIF,
            fontWeight: 500,
            fontSize: unit * 0.155,
            lineHeight: 1,
            letterSpacing: '-0.01em',
            color: LEAF_BRIGHT,
            fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 ${unit * 0.08}px rgba(232,196,106,0.35)`,
          }}
        >
          {new Intl.NumberFormat('en').format(amount)}
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: unit * 0.032,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: LEAF,
          }}
        >
          Held in one sign
        </span>
        <span
          style={{
            marginTop: unit * 0.045,
            padding: `${unit * 0.014}px ${unit * 0.042}px`,
            border: `1.5px solid ${LEAF}88`,
            borderRadius: 999,
            fontFamily: MONO,
            fontSize: unit * 0.03,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: LEAF,
            opacity: interpolate(local, [14, 26], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: SLOW,
            }),
          }}
        >
          The Gilded Case · V
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
