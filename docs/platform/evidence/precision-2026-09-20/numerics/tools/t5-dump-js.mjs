/** Dumps positions from the EXISTING prototype reader (spk.mjs) at a fixed
 *  epoch grid, for comparison with the independent Python reader. */
import { writeFileSync } from 'node:fs';
import { Spk } from '/home/user/site/docs/platform/evidence/swiss-benchmark/prototype/spk.mjs';

const kernel = process.argv[2];
const outPath = process.argv[3];
const spk = new Spk(kernel);
const pairs = spk.segments.map((s) => [s.target, s.center]);
const out = { reader: 'site prototype spk.mjs', kernel, pairs, rows: [] };
const N = 900;
for (const [target, center] of pairs) {
  const seg = spk.segment(target, center);
  for (let i = 0; i < N; i += 1) {
    // Irrational offsets so samples land inside records, on boundaries, and
    // at the very ends, rather than on a lattice that could hide an off-by-one.
    const f = (i + 0.5) / N;
    const et = seg.start + (seg.stop - seg.start) * f;
    out.rows.push({ target, center, et, p: spk.position(seg, et) });
  }
  // Exact record boundaries: where an off-by-one index would show up.
  const dir = [seg.start, seg.stop];
  for (const et of dir) out.rows.push({ target, center, et, p: spk.position(seg, et) });
  for (let k = 1; k <= 40; k += 1) {
    const et = seg.start + (seg.stop - seg.start) * (k / 41);
    const snapped = Math.round(et / 86400) * 86400;
    if (snapped > seg.start && snapped < seg.stop) out.rows.push({ target, center, et: snapped, p: spk.position(seg, snapped) });
  }
}
writeFileSync(outPath, JSON.stringify(out));
process.stderr.write(`${out.rows.length} rows\n`);
