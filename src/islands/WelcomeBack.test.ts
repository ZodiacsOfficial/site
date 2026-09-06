import { describe, expect, it, vi } from 'vitest';
import type { VNode } from 'preact';
import type { SavedChart } from '../lib/profile/schema';

const harness = vi.hoisted(() => ({ charts: [] as SavedChart[], enabled: true }));
vi.mock('../lib/hooks/useProfile', () => ({ useProfile: () => ({ profile: { charts: harness.charts } }) }));
vi.mock('../lib/living-chart/feature-flags', () => ({ livingChartCaptureEnabled: () => harness.enabled }));
import WelcomeBack from './WelcomeBack';

function saved(id: string, relationship?: SavedChart['relationship']): SavedChart {
  return { id, name: id, relationship, createdAt: '2026-09-01', updatedAt: id === 'Friend' ? '2026-09-06' : '2026-09-01',
    birth: { date: '1990-01-01', time: null, timeKnown: false, place: null },
    summary: { engineVersion: 'fixture', utcISO: '1990-01-01T12:00:00Z', houseSystem: 'whole', bodies: [{ body: 'Sun', lon: 10, retrograde: false }, { body: 'Moon', lon: 80, retrograde: false }], angles: { asc: 90, mc: 0 }, flags: ['no-time'] },
  };
}
function card() { return (WelcomeBack({})!.props.children as VNode<Record<string, any>>).props; }

describe('homepage personal daily handoff', () => {
  it('names the same explicit chart as Today, even with a newer friend chart', () => {
    harness.enabled = true;
    harness.charts = [saved('Friend', 'other'), saved('Owner', 'self')];
    const props = card();
    expect(props.title).toContain('Owner');
    expect(props.primary.props.href).toBe('/today/');
    // Unknown time must not present a reference Moon or stale rising sign as settled.
    const meta = JSON.stringify(props.meta);
    expect(meta).not.toContain('"Moon"');
    expect(meta).not.toContain('"Rising"');
  });
  it('offers the existing chooser without attributing a friend or legacy chart to the visitor', () => {
    harness.enabled = true;
    harness.charts = [saved('Friend', 'other')];
    const props = card();
    expect(props.title).toBe('Make today personal');
    expect(props.primary.props.href).toBe('/today/');
    expect(props.meta).toBeUndefined();
  });
  it('preserves the latest-chart path when the personal daily feature is off', () => {
    harness.enabled = false;
    harness.charts = [saved('Friend', 'other'), saved('Owner', 'self')];
    expect(card().title).toContain('Friend');
  });
  it('does not add a returning-user card for an empty profile', () => {
    harness.enabled = true;
    harness.charts = [];
    expect(WelcomeBack({})).toBeNull();
  });
});
