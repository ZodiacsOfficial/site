/**
 * Where a deflected search actually spends itself, measured on the REAL
 * runtime rather than on a copy.
 *
 *   node tools/measure/cost-baseline.mjs --pack=/path/to.zeph [--out=file.json]
 *
 * ## Why the live code and not a copy
 *
 * The answer this produces is the premise of every optimisation that
 * follows it. An instrumented rewrite measures the rewrite, and its
 * equivalence to the original then sits unproved underneath all of it. So
 * `src/core/instrument.mjs` threads a sink into the live search, switched
 * off by default, and this tool switches it on.
 *
 * The cost of that decision is measured here too: every case is run TWICE,
 * once with the sink installed and once without, and the two runs must
 * agree on events, evaluations and cells exactly. If they do not, the
 * instrumentation is perturbing what it measures and every number below is
 * void.
 *
 * ## The cases
 *
 * The same five the brief names, built by `DEFLECTION-EVALUATION.md`
 * section 8's own construction -- 300-day windows from 1975-01-01, one per
 * body, 900 days apart, target longitude taken from the reference at the
 * window midpoint -- so these requests are the requests the holdout ran,
 * not easier ones chosen to look good.
 *
 * ## Two axes, because one is not enough
 *
 * PHASE says what kind of work a unit was: an observer enclosure, the
 * light-time solve, a target enclosure, the Sun's two enclosures, the
 * domain test, the deflection, the frame, the aberration.
 *
 * LABEL says why the search was doing it: a seed cell, a cell split
 * because its enclosures were loose, a cell split because its elongation
 * enclosure straddled the domain floor, or a cell split because neither
 * the exclusion nor the monotone test had closed it yet.
 *
 * The second axis is the one that matters here, and it cannot be recovered
 * from the first: an enclosure built while bisecting toward a conjunction
 * boundary is the same KIND of work as one built while isolating a root.
 *
 * ## Preprocessing counts
 *
 * The pack open, the reference construction and the target-longitude
 * lookup are timed and reported with the rest. Moving expensive work
 * outside the measured region is not an improvement, and the only defence
 * against doing it accidentally is to measure the whole thing.
 */
import { writeFileSync } from 'node:fs';
import { openPackFile } from '../../src/node.mjs';
import { makeDeflectedReference } from '../../test/tier-b/_deflected-reference.mjs';
import { searchDeflectedLongitude, searchOfDateLongitude } from '../../src/core/retarded-search.mjs';
import { setInstrumentSink } from '../../src/core/instrument.mjs';

const args = new Map();
for (const a of process.argv.slice(2)) { const [k, v] = a.split('='); args.set(k.replace(/^--/, ''), v ?? true); }
const PACK = args.get('pack');
const OUT = args.get('out') ?? null;
const ONLY = args.get('only') ? String(args.get('only')).split(',') : null;
if (!PACK) { process.stderr.write('--pack is required\n'); process.exit(2); }

const DAY = 86400;
const J2000_UTC = Date.UTC(2000, 0, 1, 12);
const tdb = (iso) => (Date.parse(iso) - J2000_UTC) / 1000 + 69.184;
const plus = (iso, days) => `${new Date(Date.parse(iso) + days * DAY * 1000).toISOString().slice(0, 10)}T00:00:00Z`;
const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

/** A sink that accumulates into a Map, with Node's monotonic clock. */
function makeSink() {
  const tally = new Map();
  return {
    tally,
    now: process.hrtime.bigint,
    mark(bucket, what, amount) {
      let row = tally.get(bucket);
      if (row === undefined) { row = { evaluations: 0, cells: 0, nanos: 0n }; tally.set(bucket, row); }
      if (what === 'nanos') row.nanos += amount;
      else row[what] = (row[what] ?? 0) + amount;
    },
  };
}

const plain = (tally) => Object.fromEntries([...tally].map(([k, v]) => [k, {
  evaluations: v.evaluations, cells: v.cells, ms: Number(v.nanos) / 1e6,
}]));

// ---------------------------------------------------------- preprocessing
const pre0 = process.hrtime.bigint();
const rt = await openPackFile(PACK);
const eph = rt.ephemeris;
const ref = makeDeflectedReference(eph);
const CASES = [];
for (let i = 0; i < BODIES.length; i += 1) {
  const body = BODIES[i];
  const fromIso = plus('1975-01-01T00:00:00Z', 900 * i);
  const toIso = plus(fromIso, 300);
  const from = tdb(fromIso);
  const to = tdb(toIso);
  const lon = ref.lonDeg(body, (from + to) / 2);
  if (lon === null) continue;
  const targetDeg = Number(lon.toFixed(6));
  CASES.push({ id: `F${i + 1}`, body, from, to, fromIso, toIso, targetDeg });
  CASES.push({ id: `A${i + 1}`, body, from, to, fromIso, toIso, targetDeg: Number(((targetDeg + 180) % 360).toFixed(6)) });
}
const preprocessingMs = Number(process.hrtime.bigint() - pre0) / 1e6;

/**
 * The five the brief names. F2/A2 are the two that exhausted their budgets,
 * F3 is the most expensive that finished, F7 is a slow body WITH a
 * conjunction, and F6 is an ordinary case with none -- the control that
 * says whether a change costs anything where there is no exclusion.
 */
