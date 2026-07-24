import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { HAIR, HAIR_SOFT, INK_2, MONO, SERIF, SIGNS } from './theme';

const SLOW = Easing.bezier(0.32, 0.72, 0, 1);
const OVERSHOOT = Easing.bezier(0.34, 1.56, 0.64, 1);

const BRONZE_RIM = '#B08D57';
const GOLD_RIM = '#E0B080';

export interface CabinetWaves {
  /** Per-seat landing frames for each material, zodiac order. */
  pastel: number[];
  bronze: number[];
  silver: number[];
  gold: number[];
  /** The engraved case plate appears here. */
  plateFrame: number;
}

type Finish = 'reserved' | 'pastel' | 'bronze' | 'silver' | 'gold';

const FINISH_CAPTION: Record<Exclude<Finish, 'reserved'>, string> = {
  pastel: 'I · PASTEL',
  bronze: 'II · BRONZE',
  silver: 'III · SILVER',
  gold: 'IV · GOLD ×9',
};

function seatFinish(index: number, frame: number, waves: CabinetWaves): Finish {
  if (frame >= waves.gold[index]) return 'gold';
  if (frame >= waves.silver[index]) return 'silver';
  if (frame >= waves.bronze[index]) return 'bronze';
  if (frame >= waves.pastel[index]) return 'pastel';
  return 'reserved';
}

