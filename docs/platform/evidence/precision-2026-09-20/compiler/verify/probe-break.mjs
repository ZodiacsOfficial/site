/** Deliberate bad inputs: does it fail honestly, or silently return something wrong? */
import { readFileSync, writeFileSync } from 'node:fs';
import { Pack, PackBackend } from '../runtime.mjs';

const P = '/home/user/precision/compiler/packs/D.zeph';
const good = new PackBackend(new Pack(P));
const a = new Float64Array(6), b = new Float64Array(6);
good.state('Moon', 0, b);
const buf = readFileSync(P);
const hl = buf.readUInt32LE(8);
const header = JSON.parse(buf.toString('utf8', 16, 16 + hl));
const moon = header.bodies.find((x) => x.name === 'moon');
console.log(`moon block at ${moon.offset}, ${moon.bytes} B; file ${buf.length} B`);

function tryPack(label, mutate) {
  const c = Buffer.from(buf);
  mutate(c);
  const path = '/home/user/precision/compiler/verify/tmp.zeph';
  writeFileSync(path, c);
  try {
    const bk = new PackBackend(new Pack(path));
    bk.state('Moon', 0, a);
    const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    console.log(`  ${label.padEnd(46)} OPENED, no error. Moon moved ${d.toExponential(4)} km`);
  } catch (e) { console.log(`  ${label.padEnd(46)} threw ${e.constructor.name}: ${String(e.message).slice(0, 70)}`); }
}

console.log('\n== pack-integrity attacks (header claims payloadSha256) ==');
tryPack('flip 1 bit in a Moon coefficient record', (c) => { c[moon.offset + 5000] ^= 0x01; });
tryPack('flip 1 byte in a Moon coefficient record', (c) => { c[moon.offset + 5000] ^= 0xff; });
tryPack('zero 4096 bytes of the Moon block', (c) => { c.fill(0, moon.offset + 4096, moon.offset + 8192); });
tryPack('truncate the file inside the Moon block', (c) => { /* handled below */ });
{
  const path = '/home/user/precision/compiler/verify/tmp2.zeph';
  writeFileSync(path, buf.subarray(0, moon.offset + 4096));
  try {
    const bk = new PackBackend(new Pack(path));
    bk.state('Moon', 4.7e9, a);
    console.log(`  ${'truncate file inside the Moon block'.padEnd(46)} OPENED, no error. Moon = ${a[0]}`);
  } catch (e) { console.log(`  ${'truncate file inside the Moon block'.padEnd(46)} threw ${e.constructor.name}: ${String(e.message).slice(0,70)}`); }
}
tryPack('corrupt the magic', (c) => { c.write('XXXXXXXX', 0, 'latin1'); });
tryPack('lie about intervalSec in the header (x2)', (c) => {
  const h = JSON.parse(c.toString('utf8', 16, 16 + hl));
  const m = h.bodies.find((x) => x.name === 'moon'); m.intervalSec *= 2;
  const s = Buffer.from(JSON.stringify(h), 'utf8');
  if (s.length <= hl) { s.copy(c, 16); c.fill(0x20, 16 + s.length, 16 + hl); c.writeUInt32LE(s.length, 8); }
});

console.log('\n== API misuse ==');
for (const [label, fn] of [
  ['state("Sun", NaN, out)', () => good.state('Sun', NaN, a)],
  ['state("Sun", Infinity, out)', () => good.state('Sun', Infinity, a)],
  ['state("Nibiru", 0, out)', () => good.state('Nibiru', 0, a)],
  ['raw("earth", 0, out)  (derived, not stored)', () => good.pack.raw('earth', 0, a)],
  ['apparentLon at NaN date', () => good.apparentEclipticLongitude('Sun', new Date(NaN))],
]) {
  try { const r = fn(); console.log(`  ${label.padEnd(46)} returned ${typeof r === 'number' ? r : Array.from(a.slice(0,3)).map(x=>String(x)).join(',')}`); }
  catch (e) { console.log(`  ${label.padEnd(46)} threw ${e.constructor.name}: ${String(e.message).slice(0,60)}`); }
}

console.log('\n== cropped pack: vector API outside its own smaller coverage ==');
{
  const cp = new PackBackend(new Pack('/home/user/precision/compiler/packs/D-1950-2050.zeph'));
  const full = good;
  for (const [label, iso] of [['1900-01-01', '1900-01-01T00:00:00Z'], ['1949-12-01', '1949-12-01T00:00:00Z'], ['2060-01-01', '2060-01-01T00:00:00Z']]) {
    const et = (Date.parse(iso) / 1000) - 946728000;
    try {
      cp.state('Mars', et, a); full.state('Mars', et, b);
      console.log(`  state('Mars') at ${label}: NO THROW, off by ${Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]).toExponential(4)} km vs the full pack`);
    } catch (e) { console.log(`  state('Mars') at ${label}: threw ${e.constructor.name}`); }
  }
  try { cp.apparentEclipticLongitude('Mars', new Date('1900-01-01T00:00:00Z')); console.log('  apparentLon at 1900: NO THROW'); }
  catch (e) { console.log(`  apparentLon at 1900: threw ${e.constructor.name} (documented behaviour)`); }
  try { cp.state('Jupiter', 0, a); console.log('  cropped-by-body pack, absent body: NO THROW'); } catch (e) { console.log(`  full pack has Jupiter, ok`); }
  const inner = new PackBackend(new Pack('/home/user/precision/compiler/packs/D-inner.zeph'));
  try { inner.state('Jupiter', 0, a); console.log('  D-inner.state("Jupiter"): NO THROW <-- bad'); }
  catch (e) { console.log(`  D-inner.state("Jupiter"): threw ${e.constructor.name}: ${e.message}`); }
}
