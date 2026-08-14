import { describe, expect, it } from 'vitest';
import { POSITION_BODY_ORDER } from '../share-positions';
import type { SavedChart } from '../profile/schema';
import { selfChartPutWire } from './chart-wire';

const DEVICE = '11111111-1111-4111-8111-111111111111';
const CHART = '22222222-2222-4222-8222-222222222222';
const MUTATION = '33333333-3333-4333-8333-333333333333';

function savedChart(): SavedChart {
  return {
    id: CHART,
    name: 'My chart',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    birth: {
      date: '1990-01-01',
      time: '12:34',
      timeKnown: true,
      place: {
        name: 'Bangkok', admin1: 'Bangkok', country: 'TH',
        lat: 13.7563, lon: 100.5018, tz: 'Asia/Bangkok',
      },
    },
    summary: {
      engineVersion: '1.2.3',
      utcISO: '1990-01-01T05:34:00.000Z',
      houseSystem: 'whole',
      bodies: POSITION_BODY_ORDER.map((body, index) => ({
        body,
        lon: index === 0 ? 280 : index * 20,
        retrograde: false,
      })),
      angles: { asc: 42, mc: 140 },
      flags: [],
    },
  };
}

describe('self chart upload wire', () => {
  it('canonicalizes one self-only chart and separates birth from derived fields', () => {
    const wire = selfChartPutWire(savedChart(), DEVICE, MUTATION, 4);
    expect(wire).toMatchObject({
      deviceId: DEVICE,
      chartId: CHART,
      baseRevision: 4,
      mutationId: MUTATION,
      subjectKind: 'self',
      selfAttestation: true,
      derived: {
        sunSign: 'capricorn',
        houseSystem: 'whole',
        positions: { h: 'w', v: '1.2.3' },
      },
    });
    expect(wire?.derived.positions.b).toHaveLength(12);
    expect(wire?.birth.place?.lat).toBe(13.7563);
    expect(JSON.stringify(wire?.derived)).not.toContain('Bangkok');
    expect(JSON.stringify(wire?.derived)).not.toContain('1990-01-01');
  });

  it('rejects incomplete summaries and invalid revisions', () => {
    const chart = savedChart();
    chart.summary.bodies.pop();
    expect(selfChartPutWire(chart, DEVICE, MUTATION, 0)).toBeNull();
    expect(selfChartPutWire(savedChart(), DEVICE, MUTATION, -1)).toBeNull();
  });

  it('rejects stale angles that disagree with birth-time knowledge', () => {
    const timedWithoutAngles = savedChart();
    timedWithoutAngles.summary.angles = null;
    expect(selfChartPutWire(timedWithoutAngles, DEVICE, MUTATION, 0)).toBeNull();

    const unknownWithAngles = savedChart();
    unknownWithAngles.birth.timeKnown = false;
    unknownWithAngles.birth.time = null;
    expect(selfChartPutWire(unknownWithAngles, DEVICE, MUTATION, 0)).toBeNull();
  });

  it('uses the protocol code-point and UTF-8 limits for renamed labels', () => {
    const accepted = savedChart();
    accepted.name = '🪐'.repeat(100);
    expect(selfChartPutWire(accepted, DEVICE, MUTATION, 0)?.label).toBe(accepted.name);

    const codePointOverflow = savedChart();
    codePointOverflow.name = 'a'.repeat(121);
    expect(selfChartPutWire(codePointOverflow, DEVICE, MUTATION, 0)).toBeNull();

    const byteOverflow = savedChart();
    byteOverflow.name = '🪐'.repeat(121);
    expect(new TextEncoder().encode(byteOverflow.name).byteLength).toBeGreaterThan(480);
    expect(selfChartPutWire(byteOverflow, DEVICE, MUTATION, 0)).toBeNull();
  });
});
