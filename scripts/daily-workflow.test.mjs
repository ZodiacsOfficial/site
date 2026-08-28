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
    expect(workflow).toContain('VERIFIED_BASE_SHA=$(git rev-parse HEAD)');
    expect(workflow).toContain('remote_sha=$(git rev-parse "origin/$DEFAULT_BRANCH")');
    expect(workflow).toContain('if [ "$remote_sha" != "$VERIFIED_BASE_SHA" ]; then');
    expect(workflow).toContain('rerun the complete workflow');
    expect(workflow).not.toContain('git rebase');
    expect(workflow).not.toContain('for attempt in 1 2 3; do');
    expect(workflow).toContain('git push origin "HEAD:$DEFAULT_BRANCH"');
  });

  it('declares the daily and Monday-weekly publication boundary at 00:00 UTC', async () => {
    const [workflow, pageData, hub, plan, setup] = await Promise.all([
      read('.github/workflows/daily-horoscopes.yml'),
      read('src/lib/horoscope-page-data.ts'),
      read('src/pages/horoscopes/index.astro'),
      read('PLAN.md'),
      read('SETUP.md'),
    ]);

    expect(workflow).toContain('- cron: "0 0 * * *" # daily, 00:00 UTC');
    expect(workflow).not.toMatch(/cron:\s*["'](?:[1-9]|[1-5]\d)\s+0\s+\*\s+\*\s+\*["']/);
    expect(workflow).toContain('npm run editorial:horoscopes:build -- --date "$TARGET_DATE"');
    for (const [name, source] of Object.entries({ pageData, hub, plan, setup })) {
      expect(source, name).not.toContain('00:15 UTC');
      expect(source, name).not.toContain('T00:15:00.000Z');
    }
    expect(pageData).toContain('`${program.anchorDate}T00:00:00.000Z`');
    expect(hub).toContain('`${program.anchorDate}T00:00:00.000Z`');
  });

  it('bounds network waits and preserves auditable success and failure evidence', async () => {
    const [workflow, liveVerifier] = await Promise.all([
      read('.github/workflows/daily-horoscopes.yml'),
      read('scripts/verify-live-daily.mjs'),
    ]);

    expect(workflow).toContain('timeout-minutes: 25');
    expect(workflow).toContain('signal: AbortSignal.timeout(15_000)');
    expect(liveVerifier).toContain('signal: AbortSignal.timeout(15_000)');
    expect(workflow).toContain("schema: 'zodiacs.daily-operation-receipt.v2'");
    expect(workflow).toContain('horoscopeProgramSha256: canonicalSha256(horoscopeProgram)');
    expect(liveVerifier).toContain('production horoscope program is not the committed program');
    expect(workflow).toContain(
      'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2',
    );
    expect(workflow).toContain('retention-days: 90');
    expect(workflow).toContain('- name: Record daily-publication incident');
    expect(workflow).toContain("if: github.event_name == 'schedule' && success()");
    expect(workflow).toContain("if: github.event_name == 'schedule' && failure()");
  });
});
