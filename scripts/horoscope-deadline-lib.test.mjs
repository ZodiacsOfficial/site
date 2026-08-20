import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  MONTHLY_HOROSCOPE_SIGNS,
  inspectNextMonthHoroscopes,
  nextUtcMonth,
} from './horoscope-deadline-lib.mjs';

const cleanups = [];

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), 'zodiacs-horoscope-deadline-'));
  cleanups.push(root);
  await mkdir(join(root, 'src', 'content', 'horoscopes'), { recursive: true });
  return root;
}

describe('monthly horoscope deadline reminder', () => {
  it('derives the next UTC month across a year boundary', () => {
    expect(nextUtcMonth(new Date('2026-12-20T23:59:59.999Z'))).toEqual({
      month: '2027-01',
      label: 'January 2027',
    });
  });

  it('reports only the missing next-month sign files in canonical order', async () => {
    const root = await fixtureRoot();
    for (const sign of MONTHLY_HOROSCOPE_SIGNS.slice(0, -2)) {
      await writeFile(
        join(root, 'src', 'content', 'horoscopes', `2026-09-${sign}.mdx`),
        '---\ndraft: true\n---\n',
      );
    }

    expect(inspectNextMonthHoroscopes({
      root,
      now: new Date('2026-08-20T06:17:00.000Z'),
    })).toEqual({
      month: '2026-09',
      label: 'September 2026',
      complete: false,
      missingSigns: ['aquarius', 'pisces'],
      missingChecklist: '- [ ] aquarius\n- [ ] pisces',
    });
  });

  it('does not request an issue when all twelve files exist', async () => {
    const root = await fixtureRoot();
    for (const sign of MONTHLY_HOROSCOPE_SIGNS) {
      await writeFile(
        join(root, 'src', 'content', 'horoscopes', `2026-09-${sign}.mdx`),
        '---\ndraft: true\n---\n',
      );
    }
    const result = inspectNextMonthHoroscopes({
      root,
      now: new Date('2026-08-20T06:17:00.000Z'),
    });
    expect(result.complete).toBe(true);
    expect(result.missingSigns).toEqual([]);
    expect(result.missingChecklist).toBe('');
  });

  it('pins the workflow to the 20th, read-only content access, and issue creation only for gaps', async () => {
    const workflow = await readFile(
      new URL('../.github/workflows/monthly-horoscope-deadline.yml', import.meta.url),
      'utf8',
    );
    const transitWorkflow = await readFile(
      new URL('../.github/workflows/transits-monthly.yml', import.meta.url),
      'utf8',
    );
    const sharedIssueTitle = 'TITLE="Write the ${LABEL} horoscopes"';
    const sharedOpenIssueQuery = 'gh issue list --state open --search "in:title \\"${TITLE}\\""';

    expect(workflow).toContain('cron: "17 6 20 * *"');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('issues: write');
    expect(workflow).toContain('node scripts/check-next-month-horoscopes.mjs');
    expect(workflow).toContain("steps.check.outputs.missing_count != '0'");
    expect(workflow).toContain('gh issue create');
    expect(workflow).toContain(sharedIssueTitle);
    expect(transitWorkflow).toContain(sharedIssueTitle);
    expect(workflow).toContain(sharedOpenIssueQuery);
    expect(transitWorkflow).toContain(sharedOpenIssueQuery);
  });
});
