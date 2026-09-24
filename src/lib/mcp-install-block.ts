/**
 * The install commands the MCP developer page publishes.
 *
 * They live in a module rather than inline in the .astro page so a test can run
 * exactly what a reader copies. The first attempt at that test pulled the
 * template literal out of the page source with a regex and rebuilt it with
 * `new Function`, which meant a shell heredoc containing JavaScript containing
 * escaped backticks had to survive three levels of quoting before it could be
 * executed at all. It did not, and the effort was going into escaping rather
 * than into whether the commands are safe.
 *
 * What they have to do, and every way an AI review got an earlier draft to fail
 * open, is recorded in `scripts/mcp-install-block.test.mjs`, which executes this
 * against fixtures.
 */
export interface InstallManifest {
  readonly file: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly artifactCommit: string;
}

/** The pinned, immutable download: a commit's contents cannot change. */
export function archiveUrlFor(manifest: InstallManifest): string {
  return `https://raw.githubusercontent.com/zodiacs-org/site/${manifest.artifactCommit}/public/examples/${manifest.file}`;
}

export function installBlock(manifest: InstallManifest): string {
  const archiveUrl = archiveUrlFor(manifest);
  const dest = manifest.file.replace(/\.tgz$/, '');
// The digest is COMPARED, not printed. An earlier version of this block ran
// `shasum -a 256` and put the expected value in a comment, which reads like a
// check and is not one: shasum exits 0 on any readable file, and the lines after
// it ran regardless. A tampered archive extracted, installed and passed
// `npm run verify`, because the verifier tests behaviour rather than identity.
// This is the same shape the starter page has used since it shipped, with the
// destination created only after verification. An AI review pointed out that
// this was not enough on its own: a failure at or after `mkdir` — a `tar` this
// system cannot run, a registry outage during `npm ci` — left both the archive
// and a half-filled directory behind, and the retry then stopped on its own
// guard, naming only one of the two paths. So the block cleans up what it
// created when it fails, and the guards refuse to touch anything it did not.
return `( set -eu
# POSIX shell — macOS, Linux or WSL. Not PowerShell. It runs in a subshell, so a
# failure stops the install without closing your terminal.
FILE='${manifest.file}'
DEST='${dest}'
for path in "$FILE" "$DEST"; do
  if test -e "$path" || test -L "$path"; then
    echo "Stop: $path already exists here. Move or delete it, then run this again." >&2
    exit 1
  fi
done
# Anything this block creates, it removes if it does not finish. Without that a
# failed run leaves the archive and a half-filled directory in the way, and the
# next attempt stops on the guards above instead of retrying. The paths are
# absolute because the failure can happen after the cd below, where a relative
# name would resolve inside the very directory being removed.
BASE=$(pwd)
trap 'status=$?; if test "$status" -ne 0; then rm -rf "$BASE/$DEST" "$BASE/$FILE"; fi; exit $status' EXIT

curl --disable --fail --silent --show-error --location --proto '=https' --max-time 60 \\
  '${archiveUrl}' -o "$FILE"
test -s "$FILE" || { echo "Stop: the download produced no file. Nothing was extracted and nothing was installed." >&2; exit 1; }

node --input-type=module <<'JS'
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const file = '${manifest.file}';
const expected = '${manifest.sha256}';
const expectedBytes = ${manifest.bytes};
const bytes = readFileSync(file);
const stop = (why) => {
  console.error(\`Stop: \${why}\`);
  console.error('Nothing was extracted and nothing was installed.');
  process.exit(1);
};
if (bytes.length !== expectedBytes) stop(\`incomplete or altered download, \${bytes.length} bytes, expected \${expectedBytes}.\`);
const actual = createHash('sha256').update(bytes).digest('hex');
if (actual !== expected) stop(\`this is not the published archive.\\n  expected \${expected}\\n  got      \${actual}\`);
console.log(\`Archive verified: \${actual}\`);
JS

mkdir "$DEST"
tar -xzf "$FILE" --strip-components=1 -C "$DEST"
cd "$DEST"
npm ci --no-audit --no-fund
npm run verify
trap - EXIT
echo "Installed and verified. Connect it from there:"
echo "  cd $DEST"
)`;
}
