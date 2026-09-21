import * as A from 'astronomy-engine';
import { npbMatrix, mul, transpose, apply } from '../src/frames.mjs';
// Rebuild the §3 probe: compare our NPB chain (AE nutation) with and without
// bias against astronomy-engine's own Rotation_EQJ_EQD, 300 epochs 1850-2149.
const asec = (r) => Math.abs(r) * 206264.80624709636;
let maxNoBias = 0, maxBias = 0, minBias = Infinity;
const N = 300;
for (let i = 0; i < N; i++) {
  const ttDays = -54787 + (54787 + 54423) * i / (N - 1);  // 1850..2149
  const t = ttDays / 36525;
  const time = A.MakeTime(0); time.tt = ttDays; time.ut = ttDays;
  const R = A.Rotation_EQJ_EQD(time);       // 3x3, AE's convention: rot[j][i]?
  // AE RotationMatrix .rot is column-major-ish: rot[i][j] with x' = sum_j rot[j][i]*x_j
  const ae = [[R.rot[0][0],R.rot[1][0],R.rot[2][0]],
              [R.rot[0][1],R.rot[1][1],R.rot[2][1]],
              [R.rot[0][2],R.rot[1][2],R.rot[2][2]]];
  for (const bias of [false, true]) {
    const { matrix } = npbMatrix(t, { nutation: 'ae', bias });
    // angle between the two rotations: max over 3 basis vectors of the angle
    let worst = 0;
    for (let k = 0; k < 3; k++) {
      const e = [0,0,0]; e[k] = 1;
      const a = apply(matrix, e), b = apply(ae, e);
      const cx = [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
      worst = Math.max(worst, asec(Math.hypot(...cx)));
    }
    if (bias) { maxBias = Math.max(maxBias, worst); minBias = Math.min(minBias, worst); }
    else maxNoBias = Math.max(maxNoBias, worst);
  }
}
console.log('n=300 epochs x 3 axes, 1850-2149');
console.log('  bias OFF : max angle vs A.Rotation_EQJ_EQD =', maxNoBias.toExponential(3), 'arcsec');
console.log('  bias ON  : max =', maxBias.toFixed(6), ' min =', minBias.toFixed(6), 'arcsec');
