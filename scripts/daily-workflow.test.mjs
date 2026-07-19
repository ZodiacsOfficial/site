import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');

describe('daily publication operations', () => {
  it('cannot skip exact-live verification or discovery on a no-op recovery run', async () => {
    const workflow = await read('.github/workflows/daily-horoscopes.yml');
    const commit = workflow.indexOf('- name: Commit if changed');
    const live = workflow.indexOf('- name: Require exact edition in production');
    const indexNow = workflow.indexOf('- name: Notify IndexNow');
    const receipt = workflow.indexOf('- name: Write immutable operation receipt');

    expect(commit).toBeGreaterThan(-1);
    expect(live).toBeGreaterThan(commit);
    expect(indexNow).toBeGreaterThan(live);
    expect(receipt).toBeGreaterThan(indexNow);
    expect(workflow.slice(live, indexNow)).not.toMatch(/\n\s+if:/);
    expect(workflow.slice(indexNow, receipt)).not.toMatch(/\n\s+if:/);
    expect(workflow).not.toContain("steps.commit.outputs.committed == 'true'");
    expect(workflow).toContain('ref: ${{ github.event.repository.default_branch }}');
    expect(workflow).toContain('fetch-depth: 0');
    expect(workflow).toContain('for attempt in 1 2 3; do');
    expect(workflow).toContain('git rebase "origin/$DEFAULT_BRANCH"');
    expect(workflow).toContain('git push origin "HEAD:$DEFAULT_BRANCH"');
  });

  it('bounds network waits and preserves auditable success and failure evidence', async () => {
    const [workflow, liveVerifier] = await Promise.all([
      read('.github/workflows/daily-horoscopes.yml'),
      read('scripts/verify-live-daily.mjs'),
    ]);

    expect(workflow).toContain('timeout-minutes: 25');
    expect(workflow).toContain('signal: AbortSignal.timeout(15_000)');
    expect(liveVerifier).toContain('signal: AbortSignal.timeout(15_000)');
    expect(workflow).toContain("schema: 'zodiacs.daily-operation-receipt.v1'");
    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).toContain('retention-days: 90');
    expect(workflow).toContain('- name: Record daily-publication incident');
    expect(workflow).toContain("if: github.event_name == 'schedule' && success()");
    expect(workflow).toContain("if: github.event_name == 'schedule' && failure()");
  });
});
