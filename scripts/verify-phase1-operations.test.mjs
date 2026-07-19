import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  canonicalSha256,
  latestConsecutiveEvidence,
  operationReceiptFailures,
  repositoryEvidenceFailures,
  REQUIRED_STEPS,
  scheduledTargetDate,
  validateCutoverOptions,
} from './verify-phase1-operations.mjs';

const cutoverSha = '2'.repeat(40);

const entry = (targetDate, valid = true, runId = Number(targetDate.replaceAll('-', ''))) => ({
  targetDate,
  valid,
  runId,
  createdAt: `${targetDate}T03:30:00.000Z`,
});

const run = {
  id: 42,
  event: 'schedule',
  run_attempt: 1,
  created_at: '2026-07-20T00:15:00.000Z',
  html_url: 'https://github.com/ZodiacsOfficial/site/actions/runs/42',
  head_sha: '1'.repeat(40),
  path: '.github/workflows/daily-horoscopes.yml',
};

const receipt = {
  schema: 'zodiacs.daily-operation-receipt.v2',
  targetDate: '2026-07-20',
  event: 'schedule',
  runId: 42,
  runAttempt: 1,
  runUrl: run.html_url,
  commitSha: 'a'.repeat(40),
  publicationCanonicalSha256: 'b'.repeat(64),
  factsCanonicalSha256: 'c'.repeat(64),
  horoscopeProgramSha256: 'd'.repeat(64),
  liveVerification: 'exact-match',
  indexNow: 'accepted',
  completedAt: '2026-07-20T00:20:00.000Z',
};

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function repositoryFixture() {
  const facts = { schema: 'facts', date: '2026-07-20', bodies: [] };
  const publication = { schema: 'publication', date: '2026-07-20', signs: [] };
  const horoscopeProgram = { schema: 'program', anchorDate: '2026-07-20', signs: [] };
  const files = {
    facts: `${JSON.stringify(facts, null, 2)}\n`,
    publication: `${JSON.stringify(publication, null, 2)}\n`,
    horoscopeProgram: `${JSON.stringify(horoscopeProgram, null, 2)}\n`,
  };
  const manifest = {
    schema: 'manifest',
    date: '2026-07-20',
    facts: {
      fileSha256: sha256(files.facts),
      canonicalSha256: canonicalSha256(facts),
    },
    publication: { canonicalSha256: canonicalSha256(publication) },
  };
  files.manifest = `${JSON.stringify(manifest, null, 2)}\n`;
  return {
    receipt: {
      ...receipt,
      factsCanonicalSha256: canonicalSha256(facts),
      publicationCanonicalSha256: canonicalSha256(publication),
      horoscopeProgramSha256: canonicalSha256(horoscopeProgram),
    },
    evidence: {
      commit: { sha: receipt.commitSha },
      comparison: { status: 'ahead' },
      cutoverComparison: { status: 'ahead' },
      workflowSource: [
        'on:',
        '  schedule:',
        '    - cron: "0 0 * * *"',
        '      - name: Resolve explicit UTC target',
        '        run: echo "TARGET_DATE=$(date -u +%F)" >> "$GITHUB_ENV"',
      ].join('\n'),
      files,
    },
  };
}

