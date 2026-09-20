// Built from precision-runtime.src.mjs by build.mjs. Do not edit.

// ../../../../../examples/precision-alpha/src/core/errors.mjs
var CODES = Object.freeze([
  // container
  "not-a-pack",
  "unsupported-version",
  "too-large",
  "truncated",
  "bad-header",
  "bad-geometry",
  "corrupt",
  "unverified",
  "mutated",
  // request
  "unknown-body",
  "out-of-coverage",
  "bad-instant",
  "unsupported-option",
  // search
  "budget-exhausted",
  "enclosure-too-weak",
  "unresolved",
  "cancelled",
  // lifecycle
  "disposed"
]);
var PrecisionError = class extends Error {
  /**
   * @param {typeof CODES[number]} code
   * @param {string} message  must not contain a filesystem path
   * @param {object} [detail] structured, JSON-safe
   */
  constructor(code, message, detail = void 0) {
    super(message);
    this.name = "PrecisionError";
    this.code = code;
    if (detail !== void 0) this.detail = detail;
  }
  toJSON() {
    return { name: this.name, code: this.code, message: this.message, detail: this.detail };
  }
};
var fail = (code, message, detail) => {
  throw new PrecisionError(code, message, detail);
};

// ../../../../../examples/precision-alpha/src/core/source.mjs
function checkRange(byteLength, offset, length) {
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(length) || length < 0) {
    fail("bad-geometry", "a read was requested at a non-integer or negative position");
  }
  const end = offset + length;
  if (!Number.isSafeInteger(end) || end > byteLength) {
    fail("truncated", `a read of ${length} bytes at ${offset} runs past the end of the artifact (${byteLength} bytes)`);
  }
  return end;
}
function memorySource(input) {
  if (!(input instanceof Uint8Array)) fail("bad-header", "pack bytes must be a Uint8Array");
  const u8 = new Uint8Array(input.byteLength);
  u8.set(input);
  return {
    kind: "memory",
    byteLength: u8.byteLength,
    window(offset, length) {
      checkRange(u8.byteLength, offset, length);
      return new DataView(u8.buffer, u8.byteOffset + offset, length);
    },
    bytes(offset, length) {
      checkRange(u8.byteLength, offset, length);
      return u8.subarray(offset, offset + length);
    },
    async digest(offset, length) {
      checkRange(u8.byteLength, offset, length);
      return sha256HexOf(u8.subarray(offset, offset + length));
    },
    seal() {
    },
    release() {
    },
    copied: true
  };
}
var hex = (buffer) => Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
async function sha256HexOf(view) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) fail("unverified", "no WebCrypto available to verify this pack");
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return hex(await subtle.digest("SHA-256", copy.buffer));
}

// ../../../../../examples/precision-alpha/src/core/container.mjs
var MAGIC_V1 = "ZODEPH01";
var MAGIC_V2 = "ZODEPH02";
var TRAILER_BYTES = 32;
var PROLOGUE_BYTES = 16;
var LIMITS = Object.freeze({
  maxFileBytes: 256 * 1024 * 1024,
  maxHeaderBytes: 4 * 1024 * 1024,
  maxBodies: 64,
  maxCoefficients: 512,
  maxRecords: 2e7,
  minIntervalSec: 1,
  maxIntervalSec: 4 * 365.25 * 86400 * 1e3
});
var ascii = (u8, from, to) => String.fromCharCode(...u8.subarray(from, to));
var isSafeCount = (n) => Number.isSafeInteger(n) && n >= 0;
function safeExtent(where, a, b, c = 0) {
  if (!isSafeCount(a) || !isSafeCount(b) || !isSafeCount(c)) {
    fail("bad-header", `${where}: extent operands must be safe non-negative integers`);
  }
  const product = a * b;
  if (!Number.isSafeInteger(product)) fail("bad-header", `${where}: extent overflows exact integer range`);
  const total = product + c;
  if (!Number.isSafeInteger(total)) fail("bad-header", `${where}: extent overflows exact integer range`);
  return total;
}
var hex2 = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
function parseContainer(src) {
  if (!src || typeof src.window !== "function" || typeof src.bytes !== "function" || !Number.isSafeInteger(src.byteLength)) {
    fail("bad-header", "parseContainer needs a byte source; use parseContainerBytes for a Uint8Array");
  }
  const total = src.byteLength;
  if (total > LIMITS.maxFileBytes) {
    fail("too-large", `pack is ${total} bytes; the limit is ${LIMITS.maxFileBytes}`);
  }
  if (total < PROLOGUE_BYTES + TRAILER_BYTES + 2) fail("truncated", `pack is ${total} bytes, too short to be one`);
  const prologue = src.bytes(0, PROLOGUE_BYTES);
  const magic = ascii(prologue, 0, 8);
  if (magic === MAGIC_V1) {
    fail(
      "unsupported-version",
      "this is a ZODEPH01 pack: its digest covers only the payload, so its header is unprotected. Re-seal it with tools/seal.mjs"
    );
  }
  if (magic !== MAGIC_V2) fail("not-a-pack", "not a zodiacs ephemeris pack");
  const pdv = new DataView(prologue.buffer, prologue.byteOffset, prologue.byteLength);
  const headerLen = pdv.getUint32(8, true);
  const payloadOffset = pdv.getUint32(12, true);
  if (!isSafeCount(headerLen) || headerLen === 0 || headerLen > LIMITS.maxHeaderBytes) {
    fail("bad-header", `header length ${headerLen} is outside 1..${LIMITS.maxHeaderBytes}`);
  }
  const headerEnd = safeExtent("header", PROLOGUE_BYTES, 1, headerLen);
  if (headerEnd > total) fail("truncated", `header claims ${headerLen} bytes; only ${total - PROLOGUE_BYTES} remain`);
  if (payloadOffset < headerEnd || payloadOffset > total) {
    fail("bad-header", `payload offset ${payloadOffset} is not inside the file after the header`);
  }
  let header;
  try {
    header = JSON.parse(new TextDecoder().decode(src.bytes(PROLOGUE_BYTES, headerLen)));
  } catch (error) {
    fail("bad-header", `header is not valid JSON: ${error.message}`);
  }
  if (!header || typeof header !== "object") fail("bad-header", "header is not an object");
  const digestRegionEnd = total - TRAILER_BYTES;
  const payloadEnd = header.payloadEndOffset;
  if (!isSafeCount(payloadEnd)) fail("bad-header", "payloadEndOffset is not a safe non-negative integer");
  if (payloadEnd > digestRegionEnd) {
    fail("truncated", `header declares ${payloadEnd} bytes of pack; only ${digestRegionEnd} precede the digest trailer`);
  }
  validateCoverage(header);
  const bodies = validateBodies(header, payloadOffset, payloadEnd);
  validateConstants(header);
  return {
    magic,
    headerLen,
    payloadOffset,
    payloadEnd,
    digestRegionEnd,
    header,
    bodies,
    trailerDigestHex: hex2(src.bytes(digestRegionEnd, TRAILER_BYTES)),
    trailingBytes: digestRegionEnd - payloadEnd
  };
}
var COVERAGE_START = "startEtSecTdb";
var COVERAGE_STOP = "stopEtSecTdb";
function validateCoverage(header) {
  const c = header.coverage;
  if (!c || typeof c !== "object") fail("bad-header", "header declares no coverage");
  for (const k of [COVERAGE_START, COVERAGE_STOP]) {
    if (!Number.isFinite(c[k])) fail("bad-header", `coverage.${k} is not finite`);
  }
  if (!(c[COVERAGE_STOP] > c[COVERAGE_START])) {
    fail("bad-header", "coverage is not monotonic: stop must exceed start");
  }
  if (c.marginSec !== void 0 && (!Number.isFinite(c.marginSec) || c.marginSec < 0)) {
    fail("bad-header", "coverage.marginSec must be a finite non-negative number");
  }
}
function validateBodies(header, payloadOffset, payloadEnd) {
  const list = header.bodies;
  if (!Array.isArray(list) || list.length === 0) fail("bad-header", "header declares no bodies");
  if (list.length > LIMITS.maxBodies) fail("bad-header", `header declares ${list.length} bodies; the limit is ${LIMITS.maxBodies}`);
  const seen = /* @__PURE__ */ new Set();
  const spans = [];
  const out = /* @__PURE__ */ new Map();
  for (const b of list) {
    if (!b || typeof b.name !== "string" || b.name.length === 0 || b.name.length > 64) {
      fail("bad-header", "a body has no usable name");
    }
    if (seen.has(b.name)) fail("bad-header", `body ${b.name} is declared twice`);
    seen.add(b.name);
    for (const [k, v] of [["ncoef", b.ncoef], ["nrec", b.nrec], ["offset", b.offset]]) {
      if (!isSafeCount(v)) fail("bad-header", `body ${b.name}: ${k} is not a safe non-negative integer`);
    }
    if (b.ncoef < 2 || b.ncoef > LIMITS.maxCoefficients) {
      fail("bad-header", `body ${b.name}: ncoef ${b.ncoef} is outside 2..${LIMITS.maxCoefficients}`);
    }
    if (b.nrec < 1 || b.nrec > LIMITS.maxRecords) {
      fail("bad-header", `body ${b.name}: nrec ${b.nrec} is outside 1..${LIMITS.maxRecords}`);
    }
    if (!Number.isFinite(b.initEt)) fail("bad-header", `body ${b.name}: initEt is not finite`);
    if (!Number.isFinite(b.intervalSec) || b.intervalSec < LIMITS.minIntervalSec || b.intervalSec > LIMITS.maxIntervalSec) {
      fail("bad-header", `body ${b.name}: intervalSec ${b.intervalSec} is outside ${LIMITS.minIntervalSec}..${LIMITS.maxIntervalSec}`);
    }
    if (!["ssb", "sun", "native"].includes(b.frame)) {
      fail("bad-header", `body ${b.name}: frame ${JSON.stringify(b.frame)} is not supported`);
    }
    const layout = b.layout;
    if (!layout || typeof layout !== "object") fail("bad-header", `body ${b.name}: no layout`);
    if (layout.enc !== "q" && layout.enc !== "f64") {
      fail("bad-header", `body ${b.name}: encoding ${JSON.stringify(layout.enc)} is not supported`);
    }
    for (const [k, v] of [["stride", layout.stride], ["midsOffset", layout.midsOffset], ["recordsOffset", layout.recordsOffset]]) {
      if (!isSafeCount(v)) fail("bad-header", `body ${b.name}: layout.${k} is not a safe non-negative integer`);
    }
    if (layout.stride === 0) fail("bad-header", `body ${b.name}: layout.stride is zero`);
    const fields = safeExtent(`body ${b.name} fields`, 3, b.ncoef);
    if (layout.enc === "q") {
      if (!Number.isFinite(layout.q) || layout.q <= 0) fail("bad-header", `body ${b.name}: quantum q must be finite and positive`);
      if (!Array.isArray(layout.widths) || layout.widths.length !== fields) {
        fail("bad-header", `body ${b.name}: widths must have 3*ncoef = ${fields} entries, has ${layout.widths?.length}`);
      }
      if (!Array.isArray(layout.fieldOffset) || layout.fieldOffset.length !== fields) {
        fail("bad-header", `body ${b.name}: fieldOffset must have 3*ncoef = ${fields} entries, has ${layout.fieldOffset?.length}`);
      }
      if (!Array.isArray(layout.mids) && layout.midsOffset === void 0) {
        fail("bad-header", `body ${b.name}: quantised layout needs midsOffset`);
      }
      for (let f = 0; f < fields; f += 1) {
        const w = layout.widths[f];
        const off = layout.fieldOffset[f];
        if (![0, 1, 2, 3, 4, 5, 6, 8].includes(w)) fail("bad-header", `body ${b.name}: field width ${w} is not supported`);
        if (!isSafeCount(off)) fail("bad-header", `body ${b.name}: fieldOffset[${f}] is not a safe non-negative integer`);
        const fieldEnd = safeExtent(`body ${b.name} field ${f}`, off, 1, w);
        if (fieldEnd > layout.stride) {
          fail("bad-geometry", `body ${b.name}: field ${f} ends at ${fieldEnd}, past the ${layout.stride}-byte stride`);
        }
      }
      const midsBytes = safeExtent(`body ${b.name} mids`, fields, 8, layout.midsOffset);
      if (midsBytes > layout.recordsOffset) {
        fail("bad-geometry", `body ${b.name}: the mid-point table needs ${midsBytes} bytes but records start at ${layout.recordsOffset}`);
      }
    } else {
      const need = safeExtent(`body ${b.name} stride`, fields, 8);
      if (need > layout.stride) {
        fail("bad-geometry", `body ${b.name}: float64 record needs ${need} bytes but stride is ${layout.stride}`);
      }
    }
    const recBytes = safeExtent(`body ${b.name} records`, b.nrec, layout.stride, layout.recordsOffset);
    const start = safeExtent(`body ${b.name} start`, b.offset, 1);
    const end = safeExtent(`body ${b.name} end`, start, 1, recBytes);
    if (start < payloadOffset) fail("bad-geometry", `body ${b.name} starts at ${start}, before the payload at ${payloadOffset}`);
    if (end > payloadEnd) fail("truncated", `body ${b.name} needs bytes to ${end}; the payload ends at ${payloadEnd}`);
    const spanSeconds = b.nrec * b.intervalSec;
    const spanEnd = b.initEt + spanSeconds;
    if (!Number.isFinite(spanSeconds) || !Number.isFinite(spanEnd)) {
      fail("bad-header", `body ${b.name}: record span is not finite`);
    }
    const cov = header.coverage;
    if (b.initEt > cov[COVERAGE_START] + 1 || spanEnd < cov[COVERAGE_STOP] - 1) {
      fail(
        "bad-geometry",
        `body ${b.name} spans ${b.initEt}..${spanEnd} but the pack claims coverage ${cov[COVERAGE_START]}..${cov[COVERAGE_STOP]}`
      );
    }
    spans.push({ name: b.name, start, end });
    out.set(b.name, b);
  }
  spans.sort((x, y) => x.start - y.start);
  for (let i = 1; i < spans.length; i += 1) {
    if (spans[i].start < spans[i - 1].end) {
      fail("bad-geometry", `bodies ${spans[i - 1].name} and ${spans[i].name} overlap in the payload`);
    }
  }
  const deps = header.derived ?? {};
  if (deps.earth399 && typeof deps.earth399 === "object") {
    const need = deps.earth399.from ?? "moon";
    if (!out.has(need)) fail("bad-header", `derived earth399 depends on body ${need}, which the pack does not contain`);
  }
  return out;
}
function validateConstants(header) {
  const d = header.derived ?? {};
  const emrat = d.earth399?.emrat;
  if (emrat !== void 0) {
    if (!Number.isFinite(emrat) || emrat < 80 || emrat > 83) {
      fail("bad-header", `derived.earth399.emrat ${emrat} is not a plausible Earth/Moon mass ratio`);
    }
  }
  if (header.conventions && typeof header.conventions !== "object") fail("bad-header", "conventions must be an object");
}
async function verifyIntegrity(src, parsed, { expectDigest = null } = {}) {
  if (typeof src?.digest !== "function") fail("unverified", "this byte source cannot compute a digest");
  return applyIntegrityPolicy(await src.digest(0, parsed.digestRegionEnd), parsed, { expectDigest });
}
function applyIntegrityPolicy(computed, parsed, { expectDigest = null } = {}) {
  const selfConsistent = computed === parsed.trailerDigestHex;
  const matchesExpected = expectDigest === null ? null : computed === expectDigest;
  return {
    computedDigest: computed,
    storedDigest: parsed.trailerDigestHex,
    selfConsistent,
    expectedDigest: expectDigest,
    matchesExpected,
    // Said plainly because it is the thing most often assumed and least often true.
    authenticity: "not established: a digest stored in the artifact cannot attest to its source"
  };
}

