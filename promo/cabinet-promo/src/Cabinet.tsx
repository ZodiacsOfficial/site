import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { GOLD, HAIR, HAIR_SOFT, INK_2, MONO, SIGNS } from './theme';

export interface CabinetLayout {
  cols: number;
  rows: number;
  seat: number;
  gap: number;
  width: number;
  height: number;
}

export function cabinetLayout(portrait: boolean): CabinetLayout {
  const cols = portrait ? 3 : 4;
  const rows = portrait ? 4 : 3;
  const seat = portrait ? 252 : 268;
  const gap = portrait ? 22 : 24;
  return {
    cols,
    rows,
    seat,
    gap,
    width: cols * seat + (cols - 1) * gap,
    height: rows * seat + (rows - 1) * gap,
  };
}

const OVERSHOOT = Easing.bezier(0.34, 1.56, 0.64, 1);
const SLOW = Easing.bezier(0.32, 0.72, 0, 1);

interface Props {
  /** Frame at which each of the twelve discs lands in its seat (zodiac order). */
  seatFrames: number[];
  /** Frame at which the case rim ignites gold (Infinity to disable). */
  goldFrame: number;
  /** Frame of the master contact bloom (Infinity to disable). */
  masterFrame: number;
  /** The twelfth disc descends slowly from this frame until masterFrame. */
  descentStart: number;
}

export const Cabinet = ({ seatFrames, goldFrame, masterFrame, descentStart }: Props) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const layout = cabinetLayout(height > width);

  const caseIn = interpolate(frame, [45, 55], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  const goldHeat = interpolate(frame, [goldFrame, goldFrame + 10, masterFrame], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bloom = interpolate(frame, [masterFrame, masterFrame + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  const borderColor = bloom > 0
    ? `rgba(238, 241, 247, ${0.25 + bloom * 0.5})`
    : goldHeat > 0
      ? `rgba(224, 176, 128, ${0.16 + goldHeat * 0.5})`
      : HAIR;

  return (
    <div
      style={{
        position: 'relative',
        width: layout.width,
        height: layout.height,
        opacity: caseIn,
        scale: String(0.96 + caseIn * 0.04),
        display: 'grid',
        gridTemplateColumns: `repeat(${layout.cols}, ${layout.seat}px)`,
        gap: layout.gap,
        padding: 26,
        border: `2px solid ${borderColor}`,
        borderRadius: 34,
        background: 'linear-gradient(180deg, rgba(198,204,218,0.04), rgba(198,204,218,0.01) 70%)',
        boxShadow: goldHeat > 0 || bloom > 0
          ? `0 0 ${60 + bloom * 90}px rgba(${bloom > 0 ? '238,241,247' : '224,176,128'}, ${0.12 + goldHeat * 0.12 + bloom * 0.3})`
          : 'none',
        boxSizing: 'content-box',
      }}
    >
      {SIGNS.map((sign, index) => {
        const landing = seatFrames[index];
        const isMasterDisc = index === 11 && Number.isFinite(masterFrame);
        let discOpacity = 0;
        let discScale = 1;
        let discY = 0;
        let discRotate = 0;

        if (isMasterDisc) {
          // The slow descent: the twelfth disc sinks into the last seat.
          const p = interpolate(frame, [descentStart, masterFrame], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: SLOW,
          });
          discOpacity = frame < descentStart ? 0 : interpolate(p, [0, 0.12], [0, 1], { extrapolateRight: 'clamp' });
          discY = (1 - p) * -(layout.height * 0.7);
          discScale = 1.22 - p * 0.22;
          discRotate = Math.sin(p * Math.PI * 2.2) * 5 * (1 - p);
          // Wobble-settle right after contact.
          if (frame >= masterFrame) {
            const settle = interpolate(frame, [masterFrame, masterFrame + 12], [1, 0], {
              extrapolateRight: 'clamp',
            });
            discY = 0;
            discScale = 1 + settle * 0.05;
            discRotate = Math.sin((frame - masterFrame) * 0.9) * 2.4 * settle;
          }
        } else if (index === 0) {
          // The first disc slams in.
          const p = interpolate(frame, [landing - 14, landing], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: OVERSHOOT,
          });
          discOpacity = frame < landing - 14 ? 0 : Math.min(1, p * 2);
          discScale = 2.6 - p * 1.6;
          discY = (1 - p) * -120;
        } else {
          const p = interpolate(frame, [landing - 9, landing], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: OVERSHOOT,
          });
          discOpacity = frame < landing - 9 ? 0 : Math.min(1, p * 2.5);
          discScale = 1.55 - p * 0.55;
          discY = (1 - p) * -70;
        }

        const seated = frame >= landing;
        const seatGlow = seated ? 0.42 + bloom * 0.5 : 0.0;
        const emptySpotlight = isMasterDisc && frame >= descentStart && frame < masterFrame ? 0.12 : 0;

        return (
          <div
            key={sign.slug}
            style={{
              position: 'relative',
              width: layout.seat,
              height: layout.seat,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1.5px solid ${seated ? `color-mix(in srgb, ${sign.hue} ${Math.round(seatGlow * 100)}%, transparent)` : HAIR_SOFT}`,
              borderRadius: 22,
              background: emptySpotlight
                ? `radial-gradient(circle, rgba(238,241,247,${emptySpotlight}), transparent 70%)`
                : seated && bloom > 0
                  ? `radial-gradient(circle, color-mix(in srgb, ${sign.hue} ${Math.round(bloom * 22)}%, transparent), transparent 75%)`
                  : 'transparent',
              boxShadow: seated && (bloom > 0 || goldHeat > 0)
                ? `0 0 ${26 + bloom * 44}px color-mix(in srgb, ${sign.hue} ${Math.round(24 + bloom * 46)}%, transparent)`
                : 'none',
            }}
          >
            <Img
              src={staticFile(`${sign.slug}.webp`)}
              style={{
                width: layout.seat * 0.74,
                height: layout.seat * 0.74,
                opacity: discOpacity,
                scale: String(discScale),
                translate: `0px ${discY}px`,
                rotate: `${discRotate}deg`,
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: 10,
                fontFamily: MONO,
                fontSize: 19,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: seated ? INK_2 : 'rgba(142,150,171,0.35)',
                opacity: caseIn,
              }}
            >
              {sign.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const goldColor = GOLD;
