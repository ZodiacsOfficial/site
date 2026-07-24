/**
 * Generates public/score.wav — a 15s trailer cue for the Cabinet promo.
 * A musical bed (D-minor pulse rising to an F-major bloom) with a few
 * restrained accents; pure-math synthesis, no samples, no third-party audio.
 * Deterministic: same script, same bytes. Run: node scripts/make-audio.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44_100;
const DURATION = 15;
const N = SR * DURATION;
const L = new Float64Array(N);
const R = new Float64Array(N);

let seed = 0x5eed;
function rand() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return ((seed >>> 0) / 0xffffffff) * 2 - 1;
}

function add(t, l, r = l) {
  const i = Math.floor(t * SR);
  if (i >= 0 && i < N) { L[i] += l; R[i] += r; }
}

/** Warm sustained chord: sine partial stacks with slow detune chorus. */
function pad(t0, t1, freqs, { gain = 0.09, attack = 0.9, release = 1.2 } = {}) {
  const dur = t1 - t0;
  for (let k = 0; k < dur * SR; k++) {
    const t = k / SR;
    const env = Math.min(1, t / attack) * Math.min(1, (dur - t) / release) * gain;
    let l = 0;
    let r = 0;
    freqs.forEach((f, i) => {
      const det = 1 + 0.0015 * Math.sin(2 * Math.PI * (0.13 + i * 0.07) * t);
      const v = (
        Math.sin(2 * Math.PI * f * det * t) +
        0.35 * Math.sin(2 * Math.PI * f * 2 * det * t) +
        0.12 * Math.sin(2 * Math.PI * f * 3 * t)
      ) / freqs.length;
      const panL = 0.5 + 0.3 * Math.sin(i * 2.1);
      l += v * panL;
      r += v * (1 - panL);
    });
    add(t0 + t, l * env, r * env);
  }
}

/** Plucked ostinato note: bright attack, fast decay. */
function pluck(t0, f, { gain = 0.11, dur = 0.5 } = {}) {
  for (let k = 0; k < dur * SR; k++) {
    const t = k / SR;
    const env = Math.exp(-t * 7) * gain;
    const v = Math.sin(2 * Math.PI * f * t) * 0.8 + Math.sin(2 * Math.PI * f * 2 * t) * 0.25 * Math.exp(-t * 16);
    add(t0 + t, v * env * 0.9, v * env);
  }
}

/** Soft sub pulse: rounded low sine tap, the trailer heartbeat. */
function pulse(t0, f = 73.42, { gain = 0.2 } = {}) {
  for (let k = 0; k < 0.34 * SR; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.015) * Math.exp(-t * 9) * gain;
    add(t0 + t, Math.sin(2 * Math.PI * f * t) * env);
  }
}

/** Restrained cinematic accent (kept easy, per direction). */
function accent(t0, { gain = 0.34, f0 = 90, f1 = 36, dur = 1.1 } = {}) {
  let phase = 0;
  for (let k = 0; k < dur * SR; k++) {
    const t = k / SR;
    const env = Math.exp(-t * 4.5) * gain;
    const f = f1 + (f0 - f1) * Math.exp(-t * 8);
    phase += (2 * Math.PI * f) / SR;
    const soft = k < 0.012 * SR ? rand() * 0.05 : 0;
    add(t0 + t, Math.sin(phase) * env + soft);
  }
}

/** High shimmer bloom for the master arrival. */
function shimmer(t0, { gain = 0.07, dur = 3.6 } = {}) {
  const partials = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  for (let k = 0; k < dur * SR; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.5) * Math.exp(-t * 0.85) * gain;
    let v = 0;
    partials.forEach((f, i) => {
      v += Math.sin(2 * Math.PI * f * (1 + 0.001 * Math.sin(t * 3 + i)) * t) / partials.length;
    });
    const pan = 0.5 + 0.35 * Math.sin(2 * Math.PI * 0.5 * t + 1);
    add(t0 + t, v * env * (1 - pan), v * env * pan);
  }
}

