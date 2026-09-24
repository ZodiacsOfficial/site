/**
 * The cases every runtime runs, declared once so the three cannot drift.
 *
 * Environment-neutral: no `node:` import, no DOM. Node imports it, and the
 * page imports it over HTTP.
 *
 * ## What is new here, over the of-date directory
 *
 * The deflected mode is the first with a RESTRICTED DOMAIN, so the answer
 * a runtime publishes now includes which spans it declined to examine.
 * Three cases exist to exercise that across engines and not only in Node:
 *
 *   C7  Mars  — elongation 104.09 to 180 degrees over the window, so the
 *               floor is never approached and completeness is established
 *   C8  Venus — elongation reaches 0.0002 degrees, so the floor is crossed
 *               and the answer carries excluded spans and a lower bound
 *   C9  Sun   — the deflector as target, which is answered and NOT
 *               deflected
 *
 * Those elongation ranges are properties of `examples/synthetic-pack.mjs`.
 * They were measured by sampling the pack's own series and applying
 * `deflectionDomain` to the light-time-corrected vector — not read off a
 * search result, which is the thing these cases exist to check.
 *
 * ## Why C8 does not use the shared window
 *
 * The companion laps the observer every 0.7 days, so its direction passes
 * the Sun's once per lap: over the shared ±38-day window it enters the
 * five-degree floor 109 separate times. Resolving 109 pairs of floor
 * boundaries spends the search's whole four-million-evaluation budget and
 * exhausts it, so the true cost is a LOWER bound and not a measurement.
 * An exhausted search is a poor cross-runtime case: it publishes where it
 * ran out rather than what it concluded, and this one took about a minute
 * in Node, which is the wrong side of a browser page timeout.
 *
 * C8 therefore runs on ±1 day, which holds (measured the same way, 200,000
 * samples over the two days):
 *
 *   - three sub-five-degree runs, at -0.8205..-0.8010, -0.1193..-0.0998
 *     and 0.5820..0.6014 days, each 0.0195 d wide, reaching 0.0009,
 *     0.0002 and 0.0012 degrees
 *   - three crossings of 137 degrees, at -0.43358, 0.26642 and 0.96642
 *     days, none of them inside a sub-five-degree run
 *
 * So the case still has all three things it is here for — roots to agree
 * on, spans to decline, and a completeness verdict that must come back
 * false — and it costs about 112,000 evaluations instead of the budget.
 */
export const WINDOW = [-38 * 86400, 38 * 86400];

/** C8's narrower window. See the header. */
export const C8_WINDOW = [-86400, 86400];

export const CASES = Object.freeze([
  { id: 'C1', mode: 'retarded', body: 'Mars', targetDeg: 95 },
  { id: 'C2', mode: 'aberrated', body: 'Mars', targetDeg: 95 },
  { id: 'C3', mode: 'ofDate', body: 'Mars', targetDeg: 95 },
  { id: 'C4', mode: 'ofDate', body: 'Mars', targetDeg: 88 },
  // The fast companion: 108 crossings, and the case where a difference in
  // evaluation counts between engines would show if there is one.
  { id: 'C5', mode: 'ofDate', body: 'Venus', targetDeg: 137 },
  { id: 'C6', mode: 'aberrated', body: 'Venus', targetDeg: 137 },
  // The deflected rung.
  { id: 'C7', mode: 'deflected', body: 'Mars', targetDeg: 95 },
  { id: 'C8', mode: 'deflected', body: 'Venus', targetDeg: 137, window: C8_WINDOW },
  { id: 'C9', mode: 'deflected', body: 'Sun', targetDeg: 95 },
]);

/** Run every case against an open experimental handle. Returns plain data. */
export function runCases(x) {
  const call = {
    retarded: (s) => x.searchRetarded(s),
    aberrated: (s) => x.searchRetardedAberrated(s),
    ofDate: (s) => x.searchRetardedAberratedOfDate(s),
    deflected: (s) => x.searchRetardedAberratedDeflectedOfDate(s),
  };
  return CASES.map((c) => {
    const [from, to] = c.window ?? WINDOW;
    const spec = { body: c.body, targetDeg: c.targetDeg, fromTdbSec: from, toTdbSec: to };
    const r = call[c.mode](spec);
    const d = r.diagnostics.deflection ?? null;
    return {
      id: c.id,
      mode: r.mode,
      // Part of the answer, not of the request log: a runtime that
      // searched a different window answered a different question.
      windowTdbSec: [from, to],
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
      // The domain verdict is part of the ANSWER for the deflected rung: a
      // runtime that excluded a different span answered a different
      // question, however well its roots matched.
      excluded: r.accounting.excluded.map((s2) => [s2.fromTdbSec.toString(), s2.toTdbSec.toString()]),
      decided: (r.interval.decidedTdbSec ?? []).map((s2) => [s2[0].toString(), s2[1].toString()]),
      decidedFraction: r.interval.decidedFraction === null || r.interval.decidedFraction === undefined
        ? null : r.interval.decidedFraction.toString(),
      // Reported, never folded into the comparison: the cost is allowed to
      // differ between engines and the ANSWER is not.
      evaluations: r.execution.evaluations,
      cells: r.execution.cells,
      unresolved: r.accounting.unresolved.length,
      ...(d
        ? {
          deflectionApplied: d.appliedToThisBody,
          everyCellEvaluationDeflected: d.everyCellEvaluationDeflected,
          // Comparable: `sinCos` plus four arithmetic operations.
          closestElongationCos: d.closestElongationCos === null ? null : d.closestElongationCos.toString(),
          widestDeflectionArcsec: d.widestDeflectionArcsec.toString(),
          tightestLimiterMarginRatio: d.tightestLimiterMarginRatio === null
            ? null : d.tightestLimiterMarginRatio.toString(),
          // Reported and NOT compared: `Math.acos` is implementation-
          // defined in ECMAScript, so two honest engines may differ in its
          // last bits. The cosine above is the quantity the domain test
          // actually uses, and that one is compared.
          closestElongationDeg: d.closestElongationDeg,
        }
        : {}),
      ...(r.uncertainty.timeScale
        ? { conversionInducedLongitudeArcsec: r.uncertainty.timeScale.conversionApproximation.inducedLongitudeArcsec.toString() }
        : {}),
    };
  });
}