// ../../../../../examples/precision-alpha/src/core/ephemeris.mjs
function readField(dv, base, w) {
  switch (w) {
    case 0:
      return 0;
    case 1:
      return dv.getInt8(base);
    case 2:
      return dv.getInt16(base, true);
    case 3: {
      const lo = dv.getUint16(base, true);
      const hi = dv.getInt8(base + 2);
      return hi * 65536 + lo;
    }
    case 4:
      return dv.getInt32(base, true);
    case 5: {
      const lo = dv.getUint32(base, true);
      const hi = dv.getInt8(base + 4);
      return hi * 4294967296 + lo;
    }
    case 6: {
      const lo = dv.getUint32(base, true);
      const mid = dv.getUint8(base + 4);
      const hi = dv.getInt8(base + 5);
      return hi * 281474976710656 + mid * 4294967296 + lo;
    }
    default:
      return dv.getFloat64(base, true);
  }
}
var Ephemeris = class {
  /**
   * @param {object} source  a byte source (see ./source.mjs)
   * @param {object} parsed  output of parseContainer
   */
  constructor(source, parsed) {
    this.src = source;
    this.header = parsed.header;
    this.coverage = parsed.header.coverage;
    this.emrat = parsed.header.derived?.earth399?.emrat;
    this.k = this.emrat === void 0 ? void 0 : 1 / this.emrat;
    this.bodies = /* @__PURE__ */ new Map();
    for (const b of parsed.header.bodies) {
      const fields = 3 * b.ncoef;
      this.bodies.set(b.name, {
        ...b,
        coefficients: new Float64Array(fields),
        cachedRecord: -1,
        mids: b.layout.enc === "q" ? this.#readMids(b, fields) : null
      });
    }
    this.scratch = new Float64Array(6);
    this.scratch2 = new Float64Array(6);
    this.observer = new Float64Array(6);
  }
  #readMids(b, fields) {
    const out = new Float64Array(fields);
    const dv = this.src.window(b.offset + b.layout.midsOffset, fields * 8);
    for (let i = 0; i < fields; i += 1) out[i] = dv.getFloat64(i * 8, true);
    return out;
  }
  #decode(b, record) {
    if (b.cachedRecord === record) return;
    const L = b.layout;
    const fields = 3 * b.ncoef;
    const base = b.offset + (L.enc === "f64" ? 0 : L.recordsOffset) + record * L.stride;
    const dv = this.src.window(base, L.enc === "f64" ? fields * 8 : L.stride);
    if (L.enc === "f64") {
      for (let f = 0; f < fields; f += 1) b.coefficients[f] = dv.getFloat64(f * 8, true);
    } else {
      const { widths, fieldOffset, q } = L;
      for (let f = 0; f < fields; f += 1) {
        const w = widths[f];
        b.coefficients[f] = w === 0 ? b.mids[f] : w === 8 ? readField(dv, fieldOffset[f], 8) : b.mids[f] + readField(dv, fieldOffset[f], w) * q;
      }
    }
    b.cachedRecord = record;
  }
  /** Is `et` (TDB seconds past J2000) inside the pack's declared coverage? */
  covers(et) {
    const c = this.coverage;
    return Number.isFinite(et) && et >= c.startEtSecTdb && et <= c.stopEtSecTdb;
  }
  /**
   * Position (km) and velocity (km/s) of one stored body, in whatever frame
   * the pack stored it. Written into `out` (length 6) to avoid allocating on
   * a hot path.
   */
  raw(name, et, out) {
    const b = this.bodies.get(name);
    if (!b) fail("unknown-body", `this pack does not contain ${name}`);
    let index = Math.floor((et - b.initEt) / b.intervalSec);
    if (index < 0) index = 0;
    if (index > b.nrec - 1) index = b.nrec - 1;
    this.#decode(b, index);
    const mid = b.initEt + (index + 0.5) * b.intervalSec;
    const radius = b.intervalSec / 2;
    const tau = (et - mid) / radius;
    const n = b.ncoef;
    const c = b.coefficients;
    for (let comp = 0; comp < 3; comp += 1) {
      const off = comp * n;
      let b1 = 0;
      let b2 = 0;
      let d1 = 0;
      let d2 = 0;
      for (let k = n - 1; k >= 1; k -= 1) {
        const t = b1;
        b1 = 2 * tau * b1 - b2 + c[off + k];
        b2 = t;
        const td = d1;
        d1 = 2 * tau * d1 - d2 + 2 * t;
        d2 = td;
      }
      out[comp] = tau * b1 - b2 + c[off];
      out[comp + 3] = (tau * d1 - d2 + b1) / radius;
    }
    return out;
  }
  /** Body relative to the solar-system barycentre, resolving a 'sun' frame. */
  #ssb(name, et, out) {
    const b = this.bodies.get(name);
    if (!b) fail("unknown-body", `this pack does not contain ${name}`);
    this.raw(name, et, out);
    if (b.frame === "sun") {
      this.raw("sun", et, this.scratch2);
      for (let i = 0; i < 6; i += 1) out[i] += this.scratch2[i];
    }
    return out;
  }
  /**
   * Barycentric state of an API body. `out` must not be the internal scratch
   * buffer — the Earth/Moon path writes through both, and aliasing them
   * silently corrupted a result in an earlier runtime, so it is refused.
   */
  state(body, et, out) {
    if (out === this.scratch || out === this.scratch2) {
      fail("unsupported-option", "state(): out must not be an internal scratch buffer");
    }
    if (body === "Sun") return this.#ssb("sun", et, out);
    if (body === "Moon" || body === "Earth") {
      if (this.k === void 0) fail("bad-header", "pack carries no EMRAT, so Earth and Moon cannot be derived");
      this.#ssb("emb", et, out);
      this.#ssb("moon", et, this.scratch);
      const f = body === "Moon" ? 1 : -this.k;
      for (let i = 0; i < 6; i += 1) out[i] += f * this.scratch[i];
      return out;
    }
    const key = PACK_NAME[body];
    if (!key) fail("unknown-body", `unknown body ${body}`);
    return this.#ssb(key, et, out);
  }
};
var PACK_NAME = Object.freeze({
  Mercury: "mercuryBary",
  Venus: "venusBary",
  Mars: "marsBary",
  Jupiter: "jupiterBary",
  Saturn: "saturnBary",
  Uranus: "uranusBary",
  Neptune: "neptuneBary",
  Pluto: "plutoBary"
});
var BARYCENTRE_NOT_CENTRE = Object.freeze(["Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]);

// ../../../../../examples/precision-alpha/src/core/nutation-series-2000b.mjs
var NUT00B_LUNISOLAR = [[0, 0, 0, 0, 1, -172064161, -174666, 33386, 92052331, 9086, 15377], [0, 0, 2, -2, 2, -13170906, -1675, -13696, 5730336, -3015, -4587], [0, 0, 2, 0, 2, -2276413, -234, 2796, 978459, -485, 1374], [0, 0, 0, 0, 2, 2074554, 207, -698, -897492, 470, -291], [0, 1, 0, 0, 0, 1475877, -3633, 11817, 73871, -184, -1924], [0, 1, 2, -2, 2, -516821, 1226, -524, 224386, -677, -174], [1, 0, 0, 0, 0, 711159, 73, -872, -6750, 0, 358], [0, 0, 2, 0, 1, -387298, -367, 380, 200728, 18, 318], [1, 0, 2, 0, 2, -301461, -36, 816, 129025, -63, 367], [0, -1, 2, -2, 2, 215829, -494, 111, -95929, 299, 132], [0, 0, 2, -2, 1, 128227, 137, 181, -68982, -9, 39], [-1, 0, 2, 0, 2, 123457, 11, 19, -53311, 32, -4], [-1, 0, 0, 2, 0, 156994, 10, -168, -1235, 0, 82], [1, 0, 0, 0, 1, 63110, 63, 27, -33228, 0, -9], [-1, 0, 0, 0, 1, -57976, -63, -189, 31429, 0, -75], [-1, 0, 2, 2, 2, -59641, -11, 149, 25543, -11, 66], [1, 0, 2, 0, 1, -51613, -42, 129, 26366, 0, 78], [-2, 0, 2, 0, 1, 45893, 50, 31, -24236, -10, 20], [0, 0, 0, 2, 0, 63384, 11, -150, -1220, 0, 29], [0, 0, 2, 2, 2, -38571, -1, 158, 16452, -11, 68], [0, -2, 2, -2, 2, 32481, 0, 0, -13870, 0, 0], [-2, 0, 0, 2, 0, -47722, 0, -18, 477, 0, -25], [2, 0, 2, 0, 2, -31046, -1, 131, 13238, -11, 59], [1, 0, 2, -2, 2, 28593, 0, -1, -12338, 10, -3], [-1, 0, 2, 0, 1, 20441, 21, 10, -10758, 0, -3], [2, 0, 0, 0, 0, 29243, 0, -74, -609, 0, 13], [0, 0, 2, 0, 0, 25887, 0, -66, -550, 0, 11], [0, 1, 0, 0, 1, -14053, -25, 79, 8551, -2, -45], [-1, 0, 0, 2, 1, 15164, 10, 11, -8001, 0, -1], [0, 2, 2, -2, 2, -15794, 72, -16, 6850, -42, -5], [0, 0, -2, 2, 0, 21783, 0, 13, -167, 0, 13], [1, 0, 0, -2, 1, -12873, -10, -37, 6953, 0, -14], [0, -1, 0, 0, 1, -12654, 11, 63, 6415, 0, 26], [-1, 0, 2, 2, 1, -10204, 0, 25, 5222, 0, 15], [0, 2, 0, 0, 0, 16707, -85, -10, 168, -1, 10], [1, 0, 2, 2, 2, -7691, 0, 44, 3268, 0, 19], [-2, 0, 2, 0, 0, -11024, 0, -14, 104, 0, 2], [0, 1, 2, 0, 2, 7566, -21, -11, -3250, 0, -5], [0, 0, 2, 2, 1, -6637, -11, 25, 3353, 0, 14], [0, -1, 2, 0, 2, -7141, 21, 8, 3070, 0, 4], [0, 0, 0, 2, 1, -6302, -11, 2, 3272, 0, 4], [1, 0, 2, -2, 1, 5800, 10, 2, -3045, 0, -1], [2, 0, 2, -2, 2, 6443, 0, -7, -2768, 0, -4], [-2, 0, 0, 2, 1, -5774, -11, -15, 3041, 0, -5], [2, 0, 2, 0, 1, -5350, 0, 21, 2695, 0, 12], [0, -1, 2, -2, 1, -4752, -11, -3, 2719, 0, -3], [0, 0, 0, -2, 1, -4940, -11, -21, 2720, 0, -9], [-1, -1, 0, 2, 0, 7350, 0, -8, -51, 0, 4], [2, 0, 0, -2, 1, 4065, 0, 6, -2206, 0, 1], [1, 0, 0, 2, 0, 6579, 0, -24, -199, 0, 2], [0, 1, 2, -2, 1, 3579, 0, 5, -1900, 0, 1], [1, -1, 0, 0, 0, 4725, 0, -6, -41, 0, 3], [-2, 0, 2, 0, 2, -3075, 0, -2, 1313, 0, -1], [3, 0, 2, 0, 2, -2904, 0, 15, 1233, 0, 7], [0, -1, 0, 2, 0, 4348, 0, -10, -81, 0, 2], [1, -1, 2, 0, 2, -2878, 0, 8, 1232, 0, 4], [0, 0, 0, 1, 0, -4230, 0, 5, -20, 0, -2], [-1, -1, 2, 2, 2, -2819, 0, 7, 1207, 0, 3], [-1, 0, 2, 0, 0, -4056, 0, 5, 40, 0, -2], [0, -1, 2, 2, 2, -2647, 0, 11, 1129, 0, 5], [-2, 0, 0, 0, 1, -2294, 0, -10, 1266, 0, -4], [1, 1, 2, 0, 2, 2481, 0, -7, -1062, 0, -3], [2, 0, 0, 0, 1, 2179, 0, -2, -1129, 0, -2], [-1, 1, 0, 1, 0, 3276, 0, 1, -9, 0, 0], [1, 1, 0, 0, 0, -3389, 0, 5, 35, 0, -2], [1, 0, 2, 0, 0, 3339, 0, -13, -107, 0, 1], [-1, 0, 2, -2, 1, -1987, 0, -6, 1073, 0, -2], [1, 0, 0, 0, 2, -1981, 0, 0, 854, 0, 0], [-1, 0, 0, 1, 0, 4026, 0, -353, -553, 0, -139], [0, 0, 2, 1, 2, 1660, 0, -5, -710, 0, -2], [-1, 0, 2, 4, 2, -1521, 0, 9, 647, 0, 4], [-1, 1, 0, 1, 1, 1314, 0, 0, -700, 0, 0], [0, -2, 2, -2, 1, -1283, 0, 0, 672, 0, 0], [1, 0, 2, 2, 1, -1331, 0, 8, 663, 0, 4], [-2, 0, 2, 2, 2, 1383, 0, -2, -594, 0, -2], [-1, 0, 0, 0, 2, 1405, 0, 4, -610, 0, 2], [1, 1, 2, -2, 2, 1290, 0, 0, -556, 0, 0]];

// ../../../../../examples/precision-alpha/src/core/nutation.mjs
var TURNAS = 1296e3;
var DAS2R = Math.PI / (180 * 3600);
var D2PI = 2 * Math.PI;
var U2A = 1e-7;
var XB = NUT00B_LUNISOLAR;
if (XB.length !== 77) throw new Error(`IAU2000B must have 77 terms, got ${XB.length}`);
var DPPLAN_B = -135e-6;
var DEPLAN_B = 388e-6;
var fmod = (x, y) => x % y;
var arcsecArg = (a) => fmod(a, TURNAS) * DAS2R;
function nut00b(t) {
  const el = arcsecArg(485868.249036 + 17179159232178e-4 * t);
  const elp = arcsecArg(128710479305e-5 + 1295965810481e-4 * t);
  const f = arcsecArg(335779.526232 + 17395272628478e-4 * t);
  const d = arcsecArg(107226070369e-5 + 1602961601209e-3 * t);
  const om = arcsecArg(450160.398036 - 69628905431e-4 * t);
  let dp = 0;
  let de = 0;
  for (let i = XB.length - 1; i >= 0; i -= 1) {
    const r = XB[i];
    const arg = fmod(r[0] * el + r[1] * elp + r[2] * f + r[3] * d + r[4] * om, D2PI);
    const s = Math.sin(arg);
    const c = Math.cos(arg);
    dp += (r[5] + r[6] * t) * s + r[7] * c;
    de += (r[8] + r[9] * t) * c + r[10] * s;
  }
  return { dpsi: dp * U2A + DPPLAN_B, deps: de * U2A + DEPLAN_B };
}
function nutAstronomyEngine(t) {
  const m = (x) => fmod(x, TURNAS) * DAS2R;
  const elp = m(128710479305e-5 + t * 1295965810481e-4);
  const f = m(335779.526232 + t * 17395272628478e-4);
  const d = m(107226070369e-5 + t * 1602961601209e-3);
  const om = m(450160.398036 - t * 69628905431e-4);
  let sarg = Math.sin(om);
  let carg = Math.cos(om);
  let dp = (-172064161 - 174666 * t) * sarg + 33386 * carg;
  let de = (92052331 + 9086 * t) * carg + 15377 * sarg;
  let arg = 2 * (f - d + om);
  sarg = Math.sin(arg);
  carg = Math.cos(arg);
  dp += (-13170906 - 1675 * t) * sarg - 13696 * carg;
  de += (5730336 - 3015 * t) * carg - 4587 * sarg;
  arg = 2 * (f + om);
  sarg = Math.sin(arg);
  carg = Math.cos(arg);
  dp += (-2276413 - 234 * t) * sarg + 2796 * carg;
  de += (978459 - 485 * t) * carg + 1374 * sarg;
  arg = 2 * om;
  sarg = Math.sin(arg);
  carg = Math.cos(arg);
  dp += (2074554 + 207 * t) * sarg - 698 * carg;
  de += (-897492 + 470 * t) * carg - 291 * sarg;
  sarg = Math.sin(elp);
  carg = Math.cos(elp);
  dp += (1475877 - 3633 * t) * sarg + 11817 * carg;
  de += (73871 - 184 * t) * carg - 1924 * sarg;
  return { dpsi: DPPLAN_B + dp * U2A, deps: DEPLAN_B + de * U2A };
}
function meanObliquityArcsec(t) {
  return ((((-434e-10 * t - 576e-9) * t + 20034e-7) * t - 1831e-7) * t - 46.836769) * t + 84381.406;
}
function adjustToP03(nut, t) {
  const fj2 = -27774e-10 * t;
  return {
    dpsi: nut.dpsi + nut.dpsi * (4697e-10 + fj2),
    deps: nut.deps + nut.deps * fj2
  };
}

// ../../../../../examples/precision-alpha/src/core/frames.mjs
var DAS2R2 = Math.PI / (180 * 3600);
var mul = (a, b) => {
  const o = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) {
    o[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
  }
  return o;
};
var apply = (m, v) => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
];
var transpose = (m) => [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]];
var R1 = (a) => {
  const s = Math.sin(a);
  const c = Math.cos(a);
  return [[1, 0, 0], [0, c, s], [0, -s, c]];
};
var R2 = (a) => {
  const s = Math.sin(a);
  const c = Math.cos(a);
  return [[c, 0, -s], [0, 1, 0], [s, 0, c]];
};
var R3 = (a) => {
  const s = Math.sin(a);
  const c = Math.cos(a);
  return [[c, s, 0], [-s, c, 0], [0, 0, 1]];
};
function pfw06(t) {
  const gamb = (-0.052928 + (10.556378 + (0.4932044 + (-31238e-8 + (-2788e-9 + 26e-9 * t) * t) * t) * t) * t) * DAS2R2;
  const phib = (84381.412819 + (-46.811016 + (0.0511268 + (53289e-8 + (-44e-8 + -176e-10 * t) * t) * t) * t) * t) * DAS2R2;
  const psib = (-0.041775 + (5038.481484 + (1.5584175 + (-18522e-8 + (-26452e-9 + -148e-10 * t) * t) * t) * t) * t) * DAS2R2;
  const epsa = meanObliquityArcsec(t) * DAS2R2;
  return { gamb, phib, psib, epsa };
}
function fw2m(gamb, phib, psi, eps) {
  return mul(R1(-eps), mul(R3(-psi), mul(R1(phib), R3(gamb))));
}
var DPBIAS = -0.041775 * DAS2R2;
var DEBIAS = -68192e-7 * DAS2R2;
var DRA0 = -0.0146 * DAS2R2;
var EPS0 = 84381.448 * DAS2R2;
var BIAS = mul(R1(-DEBIAS), mul(R2(DPBIAS * Math.sin(EPS0)), R3(DRA0)));
var BIAS_INV = transpose(BIAS);
var NUTATIONS = {
  /** the five-term series astronomy-engine 2.1.19 actually ships */
  ae: (t) => nutAstronomyEngine(t),
  /** published IAU 2000B, 77 luni-solar terms + planetary bias offsets */
  "2000b": (t) => adjustToP03(nut00b(t), t),
  /** no nutation at all, for isolating its size */
  none: () => ({ dpsi: 0, deps: 0 })
};
function npbMatrix(t, { nutation = "2000b", bias = true } = {}) {
  const nut = NUTATIONS[nutation](t);
  const { gamb, phib, psib, epsa } = pfw06(t);
  const npb = fw2m(gamb, phib, psib + nut.dpsi * DAS2R2, epsa + nut.deps * DAS2R2);
  return {
    matrix: bias ? npb : mul(npb, BIAS_INV),
    epsTrue: epsa + nut.deps * DAS2R2,
    dpsiArcsec: nut.dpsi,
    depsArcsec: nut.deps
  };
}
function equToEcl(v, epsTrue) {
  const c = Math.cos(epsTrue);
  const s = Math.sin(epsTrue);
  return [v[0], v[1] * c + v[2] * s, -v[1] * s + v[2] * c];
}
var len2 = (x, y) => Math.sqrt(x * x + y * y);
function eclipticLonLatDeg(v) {
  let lon = Math.atan2(v[1], v[0]) * 180 / Math.PI;
  if (lon < 0) lon += 360;
  const lat = Math.atan2(v[2], len2(v[0], v[1])) * 180 / Math.PI;
  return { lon, lat };
}

