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
  it('offers one privacy-safe full-chart image and no alternate card choices', () => {
    const markup = render(h(ChartShareDialog, {
      chart,
      locale: 'en',
      card: 'idle',
      onCardStateChange: () => {},
      onClose: () => {},
    }));

    expect(markup).toContain('data-share-mode="full"');
    expect(markup.match(/data-share-card-action="full"/g)).toHaveLength(1);
    expect(markup).toContain('data-share-primary="full"');
    expect(markup).toContain('Preparing image…');
    expect(markup).toContain('not a name, birth date, time, place, coordinates, or chart link');
    expect(markup).not.toContain('data-share-signature');
    expect(markup).not.toContain('data-share-card-action="signature"');
    expect(markup).not.toContain('data-share-card-action="big-three"');
    expect(markup).not.toContain('Copy positions-only link');
  });
});
