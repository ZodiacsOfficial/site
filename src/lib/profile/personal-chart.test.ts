import { describe, expect, it } from 'vitest';
import { explicitSelfChart } from './personal-chart';
import type { SavedChart } from './schema';

const chart = (id: string, relationship?: SavedChart['relationship']): SavedChart => ({
  id, name: id, relationship,
  createdAt: '2026-09-01T00:00:00Z', updatedAt: id === 'friend' ? '2026-09-06T00:00:00Z' : '2026-09-01T00:00:00Z',
  birth: { date: '1990-01-01', time: null, timeKnown: false, place: null },
  summary: { engineVersion: 'fixture', utcISO: '1990-01-01T12:00:00Z', houseSystem: 'whole', bodies: [], angles: null, flags: ['no-time'] },
});

describe('personal chart identity', () => {
  it('keeps the explicit owner after a friend chart is edited more recently', () => {
    const own = chart('me', 'self');
    const friend = chart('friend', 'other');
    expect(explicitSelfChart([friend, own])).toBe(own);
    expect(explicitSelfChart([own, friend])).toBe(own);
  });
  it('does not infer ownership from being the only or newest chart', () => {
    expect(explicitSelfChart([chart('friend', 'other')])).toBeNull();
    expect(explicitSelfChart([chart('legacy')])).toBeNull();
    expect(explicitSelfChart([])).toBeNull();
  });
  it('requires a choice for ambiguous self classifications without mutating them', () => {
    const charts = Object.freeze([chart('first', 'self'), chart('second', 'self')]);
    expect(explicitSelfChart(charts)).toBeNull();
    expect(charts.map(c => c.relationship)).toEqual(['self', 'self']);
  });
});