const SELECTED = ONLY ?? ['F2', 'A2', 'F3', 'F7', 'F6'];
const WHY = {
  F2: 'Moon, budget exhausted in the recorded run',
  A2: 'Moon antipode, budget exhausted in the recorded run',
  F3: 'Mercury, the most expensive case that finished (831x the of-date rung)',
  F7: 'Saturn, a slow body whose window contains one conjunction (61x)',
  F6: 'Jupiter, an ordinary window with no conjunction (1.75x) -- the control',
};

const rows = [];
for (const id of SELECTED) {
  const c = CASES.find((x) => x.id === id);
  if (!c) { rows.push({ id, error: 'no such case' }); continue; }
  const spec = { body: c.body, targetDeg: c.targetDeg, fromTdbSec: c.from, toTdbSec: c.to };

  // 0. A warm-up, discarded. The first measurement of a case was 41 PER
  //    CENT faster with the sink installed than without it, which is not
  //    a property of the sink: it is the second run of the same code on a
  //    warm JIT. Timing the first execution of anything here would make
  //    every comparison below a comparison of compilation states.
  searchDeflectedLongitude(eph, spec);

  // 1. The run as it ships: no sink, nothing installed.
  const t0 = process.hrtime.bigint();
  const bare = searchDeflectedLongitude(eph, spec);
  const bareMs = Number(process.hrtime.bigint() - t0) / 1e6;

  // 2. The of-date rung on the same request, for the ratio the results
  //    document reports.
  const o0 = process.hrtime.bigint();
  const ofDate = searchOfDateLongitude(eph, spec);
  const ofDateMs = Number(process.hrtime.bigint() - o0) / 1e6;

  // 3. The same run with the sink installed.
  // A second bare run, so the sink's cost is measured against a
  // like-for-like neighbour rather than against a colder one.
  const t0b = process.hrtime.bigint();
  searchDeflectedLongitude(eph, spec);
  const bareMs2 = Number(process.hrtime.bigint() - t0b) / 1e6;

  const sink = makeSink();
  setInstrumentSink(sink);
  const i0 = process.hrtime.bigint();
  let probed;
  try { probed = searchDeflectedLongitude(eph, spec); } finally { setInstrumentSink(null); }
  const probedMs = Number(process.hrtime.bigint() - i0) / 1e6;

  // 4. The instrumentation must not have changed the answer.
  const sameAnswer = bare.execution.evaluations === probed.execution.evaluations
    && bare.execution.cells === probed.execution.cells
    && bare.events.length === probed.events.length
    && bare.events.every((e, i) => e.tdbSec === probed.events[i].tdbSec)
    && bare.accounting.excluded.length === probed.accounting.excluded.length
    && bare.accounting.unresolved.length === probed.accounting.unresolved.length;

  const buckets = plain(sink.tally);
  const phases = Object.fromEntries(Object.entries(buckets).filter(([k]) => !k.startsWith('by:')));
  const labels = Object.fromEntries(Object.entries(buckets).filter(([k]) => k.startsWith('by:'))
    .map(([k, v]) => [k.slice(3), v]));

  rows.push({
    id,
    why: WHY[id] ?? null,
    body: c.body,
    windowIso: [c.fromIso, c.toIso],
    windowTdbSec: [c.from, c.to],
    targetDeg: c.targetDeg,
    status: bare.execution.status,
    established: bare.completeness.established,
    found: bare.events.length,
    excludedRuns: bare.accounting.excluded.length,
    unresolvedRuns: bare.accounting.unresolved.length,
    evaluations: bare.execution.evaluations,
    cells: bare.execution.cells,
    ofDateEvaluations: ofDate.execution.evaluations,
    ratioToOfDate: ofDate.execution.evaluations ? bare.execution.evaluations / ofDate.execution.evaluations : null,
    bareMs,
    bareMs2,
    ofDateMs,
    probedMs,
    // Against the SECOND bare run, both warm. The spread between the two
    // bare runs is reported beside it so a reader can see how much of any
    // difference is just run-to-run noise.
    instrumentationOverheadPct: bareMs2 > 0 ? ((probedMs - bareMs2) / bareMs2) * 100 : null,
    bareRunSpreadPct: bareMs > 0 ? ((bareMs2 - bareMs) / bareMs) * 100 : null,
    instrumentationChangedTheAnswer: !sameAnswer,
    phases,
    labels,
  });
  process.stderr.write(`${id} ${c.body}: ${bare.execution.status}, ${bare.execution.evaluations} evals, ${bare.execution.cells} cells, ${Math.round(bareMs)} ms\n`);
}

const record = {
  ranAt: new Date().toISOString(),
  pack: { path: PACK, digest: rt.integrity.computedDigest },
  node: process.version,
  preprocessingMs,
  caseConstruction: 'DEFLECTION-EVALUATION.md section 8, unchanged: 300-day windows from 1975-01-01, 900 days apart per body, target longitude from the reference at the window midpoint',
  note: 'Phases say what KIND of work a unit was. Labels say WHY the search was doing it. Both are the same partition of the same run, charged through the same spend() the budget counts.',
  rows,
  anyInstrumentationChangedTheAnswer: rows.some((r) => r.instrumentationChangedTheAnswer),
};
rt.dispose();

const text = `${JSON.stringify(record, null, 2)}\n`;
if (OUT) writeFileSync(OUT, text);
else process.stdout.write(text);
if (record.anyInstrumentationChangedTheAnswer) {
  process.stderr.write('THE INSTRUMENTATION CHANGED AN ANSWER; every number here is void\n');
  process.exitCode = 1;
}
