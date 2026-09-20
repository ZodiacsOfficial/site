import { readFileSync, writeFileSync } from 'node:fs';
import { Pack, PackBackend } from '../runtime.mjs';
const P = '/home/user/precision/compiler/packs/D.zeph';
const buf = readFileSync(P);
const hl = buf.readUInt32LE(8);
const h = JSON.parse(buf.toString('utf8', 16, 16 + hl));
const moon = h.bodies.find((x) => x.name === 'moon');
const et = 0;
const rec = Math.floor((et - moon.initEt) / moon.intervalSec);
const recByte = moon.offset + moon.layout.recordsOffset + rec * moon.layout.stride;
console.log(`Moon record for et=0 is #${rec} at file byte ${recByte}; stride ${moon.layout.stride}`);
const good = new PackBackend(new Pack(P)); const a = new Float64Array(6), b = new Float64Array(6);
good.state('Moon', et, b);
const c = Buffer.from(buf); c[recByte] ^= 0x01;            // one bit of the record actually used
writeFileSync('/home/user/precision/compiler/verify/tmp3.zeph', c);
const bad = new PackBackend(new Pack('/home/user/precision/compiler/verify/tmp3.zeph'));
bad.state('Moon', et, a);
console.log(`one flipped BIT in the live record: opened with no error, Moon moved ${Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]).toExponential(4)} km`);
const c2 = Buffer.from(buf); c2[recByte + 3] ^= 0xff;
writeFileSync('/home/user/precision/compiler/verify/tmp4.zeph', c2);
const bad2 = new PackBackend(new Pack('/home/user/precision/compiler/verify/tmp4.zeph'));
bad2.state('Moon', et, a);
console.log(`one flipped BYTE in the live record : opened with no error, Moon moved ${Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]).toExponential(4)} km`);

// width distribution, to check the "high-order coefficients cost 1 byte, c0 costs 5 or 6" claim
console.log('\nwidth histogram per body (fields are [x0..xn-1, y0.., z0..]):');
for (const bd of h.bodies) {
  const w = bd.layout.widths; const n = bd.ncoef;
  const hist = {}; for (const x of w) hist[x] = (hist[x] || 0) + 1;
  console.log(`  ${bd.name.padEnd(12)} ncoef ${String(n).padStart(3)}  c0 widths [${w[0]},${w[n]},${w[2*n]}]  last widths [${w[n-1]},${w[2*n-1]},${w[3*n-1]}]  hist ${JSON.stringify(hist)}`);
}
