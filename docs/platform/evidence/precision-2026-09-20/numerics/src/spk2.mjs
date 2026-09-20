/**
 * A second JavaScript SPK reader, written here so that velocities are
 * available ANALYTICALLY (the derivative of the Chebyshev fit) rather than
 * only by finite difference, and so that coverage padding can be checked
 * before a light-time iteration walks off the end of a segment.
 *
 * It is verified byte-for-byte against the existing prototype reader in
 * tools/t5-*, and independently against a Python reader written from the
 * NAIF DAF/SPK specification.
 */
import { openSync, readSync, fstatSync, closeSync } from 'node:fs';

const RECORD = 1024;

export class Spk2 {
  constructor(path) {
    this.path = path;
    this.fd = openSync(path, 'r');
    this.size = fstatSync(this.fd).size;
    const fr = this.#record(1);
    const locidw = fr.toString('latin1', 0, 8).trim();
    if (!locidw.startsWith('DAF/SPK')) throw new Error(`not an SPK file: ${locidw}`);
    if (fr.toString('latin1', 88, 96).trim() !== 'LTL-IEEE') throw new Error('unsupported byte order');
    this.nd = fr.readInt32LE(8);
    this.ni = fr.readInt32LE(12);
    this.fward = fr.readInt32LE(76);
    this.segments = this.#segments();
    this.recCache = new Map();
  }

  close() { closeSync(this.fd); }

  #record(n) {
    const buf = Buffer.allocUnsafe(RECORD);
    readSync(this.fd, buf, 0, RECORD, (n - 1) * RECORD);
    return buf;
  }

  #segments() {
    const out = [];
    const ss = this.nd + Math.ceil(this.ni / 2);
    let next = this.fward;
    while (next !== 0) {
      const rec = this.#record(next);
      const nxt = rec.readDoubleLE(0);
      const nsum = rec.readDoubleLE(16);
      for (let i = 0; i < nsum; i += 1) {
        const base = 24 + i * ss * 8;
        const ints = base + this.nd * 8;
        out.push({
          start: rec.readDoubleLE(base),
          stop: rec.readDoubleLE(base + 8),
          target: rec.readInt32LE(ints),
          center: rec.readInt32LE(ints + 4),
          frame: rec.readInt32LE(ints + 8),
          type: rec.readInt32LE(ints + 12),
          first: rec.readInt32LE(ints + 16),
          last: rec.readInt32LE(ints + 20),
        });
      }
      next = nxt;
    }
    return out;
  }

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
    if (!hit.dir) {
      const dir = this.#doubles(hit.last - 3, 4);
      hit.dir = { init: dir[0], intlen: dir[1], rsize: dir[2], n: dir[3] };
    }
    return hit;
  }

  /** The Chebyshev record covering `et`, cached by (segment, index). */
  #covering(seg, et) {
    const { init, intlen, rsize } = seg.dir;
    let idx = Math.floor((et - init) / intlen);
    if (idx < 0) idx = 0;
    if (idx > seg.dir.n - 1) idx = seg.dir.n - 1;
    const key = `${seg.first}/${idx}`;
    let rec = this.recCache.get(key);
    if (!rec) { rec = this.#doubles(seg.first + idx * rsize, rsize); this.recCache.set(key, rec); }
    return rec;
  }

  position(seg, et) {
    if (et < seg.start || et > seg.stop) throw new Error(`et ${et} outside segment coverage [${seg.start}, ${seg.stop}]`);
    const rec = this.#covering(seg, et);
    const ncoef = (seg.dir.rsize - 2) / (seg.type === 2 ? 3 : 6);
    const tau = (et - rec[0]) / rec[1];
    const T = chebT(tau, ncoef);
    const xyz = [0, 0, 0];
    for (let c = 0; c < 3; c += 1) {
      let sum = 0;
      const off = 2 + c * ncoef;
      for (let k = ncoef - 1; k >= 0; k -= 1) sum += rec[off + k] * T[k];
      xyz[c] = sum;
    }
    return xyz;
  }

  /**
   * Position (km) AND velocity (km/s) from the same record.  For type 2 the
   * velocity is the analytic derivative dP/dtau / radius; for type 3 the
   * kernel carries its own velocity coefficients and those are used.
   */
  state(seg, et) {
    if (et < seg.start || et > seg.stop) throw new Error(`et ${et} outside segment coverage [${seg.start}, ${seg.stop}]`);
    const rec = this.#covering(seg, et);
    const comps = seg.type === 2 ? 3 : 6;
    const ncoef = (seg.dir.rsize - 2) / comps;
    const radius = rec[1];
    const tau = (et - rec[0]) / radius;
    const T = chebT(tau, ncoef);
    const pos = [0, 0, 0];
    for (let c = 0; c < 3; c += 1) {
      let sum = 0;
      const off = 2 + c * ncoef;
      for (let k = ncoef - 1; k >= 0; k -= 1) sum += rec[off + k] * T[k];
      pos[c] = sum;
    }
    const vel = [0, 0, 0];
    if (seg.type === 3) {
      for (let c = 0; c < 3; c += 1) {
        let sum = 0;
        const off = 2 + (c + 3) * ncoef;
        for (let k = ncoef - 1; k >= 0; k -= 1) sum += rec[off + k] * T[k];
        vel[c] = sum;
      }
    } else {
      const D = chebDT(tau, ncoef, T);
      for (let c = 0; c < 3; c += 1) {
        let sum = 0;
        const off = 2 + c * ncoef;
        for (let k = ncoef - 1; k >= 1; k -= 1) sum += rec[off + k] * D[k];
        vel[c] = sum / radius;
      }
    }
    return { pos, vel };
  }
}

function chebT(tau, n) {
  const T = new Float64Array(n);
  T[0] = 1;
  if (n > 1) T[1] = tau;
  for (let k = 2; k < n; k += 1) T[k] = 2 * tau * T[k - 1] - T[k - 2];
  return T;
}

/** dT_k/dtau by the standard recurrence U_{k-1}*k, built from T. */
function chebDT(tau, n, T) {
  const D = new Float64Array(n);
  if (n > 1) D[1] = 1;
  if (n > 2) D[2] = 4 * tau;
  for (let k = 3; k < n; k += 1) D[k] = 2 * tau * D[k - 1] - D[k - 2] + 2 * T[k - 1];
  return D;
}

export const NAIF = {
  SSB: 0, MERCURY_BARY: 1, VENUS_BARY: 2, EMB: 3, MARS_BARY: 4, JUPITER_BARY: 5,
  SATURN_BARY: 6, URANUS_BARY: 7, NEPTUNE_BARY: 8, PLUTO_BARY: 9,
  SUN: 10, MOON: 301, EARTH: 399, MERCURY: 199, VENUS: 299,
};
