/**
 * Generates public/cabinet.wav — the cue for "The Cabinet of Twelve" (13.5s).
 *
 * Scored to the cut rather than laid under it, and scored to the register:
 * this is a museum film, so the cue is a bed with a series of small arrivals,
 * never a build. Eight seats land as eight soft strikes rising through a
 * D-minor scale — the count is audible for a viewer who is not reading the
 * badges. The ladder passage gets five bells, one per rung, each a step
 * brighter. The gilding takes one restrained accent into an F-major bloom,
 * then everything resolves home to D under the closing lines.
 *
 * Pure-math synthesis, no samples. Deterministic: same script, same bytes.
 * Run: node scripts/make-cabinet-audio.mjs
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { accent, bell, createBed, pad, pluck, pulse, reseed, shimmer, strike, writeWav } from './synth.mjs';

const FPS = 30;
/** Mirrors src/cabinet/palette.ts — the cue and the cut read one timing sheet. */
const T = {
  wake: 0,
  fillIn: 14,
  fillStep: 9,
  countIn: 112,
  ladderIn: 146,
  rungBeat: 24,
  gild: 242,
  plateIn: 264,
  lineRecord: 300,
  lineUnfinished: 330,
  ctaIn: 356,
  end: 410,
};
/** Zodiac indices that actually hold, mirroring STANDING. */
const HELD = [0, 2, 3, 4, 6, 7, 8, 10];
const at = (frame) => frame / FPS;

const DURATION = at(T.end) + 0.4;
const bed = createBed(DURATION);
reseed();

// ---- Notes ----
const D2 = 73.42, A2 = 110, D3 = 146.83, F3 = 174.61, A3 = 220, D4 = 293.66;
const F2 = 87.31, C3 = 130.81, C4 = 261.63, E3 = 164.81, G3 = 196;

// ---- The case wakes: a low drone under an empty room. ----
pad(bed, at(T.wake), at(T.ladderIn) + 0.6, [D2, A2, D3], { gain: 0.058, attack: 1.1, release: 1.0 });

// ---- Eight seats land, rising through D minor. ----
// Soft rather than percussive: works being set down in a gallery, not coins.
const LANDING = [293.66, 329.63, 349.23, 392, 440, 466.16, 523.25, 587.33];
HELD.forEach((index, i) => {
  const t = at(T.fillIn + index * T.fillStep);
  strike(bed, t, LANDING[i], { gain: 0.062 + i * 0.004 });
  if (i % 3 === 0) pulse(bed, t, D2, { gain: 0.1 });
});

// The count settles under "Twelve signs. Twelve seats. One public record."
pad(bed, at(T.countIn), at(T.ladderIn) + 0.4, [D3, F3, A3], { gain: 0.062, attack: 0.7, release: 0.6 });

// ---- The ladder: one bell per rung, each a step brighter. ----
const RUNG_BELL = [587.33, 659.25, 698.46, 783.99, 880];
RUNG_BELL.forEach((f, i) => {
  bell(bed, at(T.ladderIn + i * T.rungBeat), f, { gain: 0.05 + i * 0.006 });
});
pad(bed, at(T.ladderIn), at(T.gild), [A2, D3, A3], { gain: 0.05, attack: 0.8, release: 0.6 });
pluck(bed, at(T.gild) - 0.6, C4, { gain: 0.05, dur: 0.7 });
pluck(bed, at(T.gild) - 0.28, D4, { gain: 0.058, dur: 0.7 });

// ---- The gilding: one restrained accent, then the bloom. ----
accent(bed, at(T.gild), { gain: 0.34 });
pad(bed, at(T.gild), at(T.lineRecord) + 0.5, [F2, C3, F3, A3, C4], { gain: 0.1, attack: 0.5, release: 1.1 });
shimmer(bed, at(T.gild) + 0.35, { gain: 0.062, dur: 2.8 });
bell(bed, at(T.plateIn), 698.46, { gain: 0.055 });

// ---- The closing lines: warm, unhurried, resolving home to D. ----
pad(bed, at(T.lineRecord), at(T.ctaIn) + 0.5, [F2, C3, E3, G3, C4], { gain: 0.088, attack: 0.7, release: 1.1 });
pulse(bed, at(T.lineUnfinished), D2, { gain: 0.085 });
pad(bed, at(T.ctaIn), DURATION - 0.05, [D3, F3, A3, D4], { gain: 0.075, attack: 0.6, release: 1.3 });

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'public', 'cabinet.wav');
const bytes = writeWav(bed, out);
console.log(`Wrote ${out} (${(bytes / 1_048_576).toFixed(1)} MB, ${DURATION.toFixed(2)}s)`);
