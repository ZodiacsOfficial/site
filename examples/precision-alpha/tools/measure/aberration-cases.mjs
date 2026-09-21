/**
 * The deterministic case set both sides of the ERFA comparison evaluate.
 *
 *   node tools/measure/aberration-cases.mjs > cases.json
 *
 * Fixed seed, no clock, no pack: the same cases every run, on any machine.
 */
const unit = (v) => { const n = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); return [v[0] / n, v[1] / n, v[2] / n]; };
export function cases() {
  const out = [];
  // Named geometries first, so a failure points at a shape rather than an index.
  const EARTHLIKE = 29.79 / 299792.458;
  out.push({ id: 'transverse-earthlike', pnat: [1, 0, 0], v: [0, EARTHLIKE, 0], sunAu: 1 });
  out.push({ id: 'parallel-earthlike', pnat: [1, 0, 0], v: [EARTHLIKE, 0, 0], sunAu: 1 });
  out.push({ id: 'antiparallel-earthlike', pnat: [1, 0, 0], v: [-EARTHLIKE, 0, 0], sunAu: 1 });
  out.push({ id: 'zero-velocity', pnat: unit([1, 2, 3]), v: [0, 0, 0], sunAu: 1 });
  out.push({ id: 'near-sun-small-s', pnat: unit([1, 0.1, 0]), v: [0, EARTHLIKE, 0], sunAu: 0.3 });
  out.push({ id: 'far-sun-large-s', pnat: unit([1, 0.1, 0]), v: [0, EARTHLIKE, 0], sunAu: 30 });
  out.push({ id: 'fast-0.5c-transverse', pnat: [1, 0, 0], v: [0, 0.5, 0], sunAu: 1 });
  out.push({ id: 'fast-0.9c-oblique', pnat: unit([1, 1, 1]), v: [0.5, 0.5, 0.4], sunAu: 1 });
  // Then a deterministic sweep.
  let seed = 20260921;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < 200; i += 1) {
    const pnat = unit([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]);
    const dir = unit([rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]);
    const speed = [1e-6, 1e-4, 1e-3, 1e-2, 0.3][i % 5] * (0.5 + rnd());
    out.push({ id: `sweep-${i}`, pnat, v: [dir[0] * speed, dir[1] * speed, dir[2] * speed], sunAu: 0.4 + rnd() * 30 });
  }
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) process.stdout.write(`${JSON.stringify({ cases: cases() }, null, 1)}\n`);
