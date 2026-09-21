/**
 * Open a pack, verify it, compute a place, dispose.
 *
 *   node examples/01-open-and-calculate.mjs /path/to/pack.zeph
 *
 * No pack ships with this package. See examples/00-prepare-a-pack.md for
 * how to make one from a kernel you already have.
 */
import { openPackFile, CORRECTED } from '@zodiacs/precision-alpha/node';

const path = process.argv[2];
if (!path) {
  console.error('usage: node 01-open-and-calculate.mjs <pack.zeph>');
  process.exit(2);
}

const rt = await openPackFile(path);

console.log('digest       ', rt.integrity.computedDigest);
console.log('self-consistent', rt.integrity.selfConsistent);
console.log('authenticity ', rt.integrity.authenticity);
console.log('coverage     ', rt.coverage.startEtSecTdb, '..', rt.coverage.stopEtSecTdb, 'TDB seconds past J2000');

// TT days past J2000. 8765.5 is 2024-01-01T12:00 TT, near enough.
for (const body of rt.bodies) {
  const r = rt.apparent(body, 8765.5, CORRECTED);
  console.log(
    body.padEnd(8),
    'lon', r.lon.toFixed(6).padStart(11),
    'lat', r.lat.toFixed(6).padStart(10),
    'dist(km)', r.distKm.toExponential(6),
    r.isSystemBarycentre ? '(system barycentre, not the body centre)' : '',
  );
}

rt.dispose();
