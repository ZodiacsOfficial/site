/**
 * The synthetic regression benchmark for the adapter's comparison.
 *
 *   node tests/mcp-benchmark.mjs
 *
 * Reads the pre-registered expectations in
 * docs/platform/evidence/mcp-adapter/benchmark-expectations.json, builds each
 * scenario's two records through the real MCP server, compares them through the
 * real MCP server, and scores every assertion.
 *
 * What this is and is not, restated here because the number it prints invites
 * the wrong reading: it is a fixed corpus of constructed cases with the
 * classification each should receive, written from the comparison's rules
 * before the candidate ran against any of them. It is not an accuracy rate.
 * Both sides of every pair come from the same engine, so it measures whether
 * the comparison classifies the cases its own rules describe — not how often it
 * is right about a disagreement between independently authored software, and
 * not anything at all about real users, whose charts are not in it.
 *
 * Nothing here may be loosened to make a scenario pass. A mismatch is either a
 * defect in the comparison or a wrong expectation, and the record says which.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SERVER = resolve(ROOT, 'examples/mcp-server/server.mjs');
const OUT = resolve(ROOT, 'docs/platform/evidence/mcp-adapter');
const PLAN = join(OUT, 'benchmark-expectations.json');

const RANK = { unresolved: 0, hypothesis: 1, reported: 2, reproduced: 3 };
const CUSP = /^cusp-\d+$/;

/** One observation of a comparison, in the terms the expectations speak. */
function observe(comparison) {
  const differences = comparison.differences ?? [];
  const explanations = comparison.explanations ?? [];
  const ranked = explanations.map((row) => RANK[row.evidence] ?? -1);
  return {
    identical: comparison.identical,
    differences,
    explanations,
    limits: comparison.limits ?? [],
    differenceIds: new Set(differences.map((row) => row.id)),
    cuspRows: differences.filter((row) => CUSP.test(row.id)).length,
    kinds: new Set(differences.map((row) => row.kind)),
    explanationIds: explanations.map((row) => row.id),
    strongest: explanations.length === 0 ? null
      : Object.keys(RANK).find((name) => RANK[name] === Math.max(...ranked)) ?? null,
    unresolvedRows: explanations.find((row) => row.evidence === 'unresolved')?.covers ?? [],
    hypothesisCount: explanations.filter((row) => row.evidence === 'hypothesis').length,
  };
}

const deltasOfKind = (view, kind) => view.differences
  .filter((row) => row.kind === kind && typeof row.delta === 'number' && Number.isFinite(row.delta))
  .map((row) => Math.abs(row.delta));

/** Each predicate returns the observed value alongside its verdict, so a
 * failure records what actually happened rather than only that it differed. */
