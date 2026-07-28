/**
 * Projection maths for the ecliptic seen in three dimensions.
 *
 * A birth chart is a direction map: it records where each body sat as seen
 * from one point on Earth, and the flat wheel draws only half of that —
 * ecliptic longitude. The other half, ecliptic latitude, is computed for
 * every chart and then discarded at draw time. Over 1930–2030 that discards
 * up to 17.7° for Pluto, 8.0° for Venus and 5.3° for the Moon, while the Sun
 * stays at exactly 0° because the Sun is what defines the plane.
 *
 * Bodies are placed on a unit sphere, not at true distance. Distance would
 * put Pluto some fifteen thousand times further out than the Moon and show
 * nothing; direction is also the only thing the chart itself claims to
 * measure. Callers should say so rather than implying a scale model.
 *
 * Pure geometry — no ephemeris import, so this module stays outside the
 * astronomy-engine bundle boundary.
 */

export interface Vec3 { x: number; y: number; z: number }

export interface Projected {
  x: number;
  y: number;
  /** Larger is nearer the viewer; for painter's-algorithm ordering. */
  depth: number;
}

export interface EclipticPoint { lon: number; lat: number }

const RAD = Math.PI / 180;

/** Mean inclination of the Moon's orbit to the ecliptic, degrees. */
export const MOON_INCLINATION = 5.145;

/**
 * Greatest Sun–node elongation that still admits a solar eclipse. Beyond it
 * the new Moon passes too far above or below the ecliptic to cover the Sun.
 */
export const SOLAR_ECLIPSE_LIMIT = 18.5;

/** Ecliptic direction to a unit vector; +z is ecliptic north. */
export function eclipticToVec(lon: number, lat: number): Vec3 {
  const l = lon * RAD;
  const b = lat * RAD;
  const cosB = Math.cos(b);
  return { x: cosB * Math.cos(l), y: cosB * Math.sin(l), z: Math.sin(b) };
}

/**
 * Spin about the ecliptic pole, then tilt the pole toward the viewer.
 *
 * tilt 0 looks straight down the pole and recovers the familiar flat wheel
 * exactly: latitude becomes pure depth and every body sits on the ring.
 * tilt 90 is edge-on, where latitude reads as height and nothing else.
 */
export function orient(v: Vec3, spinDeg: number, tiltDeg: number): Vec3 {
  const s = spinDeg * RAD;
  const t = tiltDeg * RAD;

  const x1 = v.x * Math.cos(s) - v.y * Math.sin(s);
  const y1 = v.x * Math.sin(s) + v.y * Math.cos(s);
  const z1 = v.z;

  return {
    x: x1,
    y: y1 * Math.cos(t) + z1 * Math.sin(t),
    z: -y1 * Math.sin(t) + z1 * Math.cos(t),
  };
}

/** Orthographic projection into SVG coordinates, where y grows downward. */
export function project(v: Vec3, cx: number, cy: number, radius: number): Projected {
  return { x: cx + radius * v.x, y: cy - radius * v.y, depth: v.z };
}

/** Direction straight to screen, in one step. */
export function place(
  lon: number,
  lat: number,
  spin: number,
  tilt: number,
  cx: number,
  cy: number,
  radius: number,
): Projected {
  return project(orient(eclipticToVec(lon, lat), spin, tilt), cx, cy, radius);
}

/**
 * A great circle inclined to the ecliptic, ascending at `nodeLon` — the
 * Moon's path, when handed the chart's own North Node longitude.
 *
 * Parametrised by argument of latitude u, the angle travelled from the
 * ascending node, so u = 0 and u = 180 land exactly on the nodes and
 * |latitude| peaks at the inclination.
 */
export function inclinedCircle(
  nodeLon: number,
  inclination = MOON_INCLINATION,
  stepDeg = 4,
): EclipticPoint[] {
  const i = inclination * RAD;
  const points: EclipticPoint[] = [];
  for (let u = 0; u <= 360; u += stepDeg) {
    const ur = u * RAD;
    const lat = Math.asin(Math.sin(i) * Math.sin(ur)) / RAD;
    const lon = nodeLon + Math.atan2(Math.cos(i) * Math.sin(ur), Math.cos(ur)) / RAD;
    points.push({ lon: norm360(lon), lat });
  }
  return points;
}

export function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Shortest separation between two longitudes, 0–180. */
export function separation(a: number, b: number): number {
  const d = Math.abs(norm360(a) - norm360(b)) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * How close the Sun sits to the line of nodes, and whether that is close
 * enough for an eclipse season. Eclipses happen at the nodes and nowhere
 * else, which is the one fact the flat wheel can never show.
 */
export function eclipseProximity(sunLon: number, nodeLon: number): {
  /** Degrees from the nearer node. */
  degrees: number;
  possible: boolean;
} {
  const degrees = Math.min(
    separation(sunLon, nodeLon),
    separation(sunLon, nodeLon + 180),
  );
  return { degrees, possible: degrees <= SOLAR_ECLIPSE_LIMIT };
}
