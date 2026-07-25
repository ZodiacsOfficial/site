/**
 * Generates public/score.wav — a 15s trailer cue for the Cabinet promo.
 * A musical bed (D-minor pulse rising to an F-major bloom) with a few
 * restrained accents; pure-math synthesis, no samples, no third-party audio.
 * Deterministic: same script, same bytes. Run: node scripts/make-audio.mjs
 *
 * The voices live in scripts/synth.mjs, shared with the other cues.
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { accent, bell, createBed, pad, pluck, pulse, reseed, shimmer, writeWav } from './synth.mjs';

const DURATION = 15;
const bed = createBed(DURATION);
reseed();

// ---- Notes ----
const D2 = 73.42, A2 = 110, D3 = 146.83, F3 = 174.61, A3 = 220, D4 = 293.66, F4 = 349.23, E4 = 329.63;
const Bb2 = 116.54, Bb3 = 233.08;
const F2 = 87.31, C3 = 130.81, C4 = 261.63, A4 = 440;

// ---- The cue ----
// Open (0–3s): low D-minor drone, mysterious.
pad(bed, 0.0, 3.4, [D2, A2, D3, F3], { gain: 0.07, attack: 1.4 });

// Build (3–7s): pulse + ostinato + fuller Dm, lift to Bb.
for (let b = 0; b < 7; b++) pulse(bed, 3.0 + b * 0.577, D2, { gain: 0.14 + b * 0.012 });
// Threshold cards: HOLD 10,000 / 100,000 / 1,000,000 — soft ascending bells.
bell(bed, 3.55, 587.33);
bell(bed, 5.08, 659.25, { gain: 0.065 });
bell(bed, 6.62, 698.46, { gain: 0.075 });
pad(bed, 3.2, 5.4, [D3, F3, A3, D4], { gain: 0.075 });
pad(bed, 5.2, 7.05, [Bb2, D3, F3, Bb3], { gain: 0.085 });
const ARP = [D4, F4, A3, D4, E4, F4, A4, F4];
ARP.forEach((f, i) => pluck(bed, 3.3 + i * 0.462, f, { gain: 0.075 + i * 0.006 }));

// The turn (7–8s): everything thins to a lone dominant — held breath.
pad(bed, 7.05, 8.35, [A2, A3], { gain: 0.045, attack: 0.35, release: 0.5 });

// The descent (8–9.2s): quiet rising steps under the twelfth piece.
pluck(bed, 8.1, C4, { gain: 0.06, dur: 0.8 });
pluck(bed, 8.55, D4, { gain: 0.07, dur: 0.8 });
pluck(bed, 8.95, E4, { gain: 0.08, dur: 0.7 });

// The master arrival (9.17s): one restrained accent, then the F-major bloom.
accent(bed, 9.17, { gain: 0.4 });
pad(bed, 9.2, 13.4, [F2, C3, F3, A3, C4], { gain: 0.115, attack: 0.5, release: 1.6 });
shimmer(bed, 9.5);
for (let b = 0; b < 6; b++) pulse(bed, 9.75 + b * 0.577, F2, { gain: 0.1 });

// Resolve (13–15s): the bloom settles home on D, fading.
pad(bed, 13.0, 14.9, [D3, F3, A3, D4], { gain: 0.08, attack: 0.6, release: 1.5 });

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'public', 'score.wav');
const bytes = writeWav(bed, out);
console.log(`Wrote ${out} (${(bytes / 1_048_576).toFixed(1)} MB, ${DURATION}s)`);
