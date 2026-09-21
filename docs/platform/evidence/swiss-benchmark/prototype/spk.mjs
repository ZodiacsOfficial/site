/**
 * A minimal reader for JPL SPK (DAF) binary kernels, enough to evaluate the
 * Chebyshev position segments in a DE planetary ephemeris.
 *
 * Why this exists: the measured disagreement between the Zodiacs core and
 * Swiss is dominated by the underlying position series, not by the apparent-
 * place reduction (the convention toggles in ../../CONFIGURATION.md show the
 * reduction already matches). So the experiment replaces the series with the
 * JPL development ephemeris the reference itself descends from, and keeps
 * everything else fixed.
 *
 * JPL development ephemerides are US Government work in the public domain.
 * Nothing here is derived from Swiss Ephemeris code or output.
 *
 * Format reference: NAIF SPK Required Reading, DAF architecture.
 */
import { openSync, readSync, fstatSync } from 'node:fs';

const RECORD = 1024;

export class Spk {
  constructor(path) {
    this.fd = openSync(path, 'r');
    this.size = fstatSync(this.fd).size;
    const fr = this.#record(1);
    const locidw = fr.toString('latin1', 0, 8).trim();
    if (!locidw.startsWith('DAF/SPK')) throw new Error(`not an SPK file: ${locidw}`);
    // Endianness is declared in the file record; DE kernels are little-endian
    // ("LTL-IEEE"). Refusing the other case is better than silently misreading.
    const binfmt = fr.toString('latin1', 88, 96).trim();
    if (binfmt !== 'LTL-IEEE') throw new Error(`unsupported byte order: ${binfmt}`);
    this.nd = fr.readInt32LE(8);
    this.ni = fr.readInt32LE(12);
    this.fward = fr.readInt32LE(76);
    this.segments = this.#readSegments();
  }

  #record(n) {
    const buf = Buffer.allocUnsafe(RECORD);
    readSync(this.fd, buf, 0, RECORD, (n - 1) * RECORD);
    return buf;
  }

  /** Walk the summary-record linked list and decode every segment descriptor. */
  #readSegments() {
    const out = [];
    const ss = this.nd + Math.ceil(this.ni / 2);   // summary size, in doubles
    let next = this.fward;
    while (next !== 0) {
      const rec = this.#record(next);
      const nxt = rec.readDoubleLE(0);
      const nsum = rec.readDoubleLE(16);
      for (let i = 0; i < nsum; i += 1) {
        const base = 24 + i * ss * 8;
        const start = rec.readDoubleLE(base);          // ET seconds past J2000
        const stop = rec.readDoubleLE(base + 8);
        const ints = base + this.nd * 8;
        out.push({
          start, stop,
          target: rec.readInt32LE(ints),
          center: rec.readInt32LE(ints + 4),
          frame: rec.readInt32LE(ints + 8),
          type: rec.readInt32LE(ints + 12),
          first: rec.readInt32LE(ints + 16),           // initial address (doubles, 1-based)
          last: rec.readInt32LE(ints + 20),
        });
      }
      next = nxt;
    }
    return out;
  }

  /** Read `count` doubles starting at 1-based double-address `addr`. */
  #doubles(addr, count) {
    const buf = Buffer.allocUnsafe(count * 8);
    readSync(this.fd, buf, 0, count * 8, (addr - 1) * 8);
    const out = new Float64Array(count);
    for (let i = 0; i < count; i += 1) out[i] = buf.readDoubleLE(i * 8);
    return out;
  }

  segment(target, center) {
    const hit = this.segments.find((s) => s.target === target && s.center === center);
    if (!hit) throw new Error(`no segment for target ${target} centre ${center}`);
    if (hit.type !== 2 && hit.type !== 3) throw new Error(`segment type ${hit.type} not supported`);
    return hit;
  }

  /**
   * Position in km, in the segment's frame (J2000 for DE kernels), at `et`
   * (TDB seconds past J2000), by Chebyshev evaluation of the covering record.
   */
  position(seg, et) {
    if (et < seg.start || et > seg.stop) {
      throw new Error(`et ${et} outside segment coverage [${seg.start}, ${seg.stop}]`);
    }
    // The last four doubles of the segment are its directory.
    const dir = this.#doubles(seg.last - 3, 4);
    const [init, intlen, rsize, n] = dir;
    let idx = Math.floor((et - init) / intlen);
    if (idx < 0) idx = 0;
    if (idx > n - 1) idx = n - 1;
    const rec = this.#doubles(seg.first + idx * rsize, rsize);
    const mid = rec[0];
    const radius = rec[1];
    const ncoef = (rsize - 2) / (seg.type === 2 ? 3 : 6);
    const tau = (et - mid) / radius;                  // normalised to [-1, 1]
    const t = new Float64Array(ncoef);
    t[0] = 1;
    if (ncoef > 1) t[1] = tau;
    for (let k = 2; k < ncoef; k += 1) t[k] = 2 * tau * t[k - 1] - t[k - 2];
    const xyz = [0, 0, 0];
    for (let c = 0; c < 3; c += 1) {
      let sum = 0;
      const off = 2 + c * ncoef;
      for (let k = ncoef - 1; k >= 0; k -= 1) sum += rec[off + k] * t[k];
      xyz[c] = sum;
    }
    return xyz;
  }
}

/** NAIF integer ids used here. */
export const NAIF = {
  SSB: 0, MERCURY_BARY: 1, VENUS_BARY: 2, EMB: 3, MARS_BARY: 4, JUPITER_BARY: 5,
  SATURN_BARY: 6, URANUS_BARY: 7, NEPTUNE_BARY: 8, PLUTO_BARY: 9,
  SUN: 10, MOON: 301, EARTH: 399, MERCURY: 199, VENUS: 299,
};
