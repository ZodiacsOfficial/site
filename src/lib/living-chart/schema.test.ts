import { describe, expect, it } from 'vitest';
import { createLivingForecastSnapshot } from './forecast-snapshot';
import {
  createLivingMomentRecord,
  normalizeLivingMomentNote,
  parseLivingMoment,
} from './schema';

const OWNER = { kind: 'guest', vaultId: '31000000-0000-4000-8000-000000000001' } as const;
const CHART_ID = '32000000-0000-4000-8000-000000000001';
const MOMENT_ID = '33000000-0000-4000-8000-000000000001';
const NOW = '2026-08-18T09:00:00.000Z';

function forecast() {
  return createLivingForecastSnapshot({
    editionDate: '2026-08-18',
    chartId: CHART_ID,
    source: 'personalized',
    generatorVersion: 'today-1',
    capturedAt: NOW,
    lines: [{ id: 'line:1', text: 'A measured answer may travel further.', receipt: 'Mercury 2.0° Virgo' }],
  })!;
}

describe('Living Moment schema', () => {
  it('creates one canonical, revisioned record', () => {
    const moment = createLivingMomentRecord(OWNER, {
      primaryChartId: CHART_ID,
      occurredAt: '2026-08-18T09:00:00.000Z',
      timePrecision: 'exact',
      note: '  A useful conversation.  ',
      forecast: forecast(),
      reflectionQuestionId: 'reflection:notice',
    }, MOMENT_ID, NOW);
    expect(moment).toMatchObject({
      schema: 'zodiacs.living-chart.moment.v1',
      id: MOMENT_ID,
      note: 'A useful conversation.',
      revision: 1,
      baseRevision: 0,
      syncState: 'local',
      deletedAt: null,
    });
    expect(parseLivingMoment(JSON.parse(JSON.stringify(moment)))).toEqual(moment);
  });

  it('enforces the 500-code-point note boundary', () => {
    expect(normalizeLivingMomentNote('🙂'.repeat(500))).toBe('🙂'.repeat(500));
    expect(normalizeLivingMomentNote('🙂'.repeat(501))).toBeNull();
  });

  it('rejects DEL and C1 controls so local notes match the cloud payload gate', () => {
    expect(normalizeLivingMomentNote('before\u007fafter')).toBeNull();
    expect(normalizeLivingMomentNote('before\u0085after')).toBeNull();
    expect(normalizeLivingMomentNote('before\u009fafter')).toBeNull();
  });

  it('requires a category or note and matches date-only precision to a calendar date', () => {
    expect(createLivingMomentRecord(OWNER, {
      primaryChartId: CHART_ID,
      occurredAt: '2026-08-18',
      timePrecision: 'date_only',
      forecast: forecast(),
      reflectionQuestionId: 'reflection:notice',
    }, MOMENT_ID, NOW)).toBeNull();

    expect(createLivingMomentRecord(OWNER, {
      primaryChartId: CHART_ID,
      occurredAt: '2026-08-18T00:00:00.000Z',
      timePrecision: 'date_only',
      category: 'work',
      forecast: forecast(),
      reflectionQuestionId: 'reflection:notice',
    }, MOMENT_ID, NOW)).toBeNull();
  });

  it('rejects a forecast captured for a different chart', () => {
    expect(createLivingMomentRecord(OWNER, {
      primaryChartId: '32000000-0000-4000-8000-000000000002',
      occurredAt: '2026-08-18',
      timePrecision: 'date_only',
      category: 'work',
      forecast: forecast(),
      reflectionQuestionId: 'reflection:notice',
    }, MOMENT_ID, NOW)).toBeNull();
  });
});
