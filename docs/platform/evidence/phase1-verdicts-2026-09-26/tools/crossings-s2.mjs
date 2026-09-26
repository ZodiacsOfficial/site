// The audit's s2 cases (engine-audit-2026-09-22 LEDGER, production-event-search-5)
// on the vendored rc.8: the package solver the site now imports, with the
// engine's own longitudes, and the root entry point's findLongitudeCrossings.
import { findLongitudeCrossingsWith, searchLongitudeCrossingsWith } from '@zodiacs/engine/crossings';
import { findLongitudeCrossings, ENGINE_VERSION } from '@zodiacs/engine';
import { bodyLongitude } from '@zodiacs/engine/internal';
const iso = (list) => list.map((c) => c.at.toISOString());
const out = { engine: ENGINE_VERSION, cases: [] };
const sunTarget = bodyLongitude('Sun', new Date('2026-03-01T00:00:00Z'));
const a = findLongitudeCrossingsWith(bodyLongitude, 'Sun', sunTarget, new Date('2026-03-01T00:00:00Z'), new Date('2026-03-03T00:00:00Z'), 1);
const aRoot = findLongitudeCrossings('Sun', sunTarget, new Date('2026-03-01T00:00:00Z'), new Date('2026-03-03T00:00:00Z'), 1);
out.cases.push({ case: 'Sun exact at from, [03-01, 03-03], step 1', crossings: iso(a), root: iso(aRoot), audit: { rc6Package: ['2026-03-01T00:00:00.000Z'], site: [] } });
for (const days of [2100, 2400, 2600]) {
  const from = new Date('2026-01-01T00:00:00Z');
  const to = new Date(from.getTime() + days * 86_400_000);
  let crossings, error = null;
  try { crossings = findLongitudeCrossingsWith(bodyLongitude, 'Moon', 0, from, to, 0.25); } catch (e) { error = e.message; }
  const bounded = searchLongitudeCrossingsWith(bodyLongitude, 'Moon', 0, from, to, { stepDays: 0.25, maxSamples: 10_000 });
  out.cases.push({ case: `Moon 0° over ${days} days at step 0.25`, count: crossings?.length ?? null, error, boundedAt10000: { status: bounded.status, samples: bounded.samples }, audit: { rc6Package: 'throws: Crossing search exceeds the 10,000-sample budget.', site2600: 95 } });
}
{
  let crossings, error = null;
  try { crossings = findLongitudeCrossingsWith(bodyLongitude, 'Saturn', 0, new Date('1900-01-01T00:00:00Z'), new Date('2100-01-01T00:00:00Z'), 5); } catch (e) { error = e.message; }
  out.cases.push({ case: 'Saturn 0° 1900–2100 at step 5', count: crossings?.length ?? null, error, audit: { rc6Package: 'throws: Crossing search exceeds the 10,000-sample budget.' } });
}
console.log(JSON.stringify(out, null, 1));
