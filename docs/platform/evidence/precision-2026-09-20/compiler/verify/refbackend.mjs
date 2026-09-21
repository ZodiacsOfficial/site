/**
 * The UNCOMPRESSED reference: the raw DE440s kernel driven through exactly the
 * same reduction the pack runtime uses, so that a measured longitude
 * difference is attributable to the representation and to nothing else.
 *
 * `observerVelocity` exists because the prototype takes the observer's
 * barycentric velocity from a 60-second central difference while a pack has
 * the analytic derivative. That is a reduction difference, not a series
 * difference, so it is switchable and measured on its own rather than folded
 * into the headline number.
 */
import { SpkRef } from './spkref.mjs';

const AU_KM = 149597870.700;
const LIGHT_TIME_AU = 499.004783836;
const DAY = 86400;

const ROUTE = {
  Sun: [[10, 0]],
  Mercury: [[1, 0]], Venus: [[2, 0]], Mars: [[4, 0]], Jupiter: [[5, 0]],
  Saturn: [[6, 0]], Uranus: [[7, 0]], Neptune: [[8, 0]], Pluto: [[9, 0]],
  Moon: [[3, 0], [301, 3]],
  Earth: [[3, 0], [399, 3]],
};

export class RefBackend {
  constructor(kernelPath, { observerVelocity = 'analytic', A = null } = {}) {
    this.ref = kernelPath instanceof SpkRef ? kernelPath : new SpkRef(kernelPath);
    this.observerVelocity = observerVelocity;
    this.A = A;
    this.segs = {};
    for (const [b, route] of Object.entries(ROUTE)) this.segs[b] = route.map(([t, c]) => this.ref.segment(t, c));
    this.t = new Float64Array(6); this.s = new Float64Array(6);
    this.obs = new Float64Array(6); this.a = new Float64Array(6); this.b = new Float64Array(6);
  }

  /** Barycentric state from the raw kernel, km and km/s. */
  state(body, et, out) {
    const route = this.segs[body];
    for (let i = 0; i < 6; i += 1) out[i] = 0;
    for (const seg of route) {
      this.ref.state(seg, et, this.t);
      for (let i = 0; i < 6; i += 1) out[i] += this.t[i];
    }
    return out;
  }

  observerState(et, out) {
    this.state('Earth', et, out);
    if (this.observerVelocity === 'fd60') {
      const h = 60;
      this.state('Earth', et - h, this.a); this.state('Earth', et + h, this.b);
      out[3] = (this.b[0] - this.a[0]) / (2 * h);
      out[4] = (this.b[1] - this.a[1]) / (2 * h);
      out[5] = (this.b[2] - this.a[2]) / (2 * h);
    }
    return out;
  }

  apparentEclipticLongitude(body, utcDate, deltaTSeconds = null) {
    const A = this.A;
    let time = A.MakeTime(utcDate);
    if (deltaTSeconds !== null) { const p = A.MakeTime(utcDate); p.tt = p.ut + deltaTSeconds / DAY; time = p; }
    const et = time.tt * DAY;
    const obs = this.observerState(et, this.obs);
    const ox = obs[0]; const oy = obs[1]; const oz = obs[2];
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
    const ax = gx + (obs[3] * dist) / cKmS;
    const ay = gy + (obs[4] * dist) / cKmS;
    const az = gz + (obs[5] * dist) / cKmS;
    const rot = A.Rotation_EQJ_ECT(time);
    const vec = new A.Vector(ax / AU_KM, ay / AU_KM, az / AU_KM, time);
    const ect = A.RotateVector(rot, vec);
    let lon = (Math.atan2(ect.y, ect.x) * 180) / Math.PI;
    if (lon < 0) lon += 360;
    return lon;
  }
}
