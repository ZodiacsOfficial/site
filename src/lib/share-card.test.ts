import { describe, expect, it } from 'vitest';
import { chartCardFilename, chartCardReceipt } from './share-card';
import type { Chart } from './engine/types';
import type { ShareChartInput } from './share';

const INPUT: ShareChartInput = {
  date: '1990-06-15',
  time: '08:30',
  timeKnown: true,
  lat: 40.7128,
  lon: -74.006,
  tz: 'America/New_York',
  name: 'Alex',
  place: 'New York',
  houseSystem: 'whole',
};

const CHART = { engineVersion: '1.0.0' } as Chart;

describe('chartCardReceipt', () => {
  it('preserves the existing birth receipt when options are omitted', () => {
    expect(chartCardReceipt(CHART, INPUT)).toBe('June 15, 1990 · 08:30 · New York');
  });

  it('preserves the existing birth receipt when hiding is explicitly off', () => {
    expect(chartCardReceipt(CHART, INPUT, { hideBirthDetails: false }))
      .toBe(chartCardReceipt(CHART, INPUT));
  });

  it('preserves the existing no-time and no-place receipt behavior', () => {
    expect(chartCardReceipt(CHART, {
      ...INPUT,
      time: null,
      timeKnown: false,
      place: undefined,
    })).toBe('June 15, 1990');
  });

  it('replaces every birth receipt field with the engine version when hiding is on', () => {
    const receipt = chartCardReceipt(CHART, INPUT, { hideBirthDetails: true });

    expect(receipt).toBe('Engine 1.0.0');
    expect(receipt).not.toContain('1990');
    expect(receipt).not.toContain('08:30');
    expect(receipt).not.toContain('New York');
    expect(receipt).not.toContain('Alex');
  });

  it('uses the chart engine version rather than a hard-coded version', () => {
    expect(chartCardReceipt(
      { engineVersion: '2.4.1' },
      INPUT,
      { hideBirthDetails: true },
    )).toBe('Engine 2.4.1');
  });
});

describe('chartCardFilename', () => {
  it('preserves the existing dated filename by default and when hiding is off', () => {
    expect(chartCardFilename(INPUT)).toBe('zodiacs-chart-1990-06-15.png');
    expect(chartCardFilename(INPUT, { hideBirthDetails: false }))
      .toBe('zodiacs-chart-1990-06-15.png');
  });

  it('uses a generic filename with no input date when hiding is on', () => {
    const filename = chartCardFilename(INPUT, { hideBirthDetails: true });

    expect(filename).toBe('zodiacs-chart-positions.png');
    expect(filename).not.toContain(INPUT.date);
  });

  it('uses the same hidden filename for different birth dates', () => {
    expect(chartCardFilename(INPUT, { hideBirthDetails: true })).toBe(
      chartCardFilename(
        { ...INPUT, date: '2001-01-02' },
        { hideBirthDetails: true },
      ),
    );
  });
});