// ../../../../../examples/precision-alpha/src/core/reduce.mjs
var AU_KM = 1495978707e-1;
var LIGHT_TIME_AU = 499.004783836;
var C_KM_S = AU_KM / LIGHT_TIME_AU;
var DAY = 86400;
var SRS = 197412574336e-19;
var CONTRACT = Object.freeze({
  bodies: Object.freeze(["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]),
  /** Named routes that are a planetary-SYSTEM barycentre, not the body centre. */
  barycentreNotCentre: BARYCENTRE_NOT_CENTRE,
  /** What `apparent()` returns. */
  coordinates: "apparent geocentric ecliptic longitude and latitude of date (degrees), true equinox and equator of date, plus the geometric geocentric distance in km",
  /**
   * Velocity is available from the backend as the analytic Chebyshev
   * derivative (km/s, barycentric ICRF). The reduction itself uses it for the
   * observer, and `apparent()` reports no apparent angular rate: the search
   * differentiates longitude numerically over the reduction as a whole,
   * because an apparent rate consistent with light-time and aberration is not
   * simply the state derivative rotated.
   */
  velocities: "barycentric ICRF state derivative (km/s) from the backend; no apparent angular rate is reported",
  corrections: Object.freeze([
    "TDB-TT (two-term Astronomical Almanac form, |error| < 30 us)",
    "light-time iteration to a caller-set tolerance",
    "gravitational light deflection by the Sun (eraLd form)",
    "annual aberration (special-relativistic, or first-order as a switch)",
    "IAU 2000 frame bias ICRF -> dynamical mean equinox of J2000",
    "IAU 2006 precession (Fukushima-Williams, eraPfw06/eraFw2m)",
    "IAU 2000B nutation, 77 published luni-solar terms, adjusted to P03"
  ]),
  notModelled: Object.freeze([
    "diurnal (topocentric) parallax and diurnal aberration: the observer is the geocentre",
    "atmospheric refraction",
    "deflection by any body other than the Sun",
    "Delta-T: the caller supplies TT, not UTC",
    "physical body centres for Mars outward (see barycentreNotCentre)"
  ])
});
var sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
var addv = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
var norm = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
var scale = (v, k) => [v[0] * k, v[1] * k, v[2] * k];
var unit = (v) => scale(v, 1 / norm(v));
var dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
var CORRECTED = Object.freeze({
  nutation: "2000b",
  // published 77-term IAU 2000B
  bias: true,
  // ICRF -> dynamical J2000 frame bias
  aberration: "full",
  // 'none' | 'first' | 'full'
  deflection: "sun",
  // 'none' | 'sun'
  timescale: "tdb",
  // 'tt' treats TT as TDB, as the prototype does
  observerVelocity: "analytic",
  // 'analytic' | 'central60' | 'central600'
  lightTimeIters: 12,
  lightTimeTolSec: 1e-11,
  deflectionLimit: 1e-14
});
var PROTOTYPE = Object.freeze({
  nutation: "ae",
  bias: false,
  aberration: "first",
  deflection: "none",
  timescale: "tt",
  observerVelocity: "central60",
  lightTimeIters: 5,
  lightTimeTolSec: 1e-9,
  deflectionLimit: 1e-14
});
var OPTION_VALUES = {
  nutation: ["2000b", "ae", "none"],
  aberration: ["full", "first", "none"],
  deflection: ["sun", "none"],
  timescale: ["tdb", "tt"],
  observerVelocity: ["analytic", "central60", "central600"]
};
function resolveOptions(options) {
  const o = { ...CORRECTED, ...options };
  for (const key of Object.keys(o)) {
    if (!(key in CORRECTED)) fail("unsupported-option", `unknown reduction option ${key}`);
  }
  for (const [key, allowed] of Object.entries(OPTION_VALUES)) {
    if (!allowed.includes(o[key])) {
      fail("unsupported-option", `${key} must be one of ${allowed.join(", ")}, got ${JSON.stringify(o[key])}`);
    }
  }
  if (typeof o.bias !== "boolean") fail("unsupported-option", "bias must be a boolean");
  for (const key of ["lightTimeIters", "lightTimeTolSec", "deflectionLimit"]) {
    if (!Number.isFinite(o[key]) || o[key] <= 0) fail("unsupported-option", `${key} must be a positive finite number`);
  }
  if (!Number.isInteger(o.lightTimeIters) || o.lightTimeIters > 1e3) {
    fail("unsupported-option", "lightTimeIters must be an integer <= 1000");
  }
  return o;
}
function tdbMinusTt(jdTt) {
  const g = (357.53 + 0.9856003 * (jdTt - 2451545)) * Math.PI / 180;
  const l = (246.11 + 0.90251792 * (jdTt - 2451545)) * Math.PI / 180;
  return 1658e-6 * Math.sin(g) + 14e-6 * Math.sin(2 * g) + 224e-7 * Math.sin(l);
}
var Reducer = class {
  /** @param {{state: Function, covers: Function}} backend */
  constructor(backend) {
    if (!backend || typeof backend.state !== "function" || typeof backend.covers !== "function") {
      fail("unsupported-option", "backend must provide state(body, et, out) and covers(et)");
    }
    this.backend = backend;
    this.a = new Float64Array(6);
    this.b = new Float64Array(6);
    this.c = new Float64Array(6);
  }
  #pos(body, et, buf) {
    this.backend.state(body, et, buf);
    return [buf[0], buf[1], buf[2]];
  }
  #velCentral(body, et, h) {
    const a = this.#pos(body, et - h, this.b);
    const b = this.#pos(body, et + h, this.c);
    return [(b[0] - a[0]) / (2 * h), (b[1] - a[1]) / (2 * h), (b[2] - a[2]) / (2 * h)];
  }
  /**
   * Apparent geocentric place of `body` at `ttDays` (TT days past J2000 —
   * Delta-T is the caller's problem), with full diagnostics.
   *
   * `options.offsetKm` adds a constant km vector to the target's barycentric
   * position at the EMISSION epoch. It exists so a planetary-system barycentre
   * can be turned into a body centre by a satellite ephemeris and the two
   * differenced through identical code; it is not part of the shipped contract.
   */
  apparent(body, ttDays, options = {}) {
    const { offsetKm, ...rest } = options;
    if (offsetKm !== void 0 && (!Array.isArray(offsetKm) || offsetKm.length !== 3 || !offsetKm.every(Number.isFinite))) {
      fail("unsupported-option", "offsetKm must be three finite numbers");
    }
    const o = resolveOptions(rest);
    if (!CONTRACT.bodies.includes(body)) fail("unknown-body", `${body} is not in this reduction's contract`);
    if (!Number.isFinite(ttDays)) fail("bad-instant", "ttDays must be a finite number");
    const jdTt = ttDays + 2451545;
    const et = o.timescale === "tdb" ? ttDays * DAY + tdbMinusTt(jdTt) : ttDays * DAY;
    const t = ttDays / 36525;
    if (!this.backend.covers(et)) {
      fail("out-of-coverage", "the requested instant is outside the pack's coverage", { et });
    }
    const target = (e) => {
      const v = this.#pos(body, e, this.a);
      return offsetKm ? addv(v, offsetKm) : v;
    };
    this.backend.state("Earth", et, this.b);
    const observer = [this.b[0], this.b[1], this.b[2]];
    let observerVel;
    if (o.observerVelocity === "analytic") observerVel = [this.b[3], this.b[4], this.b[5]];
    else observerVel = this.#velCentral("Earth", et, o.observerVelocity === "central600" ? 600 : 60);
    let tau = 0;
    let geo = sub(target(et), observer);
    let iters = 0;
    let converged = false;
    for (let i = 0; i < o.lightTimeIters; i += 1) {
      iters = i + 1;
      const next = norm(geo) / AU_KM * LIGHT_TIME_AU;
      if (Math.abs(next - tau) < o.lightTimeTolSec) {
        tau = next;
        converged = true;
        break;
      }
      tau = next;
      if (!this.backend.covers(et - tau)) {
        fail("out-of-coverage", "the light-time lookback reaches outside the pack's coverage", { et: et - tau });
      }
      geo = sub(target(et - tau), observer);
    }
    const geometric = geo;
    const distKm = norm(geo);
    let p = unit(geo);
    let limited = false;
    if (o.deflection === "sun" && body !== "Sun") {
      const sunAtRecv = this.#pos("Sun", et, this.c);
      const eVec = sub(observer, sunAtRecv);
      const emAu = norm(eVec) / AU_KM;
      const e = unit(eVec);
      const sunAtEmit = this.#pos("Sun", et - tau, this.c);
      const q = unit(sub(addv(observer, geo), sunAtEmit));
      const qdqpe = dot(q, addv(q, e));
      const dlim = o.deflectionLimit;
      limited = qdqpe < dlim;
      const w = SRS / emAu / Math.max(qdqpe, dlim);
      const peq = cross(p, cross(e, q));
      p = unit(addv(p, scale(peq, w)));
    }
    if (o.aberration !== "none") {
      const v = scale(observerVel, 1 / C_KM_S);
      if (o.aberration === "first") {
        p = unit(addv(p, v));
      } else {
        const v2 = dot(v, v);
        const bm1 = Math.sqrt(1 - v2);
        const pdv = dot(p, v);
        const w1 = 1 + pdv / (1 + bm1);
        const r = [0, 0, 0];
        for (let i = 0; i < 3; i += 1) r[i] = (bm1 * p[i] + w1 * v[i]) / (1 + pdv);
        p = unit(r);
      }
    }
    const { matrix, epsTrue, dpsiArcsec, depsArcsec } = npbMatrix(t, { nutation: o.nutation, bias: o.bias });
    const ecl = equToEcl(apply(matrix, p), epsTrue);
    const { lon, lat } = eclipticLonLatDeg(ecl);
    return {
      body,
      isSystemBarycentre: BARYCENTRE_NOT_CENTRE.includes(body),
      lon,
      lat,
      distKm,
      lightTimeSec: tau,
      lightTimeIters: iters,
      lightTimeConverged: converged,
      deflectionLimiterBound: limited,
      emissionEt: et - tau,
      dpsiArcsec,
      depsArcsec,
      geometric
    };
  }
  /** Apparent geocentric ecliptic longitude in degrees — the search's scalar. */
  longitude(body, ttDays, options) {
    return this.apparent(body, ttDays, options).lon;
  }
};

