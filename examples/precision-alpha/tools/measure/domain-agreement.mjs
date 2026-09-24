/**
 * Two implementations of one domain question, compared span by span.
 *
 *   node tools/measure/domain-agreement.mjs --pack=/path/to.zeph [--out=file.json]
 *   [--epoch=1975-01-01T00:00:00Z]
 *
 * `searchDeflectedLongitude` decides the five-degree floor cell by cell,
 * inside the search, and reports the spans it DECLINED as
 * `accounting.excluded`. `partitionDomain` decides the same floor, from
 * the same expression, without a target longitude, and reports
 * `excluded`, `boundary` and `admissible`. Neither reads the other.
 *
 * The relation between them is not equality and must not be asserted as
 * equality. Both are conservative and they stop at different places:
 *
 *   - the search bisects toward its one-second enclosure floor and so
 *     resolves the transition far more finely than a sixty-second
 *     boundary tolerance does;
 *   - the search only ever examines the cells its root-finding visits,
 *     so a stretch it never needed to open is simply absent from its
 *     excluded list;
 *   - the partition examines the whole window.
 *
 * What SHOULD hold, and is what this checks:
 *
 *   1. every span the partition PROVED excluded lies inside the region
 *      the search also declined -- inside `excluded`, and not inside
 *      anything the search decided. A partition-excluded span overlapping
 *      a search-DECIDED span is two implementations of one definition
 *      disagreeing, and is a defect in one of them;
 *   2. every span the search declined lies inside the partition's
 *      excluded OR boundary spans -- never inside an admissible one. The
 *      partition may have failed to prove exclusion where the search
 *      declined (that is what boundary is for), but it must never have
 *      proved ADMISSIBLE where the search declined.
 *
 * Failing either is a contradiction. Passing both is corroboration and
 * not a proof: two conservative implementations can agree and both be
 * wrong in the same direction.
 *
 * Research tool. Not in the published archive and not in the site build.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { openPackFile } from '../../src/node.mjs';
import { makeDeflectedReference } from '../../test/tier-b/_deflected-reference.mjs';
import { searchDeflectedLongitude } from '../../src/core/retarded-search.mjs';
import { partitionDomain, PARTITION_DEFAULTS } from '../../src/core/domain-partition.mjs';

const args = new Map();
for (const a of process.argv.slice(2)) { const [k, v] = a.split('='); args.set(k.replace(/^--/, ''), v ?? true); }
const PACK = args.get('pack');
const OUT = args.get('out') ?? null;
const EPOCH = args.get('epoch') ?? '1975-01-01T00:00:00Z';
if (!PACK) { process.stderr.write('--pack is required\n'); process.exit(2); }

const DAY = 86400;
const J2000_UTC = Date.UTC(2000, 0, 1, 12);
const tdb = (iso) => (Date.parse(iso) - J2000_UTC) / 1000 + 69.184;
const plus = (iso, d) => `${new Date(Date.parse(iso) + d * DAY * 1000).toISOString().slice(0, 10)}T00:00:00Z`;
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
/**
 * Both sides place span edges by bisection, so an edge can land a float
 * apart on the two paths. A tolerance of one microsecond is far below the
 * sixty-second boundary tolerance and far above a double's last bits.
 */
const EDGE_TOL_SEC = 1e-6;

const rt = await openPackFile(PACK);
const eph = rt.ephemeris;
const ref = makeDeflectedReference(eph);
const packDigest = rt.integrity.computedDigest;

/** Total overlap of [lo, hi) with a span list. */
const overlap = (lo, hi, spans) => spans.reduce(
  (n, [a, b]) => n + Math.max(0, Math.min(hi, b) - Math.max(lo, a)), 0,
);

