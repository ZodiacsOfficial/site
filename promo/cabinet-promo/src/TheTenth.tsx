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
import { Case } from './tenth/Case';
import { Seat, type SeatEdition } from './tenth/Seat';
import { AmountCard, Cta, Flash, Ground, Line, Rule } from './tenth/cards';
import { GILDED_AMOUNT, T } from './tenth/leaf';

const SLOW = Easing.bezier(0.32, 0.72, 0, 1);

/**
 * "The Tenth" — a fourteen-second film for a muted, scrolling timeline.
 *
 * The earlier promo walked the ladder from I to IV, which teaches but does not
 * want. This one is built on a single dramatic idea instead: a tally climbs to
 * nine, everything stops, and then the tenth sculpture gilds the entire case.
 * Scarcity here is comparative, not instructional — the payoff frame is eleven
 * dark seats and one lit one, which is also the frame worth screenshotting.
 *
 * Rules the cut obeys:
 *   · Open already lit. No title card — a text-only first frame is a frame the
 *     viewer scrolls past.
 *   · One idea, stated once. Every beat serves the tenth.
 *   · Hold on nine. The pause is the luxury signal; nothing else in the feed
 *     stops moving.
 *   · Read it silent. All meaning lives in image and type.
 */

/** The hero seat: Aries, the first niche, studied then found again in the case. */
const HERO = 0;

/** How many sculptures stand in the hero seat at a given frame. */
function tallyAt(frame: number): number {
  if (frame >= T.gild) return 10;
  let count = 0;
  for (const at of T.strikes) if (frame >= at) count += 1;
  return count;
}

function sinceLastStrike(frame: number): number {
  if (frame >= T.gild) return frame - T.gild;
  let last = -999;
  for (const at of T.strikes) if (frame >= at) last = at;
  return frame - last;
}

/** The wide shot's standing: one gilded seat against a believable collection. */
const WIDE_EDITIONS: SeatEdition[] = [
  'gilded', 'reserved', 'reserved', 'pastel', 'bronze', 'reserved',
  'reserved', 'silver', 'reserved', 'reserved', 'gold', 'reserved',
];

export const TheTenth: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height);
  const portrait = height / width > 1.2;
  const wide = width / height > 1.4;

  // --- The gilding, as one number the whole film reads from. ---
  const gild = interpolate(frame, [T.gild, T.gild + 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  const sweep = interpolate(frame, [T.gild, T.gildSweepEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const plate = interpolate(frame, [T.plateIn, T.plateIn + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });

  const tally = tallyAt(frame);
  const heroEdition: SeatEdition = frame >= T.gild ? 'gilded' : 'gold';

  // --- The turn: the room drops back before the tenth lands. ---
  const roomDim = interpolate(
    frame,
    [T.turnIn, T.turnIn + 20, T.dimOut, T.dimOut + 26],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: SLOW },
  );

  // --- Camera. A slow push through the climb, a lock during the hold, and a
  //     pull back at the reveal so the seat is delivered into its case. ---
  const push = interpolate(frame, [T.hookIn, T.holdIn], [1.0, 1.06], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.linear,
  });
  const heroScale = interpolate(frame, [T.gild, T.gild + 16, T.numberIn], [push, push * 1.05, push * 1.02], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  const heroOut = interpolate(frame, [T.numberIn - 10, T.numberIn], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // --- The wide shot enters from the number card, already gilded. ---
  const wideIn = interpolate(frame, [T.flexIn, T.flexIn + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: SLOW,
  });
  const wideOut = interpolate(frame, [T.ctaIn - 12, T.ctaIn], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const heroSeatW = unit * (portrait ? 0.6 : 0.55);
  const cols = portrait ? 3 : wide ? 6 : 4;
  const wideSeatW = portrait ? unit * 0.25 : wide ? height * 0.185 : unit * 0.155;
  const casePad = unit * 0.032;

  const showHero = frame < T.numberIn;
  const showWide = frame >= T.flexIn && frame < T.ctaIn;

  return (
    <AbsoluteFill style={{ backgroundColor: VOID }}>
      {/* Scored to this cut, not laid under it — see scripts/make-tenth-audio.mjs.
          The film still reads silent, which is how most of the feed will see it. */}
      <Audio src={staticFile('tenth.wav')} />
      <Ground />

      {/* ── Act one: one seat, filling. ─────────────────────────────── */}
      {showHero && (
        <AbsoluteFill
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: unit * 0.18,
            opacity: heroOut,
            scale: String(heroScale),
          }}
        >
          <Case gild={gild} sweep={frame >= T.gild ? sweep : 2} pad={casePad} plate={plate}>
            <Seat
              slug={SIGNS[HERO].slug}
              name={SIGNS[HERO].name}
              index={HERO}
              edition={heroEdition}
              width={heroSeatW}
              sinceRecast={sinceLastStrike(frame)}
              tally={tally}
              gild={gild}
              tallyStrip
              badgeFrom={1}
            />
          </Case>
        </AbsoluteFill>
      )}

      {/* The room drops back so one seat can take the light. */}
      {frame >= T.turnIn && frame < T.numberIn && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 46% 40% at 50% 48%, transparent 30%, rgba(0,0,0,${0.72 * roomDim}))`,
          }}
        />
      )}

      <Rule
        text="One gold sculpture per million held"
        from={T.ruleIn}
        until={T.holdIn - 4}
        size={unit * 0.026}
      />

      <Line
        text="Nine is not the end of the ladder."
        from={T.lineNine}
        until={T.turnIn + 6}
        size={unit * 0.052}
      />
      <Line
        text="Then the tenth."
        from={T.lineTenth}
        until={T.gild + 8}
        size={unit * 0.072}
        italic
      />

      <Flash from={T.gild} peak={0.36} />

      {/* ── Act two: the price, stamped. ────────────────────────────── */}
      <AmountCard from={T.numberIn} until={T.flexIn} amount={GILDED_AMOUNT} />

      {/* ── Act three: the flex. Eleven dark seats, one lit. ─────────── */}
      {showWide && (
        <AbsoluteFill
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: portrait ? 0 : unit * 0.14,
            opacity: wideIn * wideOut,
            scale: String(0.96 + wideIn * 0.04),
          }}
        >
          <Case gild={1} sweep={interpolate(frame, [T.flexIn + 10, T.flexIn + 54], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })} pad={casePad} plate={1} sweepStrength={0.3}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, ${wideSeatW}px)`,
                gap: wideSeatW * 0.07,
              }}
            >
              {SIGNS.map((sign, index) => (
                <Seat
                  key={sign.slug}
                  slug={sign.slug}
                  name={sign.name}
                  index={index}
                  edition={WIDE_EDITIONS[index]}
                  width={wideSeatW}
                  tally={WIDE_EDITIONS[index] === 'gilded' ? 10 : WIDE_EDITIONS[index] === 'gold' ? 3 : 0}
                  gild={WIDE_EDITIONS[index] === 'gilded' ? 1 : 0}
                  dim={WIDE_EDITIONS[index] === 'gilded' ? 0 : 0.55}
                  showCaption={!portrait || wideSeatW > 200}
                />
              ))}
            </div>
          </Case>
        </AbsoluteFill>
      )}

      <Line
        text="One seat gilds the whole case."
        from={T.flexLine}
        until={T.ctaIn - 6}
        size={unit * 0.056}
        rule="Read from the public record, never granted"
        ruleFrom={T.flexLine + 14}
      />

      {/* ── The close. ──────────────────────────────────────────────── */}
      <Cta from={T.ctaIn} until={T.end} />
    </AbsoluteFill>
  );
};
