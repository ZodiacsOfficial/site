/**
 * The pack runtime. No LLM, no network, no fitting -- it reads a compiled pack
 * and evaluates Chebyshev polynomials.
 *
 * Two deliberate choices:
 *   - a record is DECODED ONCE and memoised per body. A chart touches one or
 *     two records per body (light-time pulls the evaluation back by at most
 *     5.5 hours, which is inside every interval this compiler chooses), so a
 *     one-slot memo removes essentially all decode work from the warm path
 *     without holding the whole pack expanded in memory.
 *   - velocity is the ANALYTIC derivative of the same polynomial, evaluated in
 *     the same Clenshaw pass. A finite difference would be a different
 *     function with its own error, and stations and crossings depend on this
 *     derivative being consistent with the position it came from.
 *
 * The apparent-place reduction below is a faithful copy of the prototype's
 * (`.../swiss-benchmark/prototype/apparent.mjs`): same light-time iteration,
 * same first-order aberration, same astronomy-engine rotation into the true
 * ecliptic of date, no gravitational deflection. Holding it fixed is what lets
 * a measured difference be attributed to the pack rather than the reduction.
 */
import { readFileSync, openSync, readSync, closeSync, fstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { MAGIC, readField } from './format.mjs';

/**
 * A pack-level failure, with a machine-readable code so a caller can refuse
 * for the right reason instead of surfacing a DataView RangeError.
 */
export class PackError extends Error {
  constructor(code, message) { super(message); this.name = 'PackError'; this.code = code; }
}

const AU_KM = 149597870.700;
const LIGHT_TIME_AU = 499.004783836;
const DAY = 86400;

export class Pack {
  /**
   * `resident: false` keeps the pack on disk and reads one record at a time.
   * It exists because the prototype's resident set excludes its 31 MiB kernel
   * entirely -- it preads from the file on every call -- so ANY in-memory pack
   * is an RSS regression against it by exactly the pack's size. This mode
   * gives back that comparison honestly instead of arguing about it: the
   * record memo means a chart issues one small pread per body, against the
   * prototype's two per position evaluation.
   */
  /**
   * `source` is a path, or an ArrayBuffer / typed array. The second form
   * exists so the pack can be opened in a browser from a file the user chose,
   * where `openSync` does not exist; it implies `resident`.
   *
   * INTEGRITY. An earlier version of this constructor checked only the magic
   * bytes. A verification pass demonstrated, and the integrator reproduced,
   * that a pack with one flipped bit, one replaced byte, an edited
   * `intervalSec`, or thirty per cent of its payload missing all opened
   * without complaint and went on to return wrong positions — a bit flip moved
   * the Moon by 1.9e-4 km, a byte by 2.3e5 km, and truncation surfaced later
   * as a raw `RangeError` from a DataView rather than as a pack problem. The
   * header has carried `payloadSha256` and `payloadEndOffset` throughout;
   * nothing read them. Both are checked now, and every failure is a typed
   * `PackError`.
   */
  constructor(source, { resident = true, verifyDigest = true } = {}) {
    const fromMemory = typeof source !== 'string' && !(source instanceof URL);
    let buf;
    let fileSize;
    if (fromMemory) {
      buf = Buffer.isBuffer(source) ? source
        : ArrayBuffer.isView(source) ? Buffer.from(source.buffer, source.byteOffset, source.byteLength)
          : Buffer.from(source);
      resident = true;
      fileSize = buf.length;
      if (buf.length < 16) throw new PackError('truncated', `pack is ${buf.length} bytes; the container header alone is 16`);
    } else {
      const head = Buffer.allocUnsafe(16);
      const probe = openSync(source, 'r');
      const got = readSync(probe, head, 0, 16, 0);
      if (got < 16) { closeSync(probe); throw new PackError('truncated', `pack is ${got} bytes; the container header alone is 16`); }
      const headerLen0 = head.readUInt32LE(8);
      if (resident) { closeSync(probe); buf = readFileSync(source); fileSize = buf.length; } else {
        buf = Buffer.allocUnsafe(16 + headerLen0);
        readSync(probe, buf, 0, 16 + headerLen0, 0);
        this.fd = probe;
        fileSize = fstatSync(probe).size;
      }
    }
    const headerLen = buf.readUInt32LE(8);
    this.resident = resident;
    if (buf.toString('latin1', 0, 8) !== MAGIC) throw new PackError('not-a-pack', 'not a zodiacs ephemeris pack');
    if (!Number.isFinite(headerLen) || headerLen <= 0 || 16 + headerLen > fileSize) {
      throw new PackError('truncated', `header claims ${headerLen} bytes but the pack is ${fileSize}`);
    }
    const hlen = headerLen;
    try {
      this.header = JSON.parse(buf.toString('utf8', 16, 16 + hlen));
    } catch (error) {
      throw new PackError('bad-header', `header is not valid JSON: ${error.message}`);
    }
    this.#structuralCheck(fileSize);
    if (verifyDigest) this.#verifyDigest(buf, fileSize, fromMemory ? null : source);
    this.buf = buf;
    this.dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
    this.bodies = new Map();
    for (const b of this.header.bodies) {
      this.bodies.set(b.name, {
        ...b,
        cache: new Float64Array(3 * b.ncoef),
        cachedRec: -1,
        mids: b.layout.enc === 'q' ? this.#loadMids(b) : null,
        rec: resident ? null : Buffer.allocUnsafe(b.layout.stride),
      });
    }
    this.emrat = this.header.derived.earth399.emrat;
    this.model = null;              // candidate C fills this in from openPack()
  }

  /**
   * Everything the header asserts about its own shape, checked against the
   * bytes actually present. This is what turns a truncated pack into a refusal
   * instead of a RangeError three calls later.
   */
  #structuralCheck(fileSize) {
    const h = this.header;
    const end = h.payloadEndOffset;
    if (!Number.isFinite(end)) throw new PackError('bad-header', 'header has no payloadEndOffset');
    if (end > fileSize) throw new PackError('truncated', `header declares ${end} bytes of pack, file has ${fileSize}`);
    if (!Array.isArray(h.bodies) || h.bodies.length === 0) throw new PackError('bad-header', 'header declares no bodies');
    for (const b of h.bodies) {
      const span = b.layout?.recordsOffset + b.nrec * b.layout?.stride;
      if (!Number.isFinite(b.offset) || !Number.isFinite(span)) {
        throw new PackError('bad-header', `body ${b.name} has no usable layout`);
      }
      if (b.offset + span > end) {
        throw new PackError('truncated', `body ${b.name} needs bytes up to ${b.offset + span}, past the declared end ${end}`);
      }
    }
  }

  /**
   * The payload digest the compiler wrote. In a browser `node:crypto` is
   * absent, so a bundle that cannot hash must say so rather than skip the
   * check silently — `verifyDigest: false` is the only way past it, and it is
   * a decision the caller has to make out loud.
   */
  #verifyDigest(buf, fileSize, path) {
    const want = this.header.payloadSha256;
    if (!want) throw new PackError('unverifiable', 'header carries no payloadSha256');
    if (typeof createHash !== 'function') {
      throw new PackError('unverifiable', 'no hash implementation available; pass verifyDigest:false to accept an unverified pack');
    }
    const start = buf.readUInt32LE(12);
    const end = this.header.payloadEndOffset;
    const bytes = this.resident ? buf.subarray(start, end) : readFileSync(path).subarray(start, end);
    if (bytes.length !== end - start) throw new PackError('truncated', `payload is ${bytes.length} bytes, header declares ${end - start}`);
    const got = createHash('sha256').update(bytes).digest('hex');
    if (got !== want) throw new PackError('corrupt', `payload sha256 ${got} does not match the header's ${want}`);
    this.digestVerified = true;
  }

  #loadMids(b) {
    const n = 3 * b.ncoef;
    if (this.resident) return readMids(this.dv, b.offset + b.layout.midsOffset, n);
    const tmp = Buffer.allocUnsafe(n * 8);
    readSync(this.fd, tmp, 0, n * 8, b.offset + b.layout.midsOffset);
    return readMids(new DataView(tmp.buffer, tmp.byteOffset, tmp.length), 0, n);
  }

  close() { if (this.fd !== undefined) { closeSync(this.fd); this.fd = undefined; } }

  get coverage() { return this.header.coverage; }

  /** True if `et` (TDB seconds past J2000) is inside the pack's stated coverage. */
  covers(et) { return et >= this.header.coverage.startEtSecTdb && et <= this.header.coverage.stopEtSecTdb; }

  #decode(b, rec) {
    const L = b.layout;
    const n = 3 * b.ncoef;
    let dv = this.dv; let recBase;
    if (this.resident) {
      recBase = b.offset + (L.enc === 'f64' ? 0 : L.recordsOffset) + rec * L.stride;
    } else {
      readSync(this.fd, b.rec, 0, L.stride, b.offset + (L.enc === 'f64' ? 0 : L.recordsOffset) + rec * L.stride);
      dv = b.dv ?? (b.dv = new DataView(b.rec.buffer, b.rec.byteOffset, b.rec.length));
      recBase = 0;
    }
    if (L.enc === 'f64') {
      const base = recBase;
      for (let f = 0; f < n; f += 1) b.cache[f] = dv.getFloat64(base + f * 8, true);
    } else {
      const base = recBase;
      const w = L.widths; const fo = L.fieldOffset; const q = L.q; const mids = b.mids;
      for (let f = 0; f < n; f += 1) {
        const ww = w[f];
        b.cache[f] = ww === 0 ? mids[f]
          : ww === 8 ? readField(dv, base + fo[f], 8)
            : mids[f] + readField(dv, base + fo[f], ww) * q;
      }
    }
    b.cachedRec = rec;
  }

  /**
   * State of a pack body in ITS OWN frame, km and km/s, at TDB seconds past
   * J2000. Writes six numbers into `out`.
   */
  raw(name, et, out) {
    const b = this.bodies.get(name);
    if (!b) throw new Error(`body ${name} is not in this pack`);
    let rec = Math.floor((et - b.initEt) / b.intervalSec);
    if (rec < 0) rec = 0; if (rec > b.nrec - 1) rec = b.nrec - 1;
    if (rec !== b.cachedRec) this.#decode(b, rec);
    const radius = b.intervalSec / 2;
    const mid = b.initEt + rec * b.intervalSec + radius;
    const tau = (et - mid) / radius;
    const n = b.ncoef; const c = b.cache; const t2 = 2 * tau;
    for (let comp = 0; comp < 3; comp += 1) {
      const off = comp * n;
      let b1 = 0; let b2 = 0; let d1 = 0; let d2 = 0;
      for (let k = n - 1; k >= 1; k -= 1) {
        const b0 = t2 * b1 - b2 + c[off + k];
        const d0 = t2 * d1 - d2 + 2 * b1;
        b2 = b1; b1 = b0; d2 = d1; d1 = d0;
      }
      out[comp] = tau * b1 - b2 + c[off];
      out[comp + 3] = (b1 + tau * d1 - d2) / radius;
    }
    return out;
  }
}

