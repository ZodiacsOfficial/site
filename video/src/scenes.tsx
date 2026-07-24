/**
 * Scene content layers. Each renders into the 1080×1080 stage coordinate
 * space; Main.tsx owns visibility envelopes and the persistent wheel.
 * All motion: springs for entrances, clamped interpolate for drifts.
 */
import React from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT, INK } from './theme';
import { Headline, Kicker, Mono, PlacementChip, Shot } from './components/ui';
import { bigThree, receipt, skyLines } from './data';
import { SIGN_NAMES } from './theme';
import { T, ramp } from './timeline';

const enter = (frame: number, fps: number, delay: number) => {
  const s = spring({ frame: frame - delay, fps, config: { damping: 26, stiffness: 110 } });
  return { opacity: Math.min(1, Math.max(0, s * 1.2)), shift: (1 - s) * 26 };
};

/** A screenshot shown wider than its clip box (left-anchored crop). */
const CroppedImg: React.FC<{ src: string; width: number }> = ({ src, width }) => (
  <Img src={staticFile(src)} style={{ width, display: 'block' }} />
);

/* ── Scene 2 · Natal: right column beside the wheel ─────────────────── */
export const NatalPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = enter(frame, fps, 52);
  const c1 = enter(frame, fps, 84);
  const c2 = enter(frame, fps, 92);
  const c3 = enter(frame, fps, 100);
  const rec = enter(frame, fps, 114);
  const chipW = 396;
  return (
    <>
      <Headline
        size={62}
        style={{
          position: 'absolute', top: 64, left: 0, width: 1080,
          opacity: head.opacity, transform: `translateY(${head.shift}px)`,
        }}
      >
        Placements, aspects, houses.
      </Headline>
      <div style={{ position: 'absolute', left: 648, top: 268, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ opacity: c1.opacity, transform: `translateX(${c1.shift}px)` }}>
          <PlacementChip role="SUN" sign={bigThree.sun.sign} signName={SIGN_NAMES[bigThree.sun.sign]} degree={bigThree.sun.label} width={chipW} />
        </div>
        <div style={{ opacity: c2.opacity, transform: `translateX(${c2.shift}px)` }}>
          <PlacementChip role="MOON" sign={bigThree.moon.sign} signName={SIGN_NAMES[bigThree.moon.sign]} degree={bigThree.moon.label} width={chipW} />
        </div>
        <div style={{ opacity: c3.opacity, transform: `translateX(${c3.shift}px)` }}>
          <PlacementChip role="RISING" sign={bigThree.rising.sign} signName={SIGN_NAMES[bigThree.rising.sign]} degree={bigThree.rising.label} width={chipW} />
        </div>
        <Mono size={20} color={INK.i3} style={{ opacity: rec.opacity, width: chipW + 40, lineHeight: 1.6 }}>
          {receipt}
        </Mono>
      </div>
    </>
  );
};

/* ── Scene 3 · Horoscopes: real cards, visibly different ────────────── */
export const HoroPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = enter(frame, fps, T.horoIn[0] + 4);
  const cardA = enter(frame, fps, T.horoIn[0] + 10);
  const cardB = enter(frame, fps, T.horoIn[0] + 16);
  // Second slot cycles: Leo → Pisces (each a genuinely different reading).
  const swap = ramp(frame, [190, 202], 'in');
  const cardW = 330;
  return (
    <>
      <Headline
        size={62}
        style={{
          position: 'absolute', top: 64, left: 0, width: 1080,
          opacity: head.opacity, transform: `translateY(${head.shift}px)`,
        }}
      >
        Twelve signs, twelve horoscopes.
      </Headline>
      <Mono
        size={24} color={INK.i3}
        style={{ position: 'absolute', top: 148, left: 0, width: 1080, textAlign: 'center', opacity: head.opacity }}
      >
        daily · free · no signup
      </Mono>
      <div style={{ position: 'absolute', left: 178, top: 226, opacity: cardA.opacity, transform: `translateY(${cardA.shift}px)` }}>
        <Shot src="shots/horoscope-aries.png" width={cardW} />
      </div>
      <div style={{ position: 'absolute', left: 572, top: 226, opacity: cardB.opacity, transform: `translateY(${cardB.shift}px)` }}>
        <div style={{ position: 'relative' }}>
          <div style={{ opacity: 1 - swap }}>
            <Shot src="shots/horoscope-leo.png" width={cardW} />
          </div>
          <div style={{ position: 'absolute', inset: 0, opacity: swap }}>
            <Shot src="shots/horoscope-pisces.png" width={cardW} />
          </div>
        </div>
      </div>
    </>
  );
};

