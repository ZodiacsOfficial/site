import { interpolate } from 'remotion';
import { HAIR, MONO } from '../theme';
import { LEAF_INK, LEAF_PLATE } from './leaf';

/**
 * The cabinet shell.
 *
 * `gild` runs 0→1 as the leaf is laid. It is deliberately one number: the
 * whole point of edition V is that a single seat changes the entire case, so
 * the case has exactly one control and no per-seat states of its own.
 */
export const Case: React.FC<{
  gild: number;
  /** 0–1 diagonal position of the leaf pass; >1 parks the pass off-frame. */
  sweep: number;
  pad: number;
  children: React.ReactNode;
  plate?: number;
  /** The pass is laid leaf over one seat, but milk over twelve — hence weaker. */
  sweepStrength?: number;
}> = ({ gild, sweep, pad, children, plate = 0, sweepStrength = 0.6 }) => {
  const corner = pad * 1.1;
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: pad * 0.7,
        padding: pad,
        borderRadius: pad * 0.9,
        border: `2px solid ${gild > 0 ? `rgba(232,196,106,${0.22 + gild * 0.5})` : HAIR}`,
        background:
          gild > 0
            ? `radial-gradient(118% 88% at 50% 0%, rgba(146,108,40,${0.06 + gild * 0.16}), transparent 62%), linear-gradient(180deg, rgba(198,204,218,0.03), rgba(198,204,218,0.006) 70%)`
            : 'linear-gradient(180deg, rgba(198,204,218,0.035), rgba(198,204,218,0.008) 70%)',
        boxShadow:
          gild > 0
            ? `0 0 ${60 + gild * 90}px rgba(200,150,60,${0.1 + gild * 0.2}), inset 0 0 0 ${3 * gild}px rgba(6,7,10,0.9), inset 0 0 0 ${4 * gild}px rgba(232,196,106,${0.55 * gild})`
            : 'none',
        overflow: 'hidden',
      }}
    >
      {/* Corner marks, stepped inside the filet so they read as corners
          rather than as a doubled line. */}
      {gild > 0 &&
        ([
          { top: pad * 0.4, left: pad * 0.4, borderTop: true, borderLeft: true },
          { bottom: pad * 0.4, right: pad * 0.4, borderBottom: true, borderRight: true },
        ] as const).map((mark, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: corner,
              height: corner,
              top: 'top' in mark ? mark.top : undefined,
              left: 'left' in mark ? mark.left : undefined,
              right: 'right' in mark ? mark.right : undefined,
              bottom: 'bottom' in mark ? mark.bottom : undefined,
              borderTop: 'borderTop' in mark ? `1.5px solid rgba(255,242,196,${0.62 * gild})` : undefined,
              borderLeft: 'borderLeft' in mark ? `1.5px solid rgba(255,242,196,${0.62 * gild})` : undefined,
              borderRight: 'borderRight' in mark ? `1.5px solid rgba(255,242,196,${0.62 * gild})` : undefined,
              borderBottom: 'borderBottom' in mark ? `1.5px solid rgba(255,242,196,${0.62 * gild})` : undefined,
            }}
          />
        ))}

      {children}

      {/* The cast plate. Leaf poured flat, lettering punched dark into it —
          the one plate in the film that is not engraved but cast. */}
      {plate > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: pad * 0.6,
            padding: `${pad * 0.32}px ${pad * 0.9}px`,
            borderRadius: 3,
            border: '1.5px solid rgba(255,242,196,0.78)',
            background: LEAF_PLATE,
            boxShadow: `inset 0 1px 0 rgba(255,253,240,0.5), 0 ${pad * 0.2}px ${pad * 0.7}px rgba(0,0,0,0.4)`,
            opacity: plate,
            translate: `0px ${(1 - plate) * pad * 0.5}px`,
            scale: String(0.96 + plate * 0.04),
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: pad * 0.52, letterSpacing: '0.24em', color: LEAF_INK }}>
            THE GILDED CASE
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: pad * 0.4,
              letterSpacing: '0.22em',
              color: 'rgba(42,29,7,0.62)',
            }}
          >
            SEALED V
          </span>
        </div>
      )}

      {/* One diagonal pass of leaf across the whole case. */}
      {sweep >= 0 && sweep <= 1 && (
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            bottom: '-20%',
            left: `${-40 + sweep * 145}%`,
            width: '34%',
            // Light passing over leaf, not paint over the object: the band is
            // translucent at its own core so the sculpture keeps its contrast.
            background: 'linear-gradient(104deg, transparent, rgba(255,242,196,0.58) 50%, transparent)',
            opacity: interpolate(sweep, [0, 0.18, 0.85, 1], [0, 0.5, 0.35, 0]) * sweepStrength,
            mixBlendMode: 'screen',
            transform: 'skewX(-12deg)',
          }}
        />
      )}
    </div>
  );
};
