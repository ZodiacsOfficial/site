/**
 * The partition cases every runtime runs, declared once so the three
 * cannot drift.
 *
 * Environment-neutral: no `node:` import, no DOM. Node imports it, and the
 * page imports it over HTTP.
 *
 * ## What is new here, over the deflection directory
 *
 * That one checked that three engines agree on the ANSWER the deflected
 * rung publishes. This one checks something the partition adds: a PLAN --
 * where the profile can and cannot answer -- and whether a plan made in
 * one engine describes the same spans as a plan made in another.
 *
 * The plan is the interesting object because it is the thing a consumer
 * would cache and reuse. An engine that partitions a window differently
 * would hand the same longitude query a different set of admissible spans
 * and get a legitimately different, and incomparable, answer.
 *
 * Three things are compared to the bit and none of them is a cost:
 *
 *   1. the plan's four span lists and its KEY. The key is the identity a
 *      cached plan is reused under, so two engines disagreeing on it means
 *      a cache filled by one cannot be read by the other;
 *   2. the events found over that plan, with the eligibility and the rung
 *      that located each one;
 *   3. what each result CLAIMS -- over the request, and over the
 *      proved-admissible spans, which are different claims.
 *
 * ## The windows
 *
 * P1 runs the Mars-like target over the shared window: elongation stays
 * above 104 degrees, so the whole request is admissible and the smaller
 * claim and the larger one coincide. P2 and P3 run the fast companion over
 * +/-1 day, which crosses the five-degree floor three times -- the same
 * window and the same reason as C8 in the deflection directory, and the
 * only one here where the partition has anything to decline.
 *
 * P4 asks for the deflector itself, where the profile applies no
 * deflection and the floor restricts nothing: the plan must be one
 * admissible span costing nothing, and an engine that instead declares the
 * window excluded has got the profile's own exception wrong.
 *
 * P2 and P3 share one window and one body and differ only in the
 * longitude: they exist to show, in every engine, that the plan does not
 * change when the longitude does.
 *
 * ## Why P5 asks for a tighter tolerance
 *
 * At the default sixty seconds the companion's three sub-five-degree runs
 * come back entirely as BOUNDARY: the elongation enclosure over a
 * sixty-second span is wider than the gap between the geometry and the
 * floor, so nothing is proved below it. A cross-runtime check that only
 * ever saw boundary spans would never compare a PROVED EXCLUSION, which
 * is the verdict a caller most needs the engines to agree on -- it is the
 * one that says an answer does not exist rather than that one was not
 * reached.
 *
 * Measured on this fixture: 60 s gives 0 excluded spans, 20 s gives 2,
 * and 5 s gives 3, the three the geometry has. P5 therefore runs at five
 * seconds. It is the same window and body as P2, so it also puts the
 * tolerance into the comparison: the plan key carries it, and P2's plan
 * and P5's plan must have DIFFERENT keys in every engine.
 */
export const WINDOW = [-38 * 86400, 38 * 86400];
export const NEAR_WINDOW = [-86400, 86400];

export const CASES = Object.freeze([
  { id: 'P1', body: 'Mars', targetDeg: 95, window: WINDOW },
  { id: 'P2', body: 'Venus', targetDeg: 137, window: NEAR_WINDOW },
  { id: 'P3', body: 'Venus', targetDeg: 317, window: NEAR_WINDOW },
  { id: 'P4', body: 'Sun', targetDeg: 95, window: WINDOW },
  { id: 'P5', body: 'Venus', targetDeg: 137, window: NEAR_WINDOW, boundaryToleranceSec: 5 },
]);

/** Decimal strings, so a comparison cannot round a near-match into a match. */
const spans = (list) => list.map(([a, b]) => [a.toString(), b.toString()]);