function readMids(dv, base, n) {
  const a = new Float64Array(n);
  for (let i = 0; i < n; i += 1) a[i] = dv.getFloat64(base + i * 8, true);
  return a;
}

const PLANET = {
  Mercury: 'mercuryBary', Venus: 'venusBary', Mars: 'marsBary', Jupiter: 'jupiterBary',
  Saturn: 'saturnBary', Uranus: 'uranusBary', Neptune: 'neptuneBary', Pluto: 'plutoBary',
};

/**
 * The backend a caller uses. Body names and semantics match the prototype's,
 * so the two can be compared row for row.
 */
export class PackBackend {
  constructor(pack, aeModel = null) {
    this.pack = pack;
    this.ae = aeModel;              // candidate C only
    this.k = 1 / pack.emrat;
    // Four distinct scratch buffers, not one reused: state() composes the Moon
    // and the Earth out of two reads, so if a caller hands it the same array
    // state() is using internally the second read silently overwrites the
    // first. That bug produced position errors of a full 180 degrees while the
    // direct vector comparison, which passes its own array, stayed clean.
    this.s = new Float64Array(6);
    this.s2 = new Float64Array(6);
    this.scratch = new Float64Array(6);
    this.m = new Float64Array(6);
    this.geo = new Float64Array(3);
    this.obs = new Float64Array(6);
  }

