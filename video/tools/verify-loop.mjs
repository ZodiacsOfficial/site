/**
 * Loop check: render frames 0 and 449 as PNGs (if not present), then
 * pixel-compare. The only element that moves across the wrap is the
 * backdrop dial (one revolution per 450 frames → 0.8°/frame), so the
 * diff must be near-zero and confined to the faint dial.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const first = 'out/loop-frame-000.png';
const last = 'out/loop-frame-449.png';
for (const [file, frame] of [[first, 0], [last, 449]]) {
  if (!existsSync(file)) {
    execSync(`npx remotion still Square ${file} --frame=${frame}`, { stdio: 'inherit' });
  }
}

const a = PNG.sync.read(readFileSync(first));
const b = PNG.sync.read(readFileSync(last));
const diff = new PNG({ width: a.width, height: a.height });
const mismatched = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
  threshold: 0.08,
});
writeFileSync('out/loop-diff.png', PNG.sync.write(diff));
const pct = (mismatched / (a.width * a.height)) * 100;
console.log(`frame 0 vs 449: ${mismatched} differing pixels (${pct.toFixed(3)}%)`);
console.log('diff image: out/loop-diff.png');
if (pct > 0.5) {
  console.error('LOOP CHECK FAILED — more than 0.5% of pixels differ');
  process.exit(1);
}
console.log('LOOP CHECK PASSED');
