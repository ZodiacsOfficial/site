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
import { Cabinet, type CabinetWaves } from './Cabinet';
import { Flash, Ground, TitleCard } from './overlays';
import { INK_1, INK_2, MONO, SERIF, VOID } from './theme';

const SLOW = Easing.bezier(0.32, 0.72, 0, 1);

/** The material waves — each seat's landing frame per edition, zodiac order. */
const WAVES: CabinetWaves = {
  pastel: Array.from({ length: 12 }, (_, i) => 62 + i * 4),
  bronze: Array.from({ length: 12 }, (_, i) => 148 + i * 2),
  silver: Array.from({ length: 12 }, (_, i) => 178 + i * 2),
  // The gold working slows as it closes: the twelfth casting lands on the accent.
  gold: [242, 246, 250, 254, 257, 260, 263, 266, 268, 270, 272, 275],
  plateFrame: 292,
};

const WaveCaption = ({
  text,
  from,
  until,
  gold = false,
}: {
  text: string;
  from: number;
  until: number;
  gold?: boolean;
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [from, from + 8, until - 8, until], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '4.5%' }}>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 30,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: gold ? '#E0B080' : INK_2,
          opacity,
        }}
      >
        {text}
      </span>
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

  // The stage fades to black before the closing line.
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
          opacity: stageFade,
          scale: portrait ? '1' : '0.96',
        }}
      >
        <Cabinet waves={WAVES} />
      </AbsoluteFill>

      <WaveCaption text="Pastel · under 10,000 held" from={104} until={144} />
      <WaveCaption text="Bronze · from 10,000 held" from={150} until={177} />
      <WaveCaption text="Silver · from 100,000 held" from={180} until={208} />
      <WaveCaption text="Gold Sculpture · from 1,000,000 held" from={250} until={300} gold />

      <Sequence name="Master flash" from={275} durationInFrames={14}>
        <Flash peak={0.3} color="224,176,128" />
      </Sequence>

      <Sequence name="Card — twelve signs" from={0} durationInFrames={45}>
        <TitleCard lines={['TWELVE SIGNS.', 'ONE OFFICIAL RECORD.']} duration={45} size={86} />
      </Sequence>
      <Sequence name="Card — recast" from={115} durationInFrames={30}>
        <TitleCard lines={['EVERY SEAT', 'CAN BE RECAST.']} duration={30} size={86} />
      </Sequence>
      <Sequence name="Card — one casting" from={210} durationInFrames={30}>
        <TitleCard lines={['ONE CASTING', 'REMAINS.']} duration={30} size={86} />
      </Sequence>

      <Sequence name="Few ever finish" from={362} durationInFrames={30}>
        <TitleCard lines={['Few cabinets are ever finished.']} duration={30} italic size={66} />
      </Sequence>
      <Sequence name="CTA" from={392} durationInFrames={58}>
        <Cta duration={58} />
      </Sequence>

      <Audio src={staticFile('score.wav')} />
    </AbsoluteFill>
  );
};
