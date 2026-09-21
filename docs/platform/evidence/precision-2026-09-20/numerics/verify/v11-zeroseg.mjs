import { Spk2 } from '../src/spk2.mjs';
const s = new Spk2('/tmp/claude-0/swisslab/de440s.bsp');
for (const [t,c] of [[199,1],[299,2]]) {
  const seg = s.segment(t,c);
  let nz=0, mx=0, n=0;
  for (let i=0;i<3000;i++){
    const et = seg.start + (seg.stop-seg.start)*(i+0.5)/3000;
    const p = s.position(seg, et); n++;
    const m = Math.max(Math.abs(p[0]),Math.abs(p[1]),Math.abs(p[2]));
    if (m!==0) nz++; mx=Math.max(mx,m);
  }
  console.log(`${t}<-${c}: n=${n} nonzero=${nz} maxAbsKm=${mx} type=${seg.type} rsize=${seg.dir.rsize} nrec=${seg.dir.n}`);
}