  /** Raw pack body plus, for candidate C, the model it is a residual against. */
  #body(name, et, out) {
    this.pack.raw(name, et, out);
    if (this.ae) {
      this.ae(name, et, this.m);
      for (let i = 0; i < 6; i += 1) out[i] += this.m[i];
    }
    return out;
  }

  /** Barycentric state of a pack body, km and km/s, J2000 equatorial. */
  #ssb(name, et, out) {
    const b = this.pack.bodies.get(name);
    this.#body(name, et, out);
    if (b.frame === 'sun') {
      this.#body('sun', et, this.s2);
      for (let i = 0; i < 6; i += 1) out[i] += this.s2[i];
    }
    return out;
  }

  /** Barycentric state of an API body (Sun, Moon, Earth, the eight planets). */
  state(body, et, out) {
    if (body === 'Sun') return this.#ssb('sun', et, out);
    if (body === 'Moon' || body === 'Earth') {
      if (out === this.scratch) throw new Error('state(): out must not be the internal scratch buffer');
      this.#ssb('emb', et, out);
      this.#body('moon', et, this.scratch);
      const f = body === 'Moon' ? 1 : -this.k;
      for (let i = 0; i < 6; i += 1) out[i] += f * this.scratch[i];
      return out;
    }
    const key = PLANET[body];
    if (!key) throw new Error(`unknown body ${body}`);
    return this.#ssb(key, et, out);
  }

  /**
   * Apparent geocentric ecliptic longitude of date, degrees, for a UTC instant.
   * Identical in structure to the prototype's, including the omission of
   * gravitational deflection.
   */
  apparentEclipticLongitude(body, utcDate, deltaTSeconds = null, A = AE) {
    if (!A) throw new Error('call loadAstronomyEngine() (or openPack) before the reduction: it needs the rotation into the ecliptic of date');
    let time = A.MakeTime(utcDate);
    if (deltaTSeconds !== null) {
      const pinned = A.MakeTime(utcDate);
      pinned.tt = pinned.ut + deltaTSeconds / DAY;
      time = pinned;
    }
    const et = time.tt * DAY;
    if (!this.pack.covers(et)) {
      throw new RangeError(`instant outside pack coverage ${this.pack.coverage.startUtcApprox}..${this.pack.coverage.stopUtcApprox}`);
    }
    const obs = this.state('Earth', et, this.obs);
    const ox = obs[0]; const oy = obs[1]; const oz = obs[2];
    const ovx = obs[3]; const ovy = obs[4]; const ovz = obs[5];

    const s = this.s;
    this.state(body, et, s);
    let gx = s[0] - ox; let gy = s[1] - oy; let gz = s[2] - oz;
    let tau = 0;
    for (let i = 0; i < 5; i += 1) {
      const next = (Math.hypot(gx, gy, gz) / AU_KM) * LIGHT_TIME_AU;
      if (Math.abs(next - tau) < 1e-9) { tau = next; break; }
      tau = next;
      this.state(body, et - tau, s);
      gx = s[0] - ox; gy = s[1] - oy; gz = s[2] - oz;
    }
    const cKmS = AU_KM / LIGHT_TIME_AU;
    const dist = Math.hypot(gx, gy, gz);
    const ax = gx + (ovx * dist) / cKmS;
    const ay = gy + (ovy * dist) / cKmS;
    const az = gz + (ovz * dist) / cKmS;

    const rot = A.Rotation_EQJ_ECT(time);
    const vec = new A.Vector(ax / AU_KM, ay / AU_KM, az / AU_KM, time);
    const ect = A.RotateVector(rot, vec);
    let lon = (Math.atan2(ect.y, ect.x) * 180) / Math.PI;
    if (lon < 0) lon += 360;
    return lon;
  }
}