// ../../../../../examples/precision-alpha/src/core/interval-search.mjs
var VERDICTS = Object.freeze([
  "crossing",
  "no-crossing",
  "stationary-touch",
  "multiple-crossings",
  "boundary-event",
  "unresolved-interval"
]);
var OUTCOMES = Object.freeze(["certified", "incomplete", "refused"]);
var BudgetExhausted = class extends Error {
  constructor(used, stage) {
    super(`evaluation budget exhausted after ${used} evaluations during ${stage}`);
    this.used = used;
    this.stage = stage;
  }
};
var intersect = (p, q) => [Math.max(p[0], q[0]), Math.min(p[1], q[1])];
function classifyInterval(spec) {
  const {
    f,
    fPrime = null,
    derivativeEnclosure,
    secondDerivativeEnclosure = null,
    a,
    b,
    epsilon,
    minWidth,
    maxEvaluations = 5e4,
    boundKind = "empirical",
    exactArithmetic = false,
    label = ""
  } = spec;
  const refuse = (why, extra = {}) => ({
    label,
    verdict: "unresolved-interval",
    outcome: "refused",
    reason: why,
    complete: false,
    certified: false,
    boundKind,
    epsilon,
    exactArithmetic,
    rootCount: null,
    possibleRootCounts: null,
    interval: [a, b],
    evaluations: 0,
    crossings: null,
    openRegions: [],
    undecidedRegions: [],
    turningPoints: [],
    partialUncertifiedFindings: null,
    assumptions: [],
    notes: [],
    ...extra
  });
  if (typeof f !== "function" || typeof derivativeEnclosure !== "function") return refuse("f-and-derivativeEnclosure-required");
  if (!Number.isFinite(a) || !Number.isFinite(b) || !(a < b)) return refuse("interval-must-be-finite-and-ordered");
  if (!Number.isFinite(epsilon) || epsilon < 0) return refuse("epsilon-must-be-finite-and-non-negative");
  if (!Number.isFinite(minWidth) || minWidth <= 0) return refuse("minWidth-must-be-positive");
  if (!Number.isFinite(maxEvaluations) || maxEvaluations < 16) return refuse("maxEvaluations-too-small-to-attempt");
  let used = 0;
  let stage = "setup";
  const spend = () => {
    used += 1;
    if (used > maxEvaluations) throw new BudgetExhausted(used, stage);
  };
  const valueCache = /* @__PURE__ */ new Map();
  const value = (t) => {
    if (valueCache.has(t)) return valueCache.get(t);
    spend();
    const y = f(t);
    if (!Number.isFinite(y)) throw new RangeError(`f returned a non-finite value at t=${t}`);
    valueCache.set(t, y);
    return y;
  };
  const slopeCache = /* @__PURE__ */ new Map();
  const slope = fPrime ? (t) => {
    if (slopeCache.has(t)) return slopeCache.get(t);
    spend();
    const d = fPrime(t);
    if (!Number.isFinite(d)) throw new RangeError(`fPrime returned a non-finite value at t=${t}`);
    slopeCache.set(t, d);
    return d;
  } : null;
  const ctx = { value, slope };
  const enclose = (u, v) => {
    const d = derivativeEnclosure(u, v, ctx);
    if (!Array.isArray(d) || d.length !== 2 || !Number.isFinite(d[0]) || !Number.isFinite(d[1]) || d[0] > d[1]) {
      throw new RangeError("derivativeEnclosure must return a finite ordered pair");
    }
    return d;
  };
  const valueEnclosure = (u, v, d) => {
    const w = v - u, fu = value(u), fv = value(v);
    const fromLeft = [fu + Math.min(0, d[0] * w), fu + Math.max(0, d[1] * w)];
    const fromRight = [fv - Math.max(0, d[1] * w), fv - Math.min(0, d[0] * w)];
    return intersect(fromLeft, fromRight);
  };
  const cells = [];
  try {
    stage = "cell-decomposition";
    const stack = [[a, b, 0]];
    while (stack.length) {
      const [u, v, depth] = stack.pop();
      const d = enclose(u, v);
      const V = valueEnclosure(u, v, d);
      if (V[0] > epsilon || V[1] < -epsilon) {
        cells.push({ u, v, status: "excluded", d, valueEnclosure: V, sign: V[0] > epsilon ? 1 : -1, depth });
        continue;
      }
      if (d[0] > 0 || d[1] < 0) {
        cells.push({ u, v, status: "monotone", d, valueEnclosure: V, direction: d[0] > 0 ? 1 : -1, depth });
        continue;
      }
      const mid = midpoint(u, v, minWidth);
      if (v - u <= minWidth || !(mid > u && mid < v)) {
        cells.push({ u, v, status: "floor", d, valueEnclosure: V, depth });
        continue;
      }
      stack.push([mid, v, depth + 1], [u, mid, depth + 1]);
    }
  } catch (error) {
    if (!(error instanceof BudgetExhausted)) throw error;
    return budgetRefusal({ label, boundKind, epsilon, exactArithmetic, a, b, minWidth, maxEvaluations, used, stage: error.stage, closed: cells.length });
  }
  cells.sort((x, y) => x.u - y.u);
  const runs = [];
  for (const cell of cells) {
    const prior = runs[runs.length - 1];
    const same = prior && prior.status === cell.status && (cell.status === "monotone" ? prior.direction === cell.direction : cell.status === "excluded" ? prior.sign === cell.sign : true);
    if (same) {
      prior.v = cell.v;
      prior.d = [Math.min(prior.d[0], cell.d[0]), Math.max(prior.d[1], cell.d[1])];
      prior.parts += 1;
    } else runs.push({ ...cell, parts: 1 });
  }
  let junctionValues;
  let turningPoints = [];
  try {
    stage = "junction-evaluation";
    junctionValues = [a, ...runs.map((r) => r.v)].map((t) => ({ t, value: value(t) }));
    stage = "open-cell-characterisation";
    turningPoints = runs.filter((r) => r.status === "floor").map((r) => characteriseOpenCell(r, { value, slope, enclose, secondDerivativeEnclosure, ctx, minWidth, epsilon }));
  } catch (error) {
    if (!(error instanceof BudgetExhausted)) throw error;
    return budgetRefusal({ label, boundKind, epsilon, exactArithmetic, a, b, minWidth, maxEvaluations, used, stage: error.stage, closed: cells.length });
  }
  const junctionAt = new Map(junctionValues.map((j) => [j.t, j.value]));
  const sideOf = (x) => x > epsilon ? 1 : x < -epsilon ? -1 : 0;
  const crossings = [];
  const openRuns = [];
  let certifiedCount = 0;
  for (const run of runs) {
    const fu = junctionAt.get(run.u), fv = junctionAt.get(run.v);
    if (run.status === "excluded") continue;
    if (run.status === "monotone") {
      const su = sideOf(fu), sv = sideOf(fv);
      if (su === 0 || sv === 0) {
        const atOuterEdge = su === 0 && run.u === a || sv === 0 && run.v === b;
        const inner = su === 0 ? sv : su;
        if (atOuterEdge && inner !== 0) {
          const at = su === 0 ? run.u : run.v;
          const level = inner * epsilon;
          let far = at;
          try {
            stage = "edge-root-bracketing";
            const other = su === 0 ? run.v : run.u;
            const fOther = su === 0 ? fv : fu;
            const fAt = su === 0 ? fu : fv;
            if (epsilon > 0 && (fAt - level) * (fOther - level) < 0) {
              let lo = Math.min(at, other), hi = Math.max(at, other), flo = value(lo) - level;
              for (let i = 0; i < 200 && hi - lo > minWidth; i += 1) {
                const m = midpoint(lo, hi, minWidth);
                if (!(m > lo && m < hi)) break;
                const fm = value(m) - level;
                if (fm === 0) {
                  lo = m;
                  hi = m;
                  break;
                }
                if (fm < 0 === flo < 0) {
                  lo = m;
                  flo = fm;
                } else hi = m;
              }
              far = Math.round((lo + hi) / 2);
            }
          } catch (error) {
            if (!(error instanceof BudgetExhausted)) throw error;
            return budgetRefusal({ label, boundKind, epsilon, exactArithmetic, a, b, minWidth, maxEvaluations, used, stage: error.stage, closed: cells.length });
          }
          crossings.push({
            lo: Math.min(at, far),
            hi: Math.max(at, far),
            width: Math.abs(far - at),
            centre: at,
            direction: run.direction > 0 ? "rising" : "falling",
            transversal: true,
            atIntervalEdge: true,
            edgeValue: su === 0 ? fu : fv,
            bracketClippedByIntervalEdge: true,
            bracketNote: "The root lies within epsilon of this interval endpoint. The bracket shown is the part of the epsilon set that falls inside the interval; the root may lie on either side of the endpoint, and which side is not certified."
          });
          certifiedCount += 1;
          continue;
        }
        openRuns.push({ from: run.u, to: run.v, why: "monotone-run-end-within-epsilon", turningPoint: null });
        continue;
      }
      if (su === sv) continue;
      let bracket;
      try {
        stage = "root-bracketing";
        bracket = bracketRoot(value, run.u, run.v, epsilon, minWidth, fu, fv);
      } catch (error) {
        if (!(error instanceof BudgetExhausted)) throw error;
        return budgetRefusal({ label, boundKind, epsilon, exactArithmetic, a, b, minWidth, maxEvaluations, used, stage: error.stage, closed: cells.length });
      }
      crossings.push({ ...bracket, direction: run.direction > 0 ? "rising" : "falling", transversal: true, atIntervalEdge: false });
      certifiedCount += 1;
      continue;
    }
    openRuns.push({
      from: run.u,
      to: run.v,
      why: "value-enclosure-straddles-epsilon-at-the-subdivision-floor",
      turningPoint: turningPoints.find((x) => x.from === run.u && x.to === run.v) ?? null
    });
  }
  const openCells = [];
  for (const run of openRuns.sort((x, y) => x.from - y.from)) {
    const prior = openCells[openCells.length - 1];
    if (prior && prior.to === run.from) {
      prior.to = run.to;
      prior.why = `${prior.why}+${run.why}`;
      prior.turningPoint = prior.turningPoint ?? run.turningPoint;
    } else openCells.push({ ...run });
  }
  const assumptions = [];
  let unbounded = false;
  for (const region of openCells) {
    const sLeft = sideOf(junctionAt.get(region.from) ?? value(region.from));
    const sRight = sideOf(junctionAt.get(region.to) ?? value(region.to));
    region.endSides = [sLeft, sRight];
    let atMostOneTurn = false;
    if (secondDerivativeEnclosure) {
      try {
        stage = "open-region-curvature";
        const dd = secondDerivativeEnclosure(region.from, region.to, ctx);
        if (Array.isArray(dd) && (dd[0] > 0 || dd[1] < 0)) {
          atMostOneTurn = true;
          region.curvatureSign = dd[0] > 0 ? 1 : -1;
        }
      } catch (error) {
        if (!(error instanceof BudgetExhausted)) throw error;
        return budgetRefusal({ label, boundKind, epsilon, exactArithmetic, a, b, minWidth, maxEvaluations, used, stage: error.stage, closed: cells.length });
      }
    }
    region.atMostOneTurningPoint = atMostOneTurn;
    if (!atMostOneTurn) {
      region.possibleRootCounts = null;
      unbounded = true;
      continue;
    }
    assumptions.push("open region holds at most one turning point (certified by the second-derivative enclosure over the whole region)");
    region.possibleRootCounts = [0, 1, 2];
  }
  const undecided = openCells;
  crossings.sort((x, y) => x.lo - y.lo);
  const edgeCrossings = crossings.filter((x) => x.atIntervalEdge);
  const startOnLevel = sideOf(junctionAt.get(a)) === 0;
  const endOnLevel = sideOf(junctionAt.get(runs[runs.length - 1].v)) === 0;
  const resolved = undecided.length === 0;
  let verdict, outcome, rootCount, possibleRootCounts, reason;
  const notes = [];
  if (!resolved) {
    verdict = "unresolved-interval";
    outcome = "incomplete";
    rootCount = null;
    possibleRootCounts = undecided.some((x) => x.possibleRootCounts === null) ? null : undecided.reduce((acc, x) => sumSets(acc, x.possibleRootCounts), [certifiedCount]);
    reason = undecided.some((c) => c.why.includes("value-enclosure")) ? "turning-region-within-epsilon-of-level" : "run-boundary-within-epsilon-of-level";
    notes.push(
      `${undecided.length} region(s) could not be closed at epsilon=${epsilon}.`,
      unbounded ? "The number of roots inside the open regions is not bounded above by this search: no second-derivative enclosure was supplied or it does not exclude zero there." : "The root COUNT is not decidable at this epsilon.",
      "The certified roots below are NOT an exhaustive list and must not be published as one."
    );
  } else if (startOnLevel || endOnLevel || edgeCrossings.length) {
    verdict = "boundary-event";
    outcome = "certified";
    rootCount = certifiedCount;
    possibleRootCounts = [rootCount];
    reason = "root-on-an-interval-endpoint";
    notes.push("A root sits on an endpoint of the query interval. Half-open ownership between adjacent intervals is the caller's decision, not the search's: reporting it once in each closed view and deduplicating by identity is the only consistent choice.");
  } else if (certifiedCount >= 2) {
    verdict = "multiple-crossings";
    outcome = "certified";
    rootCount = certifiedCount;
    possibleRootCounts = [rootCount];
    reason = "multiple-certified-transversal-roots";
  } else if (certifiedCount === 1) {
    verdict = "crossing";
    outcome = "certified";
    rootCount = 1;
    possibleRootCounts = [1];
    reason = "single-certified-transversal-root";
  } else {
    verdict = "no-crossing";
    outcome = "certified";
    rootCount = 0;
    possibleRootCounts = [0];
    reason = "every-cell-certified-clear-of-the-level";
  }
  if (!resolved && exactArithmetic && undecided.length === 1 && certifiedCount === 0) {
    const tp = undecided[0].turningPoint;
    if (tp && tp.value === 0 && tp.curvatureSign !== 0 && tp.curvatureSign !== null && epsilon === 0) {
      verdict = "stationary-touch";
      outcome = "certified";
      rootCount = 1;
      possibleRootCounts = [1];
      reason = "tangency-certified-under-declared-exact-arithmetic";
      notes.length = 0;
      notes.push(
        "The turning point value is exactly zero in the caller's declared exact arithmetic and the curvature has one certified sign over the cell, so the function touches the level once without crossing.",
        "This route requires exactArithmetic and epsilon === 0. It is unavailable to any ephemeris-backed function and must stay that way."
      );
      crossings.push({ lo: tp.t, hi: tp.t, width: 0, centre: tp.t, direction: tp.curvatureSign > 0 ? "touch-from-above" : "touch-from-below", transversal: false, atIntervalEdge: false });
      undecided.length = 0;
    }
  }
  if (boundKind === "empirical" && outcome === "certified") {
    notes.push("Completeness is conditional on the declared derivative enclosure, which is empirical here: it holds if the declared curvature bound holds. That is not a theorem about the underlying function.");
  }
  return {
    label,
    verdict,
    outcome,
    reason,
    complete: verdict !== "unresolved-interval",
    certified: outcome === "certified",
    boundKind,
    epsilon,
    exactArithmetic,
    rootCount,
    possibleRootCounts,
    interval: [a, b],
    minWidth,
    maxEvaluations,
    evaluations: used,
    cells: cells.length,
    runs: runs.length,
    cellStatusCounts: countBy(cells.map((c) => c.status)),
    crossings: outcome === "certified" ? crossings : null,
    partialUncertifiedFindings: outcome === "certified" ? null : {
      warning: "NOT EXHAUSTIVE. These roots were certified while other cells stayed open; the true count is in possibleRootCounts, which is null when even that is unbounded.",
      certifiedTransversalRoots: crossings
    },
    openRegions: openCells,
    undecidedRegions: undecided,
    turningPoints,
    endpointValues: { a: junctionAt.get(a), b: junctionAt.get(runs[runs.length - 1].v) },
    assumptions: [...new Set(assumptions)],
    notes
  };
}
function budgetRefusal({ label, boundKind, epsilon, exactArithmetic, a, b, minWidth, maxEvaluations, used, stage, closed }) {
  return {
    label,
    verdict: "unresolved-interval",
    outcome: "refused",
    reason: `evaluation-budget-exhausted:${stage}`,
    complete: false,
    certified: false,
    boundKind,
    epsilon,
    exactArithmetic,
    rootCount: null,
    possibleRootCounts: null,
    interval: [a, b],
    minWidth,
    maxEvaluations,
    evaluations: used,
    crossings: null,
    partialUncertifiedFindings: { warning: "NOT EXHAUSTIVE. The search stopped at its declared evaluation limit and covered only part of the interval.", cellsClosed: closed },
    openRegions: [],
    undecidedRegions: [],
    turningPoints: [],
    assumptions: [],
    notes: [`Refused to certify: the declared evaluation limit of ${maxEvaluations} was reached during ${stage}.`]
  };
}
var countBy = (xs) => xs.reduce((acc, x) => ({ ...acc, [x]: (acc[x] ?? 0) + 1 }), {});
var sumSets = (p, q) => [...new Set(p.flatMap((x) => q.map((y) => x + y)))].sort((x, y) => x - y);
function midpoint(u, v, minWidth) {
  if (minWidth >= 1 && Number.isInteger(u) && Number.isInteger(v)) return Math.floor((u + v) / 2);
  return u + (v - u) / 2;
}
function characteriseOpenCell(run, { value, slope, enclose, secondDerivativeEnclosure, ctx, minWidth }) {
  let u = run.u, v = run.v;
  let locatedBy = "cell-midpoint";
  if (slope) {
    let du = slope(u), dv = slope(v);
    if (du === 0) v = u;
    else if (dv === 0) u = v;
    else if (du * dv < 0) {
      for (let i = 0; i < 200; i += 1) {
        if (!(v - u > 0)) break;
        const m = midpoint(u, v, Number.isInteger(u) && Number.isInteger(v) && minWidth >= 1 ? 1 : 0);
        if (!(m > u && m < v)) break;
        const dm = slope(m);
        if (dm === 0) {
          u = m;
          v = m;
          break;
        }
        if (dm < 0 === du < 0) {
          u = m;
          du = dm;
        } else {
          v = m;
          dv = dm;
        }
      }
      locatedBy = "derivative-bisection";
    } else locatedBy = "derivative-has-no-sign-change-in-cell";
  }
  const t = u === v ? u : midpoint(u, v, Number.isInteger(u) && Number.isInteger(v) && minWidth >= 1 ? 1 : 0);
  const fv = value(t);
  const d = enclose(run.u, run.v);
  const dMax = Math.max(Math.abs(d[0]), Math.abs(d[1]));
  const valueSlack = dMax * (run.v - run.u);
  let curvatureSign = null, certifiedSingleTurningPoint = false;
  if (secondDerivativeEnclosure) {
    const dd = secondDerivativeEnclosure(run.u, run.v, ctx);
    if (Array.isArray(dd) && dd[0] > 0) {
      curvatureSign = 1;
      certifiedSingleTurningPoint = true;
    } else if (Array.isArray(dd) && dd[1] < 0) {
      curvatureSign = -1;
      certifiedSingleTurningPoint = true;
    }
  }
  return {
    from: run.u,
    to: run.v,
    width: run.v - run.u,
    t,
    value: fv,
    valueSlack,
    locatedBy,
    kind: d[0] < 0 && d[1] > 0 ? value(run.u) > fv ? "minimum" : "maximum" : "unknown",
    curvatureSign,
    certifiedSingleTurningPoint,
    singleTurningPointAssumed: !certifiedSingleTurningPoint && locatedBy === "derivative-bisection",
    extremeValueEnclosure: [fv - valueSlack, fv + valueSlack]
  };
}
function bracketRoot(value, from, to, epsilon, minWidth, fFrom, fTo) {
  const rising = fTo > fFrom;
  const solve = (level) => {
    let lo2 = from, hi2 = to, flo = fFrom - level, fhi = fTo - level;
    if (flo === 0) return from;
    if (fhi === 0) return to;
    if (flo * fhi > 0) return null;
    for (let i = 0; i < 200 && hi2 - lo2 > minWidth; i += 1) {
      const m = midpoint(lo2, hi2, minWidth);
      if (!(m > lo2 && m < hi2)) break;
      const fm = value(m) - level;
      if (fm === 0) return m;
      if (fm < 0 === flo < 0) {
        lo2 = m;
        flo = fm;
      } else {
        hi2 = m;
        fhi = fm;
      }
    }
    return rising ? hi2 : lo2;
  };
  const centre = solve(0);
  const found = [solve(rising ? -epsilon : epsilon), centre, solve(rising ? epsilon : -epsilon)].filter((x) => x !== null);
  const lo = Math.min(...found), hi = Math.max(...found);
  return { lo, hi, width: hi - lo, centre };
}
function empiricalDerivativeEnclosure({ h, secondDerivativeBound, thirdDerivativeBound = 0, roundoff = 0, maxGridSpacing = Infinity, maxSamples = 2 }) {
  const cache = /* @__PURE__ */ new Map();
  return (u, v, ctx) => {
    const d = (t) => {
      if (cache.has(t)) return cache.get(t);
      const s = (ctx.value(t + h) - ctx.value(t - h)) / (2 * h);
      cache.set(t, s);
      return s;
    };
    const intervals = Math.max(1, Math.min(Math.max(1, maxSamples - 1), Math.ceil((v - u) / maxGridSpacing)));
    const step = (v - u) / intervals;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= intervals; i += 1) {
      const s = d(i === intervals ? v : u + i * step);
      lo = Math.min(lo, s);
      hi = Math.max(hi, s);
    }
    const pad = secondDerivativeBound * step / 2 + thirdDerivativeBound * h * h / 6 + roundoff / h;
    return [lo - pad, hi + pad];
  };
}
function empiricalSecondDerivativeEnclosure({ h, thirdDerivativeBound = 0, fourthDerivativeBound = 0, roundoff = 0, maxGridSpacing = Infinity, maxSamples = 2 }) {
  const cache = /* @__PURE__ */ new Map();
  return (u, v, ctx) => {
    const dd = (t) => {
      if (cache.has(t)) return cache.get(t);
      const s = (ctx.value(t + h) - 2 * ctx.value(t) + ctx.value(t - h)) / (h * h);
      cache.set(t, s);
      return s;
    };
    const intervals = Math.max(1, Math.min(Math.max(1, maxSamples - 1), Math.ceil((v - u) / maxGridSpacing)));
    const step = (v - u) / intervals;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= intervals; i += 1) {
      const s = dd(i === intervals ? v : u + i * step);
      lo = Math.min(lo, s);
      hi = Math.max(hi, s);
    }
    const pad = thirdDerivativeBound * step / 2 + fourthDerivativeBound * h * h / 12 + 4 * roundoff / (h * h);
    return [lo - pad, hi + pad];
  };
}

