/**
 * The instrumented reduction.
 *
 * Same skeleton as the existing prototype (DE positions, light-time,
 * aberration, rotation into the ecliptic of date) but every modelling choice
 * is an explicit switch, so each one can be turned on alone and MEASURED.
 * A toggle that is never exercised on the geometry where it bites proves
 * nothing, so the switches are designed to be swept, not defaulted.
 *
 * Positions: JPL DE kernel (US Government work, public domain).
 * Nutation/precession/bias: published IAU series (see src/nutation.mjs).
 * Nothing is derived from Swiss Ephemeris code, data or output.
 */
import { Spk2, NAIF } from './spk2.mjs';
import { npbMatrix, apply, equToEcl, eclipticLonLatDeg } from './frames.mjs';

const AU_KM = 149597870.700;
const LIGHT_TIME_AU = 499.004783836;          // seconds per au, IAU 2009
const C_KM_S = AU_KM / LIGHT_TIME_AU;
const DAY = 86400;
/** Schwarzschild radius of the Sun divided by the astronomical unit, radians. */
const SRS = 1.97412574336e-8;

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
  Moon: [[NAIF.EMB, NAIF.SSB], [NAIF.MOON, NAIF.EMB]],
  Earth: [[NAIF.EMB, NAIF.SSB], [NAIF.EARTH, NAIF.EMB]],
};
/** Kernel routes that are a PLANETARY-SYSTEM BARYCENTRE, not the body centre. */
export const BARYCENTRE_ONLY = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const addv = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const norm = (v) => Math.hypot(v[0], v[1], v[2]);
const scale = (v, k) => [v[0] * k, v[1] * k, v[2] * k];
const unit = (v) => scale(v, 1 / norm(v));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export const DEFAULTS = {
  nutation: '2000b',        // 'ae' reproduces the existing prototype
  bias: true,               // ICRF -> dynamical J2000 frame bias
  aberration: 'full',       // 'none' | 'first' | 'full'
  deflection: 'sun',        // 'none' | 'sun'
  timescale: 'tdb',         // 'tt' treats TT as TDB, as the prototype does
  observerVelocity: 'analytic',  // 'analytic' | 'central60' | 'central600'
  lightTimeIters: 12,
  lightTimeTolSec: 1e-11,
  deflectionLimit: 1e-14,
};
/** Exactly the existing prototype's contract, for a like-for-like baseline. */
export const PROTOTYPE = {
  nutation: 'ae', bias: false, aberration: 'first', deflection: 'none',
  timescale: 'tt', observerVelocity: 'central60', lightTimeIters: 5, lightTimeTolSec: 1e-9,
  deflectionLimit: 1e-14,
};

/** TDB - TT, seconds.  Two-term Astronomical-Almanac form; |error| < 30 us. */
export function tdbMinusTt(jdTt) {
  const g = (357.53 + 0.9856003 * (jdTt - 2451545.0)) * Math.PI / 180;
  const l = (246.11 + 0.90251792 * (jdTt - 2451545.0)) * Math.PI / 180;
  return 0.001658 * Math.sin(g) + 0.000014 * Math.sin(2 * g) + 0.0000224 * Math.sin(l);
}

export class Backend {
  constructor(kernelPath) {
    this.spk = new Spk2(kernelPath);
    this.segCache = new Map();
    this.offsetFor = null;
  }

