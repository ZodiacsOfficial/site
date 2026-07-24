import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import './fonts';
import { SIGNS, VOID } from './theme';
import { Case } from './cabinet/Case';
import { Seat, type SeatEdition } from './cabinet/Seat';
import { Cta, Flash, Ground, Line, Rung } from './cabinet/cards';
import { HELD_COUNT, RUNGS, RUNG_BEAT, STANDING, T, seatLandsAt } from './cabinet/palette';

const SLOW = Easing.bezier(0.32, 0.72, 0, 1);

/**
 * "The Cabinet of Twelve" — a 13.5s film for a muted, scrolling timeline.
 *
 * The subject is the cabinet, not any one edition. Twelve numbered niches
 * stand empty; a public record is read; the seats an address has earned light
 * up in their materials while four stay reserved. Then the ladder is read in
 * place across the filled case — I to V, each rung lighting only the seats
 * that reached it — so the system explains itself without ever cutting away
 * from the product. The gilding is the last rung, given one beat, not the plot.
 *
 * Rules the cut obeys:
 *   · Museum register. Void black, EB Garamond, long holds, silence as a
 *     device. Restraint is the brand; nothing here shouts.
 *   · Never leave the cabinet. No explainer cards — the case IS the explainer,
 *     which is also what keeps the product on screen for twelve of the
 *     thirteen seconds.
 *   · Four seats stay empty. The reserved niches are the engine; a completed
 *     case would be a nicer picture and a worse advertisement.
 *   · Read it silent. All meaning lives in image and type.
 */

/** Which rung the ladder is on, or null outside the ladder passage. */
function rungAt(frame: number): number | null {
  if (frame < T.ladderIn) return null;
  const index = Math.floor((frame - T.ladderIn) / RUNG_BEAT);
  return index < RUNGS.length ? index : RUNGS.length - 1;
}

export const TheCabinet: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height);
  const portrait = height / width > 1.2;
  const wide = width / height > 1.4;

  // The case wakes before the works — the filet lifts a breath at first light.
  const wake = interpolate(frame, [T.wake, T.wake + 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });

  // --- The gilding, as one number the whole film reads from. ---
  const gild = interpolate(frame, [T.gild, T.gild + 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  const sweep = interpolate(frame, [T.gild, T.gildSweepEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const plate = interpolate(frame, [T.plateIn, T.plateIn + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });

  const rung = rungAt(frame);
  const ladderOver = frame >= T.lineRecord;

  // A very slow push across the whole film. The camera never cuts — the case
  // is the only location, so the movement has to come from the lens.
  const push = interpolate(frame, [T.wake, T.ctaIn], [0.985, 1.02], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.linear,
  });
  const stageOut = interpolate(frame, [T.ctaIn - 14, T.ctaIn], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cols = portrait ? 3 : wide ? 6 : 4;
  const seatW = portrait ? unit * 0.265 : wide ? height * 0.185 : unit * 0.175;
  const casePad = unit * 0.03;

  return (
    <AbsoluteFill style={{ backgroundColor: VOID }}>
      {/* Scored to this cut, not laid under it — scripts/make-cabinet-audio.mjs.
          The film still reads silent, which is how most of the feed will see it. */}
      <Audio src={staticFile('cabinet.wav')} />
      <Ground />

      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: unit * 0.12,
          opacity: stageOut,
          scale: String(push),
        }}
      >
        <Case
          gild={gild}
          sweep={frame >= T.gild ? sweep : 2}
          pad={casePad}
          plate={plate}
          wake={wake}
          sweepStrength={0.32}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, ${seatW}px)`,
              gap: seatW * 0.07,
            }}
          >
            {SIGNS.map((sign, index) => {
              const standing = STANDING[index];
              const landsAt = seatLandsAt(index);
              const held = standing.edition !== 'reserved';
              const landed = held && frame >= landsAt;

              // The gilding is withheld until its own rung: until then Aries
              // stands as what it is on the ladder below — a Gold Sculpture.
              const edition: SeatEdition = !landed
                ? 'reserved'
                : standing.edition === 'gilded' && frame < T.gild
                  ? 'gold'
                  : standing.edition;

              // During the ladder, only the rung's own seats keep the light.
              const onRung = rung !== null && RUNGS[rung].edition === standing.edition;
              const dim = ladderOver || rung === null ? 0 : onRung ? 0 : 0.72;

              return (
                <Seat
                  key={sign.slug}
                  slug={sign.slug}
                  name={sign.name}
                  index={index}
                  edition={edition}
                  width={seatW}
                  sinceRecast={landed ? frame - landsAt : 999}
                  tally={landed ? (standing.tally ?? 0) : 0}
                  gild={standing.edition === 'gilded' ? gild : 0}
                  dim={dim}
                />
              );
            })}
          </div>
        </Case>
      </AbsoluteFill>

      {/* ── What the case is. ───────────────────────────────────────── */}
      <Line
        text="Twelve signs. Twelve seats. One public record."
        from={T.lineTwelve}
        until={T.ladderIn + 4}
        size={unit * 0.044}
        rule={`${HELD_COUNT} of the Twelve represented`}
        ruleFrom={T.countIn}
      />

      {/* ── The ladder, read in place across the filled case. ───────── */}
      {RUNGS.map((entry, index) => (
        <Rung
          key={entry.edition}
          numeral={entry.numeral}
          name={entry.name}
          range={entry.range}
          from={T.ladderIn + index * RUNG_BEAT}
          until={
            index === RUNGS.length - 1
              ? T.lineRecord - 6
              : T.ladderIn + (index + 1) * RUNG_BEAT
          }
          size={unit * 0.03}
          gilt={entry.edition === 'gilded'}
        />
      ))}

      <Flash from={T.gild} peak={0.3} />

      {/* ── What it means. ──────────────────────────────────────────── */}
      <Line
        text="Every edition is read from the record, never granted."
        from={T.lineRecord}
        until={T.lineUnfinished + 2}
        size={unit * 0.04}
      />
      <Line
        text="Few cabinets are ever finished."
        from={T.lineUnfinished}
        until={T.ctaIn - 2}
        size={unit * 0.05}
        italic
      />

      <Cta from={T.ctaIn} until={T.end} />
    </AbsoluteFill>
  );
};
