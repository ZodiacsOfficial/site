/**
 * Replay BOTH of-date pass rules over the committed holdout rows.
 *
 *   node tools/measure/replay-of-date-pass-rule.mjs
 *   node tools/measure/replay-of-date-pass-rule.mjs --check
 *   node tools/measure/replay-of-date-pass-rule.mjs --out replay.json
 *
 * ## Why this exists
 *
 * `OF-DATE-RESULTS.md` section 4 says the pass rule changed after the run
 * and that the change was a RELAXATION: the old clause failed F9 and F10,
 * the new one fails nothing, and the new predicate is the old one
 * conjoined with further conditions. It then says, correctly, what a
 * reader could not do about it:
 *
 *   "One thing a reader cannot check from the repository: the failing run.
 *    `holdout-run.json` was committed alongside the rule change, so the
 *    only committed record was produced under the new rule. That the old
 *    rule failed these two is verifiable by replaying its predicate over
 *    the recorded rows, which is how it was confirmed -- but it is not an
 *    artifact here."
 *
 * This is that artifact. It does not re-run the holdout and cannot: the
 * pack is not in the repository. It replays both predicates over the rows
 * the committed record already contains, which is enough, because every
 * field either predicate reads is in those rows.
 *
 * ## What it can and cannot establish
 *
 * It establishes the RELATION BETWEEN THE TWO RULES on this recorded run:
 * which cases each fails, that one set is a subset of the other, and that
 * the difference is exactly {F9, F10}. That is the claim section 4 makes.
 *
 * It does NOT establish that the recorded rows are what the solver would
 * produce today, or that the old rule is the one that was really in the
 * file before the change -- for the second, `git log` on
 * `tools/measure/of-date-holdout.mjs` is the record, and the old clause is
 * quoted verbatim below so the two can be compared by eye. A replay is a
 * replay.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const check = argv.includes('--check');
const outAt = argv.indexOf('--out');
const outPath = outAt >= 0 ? argv[outAt + 1] : null;
const recordPath = argv.find((a) => a.endsWith('.json') && a !== argv[outAt + 1])
  ?? new URL('../../../../docs/platform/evidence/precision-of-date/holdout-run.json', import.meta.url).pathname;

const record = JSON.parse(readFileSync(recordPath, 'utf8'));

/**
 * THE OLD CLAUSE, as the aberrated tool had it and as the of-date tool
 * inherited it before the change: crossings but no ladder is a failure.
 * Quoted rather than reconstructed, so what is replayed is what was there.
 */
function oldClause(r) {
  if (r.found > 0 && !r.ladder) {
    return `${r.id}: found ${r.found} crossings but no rung-by-rung comparison`;
  }
  return null;
}

/**
 * THE NEW CLAUSE, copied from `of-date-holdout.mjs`. Three branches where
 * the old one had a single condition, and every branch is the old
 * condition conjoined with more -- which is what makes it a relaxation.
 */
function newClause(r) {
  if (r.found > 0 && !r.ladder) {
    if (!r.frameSeparated) {
      return `${r.id}: found ${r.found} crossings but no rung comparison and no frame attribution`;
    }
    if (!r.frameSeparated.corroborated) {
      return `${r.id}: the rungs disagree (${r.frameSeparated.aberratedRoots} against ${r.frameSeparated.ofDateRoots})`
        + ` and the independent references do not show the same difference`;
    }
    if (!r.frameSeparated.lowerRungsAgree) {
      return `${r.id}: the frame separation is corroborated, but rungs 1 to 3 do not agree with each other`;
    }
  }
  return null;
}

const rows = record.rows ?? [];
const oldFails = rows.map(oldClause).filter(Boolean);
const newFails = rows.map(newClause).filter(Boolean);
const idsOf = (xs) => xs.map((m) => m.split(':')[0]);
const oldIds = idsOf(oldFails);
const newIds = idsOf(newFails);
const becamePasses = oldIds.filter((id) => !newIds.includes(id));
const newlyFailing = newIds.filter((id) => !oldIds.includes(id));

/**
 * The claim under test, stated as four conditions rather than one verdict,
 * so a failure says which part stopped holding.
 */
const claims = [
  {
    id: 'subset',
    says: 'the new rule fails a subset of what the old one failed, which is what makes it a relaxation',
    holds: newlyFailing.length === 0,
    detail: newlyFailing.length === 0 ? 'nothing new fails' : `newly failing: ${newlyFailing.join(', ')}`,
  },
  {
    id: 'difference-is-f9-f10',
    says: 'the cases the relaxation turned from failures into passes are exactly F9 and F10',
    holds: becamePasses.length === 2 && becamePasses.includes('F9') && becamePasses.includes('F10'),
    detail: `became passes: ${becamePasses.join(', ') || 'none'}`,
  },
  {
    id: 'old-rule-failed-the-run',
    says: 'under the old rule this recorded run did NOT pass, so the amendment was not cosmetic',
    holds: oldFails.length > 0,
    detail: `old rule failures: ${oldFails.length}`,
  },
  {
    id: 'new-rule-clean',
    says: 'under the new rule this clause reports nothing on this run',
    holds: newFails.length === 0,
    detail: `new rule failures: ${newFails.length}`,
  },
];

/**
 * The whole committed problem list is empty, and this clause is only part
 * of the rule. Replaying the old clause alone cannot say the old RULE
 * failed only here -- but it can say the committed record carried no other
 * problem, so the old clause's two are the whole difference.
 */
const otherProblems = (record.problems ?? []).filter((p) => !oldIds.some((id) => p.startsWith(`${id}:`)));

const result = {
  replayedFrom: recordPath,
  recordRanAt: record.ranAt ?? null,
  recordRule: record.rule ?? null,
  cases: rows.length,
  oldRule: { clause: 'crossings but no ladder is a failure', failures: oldFails },
  newRule: { clause: 'crossings, no ladder, and either no frame attribution, or an uncorroborated one, or disagreeing lower rungs', failures: newFails },
  becamePasses,
  newlyFailing,
  committedProblemsUnrelatedToThisClause: otherProblems,
  claims,
  passed: claims.every((c) => c.holds),
  note: 'A relaxation, replayed. This artifact exists because the failing run itself is not in the repository; see the header.',
};

const text = `${JSON.stringify(result, null, 2)}\n`;
if (outPath) writeFileSync(outPath, text);
if (check) {
  for (const c of claims) {
    process.stdout.write(`${c.holds ? 'ok  ' : 'FAIL'} ${c.id}: ${c.detail}\n`);
  }
  process.stdout.write(result.passed
    ? 'the amendment is a relaxation and its whole effect on this run is F9 and F10\n'
    : 'the replay does not support what OF-DATE-RESULTS.md section 4 says\n');
  if (!result.passed) process.exitCode = 1;
} else {
  process.stdout.write(text);
}
