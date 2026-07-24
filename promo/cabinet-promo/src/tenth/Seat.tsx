import { Img, spring, staticFile, useVideoConfig } from 'remotion';
import { HAIR, HAIR_SOFT, INK_2, MONO, SERIF } from '../theme';
import { LEAF, LEAF_BAR, LEAF_BRIGHT, LEAF_INK } from './leaf';

export type SeatEdition = 'reserved' | 'pastel' | 'bronze' | 'silver' | 'gold' | 'gilded';

const BRONZE_RIM = '#B08D57';
const GOLD_RIM = '#E0B080';

const CAPTION: Record<Exclude<SeatEdition, 'reserved'>, string> = {
  pastel: 'I · PASTEL',
  bronze: 'II · BRONZE',
  silver: 'III · SILVER',
  gold: 'IV · GOLD',
  gilded: 'V · GILDED',
};

export interface SeatProps {
  slug: string;
  name: string;
  index: number;
  edition: SeatEdition;
  width: number;
  /** Frames since this seat last changed material — drives the recast pop. */
  sinceRecast?: number;
  /** Gold sculptures standing in the seat; the badge appears from two. */
  tally?: number;
  /** 0–1 gild progress: the cast bar draws on as the leaf is laid. */
  gild?: number;
  /** Dims a seat so another can take the light. */
  dim?: number;
  showCaption?: boolean;
  /** Reserves a row of struck roundels under the sculpture — the hero only. */
  tallyStrip?: boolean;
  /** The hero counts from one; seats in the wide shot follow the site's rule. */
  badgeFrom?: number;
}

/**
 * One niche of the cabinet, at any edition.
 *
 * The same component plays the hero close-up and the twelve-seat wide shot, so
 * the seat the viewer studies for six seconds is provably the seat they later
 * find in the case — the flex only works if the object is the same object.
 */
