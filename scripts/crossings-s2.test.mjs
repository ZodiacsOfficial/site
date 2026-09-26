/*
 * Step 1.10's parity test (rule 1i): the audit's s2 cases
 * (docs/platform/evidence/engine-audit-2026-09-22/LEDGER.md,
 * production-event-search-5), through the site's scan and the package's
 * own. Since engine rc.8 both run @zodiacs/engine/crossings: the site passes
 * its longitudes from src/lib/engine/full.ts, the package its internal ones.
 * With rc.6 the package returned a root exactly at `from` and threw past
 * 10,000 samples, where the site's copy did neither.
 */
import { findLongitudeCrossings as packageCrossings, searchLongitudeCrossings } from '@zodiacs/engine';
import { describe, expect, it } from 'vitest';
import { bodyLongitude } from '../src/lib/engine/full';
import { findLongitudeCrossings as siteCrossings } from '../src/lib/engine/returns';

const DAY = 86_400_000;
const instants = (crossings) => crossings.map((crossing) => [crossing.at.toISOString(), crossing.retrograde]);

describe('the audit s2 cases on the one crossing solver', () => {
  it('leaves a root exactly at the start of the window to the window that ends there', () => {
    const from = new Date('2026-03-01T00:00:00Z');
    const to = new Date('2026-03-03T00:00:00Z');
    const target = bodyLongitude('Sun', from);
    expect(siteCrossings('Sun', target, from, to, 1)).toEqual([]);
    expect(packageCrossings('Sun', target, from, to, 1)).toEqual([]);
  });

  it('scans the Moon over 2,600 days at a quarter-day step without a budget, and both sides agree', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date(from.getTime() + 2600 * DAY);
    const site = siteCrossings('Moon', 0, from, to, 0.25);
    expect(site).toHaveLength(95);
    expect(instants(packageCrossings('Moon', 0, from, to, 0.25))).toEqual(instants(site));
  });

  it('scans Saturn from 1900 to 2100 at a five-day step, and both sides agree', () => {
    const from = new Date('1900-01-01T00:00:00Z');
    const to = new Date('2100-01-01T00:00:00Z');
    const site = siteCrossings('Saturn', 0, from, to, 5);
    expect(site).toHaveLength(13);
    expect(instants(packageCrossings('Saturn', 0, from, to, 5))).toEqual(instants(site));
  });

  it('refuses a bounded search whole instead of throwing', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date(from.getTime() + 2600 * DAY);
    expect(searchLongitudeCrossings('Moon', 0, from, to, { stepDays: 0.25, maxSamples: 10_000 }))
      .toMatchObject({ status: 'refused', reason: 'sample-budget', crossings: [] });
  });
});