describe('Phase 1 operation evidence', () => {
  it('requires all generation, live, discovery, and receipt steps', () => {
    expect(REQUIRED_STEPS).toEqual(expect.arrayContaining([
      'Resolve explicit UTC target',
      'Verify publication package',
      'Require exact edition in production',
      'Notify IndexNow',
      'Upload operation receipt',
    ]));
  });

  it('keeps only the latest uninterrupted daily success streak', () => {
    const evidence = [
      entry('2026-07-20'),
      entry('2026-07-21', false),
      entry('2026-07-22'),
      entry('2026-07-23'),
      entry('2026-07-24'),
    ];
    expect(latestConsecutiveEvidence(evidence).map((item) => item.targetDate)).toEqual([
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
    ]);
  });

  it('does not treat a skipped UTC date as consecutive', () => {
    const evidence = [entry('2026-07-20'), entry('2026-07-22')];
    expect(latestConsecutiveEvidence(evidence)).toEqual([evidence[1]]);
  });

  it('validates the immutable receipt fields rather than trusting its filename', () => {
    expect(operationReceiptFailures(receipt, run, '2026-07-20')).toEqual([]);
    expect(operationReceiptFailures({ ...receipt, event: 'workflow_dispatch' }, run, '2026-07-20')).toContain(
      'receipt event: expected schedule, received workflow_dispatch',
    );
    expect(operationReceiptFailures({ ...receipt, liveVerification: 'skipped' }, run, '2026-07-20')).toContain(
      'receipt liveVerification: expected exact-match, received skipped',
    );
  });

  it('rejects scheduled manual reruns even when the receipt mirrors the API attempt', () => {
    const rerun = { ...run, run_attempt: 2 };
    expect(operationReceiptFailures({ ...receipt, runAttempt: 2 }, rerun, '2026-07-20')).toContain(
      'GitHub run attempt: expected 1, received 2',
    );
    expect(operationReceiptFailures(receipt, rerun, '2026-07-20')).toContain(
      'receipt runAttempt: expected 2, received 1',
    );
  });

  it('derives the edition from GitHub job evidence, not a receipt or artifact date', () => {
    const delayedRun = { ...run, created_at: '2026-07-20T23:59:50.000Z' };
    const jobs = {
      jobs: [{
        run_attempt: 1,
        steps: [{
          name: 'Resolve explicit UTC target',
          conclusion: 'success',
          started_at: '2026-07-21T00:00:04.000Z',
        }],
      }],
    };
    const trustedDate = scheduledTargetDate(delayedRun, jobs);
    expect(trustedDate).toBe('2026-07-21');
    expect(operationReceiptFailures(receipt, delayedRun, trustedDate)).toContain(
      'receipt targetDate: expected 2026-07-21, received 2026-07-20',
    );
    expect(() => scheduledTargetDate(delayedRun, {
      jobs: [{ ...jobs.jobs[0], run_attempt: 2 }],
    })).toThrow('target job run attempt 2 does not match API run attempt 1');
  });

  it('reconciles every receipt hash to repository bytes at the recorded commit', () => {
    const fixture = repositoryFixture();
    expect(repositoryEvidenceFailures(
      fixture.receipt,
      run,
      '2026-07-20',
      cutoverSha,
      fixture.evidence,
    )).toEqual([]);
  });

  it('rejects fabricated hashes, unrelated commits, and a tampered horoscope program', () => {
    const fixture = repositoryFixture();
    const fabricated = {
      ...fixture.receipt,
      factsCanonicalSha256: 'e'.repeat(64),
      publicationCanonicalSha256: 'f'.repeat(64),
      horoscopeProgramSha256: '9'.repeat(64),
    };
    const failures = repositoryEvidenceFailures(fabricated, run, '2026-07-20', cutoverSha, {
      ...fixture.evidence,
      commit: { sha: '0'.repeat(40) },
      comparison: { status: 'diverged' },
      files: {
        ...fixture.evidence.files,
        horoscopeProgram: JSON.stringify({
          schema: 'program',
          anchorDate: '2026-07-19',
          signs: [{ sign: 'aries' }],
        }),
      },
    });
    expect(failures).toEqual(expect.arrayContaining([
      expect.stringContaining('repository commit: expected'),
      'receipt commit is not the GitHub run SHA or its descendant (diverged)',
      'repository horoscope program anchorDate: expected 2026-07-20, received 2026-07-19',
      expect.stringContaining('receipt facts canonical hash'),
      expect.stringContaining('receipt publication canonical hash'),
      expect.stringContaining('receipt horoscope program hash'),
    ]));
  });

  it('rejects a lookalike step when the run SHA workflow does not compute the UTC date', () => {
    const fixture = repositoryFixture();
    const failures = repositoryEvidenceFailures(fixture.receipt, run, '2026-07-20', cutoverSha, {
      ...fixture.evidence,
      workflowSource: [
        'on:',
        '  schedule:',
        '    - cron: "15 0 * * *"',
        '      - name: Resolve explicit UTC target',
        '        run: echo "TARGET_DATE=2099-01-01" >> "$GITHUB_ENV"',
      ].join('\n'),
    });
    expect(failures).toEqual(expect.arrayContaining([
      'scheduled workflow source does not declare the 00:00 UTC boundary',
      'scheduled workflow source does not derive TARGET_DATE from UTC in the observed step',
    ]));
  });

  it('requires an exact closeout SHA together with the UTC cutover instant', () => {
    expect(() => validateCutoverOptions('2026-07-20T12:34:56Z', cutoverSha)).not.toThrow();
    expect(() => validateCutoverOptions('', cutoverSha)).toThrow(
      '--after must be the Phase 1 workflow cutover as an ISO UTC instant ending in Z',
    );
    expect(() => validateCutoverOptions('2026-07-20T12:34:56+00:00', cutoverSha)).toThrow(
      '--after must be the Phase 1 workflow cutover as an ISO UTC instant ending in Z',
    );
    expect(() => validateCutoverOptions('2026-07-20T12:34:56Z', '')).toThrow(
      '--cutover-sha must be the full 40-hex Phase 1 closeout commit SHA',
    );
    expect(() => validateCutoverOptions('2026-07-20T12:34:56Z', 'abc123')).toThrow(
      '--cutover-sha must be the full 40-hex Phase 1 closeout commit SHA',
    );
  });

  it.each(['behind', 'diverged'])('rejects a receipt commit whose cutover comparison is %s', (status) => {
    const fixture = repositoryFixture();
    const failures = repositoryEvidenceFailures(
      fixture.receipt,
      run,
      '2026-07-20',
      cutoverSha,
      {
        ...fixture.evidence,
        cutoverComparison: { status },
      },
    );
    expect(failures).toContain(
      `receipt commit does not contain cutover SHA ${cutoverSha} (${status})`,
    );
  });
});
