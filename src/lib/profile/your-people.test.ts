import { describe, expect, it } from 'vitest';
import { sunLongitude } from '../engine/lite';
import { buildPeople, chartHandle, daysUntil, nextBirthday, nextSunReturn } from './your-people';
import type { CircleEntry } from './circle';
import type { SavedChart, SavedChartRelationship } from './schema';

const NOW = new Date(2026, 8, 24, 15, 30); // local 24 Sep 2026, mid-afternoon

function chart(id: string, date: string, relationship?: SavedChartRelationship): SavedChart {
  return {
    id,
    name: relationship === 'other' ? id : `${id} · ${date}`,
    ...(relationship ? { relationship } : {}),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    birth: { date, time: null, timeKnown: false, place: null },
    summary: {
      engineVersion: 'fixture',
      utcISO: `${date}T12:00:00.000Z`,
      houseSystem: 'whole',
      bodies: [{ body: 'Sun', lon: 200, retrograde: false }],
      angles: null,
      flags: ['no-time'],
    },
  };
}

function card(id: string, name: string, sunLon: number): CircleEntry {
  return {
    id,
    name,
    timeKnown: false,
    addedAt: '2026-09-01T00:00:00.000Z',
    chart: {
      bodies: [{ body: 'Sun', lon: sunLon }],
      angles: null,
      houseSystem: 'whole',
      engineVersion: 'fixture',
    },
  } as CircleEntry;
}

describe('dates worth knowing', () => {
  it('counts whole local days', () => {
    expect(daysUntil(new Date(2026, 8, 24, 23, 59), NOW)).toBe(0);
    expect(daysUntil(new Date(2026, 8, 25, 0, 1), NOW)).toBe(1);
  });

  it('finds the next birthday, today included', () => {
    expect(nextBirthday('1990-09-24', NOW)).toEqual(new Date(2026, 8, 24));
    expect(nextBirthday('1990-09-23', NOW)).toEqual(new Date(2027, 8, 23));
    expect(nextBirthday('1990-12-01', NOW)).toEqual(new Date(2026, 11, 1));
    expect(nextBirthday('nonsense', NOW)).toBeNull();
    expect(nextBirthday('1990-02-31', NOW)).toBeNull();
  });

  it('keeps a leap-day birthday on 28 February in a common year', () => {
    expect(nextBirthday('2000-02-29', NOW)).toEqual(new Date(2027, 1, 28));
    expect(nextBirthday('2000-02-29', new Date(2027, 2, 1))).toEqual(new Date(2028, 1, 29));
  });

  it('finds when the Sun next returns to a longitude', () => {
    for (const target of [0, 90.25, 183.2, 359.9]) {
      const at = nextSunReturn(target, NOW)!;
      expect(at.getTime()).toBeGreaterThanOrEqual(new Date(2026, 8, 24).getTime());
      expect(at.getTime() - NOW.getTime()).toBeLessThan(367 * 86_400_000);
      const miss = Math.abs(((sunLongitude(at) - target + 540) % 360) - 180);
      expect(miss).toBeLessThan(0.001);
    }
  });
});

describe('your people', () => {
  it('lists explicit others and received cards, never you or an unclassified chart, soonest first', () => {
    const people = buildPeople(
      [
        chart('Me', '1990-01-01', 'self'),
        chart('Legacy', '1990-01-02'),
        chart('Anna', '1988-12-01', 'other'),
        chart('Ben', '1991-10-02', 'other'),
      ],
      [card('c0000000-0000-4000-8000-000000000001', 'Cleo', 195)],
      NOW,
    );
    expect(people.map((person) => person.name)).toEqual(['Ben', 'Cleo', 'Anna']);
    expect(people[0].next).toMatchObject({ kind: 'birthday', days: 8 });
    expect(people[1].next!.kind).toBe('sun-return');
    expect(people.find((person) => person.name === 'Cleo')!.mark.timeKnown).toBe(false);
  });

  it('trims a saved chart name to its handle', () => {
    expect(chartHandle('Mom · work chart')).toBe('Mom');
    expect(chartHandle(' · ')).toBe(' · ');
  });
});
