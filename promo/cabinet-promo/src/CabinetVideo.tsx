import { Audio } from '@remotion/media';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import './fonts';
import { Cabinet } from './Cabinet';
import { Counter, EdgeGlow, Flash, Ground, RingBurst, Shockwave, TitleCard } from './overlays';
import { BRONZE, GOLD, INK_1, INK_2, MONO, SERIF, SILVER, VOID } from './theme';

const SLOW = Easing.bezier(0.32, 0.72, 0, 1);

/** Landing frame for each of the twelve discs, zodiac order. */
const SEAT_FRAMES = [60, 129, 136, 143, 150, 157, 164, 171, 194, 199, 204, 275];
const GOLD_FRAME = 200;
const DESCENT_START = 240;
const MASTER_FRAME = 275;

const MasterTitle = () => {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '7%' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          textAlign: 'center',
          opacity: inP,
          translate: `0px ${(1 - inP) * 46}px`,
        }}
      >
        <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 92, lineHeight: 1.05, color: '#EEF1F7', padding: '0 60px' }}>
          MASTER OF THE CABINET
        </div>
        <div style={{ fontFamily: MONO, fontSize: 32, letterSpacing: '0.28em', color: INK_2, textTransform: 'uppercase' }}>
          All twelve · Gold depth
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Cta = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  const outP = interpolate(frame, [duration - 12, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{ backgroundColor: VOID, alignItems: 'center', justifyContent: 'center', opacity: outP }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 30,
          textAlign: 'center',
          opacity: inP,
          scale: String(0.97 + inP * 0.03),
        }}
      >
        <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 92, color: '#EEF1F7' }}>
          Begin your cabinet.
        </div>
        <div style={{ fontFamily: MONO, fontSize: 34, letterSpacing: '0.12em', color: INK_1 }}>
          zodiacs.org/registry/collection
        </div>
        <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 38, color: INK_2, marginTop: 26 }}>
          Zodiacs·org
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const CabinetVideo = () => {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const portrait = height > width;

  // Total-held counter: montage climb, then the roll past 1,000,000.
  const counterValue = interpolate(
    frame,
    [122, 180, 192, 204],
    [0, 460_000, 700_000, 1_042_000],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const counterOpacity = interpolate(frame, [122, 130, 206, 212], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // The stage (cabinet + counter) fades to black before the final beats.
  const stageFade = interpolate(frame, [345, 358], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: VOID }}>
      <Ground />

      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: portrait ? 44 : 30,
          opacity: stageFade,
        }}
      >
        <Cabinet
          seatFrames={SEAT_FRAMES}
          goldFrame={GOLD_FRAME}
          masterFrame={MASTER_FRAME}
          descentStart={DESCENT_START}
        />
        <div style={{ opacity: counterOpacity, height: 44 }}>
          <Counter value={counterValue} label="Total held —" />
        </div>
      </AbsoluteFill>

      <Sequence name="Slam flash" from={58} durationInFrames={14}>
        <Flash peak={0.28} />
      </Sequence>

      <Sequence name="Bronze burst" from={132} durationInFrames={40}>
        <RingBurst hue={BRONZE} label="Bronze" />
      </Sequence>
      <Sequence name="Silver burst" from={162} durationInFrames={40}>
        <RingBurst hue={SILVER} label="Silver · 100,000 held" />
      </Sequence>

      <Sequence name="Gold ignition" from={198} durationInFrames={44}>
        <EdgeGlow hue={GOLD} duration={44} />
      </Sequence>
      <Sequence name="Gold burst" from={200} durationInFrames={42}>
        <RingBurst hue={GOLD} label="Gold · 1,000,000 held" />
      </Sequence>
      <Sequence name="Gold flash" from={200} durationInFrames={12}>
        <Flash peak={0.16} color="224,176,128" />
      </Sequence>

      <Sequence name="Master shockwave" from={MASTER_FRAME} durationInFrames={38}>
        <Shockwave />
      </Sequence>
      <Sequence name="Master flash" from={MASTER_FRAME} durationInFrames={16}>
        <Flash peak={0.5} />
      </Sequence>
      <Sequence name="Master title" from={285} durationInFrames={67}>
        <MasterTitle />
      </Sequence>

      <Sequence name="Card — twelve signs" from={0} durationInFrames={45}>
        <TitleCard lines={['TWELVE SIGNS.', 'ONE OFFICIAL RECORD.']} duration={45} size={86} />
      </Sequence>
      <Sequence name="Card — keep them" from={90} durationInFrames={32}>
        <TitleCard lines={['KEEP THEM.']} duration={32} />
      </Sequence>
      <Sequence name="Card — climb" from={182} durationInFrames={12}>
        <TitleCard lines={['CLIMB.']} duration={12} />
      </Sequence>
      <Sequence name="Card — one distinction" from={212} durationInFrames={28}>
        <TitleCard lines={['ONE DISTINCTION', 'REMAINS.']} duration={28} size={86} />
      </Sequence>

      <Sequence name="Few ever finish" from={362} durationInFrames={30}>
        <TitleCard lines={['Few ever finish.']} duration={30} italic size={76} />
      </Sequence>
      <Sequence name="CTA" from={392} durationInFrames={58}>
        <Cta duration={58} />
      </Sequence>

      <Audio src={staticFile('score.wav')} />
    </AbsoluteFill>
  );
};
