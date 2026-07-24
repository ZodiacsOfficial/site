import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { computeChart } from '../lib/engine/full';
import { ChartShareDialog } from './PositionsShareSurface';

const chart = computeChart({
  utc: new Date('1990-06-15T12:30:00.000Z'),
  latitude: 40.7128,
  longitude: -74.006,
  houseSystem: 'whole',
  timeKnown: true,
});

describe('ChartShareDialog', () => {
  it('offers privacy-safe Big Three and full-chart images when the chart has a rising sign', () => {
    const markup = render(h(ChartShareDialog, {
      chart,
      locale: 'en',
      card: 'idle',
      onCardStateChange: () => {},
      onClose: () => {},
    }));

    expect(markup).toContain('data-share-mode="chart-and-big-three"');
    expect(markup.match(/data-share-card-action="full"/g)).toHaveLength(1);
    expect(markup.match(/data-share-card-action="big-three"/g)).toHaveLength(1);
    expect(markup).toContain('data-share-primary="full"');
    expect(markup).toContain('Share the big three');
    expect(markup).toContain('Share the full chart');
    expect(markup).toContain('Preparing image…');
    expect(markup).toContain('not a name, birth date, time, place, coordinates, or chart link');
    expect(markup).not.toContain('data-share-signature');
    expect(markup).not.toContain('data-share-card-action="signature"');
    expect(markup).not.toContain('Copy positions-only link');
    expect(markup).not.toMatch(/1990-06-15|12:30|40\\.7128|74\\.006|@|#i=|#s=/);
  });

  it('keeps the honest full-chart-only choice when a rising sign is unavailable', () => {
    const markup = render(h(ChartShareDialog, {
      chart: { ...chart, angles: null, houses: null },
      locale: 'en',
      card: 'idle',
      onCardStateChange: () => {},
      onClose: () => {},
    }));

    expect(markup).toContain('data-share-mode="full"');
    expect(markup.match(/data-share-card-action="full"/g)).toHaveLength(1);
    expect(markup).not.toContain('data-share-card-action="big-three"');
    expect(markup).not.toContain('Share the big three');
  });
});
