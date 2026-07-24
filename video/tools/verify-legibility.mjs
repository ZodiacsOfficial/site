/**
 * X-timeline legibility check: render one still per text moment, downscale
 * to 350px wide (a small in-feed rendering), and write a contact sheet to
 * out/legibility/ for review.
 */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const FRAMES = [0, 24, 100, 125, 170, 200, 220, 262, 300, 345, 380, 412, 424, 440];
mkdirSync('out/legibility', { recursive: true });

for (const f of FRAMES) {
  const full = `out/legibility/full-${String(f).padStart(3, '0')}.png`;
  execSync(`npx remotion still Square ${full} --frame=${f}`, { stdio: 'inherit' });
  await sharp(full)
    .resize(350)
    .png()
    .toFile(`out/legibility/at350-${String(f).padStart(3, '0')}.png`);
}
console.log('wrote out/legibility/at350-*.png');