// ../../../../../examples/precision-alpha/src/core/search.mjs
var MS_PER_DAY = 864e5;
var J2000_JD = 2451545;
var SEARCH_DEFAULTS = Object.freeze({
  /** Subdivision floor, integer milliseconds of TT. */
  minWidthMs: 100,
  /** Central-difference half-step for the sampled derivatives, ms. */
  stepMs: 6e4,
  maxEvaluations: 6e4,
  /**
   * The sampled curvature/jerk maxima are multiplied by this before being
   * declared as bounds. It is a stated assumption, not a proof: a factor of 4
   * covers the grid missing a local extremum by a comfortable margin on the
   * slow bodies, and the report says so rather than implying otherwise.
   */
  boundInflation: 4,
  /** How many points to sample when estimating those maxima. */
  probeSamples: 97,
  /** Longest cell over which one sampled slope is reused, ms. */
  maxGridSpacingMs: 2 * MS_PER_DAY,
  maxSlopeSamples: 5,
  /** Absolute roundoff assumed on one longitude evaluation, degrees. */
  roundoffDeg: 1e-9
});
var SEARCH_CONTRACT = Object.freeze({
  kinds: Object.freeze({
    longitude: "apparent geocentric ecliptic longitude of one body reaching a fixed degree value \u2014 sign ingresses, and any other fixed level",
    aspect: "the difference of two bodies' apparent geocentric ecliptic longitudes reaching a fixed angle \u2014 conjunction at 0, opposition at 180, and the rest"
  }),
  notSupported: Object.freeze([
    "stations and retrograde turns: a root of the derivative, not of longitude, and it needs its own enclosure argument",
    "latitude, declination, distance and elongation events",
    "rise, set and transit: topocentric, and this reduction has no observer on the surface"
  ]),
  timeUnits: "integer milliseconds of TT past J2000 internally; TT days past J2000 and Julian Date TT on the way in and out"
});
var wrap180 = (d) => {
  let x = d % 360;
  if (x > 180) x -= 360;
  if (x <= -180) x += 360;
  return x;
};
function requireFinite(name, v) {
  if (!Number.isFinite(v)) fail("unsupported-option", `${name} must be a finite number`);
  return v;
}
function searchLongitudeEvent(reducer, spec = {}) {
  const {
    kind,
    body,
    other = null,
    targetDeg,
    fromTtDays,
    toTtDays,
    epsilonDeg,
    options = {},
    signal = null,
    robustness = true,
    ...tuning
  } = spec;
  for (const key of Object.keys(tuning)) {
    if (!(key in SEARCH_DEFAULTS)) fail("unsupported-option", `unknown search option ${key}`);
  }
  const p = { ...SEARCH_DEFAULTS, ...tuning };
  if (!(kind in SEARCH_CONTRACT.kinds)) {
    fail("unsupported-option", `search kind must be one of ${Object.keys(SEARCH_CONTRACT.kinds).join(", ")}`);
  }
  if (kind === "aspect" && typeof other !== "string") fail("unsupported-option", "kind 'aspect' needs a second body");
  if (kind === "longitude" && other !== null) fail("unsupported-option", "kind 'longitude' takes no second body");
  requireFinite("targetDeg", targetDeg);
  requireFinite("fromTtDays", fromTtDays);
  requireFinite("toTtDays", toTtDays);
  if (!(toTtDays > fromTtDays)) fail("unsupported-option", "toTtDays must be after fromTtDays");
  if (!Number.isFinite(epsilonDeg) || epsilonDeg < 0) {
    fail("unsupported-option", "epsilonDeg is required and must be finite and non-negative: the angular allowance has to be declared before the search, not chosen after seeing the margin");
  }
  for (const [k, v] of Object.entries(p)) {
    if (!Number.isFinite(v) || v <= 0) fail("unsupported-option", `${k} must be a positive finite number`);
  }
  if (!Number.isInteger(p.minWidthMs) || !Number.isInteger(p.stepMs)) {
    fail("unsupported-option", "minWidthMs and stepMs must be whole milliseconds");
  }
  const a = Math.round(fromTtDays * MS_PER_DAY);
  const b = Math.round(toTtDays * MS_PER_DAY);
  if (!(b - a > 2 * p.minWidthMs)) fail("unsupported-option", "the interval is not wider than the subdivision floor");
  let evaluations = 0;
  let exhausted = false;
  const checkSignal = () => {
    if (signal && signal.aborted) {
      throw new PrecisionError("cancelled", "the search was cancelled", { evaluations });
    }
  };
  const lonOf = (who, tMs) => reducer.apparent(who, tMs / MS_PER_DAY, options).lon;
  const f = (tMs) => {
    checkSignal();
    evaluations += 1;
    if (evaluations > p.maxEvaluations) {
      exhausted = true;
      throw new PrecisionError("budget-exhausted", `the evaluation budget of ${p.maxEvaluations} was spent`, { evaluations });
    }
    const primary = lonOf(body, tMs);
    const raw = kind === "aspect" ? primary - lonOf(other, tMs) - targetDeg : primary - targetDeg;
    return wrap180(raw);
  };
  const remaining = () => p.maxEvaluations - evaluations;
  const request = { kind, body, other, targetDeg, epsilonDeg };
  let branches;
  try {
    branches = scanBranches(f, a, b, p);
  } catch (error) {
    return failureReport(error, request, { a, b }, p, evaluations, "branch-scan");
  }
  if (branches.refused) {
    return {
      ...shell(request, { a, b }, p, evaluations),
      isolation: {
        verdict: "unresolved-interval",
        outcome: "refused",
        certified: false,
        complete: false,
        rootCount: null,
        possibleRootCounts: null,
        boundKind: "empirical",
        support: "unknown",
        exactArithmetic: false,
        meaning: "refused before any cell was closed",
        reason: branches.refused
      },
      unresolved: branches.ambiguous.map(([lo, hi]) => ({
        fromTtDays: lo / MS_PER_DAY,
        toTtDays: hi / MS_PER_DAY,
        why: "branch-assignment-ambiguous",
        turningPoint: null
      })),
      advice: "shorten the interval, or raise probeSamples so consecutive samples move the angle by well under a half turn"
    };
  }
  const verdicts = [];
  const declaredBounds = [];
  for (const [u, v] of branches.segments) {
    if (!(v - u > 2 * p.minWidthMs)) {
      verdicts.push({ segment: [u, v], skipped: "segment-shorter-than-the-subdivision-floor" });
      continue;
    }
    let probe;
    try {
      probe = probeDerivatives(f, u, v, p);
    } catch (error) {
      return failureReport(error, request, { a, b }, p, evaluations, "derivative-probe");
    }
    declaredBounds.push({ segmentTtDays: [u / MS_PER_DAY, v / MS_PER_DAY], ...probe.declared });
    let verdict2;
    try {
      verdict2 = classifyInterval({
        f,
        derivativeEnclosure: empiricalDerivativeEnclosure({
          h: p.stepMs,
          secondDerivativeBound: probe.d2Bound,
          thirdDerivativeBound: probe.d3Bound,
          roundoff: p.roundoffDeg,
          maxGridSpacing: p.maxGridSpacingMs,
          maxSamples: p.maxSlopeSamples
        }),
        secondDerivativeEnclosure: empiricalSecondDerivativeEnclosure({
          h: p.stepMs,
          thirdDerivativeBound: probe.d3Bound,
          fourthDerivativeBound: probe.d4Bound,
          roundoff: p.roundoffDeg,
          maxGridSpacing: p.maxGridSpacingMs,
          maxSamples: p.maxSlopeSamples
        }),
        a: u,
        b: v,
        epsilon: epsilonDeg,
        minWidth: p.minWidthMs,
        maxEvaluations: Math.max(16, remaining()),
        boundKind: "empirical",
        // Never true for an ephemeris-backed function: a Chebyshev sum in
        // double precision is not exact, so a tangency can never be certified.
        exactArithmetic: false,
        label: describe(request)
      });
    } catch (error) {
      return failureReport(error, request, { a, b }, p, evaluations, "classification");
    }
    verdicts.push({ segment: [u, v], verdict: verdict2 });
  }
  let gapFindings;
  try {
    gapFindings = branches.gaps.map((g) => checkGapExcluded(f, g, epsilonDeg, p));
  } catch (error) {
    return failureReport(error, request, { a, b }, p, evaluations, "gap-exclusion");
  }
  const merged = mergeVerdicts(verdicts, gapFindings);
  const candidates = merged.crossings.map((c) => ({
    ttDays: c.centre / MS_PER_DAY,
    jdTt: c.centre / MS_PER_DAY + J2000_JD,
    bracketTtDays: [c.lo / MS_PER_DAY, c.hi / MS_PER_DAY],
    bracketWidthSec: c.width / 1e3,
    direction: c.direction,
    transversal: c.transversal === true,
    atIntervalEdge: c.atIntervalEdge === true,
    ...c.bracketNote ? { bracketNote: c.bracketNote } : {}
  }));
  const verdict = merged.summary;
  let robustnessReport = null;
  if (robustness && candidates.length > 0) {
    try {
      robustnessReport = probeRobustness(f, candidates, p, epsilonDeg);
    } catch (error) {
      if (error instanceof PrecisionError && error.code === "cancelled") throw error;
      robustnessReport = { ran: false, why: error?.code ?? "probe-failed" };
    }
  }
  const base = shell(request, { a, b }, p, evaluations);
  return {
    ...base,
    budget: { ...base.budget, exhausted },
    candidates,
    isolation: {
      verdict: verdict.verdict,
      outcome: verdict.outcome,
      certified: verdict.certified === true,
      complete: verdict.complete === true,
      rootCount: verdict.rootCount,
      possibleRootCounts: verdict.possibleRootCounts,
      boundKind: "empirical",
      // D2's field, by its frozen name. 'proven' is reachable only by a
      // caller who supplies a closed-form derivative enclosure, which an
      // ephemeris cannot; 'unknown' is what a refusal before any enclosure
      // was applied reports.
      support: "empirical",
      exactArithmetic: false,
      meaning: verdict.certified ? MEANING_CERTIFIED : "NOT EXHAUSTIVE. Roots may exist that this run did not isolate; see `unresolved`.",
      declaredBounds,
      branches: {
        segments: branches.segments.map(([u, v]) => [u / MS_PER_DAY, v / MS_PER_DAY]),
        antipodeGaps: gapFindings.map((g) => ({
          fromTtDays: g.lo / MS_PER_DAY,
          toTtDays: g.hi / MS_PER_DAY,
          excluded: g.excluded,
          marginDeg: g.margin
        })),
        why: "the wrapped angle is discontinuous at the antipode of the target; each gap above is shown to hold no root rather than being passed over"
      }
    },
    robustness: robustnessReport,
    unresolved: merged.unresolved.map((r) => ({
      fromTtDays: r.from / MS_PER_DAY,
      toTtDays: r.to / MS_PER_DAY,
      why: r.why,
      turningPoint: r.turningPoint ? { ttDays: r.turningPoint.at / MS_PER_DAY, value: r.turningPoint.value, locatedBy: r.turningPoint.locatedBy } : null
    })),
    externalUncertainty: EXTERNAL_UNCERTAINTY,
    raw: verdicts.map((v) => v.verdict ?? { skipped: v.skipped, segment: v.segment })
  };
}
var MEANING_CERTIFIED = "complete RELATIVE TO the declared model and the declared derivative bounds below: given that f is this reduction and that its second and third derivatives stay inside the declared bounds, no further root of f exists in the processed interval at this epsilon. It is not a statement about the sky.";
function sumSets2(x, y) {
  if (x === null || y === null) return null;
  const out = /* @__PURE__ */ new Set();
  for (const i of x) for (const j of y) out.add(i + j);
  return [...out].sort((m, n) => m - n);
}
function mergeVerdicts(verdicts, gapFindings) {
  const crossings = [];
  const unresolved = [];
  let count = 0;
  let possible = [0];
  let allCertified = true;
  for (const v of verdicts) {
    if (v.skipped) {
      allCertified = false;
      possible = null;
      unresolved.push({ from: v.segment[0], to: v.segment[1], why: v.skipped, turningPoint: null });
      continue;
    }
    const r = v.verdict;
    crossings.push(...r.crossings ?? []);
    for (const o of r.openRegions ?? []) {
      unresolved.push({ from: o.from, to: o.to, why: o.why, turningPoint: o.turningPoint ?? null });
    }
    if (r.certified === true) {
      count += r.rootCount ?? 0;
      possible = sumSets2(possible, r.possibleRootCounts ?? [r.rootCount ?? 0]);
    } else {
      allCertified = false;
      possible = sumSets2(possible, r.possibleRootCounts);
    }
  }
  for (const g of gapFindings) {
    if (g.excluded) continue;
    allCertified = false;
    possible = null;
    unresolved.push({ from: g.lo, to: g.hi, why: "antipode-gap-not-shown-to-be-root-free", turningPoint: null });
  }
  crossings.sort((x, y) => x.lo - y.lo);
  if (allCertified) {
    return {
      crossings,
      unresolved,
      summary: {
        verdict: count === 0 ? "no-crossing" : count === 1 ? "crossing" : "multiple-crossings",
        outcome: "certified",
        certified: true,
        complete: true,
        rootCount: count,
        possibleRootCounts: [count]
      }
    };
  }
  return {
    crossings,
    unresolved,
    summary: {
      verdict: "unresolved-interval",
      outcome: "incomplete",
      certified: false,
      complete: false,
      rootCount: null,
      possibleRootCounts: possible
    }
  };
}
function scanBranches(f, a, b, p) {
  const AMBIGUOUS = 90;
  const MAX_DEPTH = 24;
  const n = Math.max(9, Math.round(p.probeSamples));
  let xs = [];
  for (let i = 0; i < n; i += 1) xs.push(Math.round(a + (b - a) * i / (n - 1)));
  xs = [...new Set(xs)].sort((u, v) => u - v);
  const ys = new Map(xs.map((x) => [x, f(x)]));
  for (let depth = 0; depth <= MAX_DEPTH; depth += 1) {
    const next = [];
    for (let i = 1; i < xs.length; i += 1) {
      const u = xs[i - 1];
      const v = xs[i];
      if (Math.abs(wrap180(ys.get(v) - ys.get(u))) <= AMBIGUOUS || v - u <= p.minWidthMs) continue;
      const m = Math.floor((u + v) / 2);
      if (m > u && m < v) next.push(m);
    }
    if (next.length === 0) break;
    if (depth === MAX_DEPTH) {
      const ambiguous = [];
      for (let i = 1; i < xs.length; i += 1) {
        if (Math.abs(wrap180(ys.get(xs[i]) - ys.get(xs[i - 1]))) > AMBIGUOUS) ambiguous.push([xs[i - 1], xs[i]]);
      }
      return { refused: "consecutive-samples-still-move-the-angle-by-more-than-a-quarter-turn", ambiguous, segments: [], gaps: [] };
    }
    for (const m of next) if (!ys.has(m)) ys.set(m, f(m));
    xs = [.../* @__PURE__ */ new Set([...xs, ...next])].sort((u, v) => u - v);
  }
  const gaps = [];
  for (let i = 1; i < xs.length; i += 1) {
    const u = xs[i - 1];
    const v = xs[i];
    if (Math.abs(ys.get(v) - ys.get(u)) <= 180) continue;
    let lo = u;
    let hi = v;
    let flo = ys.get(u);
    while (hi - lo > p.minWidthMs) {
      const m = Math.floor((lo + hi) / 2);
      if (m <= lo || m >= hi) break;
      const fm = f(m);
      if (Math.abs(fm - flo) > 180) hi = m;
      else {
        lo = m;
        flo = fm;
      }
    }
    gaps.push({ lo, hi });
  }
  const segments = [];
  let cursor = a;
  for (const g of gaps) {
    if (g.lo > cursor) segments.push([cursor, g.lo]);
    cursor = g.hi;
  }
  if (cursor < b) segments.push([cursor, b]);
  return { refused: null, ambiguous: [], segments, gaps };
}
function checkGapExcluded(f, gap, epsilonDeg, p) {
  const flo = Math.abs(f(gap.lo));
  const fhi = Math.abs(f(gap.hi));
  const maxDriftDeg = 60 * (gap.hi - gap.lo) / MS_PER_DAY;
  const margin = Math.min(flo, fhi) - maxDriftDeg - epsilonDeg;
  return { ...gap, valueAtEndsDeg: [flo, fhi], maxDriftDeg, margin, excluded: margin > 0 };
}
var EXTERNAL_UNCERTAINTY = Object.freeze({
  bounded: false,
  note: "The epsilon above is the allowance the CALLER declared. This search does not measure, and does not bound, how far this reduction sits from the sky, from another ephemeris, or from the true dynamics. Those are separate quantities and they are not folded in anywhere.",
  includedInEpsilon: false
});
function describe({ kind, body, other, targetDeg }) {
  return kind === "aspect" ? `${body}-${other} at ${targetDeg}deg` : `${body} at longitude ${targetDeg}deg`;
}
function shell(request, { a, b }, p, evaluations) {
  return {
    request: { ...request, description: describe(request) },
    interval: {
      fromTtDays: a / MS_PER_DAY,
      toTtDays: b / MS_PER_DAY,
      processedDays: (b - a) / MS_PER_DAY,
      units: SEARCH_CONTRACT.timeUnits,
      subdivisionFloorSec: p.minWidthMs / 1e3
    },
    candidates: [],
    robustness: null,
    unresolved: [],
    externalUncertainty: EXTERNAL_UNCERTAINTY,
    budget: { maxEvaluations: p.maxEvaluations, evaluations, exhausted: false },
    parameters: { ...p }
  };
}
function failureReport(error, request, bounds, p, evaluations, stage) {
  const budget = error instanceof PrecisionError && error.code === "budget-exhausted";
  if (error instanceof PrecisionError && !budget) throw error;
  const base = shell(request, bounds, p, evaluations);
  return {
    ...base,
    budget: { ...base.budget, exhausted: budget },
    isolation: {
      verdict: "unresolved-interval",
      outcome: "refused",
      certified: false,
      complete: false,
      rootCount: null,
      possibleRootCounts: null,
      boundKind: "empirical",
      support: "unknown",
      exactArithmetic: false,
      meaning: "refused: nothing was established, and nothing below should be read as a count",
      reason: budget ? "evaluation-budget-exhausted" : `${stage}-failed`,
      stage
    }
  };
}
function probeDerivatives(f, a, b, p) {
  const n = Math.max(9, Math.round(p.probeSamples));
  const h = p.stepMs;
  const xs = [];
  for (let i = 0; i < n; i += 1) xs.push(Math.round(a + (b - a) * i / (n - 1)));
  let d2 = 0;
  let d3 = 0;
  let d4 = 0;
  for (const x of xs) {
    const lo = Math.max(a, Math.min(b - 4 * h, x - 2 * h));
    const y = [0, 1, 2, 3, 4].map((k2) => f(lo + k2 * h));
    const s2 = Math.abs((y[1] - 2 * y[2] + y[3]) / (h * h));
    const s3 = Math.abs((-y[0] + 2 * y[1] - 2 * y[3] + y[4]) / (2 * h * h * h));
    const s4 = Math.abs((y[0] - 4 * y[1] + 6 * y[2] - 4 * y[3] + y[4]) / (h * h * h * h));
    if (s2 > d2) d2 = s2;
    if (s3 > d3) d3 = s3;
    if (s4 > d4) d4 = s4;
  }
  const k = p.boundInflation;
  return {
    d2Bound: d2 * k,
    d3Bound: d3 * k,
    d4Bound: d4 * k,
    declared: {
      basis: "sampled maxima of central differences on a uniform grid, multiplied by boundInflation",
      proven: false,
      gridSamples: n,
      stepMs: h,
      sampledMaxAbsSecondDerivativeDegPerMs2: d2,
      sampledMaxAbsThirdDerivativeDegPerMs3: d3,
      sampledMaxAbsFourthDerivativeDegPerMs4: d4,
      inflation: k,
      caveat: "A grid can miss an extremum between its samples. These are declared bounds, not proven ones, and every verdict resting on them is model-relative."
    }
  };
}
function probeRobustness(f, candidates, p, epsilonDeg) {
  if (epsilonDeg === 0) {
    return { ran: false, why: "epsilon-is-zero-so-there-is-no-displacement-to-probe" };
  }
  const out = [];
  for (const c of candidates) {
    const t = Math.round(c.ttDays * MS_PER_DAY);
    const h = p.stepMs;
    const slope = (f(t + h) - f(t - h)) / (2 * h);
    const shiftMs = slope === 0 ? Infinity : Math.abs(epsilonDeg / slope);
    out.push({
      ttDays: c.ttDays,
      localSlopeDegPerDay: slope * MS_PER_DAY,
      timeShiftForOneEpsilonSec: Number.isFinite(shiftMs) ? shiftMs / 1e3 : null,
      note: slope === 0 ? "the crossing sits at a turning point of f, where a level displacement does not move a root, it creates or destroys a pair; no timing shift is quoted" : "how far this crossing moves if the whole function is displaced by one epsilon. It is a LOCAL linear estimate at a transversal crossing and it is not a bound."
    });
  }
  return {
    ran: true,
    method: "local slope at each certified transversal crossing, against a +/- epsilon displacement of the level",
    perCandidate: out,
    notClaimed: "This says nothing about whether the count is right. A displacement that moves a crossing by a minute can still add or remove a pair elsewhere; that question belongs to `isolation` and `unresolved`."
  };
}

