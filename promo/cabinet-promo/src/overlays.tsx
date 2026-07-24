import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { GRAIN, INK_2, MONO, SERIF, VOID } from './theme';

const SLOW = Easing.bezier(0.32, 0.72, 0, 1);

/** Persistent void ground: grain + vignette. */
export const Ground = () => (
  <AbsoluteFill style={{ backgroundColor: VOID }}>
    <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.05 }} />
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse 90% 70% at 50% 46%, transparent 55%, rgba(0,0,0,0.55))',
      }}
    />
  </AbsoluteFill>
);

/** Trailer title card: serif lines punched onto black. Local frame. */
export const TitleCard = ({
  lines,
  duration,
  italic = false,
  size = 96,
}: {
  lines: string[];
  duration: number;
  italic?: boolean;
  size?: number;
}) => {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [0, 7], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  const outP = interpolate(frame, [duration - 6, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          padding: '0 90px',
          textAlign: 'center',
          opacity: inP,
          scale: String(0.965 + inP * 0.035),
        }}
      >
        {lines.map((line) => (
          <div
            key={line}
            style={{
              fontFamily: SERIF,
              fontWeight: 500,
              fontStyle: italic ? 'italic' : 'normal',
              fontSize: size,
              lineHeight: 1.12,
              color: '#EEF1F7',
              letterSpacing: '0.01em',
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** A quick full-screen impact flash. Local frame. */
export const Flash = ({ peak = 0.3, color = '238,241,247' }: { peak?: number; color?: string }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 2, 12], [0, peak, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <AbsoluteFill style={{ backgroundColor: `rgba(${color}, 1)`, opacity }} />;
};

/** Expanding tier ring burst from the center. Local frame. */
export const RingBurst = ({ hue, label }: { hue: string; label: string }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  const labelIn = interpolate(frame, [2, 8, 30, 38], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          position: 'absolute',
          width: 560,
          height: 560,
          borderRadius: '50%',
          border: `3px solid ${hue}`,
          opacity: (1 - p) * 0.85,
          scale: String(0.25 + p * 2.1),
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '12%',
          fontFamily: MONO,
          fontSize: 34,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: hue,
          opacity: labelIn,
        }}
      >
        {label}
      </div>
    </AbsoluteFill>
  );
};

/** Screen-edge glow for the gold ignition. Local frame. */
export const EdgeGlow = ({ hue, duration }: { hue: string; duration: number }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, duration - 10, duration], [0, 0.5, 0.35, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const edge = (styles: React.CSSProperties) => (
    <div style={{ position: 'absolute', opacity, ...styles }} />
  );
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {edge({ top: 0, left: 0, right: 0, height: 180, background: `linear-gradient(${hue}44, transparent)` })}
      {edge({ bottom: 0, left: 0, right: 0, height: 180, background: `linear-gradient(transparent, ${hue}44)` })}
      {edge({ top: 0, bottom: 0, left: 0, width: 140, background: `linear-gradient(90deg, ${hue}3a, transparent)` })}
      {edge({ top: 0, bottom: 0, right: 0, width: 140, background: `linear-gradient(270deg, ${hue}3a, transparent)` })}
    </AbsoluteFill>
  );
};

/** Shockwave rings at the master contact. Local frame. */
export const Shockwave = () => {
  const frame = useCurrentFrame();
  const ring = (delay: number, size: number) => {
    const p = interpolate(frame, [delay, delay + 26], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: SLOW,
    });
    return (
      <div
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: '50%',
          border: '3px solid rgba(238,241,247,0.9)',
          opacity: frame < delay ? 0 : (1 - p) * 0.8,
          scale: String(0.2 + p * 2.6),
        }}
      />
    );
  };
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      {ring(0, 520)}
      {ring(5, 640)}
    </AbsoluteFill>
  );
};

/** Mono counter line under the cabinet. */
export const Counter = ({ value, label }: { value: number; label: string }) => (
  <div
    style={{
      fontFamily: MONO,
      fontSize: 36,
      letterSpacing: '0.18em',
      color: INK_2,
      textTransform: 'uppercase',
    }}
  >
    {label} {new Intl.NumberFormat('en').format(Math.round(value))}
  </div>
);

/** Threshold announcement: how much you must hold for the next edition.
 * Paced for reading: HOLD fades up, the amount counts up and lands,
 * then the edition pill arrives. */
export const ThresholdCard = ({
  amount,
  edition,
  tint,
  duration,
}: {
  amount: number;
  edition: string;
  tint: string;
  duration: number;
}) => {
  const frame = useCurrentFrame();
  const holdIn = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  const countP = interpolate(frame, [8, 34], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const value = Math.round(amount * countP);
  const landPop = interpolate(frame, [32, 38, 44], [1, 1.06, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pillIn = interpolate(frame, [36, 48], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  const outP = interpolate(frame, [duration - 7, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 22,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 30,
            letterSpacing: '0.34em',
            textTransform: 'uppercase',
            color: INK_2,
            opacity: holdIn,
            translate: `0px ${(1 - holdIn) * 14}px`,
          }}
        >
          Hold
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 500,
            fontSize: 132,
            lineHeight: 1,
            color: countP >= 1 ? '#EEF1F7' : 'rgba(238,241,247,0.82)',
            opacity: Math.min(1, holdIn * 2),
            scale: String(landPop),
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {new Intl.NumberFormat('en').format(value)}
        </div>
        <div
          style={{
            marginTop: 6,
            padding: '10px 26px',
            border: `1.5px solid ${tint}88`,
            borderRadius: 999,
            fontFamily: MONO,
            fontSize: 30,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: tint,
            opacity: pillIn,
            translate: `0px ${(1 - pillIn) * 16}px`,
          }}
        >
          {edition}
        </div>
      </div>
    </AbsoluteFill>
  );
};
