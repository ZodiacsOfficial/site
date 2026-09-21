import { Spk2, NAIF } from '../src/spk2.mjs';
const s = new Spk2('/tmp/claude-0/swisslab/de440s.bsp');
// Validate the ANALYTIC Chebyshev derivative that B5 uses as its reference,
// against Richardson-extrapolated central differences of the position.
const pairs = [[NAIF.EMB, NAIF.SSB], [NAIF.MOON, NAIF.EMB], [NAIF.MERCURY_BARY, NAIF.SSB], [NAIF.PLUTO_BARY, NAIF.SSB]];
for (const [t,c] of pairs) {
  const seg = s.segment(t,c);
  let worstRel = 0, worstAbs = 0, speedMax = 0;
  for (let i=0;i<400;i++){
    const et = seg.start + (seg.stop-seg.start)*(i+0.5)/400;
    const st = s.state(seg, et);
    // Richardson: (4*D(h) - D(2h))/3, h = 32 s (well inside a record)
    const h = 32;
    const D = (hh) => {
      const a = s.position(seg, et-hh), b = s.position(seg, et+hh);
      return [ (b[0]-a[0])/(2*hh), (b[1]-a[1])/(2*hh), (b[2]-a[2])/(2*hh) ];
    };
    const d1 = D(h), d2 = D(2*h);
    const rich = [0,1,2].map(k => (4*d1[k]-d2[k])/3);
    const err = Math.hypot(...[0,1,2].map(k => rich[k]-st.vel[k]));
    const sp = Math.hypot(...st.vel);
    speedMax = Math.max(speedMax, sp);
    worstAbs = Math.max(worstAbs, err);
    worstRel = Math.max(worstRel, err/Math.max(sp,1e-9));
  }
  console.log(`${t}<-${c}: analytic vs Richardson-FD  maxAbs=${worstAbs.toExponential(3)} km/s  maxRel=${worstRel.toExponential(3)}  maxSpeed=${speedMax.toFixed(4)} km/s`);
}
// Also: the B5 figure itself, recomputed (Earth barycentric velocity error of central differences)
const emb = s.segment(NAIF.EMB, NAIF.SSB), ear = s.segment(NAIF.EARTH, NAIF.EMB);
const bary = (et) => { const a=s.position(emb,et), b=s.position(ear,et); return [a[0]+b[0],a[1]+b[1],a[2]+b[2]]; };
const baryV = (et) => { const a=s.state(emb,et), b=s.state(ear,et); return [a.vel[0]+b.vel[0],a.vel[1]+b.vel[1],a.vel[2]+b.vel[2]]; };
for (const h of [60,600]) {
  let m=0;
  const lo = Math.max(emb.start,ear.start)+2*h+10, hi = Math.min(emb.stop,ear.stop)-2*h-10;
  for (let i=0;i<4000;i++){
    const et = lo + (hi-lo)*(i+0.5)/4000;
    const a=bary(et-h), b=bary(et+h);
    const cd=[(b[0]-a[0])/(2*h),(b[1]-a[1])/(2*h),(b[2]-a[2])/(2*h)];
    const v=baryV(et);
    m=Math.max(m, Math.hypot(cd[0]-v[0],cd[1]-v[1],cd[2]-v[2]));
  }
  console.log(`B5 recomputed: Earth barycentric central-difference velocity error at h=${h}s over n=4000 -> ${m.toExponential(3)} km/s (RESULTS: ${h===60?'1.04e-9':'8.27e-8'})`);
}
