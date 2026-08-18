import { describe, expect, it } from 'vitest';
import {
  createLivingForecastSnapshot,
  parseLivingForecastSnapshot,
} from './forecast-snapshot';

const CHART_ID = '21000000-0000-4000-8000-000000000001';

function input() {
  return {
    editionDate: '2026-08-18',
    chartId: CHART_ID,
    source: 'personalized' as const,
    generatorVersion: 'today-1.0.0',
    capturedAt: '2026-08-18T08:00:00.000Z',
    lines: [
      {
        id: 'transit:mars-moon',
        text: 'Make room before answering too quickly.',
        receipt: 'Mars 14.2° Cancer · square natal Moon 15.0° Libra · 0.8° from exact',
      },
    ],
  };
}

describe('Living Forecast snapshots', () => {
  it('freezes the exact dated lines and receipts', () => {
    const snapshot = createLivingForecastSnapshot(input());
    expect(snapshot).toMatchObject({
      schema: 'zodiacs.living-chart.today-forecast.v1',
      editionDate: '2026-08-18',
      chartId: CHART_ID,
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot?.lines)).toBe(true);
    expect(Object.isFrozen(snapshot?.lines[0])).toBe(true);
    expect(parseLivingForecastSnapshot(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
  });

  it('rejects snapshots without receipts, duplicate line ids, or more than three lines', () => {
    expect(createLivingForecastSnapshot({
      ...input(),
      lines: [{ id: 'one', text: 'Text', receipt: '' }],
    })).toBeNull();
    expect(createLivingForecastSnapshot({
      ...input(),
      lines: [input().lines[0], input().lines[0]],
    })).toBeNull();
    expect(createLivingForecastSnapshot({
      ...input(),
      lines: Array.from({ length: 4 }, (_, index) => ({
        id: `line:${index}`,
        text: `Line ${index}`,
        receipt: `Receipt ${index}`,
      })),
    })).toBeNull();
  });

  it('rejects invalid dates, chart ids, and non-canonical capture instants', () => {
    expect(createLivingForecastSnapshot({ ...input(), editionDate: '2026-02-30' })).toBeNull();
    expect(createLivingForecastSnapshot({ ...input(), chartId: 'chart' })).toBeNull();
    expect(createLivingForecastSnapshot({ ...input(), capturedAt: '2026-08-18T08:00:00Z' })).toBeNull();
  });
});
