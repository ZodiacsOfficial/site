/**
 * Runs the analytic suite through the bounded search and asserts the verdict,
 * the root count and -- where the topology is certified -- that every true
 * root lies inside a returned epsilon bracket and no extra bracket exists.
 *
 *   node test-analytic.mjs            run and assert
 *   node test-analytic.mjs --json     also write raw/analytic-results.json
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { classifyInterval, VERDICTS } from './lib/interval-search.mjs';
import { ANALYTIC_CASES } from './analytic-cases.mjs';

const results = [];

for (const testCase of ANALYTIC_CASES) {
  test(testCase.id, () => {
    const result = classifyInterval({
      label: testCase.id,
      f: testCase.f,
      fPrime: testCase.fPrime,
      derivativeEnclosure: testCase.derivativeEnclosure,
      secondDerivativeEnclosure: testCase.secondDerivativeEnclosure ?? null,
      a: testCase.a, b: testCase.b,
      epsilon: testCase.epsilon, minWidth: testCase.minWidth,
      maxEvaluations: testCase.maxEvaluations ?? 50000,
      boundKind: 'proven',
      exactArithmetic: testCase.exactArithmetic,
    });
    results.push({ id: testCase.id, what: testCase.what, truth: testCase.truth, result: strip(result) });

    assert.ok(VERDICTS.includes(result.verdict), `${testCase.id}: verdict must be one of the declared types`);
    assert.equal(result.verdict, testCase.truth.verdict, `${testCase.id}: verdict`);
    if (testCase.truth.outcome) assert.equal(result.outcome, testCase.truth.outcome, `${testCase.id}: outcome`);
    assert.equal(result.rootCount, testCase.truth.rootCount ?? null, `${testCase.id}: root count`);

    if ('possibleRootCounts' in testCase.truth) {
      assert.deepEqual(result.possibleRootCounts, testCase.truth.possibleRootCounts, `${testCase.id}: possible root counts`);
    }

    if (result.certified) {
      // A certified verdict must locate every true root and invent none.
      const roots = testCase.truth.rootsAt ?? [];
      assert.equal(result.crossings.length, roots.length, `${testCase.id}: bracket count`);
      roots.forEach((root, i) => {
        const bracket = result.crossings[i];
        const pad = Math.max(testCase.minWidth * 4, 1e-9);
        assert.ok(bracket.lo - pad <= root && root <= bracket.hi + pad,
          `${testCase.id}: true root ${root} must lie in bracket [${bracket.lo}, ${bracket.hi}]`);
      });
    } else {
      // An uncertified verdict must never present a root list as exhaustive.
      assert.equal(result.crossings, null, `${testCase.id}: no root list on an uncertified verdict`);
      assert.ok(result.partialUncertifiedFindings, `${testCase.id}: partial findings must be labelled`);
      assert.match(result.partialUncertifiedFindings.warning, /NOT EXHAUSTIVE/, `${testCase.id}: partial findings must be labelled non-exhaustive`);
    }
  });
}

test('every verdict name is used by at least one analytic case', () => {
  const seen = new Set(ANALYTIC_CASES.map((x) => x.truth.verdict));
  for (const verdict of VERDICTS) assert.ok(seen.has(verdict), `no analytic case exercises ${verdict}`);
});

test('write raw results', () => {
  mkdirSync(new URL('./raw/', import.meta.url), { recursive: true });
  writeFileSync(new URL('./raw/analytic-results.json', import.meta.url),
    `${JSON.stringify({
      what: 'Bounded typed-verdict search over analytic functions with known topology.',
      boundKind: 'proven -- closed-form interval arithmetic for f\' and f\'\'; these completeness claims are theorems, not sampled observations.',
      generatedBy: 'node test-analytic.mjs',
      cases: results,
    }, null, 2)}\n`);
});

function strip(result) {
  const { notes, ...rest } = result;
  return { ...rest, notes };
}