// ../../../../../examples/precision-alpha/src/index.mjs
var CONTAINER_MAGIC = Object.freeze({ unsupported: MAGIC_V1, supported: MAGIC_V2 });
var J2000_JD2 = 2451545;
var PrecisionRuntime = class {
  constructor(source, parsed, integrity) {
    this.#assertVerified(integrity);
    this.integrity = Object.freeze({ ...integrity });
    this.source = source;
    this.sourceKind = source.kind ?? "unknown";
    this.header = parsed.header;
    this.coverage = Object.freeze({
      startEtSecTdb: parsed.header.coverage.startEtSecTdb,
      stopEtSecTdb: parsed.header.coverage.stopEtSecTdb
    });
    this.bodies = Object.freeze(CONTRACT.bodies.slice());
    this.ephemeris = new Ephemeris(source, parsed);
    this.reducer = new Reducer(this.ephemeris);
    this.disposed = false;
  }
  #assertVerified(integrity) {
    if (!integrity.selfConsistent) {
      fail("corrupt", "the pack does not match the digest it carries");
    }
    if (integrity.matchesExpected === false) {
      fail("mutated", "the pack does not match the digest the caller supplied out of band");
    }
  }
  #live() {
    if (this.disposed) fail("disposed", "this runtime has been disposed");
  }
  /** Apparent geocentric place. `ttDays` is TT days past J2000. */
  apparent(body, ttDays, options) {
    this.#live();
    return this.reducer.apparent(body, ttDays, options);
  }
  /** Same, taking a Julian Date in TT. */
  apparentAtJdTt(body, jdTt, options) {
    return this.apparent(body, jdTt - J2000_JD2, options);
  }
  /** Bounded search for one longitude event. See `./core/search.mjs`. */
  search(spec) {
    this.#live();
    return searchLongitudeEvent(this.reducer, spec);
  }
  /**
   * Release the pack's buffers. Idempotent. Every later call throws a typed
   * `disposed` error rather than reading freed state.
   */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.ephemeris = null;
    this.reducer = null;
    if (typeof this.source?.release === "function") this.source.release();
    this.source = null;
  }
};
async function openPackFromBytes(bytes, { expectDigest = null } = {}) {
  return openPackFromSource(memorySource(bytes), { expectDigest });
}
async function openPackFromSource(source, { expectDigest = null } = {}) {
  if (expectDigest !== null && !/^[0-9a-f]{64}$/.test(expectDigest)) {
    if (typeof source?.release === "function") source.release();
    fail("unsupported-option", "expectDigest must be a 64-character lowercase hex SHA-256");
  }
  try {
    const parsed = parseContainer(source);
    const integrity = await verifyIntegrity(source, parsed, { expectDigest });
    if (typeof source.seal === "function") source.seal();
    return new PrecisionRuntime(source, parsed, integrity);
  } catch (error) {
    if (typeof source?.release === "function") source.release();
    throw error;
  }
}

