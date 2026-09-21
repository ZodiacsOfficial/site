/**
 * The pack container, shared by the compiler and the runtime.
 *
 *   bytes 0..7    magic "ZODEPH01"
 *   bytes 8..11   uint32 header JSON length
 *   bytes 12..15  uint32 payload offset (16 + header, rounded up to 16)
 *   header JSON, utf-8, zero padded to the payload offset
 *   payload: one block per body, in header order, each 16-byte aligned
 *
 * Every body block is RECORD-MAJOR: one evaluation touches one contiguous run
 * of bytes. Plane-major storage would compress identically and read worse.
 */
export const MAGIC = 'ZODEPH01';
export const ALIGN = 16;
export const MAXINT = { 0: 0, 1: 127, 2: 32767, 3: 8388607, 4: 2147483647, 5: 549755813887, 6: 140737488355327 };
/** Widths are laid out in this order inside a record so the 4-byte reads stay 4-aligned. */
export const WIDTH_ORDER = [8, 4, 6, 5, 3, 2, 1, 0];
export const align = (n, a = ALIGN) => (n % a === 0 ? n : n + (a - (n % a)));

/** Smallest field width in bytes that holds integers in [-half, half]. 8 = float64 escape. */
export function widthForHalf(half) {
  if (half === 0) return 0;
  if (half <= MAXINT[1]) return 1;
  if (half <= MAXINT[2]) return 2;
  if (half <= MAXINT[3]) return 3;
  if (half <= MAXINT[4]) return 4;
  if (half <= MAXINT[5]) return 5;
  if (half <= MAXINT[6]) return 6;
  return 8;                 // beyond 2^47 the integer would not be exact in float64 anyway
}

export function readField(dv, base, w) {
  switch (w) {
    case 0: return 0;
    case 1: return dv.getInt8(base);
    case 2: return dv.getInt16(base, true);
    case 3: {
      const lo = dv.getUint16(base, true); const hi = dv.getInt8(base + 2);
      return hi * 65536 + lo;
    }
    case 4: return dv.getInt32(base, true);
    case 5: return dv.getInt8(base + 4) * 4294967296 + dv.getUint32(base, true);
    case 6: return dv.getInt16(base + 4, true) * 4294967296 + dv.getUint32(base, true);
    default: return dv.getFloat64(base, true);
  }
}

export function writeField(dv, base, w, v) {
  switch (w) {
    case 0: return;
    case 1: dv.setInt8(base, v); return;
    case 2: dv.setInt16(base, v, true); return;
    case 3: {
      const hi = Math.floor(v / 65536);
      dv.setUint16(base, v - hi * 65536, true); dv.setInt8(base + 2, hi); return;
    }
    case 4: dv.setInt32(base, v, true); return;
    case 5: {
      const hi = Math.floor(v / 4294967296);
      dv.setUint32(base, v - hi * 4294967296, true); dv.setInt8(base + 4, hi); return;
    }
    case 6: {
      const hi = Math.floor(v / 4294967296);
      dv.setUint32(base, v - hi * 4294967296, true); dv.setInt16(base + 4, hi, true); return;
    }
    default: dv.setFloat64(base, v, true);
  }
}