/** Soft bell for a threshold card: gentle strike, long ring. */
function bell(t0, f, { gain = 0.06 } = {}) {
  for (let k = 0; k < 1.6 * SR; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.01) * Math.exp(-t * 2.6) * gain;
    const v = Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 5);
    add(t0 + t, v * env * 0.9, v * env);
  }
}

// ---- Notes ----
const D2 = 73.42, A2 = 110, D3 = 146.83, F3 = 174.61, A3 = 220, D4 = 293.66, F4 = 349.23, E4 = 329.63;
const Bb2 = 116.54, Bb3 = 233.08;
const F2 = 87.31, C3 = 130.81, C4 = 261.63, A4 = 440;

// ---- The cue ----
// Open (0–3s): low D-minor drone, mysterious.
pad(0.0, 3.4, [D2, A2, D3, F3], { gain: 0.07, attack: 1.4 });

// Build (3–7s): pulse + ostinato + fuller Dm, lift to Bb.
for (let b = 0; b < 7; b++) pulse(3.0 + b * 0.577, D2, { gain: 0.14 + b * 0.012 });
// Threshold cards: HOLD 10,000 / 100,000 / 1,000,000 — soft ascending bells.
bell(3.55, 587.33);
bell(5.08, 659.25, { gain: 0.065 });
bell(6.62, 698.46, { gain: 0.075 });
pad(3.2, 5.4, [D3, F3, A3, D4], { gain: 0.075 });
pad(5.2, 7.05, [Bb2, D3, F3, Bb3], { gain: 0.085 });
const ARP = [D4, F4, A3, D4, E4, F4, A4, F4];
ARP.forEach((f, i) => pluck(3.3 + i * 0.462, f, { gain: 0.075 + i * 0.006 }));

// The turn (7–8s): everything thins to a lone dominant — held breath.
pad(7.05, 8.35, [A2, A3], { gain: 0.045, attack: 0.35, release: 0.5 });

// The descent (8–9.2s): quiet rising steps under the twelfth piece.
pluck(8.1, C4, { gain: 0.06, dur: 0.8 });
pluck(8.55, D4, { gain: 0.07, dur: 0.8 });
pluck(8.95, E4, { gain: 0.08, dur: 0.7 });

// The master arrival (9.17s): one restrained accent, then the F-major bloom.
accent(9.17, { gain: 0.4 });
pad(9.2, 13.4, [F2, C3, F3, A3, C4], { gain: 0.115, attack: 0.5, release: 1.6 });
shimmer(9.5);
for (let b = 0; b < 6; b++) pulse(9.75 + b * 0.577, F2, { gain: 0.1 });

// Resolve (13–15s): the bloom settles home on D, fading.
pad(13.0, 14.9, [D3, F3, A3, D4], { gain: 0.08, attack: 0.6, release: 1.5 });

// ---- Master: gentle saturation, fades, 16-bit stereo WAV ----
const OUT = new Int16Array(N * 2);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fadeIn = Math.min(1, t / 0.08);
  const fadeOut = Math.min(1, (DURATION - t) / 0.4);
  const shape = (v) => Math.tanh(v * 1.3) * 0.92 * fadeIn * fadeOut;
  OUT[i * 2] = Math.max(-32768, Math.min(32767, Math.round(shape(L[i]) * 32767)));
  OUT[i * 2 + 1] = Math.max(-32768, Math.min(32767, Math.round(shape(R[i]) * 32767)));
}

const dataBytes = OUT.length * 2;
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + dataBytes, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(dataBytes, 40);

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'public', 'score.wav');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([header, Buffer.from(OUT.buffer)]));
console.log(`Wrote ${out} (${((44 + dataBytes) / 1_048_576).toFixed(1)} MB, ${DURATION}s)`);
