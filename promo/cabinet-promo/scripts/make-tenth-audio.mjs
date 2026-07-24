/**
 * Generates public/tenth.wav — the cue for "The Tenth" (13.1s at 30fps).
 *
 * Scored to the cut rather than laid under it. The nine strikes are the
 * rhythm section: each landing sculpture is a struck coin a semitone-ish
 * higher than the last, accelerating with the edit. Then the film's whole
 * argument happens in the silence — the bed drops to a lone held fifth for
 * nearly two seconds, because a ceiling only reads if you are made to wait
 * under it. The tenth arrives on one restrained accent into an F-major bloom.
 *
 * Pure-math synthesis, no samples. Deterministic: same script, same bytes.
 * Run: node scripts/make-tenth-audio.mjs
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { accent, bell, createBed, pad, pluck, pulse, reseed, shimmer, strike, writeWav } from './synth.mjs';

const FPS = 30;
/** Mirrors src/tenth/leaf.ts — the cue and the cut read from one timing sheet. */
const T = {
  strikes: [0, 18, 32, 44, 55, 65, 74, 82, 89],
  holdIn: 112,
  lineNine: 120,
  turnIn: 146,
  gild: 180,
  plateIn: 204,
  numberIn: 234,
  flexIn: 276,
  ctaIn: 350,
  end: 394,
};
const at = (frame) => frame / FPS;

const DURATION = at(T.end) + 0.35;
const bed = createBed(DURATION);
reseed();

// ---- Notes ----
const D2 = 73.42, A2 = 110, D3 = 146.83, F3 = 174.61, A3 = 220, D4 = 293.66;
const F2 = 87.31, C3 = 130.81, C4 = 261.63, E3 = 164.81, G3 = 196;

// ---- Act one: nine strikes, climbing and accelerating. ----
// A low bed holds under the whole climb so the strikes have something to be
// against; without it, nine taps in three seconds read as a notification.
pad(bed, 0, at(T.holdIn) + 0.4, [D2, A2, D3], { gain: 0.06, attack: 0.5, release: 0.9 });

// One struck coin per sculpture, each a step brighter — the count is audible
// even for a viewer who is not reading the badge.
const STRIKE_PITCH = [392, 415.3, 440, 466.16, 493.88, 523.25, 554.37, 587.33, 622.25];
T.strikes.forEach((frame, i) => {
  strike(bed, at(frame), STRIKE_PITCH[i], { gain: 0.085 + i * 0.006 });
  if (i % 2 === 0) pulse(bed, at(frame), D2, { gain: 0.1 + i * 0.012 });
});

// ---- The hold: everything drops away to a lone fifth. ----
// This is the loudest idea in the cue and it is made of nothing.
pad(bed, at(T.holdIn), at(T.turnIn) + 0.5, [A2, A3], { gain: 0.038, attack: 0.6, release: 0.7 });
bell(bed, at(T.lineNine), 587.33, { gain: 0.038 });

// ---- The turn: three quiet steps up, under "Then the tenth." ----
pluck(bed, at(T.turnIn) + 0.25, C4, { gain: 0.055, dur: 0.8 });
pluck(bed, at(T.turnIn) + 0.72, D4, { gain: 0.065, dur: 0.8 });
pad(bed, at(T.turnIn) + 0.9, at(T.gild), [D3, A3], { gain: 0.05, attack: 0.7, release: 0.25 });

// ---- The tenth. One accent, then the bloom. ----
accent(bed, at(T.gild), { gain: 0.4 });
pad(bed, at(T.gild), at(T.numberIn) + 0.6, [F2, C3, F3, A3, C4], { gain: 0.115, attack: 0.45, release: 1.1 });
shimmer(bed, at(T.gild) + 0.3, { dur: 3.2 });
bell(bed, at(T.plateIn), 698.46, { gain: 0.06 });

// ---- The stamp and the flex: the bloom holds, the pulse returns. ----
pad(bed, at(T.numberIn), at(T.ctaIn) + 0.4, [F2, C3, E3, G3, C4], { gain: 0.1, attack: 0.6, release: 1.3 });
for (let b = 0; b < 5; b++) pulse(bed, at(T.flexIn) + b * 0.577, F2, { gain: 0.095 });

// ---- Resolve: home to D as the address lands, then out. ----
pad(bed, at(T.ctaIn), DURATION - 0.05, [D3, F3, A3, D4], { gain: 0.078, attack: 0.5, release: 1.2 });

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'public', 'tenth.wav');
const bytes = writeWav(bed, out);
console.log(`Wrote ${out} (${(bytes / 1_048_576).toFixed(1)} MB, ${DURATION.toFixed(2)}s)`);
