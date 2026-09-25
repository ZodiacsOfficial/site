/*
 * Where the Phase 1 verdict tools read and write. Each path comes from the environment and
 * falls back to a default:
 *
 *   SITE_ROOT  the site repository: the root this folder sits in (tools/../../../../..)
 *   WORK       scratch output, outside the repository: <os tmpdir>/phase1-verdicts-2026-09-25
 *
 * The Python tools read the same variables through lib/paths.py, which adds SWISS_EPHE and
 * JPL_KERNEL. Swiss Ephemeris output is written only under WORK; loading this module fails if
 * WORK is the repository or lies inside it.
 */
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TOOLS = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SITE_ROOT = resolve(process.env.SITE_ROOT || resolve(TOOLS, '../../../../..'));
export const WORK = resolve(process.env.WORK || join(tmpdir(), 'phase1-verdicts-2026-09-25'));

const fromRoot = relative(SITE_ROOT, WORK);
if (!(fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot))) {
  throw new Error(`WORK (${WORK}) is inside the repository (${SITE_ROOT}); Swiss output must stay outside it`);
}

/** The installed @zodiacs/engine, which run-all.sh checks against vendor/zodiacs-engine-0.1.1-rc.7.tgz. */
export const ENGINE = join(SITE_ROOT, 'node_modules/@zodiacs/engine');
/** vendor/zodiacs-engine-0.1.1-rc.6.tgz, extracted by run-all.sh: the positive control. */
export const RC6 = join(WORK, 'tgz-rc6/package');
/** The committed corpora of the engine brief's rules (grids A and L, the ERFA arbiter). */
export const CORPORA = join(SITE_ROOT, 'docs/platform/evidence/engine-beyond-swiss/corpora');

/** $WORK/<name>/, created if missing, with the trailing slash the tools concatenate onto. */
export function outDir(name) {
  const directory = join(WORK, name);
  mkdirSync(directory, { recursive: true });
  return `${directory}/`;
}
