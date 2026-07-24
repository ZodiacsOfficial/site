/**
 * Generates public/score.wav — the 15s riser→drop score for the Cabinet promo.
 * Pure-math synthesis (sines + shaped noise), no samples, no third-party audio.
 * Deterministic: same script, same bytes. Run: node scripts/make-audio.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44_100;
const DURATION = 15;
const N = SR * DURATION;
const left = new Float64Array(N);
const right = new Float64Array(N);

// Deterministic noise (xorshift) so renders are reproducible.
let seed = 0x5eed;
function rand() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return ((seed >>> 0) / 0xffffffff) * 2 - 1;
}

function add(t, l, r = l) {
  const i = Math.floor(t * SR);
  if (i >= 0 && i < N) { left[i] += l; right[i] += r; }
}

/** Impact: a pitch-dropping sine thud with a soft noise transient. */
function impact(t0, { gain = 0.5, f0 = 90, f1 = 38, dur = 0.9, click = 0.12 } = {}) {
  let phase = 0;
  for (let k = 0; k < dur * SR; k++) {
    const t = k / SR;
    const env = Math.exp(-t * 5.5);
    const f = f1 + (f0 - f1) * Math.exp(-t * 9);
    phase += (2 * Math.PI * f) / SR;
    const body = Math.sin(phase) * env * gain;
    const transient = k < 0.02 * SR ? rand() * click * (1 - k / (0.02 * SR)) : 0;
    add(t0 + t, body + transient);
  }
}

/** Tick: a tiny filtered click for the fill montage. */
function tick(t0, gain = 0.08) {
  let lp = 0;
  for (let k = 0; k < 0.05 * SR; k++) {
    const t = k / SR;
    lp += 0.25 * (rand() - lp);
    add(t0 + t, lp * gain * Math.exp(-t * 90) + Math.sin(2 * Math.PI * 1800 * t) * gain * 0.4 * Math.exp(-t * 120));
  }
}

/** Riser: lowpassed noise whose cutoff and gain climb, plus a rising sine. */
function riser(t0, t1, { gain = 0.16 } = {}) {
  const dur = t1 - t0;
  let lp = 0;
  for (let k = 0; k < dur * SR; k++) {
    const t = k / SR;
    const p = t / dur;
    const alpha = 0.02 + 0.3 * p * p;
    lp += alpha * (rand() - lp);
    const sweep = Math.sin(2 * Math.PI * (120 + 680 * p * p) * t);
    const v = (lp * 0.85 + sweep * 0.22) * gain * p;
    add(t0 + t, v * (1 - 0.25 * Math.sin(2 * Math.PI * 0.5 * t)), v);
  }
}

/** Pad: slow detuned minor dyad, soft attack and release. */
function pad(t0, t1, { root = 110, gain = 0.1 } = {}) {
  const dur = t1 - t0;
  const freqs = [root, root * 1.189, root * 1.498, root * 2.002]; // minor-third stack, slightly detuned fifth+octave
  for (let k = 0; k < dur * SR; k++) {
    const t = k / SR;
    const attack = Math.min(1, t / 1.2);
    const release = Math.min(1, (dur - t) / 1.4);
    const env = attack * release * gain;
    let v = 0;
    for (const f of freqs) v += Math.sin(2 * Math.PI * f * t) / freqs.length;
    add(t0 + t, v * env * 0.9, v * env);
  }
}

/** Shimmer: high detuned partials blooming after the master hit. */
function shimmer(t0, { gain = 0.11, dur = 3.4 } = {}) {
  const partials = [880, 884, 1318, 1324, 1760, 2637];
  for (let k = 0; k < dur * SR; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.25) * Math.exp(-t * 1.1) * gain;
    let v = 0;
    partials.forEach((f, i) => {
      v += Math.sin(2 * Math.PI * f * t + i) / partials.length;
    });
    const pan = 0.5 + 0.4 * Math.sin(2 * Math.PI * 0.7 * t);
    add(t0 + t, v * env * (1 - pan), v * env * pan);
  }
}

// ---- Beat map (matches the composition's frame script at 30fps) ----
impact(0.10, { gain: 0.34, f0: 70, f1: 34 });          // card 1
impact(2.00, { gain: 0.5 });                            // first disc slams (frame 60)
impact(3.05, { gain: 0.3, f0: 70, f1: 34 });            // card 2 — KEEP THEM.
riser(3.2, 7.0);                                        // climb through the montage
for (let i = 0; i < 7; i++) tick(4.07 + i * 0.24);      // discs 2–8 snap in
impact(4.40, { gain: 0.34, f0: 120, f1: 60, dur: 0.5 }); // BRONZE ring
impact(5.40, { gain: 0.42, f0: 130, f1: 62, dur: 0.55 }); // SILVER ring
impact(6.05, { gain: 0.3, f0: 70, f1: 34 });            // card 3 — CLIMB.
tick(6.47, 0.1); tick(6.63, 0.1); tick(6.80, 0.1);      // discs 9–11
impact(6.70, { gain: 0.5, f0: 140, f1: 55, dur: 0.7 }); // GOLD ignition (frame ~200)
impact(7.08, { gain: 0.22, f0: 60, f1: 30 });           // card 4 — the turn, then near-silence
pad(8.0, 9.2, { root: 55, gain: 0.05 });                // held breath under the descent
impact(9.17, { gain: 0.72, f0: 100, f1: 30, dur: 1.6, click: 0.2 }); // MASTER contact (frame 275)
shimmer(9.2, { gain: 0.12, dur: 3.6 });                 // bloom tail
pad(11.6, 13.2, { root: 82.5, gain: 0.07 });            // "Few ever finish."
pad(13.0, 14.9, { root: 110, gain: 0.08 });             // CTA resolution

// ---- Master: gentle saturation, fades, 16-bit stereo WAV ----
const OUT = new Int16Array(N * 2);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fadeIn = Math.min(1, t / 0.05);
  const fadeOut = Math.min(1, (DURATION - t) / 0.35);
  const shape = (v) => Math.tanh(v * 1.4) * 0.92 * fadeIn * fadeOut;
  OUT[i * 2] = Math.max(-32768, Math.min(32767, Math.round(shape(left[i]) * 32767)));
  OUT[i * 2 + 1] = Math.max(-32768, Math.min(32767, Math.round(shape(right[i]) * 32767)));
}

const dataBytes = OUT.length * 2;
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + dataBytes, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);          // PCM
header.writeUInt16LE(2, 22);          // stereo
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);     // byte rate
header.writeUInt16LE(4, 32);          // block align
header.writeUInt16LE(16, 34);         // bits per sample
header.write('data', 36);
header.writeUInt32LE(dataBytes, 40);

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'public', 'score.wav');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([header, Buffer.from(OUT.buffer)]));
console.log(`Wrote ${out} (${((44 + dataBytes) / 1_048_576).toFixed(1)} MB, ${DURATION}s)`);
