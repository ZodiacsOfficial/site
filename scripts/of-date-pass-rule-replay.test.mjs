/**
 * The of-date holdout's pass rule was amended after the run, and
 * `OF-DATE-RESULTS.md` section 4 says the amendment was a RELAXATION whose
 * whole effect was to turn F9 and F10 from failures into passes.
 *
 * That is a claim about a run nobody can re-execute here — the coefficient
 * pack is not in the repository — so it is checked the one way it can be:
 * by replaying both predicates over the committed rows. Every field either
 * predicate reads is in `holdout-run.json`, so the replay is exact.
 *
 * This guard exists because the claim is the kind that quietly stops being
 * true. If the rows are ever regenerated, or either predicate is edited,
 * the document's four statements have to be re-derived rather than
 * inherited. The replay needs no pack and no network, so it can run in CI
 * where the holdout itself cannot.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const tool = resolve(root, 'examples/precision-alpha/tools/measure/replay-of-date-pass-rule.mjs');
const committed = resolve(root, 'docs/platform/evidence/precision-of-date/pass-rule-replay/replay.json');

describe('the of-date pass-rule amendment is still a relaxation', () => {
  const replay = () => JSON.parse(execFileSync(process.execPath, [tool], { encoding: 'utf8' }));

  it('replays both predicates over the committed rows and every claim holds', () => {
    const r = replay();
    // Named individually: a bare `passed` would say something broke
    // without saying which half of the section stopped being true.
    const byId = Object.fromEntries(r.claims.map((c) => [c.id, c]));
    expect(byId.subset.holds, byId.subset.detail).toBe(true);
    expect(byId['difference-is-f9-f10'].holds, byId['difference-is-f9-f10'].detail).toBe(true);
    expect(byId['old-rule-failed-the-run'].holds, byId['old-rule-failed-the-run'].detail).toBe(true);
    expect(byId['new-rule-clean'].holds, byId['new-rule-clean'].detail).toBe(true);
    expect(r.passed).toBe(true);
  });

  it('and the amendment moved exactly F9 and F10, not some other pair', () => {
    const r = replay();
    expect([...r.becamePasses].sort()).toEqual(['F10', 'F9']);
    expect(r.newlyFailing).toEqual([]);
    // The old rule has to have failed something, or "relaxation" describes
    // nothing and the section is about a change that did not happen.
    expect(r.oldRule.failures.length).toBe(2);
    expect(r.newRule.failures.length).toBe(0);
  });

  it('the committed replay matches what the tool produces now', () => {
    // The evidence file is the artifact a reader opens. If it drifts from
    // the tool, the reader is reading a different run from the one CI
    // checks.
    //
    // A whole-object comparison needs the object to contain nothing that
    // varies by machine. The first version of this failed that: the tool
    // recorded the record's ABSOLUTE path, which is different on every
    // checkout, so the committed evidence only matched on the worktree
    // that produced it -- and this comment congratulated itself for
    // having no timestamp while the path sat two lines above. It is
    // repo-relative now.
    const fresh = replay();
    expect(fresh.replayedFrom.startsWith('/'), 'the replay records a machine-specific absolute path').toBe(false);
    const stored = JSON.parse(readFileSync(committed, 'utf8'));
    expect(fresh).toEqual(stored);
  });
});
