/** Shared chart-engine types. Pure data — no ephemeris imports here. */

export { ENGINE_VERSION } from '@zodiacs/engine/internal/math';

export type BodyName =
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars'
  | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto'
  | 'North Node' | 'South Node';

export type HouseSystem = 'whole' | 'placidus';

export type ChartFlag = 'dst-gap' | 'dst-fold' | 'lmt' | 'no-time' | 'polar-fallback';

export interface ChartInput {
  /** Resolved UTC instant of birth. */
  utc: Date;
  /** Geographic coordinates; omit when place is unknown. */
  latitude?: number;
  longitude?: number;
  houseSystem: HouseSystem;
  /** True when the birth time is known; false means a caller-supplied reference instant and no angles. */
  timeKnown: boolean;
  flags?: ChartFlag[];
}

export interface BodyPosition {
  body: BodyName;
  /** Tropical ecliptic longitude of date, degrees 0–360. */
  lon: number;
  /** Ecliptic latitude, degrees (0 for the nodes). */
  lat: number;
  /** Longitude speed, degrees/day (negative = retrograde). */
  speed: number;
  retrograde: boolean;
}

export interface Angles {
  asc: number;
  mc: number;
  dsc: number;
  ic: number;
}

export interface Houses {
  system: HouseSystem;
  /** Cusp longitudes, index 0 = 1st house. */
  cusps: number[];
}

export type AspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

export interface Aspect {
  a: BodyName;
  b: BodyName;
  type: AspectType;
  /** Deviation from exact, degrees (unsigned). */
  orb: number;
  /** True when the aspect is still tightening. */
  applying: boolean;
}

export interface Chart {
  input: ChartInput;
  bodies: BodyPosition[];
  /** Present only when time + place are known. */
  angles: Angles | null;
  houses: Houses | null;
  aspects: Aspect[];
  flags: ChartFlag[];
  engineVersion: string;
  /** Caller-verified Moon signs across an unknown-time local birth date.
   * One sign is settled; two are alternatives; absent with no angles is unverified.
   * Presentation metadata only: never changes positions or the share-token wire format. */
  moonSignCandidates?: readonly string[];
}
