/**
 * Seam for the compiled precision runtime.
 *
 * The compiler track owns the real implementation and the `ZODEPH01` container
 * it reads. This file is the interface the worker expects, and it is
 * deliberately a hard failure rather than a fallback: a demonstration that
 * quietly answers from the lightweight backend while claiming precision is
 * worse than one that refuses.
 */
export function open() {
  throw new Error('precision runtime not bundled into this build of the demonstration');
}
