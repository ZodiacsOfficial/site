import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const workflow = await readFile(new URL('../.github/workflows/daily-email.yml', import.meta.url), 'utf8');
const steps = new Map([...workflow.matchAll(/      - name: ([^\n]+)\n([\s\S]*?)(?=      - name:|$)/g)]
  .map((match) => [match[1], match[2]]));
function expression(step, key) {
  const line = steps.get(step).split('\n').find((line) => line.trimStart().startsWith(`${key}:`));
  if (!line) throw new Error(`Missing ${step}: ${key}`);
  return line.slice(line.indexOf(':') + 1).trim().replace(/^\$\{\{\s*|\s*\}\}$/g, '');
}
function evaluate(source, event, enabled, canary, dryRun, recipient = 'owner@example.test') {
  // These workflow expressions use the shared boolean/string subset of JS and Actions.
  return new Function('github', 'vars', 'inputs', 'secrets', `return (${source});`)(
    { event_name: event }, { DAILY_EMAIL_ENABLED: enabled ? '1' : '' },
    event === 'workflow_dispatch' ? { canary, dry_run: dryRun } : {},
    { DAILY_EMAIL_CANARY_TO: recipient, DAILY_EMAIL_TEST_ALLOWLIST: 'existing@example.test' },
  );
}

describe('daily email manual canary isolation', () => {
  for (const event of ['schedule', 'workflow_dispatch']) {
    for (const enabled of [false, true]) {
      for (const canary of [false, true]) {
        for (const dryRun of [false, true]) {
          it(`${event} enabled=${enabled} canary=${canary} dryRun=${dryRun}`, () => {
            const manual = event === 'workflow_dispatch';
            const selectedCanary = manual && canary;
            const canRun = enabled || (manual && (dryRun || canary));
            const live = (enabled || selectedCanary) && (!manual || !dryRun);
            expect(Boolean(evaluate(expression('Run eligible cohort', 'if'), event, enabled, canary, dryRun))).toBe(canRun);
            for (const step of ['Enforce test-list-only release state', 'Require the exact edition in production before real delivery']) {
              expect(Boolean(evaluate(expression(step, 'if'), event, enabled, canary, dryRun))).toBe(live);
            }
            expect(evaluate(expression('Run eligible cohort', 'DAILY_EMAIL_ENABLED'), event, enabled, canary, dryRun)).toBe(enabled || selectedCanary ? '1' : '');
            expect(evaluate(expression('Run eligible cohort', 'DAILY_EMAIL_TEST_ALLOWLIST'), event, enabled, canary, dryRun))
              .toBe(selectedCanary ? 'owner@example.test' : 'existing@example.test');
          });
        }
      }
    }
  }
  it('keeps the recipient secret, exact canary argument, and frozen test cohort', () => {
    const run = steps.get('Run eligible cohort');
    expect(run).toContain('DAILY_EMAIL_COHORT: test');
    expect(run).toContain('ARGS=(--canary)');
    expect(run).toContain("DAILY_EMAIL_CANARY_TO: ${{ inputs.canary == true && secrets.DAILY_EMAIL_CANARY_TO || '' }}");
    expect(workflow).not.toContain('DAILY_EMAIL_ALL_APPROVED');
  });
});
