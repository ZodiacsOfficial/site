/**
 * Phase 1 protected-scope guard. The master brief freezes the Registry wing,
 * SDK, existing sign guides/Learn material, and locale trees. This gate stays
 * in force until a later phase explicitly replaces it with its named additive
 * allowances.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const oneTimeAllowancePath = '.github/phase1-scope-allowance.json';

const args = process.argv.slice(2);
const baseIndex = args.indexOf('--base');
const requestedBase = baseIndex >= 0 ? args[baseIndex + 1] : process.env.PHASE1_SCOPE_BASE;
const explicitBase = baseIndex >= 0
  || Object.prototype.hasOwnProperty.call(process.env, 'PHASE1_SCOPE_BASE');

function git(...gitArgs) {
  return execFileSync('git', gitArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

export function selectComparisonBase({ requested, explicit, verify }) {
  if (explicit) {
    if (!requested) {
      throw new Error('phase1-scope-guard: an explicit comparison base is required and cannot be empty');
    }
    try {
      verify(requested);
      return requested;
    } catch {
      throw new Error(`phase1-scope-guard: explicit comparison base is invalid: ${requested}`);
    }
  }

  const candidates = ['origin/main', 'main'];
  for (const candidate of candidates) {
    try {
      verify(candidate);
      return candidate;
    } catch {
      // Try the next locally available comparison point.
    }
  }
  throw new Error('phase1-scope-guard: no comparison base is available');
}

function resolveBase() {
  return selectComparisonBase({
    requested: requestedBase,
    explicit: explicitBase,
    verify: (candidate) => git('rev-parse', '--verify', `${candidate}^{commit}`),
  });
}

export const protectedPaths = [
  { label: 'Registry wing', pattern: /^(?:public|src\/pages)\/registry\//u },
  { label: 'Registry generated application', pattern: /^(?:src\/app\.jsx|public\/assets\/app\.js)$/u },
  { label: 'Registry implementation', pattern: /^src\/(?:components\/(?:LocalizedDisclosurePage|Registry)|islands\/(?:aura\/|RegistryAura|WalletChart)|lib\/(?:aura\/|aura-share|registry|wallet\/)|styles\/(?:registry-aura|wallet-chart)\.css$|strings\/wallet-chart\.ts$|data\/aura-moon-ingresses\.json$)/u },
  { label: 'Registry API', pattern: /^api\/(?:aura-holdings|wallet-birth)\.ts$/u },
  { label: 'Registry assets', pattern: /^public\/assets\/(?:art\/registry-|astrofolio\/|cabinet-materials\/|hero\/zodiacs-hero\.mp4$|og\/v2\/registry(?:\/|\.png$)|venues\/|wallets\/)/u },
  { label: 'Registry builders', pattern: /^scripts\/(?:build-app|build-aura-moon-ingresses|build-cabinet-materials|configure-registry-aura|registry[^/]*|sync-registry-establishment)[^/]*\.(?:mjs|ts)$/iu },
  { label: 'SDK pages', pattern: /^(?:public|src\/pages)\/sdk\//u },
  { label: 'SDK assets', pattern: /^public\/assets\/sdk\//u },
  { label: 'existing sign guides', pattern: /^src\/pages\/\[sign\]\/index\.astro$/u },
  { label: 'existing sign-guide content', pattern: /^src\/content\/(?:guides|signs|placements)\//u },
  { label: 'existing sign-guide builders', pattern: /^scripts\/(?:build-sign-pages|sign-data)\.mjs$/u },
  { label: 'existing Learn pages', pattern: /^src\/(?:pages|content)\/learn\//u },
  { label: 'locale page trees', pattern: /^src\/pages\/(?:es|pt|fr|it)\//u },
  { label: 'locale catalogs', pattern: /^src\/(?:lib\/i18n|strings\/(?:additions\.)?(?:es|pt|fr|it)(?:\.|\/))/u },
  { label: 'localized sign-guide data', pattern: /^src\/data\/(?:es|pt|fr|it)-guides(?:\.test)?\.ts$/u },
];

/** Parse `git diff --name-status -z`, retaining both sides of renames/copies. */
export function parseNameStatus(output) {
  const fields = output.split('\0');
  const paths = [];
  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    if (!status) continue;
    const pathCount = /^[RC]/u.test(status) ? 2 : 1;
    for (let offset = 0; offset < pathCount; offset += 1) {
      const path = fields[index++];
      if (!path) throw new Error(`phase1-scope-guard: malformed name-status record ${status}`);
      paths.push(path);
    }
  }
  return paths;
}

