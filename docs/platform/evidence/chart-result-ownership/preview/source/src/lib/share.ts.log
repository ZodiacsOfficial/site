/**
 * Share-link codec: a chart's birth input, encoded into a URL *fragment*.
 * Fragments never reach a server, so the on-device privacy story survives
 * sharing — the link itself carries the data, and only the person holding
 * it can read it. Encoding is `1.` + base64url(compact JSON); the decoder
 * trusts nothing and returns null on any malformed, out-of-range, or
 * future-versioned token rather than throwing into an island.
 */
import type { HouseSystem } from './engine/types';
import { parseCivilDate, parseCivilTime } from './time/civil-date';
import { TECHNICAL_OFFSET_LOCALE } from './time/technical-locales';

export interface ShareChartInput {
  date: string;            // YYYY-MM-DD
  time: string | null;     // HH:MM, null when unknown
  timeKnown: boolean;
  lat: number;
  lon: number;
  tz: string;              // IANA zone
  name?: string;           // person label, ≤24 chars
  place?: string;          // birthplace label, ≤40 chars
  houseSystem: HouseSystem;
}

const VERSION_PREFIX = '1.';
export const NAME_MAX = 24;
const PLACE_MAX = 40;

/** Wire shape — single-letter keys keep links short. */
interface Wire {
  d: string;    // date
  t?: string;   // time; absent ⇒ time unknown
  z: string;    // tz
  la: number;   // lat, 4dp
  lo: number;   // lon, 4dp
  n?: string;   // name
  p?: string;   // place label
  h?: string;   // house system, only when not 'whole'
}

const isControlChar = (code: number) => code < 32 || code === 127;

function clean(s: string, max: number): string {
  let kept = '';
  for (const ch of s) {
    kept += isControlChar(ch.charCodeAt(0)) ? ' ' : ch;
  }
  return kept.replace(/\s+/g, ' ').trim().slice(0, max);
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return null;
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const bin = atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '='));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export function encodeChartLink(input: ShareChartInput): string {
  const wire: Wire = {
    d: input.date,
    z: input.tz,
    la: Math.round(input.lat * 1e4) / 1e4,
    lo: Math.round(input.lon * 1e4) / 1e4,
  };
  if (input.timeKnown && input.time) wire.t = input.time;
  const name = input.name ? clean(input.name, NAME_MAX) : '';
  if (name) wire.n = name;
  const place = input.place ? clean(input.place, PLACE_MAX) : '';
  if (place) wire.p = place;
  if (input.houseSystem !== 'whole') wire.h = input.houseSystem;
  return VERSION_PREFIX + toBase64Url(new TextEncoder().encode(JSON.stringify(wire)));
}

function validTz(tz: string): boolean {
  if (typeof tz !== 'string' || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat(TECHNICAL_OFFSET_LOCALE, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function decodeChartLink(token: string): ShareChartInput | null {
  if (typeof token !== 'string' || !token.startsWith(VERSION_PREFIX)) return null;
  const bytes = fromBase64Url(token.slice(VERSION_PREFIX.length));
  if (!bytes) return null;

  let wire: unknown;
  try {
    wire = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  if (typeof wire !== 'object' || wire === null || Array.isArray(wire)) return null;
  const w = wire as Record<string, unknown>;

  if (typeof w.d !== 'string') return null;
  const date = parseCivilDate(w.d);
  // Same window the calculator form accepts.
  if (!date || date.year < 1800 || date.year > 2199) return null;

  let time: string | null = null;
  if (w.t !== undefined) {
    if (typeof w.t !== 'string' || !parseCivilTime(w.t)) return null;
    time = w.t;
  }

  if (typeof w.z !== 'string' || !validTz(w.z)) return null;
  if (typeof w.la !== 'number' || !Number.isFinite(w.la) || Math.abs(w.la) > 90) return null;
  if (typeof w.lo !== 'number' || !Number.isFinite(w.lo) || Math.abs(w.lo) > 180) return null;

  let houseSystem: HouseSystem = 'whole';
  if (w.h !== undefined) {
    if (w.h !== 'placidus') return null;
    houseSystem = 'placidus';
  }

  const out: ShareChartInput = {
    date: w.d,
    time,
    timeKnown: time !== null,
    lat: w.la,
    lon: w.lo,
    tz: w.z,
    houseSystem,
  };
  if (typeof w.n === 'string' && clean(w.n, NAME_MAX)) out.name = clean(w.n, NAME_MAX);
  if (typeof w.p === 'string' && clean(w.p, PLACE_MAX)) out.place = clean(w.p, PLACE_MAX);
  return out;
}