// precision-runtime.src.mjs
var TT_MINUS_UTC_SEC = 69.184;
var J2000_UTC_MS = Date.UTC(2e3, 0, 1, 12, 0, 0);
var MS_PER_DAY2 = 864e5;
var ttDaysFromDate = (date) => (date.getTime() - J2000_UTC_MS) / MS_PER_DAY2 + TT_MINUS_UTC_SEC / MS_PER_DAY2;
var utcFromEt = (et) => new Date(J2000_UTC_MS + (et - TT_MINUS_UTC_SEC) * 1e3).toISOString();
async function open(buffer, { expectDigest = null } = {}) {
  const runtime = await openPackFromBytes(new Uint8Array(buffer), { expectDigest });
  const { startEtSecTdb, stopEtSecTdb } = runtime.coverage;
  const marginHours = 7;
  const info = () => ({
    coverage: {
      startUtc: utcFromEt(startEtSecTdb),
      stopUtc: utcFromEt(stopEtSecTdb),
      startEtSecTdb,
      stopEtSecTdb,
      marginHours
    },
    integrity: {
      digest: runtime.integrity.computedDigest,
      selfConsistent: runtime.integrity.selfConsistent,
      matchesExpectedDigest: runtime.integrity.matchesExpected,
      authenticity: runtime.integrity.authenticity
    },
    source: runtime.sourceKind,
    bodies: runtime.bodies,
    systemBarycentresNotCentres: BARYCENTRE_NOT_CENTRE,
    pack: {
      format: runtime.header.format,
      formatVersion: runtime.header.formatVersion,
      candidate: runtime.header.candidate ?? null,
      inputFile: runtime.header.input?.file ?? null,
      inputSha256: runtime.header.input?.sha256 ?? null
    }
  });
  const assumptions = () => ({
    reduction: "corrected: IAU 2000B nutation (77 terms), IAU 2006 precession, IAU 2000 frame bias, TDB-TT, light-time iteration, solar deflection, relativistic aberration",
    clock: `TT = UTC + ${TT_MINUS_UTC_SEC} s, a stated constant. Delta-T is not modelled here, so instants far from the present carry a clock error this demonstration does not correct.`,
    observer: "geocentre: no topocentric parallax, no diurnal aberration, no refraction",
    barycentres: `returned for ${BARYCENTRE_NOT_CENTRE.join(", ")} \u2014 these are planetary-system barycentres, not body centres`,
    corrections: CONTRACT.corrections,
    notModelled: CONTRACT.notModelled,
    searchKinds: Object.keys(SEARCH_CONTRACT.kinds),
    integrityAuthenticity: runtime.integrity.authenticity
  });
  return {
    info,
    assumptions,
    longitude: (body, date) => runtime.apparent(body, ttDaysFromDate(date), CORRECTED).lon,
    apparent: (body, date) => runtime.apparent(body, ttDaysFromDate(date), CORRECTED),
    /** Exposed so the driver can compare bit-for-bit with the Node run. */
    apparentAtTtDays: (body, ttDays) => runtime.apparent(body, ttDays, CORRECTED),
    search: (spec) => runtime.search({ ...spec, options: CORRECTED }),
    dispose: () => runtime.dispose()
  };
}
export {
  open
};