export const Seat: React.FC<SeatProps> = ({
  slug,
  name,
  index,
  edition,
  width,
  sinceRecast = 999,
  tally = 0,
  gild = 0,
  dim = 0,
  showCaption = true,
  tallyStrip = false,
  badgeFrom = 2,
}) => {
  const { fps } = useVideoConfig();
  const height = Math.round(width * 1.16);
  const art = width * 0.58;
  const reserved = edition === 'reserved';
  const gold = edition === 'gold' || edition === 'gilded';
  const gilded = edition === 'gilded';
  const rim = edition === 'bronze' || edition === 'silver' ? BRONZE_RIM : null;

  const pop = spring({ frame: sinceRecast, fps, config: { damping: 12, mass: 0.5 }, durationInFrames: 18 });
  const recoil = sinceRecast < 18 ? (1 - pop) * 0.14 : 0;

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: width * 0.03,
        borderRadius: width * 0.06,
        border: gilded
          ? 'none'
          : `1.5px solid ${reserved ? HAIR_SOFT : gold ? `${GOLD_RIM}55` : rim ? `${rim}55` : HAIR}`,
        background: gold
          ? `radial-gradient(circle at 50% 40%, rgba(224,176,128,${0.1 + gild * 0.12}), transparent 72%), #0C0A07`
          : 'rgba(10,12,17,0.5)',
        boxShadow: gilded
          ? `inset 0 0 ${width * 0.16}px rgba(150,105,34,${0.3 * gild}), 0 0 ${width * 0.2 * gild}px rgba(224,176,128,0.3)`
          : gold
            ? `0 0 ${width * 0.1}px rgba(224,176,128,0.18)`
            : 'none',
        filter: dim > 0 ? `brightness(${1 - dim * 0.62}) saturate(${1 - dim * 0.5})` : undefined,
      }}
    >
      {/* The cast bar: the only frame in the case made of metal rather than a
          hairline. It draws on with the gild rather than cutting in. */}
      {gilded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: width * 0.06,
            padding: Math.max(3, width * 0.022) * gild,
            background: LEAF_BAR,
            opacity: gild,
            WebkitMask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
            mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
          }}
        />
      )}

      <span
        style={{
          position: 'absolute',
          top: width * 0.05,
          left: width * 0.06,
          fontFamily: MONO,
          fontSize: width * 0.045,
          letterSpacing: '0.12em',
          color: gilded ? `rgba(255,242,196,${0.5 + gild * 0.4})` : 'rgba(142,150,171,0.7)',
        }}
      >
        {`Nº ${String(index + 1).padStart(2, '0')}`}
      </span>

      {tally >= badgeFrom && (
        <span
          style={{
            position: 'absolute',
            top: width * 0.04,
            right: width * 0.05,
            padding: `${width * 0.012}px ${width * 0.05}px`,
            border: `1.5px solid ${gilded ? 'rgba(255,242,196,0.75)' : `${GOLD_RIM}aa`}`,
            borderRadius: 999,
            background: gilded ? LEAF_BAR : 'rgba(17,14,10,0.85)',
            fontFamily: MONO,
            fontWeight: gilded ? 700 : 400,
            fontSize: width * 0.062,
            color: gilded ? LEAF_INK : GOLD_RIM,
            scale: String(1 + recoil * 0.9),
          }}
        >
          {`×${tally}`}
        </span>
      )}

      <div
        style={{
          position: 'relative',
          width: art,
          height: art,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {reserved ? (
          <Img
            src={staticFile(`${slug}.webp`)}
            style={{ width: art * 0.58, height: art * 0.58, opacity: 0.07, filter: 'grayscale(1)' }}
          />
        ) : gold ? (
          <Img
            src={staticFile(`gold-${slug}.webp`)}
            style={{
              width: art,
              height: art,
              objectFit: 'contain',
              scale: String(1 + recoil * 0.6),
              filter: `drop-shadow(0 ${art * 0.04}px ${art * 0.06}px rgba(0,0,0,0.55)) drop-shadow(0 0 ${art * (0.08 + gild * 0.12)}px rgba(236,193,104,${0.4 + gild * 0.35}))`,
            }}
          />
        ) : (
          <>
            <Img
              src={staticFile(`${slug}.webp`)}
              style={{
                width: art * 0.8,
                height: art * 0.8,
                borderRadius: '50%',
                scale: String(1 + recoil * 0.5),
                boxShadow: rim ? `0 0 0 ${art * 0.04}px ${rim}, 0 0 ${art * 0.1}px ${rim}44` : 'none',
              }}
            />
            {rim && (
              <span
                style={{
                  position: 'absolute',
                  right: art * 0.02,
                  bottom: -art * 0.02,
                  width: art * 0.26,
                  height: art * 0.26,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  border: `2px solid ${edition === 'silver' ? '#EEF1F7' : rim}`,
                  background: edition === 'silver' ? 'linear-gradient(160deg, #EEF1F7, #B8C0CF)' : '#0A0C11',
                  fontFamily: SERIF,
                  fontWeight: 500,
                  fontSize: art * 0.15,
                  color: edition === 'silver' ? '#0A0C11' : rim,
                }}
              >
                {edition === 'bronze' ? 'II' : 'III'}
              </span>
            )}
          </>
        )}
      </div>

      {/* The struck tally: one roundel per sculpture standing in the seat.
          It occupies a reserved row rather than floating, so a filling seat
          never crowds its own label — and as it fills it becomes the film's
          metronome, a progress bar made of gold. */}
      {tallyStrip && (
        <span
          style={{
            position: 'relative',
            height: width * 0.11,
            display: 'flex',
            gap: width * 0.022,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 1 - gild,
          }}
        >
          {Array.from({ length: Math.min(9, tally) }, (_, i) => (
            <span
              key={i}
              style={{
                width: width * 0.062,
                height: width * 0.062,
                borderRadius: '50%',
                border: `1px solid ${LEAF}66`,
                background: `radial-gradient(circle at 34% 28%, ${LEAF_BRIGHT} 0%, ${GOLD_RIM} 38%, #8A5F28 72%, #5E4116 100%)`,
                boxShadow: 'inset 0 -1px 2px rgba(94,65,22,0.9), inset 0 1px 1px rgba(255,246,216,0.7), 0 2px 4px rgba(0,0,0,0.6)',
                // Only the newest roundel recoils — the rest have settled.
                scale: String(i === tally - 1 ? 1 + recoil * 1.6 : 1),
              }}
            />
          ))}
        </span>
      )}

      <span
        style={{
          position: 'relative',
          fontFamily: SERIF,
          fontWeight: 500,
          fontSize: width * 0.11,
          lineHeight: 1,
          color: gilded ? '#FBF4E2' : '#EEF1F7',
          opacity: reserved ? 0.28 : 1,
        }}
      >
        {name}
      </span>
      {showCaption && !reserved && (
        <span
          style={{
            position: 'relative',
            fontFamily: MONO,
            fontSize: width * 0.055,
            letterSpacing: '0.18em',
            color: gilded
              ? LEAF_BRIGHT
              : gold
                ? GOLD_RIM
                : edition === 'pastel'
                  ? INK_2
                  : INK_2,
            opacity: 0.92,
          }}
        >
          {CAPTION[edition]}
        </span>
      )}
    </div>
  );
};
