/**
 * The versioned search-result contract, and the invariants that keep it
 * honest.
 *
 * ## Why version 2 exists
 *
 * Version 1 could return `certified: true, complete: true` from derivative
 * bounds that were sampled on a grid and multiplied by a safety factor. It
 * carried a careful sentence saying what that meant, and the sentence did
 * not undo the Boolean: a consumer branching on `certified` got an
 * unconditional answer built on an unverified assumption. Measured, that was
 * not theoretical — an angle making 96 turns across the 96 default sampling
 * intervals returned `no-crossing, certified, count 0` where the truth was
 * 96, because every sample landed on the same phase.
 *
 * Version 2 separates the things version 1 ran together:
 *
 *   events        what was found, with brackets. Always useful, always kept.
 *   interval      what was asked for, and what was actually decided.
 *   execution     whether the run FINISHED. A run can finish without
 *                 proving it found everything, and saying so is not a
 *                 failure report.
 *   accounting    whether every part of the interval was accounted for.
 *   completeness  whether root completeness was ESTABLISHED, and on what.
 *   assumptions   each unverified thing, by name, with what would settle it.
 *   uncertainty   numerical, model and physical, kept apart and not summed.
 *
 * The invariants below are enforced when the object is built: `buildResult`
 * throws rather than returning a result whose FIELDS contradict each other.
 *
 * What they are and are not. They check that the labels on a result agree
 * -- established only with proven support, an exact total only where
 * completeness was established, no unresolved intervals under a claim that
 * everything was accounted for, `found` matching the list actually
 * returned. They cannot check the EVIDENCE behind a label: `support` and an
 * assumption's `status` are strings the caller writes, so a caller inside
 * this package that labelled a sampled bound `proven` would be believed.
 * The guard against that is the two mode implementations and their tests,
 * not this function, and an earlier version of this comment claimed more
 * than the code does.
 */
import { fail } from './errors.mjs';

export const CONTRACT = 'zodiacs-precision-search/2';

/** How much weight the completeness claim can bear. */
export const SUPPORT = Object.freeze({
  /** Nothing was established about completeness. */
  none: 'none',
  /**
   * Completeness holds IF the listed assumptions hold. They are sampled
   * estimates, so this is never promoted to `proven` and never sets
   * `established`.
   */
  conditional: 'conditional',
  /**
   * Completeness follows from bounds that are true of the function by
   * construction, not measured on a grid. Only this may set `established`.
   */
  proven: 'proven',
});

export const EXECUTION = Object.freeze(['finished', 'budget-exhausted', 'cancelled', 'refused']);

/**
 * Build a v2 result and check it against its own invariants.
 *
 * The invariants, in one place:
 *
 *  1. `completeness.established` may be true only with `support: 'proven'`.
 *  2. ...only when the run finished.
 *  3. ...only when every interval was accounted for.
 *  4. ...only when no assumption is still unverified.
 *  5. `eventCount.isExactTotal` is true exactly when completeness is
 *     established. There is no other route to an exact total.
 *  6. `conditionalOn` is non-empty for `conditional` and empty for `proven`.
 *  7. A result with unresolved intervals cannot say they were all accounted
 *     for.
 */