const PREDICATES = {
  identical: (want, view) => [view.identical === want, view.identical],
  explanationCountEqual: (want, view) => [view.explanations.length === want, view.explanations.length],
  differenceIdsInclude: (want, view) => {
    const missing = want.filter((id) => !view.differenceIds.has(id));
    return [missing.length === 0, { missing }];
  },
  differenceIdsExclude: (want, view) => {
    const present = want.filter((id) => view.differenceIds.has(id));
    return [present.length === 0, { unexpectedlyPresent: present }];
  },
  cuspRowsEqual: (want, view) => [view.cuspRows === want, view.cuspRows],
  allDifferenceKindsIn: (want, view) => {
    const outside = [...view.kinds].filter((kind) => !want.includes(kind));
    return [outside.length === 0, { outside, kinds: [...view.kinds] }];
  },
  differenceKindsInclude: (want, view) => {
    const missing = want.filter((kind) => !view.kinds.has(kind));
    return [missing.length === 0, { missing, kinds: [...view.kinds] }];
  },
  strongestEvidence: (want, view) => [view.strongest === want, view.strongest],
  noEvidenceStrongerThan: (want, view) => [
    (view.strongest === null ? -1 : RANK[view.strongest]) <= RANK[want],
    view.strongest,
  ],
  unresolvedRowsEqual: (want, view) => [view.unresolvedRows.length === want, view.unresolvedRows],
  explanationIdsInclude: (want, view) => {
    const missing = want.filter((id) => !view.explanationIds.includes(id));
    return [missing.length === 0, { missing, present: view.explanationIds }];
  },
  explanationEvidence: (want, view) => {
    const actual = view.explanations.find((row) => row.id === want.explanation)?.evidence ?? null;
    return [actual === want.evidence, actual];
  },
  explanationExcludesPattern: (want, view) => {
    const claimed = view.explanations.find((row) => row.id === want.explanation)?.covers ?? null;
    if (claimed === null) return [false, 'that explanation was not offered at all'];
    const offending = claimed.filter((id) => new RegExp(want.pattern).test(id));
    return [offending.length === 0, { offending }];
  },
  explanationStatementExcludes: (want, view) => {
    const statement = view.explanations.find((row) => row.id === want.explanation)?.statement ?? null;
    if (statement === null) return [true, 'that explanation was not offered, so it says nothing'];
    return [!new RegExp(want.pattern).test(statement), statement];
  },
  rowValuesWithheld: (want, view) => {
    const row = view.differences.find((entry) => entry.id === want.id);
    if (!row) return [false, 'no such row'];
    return [row.valuesWithheld === true && row.left === undefined && row.right === undefined, row];
  },
  rowDeltaBelow: (want, view) => {
    const row = view.differences.find((entry) => entry.id === want.id);
    if (!row || typeof row.delta !== 'number') return [false, 'no such row, or it carries no delta'];
    return [Math.abs(row.delta) < want.magnitude, row.delta];
  },
  rowValuesStraddleZero: (want, view) => {
    const row = view.differences.find((entry) => entry.id === want.id);
    if (!row) return [false, 'no such row'];
    const a = Number(row.left);
    const b = Number(row.right);
    const straddles = (a <= want.low && b >= want.high) || (b <= want.low && a >= want.high);
    return [straddles, { left: row.left, right: row.right }];
  },
  hypothesisCountAtLeast: (want, view) => [view.hypothesisCount >= want, view.hypothesisCount],
  limitsMatch: (want, view) => {
    const pattern = new RegExp(want);
    return [view.limits.some((line) => pattern.test(line)), view.limits];
  },
  smallestNumericDeltaBelowLargestDisplayDelta: (want, view) => {
    const numeric = deltasOfKind(view, 'numeric');
    const display = deltasOfKind(view, 'display');
    if (numeric.length === 0 || display.length === 0) return [false, { numeric: numeric.length, display: display.length }];
    const smallestReal = Math.min(...numeric);
    const largestRounding = Math.max(...display);
    return [(smallestReal < largestRounding) === want, { smallestReal, largestRounding }];
  },
};

/**
 * The drive runs against the built artifact, so a source edit without a
 * rebuild would quietly measure the previous bundle. This already happened
 * twice while these drives were written, so it is a hard stop rather than a
 * warning.
 */
async function requireFreshBundle() {
  const { buildServerBundle } = await import('../scripts/build-mcp-server.mjs');
  const [{ bytes }, current] = await Promise.all([buildServerBundle(), readFile(SERVER)]);
  if (!current.equals(bytes)) {
    console.error('examples/mcp-server/server.mjs is stale;'
      + ' run node scripts/build-mcp-server.mjs before driving it');
    process.exit(1);
  }
}
await requireFreshBundle();

const plan = JSON.parse(await readFile(PLAN, 'utf8'));
const transport = new StdioClientTransport({ command: process.execPath, args: [SERVER], cwd: ROOT, stderr: 'pipe' });
const client = new Client({ name: 'zodiacs-mcp-benchmark', version: '1.0.0' });
const startedAt = new Date().toISOString();
const scenarios = [];

async function structured(name, args) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) throw new Error(`${name} refused: ${result.content?.[0]?.text ?? ''}`);
  return result.structuredContent;
}

const recordFor = async (input) => (await structured('calculate_natal_chart', { ...input, output: 'record' })).record;

/**
 * Edits a record's claims without touching its computed values, so a scenario
 * is exactly "the same numbers, a different stated provenance" plus whatever
 * else it varies. Each edit has to survive the engine's own parser, which the
 * runner checks by comparing what comes back.
 *
 * `instant` is the sharp one: the parser accepts a record whose declared
 * instant is not the one its values came from, because it checks internal
 * coherence rather than that the result follows from the inputs. That is what
 * makes a missing baseline check reachable.
 */
