/**
 * Optional, injected-clock attribution of the search's own work.
 *
 * ## Why this exists rather than a second copy of the loop
 *
 * The question this answers -- where does a conjunction-heavy search
 * actually spend itself -- can only be answered about the REAL runtime.
 * A rewritten copy instrumented for measurement measures the copy, and
 * its equivalence to the original is then an assumption sitting
 * underneath every number that follows. So the sink is threaded into the
 * live code instead, and switched off by default.
 *
 * ## Off by default, and off means off
 *
 * `sink` is `null` until a caller installs one. Every call site is
 * `if (sink !== null)`, which is one predictable branch on a
 * monomorphic null check; with no sink installed nothing is allocated,
 * no clock is read and no string is built. That claim is measured rather
 * than asserted -- `test/tier-a/instrument.nodetest.mjs` runs a real
 * search with the sink off and requires the events, evaluations and cell
 * counts to be BIT-IDENTICAL to a run of the same code before the hooks
 * existed, and the measurement tool reports the wall-clock difference.
 *
 * ## The clock is injected, because the core has no clock
 *
 * `core-purity.nodetest.mjs` forbids `process.`, `Date.now` and
 * `new Date` in every core module, and that rule is not worth bending for
 * a measurement aid. A sink may carry its own `now()` returning
 * nanoseconds as a BigInt; if it does not, only evaluations are
 * attributed. Node's tool passes `process.hrtime.bigint`.
 *
 * ## What a phase means
 *
 * Phases nest. `enter` returns the previous phase so the caller can
 * restore it, which makes the attribution a stack without allocating one:
 * inner work is charged to the innermost phase, and the time an outer
 * phase keeps is its own minus its children's. Evaluations are charged the
 * same way, through `spend`, so the two columns are the same partition of
 * the same run.
 */

/** @type {{mark: Function, now?: Function} | null} */
let sink = null;
let current = null;

/** Install a sink. Pass `null` to remove it. Returns the previous one. */
export function setInstrumentSink(next) {
  const prev = sink;
  sink = next ?? null;
  current = null;
  label = null;
  return prev;
}

/** True while a sink is installed. Cheap enough to call in a hot path. */
export const instrumenting = () => sink !== null;

/**
 * Begin attributing to `name`. Returns the token to hand `leave`, or
 * `null` when no sink is installed -- in which case `leave(null)` is a
 * single comparison and nothing else.
 */
export function enter(name) {
  if (sink === null) return null;
  const token = { name, prev: current, at: sink.now ? sink.now() : null };
  current = name;
  return token;
}

/** End the phase `enter` returned, charging its own time to it. */
export function leave(token) {
  if (token === null || sink === null) return;
  if (token.at !== null && sink.now) sink.mark(token.name, 'nanos', sink.now() - token.at);
  current = token.prev;
}

/**
 * The PROVENANCE of the cell being worked on, which outlives the phases
 * inside it.
 *
 * Phases say what kind of work this is. The label says why the search is
 * doing it at all -- a seed cell, a cell split because its enclosures were
 * loose, or a cell split because its elongation enclosure straddled the
 * domain floor. That second axis is the one the partition work exists to
 * move, and inferring it from phases afterwards is guessing.
 *
 * Kept as a separate variable rather than a nested phase because the loop
 * body has a dozen exits, and threading a token through all of them to
 * measure something would be a refactor of live code in the name of
 * observing it.
 */
let label = null;

/** Set the provenance label. Returns the previous one. */
export function setLabel(next) {
  if (sink === null) return null;
  const prev = label;
  label = next;
  return prev;
}

/** Charge one unit of `what` to the phase in force, and to the label. */
export function charge(what, amount = 1) {
  if (sink === null) return;
  sink.mark(current ?? 'unattributed', what, amount);
  if (label !== null) sink.mark(`by:${label}`, what, amount);
}

/** The phase in force, for a caller that wants to label something itself. */
export const currentPhase = () => current;