export function buildResult(r) {
  const out = {
    contract: CONTRACT,
    mode: r.mode,
    request: r.request,
    events: r.events ?? [],
    interval: r.interval,
    execution: r.execution,
    accounting: r.accounting,
    completeness: r.completeness,
    assumptions: r.assumptions ?? [],
    eventCount: r.eventCount,
    uncertainty: r.uncertainty,
    diagnostics: r.diagnostics ?? {},
  };

  const c = out.completeness;
  const e = out.execution;
  const a = out.accounting;
  const n = out.eventCount;

  if (!Object.values(SUPPORT).includes(c.support)) fail('unsupported-option', `completeness.support ${c.support} is not a support level`);
  if (!EXECUTION.includes(e.status)) fail('unsupported-option', `execution.status ${e.status} is not a status`);
  if (e.finished !== (e.status === 'finished')) fail('unsupported-option', 'execution.finished must agree with execution.status');

  if (a.allIntervalsAccountedFor && a.unresolved.length > 0) {
    fail('unsupported-option', 'a result cannot claim every interval was accounted for while reporting unresolved ones');
  }
  if (!Array.isArray(c.conditionalOn)) fail('unsupported-option', 'completeness.conditionalOn must be an array');
  if (!Array.isArray(out.assumptions)) fail('unsupported-option', 'assumptions must be an array');
  if (c.support === 'conditional' && c.conditionalOn.length === 0) {
    fail('unsupported-option', 'conditional completeness must name what it is conditional on');
  }
  if (c.support === 'proven' && c.conditionalOn.length > 0) {
    fail('unsupported-option', 'proven completeness cannot be conditional on anything');
  }
  if (c.established) {
    if (c.support !== 'proven') fail('unsupported-option', 'completeness.established requires proven support, never sampled estimates');
    if (!e.finished) fail('unsupported-option', 'completeness.established requires a finished run');
    if (!a.allIntervalsAccountedFor) fail('unsupported-option', 'completeness.established requires every interval accounted for');
    const open = out.assumptions.filter((x) => x.status !== 'established');
    if (open.length > 0) fail('unsupported-option', `completeness.established requires no unverified assumption; ${open.length} remain`);
  }
  if (n.isExactTotal !== c.established) {
    fail('unsupported-option', 'an exact total event count is available exactly when completeness is established');
  }
  if (n.isExactTotal && n.found !== n.lowerBound) {
    fail('unsupported-option', 'an exact total must equal what was found');
  }
  // `found` is the number of events in the list, so it has to BE that.
  // Without this an "exact total" of 1 was accepted beside two events.
  if (n.found !== out.events.length) {
    fail('unsupported-option', `eventCount.found is ${n.found} but ${out.events.length} events were returned`);
  }
  if (n.lowerBound > out.events.length) {
    fail('unsupported-option', 'the lower bound cannot exceed the events actually returned');
  }
  // An exact total bounds itself from both sides. `upperBound: null` on the
  // proven branch passed, and contradicts what types/index.d.ts declares.
  if (n.isExactTotal && n.upperBound !== n.found) {
    fail('unsupported-option', `an exact total of ${n.found} must have upperBound ${n.found}, not ${n.upperBound}`);
  }
  return Object.freeze(out);
}

/** The assumption record every empirical mode carries. */
/**
 * Narrow a result to the branch where completeness was PROVED.
 *
 * The declarations split the result into two shapes, and only one of them
 * has `isExactTotal: true`. TypeScript cannot discriminate a union on a
 * NESTED property, so `if (r.completeness.established)` reads as a plain
 * boolean and narrows nothing -- which was measured against a real
 * consumer, not assumed. These guards are the narrowing, and they exist at
 * runtime so a JavaScript caller gets the same question answered the same
 * way.
 */
export const isProven = (r) => r?.completeness?.established === true;

/** Narrow to the branch where it was not. A total here is not exact. */
export const isUnproven = (r) => r?.completeness?.established === false;

/** The run reached the end of its interval. Says nothing about proving. */
export const isFinished = (r) => r?.execution?.status === 'finished';

export function sampledBoundAssumption(id, what, basis, value) {
  return {
    id,
    what,
    status: 'unverified',
    basis,
    value,
    wouldBeSettledBy: 'a bound that is true of the function by construction — from its polynomial representation, or from interval arithmetic over the whole cell — rather than a maximum observed on a grid',
  };
}

/** Model and physical uncertainty are never bounded by a search. */
export const EXTERNAL_UNCERTAINTY = Object.freeze({
  model: {
    bounded: false,
    what: 'how far this reduction sits from another model of the same thing',
    note: 'not measured here and not folded into any tolerance on this result',
  },
  physical: {
    bounded: false,
    what: 'how far any of it sits from the sky',
    note: 'not measured here. Agreement between implementations that share JPL lineage is consistency, not accuracy',
  },
});
