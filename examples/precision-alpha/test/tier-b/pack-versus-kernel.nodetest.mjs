/**
 * Tier B, repository only: the pack against the uncompressed kernel.
 *
 *   PRECISION_PACK=/path/to/pack.zeph \
 *   PRECISION_KERNEL=/path/to/de440s.bsp \
 *   node --test "test/tier-b/pack-versus-kernel.nodetest.mjs"
 *
 * This one needs the research SPK reader from the evidence tree, so it is
 * NOT in the published archive -- a clean consumer has no kernel reader and
 * cannot be asked to pretend otherwise. `real-pack.nodetest.mjs` needs only
 * a pack and runs anywhere.
 *
 * A missing input FAILS here too.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { openPackFile, CORRECTED } from '../../src/node.mjs';
import { Reducer } from '../../src/core/reduce.mjs';

const PACK = process.env.PRECISION_PACK;
const KERNEL = process.env.PRECISION_KERNEL;

test('both paths are supplied and exist', () => {
  assert.ok(PACK && existsSync(PACK), 'PRECISION_PACK is not set, or points at nothing');
  assert.ok(KERNEL && existsSync(KERNEL), 'PRECISION_KERNEL is not set, or points at nothing');
});

if (!PACK || !existsSync(PACK) || !KERNEL || !existsSync(KERNEL)) {
  test('the comparison could not run', () => {
    assert.fail('the pack was never compared against the kernel. This is a failure, not a skip.');
  });
} else {
  const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const INSTANTS = [-18262.0, -5000.25, 0.5, 1234.75, 8765.5, 12345.875];

  test('the pack agrees with the uncompressed kernel to the compression budget', async () => {
    const { SpkBackend } = await import('../../tools/spk-backend.mjs');
    const rt = await openPackFile(PACK);
    const kernel = new Reducer(new SpkBackend(KERNEL));
    let worst = 0;
    for (const tt of INSTANTS) {
      for (const body of BODIES) {
        const a = rt.apparent(body, tt, CORRECTED).lon;
        const b = kernel.apparent(body, tt, CORRECTED).lon;
        let d = a - b;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        worst = Math.max(worst, Math.abs(d) * 3600);
      }
    }
    // 0.05 arcsec is the declared incremental-compression target; the
    // measurement over the whole coverage reached 0.0049.
    assert.ok(worst < 0.05, `compression cost ${worst} arcsec, past the declared 0.05`);
    rt.dispose();
  });
}