function editClaims(record, edit) {
  const parsed = JSON.parse(record);
  if (edit.engineVersion !== undefined) parsed.receipt.engine.version = edit.engineVersion;
  if (edit.buildMetadata !== undefined) {
    parsed.receipt.engine.version = `${parsed.receipt.engine.version}+${edit.buildMetadata}`;
  }
  if (edit.declaredInstant !== undefined) {
    parsed.receipt.instant = new Date(edit.declaredInstant).toISOString();
    parsed.receipt.sourceInstant = edit.declaredInstant;
  }
  return JSON.stringify(parsed);
}

try {
  await client.connect(transport);
  for (const scenario of plan.scenarios) {
    let left = await recordFor(scenario.left);
    let right = await recordFor(scenario.right);
    for (const edit of scenario.mutate ? [scenario.mutate].flat() : []) {
      const patched = editClaims(edit.side === 'right' ? right : left, edit);
      if (edit.side === 'right') right = patched; else left = patched;
    }
    // Most scenarios read the default response. A scenario whose assertions
    // inspect absolute values has to say so, because the default withholds
    // them for rows carrying birth details or computed positions.
    const compareArgs = { left, right, ...(scenario.compareOutput ? { output: scenario.compareOutput } : {}) };
    const view = observe(await structured('compare_calculation_records', compareArgs));
    const assertions = Object.entries(scenario.expect).map(([predicate, want]) => {
      const run = PREDICATES[predicate];
      if (!run) return { predicate, want, ok: false, observed: 'no such predicate in the runner' };
      const [ok, observed] = run(want, view);
      return { predicate, want, ok, observed };
    });
    // Argument order must not decide a verdict. Checked structurally, on every
    // scenario that asks for it, rather than as a second copy of the scenario.
    if (scenario.orderIndependent) {
      const swapped = observe(await structured('compare_calculation_records', { ...compareArgs, left: right, right: left }));
      const evidenceOf = (v) => Object.fromEntries(v.explanations.map((row) => [row.id, row.evidence]));
      const forward = evidenceOf(view);
      const reverse = evidenceOf(swapped);
      const shared = [...new Set([...Object.keys(forward), ...Object.keys(reverse)])]
        .filter((id) => id !== 'unexplained');
      const mismatched = shared.filter((id) => forward[id] !== reverse[id]);
      assertions.push({
        predicate: 'sameVerdictWhenReversed',
        want: true,
        ok: mismatched.length === 0 && view.identical === swapped.identical,
        observed: mismatched.length === 0 ? 'same' : mismatched.map((id) => ({ id, forward: forward[id], reverse: reverse[id] })),
      });
    }
    scenarios.push({
      id: scenario.id,
      required: scenario.required,
      differences: view.differences.length,
      explanations: view.explanations.map((row) => ({ id: row.id, evidence: row.evidence, covers: row.covers.length })),
      assertions: assertions.length,
      passed: assertions.filter((row) => row.ok).length,
      failures: assertions.filter((row) => !row.ok),
    });
  }
} finally {
  await client.close().catch(() => {});
}

const totalAssertions = scenarios.reduce((sum, row) => sum + row.assertions, 0);
const passedAssertions = scenarios.reduce((sum, row) => sum + row.passed, 0);
const passedScenarios = scenarios.filter((row) => row.passed === row.assertions).length;
const bundle = await readFile(SERVER);

await writeFile(join(OUT, 'benchmark.json'), `${JSON.stringify({
  kind: plan.kind,
  whatItIsNot: plan.whatItIsNot,
  startedAt,
  completedAt: new Date().toISOString(),
  node: process.version,
  server: { path: 'examples/mcp-server/server.mjs', sha256: createHash('sha256').update(bundle).digest('hex') },
  expectationsSha256: createHash('sha256').update(await readFile(PLAN)).digest('hex'),
  scenarios: { passed: passedScenarios, of: scenarios.length },
  assertions: { passed: passedAssertions, of: totalAssertions },
  detail: scenarios,
}, null, 2)}\n`);

console.log(`mcp-benchmark: ${passedScenarios}/${scenarios.length} scenarios,`
  + ` ${passedAssertions}/${totalAssertions} assertions (synthetic regression corpus, not an accuracy rate)`);
for (const row of scenarios) {
  if (row.failures.length === 0) continue;
  console.error(`  ${row.id}: ${row.passed}/${row.assertions}`);
  for (const failure of row.failures) {
    console.error(`    ${failure.predicate}: wanted ${JSON.stringify(failure.want)},`
      + ` observed ${JSON.stringify(failure.observed)}`);
  }
}
if (passedAssertions !== totalAssertions) process.exitCode = 1;