/**
 * The prototype computes the observer's velocity as a 60-second central
 * difference. The pack has the analytic derivative, which is strictly better,
 * but using it would change the reduction and so confound the comparison. This
 * flag exists so both can be measured; the default matches the prototype.
 */
export const OBSERVER_VELOCITY = 'analytic';

let AE = null;
export async function loadAstronomyEngine() { if (!AE) AE = await import('astronomy-engine'); return AE; }

/** Open a pack and return a ready backend. Candidate C also loads its model. */
export async function openPack(path, opts = {}) {
  const pack = new Pack(path, opts);
  await loadAstronomyEngine();
  let model = null;
  if (pack.header.candidate === 'C') {
    const A = AE;
    const AEB = {
      mercuryBary: A.Body.Mercury, venusBary: A.Body.Venus, emb: A.Body.EMB, marsBary: A.Body.Mars,
      jupiterBary: A.Body.Jupiter, saturnBary: A.Body.Saturn, uranusBary: A.Body.Uranus,
      neptuneBary: A.Body.Neptune, plutoBary: A.Body.Pluto, sun: A.Body.Sun,
    };
    const f = (pack.emrat / (1 + pack.emrat)) * AU_KM;
    model = (name, et, out) => {
      const days = et / DAY;
      const t = A.MakeTime(days); t.tt = days;
      if (name === 'moon') {
        const g = A.GeoMoonState(t);
        out[0] = g.x * f; out[1] = g.y * f; out[2] = g.z * f;
        out[3] = (g.vx * f) / DAY; out[4] = (g.vy * f) / DAY; out[5] = (g.vz * f) / DAY;
        return;
      }
      const s = A.BaryState(AEB[name], t);
      out[0] = s.x * AU_KM; out[1] = s.y * AU_KM; out[2] = s.z * AU_KM;
      out[3] = (s.vx * AU_KM) / DAY; out[4] = (s.vy * AU_KM) / DAY; out[5] = (s.vz * AU_KM) / DAY;
    };
  }
  return new PackBackend(pack, model);
}

export const API_BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
