/**
 * The search, off the main thread, cancellable while it is running.
 *
 * ## Why SharedArrayBuffer and not a message
 *
 * A search is a single synchronous call. A worker sitting inside one does
 * not reach its own event loop, so a `postMessage` saying "cancel" is not
 * delivered until the search has already finished — which would measure
 * the search's runtime and call it a cancellation. `Atomics.load` on a
 * shared flag is readable from inside the call, which is what the search's
 * `signal` contract is for: it is polled on EVERY evaluation.
 *
 * The cost is cross-origin isolation. `serve.mjs` sends COOP and COEP, and
 * the page says so rather than letting a missing header look like a
 * missing feature.
 */
import { openPackFromBytes } from '/pkg/src/browser.mjs';
import { experimental } from '/pkg/src/experimental.mjs';
import { buildSyntheticPack, SYNTHETIC } from '/pkg/examples/synthetic-pack.mjs';

let handle = null;
let runtime = null;

self.onmessage = async (event) => {
  const msg = event.data;
  try {
    if (msg.type === 'open') {
      const bytes = await buildSyntheticPack();
      runtime = await openPackFromBytes(bytes);
      handle = experimental(runtime);
      self.postMessage({
        type: 'opened',
        packBytes: bytes.byteLength,
        // The pack is built in this engine from this engine's Math.cos and
        // Math.acos. If two engines disagree about those, they disagree
        // about the DATA and every number after it, so the digest is
        // reported rather than assumed equal.
        packDigest: runtime.integrity.computedDigest,
      });
      return;
    }
    if (msg.type === 'search') {
      const flag = new Int32Array(msg.flag);
      // The signal the operation already takes. Nothing here is special
      // to the browser except where the boolean comes from.
      const signal = { get aborted() { return Atomics.load(flag, 0) === 1; } };
      const [from, to] = SYNTHETIC.windowTdbSec;
      const startedAt = performance.now();
      const r = handle.searchRetardedAberrated({
        ...(msg.long ? SYNTHETIC.longCase : { body: 'Mars', targetDeg: SYNTHETIC.targetDeg }),
        fromTdbSec: from,
        toTdbSec: to,
        signal,
      });
      self.postMessage({
        type: 'searched',
        long: Boolean(msg.long),
        finishedAt: performance.now(),
        elapsedMs: performance.now() - startedAt,
        status: r.execution.status,
        established: r.completeness.established,
        isExactTotal: r.eventCount.isExactTotal,
        found: r.eventCount.found,
        lowerBound: r.eventCount.lowerBound,
        upperBound: r.eventCount.upperBound,
        evaluations: r.execution.evaluations,
        cells: r.execution.cells,
        reason: r.execution.reason,
      });
      return;
    }
    if (msg.type === 'dispose') {
      if (handle) handle.dispose();
      if (runtime) runtime.dispose();
      handle = null;
      runtime = null;
      self.postMessage({ type: 'disposed' });
      return;
    }
    self.postMessage({ type: 'error', error: `unknown message ${msg.type}` });
  } catch (error) {
    self.postMessage({ type: 'error', error: `${error.code ?? error.name}: ${error.message}` });
  }
};
