/**
 * Every failure this package can produce, as one typed error with a code.
 *
 * A caller should be able to branch on `code` and show a reason. Raw
 * `RangeError`s from a DataView, or filesystem exceptions carrying absolute
 * paths from someone's machine, are neither of those things and must not
 * escape this package.
 */
export const CODES = Object.freeze([
  // container
  'not-a-pack', 'unsupported-version', 'too-large', 'truncated', 'bad-header',
  'bad-geometry', 'corrupt', 'unverified', 'mutated',
  // request
  'unknown-body', 'out-of-coverage', 'bad-instant', 'unsupported-option',
  // search
  'budget-exhausted', 'enclosure-too-weak', 'unresolved', 'cancelled',
  // lifecycle
  'disposed',
]);

export class PrecisionError extends Error {
  /**
   * @param {typeof CODES[number]} code
   * @param {string} message  must not contain a filesystem path
   * @param {object} [detail] structured, JSON-safe
   */
  constructor(code, message, detail = undefined) {
    super(message);
    this.name = 'PrecisionError';
    this.code = code;
    if (detail !== undefined) this.detail = detail;
  }
  toJSON() { return { name: this.name, code: this.code, message: this.message, detail: this.detail }; }
}

export const fail = (code, message, detail) => { throw new PrecisionError(code, message, detail); };

/**
 * Node throws ENOENT/EACCES with the absolute path in the message. Callers of
 * this package should not learn the layout of someone else's disk from an
 * error string, so filesystem failures are re-wrapped with the basename only.
 */
export function wrapFsError(error, what) {
  const code = error?.code === 'ENOENT' ? 'truncated' : 'bad-header';
  const base = typeof error?.path === 'string' ? error.path.split(/[\\/]/).pop() : undefined;
  return new PrecisionError(code, `${what}${base ? ` (${base})` : ''}: ${error?.code ?? 'failed'}`);
}
