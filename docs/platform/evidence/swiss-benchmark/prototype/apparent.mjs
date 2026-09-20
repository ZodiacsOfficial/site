/**
 * The experimental higher-precision position backend.
 *
 * The isolated change under test is ONE thing: where the underlying positions
 * come from. Everything downstream — light-time, aberration, the rotation into
 * the true ecliptic of date — is held fixed and, where possible, reuses the
 * same astronomy-engine machinery the production core already uses. That is
 * deliberate: if the reduction also changed, a measured difference could not be
 * attributed to the series.
 *
 * Positions come from a JPL DE kernel (public domain, US Government work).
 * Nothing here is derived from Swiss Ephemeris code, data or output; Swiss is
 * used only afterwards, as a measuring instrument.
 *
 * This is an experiment. It is not wired into the site, the default bundle,
 * the schemas or any saved record.
 */
import * as A from 'astronomy-engine';
import { Spk, NAIF } from './spk.mjs';

const AU_KM = 149597870.700;
/** Light travel time for one AU, seconds (IAU 2009). */
const LIGHT_TIME_AU = 499.004783836;
const DAY = 86400;

/** Barycentre id used for each body's DE segment, and whether a sub-segment applies. */
const ROUTE = {
  Sun: [[NAIF.SUN, NAIF.SSB]],
  Mercury: [[NAIF.MERCURY_BARY, NAIF.SSB]],
  Venus: [[NAIF.VENUS_BARY, NAIF.SSB]],
  Mars: [[NAIF.MARS_BARY, NAIF.SSB]],
  Jupiter: [[NAIF.JUPITER_BARY, NAIF.SSB]],
  Saturn: [[NAIF.SATURN_BARY, NAIF.SSB]],
  Uranus: [[NAIF.URANUS_BARY, NAIF.SSB]],
  Neptune: [[NAIF.NEPTUNE_BARY, NAIF.SSB]],
  Pluto: [[NAIF.PLUTO_BARY, NAIF.SSB]],
  // The Moon is given relative to the Earth-Moon barycentre, which is itself
  // given relative to the solar-system barycentre.
  Moon: [[NAIF.EMB, NAIF.SSB], [NAIF.MOON, NAIF.EMB]],
  Earth: [[NAIF.EMB, NAIF.SSB], [NAIF.EARTH, NAIF.EMB]],
};

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (v) => Math.hypot(v[0], v[1], v[2]);

export class DeBackend {
  constructor(kernelPath) {
    this.spk = new Spk(kernelPath);
    this.cache = new Map();
  }

  #seg(target, center) {
    const key = `${target}/${center}`;
    if (!this.cache.has(key)) this.cache.set(key, this.spk.segment(target, center));
    return this.cache.get(key);
  }

  /** Barycentric position of a body, km, J2000 equatorial, at TDB seconds past J2000. */
  bary(body, et) {
    let v = [0, 0, 0];
    for (const [target, center] of ROUTE[body]) v = add(v, this.spk.position(this.#seg(target, center), et));
    return v;
  }

  /** Central difference velocity, km/s. Used only for aberration. */
  baryVel(body, et, h = 60) {
    const a = this.bary(body, et - h);
    const b = this.bary(body, et + h);
    return [(b[0] - a[0]) / (2 * h), (b[1] - a[1]) / (2 * h), (b[2] - a[2]) / (2 * h)];
  }

  /**
   * Apparent geocentric ecliptic longitude of date, degrees, for a UTC instant.
   *
   * Steps, in the order the reduction requires them:
   *   1. the observer's barycentric position at the time of observation;
   *   2. light-time iteration, so the body is taken from where it WAS when the
   *      light left it, not where it is now;
   *   3. annual aberration from the observer's barycentric velocity;
   *   4. rotation from J2000 equatorial into the TRUE ecliptic of date, using
   *      the same astronomy-engine rotation the production core relies on.
   *
   * Gravitational deflection is NOT applied. That is a stated convention of
   * this prototype, not an oversight, and it bounds what the numbers can claim:
   * deflection reaches ~1.7 arcsec only at the solar limb and is well under
   * 0.05 arcsec away from the Sun.
   */
  apparentEclipticLongitude(body, utcDate, deltaTSeconds = null) {
    let time = A.MakeTime(utcDate);
    // Delta-T is an OBSERVED, then extrapolated, quantity: UT1 depends on the
    // Earth's rotation, which is not predictable. Two libraries extrapolating
    // it past the observed record legitimately disagree — at 2100 the Swiss and
    // astronomy-engine models differ by ~109 s, which alone moves the Moon by
    // ~60 arcsec. That is a time-scale convention difference, not an ephemeris
    // error, and comparing series without matching it measures the wrong thing.
    // Passing deltaTSeconds pins TT to the reference's own value so that what
    // remains is attributable to the positions.
    if (deltaTSeconds !== null) {
      const pinned = A.MakeTime(utcDate);
      pinned.tt = pinned.ut + deltaTSeconds / DAY;
      time = pinned;
    }
    const et = time.tt * DAY;                    // TT seconds past J2000; TDB-TT < 2 ms, negligible here
    const observer = this.bary('Earth', et);
    const observerVel = this.baryVel('Earth', et);

    // Light-time iteration.
    let tau = 0;
    let geo = sub(this.bary(body, et), observer);
    for (let i = 0; i < 5; i += 1) {
      const next = (norm(geo) / AU_KM) * LIGHT_TIME_AU;
      if (Math.abs(next - tau) < 1e-9) { tau = next; break; }
      tau = next;
      geo = sub(this.bary(body, et - tau), observer);
    }

    // Annual aberration, first order in v/c, which is sufficient at this scale.
    const cKmS = AU_KM / LIGHT_TIME_AU;
    const dist = norm(geo);
    const aberrated = [
      geo[0] + (observerVel[0] * dist) / cKmS,
      geo[1] + (observerVel[1] * dist) / cKmS,
      geo[2] + (observerVel[2] * dist) / cKmS,
    ];

    // J2000 equatorial -> true ecliptic of date, via the production core's own rotation.
    const rot = A.Rotation_EQJ_ECT(time);
    const vec = new A.Vector(aberrated[0] / AU_KM, aberrated[1] / AU_KM, aberrated[2] / AU_KM, time);
    const ect = A.RotateVector(rot, vec);
    let lon = (Math.atan2(ect.y, ect.x) * 180) / Math.PI;
    if (lon < 0) lon += 360;
    return lon;
  }
}
