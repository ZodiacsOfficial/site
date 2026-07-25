/**
 * The house synthesiser.
 *
 * Pure-math synthesis with no samples and no third-party audio, so every cue
 * in this project is an original work that ships under the repository licence
 * with nothing to clear. Deterministic: the same script always writes the same
 * bytes, which is what lets a cue be committed and diffed like source.
 *
 * Extracted from make-audio.mjs so a second cue can be scored without forking
 * the engine; scripts/make-audio.mjs still writes byte-identical output.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const SR = 44_100;

/** One mutable stereo canvas; every voice sums into it. */
export function createBed(duration) {
  const n = SR * duration;
  return { duration, n, L: new Float64Array(n), R: new Float64Array(n) };
}

function add(bed, t, l, r = l) {
  const i = Math.floor(t * SR);
  if (i >= 0 && i < bed.n) {
    bed.L[i] += l;
    bed.R[i] += r;
  }
}

let seed = 0x5eed;
function rand() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) / 0xffffffff) * 2 - 1;
}

/** Resets the noise sequence so a cue is reproducible independent of order. */
export function reseed(value = 0x5eed) {
  seed = value;
}

/** Warm sustained chord: sine partial stacks with slow detune chorus. */
export function pad(bed, t0, t1, freqs, { gain = 0.09, attack = 0.9, release = 1.2 } = {}) {
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
    add(bed, t0 + t, l * env, r * env);
  }
}

/** Plucked ostinato note: bright attack, fast decay. */
export function pluck(bed, t0, f, { gain = 0.11, dur = 0.5 } = {}) {
  for (let k = 0; k < dur * SR; k++) {
    const t = k / SR;
    const env = Math.exp(-t * 7) * gain;
    const v = Math.sin(2 * Math.PI * f * t) * 0.8 + Math.sin(2 * Math.PI * f * 2 * t) * 0.25 * Math.exp(-t * 16);
    add(bed, t0 + t, v * env * 0.9, v * env);
  }
}

/** Soft sub pulse: rounded low sine tap, the trailer heartbeat. */
export function pulse(bed, t0, f = 73.42, { gain = 0.2 } = {}) {
  for (let k = 0; k < 0.34 * SR; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.015) * Math.exp(-t * 9) * gain;
    add(bed, t0 + t, Math.sin(2 * Math.PI * f * t) * env);
  }
}

/** Restrained cinematic accent. */
export function accent(bed, t0, { gain = 0.34, f0 = 90, f1 = 36, dur = 1.1 } = {}) {
  let phase = 0;
  for (let k = 0; k < dur * SR; k++) {
    const t = k / SR;
    const env = Math.exp(-t * 4.5) * gain;
    const f = f1 + (f0 - f1) * Math.exp(-t * 8);
    phase += (2 * Math.PI * f) / SR;
    const soft = k < 0.012 * SR ? rand() * 0.05 : 0;
    add(bed, t0 + t, Math.sin(phase) * env + soft);
  }
}

/** High shimmer bloom for a master arrival. */
export function shimmer(bed, t0, { gain = 0.07, dur = 3.6 } = {}) {
  const partials = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  for (let k = 0; k < dur * SR; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.5) * Math.exp(-t * 0.85) * gain;
    let v = 0;
    partials.forEach((f, i) => {
      v += Math.sin(2 * Math.PI * f * (1 + 0.001 * Math.sin(t * 3 + i)) * t) / partials.length;
    });
    const pan = 0.5 + 0.35 * Math.sin(2 * Math.PI * 0.5 * t + 1);
    add(bed, t0 + t, v * env * (1 - pan), v * env * pan);
  }
}

/** Soft bell: gentle strike, long ring. */
export function bell(bed, t0, f, { gain = 0.06, dur = 1.6 } = {}) {
  for (let k = 0; k < dur * SR; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.01) * Math.exp(-t * 2.6) * gain;
    const v = Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 5);
    add(bed, t0 + t, v * env * 0.9, v * env);
  }
}

/**
 * A struck coin: a short metallic tap with inharmonic partials.
 *
 * Written for "The Tenth", where the tally is the metronome and each landing
 * sculpture needs a contact sound rather than a musical note.
 */
export function strike(bed, t0, f, { gain = 0.09, dur = 0.7 } = {}) {
  const partials = [1, 2.41, 3.83, 5.17];
  for (let k = 0; k < dur * SR; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.004) * Math.exp(-t * 9) * gain;
    let v = 0;
    partials.forEach((mult, i) => {
      v += Math.sin(2 * Math.PI * f * mult * t) * Math.exp(-t * (5 + i * 5)) / (i + 1.4);
    });
    const tick = k < 0.006 * SR ? rand() * 0.22 : 0;
    add(bed, t0 + t, (v + tick) * env, (v + tick) * env * 0.94);
  }
}

/** Masters the bed with gentle saturation and edge fades, then writes a WAV. */
export function writeWav(bed, path, { fadeIn = 0.08, fadeOut = 0.4, drive = 1.3 } = {}) {
  const out = new Int16Array(bed.n * 2);
  for (let i = 0; i < bed.n; i++) {
    const t = i / SR;
    const inP = Math.min(1, t / fadeIn);
    const outP = Math.min(1, (bed.duration - t) / fadeOut);
    const shape = (v) => Math.tanh(v * drive) * 0.92 * inP * outP;
    out[i * 2] = Math.max(-32768, Math.min(32767, Math.round(shape(bed.L[i]) * 32767)));
    out[i * 2 + 1] = Math.max(-32768, Math.min(32767, Math.round(shape(bed.R[i]) * 32767)));
  }

  const dataBytes = out.length * 2;
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

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.concat([header, Buffer.from(out.buffer)]));
  return 44 + dataBytes;
}
