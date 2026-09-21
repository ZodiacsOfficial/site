/** Adversarial probes: coverage edges, aliasing, corruption, byte shares. */
import { readFileSync, writeFileSync } from 'node:fs';
import { Pack, PackBackend, openPack } from '../runtime.mjs';
import { SpkRef } from '../spkref.mjs';
import { RefBackend } from '../refbackend.mjs';
import { loadAstronomyEngine } from '../runtime.mjs';

const KERNEL = '/tmp/claude-0/swisslab/de440s.bsp';
const P = '/home/user/precision/compiler/packs/D.zeph';
const A = await loadAstronomyEngine();
const ref = new SpkRef(KERNEL);
const pack = new Pack(P);
ref.emrat = pack.emrat;
const back = new PackBackend(pack);
const refBack = new RefBackend(ref, { A });
const T0 = pack.coverage.startEtSecTdb, T1 = pack.coverage.stopEtSecTdb;
const a = new Float64Array(6), b = new Float64Array(6);

console.log('== A. state()/raw() OUTSIDE declared coverage: does it throw? ==');
for (const [label, et] of [['T0 - 1 s', T0 - 1], ['T0 - 1 day', T0 - 86400],
                           ['T0 - 10 yr', T0 - 10*365.25*86400], ['T1 + 10 yr', T1 + 10*365.25*86400],
                           ['year 1000 AD', -31557600000], ['year 3000 AD', 31556952000]]) {
  let res;
  try { back.state('Moon', et, a); res = `NO THROW -> Moon x=${a[0].toExponential(6)} km`; }
  catch (e) { res = `threw ${e.constructor.name}: ${e.message}`; }
  console.log(`  ${label.padEnd(14)} covers()=${pack.covers(et)}  ${res}`);
}

console.log('\n== B. how wrong is the silent clamp? (pack vs raw kernel, both clamp) ==');
for (const d of [0, 1, 60, 3600, 86400, 10*86400, 365*86400]) {
  const et = T0 - d;
  let worst = 0, who = '';
  for (const body of ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Earth']) {
    back.state(body, et, a); refBack.state(body, et, b);
    const e = Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
    if (e > worst) { worst = e; who = body; }
  }
  console.log(`  T0 - ${String(d).padStart(9)} s: worst ${worst.toExponential(4)} km (${who})`);
}

console.log('\n== C. light-time pulls et BELOW T0 on a call that passed covers() ==');
{
  // an instant 1 second inside coverage; Pluto light-time ~ 5.5 h
  const when = new Date((T0 + 1 + 946728000) * 1000);
  for (const body of ['Pluto','Neptune','Moon','Sun']) {
    try {
      const lp = back.apparentEclipticLongitude(body, when, null, A);
      const lr = refBack.apparentEclipticLongitude(body, when, null);
      let d = (lp - lr) % 360; if (d > 180) d -= 360; if (d <= -180) d += 360;
      console.log(`  ${body.padEnd(8)} accepted; diff vs raw-kernel reduction = ${(d*3600).toExponential(4)}"`);
    } catch (e) { console.log(`  ${body.padEnd(8)} threw ${e.constructor.name}`); }
  }
}

console.log('\n== D. scratch aliasing: guard covers this.scratch only ==');
{
  const good = new Float64Array(6);
  back.state('Mercury', 0, good);
  back.state('Mercury', 0, back.s2);
  const diff = Math.hypot(back.s2[0]-good[0], back.s2[1]-good[1], back.s2[2]-good[2]);
  console.log(`  frame of mercuryBary = ${pack.bodies.get('mercuryBary').frame}`);
  console.log(`  state('Mercury', 0, back.s2) error vs correct = ${diff.toExponential(4)} km  (threw? no)`);
  let threw = false;
  try { back.state('Moon', 0, back.scratch); } catch { threw = true; }
  console.log(`  state('Moon', 0, back.scratch) threw = ${threw}`);
  let threw2 = false;
  try { back.state('Sun', 0, back.s2); } catch { threw2 = true; }
  console.log(`  state('Sun', 0, back.s2) threw = ${threw2}`);
}

console.log('\n== E. payload corruption: is payloadSha256 ever checked at open? ==');
{
  const buf = readFileSync(P);
  const payloadOffset = buf.readUInt32LE(12);
  const copy = Buffer.from(buf);
  copy[payloadOffset + 100000] ^= 0xff;             // flip one byte of coefficient data
  const tmp = '/home/user/precision/compiler/verify/D-corrupt.zeph';
  writeFileSync(tmp, copy);
  let msg;
  try {
    const bad = new PackBackend(new Pack(tmp));
    bad.state('Moon', 0, a); back.state('Moon', 0, b);
    msg = `opened with NO error; Moon position moved ${Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]).toExponential(4)} km`;
  } catch (e) { msg = `threw ${e.constructor.name}: ${e.message}`; }
  console.log(`  one flipped payload byte -> ${msg}`);
  // truncate
  const tmp2 = '/home/user/precision/compiler/verify/D-trunc.zeph';
  writeFileSync(tmp2, buf.subarray(0, buf.length - 200000));
  try {
    const bad2 = new PackBackend(new Pack(tmp2));
    bad2.state('Pluto', 0, a); back.state('Pluto', 0, b);
    console.log(`  truncated by 200000 B -> opened with NO error; Pluto moved ${Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]).toExponential(4)} km`);
  } catch (e) { console.log(`  truncated by 200000 B -> threw ${e.constructor.name}: ${e.message}`); }
}

console.log('\n== F. per-body byte shares of pack D ==');
{
  const tot = pack.header.bodies.reduce((s, x) => s + x.bytes, 0);
  const file = readFileSync(P).length;
  for (const x of pack.header.bodies.sort((p,q)=>q.bytes-p.bytes))
    console.log(`  ${x.name.padEnd(12)} ${String(x.bytes).padStart(9)} B  ${(100*x.bytes/file).toFixed(1)}% of file  ${(100*x.bytes/tot).toFixed(1)}% of payload`);
  console.log(`  payload total ${tot} B, file ${file} B, header+pad ${file-tot} B`);
}
