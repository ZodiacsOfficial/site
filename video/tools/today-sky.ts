/**
 * Snapshot the real sky for the render date using the site's engine:
 * every body's position + retrograde state, the Moon's phase, and the
 * next eclipse from the site's committed eclipse table.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { computeBodies } from '../../src/lib/engine/full';
import { moonPhaseAngle, moonIllumination, moonPhaseName } from '../../src/lib/engine/lite';
import { formatLongitude, signForLongitude } from '../../src/lib/signs';

const now = new Date();
const bodies = computeBodies(now);
const angle = moonPhaseAngle(now);
const illum = moonIllumination(now);
const phase = moonPhaseName(now);

const eclipses = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/data/eclipses.json'), 'utf8'),
);
const next = eclipses.eclipses.find((e: { peak: string }) => new Date(e.peak) > now);

console.log('now', now.toISOString());
console.log('moon phase:', phase, 'angle', angle.toFixed(1), 'illum', (illum * 100).toFixed(0) + '%');
for (const b of bodies) {
  console.log(' ', b.body.padEnd(11), formatLongitude(b.lon).padEnd(20), b.retrograde ? 'Rx' : '');
}
console.log('next eclipse:', JSON.stringify(next));

const outPath = resolve(process.cwd(), 'video/data/sky-now.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({
  capturedAt: now.toISOString(),
  moon: { phase, angle, illumination: illum },
  bodies: bodies.map((b) => ({ body: b.body, lon: b.lon, retrograde: b.retrograde })),
  nextEclipse: next,
}, null, 2));
console.log('wrote', outPath);