/** A brief pop when a seat is recast into a new material. */
function recastPop(frame: number, at: number): number {
  if (frame < at) return 0;
  return interpolate(frame, [at, at + 9], [1, 0], {
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
}

export const Cabinet = ({ waves }: { waves: CabinetWaves }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  const cols = portrait ? 3 : 4;
  const seatW = portrait ? 300 : 236;
  const seatH = Math.round(seatW * 1.18);
  const gap = 18;

  const caseIn = interpolate(frame, [45, 56], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  const plateIn = interpolate(frame, [waves.plateFrame, waves.plateFrame + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  const allGoldAt = waves.gold[11];
  const bloom = interpolate(frame, [allGoldAt, allGoldAt + 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });

  return (
    <div
      style={{
        position: 'relative',
        opacity: caseIn,
        scale: String(0.97 + caseIn * 0.03),
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 24,
        border: `2px solid ${bloom > 0 ? `rgba(224,176,128,${0.3 + bloom * 0.45})` : HAIR}`,
        borderRadius: 30,
        background: 'linear-gradient(180deg, rgba(198,204,218,0.035), rgba(198,204,218,0.008) 70%)',
        boxShadow: bloom > 0 ? `0 0 ${70 + bloom * 70}px rgba(224,176,128,${0.14 + bloom * 0.2})` : 'none',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${seatW}px)`,
          gap,
        }}
      >
        {SIGNS.map((sign, index) => {
          const finish = seatFinish(index, frame, waves);
          const pops = Math.max(
            recastPop(frame, waves.bronze[index]),
            recastPop(frame, waves.silver[index]),
            recastPop(frame, waves.gold[index]),
          );
          const arriveP = interpolate(frame, [waves.pastel[index] - 8, waves.pastel[index]], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: OVERSHOOT,
          });
          const isGold = finish === 'gold';
          const isSilver = finish === 'silver';
          // The medallion keeps its bronze circle ring from silver onward; the
          // silver promotion lives in the case: the niche becomes a platinum bar.
          const circleRim = finish === 'bronze' || isSilver ? BRONZE_RIM : null;
          const silverPop = recastPop(frame, waves.silver[index]);
          // A specular hotspot travels along the platinum frame after the recast.
          const sheenP = interpolate(frame, [waves.silver[index], waves.silver[index] + 34], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: SLOW,
          });
          const badgeIn = isGold
            ? interpolate(frame, [waves.gold[index] + 5, waves.gold[index] + 12], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: OVERSHOOT,
              })
            : 0;
          const artSize = seatW * 0.56;

          return (
            <div
              key={sign.slug}
              style={{
                position: 'relative',
                width: seatW,
                height: seatH,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                border: isSilver
                  ? 'none'
                  : `1.5px solid ${finish === 'reserved' ? HAIR_SOFT : isGold ? `${GOLD_RIM}66` : circleRim ? `${circleRim}66` : HAIR}`,
                borderRadius: 18,
                padding: isSilver ? 6 : 0,
                background: isGold
                  ? `radial-gradient(circle at 50% 42%, rgba(224,176,128,${0.1 + bloom * 0.08}), transparent 72%)`
                  : isSilver
                    // Brushed platinum bar with a traveling specular hotspot.
                    ? 'linear-gradient(118deg, #79808d 0%, #d8dee8 22%, #a6adba 40%, #f2f5fa 58%, #9aa1ae 78%, #c9d0da 100%)'
                    : 'rgba(10,12,17,0.5)',
                backgroundSize: isSilver ? '260% 260%' : undefined,
                backgroundPosition: isSilver ? `${sheenP * 100}% ${sheenP * 100}%` : undefined,
                boxShadow: isGold
                  ? `0 0 ${24 + bloom * 30}px rgba(224,176,128,0.22)`
                  : isSilver
                    ? `0 0 ${16 + silverPop * 30}px rgba(221,227,236,0.35), inset 0 1px 2px rgba(255,255,255,0.5)`
                    : 'none',
              }}
            >
              {isSilver && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 6,
                    borderRadius: 13,
                    background: 'linear-gradient(180deg, #0B0D12, #10131b)',
                  }}
                />
              )}
              <span
                style={{
                  position: 'absolute',
                  top: isSilver ? 14 : 10,
                  left: isSilver ? 18 : 14,
                  fontFamily: MONO,
                  fontSize: 17,
                  letterSpacing: '0.12em',
                  color: isSilver ? 'rgba(221,227,236,0.85)' : 'rgba(142,150,171,0.7)',
                }}
              >
                {`Nº ${String(index + 1).padStart(2, '0')}`}
              </span>
              {badgeIn > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 12,
                    padding: '3px 12px',
                    border: `1.5px solid ${GOLD_RIM}aa`,
                    borderRadius: 999,
                    fontFamily: MONO,
                    fontSize: 18,
                    color: GOLD_RIM,
                    opacity: badgeIn,
                    scale: String(0.7 + badgeIn * 0.3),
                  }}
                >
                  ×9
                </span>
              )}

              <div
                style={{
                  position: 'relative',
                  width: artSize,
                  height: artSize,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {finish === 'reserved' ? (
                  <Img
                    src={staticFile(`${sign.slug}.webp`)}
                    style={{ width: artSize * 0.6, height: artSize * 0.6, opacity: 0.08, filter: 'grayscale(1)' }}
                  />
                ) : isGold ? (
                  <Img
                    src={staticFile(`gold-${sign.slug}.webp`)}
                    style={{
                      width: artSize,
                      height: artSize,
                      objectFit: 'contain',
                      scale: String(1 + pops * 0.1),
                      filter: `drop-shadow(0 0 ${14 + bloom * 14}px rgba(224,176,128,0.5))`,
                    }}
                  />
                ) : (
                  <>
                    <Img
                      src={staticFile(`${sign.slug}.webp`)}
                      style={{
                        position: 'relative',
                        width: artSize * 0.82,
                        height: artSize * 0.82,
                        borderRadius: '50%',
                        opacity: arriveP,
                        scale: String(
                          (1.45 - arriveP * 0.45)
                          * (1 + (isSilver ? silverPop * 0.12 : pops * 0.08)),
                        ),
                        boxShadow: circleRim
                          ? `0 0 0 4px ${circleRim}, 0 0 16px ${circleRim}44`
                          : 'none',
                      }}
                    />
                    {circleRim && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: isSilver ? -6 : -4,
                          right: seatW * 0.14,
                          width: isSilver ? 36 : 32,
                          height: isSilver ? 36 : 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          border: isSilver ? '2px solid #EEF1F7' : `2px solid ${circleRim}`,
                          background: isSilver
                            ? 'linear-gradient(160deg, #EEF1F7, #B8C0CF)'
                            : '#0A0C11',
                          fontFamily: SERIF,
                          fontWeight: 500,
                          fontSize: isSilver ? 18 : 16,
                          color: isSilver ? '#0A0C11' : circleRim,
                          boxShadow: isSilver ? '0 0 14px rgba(221,227,236,0.6)' : 'none',
                          scale: String(1 + (isSilver ? silverPop * 0.4 : pops * 0.25)),
                        }}
                      >
                        {finish === 'bronze' ? 'II' : 'III'}
                      </span>
                    )}
                  </>
                )}
              </div>

              <span style={{ position: 'relative', fontFamily: SERIF, fontWeight: 500, fontSize: 27, color: '#EEF1F7', opacity: finish === 'reserved' ? 0.3 : 1 }}>
                {sign.name}
              </span>
              <span
                style={{
                  position: 'relative',
                  fontFamily: MONO,
                  fontSize: 15,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: isGold ? GOLD_RIM : INK_2,
                  opacity: finish === 'reserved' ? 0 : 0.9,
                }}
              >
                {finish === 'reserved' ? '' : FINISH_CAPTION[finish]}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          padding: '18px 0 10px',
          borderTop: `1px solid ${plateIn > 0 ? 'rgba(224,176,128,0.4)' : 'transparent'}`,
          opacity: plateIn,
          translate: `0px ${(1 - plateIn) * 14}px`,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 26, letterSpacing: '0.34em', color: GOLD_RIM }}>
          THE COMPLETE TWELVE
        </span>
        <span style={{ fontFamily: MONO, fontSize: 19, letterSpacing: '0.3em', color: 'rgba(224,176,128,0.7)' }}>
          RECORDED JULY 24, 2026 UTC
        </span>
      </div>
    </div>
  );
};
