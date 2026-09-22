/**
 * A sweep of the two frozen knobs, run ONLY after the preregistered
 * evaluation has been taken and recorded. Its purpose is to decide the
 * single amendment PARTITION-EVALUATION.md section 4 permits, on evidence
 * across cases rather than on one.
 */
import { openPackFile } from '../../../../../examples/precision-alpha/src/node.mjs';
import { makeDeflectedReference } from '../../../../../examples/precision-alpha/test/tier-b/_deflected-reference.mjs';
import { searchDeflectedOverPartition } from '../../../../../examples/precision-alpha/src/core/partitioned-search.mjs';

const PACK = process.argv[2];
const DAY = 86400;
const J2000_UTC = Date.UTC(2000, 0, 1, 12);
const tdb = (iso) => (Date.parse(iso) - J2000_UTC) / 1000 + 69.184;
const plus = (iso, d) => `${new Date(Date.parse(iso) + d * DAY * 1000).toISOString().slice(0, 10)}T00:00:00Z`;
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

const rt = await openPackFile(PACK);
const eph = rt.ephemeris;
const ref = makeDeflectedReference(eph);
const dg = rt.integrity.computedDigest;

const BASELINE = { F2: 4000001, F3: 1917153, F6: 2106, F7: 63960, F8: 58353, F9: 55409 };
const PICK = ['F2', 'F3', 'F7'];
const TOLERANCES = [60, 120, 300, 900];

const rows = [];
for (let i = 0; i < BODIES.length; i += 1) {
  const id = `F${i + 1}`;
  if (!PICK.includes(id)) continue;
  const body = BODIES[i];
  const fromIso = plus('1975-01-01T00:00:00Z', 900 * i);
  const from = tdb(fromIso);
  const to = tdb(plus(fromIso, 300));
  const lon = ref.lonDeg(body, (from + to) / 2);
  const targetDeg = Number(lon.toFixed(6));
  for (const tol of TOLERANCES) {
    const t0 = Date.now();
    let r;
    try {
      r = searchDeflectedOverPartition(eph, {
        body, targetDeg, fromTdbSec: from, toTdbSec: to, packDigest: dg,
        boundaryToleranceSec: tol, maxEvaluations: 4_000_000, maxCells: 400_000,
      });
    } catch (e) {
      console.log(`${id} ${body} tol=${tol}: THREW ${e.code ?? ''} ${e.message.slice(0, 80)}`);
      continue;
    }
    const req = to - from;
    const row = {
      id, body, tol,
      status: r.execution.status,
      total: r.execution.evaluations,
      partition: r.execution.partitionEvaluations,
      search: r.execution.searchEvaluations,
      ratio: BASELINE[id] / r.execution.evaluations,
      boundaryPct: (r.accounting.boundarySec / req) * 100,
      excludedPct: (r.accounting.excludedSec / req) * 100,
      events: r.events.length,
      established: r.eventCount.eligibilityEstablished,
      ms: Date.now() - t0,
    };
    rows.push(row);
    console.log(`${id.padEnd(3)} ${body.padEnd(8)} tol=${String(tol).padStart(3)} ${row.status.padEnd(16)} total=${String(row.total).padStart(9)} (part ${String(row.partition).padStart(9)} + search ${String(row.search).padStart(8)}) ratio=${row.ratio.toFixed(2)}x boundary=${row.boundaryPct.toFixed(3)}% excl=${row.excludedPct.toFixed(2)}% events=${row.events}/${row.established}`);
  }
}
console.log(JSON.stringify(rows));
