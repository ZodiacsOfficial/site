/**
 * The cases every runtime runs, declared once so the three cannot drift.
 *
 * Environment-neutral: no `node:` import, no DOM. Node imports it, and the
 * page imports it over HTTP.
 */
export const WINDOW = [-38 * 86400, 38 * 86400];

export const CASES = Object.freeze([
  { id: 'C1', mode: 'retarded', body: 'Mars', targetDeg: 95 },
  { id: 'C2', mode: 'aberrated', body: 'Mars', targetDeg: 95 },
  { id: 'C3', mode: 'ofDate', body: 'Mars', targetDeg: 95 },
  { id: 'C4', mode: 'ofDate', body: 'Mars', targetDeg: 88 },
  // The fast companion: 108 crossings, and the case where a difference in
  // evaluation counts between engines would show if there is one.
  { id: 'C5', mode: 'ofDate', body: 'Venus', targetDeg: 137 },
  { id: 'C6', mode: 'aberrated', body: 'Venus', targetDeg: 137 },
]);

/** Run every case against an open experimental handle. Returns plain data. */
export function runCases(x) {
  const call = {
    retarded: (s) => x.searchRetarded(s),
    aberrated: (s) => x.searchRetardedAberrated(s),
    ofDate: (s) => x.searchRetardedAberratedOfDate(s),
  };
  return CASES.map((c) => {
    const spec = { body: c.body, targetDeg: c.targetDeg, fromTdbSec: WINDOW[0], toTdbSec: WINDOW[1] };
    const r = call[c.mode](spec);
    return {
      id: c.id,
      mode: r.mode,
      frame: r.request.frame,
      established: r.completeness.established,
      isExactTotal: r.eventCount.isExactTotal,
      found: r.events.length,
      // The published answer, to the bit. `toString()` rather than a
      // rounded number: a comparison that rounds first cannot tell a
      // matching root from a nearly matching one.
      roots: r.events.map((e) => e.tdbSec.toString()),
      brackets: r.events.map((e) => [e.bracketTdbSec[0].toString(), e.bracketTdbSec[1].toString()]),
      directions: r.events.map((e) => e.direction),
      // Reported, never folded into the comparison: the cost is allowed to
      // differ between engines and the ANSWER is not.
      evaluations: r.execution.evaluations,
      cells: r.execution.cells,
      unresolved: r.accounting.unresolved.length,
      ...(r.uncertainty.timeScale
        ? { conversionInducedLongitudeArcsec: r.uncertainty.timeScale.conversionApproximation.inducedLongitudeArcsec.toString() }
        : {}),
    };
  });
}