  #seg(target, center) {
    const key = `${target}/${center}`;
    if (!this.segCache.has(key)) this.segCache.set(key, this.spk.segment(target, center));
    return this.segCache.get(key);
  }

  /** Barycentric position (km) in the kernel's ICRF frame. */
  bary(body, et) {
    let v = [0, 0, 0];
    for (const [t, c] of ROUTE[body]) v = addv(v, this.spk.position(this.#seg(t, c), et));
    if (this.offsetFor && this.offsetFor.body === body) v = addv(v, this.offsetFor.offsetKm);
    return v;
  }

  /** Barycentric state (km, km/s), velocity from the Chebyshev derivative. */
  baryState(body, et) {
    let p = [0, 0, 0];
    let v = [0, 0, 0];
    for (const [t, c] of ROUTE[body]) {
      const s = this.spk.state(this.#seg(t, c), et);
      p = addv(p, s.pos);
      v = addv(v, s.vel);
    }
    return { pos: p, vel: v };
  }

  baryVelCentral(body, et, h) {
    const a = this.bary(body, et - h);
    const b = this.bary(body, et + h);
    return [(b[0] - a[0]) / (2 * h), (b[1] - a[1]) / (2 * h), (b[2] - a[2]) / (2 * h)];
  }

  /** How far outside [start, stop] any body's light-time lookback reaches. */
  coverage() {
    const segs = [...new Set(Object.values(ROUTE).flat().map(([t, c]) => `${t}/${c}`))]
      .map((k) => { const [t, c] = k.split('/').map(Number); return this.#seg(t, c); });
    return { start: Math.max(...segs.map((s) => s.start)), stop: Math.min(...segs.map((s) => s.stop)) };
  }

  /**
   * The same reduction, but with a constant km offset added to the target's
   * barycentric position at the emission epoch.  Used to turn a planetary-
   * system barycentre into the body centre when a satellite ephemeris
   * supplies the offset, so the two can be differenced through IDENTICAL code.
   */
  apparentWithOffset(body, ttDays, options, offsetKm) {
    this.offsetFor = { body, offsetKm };
    try { return this.apparent(body, ttDays, options); } finally { this.offsetFor = null; }
  }

  /**
   * Apparent geocentric position, with full diagnostics.
   * `jdTtDays` is TT days past J2000 (so Delta-T is the caller's problem).
   */
  apparent(body, ttDays, options = {}) {
    const o = { ...DEFAULTS, ...options };
    const jdTt = ttDays + 2451545.0;
    const et = o.timescale === 'tdb'
      ? ttDays * DAY + tdbMinusTt(jdTt)
      : ttDays * DAY;
    const t = ttDays / 36525;

    const earth = this.baryState('Earth', et);
    const observer = earth.pos;
    let observerVel;
    if (o.observerVelocity === 'analytic') observerVel = earth.vel;
    else if (o.observerVelocity === 'central600') observerVel = this.baryVelCentral('Earth', et, 600);
    else observerVel = this.baryVelCentral('Earth', et, 60);

    // Light-time iteration.
    let tau = 0;
    let geo = sub(this.bary(body, et), observer);
    let iters = 0;
    let converged = false;
    for (let i = 0; i < o.lightTimeIters; i += 1) {
      iters = i + 1;
      const next = (norm(geo) / AU_KM) * LIGHT_TIME_AU;
      if (Math.abs(next - tau) < o.lightTimeTolSec) { tau = next; converged = true; break; }
      tau = next;
      geo = sub(this.bary(body, et - tau), observer);
    }
    const geometric = geo;
    const distKm = norm(geo);

    // Gravitational light deflection by the Sun (eraLd form).
    let p = unit(geo);
    let limited = false;
    if (o.deflection === 'sun' && body !== 'Sun') {
      const sunAtRecv = this.bary('Sun', et);
      const eVec = sub(observer, sunAtRecv);            // Sun -> observer
      const emAu = norm(eVec) / AU_KM;
      const e = unit(eVec);
      // Sun -> source, at the emission time the light-time iteration found.
      const sunAtEmit = this.bary('Sun', et - tau);
      const q = unit(sub(addv(observer, geo), sunAtEmit));
      // q.(q+e) collapses towards zero as the ray grazes the Sun.  ERFA's
      // eraLdsun clamps it at 1e-6, which silently caps the deflection at
      // roughly a tenth of an arcsecond; that hides exactly the geometry this
      // audit exists to measure.  The clamp is kept (the formula diverges) but
      // set far below the solar limb, and the caller is told when it bound.
      const qdqpe = dot(q, addv(q, e));
      const dlim = o.deflectionLimit;
      limited = qdqpe < dlim;
      const w = SRS / emAu / Math.max(qdqpe, dlim);
      const peq = cross(p, cross(e, q));
      p = unit(addv(p, scale(peq, w)));
    }

    // Annual aberration.
    if (o.aberration !== 'none') {
      const v = scale(observerVel, 1 / C_KM_S);         // v/c
      if (o.aberration === 'first') {
        p = unit(addv(p, v));
      } else {
        // Special-relativistic form (eraAb, without the gravitational-potential
        // term bm1 refinement beyond 1/sqrt(1-v^2)).
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
      lon, lat, distKm, lightTimeSec: tau, lightTimeIters: iters, lightTimeConverged: converged,
      deflectionLimiterBound: limited,
      emissionEt: et - tau, dpsiArcsec, depsArcsec, geometric,
    };
  }
}
