/**
 * Dependency-free low-precision Sun/Moon — the homepage's entire
 * astronomy budget. Meeus-style truncated series:
 *   Sun ±0.01°, Moon ±0.3° — plenty for a ticker and a moon-phase dial,
 *   never used for charts (the calculators load the full engine).
 */

const DEG = Math.PI / 180;
const norm = (d: number) => ((d % 360) + 360) % 360;

/** Days since J2000.0 (2000-01-01T12:00Z) for a JS Date. */
export function daysSinceJ2000(date: Date): number {
  return (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400_000;
}

/** Apparent-ish geocentric solar ecliptic longitude, degrees. */
export function sunLongitude(date: Date): number {
  const n = daysSinceJ2000(date);
  const L = 280.460 + 0.9856474 * n;
  const g = (357.528 + 0.9856003 * n) * DEG;
  return norm(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
}

/** Low-precision geocentric lunar ecliptic longitude, degrees (±0.3°). */
export function moonLongitude(date: Date): number {
  const n = daysSinceJ2000(date);
  const Lp = 218.316 + 13.176396 * n;      // mean longitude
  const M = (134.963 + 13.064993 * n) * DEG;   // mean anomaly
  const Ms = (357.528 + 0.9856003 * n) * DEG;  // solar mean anomaly
  const D = (297.850 + 12.190749 * n) * DEG;   // mean elongation
  const F = (93.272 + 13.229350 * n) * DEG;    // argument of latitude
  const lon =
    Lp
    + 6.289 * Math.sin(M)
    + 1.274 * Math.sin(2 * D - M)
    + 0.658 * Math.sin(2 * D)
    + 0.214 * Math.sin(2 * M)
    - 0.186 * Math.sin(Ms)
    - 0.114 * Math.sin(2 * F);
  return norm(lon);
}

/** Phase angle 0–360 (0 = new, 180 = full). */
export function moonPhaseAngle(date: Date): number {
  return norm(moonLongitude(date) - sunLongitude(date));
}

/** Illuminated fraction 0–1 (from the phase angle — UI precision). */
export function moonIllumination(date: Date): number {
  return (1 - Math.cos(moonPhaseAngle(date) * DEG)) / 2;
}

export type MoonPhaseName =
  | 'New Moon' | 'Waxing Crescent' | 'First Quarter' | 'Waxing Gibbous'
  | 'Full Moon' | 'Waning Gibbous' | 'Last Quarter' | 'Waning Crescent';

export function moonPhaseName(date: Date): MoonPhaseName {
  const a = moonPhaseAngle(date);
  if (a < 22.5 || a >= 337.5) return 'New Moon';
  if (a < 67.5) return 'Waxing Crescent';
  if (a < 112.5) return 'First Quarter';
  if (a < 157.5) return 'Waxing Gibbous';
  if (a < 202.5) return 'Full Moon';
  if (a < 247.5) return 'Waning Gibbous';
  if (a < 292.5) return 'Last Quarter';
  return 'Waning Crescent';
}