export function protectedPathLabels(path) {
  return protectedPaths
    .filter(({ pattern }) => pattern.test(path))
    .map(({ label }) => label);
}

/**
 * A later, explicitly approved patch may carry one tightly bounded allowance.
 * It is active only while the allowance file itself is part of the compared
 * change, is pinned to the exact base commit, and names the complete protected
 * path set. Once merged, later diffs do not include the file and the freeze is
 * automatically back in force.
 */
export function resolveOneTimeAllowance({ allowance, baseCommit, changed }) {
  if (!changed.includes(oneTimeAllowancePath)) return new Set();
  if (!allowance || allowance.version !== 1 || typeof allowance.id !== 'string') {
    throw new Error('phase1-scope-guard: malformed one-time allowance');
  }
  if (allowance.baseCommit !== baseCommit) {
    throw new Error(`phase1-scope-guard: allowance ${allowance.id} is pinned to a different base`);
  }
  if (!Array.isArray(allowance.protectedPaths) || allowance.protectedPaths.length === 0) {
    throw new Error(`phase1-scope-guard: allowance ${allowance.id} has no protected paths`);
  }

  const listed = [...new Set(allowance.protectedPaths)].sort();
  if (listed.length !== allowance.protectedPaths.length
      || listed.some((path, index) => path !== allowance.protectedPaths[index])) {
    throw new Error(`phase1-scope-guard: allowance ${allowance.id} paths must be unique and sorted`);
  }
  if (listed.some((path) => protectedPathLabels(path).length === 0)) {
    throw new Error(`phase1-scope-guard: allowance ${allowance.id} names an unprotected path`);
  }

  const actual = changed.filter((path) => protectedPathLabels(path).length > 0).sort();
  if (actual.length !== listed.length || actual.some((path, index) => path !== listed[index])) {
    throw new Error(`phase1-scope-guard: allowance ${allowance.id} does not exactly match the protected diff`);
  }
  return new Set(listed);
}

function changedPaths(base) {
  // `git diff HEAD` covers staged and unstaged tracked changes. The explicit
  // D filter plus both rename operands closes the old deletion/rename gap;
  // untracked paths come from the NUL-safe index query rather than porcelain.
  const committed = parseNameStatus(git(
    'diff', '--name-status', '-z', '--find-renames', '--diff-filter=ACMRTD', `${base}...HEAD`,
  ));
  const worktree = parseNameStatus(git(
    'diff', '--name-status', '-z', '--find-renames', '--diff-filter=ACMRTD', 'HEAD',
  ));
  const untracked = git('ls-files', '--others', '--exclude-standard', '-z')
    .split('\0').filter(Boolean);
  return [...new Set([...committed, ...worktree, ...untracked])].sort();
}

function main() {
  const base = resolveBase();
  const changed = changedPaths(base);
  const baseCommit = git('rev-parse', `${base}^{commit}`).trim();
  let allowed = new Set();
  if (changed.includes(oneTimeAllowancePath)) {
    try {
      const allowance = JSON.parse(readFileSync(oneTimeAllowancePath, 'utf8'));
      allowed = resolveOneTimeAllowance({ allowance, baseCommit, changed });
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
      return;
    }
  }
  const violations = changed.flatMap((path) => protectedPathLabels(path)
    .filter(() => !allowed.has(path))
    .map((label) => `${path} (${label})`));

  if (violations.length) {
    console.error(`phase1-scope-guard: ${violations.length} protected path change(s)`);
    violations.forEach((violation) => console.error(`  - ${violation}`));
    process.exitCode = 1;
    return;
  }

  const allowanceNote = allowed.size
    ? `; ${allowed.size} protected path(s) covered by the changed one-time allowance`
    : ', protected scope untouched';
  console.log(`phase1-scope-guard: PASS — ${changed.length} changed path(s)${allowanceNote}`);
}

const directInvocation = process.argv[1]
  && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (directInvocation) main();