const rows = [];
for (let i = 0; i < BODIES.length; i += 1) {
  const body = BODIES[i];
  const fromIso = plus(EPOCH, 900 * i);
  const from = tdb(fromIso);
  const to = tdb(plus(fromIso, 300));
  const lon = ref.lonDeg(body, (from + to) / 2);
  if (lon === null) { rows.push({ id: `F${i + 1}`, body, skipped: 'the reference refuses the midpoint geometry' }); continue; }
  const targetDeg = Number(lon.toFixed(6));

  const search = searchDeflectedLongitude(eph, {
    body, targetDeg, fromTdbSec: from, toTdbSec: to, maxEvaluations: 4_000_000, maxCells: 400_000,
  });
  const plan = partitionDomain(eph, {
    body, fromTdbSec: from, toTdbSec: to, packDigest,
    boundaryToleranceSec: PARTITION_DEFAULTS.boundaryToleranceSec,
    relightWidthRatio: PARTITION_DEFAULTS.relightWidthRatio,
    maxEvaluations: 4_000_000, maxCells: 400_000,
  });

  const searchExcluded = search.accounting.excluded.map((s) => [s.fromTdbSec, s.toTdbSec]);
  const searchDecided = search.interval.decidedTdbSec ?? null;

  // 1. partition-excluded inside search-excluded, and never inside decided
  let partExcludedOutsideSearchExcluded = 0;
  let partExcludedInsideSearchDecided = 0;
  for (const [lo, hi] of plan.excluded) {
    const w = hi - lo;
    partExcludedOutsideSearchExcluded += Math.max(0, w - overlap(lo, hi, searchExcluded) - EDGE_TOL_SEC);
    if (searchDecided) partExcludedInsideSearchDecided += Math.max(0, overlap(lo, hi, searchDecided) - EDGE_TOL_SEC);
  }
  // 2. search-excluded never inside partition-admissible
  let searchExcludedInsidePartAdmissible = 0;
  let searchExcludedOutsidePartExcludedOrBoundary = 0;
  const excOrBnd = [...plan.excluded, ...plan.boundary];
  for (const [lo, hi] of searchExcluded) {
    searchExcludedInsidePartAdmissible += Math.max(0, overlap(lo, hi, plan.admissible) - EDGE_TOL_SEC);
    searchExcludedOutsidePartExcludedOrBoundary += Math.max(0, (hi - lo) - overlap(lo, hi, excOrBnd) - EDGE_TOL_SEC);
  }

  const contradictions = [];
  if (partExcludedOutsideSearchExcluded > EDGE_TOL_SEC) {
    contradictions.push(`${(partExcludedOutsideSearchExcluded / DAY).toExponential(3)} d proved excluded by the partition that the search did not decline`);
  }
  if (partExcludedInsideSearchDecided > EDGE_TOL_SEC) {
    contradictions.push(`${(partExcludedInsideSearchDecided / DAY).toExponential(3)} d proved excluded by the partition inside a span the search DECIDED`);
  }
  if (searchExcludedInsidePartAdmissible > EDGE_TOL_SEC) {
    contradictions.push(`${(searchExcludedInsidePartAdmissible / DAY).toExponential(3)} d the search declined inside a span the partition proved ADMISSIBLE`);
  }

  rows.push({
    id: `F${i + 1}`,
    body,
    from: fromIso,
    searchStatus: search.execution.status,
    searchExcludedDays: searchExcluded.reduce((n, [a, b]) => n + (b - a), 0) / DAY,
    searchExcludedSpans: searchExcluded.length,
    partitionExcludedDays: plan.excluded.reduce((n, [a, b]) => n + (b - a), 0) / DAY,
    partitionExcludedSpans: plan.excluded.length,
    partitionBoundaryDays: plan.boundary.reduce((n, [a, b]) => n + (b - a), 0) / DAY,
    partitionAdmissibleDays: plan.admissible.reduce((n, [a, b]) => n + (b - a), 0) / DAY,
    /** Relation 1. Zero is the only acceptable value for both. */
    partitionExcludedOutsideSearchExcludedDays: partExcludedOutsideSearchExcluded / DAY,
    partitionExcludedInsideSearchDecidedDays: partExcludedInsideSearchDecided / DAY,
    /** Relation 2. The first must be zero; the second is EXPECTED positive. */
    searchExcludedInsidePartitionAdmissibleDays: searchExcludedInsidePartAdmissible / DAY,
    searchExcludedOutsidePartitionExcludedOrBoundaryDays: searchExcludedOutsidePartExcludedOrBoundary / DAY,
    /**
     * How much of what the search declined the partition also PROVED
     * excluded, rather than leaving boundary. Not a pass criterion: the
     * partition stops at its declared tolerance and the search bisects to
     * one second, so a figure below 1 is the tolerance showing, not a
     * disagreement.
     */
    provedFractionOfSearchExcluded: searchExcluded.length === 0 ? null
      : searchExcluded.reduce((n, [a, b]) => n + overlap(a, b, plan.excluded), 0)
        / searchExcluded.reduce((n, [a, b]) => n + (b - a), 0),
    contradictions,
  });
  const r = rows[rows.length - 1];
  process.stderr.write(`${r.id} ${r.body}: search declined ${r.searchExcludedDays.toFixed(4)} d, partition proved ${r.partitionExcludedDays.toFixed(4)} d excluded + ${r.partitionBoundaryDays.toFixed(4)} d boundary; contradictions ${r.contradictions.length}\n`);
}

const live = rows.filter((x) => !x.skipped);
const record = {
  tool: 'domain-agreement',
  what: 'the search\'s own domain verdict against the partition\'s, span by span, on the same windows',
  epoch: EPOCH,
  pack: PACK,
  packDigest,
  edgeToleranceSec: EDGE_TOL_SEC,
  boundaryToleranceSec: PARTITION_DEFAULTS.boundaryToleranceSec,
  cases: rows,
  summary: {
    cases: live.length,
    casesWithSearchExclusions: live.filter((x) => x.searchExcludedSpans > 0).length,
    casesWithPartitionExclusions: live.filter((x) => x.partitionExcludedSpans > 0).length,
    totalContradictions: live.reduce((n, x) => n + x.contradictions.length, 0),
    contradictingCases: live.filter((x) => x.contradictions.length > 0).map((x) => ({ id: x.id, contradictions: x.contradictions })),
  },
  passed: live.every((x) => x.contradictions.length === 0),
  passedNote: 'corroboration, not proof: two conservative implementations can agree and both be wrong in the same direction',
};
if (OUT) { mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, `${JSON.stringify(record, null, 2)}\n`); }
process.stdout.write(`${JSON.stringify(record.summary, null, 2)}\npassed: ${record.passed}\n`);
if (!record.passed) process.exitCode = 1;