/* ── Scene 4 · Synastry: the bi-wheel + real cross-aspects ──────────── */
export const SynPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = enter(frame, fps, T.synIn[0] + 4);
  const wheel = enter(frame, fps, T.synIn[0] + 10);
  const people = enter(frame, fps, T.synIn[0] + 18);
  const l1 = enter(frame, fps, T.synIn[0] + 30);
  const l2 = enter(frame, fps, T.synIn[0] + 38);
  const l3 = enter(frame, fps, T.synIn[0] + 46);
  const drift = interpolate(frame, [T.synIn[0], T.synOut[1]], [0, -14], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <>
      <Headline
        size={62}
        style={{
          position: 'absolute', top: 64, left: 0, width: 1080,
          opacity: head.opacity, transform: `translateY(${head.shift}px)`,
        }}
      >
        Synastry, chart over chart.
      </Headline>
      <div style={{ position: 'absolute', left: 64, top: 236, opacity: wheel.opacity, transform: `translateY(${wheel.shift + drift * -0.4}px)` }}>
        <Shot src="shots/synastry-wheel.png" width={560} />
      </div>
      <div style={{ position: 'absolute', left: 660, top: 258, width: 372, display: 'flex', flexDirection: 'column', gap: 26 }}>
        {/* Person A / Person B big-three chips — the tool's own render, cropped left of its close control. */}
        <div
          style={{
            opacity: people.opacity,
            transform: `translateX(${people.shift}px)`,
            width: 372,
            overflow: 'hidden',
            borderRadius: 18,
            border: '1px solid rgba(198,204,218,0.16)',
            background: '#0F121A',
          }}
        >
          <CroppedImg src="shots/synastry-people.png" width={688} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Mono size={33} color={INK.i0} style={{ opacity: l1.opacity, transform: `translateX(${l1.shift}px)` }}>
            36 cross-chart aspects
          </Mono>
          <Mono size={26} color={INK.i2} style={{ opacity: l2.opacity, transform: `translateX(${l2.shift}px)` }}>
            18 easeful · 18 charged
          </Mono>
          <Mono size={27} color={INK.i1} style={{ opacity: l3.opacity, transform: `translateX(${l3.shift}px)`, lineHeight: 1.75, marginTop: 6 }}>
            Mars square Pluto
            <br />
            Moon opposition Venus
            <br />
            Neptune conjunct Neptune
          </Mono>
        </div>
      </div>
    </>
  );
};

/* ── Scene 5 · The sky right now: live ephemeris readout ────────────── */
export const SkyPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = enter(frame, fps, T.skyIn[0] + 4);
  const rows: Array<[string, string, number]> = [
    ['UTC', skyLines.capturedUtc, 0],
    ['MOON', skyLines.moonPos, 1],
    ['PHASE', skyLines.moonPhase, 2],
    ['RX', skyLines.retro, 3],
    ['ECLIPSE', skyLines.eclipse, 4],
  ];
  const shotA = enter(frame, fps, T.skyIn[0] + 16);
  const shotB = enter(frame, fps, T.skyIn[0] + 24);
  return (
    <>
      <Headline
        size={62}
        style={{
          position: 'absolute', top: 64, left: 0, width: 1080,
          opacity: head.opacity, transform: `translateY(${head.shift}px)`,
        }}
      >
        The sky right now.
      </Headline>
      <div style={{ position: 'absolute', left: 76, top: 260, display: 'flex', flexDirection: 'column', gap: 30, width: 480 }}>
        {rows.map(([label, value, i]) => {
          const e = enter(frame, fps, T.skyIn[0] + 14 + i * 7);
          return (
            <div key={label} style={{ opacity: e.opacity, transform: `translateY(${e.shift * 0.6}px)` }}>
              <Mono size={19} color={INK.i3} style={{ letterSpacing: '0.22em', marginBottom: 6 }}>
                {label}
              </Mono>
              <Mono size={31} color={INK.i0} style={{ lineHeight: 1.35 }}>
                {value}
              </Mono>
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 588, top: 262, opacity: shotA.opacity, transform: `translateY(${shotA.shift}px)` }}>
        <Shot src="shots/moon-tonight.png" width={460} />
      </div>
      <div style={{ position: 'absolute', left: 588, top: 400, opacity: shotB.opacity, transform: `translateY(${shotB.shift}px)` }}>
        <Shot src="shots/transits-wheel.png" width={460} />
      </div>
    </>
  );
};

/* ── Scene 6 · End card text (the hero resolves back in behind it) ──── */
export const EndText: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - T.endIn[0], fps, config: { damping: 30, stiffness: 100 } });
  const out = ramp(frame, T.endTextOut, 'out');
  return (
    <div
      style={{
        position: 'absolute', top: 0, left: 0, width: 1080, height: 1080,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: Math.min(1, s * 1.15) * out,
      }}
    >
      <div style={{ transform: `scale(${0.965 + 0.035 * s})`, textAlign: 'center' }}>
        <Headline size={112}>Free. No signup.</Headline>
      </div>
    </div>
  );
};