/**
 * Run every case against an open experimental handle. Returns plain data.
 *
 * @param {object} x an `experimental(runtime)` handle
 * @param {string|null} packDigest the digest THIS runtime computed from the
 *   bytes it received. It goes into the plan's key, so passing a digest one
 *   runtime computed into another runtime's plan would compare a constant
 *   rather than an agreement.
 */
export function runCases(x, packDigest) {
  const rows = [];
  for (const c of CASES) {
    const [from, to] = c.window;
    const tuning = c.boundaryToleranceSec === undefined
      ? {}
      : { boundaryToleranceSec: c.boundaryToleranceSec };
    const plan = x.planDeflectedDomain({ body: c.body, fromTdbSec: from, toTdbSec: to, packDigest, ...tuning });
    const r = x.searchRetardedAberratedDeflectedOfDateOverPlan({
      body: c.body, targetDeg: c.targetDeg, fromTdbSec: from, toTdbSec: to, plan, packDigest, ...tuning,
    });
    rows.push({
      id: c.id,
      body: c.body,
      targetDeg: c.targetDeg,
      // Part of the answer, not of the request log: a runtime that
      // partitioned a different window answered a different question.
      windowTdbSec: [from.toString(), to.toString()],
      // ---- the plan
      planContract: plan.contract,
      // The identity a cached plan is reused under. Two engines that
      // disagree here cannot share a cache, whatever else matches.
      planKey: plan.key,
      identityStrength: plan.request.identityStrength,
      planStatus: plan.execution.status,
      boundaryToleranceSec: plan.request.boundaryToleranceSec.toString(),
      deflectorIsTarget: plan.diagnostics.deflectorIsTarget ?? null,
      admissible: spans(plan.admissible),
      excluded: spans(plan.excluded),
      boundary: spans(plan.boundary),
      unprocessed: spans(plan.unprocessed),
      // ---- what the search found over it
      searchContract: r.contract,
      found: r.events.length,
      roots: r.events.map((e) => e.tdbSec.toString()),
      brackets: r.events.map((e) => [e.bracketTdbSec[0].toString(), e.bracketTdbSec[1].toString()]),
      eligibility: r.events.map((e) => e.eligibility),
      positionFrom: r.events.map((e) => e.positionFrom),
      // ---- what it claims, which is two different claims
      overRequest: r.completeness.overRequest,
      exhaustiveOverAdmissible: r.completeness.exhaustiveOverAdmissible,
      mayHoldUnfoundSupportedEvents: r.completeness.mayHoldUnfoundSupportedEvents,
      isExactTotalOverRequest: r.eventCount.isExactTotalOverRequest,
      isExactTotalOverAdmissible: r.eventCount.isExactTotalOverAdmissible,
      coversRequestExactly: r.accounting.coversRequestExactly,
      admissibleSec: r.accounting.admissibleSec.toString(),
      excludedSec: r.accounting.excludedSec.toString(),
      boundarySec: r.accounting.boundarySec.toString(),
      unprocessedSec: r.accounting.unprocessedSec.toString(),
      // The SECOND axis, which is not one of the four classes: an engine
      // that searched a different amount of the request answered a
      // different question even if its domain verdicts matched.
      notSearchedSec: r.accounting.notSearchedSec.toString(),
      admissibleNotFullyExaminedSec: r.accounting.admissibleNotFullyExaminedSec.toString(),
      // Whose word the domain rests on. Every case here builds its own
      // plan in its own engine, so all three must say `false`; an engine
      // reporting `true` took someone else's plan.
      planImported: r.execution.planImported,
      restsOnImportedPlan: r.completeness.restsOnImportedPlan,
      planReused: r.execution.partitionReused,
      // ---- reported, never compared: cost is allowed to differ by engine
      planEvaluations: plan.execution.evaluations,
      planCells: plan.execution.cells,
      searchEvaluations: r.execution.searchEvaluations,
      evaluations: r.execution.evaluations,
      cells: r.execution.cells,
    });
  }
  return rows;
}
