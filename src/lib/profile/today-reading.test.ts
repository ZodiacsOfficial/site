import { describe, expect, it } from 'vitest';
import daily from '../../data/daily.json';
import { computeChart } from '../engine/full';
import { ENGINE_VERSION } from '../engine/types';
import { transitLine } from '../transits';
import { todayLead, todayReading } from './today-reading';
import type { SavedChart } from './schema';

function saved(timeKnown: boolean): SavedChart {
  const chart = computeChart({
    utc: new Date('1990-08-14T13:30:00Z'),
    latitude: 40.7128,
    longitude: -74.006,
    houseSystem: 'whole',
    timeKnown,
  });
  return {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Maya',
    relationship: 'self',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    birth: { date: '1990-08-14', time: timeKnown ? '09:30' : null, timeKnown, place: null },
    summary: {
      engineVersion: ENGINE_VERSION,
      utcISO: '1990-08-14T13:30:00.000Z',
      houseSystem: 'whole',
      bodies: chart.bodies.map(({ body, lon, retrograde }) => ({ body, lon, retrograde })),
      angles: timeKnown && chart.angles ? { asc: chart.angles.asc, mc: chart.angles.mc } : null,
      flags: [],
    },
  };
}

// Noon UTC on the committed edition's own day.
const EDITION_NOON = new Date(`${daily.date}T12:00:00Z`);

describe("today's lead line", () => {
  it('leads with the Moon’s house when the birth time is known, as the Today card does', () => {
    const chart = saved(true);
    const moon = todayReading(chart).houseLines.find((line) => line.body === 'Moon')!;
    const lead = todayLead(chart, EDITION_NOON)!;
    expect(lead.text).toBe(moon.text);
    expect(lead.text).toMatch(/^The Moon /u);
    expect(lead).toMatchObject({ date: daily.date, phase: daily.moon.phase });
  });

  it('falls back to the closest aspect without a birth time, and says nothing on a quiet day', () => {
    const chart = saved(false);
    const { hits, houseLines } = todayReading(chart);
    expect(houseLines).toEqual([]);
    const lead = todayLead(chart, EDITION_NOON);
    if (hits.length === 0) expect(lead).toBeNull();
    else expect(lead!.text).toBe(transitLine(hits[0].a, hits[0].type, hits[0].b));
  });

  it('shows nothing once the edition is no longer the current UTC day', () => {
    const chart = saved(true);
    const nextDay = new Date(EDITION_NOON.getTime() + 24 * 60 * 60 * 1000);
    const dayBefore = new Date(EDITION_NOON.getTime() - 24 * 60 * 60 * 1000);
    expect(todayLead(chart, nextDay)).toBeNull();
    expect(todayLead(chart, dayBefore)).toBeNull();
    expect(todayLead(chart, EDITION_NOON)).not.toBeNull();
  });
});
