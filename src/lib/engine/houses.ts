/**
 * Angles + house cusps. Pure spherical trigonometry — no ephemeris
 * imports; the caller (engine/full.ts) supplies Greenwich apparent
 * sidereal time. Conventions: latitudes +N, longitudes +E, all angles
 * in degrees, results normalized to [0, 360).
 */
import type { Angles, Houses, HouseSystem } from './types';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
export const norm = (d: number) => ((d % 360) + 360) % 360;

/** Mean obliquity of the ecliptic (IAU 2006), degrees. T = Julian centuries TT since J2000. */
export function meanObliquity(jdCenturies: number): number {
  const t = jdCenturies;
  const arcsec =
    84381.406 - 46.836769 * t - 0.0001831 * t * t + 0.00200340 * t ** 3
    - 0.000000576 * t ** 4 - 0.0000000434 * t ** 5;
  return arcsec / 3600;
}

/** Ecliptic longitude of the ecliptic point with right ascension `ra`. */
function eclLonOfRa(ra: number, eps: number): number {
  return norm(Math.atan2(Math.sin(ra * DEG), Math.cos(ra * DEG) * Math.cos(eps * DEG)) * RAD);
}

/** Declination of the ecliptic point at ecliptic longitude `lon`. */
function declOfLon(lon: number, eps: number): number {
  return Math.asin(Math.sin(eps * DEG) * Math.sin(lon * DEG)) * RAD;
}

export interface AngleInput {
  /** Greenwich apparent sidereal time, hours. */
  gastHours: number;
  latitude: number;
  /** East-positive longitude. */
  longitude: number;
  /** True obliquity of date, degrees. */
  obliquity: number;
}

/** Right ascension of the local meridian (RAMC), degrees. */
export function ramcOf({ gastHours, longitude }: Pick<AngleInput, 'gastHours' | 'longitude'>): number {
  return norm(gastHours * 15 + longitude);
}

export function computeAngles(input: AngleInput): Angles {
  const { latitude, obliquity } = input;
  const ramc = ramcOf(input);

  // Midheaven: ecliptic point on the meridian.
  const mc = eclLonOfRa(ramc, obliquity);

  // Ascendant (standard closed form, correct quadrant via atan2).
  const ra = ramc * DEG;
  const eps = obliquity * DEG;
  const phi = latitude * DEG;
  const asc = norm(
    Math.atan2(
      Math.cos(ra),
      -(Math.sin(ra) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))
    ) * RAD
  );

  return { asc, mc, dsc: norm(asc + 180), ic: norm(mc + 180) };
}

export function wholeSignCusps(asc: number): number[] {
  const first = Math.floor(norm(asc) / 30) * 30;
  return Array.from({ length: 12 }, (_, i) => norm(first + i * 30));
}

/**
 * Placidus intermediate cusps by iterative semi-arc trisection.
 * From hour-angle geometry (h = RAMC − RA, rising at h = −SAd):
 *   cusp 11: |h| = SAd/3   → RA = RAMC + 30 + AD/3
 *   cusp 12: |h| = 2SAd/3  → RA = RAMC + 60 + 2AD/3
 *   cusp  2: |h| = SAd + SAn/3  → RA = RAMC + 120 + 2AD/3
 *   cusp  3: |h| = SAd + 2SAn/3 → RA = RAMC + 150 + AD/3
 * where AD = asin(tanφ · tanδ) is the ascensional difference of the
 * cusp point itself — hence the iteration.
 *
 * Undefined inside the polar circles: returns null above |66°| and the
 * caller falls back to whole sign with a notice.
 */
export function placidusCusps(input: AngleInput, angles: Angles): number[] | null {
  const { latitude, obliquity } = input;
  if (Math.abs(latitude) > 66) return null;

  const ramc = ramcOf(input);
  const phi = latitude * DEG;

  function iterate(offset: number, k: number): number | null {
    let ra = ramc + offset;
    for (let i = 0; i < 24; i += 1) {
      const lon = eclLonOfRa(norm(ra), obliquity);
      const dec = declOfLon(lon, obliquity);
      const x = Math.tan(phi) * Math.tan(dec * DEG);
      if (Math.abs(x) >= 1) return null; // circumpolar degeneracy
      const ad = Math.asin(x) * RAD;
      const next = ramc + offset + k * ad;
      if (Math.abs(norm(next - ra + 180) - 180) < 1e-7) { ra = next; break; }
      ra = next;
    }
    return eclLonOfRa(norm(ra), obliquity);
  }

  const c11 = iterate(30, 1 / 3);
  const c12 = iterate(60, 2 / 3);
  const c2 = iterate(120, 2 / 3);
  const c3 = iterate(150, 1 / 3);
  if (c11 === null || c12 === null || c2 === null || c3 === null) return null;

  const cusps = new Array<number>(12);
  cusps[0] = angles.asc;
  cusps[1] = c2;
  cusps[2] = c3;
  cusps[3] = angles.ic;
  cusps[4] = norm(c11 + 180);
  cusps[5] = norm(c12 + 180);
  cusps[6] = angles.dsc;
  cusps[7] = norm(c2 + 180);
  cusps[8] = norm(c3 + 180);
  cusps[9] = angles.mc;
  cusps[10] = c11;
  cusps[11] = c12;
  return cusps;
}

export function computeHouses(
  system: HouseSystem,
  input: AngleInput,
  angles: Angles
): { houses: Houses; fellBack: boolean } {
  if (system === 'placidus') {
    const cusps = placidusCusps(input, angles);
    if (cusps) return { houses: { system: 'placidus', cusps }, fellBack: false };
    return { houses: { system: 'whole', cusps: wholeSignCusps(angles.asc) }, fellBack: true };
  }
  return { houses: { system: 'whole', cusps: wholeSignCusps(angles.asc) }, fellBack: false };
}

/** House index (1–12) of an ecliptic longitude given cusp longitudes. */
export function houseOf(lon: number, cusps: number[]): number {
  for (let i = 0; i < 12; i += 1) {
    const a = cusps[i];
    const b = cusps[(i + 1) % 12];
    const span = norm(b - a);
    const off = norm(lon - a);
    if (off < span || span === 0) return i + 1;
  }
  return 12;
}
